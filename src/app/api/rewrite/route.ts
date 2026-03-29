import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { streamText } from "ai"
import { getDb } from "@/lib/db"
import { getTextProvider } from "@/lib/ai"
import { getTextModel } from "@/lib/env"
import {
  B2_REWRITE_SYSTEM_PROMPT,
  buildRewriteInput,
} from "@/lib/schemas/prompt-rewrite"
import type { DesignSchema, GrammarBlueprint } from "@/types/db"

const RequestSchema = z.object({
  projectId: z.string().min(1),
  blueprintId: z.string().min(1).optional(),
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

    const { projectId, blueprintId } = parsed.data
    const db = getDb()

    // 2. Verify project exists
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // 3. Load design schema (latest for project)
    const schema = db
      .prepare(
        "SELECT * FROM design_schemas WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(projectId) as DesignSchema | undefined

    if (!schema) {
      return NextResponse.json(
        { error: "No design schema found for this project" },
        { status: 400 }
      )
    }

    // 4. Load grammar blueprint
    let blueprint: GrammarBlueprint | undefined

    if (blueprintId) {
      blueprint = db
        .prepare("SELECT * FROM grammar_blueprints WHERE id = ?")
        .get(blueprintId) as GrammarBlueprint | undefined

      if (!blueprint) {
        return NextResponse.json(
          { error: "Grammar blueprint not found" },
          { status: 404 }
        )
      }
    } else {
      blueprint = db
        .prepare(
          "SELECT * FROM grammar_blueprints WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
        )
        .get(projectId) as GrammarBlueprint | undefined

      if (!blueprint) {
        return NextResponse.json(
          { error: "No grammar blueprint found" },
          { status: 400 }
        )
      }
    }

    // 5. Parse locked fields from schema
    const lockedFields = JSON.parse(schema.locked_fields) as string[]

    // 6. Pre-generate output ID — returned in header before stream body begins
    const outputId = randomUUID()

    // 7. Build rewrite input
    const rewriteInput = buildRewriteInput(schema, blueprint, lockedFields)

    // 8. Stream text via Agent B2
    const result = streamText({
      model: getTextProvider(),
      system: B2_REWRITE_SYSTEM_PROMPT,
      prompt: rewriteInput,
      onFinish: async ({ text }) => {
        try {
          const finishDb = getDb()
          finishDb
            .prepare(
              `INSERT INTO prompt_outputs
                 (id, project_id, schema_snapshot, blueprint_id, final_prompt, model_used)
               VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(
              outputId,
              projectId,
              JSON.stringify(schema),
              blueprint.id,
              text,
              getTextModel()
            )
        } catch (err) {
          console.error("[POST /api/rewrite] onFinish DB save failed:", err)
        }
      },
    })

    // 9. Return streaming response with X-Output-Id header
    const textStreamResponse = result.toTextStreamResponse()
    return new Response(textStreamResponse.body, {
      status: textStreamResponse.status,
      headers: new Headers({
        ...Object.fromEntries(textStreamResponse.headers.entries()),
        "X-Output-Id": outputId,
        "Access-Control-Expose-Headers": "X-Output-Id",
      }),
    })
  } catch (error) {
    console.error("[POST /api/rewrite]", error)
    return NextResponse.json({ error: "Rewrite failed" }, { status: 500 })
  }
}
