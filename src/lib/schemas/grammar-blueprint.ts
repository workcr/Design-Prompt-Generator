import { z } from "zod"

export const SequencePatternSchema = z.object({
  elements: z
    .array(z.string())
    .describe(
      "Ordered element types found across the prompts, e.g. ['subject', 'style', 'medium', 'lighting', 'mood', 'platform-tag']"
    ),
  template: z
    .string()
    .describe(
      "Representative template showing typical structure, e.g. '{subject}, {style}, shot on {camera}, {mood}, {platform-tag}'"
    ),
})

export const GrammarBlueprintExtractionSchema = z.object({
  sequence_pattern: SequencePatternSchema,
  density: z
    .enum(["sparse", "medium", "dense"])
    .describe("sparse = avg < 30 words, medium = 30–60, dense = 60+"),
  avg_length: z
    .number()
    .int()
    .describe("Average character count across all input prompts (integer)"),
  compression_style: z
    .string()
    .describe(
      "How information is compressed, e.g. 'noun stacks with commas', 'telegraphic fragments', 'full descriptive phrases', 'run-on clause chains'"
    ),
  sentence_structure: z
    .string()
    .describe(
      "Grammatical pattern, e.g. 'subject-first fragments', 'modifier clusters after subject', 'comma-separated noun stacks'"
    ),
  qualifier_placement: z
    .string()
    .describe(
      "Where qualifiers appear relative to nouns, e.g. 'pre-noun stacking', 'end-appended', 'parenthetical inserts', 'inline after comma'"
    ),
  characteristic_phrases: z
    .array(z.string())
    .max(5)
    .describe(
      "Up to 5 structural patterns that recur across prompts — grammar patterns, NOT content (e.g. 'X on Y background', 'shot on [camera]', 'in the style of')"
    ),
  style_vocabulary: z
    .array(z.string())
    .max(10)
    .describe(
      "Up to 10 domain-specific terms or phrases that recur and define this prompt family's voice (technical jargon, platform tags, recurring descriptors)"
    ),
  summary: z
    .string()
    .describe(
      "One sentence capturing the writing grammar fingerprint of this prompt family — focus on mechanics, not content"
    ),
})

export type GrammarBlueprintExtraction = z.infer<
  typeof GrammarBlueprintExtractionSchema
>

/** Prompt used by Agent B1 for all grammar distillation calls */
export const GRAMMAR_DISTILLATION_PROMPT = `Analyze the following AI image-generation prompts as a collection from the same author or style family. Your goal is NOT to understand what the images depict — focus entirely on HOW these prompts are written.

Extract the structural grammar: how information is sequenced, how dense the writing is, what compression technique is used (noun stacks, fragments, full phrases), where modifiers cluster, what vocabulary recurs across multiple prompts, and what structural patterns repeat.

Do NOT describe image subjects or content. Describe the mechanics of the writing style.

Think of yourself as a linguist studying a dialect — extract the rules and patterns that define how this author writes prompts, not what they write about.

The prompts follow this message, numbered:`
