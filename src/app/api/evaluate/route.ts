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

    // 5. Download reference image from Supabase Storage
    const { data: refBlob, error: refErr } = await supabase.storage
      .from("uploads")
      .download(designSchema.reference_image)

    if (refErr || !refBlob) {
      return NextResponse.json(
        { error: "Reference image not found in storage" },
        { status: 404 }
      )
    }
    const referenceBuffer = Buffer.from(await refBlob.arrayBuffer())

    // 6. Download generated image from Supabase Storage
    //    Extract filename from public URL: .../uploads/{filename}
    const genFilename = new URL(generatedImage.url).pathname.split("/").pop()
    if (!genFilename) {
      return NextResponse.json(
        { error: "Could not extract filename from generated image URL" },
        { status: 400 }
      )
    }

    const { data: genBlob, error: genErr } = await supabase.storage
      .from("uploads")
      .download(genFilename)

    if (genErr || !genBlob) {
      return NextResponse.json(
        { error: "Generated image not found in storage" },
        { status: 404 }
      )
    }
    const generatedBuffer = Buffer.from(await genBlob.arrayBuffer())

    // 7. Agent D — structured visual evaluation via generateObject
    const { object: result } = await generateObject({
      model: getVisionProvider(),
      schema: EvaluationResultSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "REFERENCE IMAGE (the target design):" },
            { type: "image", image: referenceBuffer },
            { type: "text", text: "GENERATED IMAGE (the AI output to evaluate):" },
            { type: "image", image: generatedBuffer },
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
