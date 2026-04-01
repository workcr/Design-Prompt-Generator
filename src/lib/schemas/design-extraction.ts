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
  bleed: z
    .boolean()
    .describe(
      "True if any element (text, image, shape) extends to or bleeds off one or more frame edges"
    ),
  crop_treatment: z
    .enum(["none", "tight-crop", "bleed-crop", "letterbox", "full-frame"])
    .describe("How the primary subject or imagery is cropped within the frame"),
  composition_notes: z
    .string()
    .describe(
      "Additional compositional observations, e.g. 'text bleeds off bottom edge', 'image occupies upper two-thirds'"
    ),
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
  character: z
    .string()
    .describe(
      "Palette personality in design terms, e.g. 'high-contrast monochromatic', 'warm duotone', 'editorial black-and-white', 'pastel editorial', 'bold primary triad'"
    ),
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

/** Per-role typographic fingerprint — Figma Typography panel fields (visually detectable only) */
export const TypeFingerprintSchema = z.object({
  // Core (detectable from raster image)
  fontFamily: z
    .string()
    .nullable()
    .describe("Identified typeface name if recognisable, else null — e.g. 'Didot', 'Helvetica Neue'"),
  fontStyle: z
    .string()
    .describe(
      "Weight/style descriptor: 'Thin'|'Light'|'Regular'|'Medium'|'SemiBold'|'Bold'|'ExtraBold'|'Black', plus italic variants"
    ),
  fontWeight: z
    .number()
    .int()
    .min(100)
    .max(900)
    .describe("Numeric weight 100–900, e.g. 400 (Regular), 700 (Bold)"),
  fontSize: z
    .enum(["display", "large", "medium", "small", "caption"])
    .describe("Relative size role within the composition"),

  // Inferred (Agent A classifies from visual analysis — not a raw Figma field)
  classification: z
    .enum([
      "high-contrast-serif",
      "low-contrast-serif",
      "slab-serif",
      "geometric-sans",
      "humanist-sans",
      "grotesque-sans",
      "monospace",
      "display",
      "script",
      "decorative",
    ])
    .describe(
      "Typeface classification: high-contrast-serif = Didot/Bodoni class; low-contrast-serif = Garamond/Caslon; slab-serif = Rockwell/Clarendon; geometric-sans = Futura/Avenir; humanist-sans = Gill Sans/Frutiger; grotesque-sans = Helvetica/Akzidenz"
    ),
  strokeContrast: z
    .enum(["none", "low", "medium", "high", "extreme"])
    .describe(
      "Thin-to-thick stroke ratio: none = monolinear; extreme = hairline-to-bold jump (Didot, Bodoni)"
    ),
  editorialStyle: z
    .string()
    .describe(
      "Free-text editorial character, e.g. 'Didot-class high fashion', 'Swiss International', 'warm humanist editorial', 'brutalist grotesque'"
    ),

  // Spacing
  letterSpacing: z.enum(["very-tight", "tight", "normal", "wide", "very-wide"]),
  lineHeight: z.enum(["compressed", "tight", "normal", "loose", "open"]),

  // Case / Alignment
  case: z.enum(["none", "uppercase", "lowercase", "title", "small-caps"]),
  alignment: z.enum(["left", "center", "right", "justified"]),

  // Decorative
  decoration: z
    .array(z.string())
    .describe("Decorative treatments, e.g. ['underline'], ['strikethrough'], or []"),

  // Numbers — null when no numerals visible in this role
  numberStyle: z
    .enum(["lining", "old-style"])
    .nullable()
    .describe("Lining = uniform cap-height numerals; Old-style = varying height. null if no numerals visible."),
  numberPosition: z
    .enum(["normal", "superscript", "subscript"])
    .nullable()
    .describe("null if no numerals or no positional treatment detected"),

  // Variable font axes — null when not detectable
  variable: z
    .object({
      weight: z.number().nullable(),
      slant: z.number().nullable(),
    })
    .nullable()
    .describe("Variable font axis values if detectable from unusual interpolation; null otherwise"),

  // Layout interactions (attached to the text role, not the frame)
  hangingPunctuation: z
    .boolean()
    .describe("True if punctuation hangs outside the text block edge"),
  paragraphIndent: z
    .boolean()
    .describe("True if first line of paragraphs is indented"),
  listStyle: z.enum(["none", "unordered", "ordered"]),
})

export type TypeFingerprint = z.infer<typeof TypeFingerprintSchema>

