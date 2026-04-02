import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { generateText } from "ai"
import { getSupabaseServer } from "@/lib/supabase-server"
import { getTextProvider, } from "@/lib/ai"
import { getTextModel } from "@/lib/env"
import {
  B2_REWRITE_SYSTEM_PROMPT,
  buildRewriteInput,
} from "@/lib/schemas/prompt-rewrite"
import type { EvaluationScore, DesignSchema, GrammarBlueprint } from "@/types/db"

// B2 rewrite + image generation can together take 30-50s
export const maxDuration = 60

const RequestSchema = z.object({
  project_id:          z.string().min(1),
  evaluation_score_id: z.string().min(1),
  blueprint_id:        z.string().min(1).optional(),
})

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

    // 2. Load evaluation score → get critique + iteration
    const { data: scoreData } = await supabase
      .from("evaluation_scores")
      .select("*")
      .eq("id", evaluation_score_id)
      .single()

    if (!scoreData) {
      return NextResponse.json({ error: "Evaluation score not found" }, { status: 404 })
    }
    const evaluationScore = scoreData as EvaluationScore

    // 3. Load latest design schema for project
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
    const schema = schemaData as DesignSchema

    // 4. Load grammar blueprint — prefer blueprint_id param, else latest for project
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

    // 5. Parse locked fields from schema
    const lockedFields = JSON.parse(schema.locked_fields) as string[]

    // 6. Build critique-aware rewrite input
    const baseInput = buildRewriteInput(schema, blueprint, lockedFields)
    const refineInput = `${baseInput}

---
REFINEMENT FEEDBACK (apply these changes in the new prompt):
${evaluationScore.critique ?? "No specific feedback — improve overall fidelity to the reference design."}`

    // 7. Agent B2 — non-streaming generateText (refine waits for image gen to complete)
    const { text: finalPrompt } = await generateText({
      model: getTextProvider(),
      system: B2_REWRITE_SYSTEM_PROMPT,
      prompt: refineInput,
    })

    // 8. Save new prompt_outputs row
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

    // 9. Generate image — call /api/generate with the new output ID
    const origin = new URL(request.url).origin
    const genRes = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputId }),
    })

    if (!genRes.ok) {
      const err = (await genRes.json()) as { error?: string }
      throw new Error(err.error ?? "Image generation failed in refine")
    }
    const genData = (await genRes.json()) as { id: string; url: string; provider: string }

    // 10. Determine iteration for this refine cycle
    const newIteration = (evaluationScore.iteration ?? 1) + 1

    return NextResponse.json({
      prompt_output_id:   outputId,
      generated_image_id: genData.id,
      url:                genData.url,
      iteration:          newIteration,
    })
  } catch (error) {
    console.error("[POST /api/refine]", error)
    return NextResponse.json({ error: "Refinement failed" }, { status: 500 })
  }
}
