import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject, generateText } from "ai"
import crypto from "crypto"
import { getSupabaseServer } from "@/lib/supabase-server"

// Gemini vision analysis can take 15-30s — extend beyond the 10s default
export const maxDuration = 60
import { getVisionProvider } from "@/lib/ai"
import {
  DesignExtractionSchema,
  DESIGN_ANALYSIS_PROMPT,
} from "@/lib/schemas/design-extraction"
import { computeEmbedding } from "@/lib/embeddings"
import type { DesignSchema } from "@/types/db"

const RequestSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1),
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

    const { projectId, filename } = parsed.data
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

    // 3. Download image from Supabase Storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from("uploads")
      .download(filename)

    if (downloadError || !blob) {
      return NextResponse.json({ error: "Image file not found in storage" }, { status: 404 })
    }

    const imageBuffer = Buffer.from(await blob.arrayBuffer())

    // 3b. Retrieve relevant correction lessons via embedding similarity (Phase 12)
    // Brief first-pass: describe typography + palette → embed → cosine query top-5 lessons
    // Falls back to standard single-pass analysis silently if no lessons or embedding fails.
    let priorCorrectionsBlock = ""

    try {
      const { text: styleDescription } = await generateText({
        model: getVisionProvider(),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", image: imageBuffer },
              {
                type: "text",
                text:
                  "In 1-2 sentences, describe the dominant typographic style " +
                  "(typeface classification, stroke contrast, weight) and color " +
                  "palette character of this image. Be specific about visual signals.",
              },
            ],
          },
        ],
      })

      const queryVector = await computeEmbedding(styleDescription)

      if (queryVector) {
        const { data: lessons } = await supabase.rpc("match_correction_memories", {
          query_embedding: `[${queryVector.join(",")}]`,
          match_count:     5,
        })

        if (lessons && (lessons as { dimension: string; lesson: string }[]).length > 0) {
          const lessonLines = (lessons as { dimension: string; lesson: string }[])
            .map((l) => `• [${l.dimension}] ${l.lesson}`)
            .join("\n")

          priorCorrectionsBlock =
            "PRIOR EXTRACTION CORRECTIONS — from similar past images:\n" +
            "Apply these lessons when you detect the same visual patterns:\n\n" +
            lessonLines +
            "\n\n---\n\n"
        }
      }
    } catch (retrievalErr) {
      // Non-fatal — log and continue with standard single-pass analysis
      console.error("[analyze] lesson retrieval failed (non-fatal):", retrievalErr)
    }

    // 4. Run structured extraction via AI SDK
    // The vision provider uses compatibility:"compatible" (chat completions endpoint)
    // which serialises Buffer → data:image/<type>;base64,... correctly for Ollama.
    const { object: extraction } = await generateObject({
      model: getVisionProvider(),
      schema: DesignExtractionSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: imageBuffer },
            { type: "text", text: priorCorrectionsBlock + DESIGN_ANALYSIS_PROMPT },
          ],
        },
      ],
    })

    // 5. Compute style checksum (first 16 chars of SHA-256)
    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(extraction))
      .digest("hex")
      .slice(0, 16)

    // 6. Persist to design_schemas
    const { data: schema, error } = await supabase
      .from("design_schemas")
      .insert({
        project_id:      projectId,
        frame:           JSON.stringify(extraction.frame),
        palette:         JSON.stringify(extraction.palette),
        layout:          JSON.stringify(extraction.layout),
        text_fields:     JSON.stringify(extraction.text_fields),
        type_scale:      JSON.stringify(extraction.type_scale),
        elements:        JSON.stringify(extraction.elements),
        style_checksum:  checksum,
        raw_analysis:    JSON.stringify(extraction),
        reference_image: filename,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ id: (schema as DesignSchema).id, schema: schema as DesignSchema })
  } catch (error) {
    console.error("[POST /api/analyze]", error)
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    )
  }
}