export const TypeScaleEntrySchema = z.object({
  role: z
    .string()
    .describe(
      "Typography role, e.g. 'headline', 'subheading', 'body', 'caption', 'label', 'eyebrow', 'pullquote'"
    ),
  fingerprint: TypeFingerprintSchema,
})

export type TypeScaleEntry = z.infer<typeof TypeScaleEntrySchema>

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
  type_scale: z
    .array(TypeScaleEntrySchema)
    .nullable()
    .describe(
      "Per-role typographic fingerprints. One entry per distinct text role visible. null if no meaningful typography present."
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
export const DESIGN_ANALYSIS_PROMPT = `Analyze the visual design of this image. Extract its structural and aesthetic properties with the precision of a senior art director. Focus on composition, color relationships, typographic treatment, and visual element arrangement. Do NOT describe subject matter or narrative — describe the design language.

TYPOGRAPHY — for each distinct text role visible (headline, subheading, body, caption, label, eyebrow, pullquote, etc.), produce one entry in type_scale:
- role: the typographic role this text plays in the hierarchy
- fingerprint.classification: be precise — not just "serif" but:
    "high-contrast-serif" = Didot/Bodoni/Vogue-era — extreme thin/thick contrast
    "low-contrast-serif" = Garamond/Caslon/Times — moderate, readable stroke variation
    "slab-serif" = Rockwell/Clarendon — heavy uniform serifs
    "geometric-sans" = Futura/Avenir/Gill — circular, constructed forms
    "humanist-sans" = Frutiger/Myriad/Optima — calligraphic influence, open apertures
    "grotesque-sans" = Helvetica/Akzidenz/Trade Gothic — rational, neutral, closed apertures
    "monospace" = Courier/Roboto Mono — fixed-width
    "display" = decorative or highly stylised faces not fitting above categories
    "script" = handwritten or calligraphic
    "decorative" = ornamental, pictorial, or novelty
- fingerprint.strokeContrast: none (monolinear) / low / medium / high / extreme (hairline-to-bold jump)
- fingerprint.editorialStyle: free text — editorial personality, e.g. "Didot-class high fashion", "Swiss International rationalist", "warm humanist editorial", "brutalist grotesque", "American gothic display"
- fingerprint.fontFamily: name if recognisable (e.g. "Didot", "Helvetica Neue"), null if uncertain
- fingerprint.fontStyle: weight descriptor ("Thin", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"), plus "Italic" variants
- fingerprint.fontWeight: numeric 100–900
- fingerprint.fontSize: "display" / "large" / "medium" / "small" / "caption" — relative role in the composition
- fingerprint.letterSpacing: very-tight / tight / normal / wide / very-wide
- fingerprint.lineHeight: compressed / tight / normal / loose / open
- fingerprint.case: none / uppercase / lowercase / title / small-caps
- fingerprint.alignment: left / center / right / justified
- fingerprint.decoration: array of strings (e.g. ["underline"]) or []
- fingerprint.numberStyle: "lining" / "old-style" / null (null if no numerals visible)
- fingerprint.numberPosition: "normal" / "superscript" / "subscript" / null
- fingerprint.variable: { weight, slant } or null (null unless variable font axes are detectable)
- fingerprint.hangingPunctuation: true if punctuation hangs outside the text block
- fingerprint.paragraphIndent: true if paragraph first-line indent is visible
- fingerprint.listStyle: "none" / "unordered" / "ordered"

FRAME:
- bleed: true if any element (text, image, colour block) extends to or past a frame edge
- crop_treatment: "none" / "tight-crop" / "bleed-crop" / "letterbox" / "full-frame"
- composition_notes: additional observations beyond the structure field — edge tension, overflow, layering, grid adherence

PALETTE:
- Sample actual pixel hex values (#rrggbb lowercase) for primary, secondary, accent, background, text_color
- character: palette personality in design terms — NOT "vibrant" or "colourful" but specific: "high-contrast monochromatic", "warm duotone", "editorial black-and-white with red accent", "pastel editorial", "bold primary triad", "desaturated earth tones"
- mood and saturation as usual

ELEMENTS: list design components (photography, geometric shapes, textures, rule lines, gradient overlays, icon sets) — not scene objects.

style_summary: one sentence capturing the design language fingerprint.

Be precise and specific. Vague descriptions like "bold font", "some colors", "various elements", or "vibrant" are not acceptable.`
