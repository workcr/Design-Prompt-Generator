import { z } from "zod"

export const FrameSchema = z.object({
  aspect_ratio: z.string().describe("e.g. '16:9', '4:3', '1:1', '9:16'"),
  orientation: z.enum(["portrait", "landscape", "square"]),
  composition: z
    .string()
    .describe(
      "Compositional approach, e.g. 'rule of thirds', 'centered', 'dynamic diagonal'"
    ),
  negative_space: z.enum(["minimal", "moderate", "generous"]),
})

export const PaletteSchema = z.object({
  primary: z.string().describe("Dominant color as hex, e.g. '#1a1a2e'"),
  secondary: z.string().describe("Supporting color as hex"),
  accent: z.string().describe("Highlight/contrast color as hex"),
  background: z.string().describe("Background base color as hex"),
  text_color: z.string().describe("Primary text color as hex"),
  mood: z
    .string()
    .describe(
      "Color mood, e.g. 'warm cinematic', 'cool minimal', 'vibrant editorial'"
    ),
  saturation: z.enum(["desaturated", "muted", "natural", "vivid"]),
})

export const LayoutSchema = z.object({
  structure: z
    .string()
    .describe(
      "Layout structure, e.g. 'single-column centered', 'full-bleed with text overlay', 'asymmetric split'"
    ),
  focal_point: z.string().describe("Where the eye is drawn first"),
  visual_hierarchy: z
    .array(z.string())
    .describe("Design elements from most to least prominent"),
  depth: z.enum(["flat", "shallow", "deep"]),
})

export const TextFieldSchema = z.object({
  role: z
    .string()
    .describe("e.g. 'headline', 'subheading', 'body copy', 'caption', 'label'"),
  style: z
    .string()
    .describe("e.g. 'bold uppercase serif', 'light italic sans-serif'"),
  position: z
    .string()
    .describe("e.g. 'upper-center', 'lower-left', 'full-width overlay'"),
})

export const TypeScaleSchema = z.object({
  primary_typeface: z
    .string()
    .describe(
      "Font category, e.g. 'serif', 'sans-serif', 'display', 'monospace', 'script'"
    ),
  weight_range: z
    .string()
    .describe("e.g. 'light to bold', 'medium only', 'heavy display only'"),
  scale: z
    .string()
    .describe(
      "Size relationship, e.g. 'large headline with small body' or 'uniform scale'"
    ),
  letter_spacing: z.enum(["tight", "normal", "wide", "very-wide"]),
})

export const VisualElementSchema = z.object({
  type: z
    .string()
    .describe(
      "e.g. 'photograph', 'illustration', 'icon', 'texture', 'geometric shape', 'gradient overlay', 'pattern'"
    ),
  description: z.string().describe("Brief neutral description of the element"),
  position: z.string().describe("Where it appears in the frame"),
  prominence: z.enum(["dominant", "supporting", "accent"]),
})

export const DesignExtractionSchema = z.object({
  frame: FrameSchema,
  palette: PaletteSchema,
  layout: LayoutSchema,
  text_fields: z
    .array(TextFieldSchema)
    .describe("All distinct text elements visible in the image. Empty array if none."),
  type_scale: TypeScaleSchema.nullable().describe(
    "null if no meaningful typography is present"
  ),
  elements: z
    .array(VisualElementSchema)
    .describe("All significant visual design elements"),
  style_summary: z
    .string()
    .describe(
      "One concise sentence capturing the overall visual design style fingerprint"
    ),
})

export type DesignExtraction = z.infer<typeof DesignExtractionSchema>

/** Prompt used by Agent A for all design analysis calls */
export const DESIGN_ANALYSIS_PROMPT = `Analyze the visual design of this image. Extract its structural and aesthetic properties as a senior designer would — focus on composition, color relationships, typographic treatment, and visual element arrangement. Do NOT describe the subject matter or narrative; describe the design language.

For hex colors: sample actual pixel values visible in the image, expressed as lowercase hex strings like '#1a1a2e'.
For composition: describe the structural layout and spatial relationships, not the objects.
For elements: list design components (photography, shapes, textures, overlays) rather than scene objects.
Be precise and specific. Vague descriptions like 'some colors' or 'various elements' are not acceptable.`
