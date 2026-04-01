import { z } from "zod"

const envSchema = z.object({
  // Mode — default applied before transform in Zod v4
  LOCAL_MODE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  IMAGE_GEN_PROVIDER: z.enum(["nano_banana_2", "replicate"]).optional(),

  // Local inference
  OLLAMA_BASE_URL: z
    .string()
    .url()
    .optional()
    .default("http://localhost:11434"),

  // Cloud AI providers
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Image generation fallback
  REPLICATE_API_TOKEN: z.string().optional(),

  // Storage (production only)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  )
  throw new Error("Invalid environment variables")
}

export const env = parsed.data

/** True when running locally with Ollama inference */
export const isLocalMode = (): boolean => env.LOCAL_MODE === true

/**
 * Resolves the active image generation provider.
 *
 * Resolution order:
 *  1. IMAGE_GEN_PROVIDER env var (explicit override — always honoured)
 *  2. LOCAL_MODE=true  → "replicate"     (Ollama handles agents, Replicate handles images locally)
 *  3. LOCAL_MODE=false → "nano_banana_2" (Gemini API, reuses GOOGLE_GENERATIVE_AI_API_KEY)
 */
export const getImageGenProvider = (): "nano_banana_2" | "replicate" => {
  if (env.IMAGE_GEN_PROVIDER) return env.IMAGE_GEN_PROVIDER
  return isLocalMode() ? "replicate" : "nano_banana_2"
}

/**
 * Resolves the vision/analysis model ID for Agent A.
 * Local: Ollama qwen3-vl:30b  |  Production: Gemini 2.0 Flash
 * Note: gemini-1.5-flash was deprecated; gemini-2.0-flash is GA with full vision support.
 */
export const getVisionModel = (): string =>
  isLocalMode() ? "qwen3-vl:30b" : "gemini-2.0-flash"

/**
 * Resolves the text model ID for Agents B1 and B2.
 * Local: Ollama qwen3-vl:30b  |  Production: GPT-4o mini
 */
export const getTextModel = (): string =>
  isLocalMode() ? "qwen3-vl:30b" : "gpt-4o-mini"
