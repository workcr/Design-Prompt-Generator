import { z } from "zod"

export const DimensionScoreSchema = z.object({
  score: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("1 = very different, 3 = partial match, 5 = exact match"),
  verdict: z
    .enum(["match", "partial", "miss"])
    .describe("match = score 4-5, partial = score 2-3, miss = score 1"),
  notes: z
    .string()
    .describe(
      "Specific observations about this dimension — what matched and what diverged"
    ),
})

export const EvaluationResultSchema = z.object({
  composition: DimensionScoreSchema.describe(
    "Spatial arrangement, balance, rule of thirds, negative space use, bleed"
  ),
  typography: DimensionScoreSchema.describe(
    "Typeface classification, weight, case treatment, scale hierarchy, letter-spacing"
  ),
  palette: DimensionScoreSchema.describe(
    "Color palette character — hues, contrast, saturation, monochromatic vs polychromatic"
  ),
  layout: DimensionScoreSchema.describe(
    "Layout structure — single-column, full-bleed, asymmetric split, text overlays"
  ),
  elements: DimensionScoreSchema.describe(
    "Visual element types — photography, geometric shapes, textures, rule lines, overlays"
  ),
  critique: z
    .string()
    .describe(
      "One paragraph: overall assessment, most significant divergences, suggested prompt changes"
    ),
})

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>
export type DimensionScore = z.infer<typeof DimensionScoreSchema>

/** Prompt used by Agent D for structured visual evaluation */
export const EVALUATION_PROMPT = `You are a senior art director evaluating how closely a generated image matches a reference design.

You will receive TWO images:
1. REFERENCE — the original design to match
2. GENERATED — the AI-generated output to evaluate

Score the generated image against the reference across 5 dimensions. For each dimension provide:
- score: 1 (very different) → 5 (exact match)
- verdict: "match" (score 4-5), "partial" (score 2-3), "miss" (score 1)
- notes: specific observations — what is correct, what diverged, and how significant

DIMENSIONS:
1. composition — spatial arrangement, subject placement, balance, negative space use, bleed edges
2. typography — typeface class (serif subtype, sans subtype), weight, case treatment, scale hierarchy, letter-spacing
3. palette — color palette character (monochromatic vs polychromatic, hue accuracy, contrast level, specific hex deviations)
4. layout — structural layout (single-column, full-bleed, text overlay, asymmetric split, grid adherence)
5. elements — visual element types present (photography, geometric shapes, textures, rule lines, gradient overlays)

Be precise. Do not write vague observations like "colors are different" — specify which colors, where they appear, and why the deviation matters for design fidelity.

critique: one paragraph summarising the most important divergences and the specific prompt changes a prompt engineer should make to close the gap.`
