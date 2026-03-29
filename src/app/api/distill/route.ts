import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { getDb } from "@/lib/db"
import { getTextProvider } from "@/lib/ai"
import {
  GrammarBlueprintExtractionSchema,
  GRAMMAR_DISTILLATION_PROMPT,
} from "@/lib/schemas/grammar-blueprint"
import type { GrammarBlueprint } from "@/types/db"

const RequestSchema = z.object({
  projectId: z.string().min(1),
  prompts: z.array(z.string().min(1)).min(1).max(20),
  name: z.string().min(1).optional(),
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

    const { projectId, prompts, name } = parsed.data
    const db = getDb()

    // 2. Verify project exists
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // 3. Build prompt message — numbered list of input prompts
    const promptList = prompts
      .map((p, i) => `${(i + 1).toString()}. ${p}`)
      .join("\n\n")

    // 4. Run structured extraction via AI SDK (text model — no image)
    const { object: extraction } = await generateObject({
      model: getTextProvider(),
      schema: GrammarBlueprintExtractionSchema,
      messages: [
        {
          role: "user",
          content: `${GRAMMAR_DISTILLATION_PROMPT}\n\n${promptList}`,
        },
      ],
    })

    // 5. Derive blueprint name if not provided
    const blueprintName =
      name ?? `Blueprint — ${new Date().toISOString().slice(0, 10)}`

    // 6. Persist to grammar_blueprints
    //    density and avg_length stored as raw values (not JSON.stringify):
    //    - density is TEXT, stored directly
    //    - avg_length is INTEGER, stored as number
    const blueprint = db
      .prepare(
        `INSERT INTO grammar_blueprints
           (project_id, name, sequence_pattern, density, avg_length,
            compression_style, raw_prompts, distilled_grammar)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .get(
        projectId,
        blueprintName,
        JSON.stringify(extraction.sequence_pattern),
        extraction.density,
        extraction.avg_length,
        extraction.compression_style,
        JSON.stringify(prompts),
        JSON.stringify(extraction)
      ) as GrammarBlueprint

    return NextResponse.json({ id: blueprint.id, blueprint })
  } catch (error) {
    console.error("[POST /api/distill]", error)
    return NextResponse.json(
      { error: "Distillation failed" },
      { status: 500 }
    )
  }
}
