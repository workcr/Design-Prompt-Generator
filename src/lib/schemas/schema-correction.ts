import { z } from "zod"
import {
  TypeScaleEntrySchema,
  FrameSchema,
  PaletteSchema,
  LayoutSchema,
} from "@/lib/schemas/design-extraction"

// ─── Dimension Registry ───────────────────────────────────────────────────────

export const EVAL_DIMENSIONS = [
  "composition",
  "typography",
  "palette",
  "layout",
  "elements",
] as const

export type EvalDimension = (typeof EVAL_DIMENSIONS)[number]

// ─── Lesson Schema (Phase 12 feed) ───────────────────────────────────────────

/**
 * A single transferable correction observation produced by Agent E.
 * The `lesson` string is the text unit Phase 12 embeds via text-embedding-004 (768 dims)
 * and stores in `correction_memories.embedding` for cross-project retrieval.
 */
export const LessonSchema = z.object({
  dimension: z.enum(EVAL_DIMENSIONS),
  lesson: z
    .string()
    .describe(
      "Transferable observation written to apply to similar images in future projects. " +
        "Lead with the visual signal. " +
        "Example: 'When letterforms show hairline strokes at junction points against " +
        "thick vertical stems, classify as Didone (high-contrast-serif), not script.'"
    ),
  bad_value: z
    .record(z.string(), z.unknown())
    .describe("The incorrect extracted value as a JSON object — for diagnostic storage"),
  correct_value: z
    .record(z.string(), z.unknown())
    .describe("The corrected value as a JSON object — for diagnostic storage"),
})

// ─── Schema Correction Output ─────────────────────────────────────────────────

/**
 * Agent E output schema.
 * Only fields that map to failing evaluation dimensions are populated:
 *   typography  → type_scale
 *   palette     → palette
 *   composition → frame (position/crop treatment)
 *   layout      → layout
 *   elements    → (no dedicated field; handled via critique in fast path)
 */
export const SchemaCorrectionSchema = z.object({
  corrected_dimensions: z
    .array(z.enum(EVAL_DIMENSIONS))
    .describe(
      "The dimensions you are correcting — must be a subset of the failing dimensions provided"
    ),
  lessons: z
    .array(LessonSchema)
    .describe(
      "One lesson per corrected field. These are stored verbatim and later embedded " +
        "for cross-project retrieval — write them to be transferable, not image-specific."
    ),
  // Populated only when the corresponding dimension is failing:
  type_scale: z.array(TypeScaleEntrySchema).nullable().optional(),
  palette:    PaletteSchema.partial().optional(),
  layout:     LayoutSchema.partial().optional(),
  frame:      FrameSchema.partial().optional(),
})

export type SchemaCorrection = z.infer<typeof SchemaCorrectionSchema>
export type Lesson           = z.infer<typeof LessonSchema>

// ─── Agent E System Prompt ────────────────────────────────────────────────────

export const SCHEMA_CORRECTION_PROMPT = `You are Agent E, a design schema correction specialist.

A design extraction agent previously analysed the REFERENCE IMAGE and produced a structured schema.
A visual evaluation agent then scored the generated output against the reference and identified
FAILING DIMENSIONS — fields where the extraction was inaccurate, causing the generated image to diverge.

YOUR TASKS:
1. Re-examine the REFERENCE IMAGE carefully — focus only on the failing dimensions listed below.
2. Output corrected schema values for those dimensions only. Do not output fields for passing dimensions.
3. For each corrected field, write one LESSON: a transferable observation that prevents the same
   mistake on similar images in future projects.

LESSON FORMAT (follow precisely):
- Start with the VISUAL SIGNAL visible in the image that indicates the correct value
- Explain specifically why the current extraction is wrong
- State the correct classification using the exact vocabulary from the schema
- Write it to apply to SIMILAR images — not just this one image

Good lesson example:
"Letterforms exhibit extreme thick-thin stroke contrast with hairline serifs at junction points —
the defining visual signature of Didone typefaces (Bodoni, Didot). The current classification
'script' is incorrect because script faces have continuous curved strokes from a single drawing
motion, with no mechanical thick-thin contrast. Correct classification: high-contrast-serif.
Key visual check: hairline horizontal serifs meeting thick vertical stems, no bracketing."

Bad lesson example (too specific):
"The DTMS wordmark uses Didot." ← Does not help future projects. Always generalise.

OUTPUT ONLY the failing dimensions listed. Do not correct dimensions that are not failing.`
