# Roadmap: Design Prompt Generator

## Overview

The project evolves across two milestones. v0.1 delivered the full local pipeline from image to generated output, shipped on Vercel with Supabase. v0.2 closes the quality loop — richer extraction, visual evaluation, user-guided refinement, and Ideogram as a specialist provider for typographic designs.

## Current Milestone

**v0.2 — Output Quality Loop** (v0.2.0)
Status: ✅ Complete
Phases: 2 of 2 complete

## Milestones

### v0.1 — Local Pipeline MVP ✅ SHIPPED (2026-03-31)

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation | 3 | ✅ Complete | 2026-03-28 |
| 2 | Agent A — Design Schema Extraction | 2 | ✅ Complete | 2026-03-28 |
| 3 | Agent B1 — Grammar Blueprint Distillation | 2 | ✅ Complete | 2026-03-28 |
| 4 | Structured Prompt Editor | 2 | ✅ Complete | 2026-03-29 |
| 5 | Agent B2 + Prompt Export Panel | 3 | ✅ Complete | 2026-03-29 |
| 6 | Image Generation + Comparison | 2 | ✅ Complete | 2026-03-30 |
| 7 | Polish + Local-First UX | 2 | ✅ Complete | 2026-03-30 |
| 8 | Production Deploy | 3 | ✅ Complete | 2026-03-31 |

### v0.2 — Output Quality Loop

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 9 | Extraction Upgrade | 1 | ✅ Complete | 2026-03-31 |
| 10 | Evaluation + Refinement Loop | 3 | ✅ Complete | 2026-04-01 |

## Phase Details

### Phase 1: Foundation

**Goal:** Working project workspace with file upload — the shell everything else plugs into
**Depends on:** Nothing (first phase)
**Research:** Unlikely (standard Next.js + SQLite scaffold)

