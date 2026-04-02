import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { getSupabaseServer } from "@/lib/supabase-server"
import { getVisionProvider } from "@/lib/ai"
import {
  EvaluationResultSchema,
  EVALUATION_PROMPT,
} from "@/lib/schemas/evaluation-score"
import type {
  EvaluationScore,
  GeneratedImage,
  PromptOutput,
  DesignSchema,
} from "@/types/db"

// Gemini vision evaluation can take 20-40s — extend beyond the 10s default
export const maxDuration = 60

const RequestSchema = z.object({
  prompt_output_id:   z.string().min(1),
  generated_image_id: z.string().min(1),
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

    const { prompt_output_id, generated_image_id } = parsed.data
    const supabase = getSupabaseServer()

    // 2. Load generated image row
    const { data: genImageData } = await supabase
      .from("generated_images")
      .select("*")
      .eq("id", generated_image_id)
      .single()

    if (!genImageData) {
      return NextResponse.json({ error: "Generated image not found" }, { status: 404 })
    }
    const generatedImage = genImageData as GeneratedImage
    if (!generatedImage.url) {
      return NextResponse.json({ error: "Generated image has no URL" }, { status: 400 })
    }

    // 3. Load prompt output → get project_id
    const { data: outputData } = await supabase
      .from("prompt_outputs")
      .select("*")
      .eq("id", prompt_output_id)
      .single()

    if (!outputData) {
      return NextResponse.json({ error: "Prompt output not found" }, { status: 404 })
    }
    const promptOutput = outputData as PromptOutput

    // 4. Load latest design schema for project → get reference_image
    const { data: schemaData } = await supabase
      .from("design_schemas")
      .select("reference_image")
      .eq("project_id", promptOutput.project_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!schemaData) {
      return NextResponse.json(
        { error: "No design schema found for this project" },
        { status: 400 }
      )
    }
    const designSchema = schemaData as Pick<DesignSchema, "reference_image">

    if (!designSchema.reference_image) {
      return NextResponse.json(
        { error: "Design schema has no reference image — upload and analyze an image first" },
        { status: 400 }
      )
    }

    // 5. Resolve reference image public URL (no download needed)
    const { data: refUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(designSchema.reference_image)

    if (!refUrlData.publicUrl) {
      return NextResponse.json(
        { error: "Could not resolve reference image URL" },
        { status: 404 }
      )
    }

    // 7. Agent D — structured visual evaluation via generateObject
    //    Pass URLs directly — avoids two Storage downloads and keeps the
    //    route well within the 60s Vercel Hobby function limit
    const { object: result } = await generateObject({
      model: getVisionProvider(),
      schema: EvaluationResultSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "REFERENCE IMAGE (the target design):" },
            { type: "image", image: new URL(refUrlData.publicUrl) },
            { type: "text", text: "GENERATED IMAGE (the AI output to evaluate):" },
            { type: "image", image: new URL(generatedImage.url) },
            { type: "text", text: EVALUATION_PROMPT },
          ],
        },
      ],
    })

    // 8. Determine iteration number (count of prior evaluations for this output + 1)
    const { count } = await supabase
      .from("evaluation_scores")
      .select("id", { count: "exact", head: true })
      .eq("prompt_output_id", prompt_output_id)

    const iteration = (count ?? 0) + 1

    // 9. Persist evaluation score row
    const { data: scoreData, error: insertError } = await supabase
      .from("evaluation_scores")
      .insert({
        prompt_output_id,
        generated_image_id,
        project_id:          promptOutput.project_id,
        reference_image:     designSchema.reference_image,
        generated_image_url: generatedImage.url,
        scores:              JSON.stringify(result),
        critique:            result.critique,
        iteration,
      })
      .select()
      .single()

    if (insertError) throw insertError

    const scoreRow = scoreData as EvaluationScore

    return NextResponse.json({
      id:       scoreRow.id,
      scores:   result,
      critique: result.critique,
      iteration,
    })
  } catch (error) {
    console.error("[POST /api/evaluate]", error)
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 })
  }
}
