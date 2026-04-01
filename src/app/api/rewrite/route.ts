import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { streamText } from "ai"
import { getSupabaseServer } from "@/lib/supabase-server"

// Streaming AI response — extend beyond the 10s default
export const maxDuration = 60
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
    const supabase = getSupabaseServer()

    // 2. Verify project exists
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single()
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // 3. Load design schema (latest for project)
    const { data: schema } = await supabase
      .from("design_schemas")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!schema) {
      return NextResponse.json(
        { error: "No design schema found for this project" },
        { status: 400 }
      )
    }

    // 4. Load grammar blueprint
    let blueprint: GrammarBlueprint | null = null

    if (blueprintId) {
      const { data } = await supabase
        .from("grammar_blueprints")
        .select("*")
        .eq("id", blueprintId)
        .single()
      if (!data) {
        return NextResponse.json(
          { error: "Grammar blueprint not found" },
          { status: 404 }
        )
      }
      blueprint = data as GrammarBlueprint
    } else {
      const { data } = await supabase
        .from("grammar_blueprints")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!data) {
        return NextResponse.json(
          { error: "No grammar blueprint found" },
          { status: 400 }
        )
      }
      blueprint = data as GrammarBlueprint
    }

    // 5. Parse locked fields from schema
    const lockedFields = JSON.parse((schema as DesignSchema).locked_fields) as string[]

    // 6. Pre-generate output ID — returned in header before stream body begins
    const outputId = randomUUID()

    // 7. Build rewrite input
    const rewriteInput = buildRewriteInput(schema as DesignSchema, blueprint, lockedFields)

    // 8. Stream text via Agent B2
    const result = streamText({
      model: getTextProvider(),
      system: B2_REWRITE_SYSTEM_PROMPT,
      prompt: rewriteInput,
      onFinish: async ({ text }) => {
        try {
          // Create a new client in the callback — stateless, no connection overhead
          const finishSupabase = getSupabaseServer()
          await finishSupabase.from("prompt_outputs").insert({
            id:              outputId,
            project_id:      projectId,
            schema_snapshot: JSON.stringify(schema),
            blueprint_id:    blueprint!.id,
            final_prompt:    text,
            model_used:      getTextModel(),
          })
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
