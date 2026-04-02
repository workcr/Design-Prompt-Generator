import { env } from "@/lib/env"

/**
 * Compute a text-embedding-004 vector (768 dims) for the given text.
 * Returns null on any error — callers treat embedding computation as non-fatal.
 * Uses the same GEMINI_API_KEY as Gemini image generation.
 */
export async function computeEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:   "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      }
    )
    if (!res.ok) {
      console.error("[embeddings] API error", res.status)
      return null
    }
    const data = (await res.json()) as { embedding?: { values?: number[] } }
    return data.embedding?.values ?? null
  } catch (err) {
    console.error("[embeddings] computeEmbedding failed:", err)
    return null
  }
}
