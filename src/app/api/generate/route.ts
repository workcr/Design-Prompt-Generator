import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { getSupabaseServer } from "@/lib/supabase-server"
import { getImageGenProvider, env } from "@/lib/env"

// Image generation (Gemini/Replicate) can take 20-45s — extend beyond the 10s default
export const maxDuration = 60
import type { PromptOutput } from "@/types/db"

const RequestSchema = z.object({
  outputId: z.string().min(1),
  mode: z.enum(["prompt", "schema"]).default("prompt"),
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

interface RecraftImageResponse {
  data: Array<{ url: string; b64_json?: string }>
  error?: { message: string }
}

// ─── Aspect ratio helpers ─────────────────────────────────────────────────────

/**
 * Parse frame.aspect_ratio from schema_snapshot (handles both TEXT and JSONB storage).
 * Returns a normalised "W:H" string, e.g. "16:9", or "1:1" as fallback.
 */
function parseAspectRatio(schemaSnapshot: string | null): string {
  if (!schemaSnapshot) return "1:1"
  try {
    const snap = JSON.parse(schemaSnapshot) as Record<string, unknown>
    const frame = (
      typeof snap.frame === "string" ? JSON.parse(snap.frame) : snap.frame
    ) as Record<string, unknown> | null
    const ar = frame?.aspect_ratio
    return typeof ar === "string" && ar.length > 0 ? ar : "1:1"
  } catch {
    return "1:1"
  }
}

/**
 * Map any W:H string to the closest aspect ratio Gemini supports.
 * Gemini accepts: "1:1" | "3:4" | "4:3" | "9:16" | "16:9"
 */
function toGeminiAspectRatio(ar: string): string {
  const supported = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const
  if ((supported as readonly string[]).includes(ar)) return ar
  const [w, h] = ar.split(":").map(Number)
  if (!w || !h || isNaN(w) || isNaN(h)) return "1:1"
  const r = w / h
  if (r >= 1.6)  return "16:9"
  if (r >= 1.2)  return "4:3"
  if (r <= 0.625) return "9:16"
  if (r <= 0.85) return "3:4"
  return "1:1"
}

/**
 * Map any W:H string to Flux Schnell width/height (multiples of 16, max 1440).
 */
function toReplicateDimensions(ar: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "1:1":  { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768  },
    "9:16": { width: 768,  height: 1344 },
    "4:3":  { width: 1024, height: 768  },
    "3:4":  { width: 768,  height: 1024 },
    "3:2":  { width: 1152, height: 768  },
    "2:3":  { width: 768,  height: 1152 },
    "5:4":  { width: 1024, height: 816  },
    "4:5":  { width: 816,  height: 1024 },
  }
  if (map[ar]) return map[ar]!
  // Compute from ratio, rounding to nearest multiple of 16, capped at 1440
  const [w, h] = ar.split(":").map(Number)
  if (!w || !h || isNaN(w) || isNaN(h)) return { width: 1024, height: 1024 }
  const base = 1024
  const ratio = w / h
  const width  = Math.min(1440, Math.round((base * Math.sqrt(ratio)) / 16) * 16)
  const height = Math.min(1440, Math.round((base / Math.sqrt(ratio)) / 16) * 16)
  return { width, height }
}

/**
 * Map any W:H string to Recraft's accepted size strings.
 */
function toRecraftSize(ar: string): string {
  const map: Record<string, string> = {
    "1:1":  "1024x1024",
    "16:9": "1820x1024",
    "9:16": "1024x1820",
    "4:3":  "1365x1024",
    "3:4":  "1024x1365",
    "3:2":  "1536x1024",
    "2:3":  "1024x1536",
  }
  if (map[ar]) return map[ar]!
  const [w, h] = ar.split(":").map(Number)
  if (!w || !h || isNaN(w) || isNaN(h)) return "1024x1024"
  return w >= h ? "1365x1024" : "1024x1365"
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // 1. Validate request body
    const body: unknown = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "outputId is required" }, { status: 400 })
    }

    const { outputId, mode } = parsed.data
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

    // 3. Resolve generation prompt — text prompt or pretty-printed JSON schema
    let generationPrompt: string
    if (mode === "schema" && promptOutput.schema_snapshot) {
      try {
        const snap = JSON.parse(promptOutput.schema_snapshot) as Record<string, unknown>
        generationPrompt = JSON.stringify(snap, null, 2)
      } catch {
        // Malformed snapshot — fall back to text prompt
        generationPrompt = promptOutput.final_prompt ?? ""
      }
    } else {
      if (!promptOutput.final_prompt) {
        return NextResponse.json({ error: "Prompt output has no final_prompt" }, { status: 400 })
      }
      generationPrompt = promptOutput.final_prompt
    }

    // 4. Parse aspect ratio from schema snapshot
    const aspectRatio = parseAspectRatio(promptOutput.schema_snapshot)

    const provider = getImageGenProvider()
    let imgBuffer: Buffer
    let genFilename: string
    let contentType: string
    let model: string

    if (provider === "nano_banana_2") {
      // 5a. Nano Banana 2 — Gemini native image generation via REST
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for Nano Banana 2")
      }
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: generationPrompt }] }],
            generationConfig: {
              responseModalities: ["IMAGE"],
              aspectRatio: toGeminiAspectRatio(aspectRatio),
            },
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
    } else if (provider === "replicate") {
      // 5b. Replicate — Flux Schnell with aspect-ratio-aware dimensions
      if (!env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is required for Replicate")
      }
      const { width, height } = toReplicateDimensions(aspectRatio)
      const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          version: "black-forest-labs/flux-schnell",
          input: { prompt: generationPrompt, width, height },
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
      const imgResponse = await fetch(firstOutput)
      imgBuffer = Buffer.from(await imgResponse.arrayBuffer())
      contentType = "image/webp"
      genFilename = `gen-${crypto.randomUUID()}.webp`
      model = "flux-schnell"
    } else {
      // 5c. Recraft — aspect-ratio-aware size string
      if (!env.RECRAFT_API_KEY) {
        throw new Error("RECRAFT_API_KEY is required when IMAGE_GEN_PROVIDER=recraft")
      }
      const recraftRes = await fetch(
        "https://external.api.recraft.ai/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RECRAFT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: generationPrompt,
            n: 1,
            size: toRecraftSize(aspectRatio),
            model: "recraftv3",
          }),
        }
      )
      const recraftData = (await recraftRes.json()) as RecraftImageResponse
      if (!recraftRes.ok || !recraftData.data?.[0]?.url) {
        throw new Error(recraftData.error?.message ?? "Recraft generation failed")
      }
      const firstResult = recraftData.data[0]
      if (!firstResult) throw new Error("Recraft returned empty data")
      const recraftImgResponse = await fetch(firstResult.url)
      imgBuffer = Buffer.from(await recraftImgResponse.arrayBuffer())
      contentType = "image/webp"
      genFilename = `gen-${crypto.randomUUID()}.webp`
      model = "recraftv3"
    }

    // 6. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(genFilename, imgBuffer, { contentType, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from("uploads")
      .getPublicUrl(genFilename)

    // 7. Save to generated_images
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
