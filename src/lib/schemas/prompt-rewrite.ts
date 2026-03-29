import type { DesignSchema, GrammarBlueprint } from "@/types/db"
import type { GrammarBlueprintExtraction } from "@/lib/schemas/grammar-blueprint"

// ─── System Prompt ────────────────────────────────────────────────────────────

/** System prompt used by Agent B2 for all rewrite calls */
export const B2_REWRITE_SYSTEM_PROMPT = `You are Agent B2, a professional image-generation prompt engineer.

Your task: merge a design schema with a grammar blueprint to produce ONE high-quality image-generation prompt.

Rules:
1. Output ONLY the prompt text. No explanation, no preamble, no surrounding quotes, no labels.
2. Follow the grammar blueprint's writing style exactly — use its sequence template, compression style, density, and vocabulary.
3. Sections marked LOCKED must be reproduced faithfully in the prompt. Do not paraphrase or summarise them.
4. Sections marked unlocked may be re-expressed in the blueprint's voice and structure.
5. Match the blueprint's average character length (±20%).
6. Do not add platform-specific tags such as --ar, --v, --style, or any platform suffixes. Those are handled separately by the export panel.
7. The output is a single continuous prompt — no line breaks, no numbered lists, no section headers.`

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedGrammar = GrammarBlueprintExtraction
type ParsedSequence = GrammarBlueprintExtraction["sequence_pattern"]

// ─── Input Builder ────────────────────────────────────────────────────────────

/**
 * Serialises the edited design schema and grammar blueprint into a structured
 * user message for Agent B2.
 *
 * Locked sections are marked LOCKED so the model preserves them verbatim.
 * Unlocked sections are marked unlocked so the model may re-express them.
 */
export function buildRewriteInput(
  schema: DesignSchema,
  blueprint: GrammarBlueprint,
  lockedFields: string[]
): string {
  const parts: string[] = []

  // ── Section 1: Design Schema ─────────────────────────────────────────────

  parts.push("=== DESIGN SCHEMA ===\n")

  const schemaSection = (label: string, raw: string | null): string => {
    if (!raw) return ""
    const status = lockedFields.includes(label.toLowerCase().replace(" ", "_"))
      ? "LOCKED"
      : "unlocked"
    return `[${label}] — ${status}\n${raw}\n`
  }

  parts.push(schemaSection("frame", schema.frame))
  parts.push(schemaSection("palette", schema.palette))
  parts.push(schemaSection("layout", schema.layout))
  parts.push(schemaSection("type_scale", schema.type_scale))
  parts.push(schemaSection("text_fields", schema.text_fields))
  parts.push(schemaSection("elements", schema.elements))

  // ── Section 2: Grammar Blueprint ─────────────────────────────────────────

  parts.push("\n=== WRITING GRAMMAR ===\n")

  // Parse distilled_grammar for sub-fields (sentence_structure, qualifier_placement, etc.)
  const grammar: ParsedGrammar | null = blueprint.distilled_grammar
    ? (JSON.parse(blueprint.distilled_grammar) as ParsedGrammar)
    : null

  // Parse sequence_pattern for template
  const sequence: ParsedSequence | null = blueprint.sequence_pattern
    ? (JSON.parse(blueprint.sequence_pattern) as ParsedSequence)
    : null

  if (grammar?.summary) {
    parts.push(`Summary: ${grammar.summary}\n`)
  }

  if (sequence?.template) {
    parts.push(`Sequence template: ${sequence.template}\n`)
  }

  if (blueprint.compression_style) {
    parts.push(`Compression: ${blueprint.compression_style}\n`)
  }

  if (blueprint.density && blueprint.avg_length) {
    parts.push(
      `Density: ${blueprint.density} (~${blueprint.avg_length.toString()} chars avg)\n`
    )
  }

  if (grammar?.sentence_structure) {
    parts.push(`Sentence structure: ${grammar.sentence_structure}\n`)
  }

  if (grammar?.qualifier_placement) {
    parts.push(`Qualifier placement: ${grammar.qualifier_placement}\n`)
  }

  if (grammar?.characteristic_phrases && grammar.characteristic_phrases.length > 0) {
    parts.push(
      `Characteristic phrases: ${grammar.characteristic_phrases.join(" | ")}\n`
    )
  }

  if (grammar?.style_vocabulary && grammar.style_vocabulary.length > 0) {
    parts.push(`Style vocabulary: ${grammar.style_vocabulary.join(", ")}\n`)
  }

  return parts.filter(Boolean).join("")
}
