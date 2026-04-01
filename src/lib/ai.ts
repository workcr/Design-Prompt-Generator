import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { isLocalMode, getVisionModel, getTextModel, env } from "@/lib/env"

/**
 * Returns the active vision model for Agent A.
 * LOCAL_MODE=true  → Ollama via OpenAI-compatible endpoint (qwen3-vl:30b)
 * LOCAL_MODE=false → Google Gemini 1.5 Flash
 *
 * Note: @ai-sdk/ollama does not exist on npm. Ollama exposes an
 * OpenAI-compatible API at /v1 — we use @ai-sdk/openai with a custom
 * baseURL instead.
 */
export function getVisionProvider() {
  if (isLocalMode()) {
    const ollama = createOpenAI({
      baseURL: `${env.OLLAMA_BASE_URL}/v1`,
      apiKey: "ollama",
    })
    // Use .chat() to force /v1/chat/completions instead of /v1/responses.
    // Ollama's Responses API has incomplete image support; the Chat
    // Completions endpoint handles base64 image buffers correctly.
    return ollama.chat(getVisionModel())
  }

  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is required when LOCAL_MODE=false"
    )
  }

  const google = createGoogleGenerativeAI({
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
  })
  return google(getVisionModel())
}

/**
 * Returns the active text model for Agents B1 and B2.
 * LOCAL_MODE=true  → Ollama via OpenAI-compatible endpoint (qwen3-vl:30b)
 * LOCAL_MODE=false → OpenAI gpt-4o-mini
 *
 * Reuses @ai-sdk/openai for both paths — Ollama via custom baseURL,
 * OpenAI via standard API key.
 */
export function getTextProvider() {
  if (isLocalMode()) {
    const ollama = createOpenAI({
      baseURL: `${env.OLLAMA_BASE_URL}/v1`,
      apiKey: "ollama",
    })
    return ollama(getTextModel())
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required when LOCAL_MODE=false"
    )
  }

  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
  return openai(getTextModel())
}
