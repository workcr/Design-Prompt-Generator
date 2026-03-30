import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { getSupabaseServer } from "@/lib/supabase-server"
import { getImageGenProvider, env } from "@/lib/env"
import type { PromptOutput } from "@/types/db"

const RequestSchema = z.object({
  outputId: z.string().min(1),
})

interface ReplicateResponse {
  id: string
  status: string
  output: string[] | null
  error: string | null
}

interface GeminiImageResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        inlineData?: { mimeType: string; data: string }
        text?: string
      }>
    }
  }>
  error?: { message: string }
}

export async function POST(request: Request) {
  try {
    // 1. Validate request body
    const body: unknown = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "outputId is required" }, { status: 400 })
    }

    const { outputId } = parsed.data
    const supabase = getSupabaseServer()

    // 2. Load prompt output
    const { data: output } = await supabase
      .from("prompt_outputs")
      .select("*")
      .eq("id", outputId)
      .single()

    if (!output) {
      return NextResponse.json({ error: "Prompt output not found" }, { status: 404 })
    }
    const promptOutput = output as PromptOutput
    if (!promptOutput.final_prompt) {
      return NextResponse.json({ error: "Prompt output has no final_prompt" }, { status: 400 })
    }

    const finalPrompt = promptOutput.final_prompt
    const provider = getImageGenProvider()

    let imgBuffer: Buffer
    let genFilename: string
    let contentType: string
    let model: string

    if (provider === "nano_banana_2") {
      // 3a. Nano Banana 2 — Gemini 2.0 Flash native image generation via REST
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for Nano Banana 2")
      }
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
        }
      )
      const geminiData = (await geminiRes.json()) as GeminiImageResponse
      if (!geminiRes.ok) {
        throw new Error(geminiData.error?.message ?? "Gemini image generation failed")
      }
      const firstCandidate = geminiData.candidates[0]
      if (!firstCandidate) throw new Error("Gemini returned no candidates")
      const imagePart = firstCandidate.content.parts.find((p) => p.inlineData)
      if (!imagePart?.inlineData) throw new Error("Gemini returned no image data")
      const ext = imagePart.inlineData.mimeType.includes("png") ? "png" : "jpg"
      contentType = imagePart.inlineData.mimeType.includes("png") ? "image/png" : "image/jpeg"
      genFilename = `gen-${crypto.randomUUID()}.${ext}`
      imgBuffer = Buffer.from(imagePart.inlineData.data, "base64")
      model = "gemini-2.5-flash-image"
    } else {
      // 3b. Replicate — REST API with Prefer: wait (synchronous prediction)
      if (!env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is required for Replicate")
      }
      const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          version: "black-forest-labs/flux-schnell",
          input: { prompt: finalPrompt },
        }),
      })
      const replicateData = (await replicateRes.json()) as ReplicateResponse
      if (
        !replicateRes.ok ||
        replicateData.status !== "succeeded" ||
        !replicateData.output
      ) {
        throw new Error(replicateData.error ?? "Replicate generation failed")
      }
      const firstOutput = replicateData.output[0]
      if (!firstOutput) throw new Error("Replicate returned empty output")
      // Download from Replicate — URLs expire after ~24h
      const imgResponse = await fetch(firstOutput)
      imgBuffer = Buffer.from(await imgResponse.arrayBuffer())
      contentType = "image/webp"
      genFilename = `gen-${crypto.randomUUID()}.webp`
      model = "flux-schnell"
    }

    // 4. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(genFilename, imgBuffer, { contentType, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from("uploads")
      .getPublicUrl(genFilename)

    // 5. Save to generated_images with Supabase Storage public URL
    const imageId = crypto.randomUUID()
    const { error } = await supabase.from("generated_images").insert({
      id:               imageId,
      prompt_output_id: outputId,
      provider:         provider,
      model:            model,
      url:              publicUrl,
      status:           "complete",
    })
    if (error) throw error

    return NextResponse.json({ id: imageId, url: publicUrl, provider })
  } catch (error) {
    console.error("[POST /api/generate]", error)
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 })
  }
}
