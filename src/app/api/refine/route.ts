import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { generateObject, generateText } from "ai"
import { getSupabaseServer } from "@/lib/supabase-server"
import { getVisionProvider, getTextProvider } from "@/lib/ai"
import { getTextModel } from "@/lib/env"
import {
  B2_REWRITE_SYSTEM_PROMPT,
  buildRewriteInput,
} from "@/lib/schemas/prompt-rewrite"
import { computeEmbedding } from "@/lib/embeddings"
import {
  EVAL_DIMENSIONS,
  SchemaCorrectionSchema,
  SCHEMA_CORRECTION_PROMPT,
} from "@/lib/schemas/schema-correction"
import type { EvalDimension, SchemaCorrection } from "@/lib/schemas/schema-correction"
import type { EvaluationResult, DimensionScore } from "@/lib/schemas/evaluation-score"
import type {
  EvaluationScore,
  DesignSchema,
  GrammarBlueprint,
} from "@/types/db"

// Agent E + B2 rewrite — no internal /api/generate call; that moves to the UI (Plan 11-02)
export const maxDuration = 60

// ─── Request Schema ───────────────────────────────────────────────────────────

const RequestSchema = z.object({
  project_id:          z.string().min(1),
  evaluation_score_id: z.string().min(1),
  blueprint_id:        z.string().min(1).optional(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a schema field that may be stored as a JSON string (TEXT column)
 * or already parsed as an object (JSONB returned by Supabase JS client).
 */
function parseField(raw: unknown): unknown {
  if (raw === null || raw === undefined) return null
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return null }
  }
  return raw // already an object (JSONB from Supabase)
}

/**
 * Build a context object containing only the schema fields that map to
 * the failing evaluation dimensions — passed to Agent E as current values.
 */
function buildFailingContext(
  schema: DesignSchema,
  failing: readonly EvalDimension[]
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {}
  if (failing.includes("typography")) {
    ctx.type_scale = parseField(schema.type_scale)
  }
  if (failing.includes("palette")) {
    ctx.palette = parseField(schema.palette)
  }
  if (failing.includes("composition") || failing.includes("layout")) {
    ctx.frame  = parseField(schema.frame)
    ctx.layout = parseField(schema.layout)
  }
  if (failing.includes("elements")) {
    ctx.text_fields = parseField(schema.text_fields)
    ctx.elements    = parseField(schema.elements)
  }
  return ctx
}

/**
 * Merge Agent E corrections into the base schema fields.
 * Returns a Supabase INSERT payload (new row, no id/timestamps).
 */
function mergeCorrectedFields(
  base: DesignSchema,
  correction: SchemaCorrection
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    project_id:      base.project_id,
    frame:           base.frame,
    palette:         base.palette,
    layout:          base.layout,
    text_fields:     base.text_fields,
    type_scale:      base.type_scale,
    elements:        base.elements,
    style_checksum:  base.style_checksum,
    locked_fields:   base.locked_fields,
    raw_analysis:    base.raw_analysis,
    reference_image: base.reference_image,
  }
  if (correction.type_scale !== undefined) {
    merged.type_scale = JSON.stringify(correction.type_scale)
  }
  if (correction.palette !== undefined) {
    const cur = (parseField(base.palette) ?? {}) as Record<string, unknown>
    merged.palette = JSON.stringify({ ...cur, ...correction.palette })
  }
  if (correction.layout !== undefined) {
    const cur = (parseField(base.layout) ?? {}) as Record<string, unknown>
    merged.layout = JSON.stringify({ ...cur, ...correction.layout })
  }
  if (correction.frame !== undefined) {
    const cur = (parseField(base.frame) ?? {}) as Record<string, unknown>
    merged.frame = JSON.stringify({ ...cur, ...correction.frame })
  }
  return merged
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // 1. Validate request body
    const body: unknown = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { project_id, evaluation_score_id, blueprint_id } = parsed.data
    const supabase = getSupabaseServer()

    // 2. Load evaluation score → get scores (JSONB) + critique + iteration
    const { data: scoreData } = await supabase
      .from("evaluation_scores")
      .select("*")
      .eq("id", evaluation_score_id)
      .single()

    if (!scoreData) {
      return NextResponse.json({ error: "Evaluation score not found" }, { status: 404 })
    }
    const evaluationScore = scoreData as EvaluationScore

    // 3. Parse scores — Supabase returns JSONB columns as objects (not strings)
    const scores = (evaluationScore.scores as unknown) as EvaluationResult | null

    // 4. Identify failing dimensions (score ≤ 2 OR verdict "miss")
    const failingDimensions: EvalDimension[] = scores
      ? EVAL_DIMENSIONS.filter((dim) => {
          const d = scores[dim] as DimensionScore | undefined
          return d !== undefined && (d.score <= 2 || d.verdict === "miss")
        })
      : []

    // 5. Load latest design schema for project
    const { data: schemaData } = await supabase
      .from("design_schemas")
      .select("*")
      .eq("project_id", project_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!schemaData) {
      return NextResponse.json(
        { error: "No design schema found for this project" },
        { status: 400 }
      )
    }
    let schema = schemaData as DesignSchema

    // 6. Agent E branch — only when ≥1 dimension is failing
    if (failingDimensions.length > 0) {
      console.log("[refine] agent-e: correcting", failingDimensions)

      // 6a. Resolve reference image public URL (no download)
      if (!schema.reference_image) {
        return NextResponse.json(
          { error: "Design schema has no reference image — cannot run Agent E" },
          { status: 400 }
        )
      }
      const { data: refUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(schema.reference_image)

      // 6b. Build current schema values for failing dimensions only
      const currentValues = buildFailingContext(schema, failingDimensions)

      const failingContext = failingDimensions
        .map((dim) => {
          const d = scores?.[dim] as DimensionScore | undefined
          return `- ${dim}: score ${d?.score ?? "?"}/5 — ${d?.notes ?? ""}`
        })
        .join("\n")

      // 6c. Agent E — structured schema correction via generateObject
      const { object: correction } = await generateObject({
        model: getVisionProvider(),
        schema: SchemaCorrectionSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SCHEMA_CORRECTION_PROMPT },
              {
                type: "text",
                text: `FAILING DIMENSIONS (correct these only):\n${failingContext}`,
              },
              {
                type: "text",
                text: `CURRENT SCHEMA VALUES FOR FAILING DIMENSIONS:\n${JSON.stringify(currentValues, null, 2)}`,
              },
              {
                type: "text",
                text: `USER CRITIQUE:\n${evaluationScore.critique ?? "No specific feedback provided."}`,
              },
              { type: "image", image: new URL(refUrlData.publicUrl) },
              {
                type: "text",
                text: "Output corrected schema values and lessons for the failing dimensions listed above.",
              },
            ],
          },
        ],
      })

      // 6d. Fork schema — insert new design_schemas row with corrections merged in
      const correctedFields = mergeCorrectedFields(schema, correction)
      const { data: newSchemaData, error: schemaInsertError } = await supabase
        .from("design_schemas")
        .insert(correctedFields)
        .select()
        .single()

      if (schemaInsertError || !newSchemaData) {
        throw schemaInsertError ?? new Error("Failed to insert corrected schema")
      }
      schema = newSchemaData as DesignSchema

      // 6e. Write correction_memories rows + compute embeddings (Phase 12)
      if (correction.lessons.length > 0) {
        const memoryRows = correction.lessons.map((lesson) => ({
          project_id,
          evaluation_score_id,
          dimension:     lesson.dimension,
          lesson:        lesson.lesson,
          bad_value:     lesson.bad_value,
          correct_value: lesson.correct_value,
          // embedding computed below after insert
        }))

        const { data: insertedMemories, error: memoryError } = await supabase
          .from("correction_memories")
          .insert(memoryRows)
          .select("id, lesson")

        if (memoryError) {
          // Non-fatal — log but don't fail the refine cycle
          console.error("[refine] correction_memories insert failed:", memoryError)
        } else if (insertedMemories) {
          // Compute embeddings in parallel — non-fatal, awaited before return so
          // Vercel doesn't terminate the function before UPDATEs land
          await Promise.allSettled(
            insertedMemories.map(async (row) => {
              const vector = await computeEmbedding(row.lesson as string)
              if (!vector) return
              const { error: embErr } = await supabase
                .from("correction_memories")
                .update({ embedding: `[${vector.join(",")}]` })
                .eq("id", row.id as string)
              if (embErr) {
                console.error("[refine] embedding update failed for", row.id, embErr)
              }
            })
          )
        }
      }
    } else {
      console.log("[refine] agent-e: skipped (fast path — all dimensions score ≥ 3)")
    }

    // 7. Load grammar blueprint — prefer blueprint_id param, else latest for project
    let blueprint: GrammarBlueprint | null = null

    if (blueprint_id) {
      const { data } = await supabase
        .from("grammar_blueprints")
        .select("*")
        .eq("id", blueprint_id)
        .single()
      if (!data) {
        return NextResponse.json({ error: "Grammar blueprint not found" }, { status: 404 })
      }
      blueprint = data as GrammarBlueprint
    } else {
      const { data } = await supabase
        .from("grammar_blueprints")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!data) {
        return NextResponse.json({ error: "No grammar blueprint found" }, { status: 400 })
      }
      blueprint = data as GrammarBlueprint
    }

    // 8. Parse locked fields + build B2 rewrite input
    const lockedFields = JSON.parse(schema.locked_fields) as string[]
    const baseInput = buildRewriteInput(schema, blueprint, lockedFields)

    // Append critique in both paths (Agent E path: includes schema improvement context)
    const refineInput = `${baseInput}

---
REFINEMENT FEEDBACK (apply these changes in the new prompt):
${evaluationScore.critique ?? "No specific feedback — improve overall fidelity to the reference design."}`

    // 9. Agent B2 — non-streaming generateText
    const { text: finalPrompt } = await generateText({
      model:  getTextProvider(),
      system: B2_REWRITE_SYSTEM_PROMPT,
      prompt: refineInput,
    })

    // 10. Save new prompt_outputs row
    const outputId = crypto.randomUUID()
    const { error: outputError } = await supabase.from("prompt_outputs").insert({
      id:              outputId,
      project_id,
      schema_snapshot: JSON.stringify(schema),
      blueprint_id:    blueprint.id,
      final_prompt:    finalPrompt,
      model_used:      getTextModel(),
    })
    if (outputError) throw outputError

    // 11. Determine new iteration number
    const newIteration = (evaluationScore.iteration ?? 1) + 1

    // Return prompt_output_id — UI (Plan 11-02) calls /api/generate with this ID
    return NextResponse.json({
      prompt_output_id: outputId,
      iteration:        newIteration,
    })
  } catch (error) {
    console.error("[POST /api/refine]", error)
    return NextResponse.json({ error: "Refinement failed" }, { status: 500 })
  }
}