**Scope:**
- Next.js 15 project scaffold with pnpm
- Tailwind CSS + shadcn/ui setup
- SQLite schema + migrations via better-sqlite3
- Env config system (LOCAL_MODE switch, provider resolution)
- Project CRUD API + dashboard UI
- File upload endpoint (image/* only, max 10MB)

**Plans:**
- [x] 01-01: Scaffold + Env Config (Next.js 16 · Tailwind v4 · shadcn/ui · env.ts) — 2026-03-28
- [x] 01-02: Data Layer + Project API (SQLite schema · /api/projects CRUD) — 2026-03-28
- [x] 01-03: File Upload + Dashboard UI (/api/upload · dashboard · workspace shell) — 2026-03-28

---

### Phase 2: Agent A — Design Schema Extraction

**Goal:** The system can reverse-engineer an image into an editable design representation
**Depends on:** Phase 1 (project workspace + file upload)
**Research:** Likely (Vercel AI SDK structured output, Ollama vision integration, Zod schema design)
**Research topics:** Vercel AI SDK structured output with Ollama; qwen3-vl:30b vs cogvlm2:10b quality for schema extraction

**Scope:**
- /api/analyze streaming endpoint
- Vercel AI SDK integration (Ollama local / Gemini 1.5 Flash prod)
- Image → DesignSchema structured output with Zod validation
- Schema viewer UI in Analyze tab

**Plans:**
- [x] 02-01: AI SDK + /api/analyze backend (Vercel AI SDK · DesignExtraction Zod · generateObject) — 2026-03-28
- [x] 02-02: Analyze tab UI (image upload widget · schema viewer · loading state) — 2026-03-28

---

### Phase 3: Agent B1 — Grammar Blueprint Distillation

**Goal:** The system can learn how a prompt family writes — independently of subject matter
**Depends on:** Phase 1 (project workspace)
**Research:** Likely (grammar extraction prompt design, blueprint schema structure)
**Research topics:** Prompt grammar distillation patterns; how many reference prompts are needed (3/5/10)

**Scope:**
- /api/distill streaming endpoint
- Multi-prompt input UI (paste list)
- Grammar extraction into GrammarBlueprint Zod schema
- Blueprint save + library view

**Plans:**
- [x] 03-01: Grammar Blueprint backend (getTextProvider · GrammarBlueprintExtractionSchema · /api/distill) — 2026-03-28
- [x] 03-02: Blueprint tab UI (prompt textarea · distill button · grammar viewer) — 2026-03-28

---

### Phase 4: Structured Prompt Editor

**Goal:** Users can safely customize extracted design logic without breaking coherence
**Depends on:** Phase 2 (DesignSchema exists)
**Research:** Unlikely (standard form + state management patterns)

**Scope:**
- Schema field editor (text, color picker, layout selector, image slot)
- Field lock/unlock toggle with persistence
- Locked fields propagated to Agent B2 output
- Schema diff view (original vs edited)

**Plans:**
- [x] 04-01: Schema API Routes (GET /api/schemas · PATCH /api/schemas/[id] · locked_fields persistence) — 2026-03-29
- [x] 04-02: Prompt Editor UI (PromptTab · editable fields · lock toggles · save) — 2026-03-29

---

### Phase 5: Agent B2 + Prompt Export Panel

**Goal:** The two layers merge into one high-quality prompt copyable for any platform
**Depends on:** Phases 2, 3, 4 (schema + blueprint + editor all present)
**Research:** Likely (platform-specific prompt formatting: Midjourney v7 syntax, Freepik tags, Higgsfield AI params)
**Research topics:** Current Midjourney v7, Freepik, and Higgsfield AI parameter syntax

**Scope:**
- /api/rewrite streaming endpoint
- Schema + blueprint → final prompt generation
- Prompt preview UI (streaming display)
- Prompt Export Panel: clipboard copy with platform presets (Midjourney, Freepik, Higgsfield AI, plain text)
- Character count + token estimate per platform
- PromptOutput saved to DB

**Plans:**
- [x] 05-01: Agent B2 Backend (/api/rewrite streaming · B2_REWRITE_SYSTEM_PROMPT · buildRewriteInput · prompt_outputs save) — 2026-03-29
- [x] 05-02: Generation UI (GET /api/blueprints · blueprint selector · Generate button · streaming display · outputId state) — 2026-03-29
- [x] 05-03: Export Panel (platform presets · MJ v7 suffix · AR selector · clipboard copy · char/token count) — 2026-03-29

---

### Phase 6: Image Generation + Comparison

**Goal:** Full pipeline complete — image in, image out, provider-swappable
**Depends on:** Phase 5 (final prompt exists)

**Scope:**
- /api/generate with provider switch (Nano Banana 2 primary / Replicate fallback)
- IMAGE_GEN_PROVIDER env flag for zero-code provider swap
- reference_image column migration + /api/uploads/[filename] serve route
- Output tab with prompt preview + side-by-side reference vs generated comparison
- GeneratedImage saved to DB with provider field

**Plans:**
- [x] 06-01: Image Generation Backend (schema migration · /api/uploads/[filename] · /api/generate · Replicate Prefer:wait) — 2026-03-30
- [x] 06-02: Output Tab UI (/api/prompt-outputs · /api/generated-images · output-tab.tsx · gemini-2.5-flash-image) — 2026-03-30

---

### Phase 7: Polish + Local-First UX

**Goal:** The system is usable end-to-end as a daily tool, not just a demo
**Depends on:** Phase 6 (full pipeline working)
**Research:** Unlikely (internal patterns, existing components)

**Scope:**
- Project history view
- Blueprint library management
- Prompt output history per project
- Export (schema JSON, final prompt text, generated image download)
- Onboarding flow for new users

**Plans:**
- [x] 07-01: Output History + Download (Replicate persistence · prompt-outputs list · history selector · copy · download) — 2026-03-30
- [x] 07-02: Blueprint + Project Management (blueprint library · delete endpoint · project rename · schema JSON export) — 2026-03-30

---

### Phase 8: Production Deploy ✅

**Goal:** Publicly accessible hosted version with auth and persistent storage
**Completed:** 2026-03-31

**Plans:**
- [x] 08-01: Supabase schema + all API routes migrated from SQLite — 2026-03-31
- [x] 08-02: Image storage migrated to Supabase Storage + Vercel deploy — 2026-03-31
- [x] 08-03: Production smoke test, Gemini model upgrades, Vercel timeout fixes — 2026-03-31

---

## v0.2 — Output Quality Loop

### Phase 9: Extraction Upgrade

**Goal:** Agent A produces semantically rich schemas that capture typeface character, composition treatment, and palette intent — eliminating vocabulary gaps in the final prompt
**Depends on:** Phase 8 (production pipeline running)
**Research:** Unlikely (prompt engineering + Zod schema enrichment, no new dependencies)

**Scope:**
- Rewrite `DESIGN_ANALYSIS_PROMPT` with richer vocabulary: serif subtype classification, stroke contrast, editorial style class, explicit bleed/crop detection, palette character
- Enrich `DesignExtractionSchema` (Zod): add `fingerprint` sub-object to each `type_scale` role entry (full spec below); add `crop_treatment`, `composition_notes`, `bleed` to `frame`; add `character` to `palette`
- No Supabase migration needed — `type_scale`, `frame`, `palette` already stored as JSONB
- **`fingerprint` field spec** (Figma Typography panel, filtered to visually detectable fields only):
  - Core: `fontFamily` (string|null), `fontStyle` (string), `fontWeight` (100–900), `fontSize` ("display"|"large"|"medium"|"small"|"caption")
  - Inferred: `classification` ("high-contrast-serif"|"low-contrast-serif"|"slab-serif"|"geometric-sans"|"humanist-sans"|"grotesque-sans"|"monospace"|"display"|"script"|"decorative"), `strokeContrast` ("none"|"low"|"medium"|"high"|"extreme"), `editorialStyle` (free text)
  - Spacing: `letterSpacing` ("very-tight"|"tight"|"normal"|"wide"|"very-wide"), `lineHeight` ("compressed"|"tight"|"normal"|"loose"|"open")
  - Case/Align: `case` ("none"|"uppercase"|"lowercase"|"title"|"small-caps"), `alignment` ("left"|"center"|"right"|"justified")
  - Decorative: `decoration` (string[])
  - Numbers: `numberStyle` ("lining"|"old-style"|null), `numberPosition` ("normal"|"superscript"|"subscript"|null)
  - Variable: `variable` ({ weight: number|null, slant: number|null } | null)
  - Layout interactions: `hangingPunctuation` (boolean), `paragraphIndent` (boolean), `listStyle` ("none"|"unordered"|"ordered")
  - *Omitted (not detectable in raster images)*: verticalTrim, caseSensitiveForms, capitalSpacing, all OpenType feature flags (contextualAlternates, rareLigatures, characterVariants, stylisticSets, kerningPairs), scientificInferiors
- Manual test: 5–10 diverse reference images, compare old vs new schema quality

**Plans:**
- [ ] 09-01: TBD during plan-phase

---

### Phase 10: Evaluation + Refinement Loop

**Goal:** Closed feedback loop — users diagnose where output diverged, guide refinement with editable critique, iterate until satisfied
**Depends on:** Phase 9 (richer extraction improves raw material going into the loop)
**Research:** Likely (Ideogram API, evaluation prompt design, iteration state management)
**Research topics:** Ideogram v2/v3 model quality for typographic designs; evaluation prompt structure for 5-dimension visual scoring

**Scope:**
- Supabase table: `evaluation_scores` (id, prompt_output_id, project_id, reference_image, generated_image_url, scores JSONB, verdicts JSONB, critique TEXT, iteration INT, created_at)
- `POST /api/evaluate` — Agent D: Gemini 2.5 Flash vision, structured 5-dimension scores + verdicts (match/partial/miss) + critique text
- `POST /api/refine` — user-edited critique → Agent B2 rewrite → /api/generate → new GeneratedImage
- `PATCH /api/evaluation-scores/[id]` — save user critique edits before resubmit
- Ideogram as third image gen provider (IMAGE_GEN_PROVIDER=ideogram, IDEOGRAM_API_KEY)
- Output tab UI: "Evaluate" button → verdict chips (✓/⚠/✗) + editable critique textarea → "Refine" → side-by-side new image → iteration history strip → "Accept"

**Plans:**
- [ ] 10-01: TBD during plan-phase

---
*Roadmap created: 2026-03-28*
*Last updated: 2026-03-31 — v0.2 milestone initialized*
