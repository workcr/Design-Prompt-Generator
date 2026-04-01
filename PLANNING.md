# Design Prompt Generator

> An AI-powered visual prompt operating system that converts an image into editable design logic, learns the writing grammar of a target prompt family, and combines both into a high-quality image-generation prompt.

**Created:** 2026-03-27
**Type:** Application
**Stack:** Next.js 15 + TypeScript + SQLite + Vercel AI SDK + Nano Banana 2 (Gemini API) + Tailwind + shadcn/ui
**Skill Loadout:** GSD, ui-ux-pro-max, /paul:audit
**Quality Gates:** type safety, agent output validation, schema integrity, prompt coherence

---

## Problem Statement

Prompt quality for image generation depends on two separate things that are almost always conflated:

1. **The visual logic of the image** — composition, palette, layout, typographic scale, element hierarchy
2. **The writing grammar of strong prompts** — how ideas are sequenced, compressed, and expressed

Most tools describe images loosely or imitate existing prompts wholesale. This system separates those two layers, handles them independently, and only combines them at the final step — making the pipeline more controllable, reusable, and scalable.

**Who it's for:** Solo use (dogfooding), with a path to a hosted web product.

**Why build vs buy:** Nothing on the market separates design-logic extraction from prompt-grammar learning. Existing tools either describe images or remix prompts — none treat them as orthogonal concerns.

---

## The Core Pipeline

```
INPUT
  ├── Upload: Reference image       → Agent A   → Design Schema (structured, editable)
  └── Input: Reference prompt list  → Agent B1  → Grammar Blueprint (reusable)

EDITOR
  └── Structured Prompt Editor
        ├── Edit: text, colors, layout, image slots, typographic scale
        └── Lock: style-critical fields to preserve coherence

OUTPUT
  └── Agent B2 (Schema + Blueprint) → Final Prompt ──┬── Nano Banana 2 (primary) → Output Image
                                                      ├── Replicate (fallback)     → Output Image
                                                      └── Copy to clipboard → Freepik / Higgsfield AI / Midjourney / etc.
```

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend + Backend | Next.js 15 (App Router) + TypeScript | Local-first → Vercel deploy with zero config; API routes handle agent streaming |
| AI Orchestration | Vercel AI SDK | Unified interface for OpenAI, Google, Anthropic, Ollama — swap via env var |
| Vision (local) | Ollama — `qwen3-vl:30b` | Already installed; free, fast for dev |
| Vision (production) | Gemini 2.5 Flash | Current stable multimodal model; 1.5/2.0 deprecated for new API users |
| Text (production) | GPT-4o mini | Cost-effective for B1/B2 grammar tasks |
| Image Generation (primary) | Nano Banana 2 — `gemini-3.1-flash-image-preview` | Same Gemini API key already in use; 4K output, grounding, ~$0.067/1024px |
| Image Generation (fallback) | Replicate API | Account exists; Flux / SDXL when Nano Banana 2 is unavailable or too expensive |
| Image Generation (typographic) | Ideogram v2 | Purpose-built for text-in-image design; outperforms Gemini/Flux on editorial/typographic compositions; ~$0.08/image |
| UI | Tailwind CSS + shadcn/ui | Structured editor primitives (color pickers, locked fields, comboboxes) |
| Storage (local) | SQLite via `better-sqlite3` | Zero-config, file-based, perfect for local-first |
| Storage (production) | Supabase | Drop-in swap, same query patterns, adds auth + file storage |
| Package Manager | pnpm | Fast, efficient, monorepo-ready |

### AI Provider Config (env-driven switching)

```
LOCAL_MODE=true  → Ollama (qwen3-vl:30b) for all agents; Replicate for image gen
LOCAL_MODE=false → Gemini 2.5 Flash (Agent A + Agent D) + GPT-4o mini (B1, B2) + Nano Banana 2 / Ideogram / Replicate (image gen)
```

### Research Needed
- Nano Banana 2 quality benchmark against Replicate Flux.1-dev for design-system-derived prompts — Phase 6
- cogvlm2:10b vs qwen3-vl:30b for Agent A local mode — benchmark at Phase 2
- Platform-specific prompt formatting rules (Midjourney suffix syntax, Freepik style tags, Higgsfield AI parameters) — Phase 5

---

## Data Model

### Entities

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| `Project` | id, name, created_at, status | has one DesignSchema, one GrammarBlueprint, many PromptOutputs |
| `DesignSchema` | id, project_id, frame, palette, layout, text_fields, type_scale, elements, style_checksum, locked_fields, raw_analysis | belongs to Project; edited by user |
| `GrammarBlueprint` | id, project_id, sequence_pattern, density, avg_length, compression_style, raw_prompts, distilled_grammar | belongs to Project; reusable across projects |
| `PromptOutput` | id, project_id, schema_snapshot, blueprint_id, final_prompt, model_used, created_at | belongs to Project; references Blueprint |
| `GeneratedImage` | id, prompt_output_id, provider, provider_job_id, model, url, status, created_at | belongs to PromptOutput; provider = "nano_banana_2" \| "replicate" \| "ideogram" |
| `EvaluationScore` | id, prompt_output_id, project_id, reference_image, generated_image_url, scores, verdicts, critique, iteration, created_at | belongs to PromptOutput; one per refinement iteration |

### Schema Detail: `DesignSchema`

```json
{
  "frame": {
    "aspect_ratio": "4:5",
    "orientation": "portrait",
    "bleed": true,
    "crop_treatment": "bleeds-top",
    "composition_notes": "letterforms intentionally oversized, cropped at top edge"
  },
  "palette": {
    "primary": "#000000",
    "secondary": "#f2f2f2",
    "character": "monochromatic high-contrast"
  },
  "layout": { "type": "editorial", "hierarchy": ["wordmark", "year", "tagline"] },
  "text_fields": [{ "role": "headline", "content": "DTMS", "locked": false }],
  "type_scale": {
    "headline": "display/bleed",
    "body": "12px/1.4",
    "fingerprint": {
      "fontFamily":        "Didot",
      "fontStyle":         "Regular",
      "fontWeight":        400,
      "fontSize":          "display",

      "classification":    "high-contrast-serif",
      "strokeContrast":    "extreme",
      "editorialStyle":    "Didot-class",

      "letterSpacing":     "normal",
      "lineHeight":        "compressed",

      "case":              "uppercase",
      "alignment":         "left",
      "decoration":        ["none"],

      "numberStyle":       null,
      "numberPosition":    null,

      "variable":          null,

      "hangingPunctuation": false,
      "paragraphIndent":   false,
      "listStyle":         "none"
    }
  },
  "elements": [],
  "style_checksum": "editorial_monochrome_serif"
}
```

### Schema Detail: `EvaluationScore`

```json
{
  "scores": { "typography": 3, "layout": 6, "color": 9, "hierarchy": 7, "mood": 5 },
  "verdicts": { "typography": "miss", "layout": "partial", "color": "match", "hierarchy": "partial", "mood": "partial" },
  "critique": "The typeface is rendered as bold sans-serif instead of the high-contrast editorial serif in the reference. The letterforms should bleed off the top edge — they are fully contained in the output. Color match is correct."
}
```

### Notes
- `locked_fields` is a string array on `DesignSchema` listing field paths the user has pinned
- `GrammarBlueprint` is reusable — one blueprint can be applied to many projects
- `raw_analysis` and `raw_prompts` stored as JSON for auditability and replay
- `EvaluationScore.critique` is user-editable — Agent D writes it, user can redirect before resubmitting to Agent B2
- `EvaluationScore.iteration` starts at 0 (initial generation), increments with each refinement

---

## API Surface

### Auth Strategy
- **Local:** No auth (single-user)
- **Production:** Supabase Auth (email/magic link) — added at deployment phase

### Route Groups

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/projects` | GET, POST | local: none | List / create projects |
| `/api/projects/[id]` | GET, PATCH, DELETE | local: none | Get / update / delete project |
| `/api/analyze` | POST | local: none | Agent A — image → DesignSchema (streaming) |
| `/api/distill` | POST | local: none | Agent B1 — prompts → GrammarBlueprint (streaming) |
| `/api/rewrite` | POST | local: none | Agent B2 — schema + blueprint → final prompt (streaming) |
| `/api/generate` | POST | local: none | Send final prompt to Nano Banana 2 (primary) or Replicate (fallback), return image |
| `/api/schemas/[id]` | GET, PATCH | local: none | Get / update DesignSchema (field edits + locks) |
| `/api/blueprints` | GET, POST | local: none | List / create GrammarBlueprints |
| `/api/blueprints/[id]` | GET | local: none | Get blueprint detail |
| `/api/outputs/[id]` | GET | local: none | Get PromptOutput + GeneratedImage |
| `/api/evaluate` | POST | local: none | Agent D — reference + generated image → EvaluationScore (scores, verdicts, critique) |
| `/api/refine` | POST | local: none | Takes evaluation_score_id (with user-edited critique) → Agent B2 rewrite → triggers /api/generate |
| `/api/evaluation-scores/[id]` | GET, PATCH | local: none | Get score / update critique text (user edit before resubmit) |

### Streaming
All three agent routes (`/analyze`, `/distill`, `/rewrite`) use Vercel AI SDK streaming — results appear progressively in the UI.

---

## Deployment Strategy

### Local Development

| Service | Runtime | Port | Purpose |
|---------|---------|------|---------|
| Next.js dev server | Node 20 | 3000 | App + API routes |
| Ollama | Native | 11434 | Local vision/LLM inference |
| SQLite | File | — | `data/dpg.db` in project root |

```bash
# Local dev setup
pnpm install
cp .env.example .env.local   # set LOCAL_MODE=true, OLLAMA_BASE_URL
pnpm dev
```

### Production (Vercel)

- SQLite → Supabase (env swap, no query changes)
- Ollama → Gemini 1.5 Flash + GPT-4o mini (env swap via `LOCAL_MODE=false`)
- Image gen: Nano Banana 2 as primary (`GOOGLE_GENERATIVE_AI_API_KEY` already set); Replicate as fallback (`REPLICATE_API_TOKEN`)
- File uploads: Supabase Storage (replaces local `/uploads`)
- Zero-config Vercel deploy from `main` branch

### Environment Variables

```
# AI providers
LOCAL_MODE=true
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=

# Image generation
# Primary: Nano Banana 2 uses GOOGLE_GENERATIVE_AI_API_KEY (already set above)
# Fallback:
REPLICATE_API_TOKEN=

# Storage (production only)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Security Considerations

- **Auth/Authz:** Local — none required. Production — Supabase Auth; all routes protected by session check
- **Input validation:** Image upload: type + size limits (max 10MB, image/\* only). Prompt text: sanitized before passing to LLM
- **API key exposure:** All keys server-side only; no client-side AI calls
- **File uploads:** Stored in `/uploads` locally; Supabase Storage in production with signed URLs
- **LLM output validation:** Agent outputs validated against Zod schemas before DB write — prevents schema poisoning
- **Rate limiting:** Added at Vercel edge (middleware) before production deploy
- **Prompt injection:** Reference prompts treated as data, not instructions — passed with role boundaries

---

## UI/UX Needs

### Design System
Tailwind CSS + shadcn/ui. Components needed: color swatches, locked field badges, schema tree editor, prompt diff viewer, side-by-side image comparison.

### Key Views / Pages

| View | Purpose | Complexity |
|------|---------|------------|
| `/` — Project Dashboard | List projects, create new | Low |
| `/projects/[id]` — Workspace | Main pipeline canvas | High |
| `└── Tab: Analyze` | Upload image → run Agent A → view/edit schema | High |
| `└── Tab: Grammar` | Input reference prompts → run Agent B1 → view blueprint | Medium |
| `└── Tab: Editor` | Structured Prompt Editor — edit/lock schema fields | High |
| `└── Tab: Rewrite` | Run Agent B2 → preview final prompt → copy / export for external platforms | Medium |
| `└── Tab: Generate` | Send to Nano Banana 2 or Replicate → output image → compare | Medium |
| `/blueprints` | Library of saved Grammar Blueprints | Low |

### Real-Time Requirements
- Agent streaming: SSE via Vercel AI SDK `useCompletion` / `useChat`
- Nano Banana 2: streaming response via Gemini API (same SDK pattern)
- Replicate fallback: polling for image generation status

### Responsive Needs
Desktop-first. The editor workspace is complex enough that mobile is out of scope for MVP.

---

## Integration Points

| Integration | Type | Purpose | Auth |
|------------|------|---------|------|
| Ollama | Local HTTP | Local vision + LLM inference | None (local) |
| OpenAI | REST API | GPT-4o mini for B1/B2 in production | API key |
| Google AI (Gemini) | REST API | Gemini 2.5 Flash (Agent A + Agent D) + Nano Banana 2 (image gen) | API key — one key, three uses |
| Replicate | REST API | Image gen fallback (Flux / SDXL) | API token |
| Ideogram | REST API | Image gen specialist for text-in-image / typographic designs | API key |
| Supabase | SDK | Auth + DB + Storage (production) | Service key + anon key |
| Freepik / Higgsfield AI / Midjourney | External (manual) | Prompt export targets — user copies prompt, pastes externally | None — clipboard only |

### Fallback Strategy
- If Ollama is down in local mode: hard error with clear message — no silent fallback to paid APIs during dev
- If Nano Banana 2 is unavailable: fall back to Replicate (env flag `IMAGE_GEN_PROVIDER=replicate`)
- Prompt copy/export works regardless of which image gen provider is active — it's always available

---

## Phase Breakdown

### Phase 1: Foundation
- **Build:** Next.js 15 project scaffold, pnpm setup, Tailwind + shadcn/ui, SQLite schema + migrations, env config system (LOCAL_MODE switch), project CRUD API + UI, file upload endpoint
- **Testable:** Create a project, upload an image, see it saved. Switch LOCAL_MODE and confirm env resolves correctly.
- **Outcome:** Working project workspace with file upload — the shell everything else plugs into

### Phase 2: Agent A — Design Schema Extraction
- **Build:** `/api/analyze` streaming endpoint, Vercel AI SDK integration (Ollama local / Gemini prod), image → DesignSchema structured output with Zod validation, schema viewer UI in Analyze tab
- **Testable:** Upload a poster image, run Agent A, receive a structured DesignSchema with all fields populated and valid
- **Outcome:** The system can reverse-engineer an image into an editable design representation

### Phase 3: Agent B1 — Grammar Blueprint Distillation
- **Build:** `/api/distill` streaming endpoint, multi-prompt input UI (paste list), grammar extraction into GrammarBlueprint schema, blueprint save + library
- **Testable:** Paste 5 reference prompts, run Agent B1, receive a GrammarBlueprint describing sequence, density, compression, and style language
- **Outcome:** The system can learn how a prompt family writes — independently of subject matter

### Phase 4: Structured Prompt Editor
- **Build:** Schema field editor (text, color picker, layout selector, image slot), field lock/unlock toggle, locked field persistence, schema diff view (original vs edited)
- **Testable:** Edit a color in the palette, lock the style_checksum field, verify edits persist and locked fields are marked in the output
- **Outcome:** Users can safely customize extracted design logic without breaking coherence

### Phase 5: Agent B2 — Prompt Rewriter + Export Panel
- **Build:** `/api/rewrite` streaming endpoint, schema + blueprint → final prompt generation, prompt preview UI, output saved as PromptOutput. Prompt Export Panel with:
  - One-click copy to clipboard (plain text)
  - Platform presets: **Midjourney** (appends `--ar`, `--style`, `--v` flags), **Freepik** (style tag formatting), **Higgsfield AI** (motion/cinematic parameter block), **Generic** (clean plain text)
  - Character count + token estimate per platform
- **Testable:** Generate a final prompt, copy it in Midjourney format and verify suffix syntax is correct, copy in generic format and verify it's clean plain text
- **Outcome:** The two layers merge into one high-quality prompt that can be sent into any image-gen platform — in-app or external

### Phase 6: Image Generation + Comparison
- **Build:** `/api/generate` with provider switch — Nano Banana 2 (`gemini-3.1-flash-image-preview`) as primary via Gemini API, Replicate (Flux.1-dev) as fallback via `IMAGE_GEN_PROVIDER` env flag. Generation status handling, output image display, side-by-side comparison (input image vs generated image), image save to GeneratedImage with `provider` field
- **Testable:** Send a final prompt to Nano Banana 2, receive a generated image, compare against original reference. Toggle `IMAGE_GEN_PROVIDER=replicate` and confirm fallback works
- **Outcome:** Full pipeline is complete — image in, image out, with full control in between. Provider is swappable without code changes

### Phase 7: Polish + Local-First UX
- **Build:** Project history, blueprint library management, prompt output history per project, export (schema JSON, final prompt text, generated image), onboarding flow for new users
- **Testable:** Export a project's schema and prompt. Reapply a saved blueprint to a new project.
- **Outcome:** The system is usable end-to-end as a daily tool, not just a demo

### Phase 9: Quality Loop

**9-01: Extraction Upgrade**
- **Build:**
  - Rewrite `DESIGN_ANALYSIS_PROMPT` with richer vocabulary: serif subtype classification, stroke contrast ratio, editorial style class (Didot/Grotesque/Bauhaus), explicit bleed/crop detection, composition treatment, palette character (not just hex — "monochromatic", "high-contrast", "duotone")
  - Enrich `DesignExtractionSchema` (Zod): add `fingerprint` sub-object to `type_scale` (`classification`, `stroke_contrast`, `weight`, `editorial_style`); add `crop_treatment`, `composition_notes`, `bleed` to `frame`; add `character` field to `palette`
  - No Supabase migration needed — `type_scale`, `frame`, `palette` already stored as JSONB columns; schema enrichment is purely at the Zod + prompt layer
- **Testable:** Run 5–10 diverse reference images through old and new extraction; compare schemas side-by-side; verify fingerprint fields populate correctly for editorial serif, geometric sans, slab serif designs
- **Outcome:** Agent A produces semantically rich schemas that capture typeface character, composition treatment, and palette intent — eliminating the vocabulary gaps that caused the DTMS output failure

**9-02: Evaluation + Refinement Loop**
- **Build:**
  - Supabase table: `evaluation_scores` (id, prompt_output_id, project_id, reference_image, generated_image_url, scores JSONB, verdicts JSONB, critique TEXT, iteration INT, created_at)
  - `POST /api/evaluate` — Agent D: Gemini 2.5 Flash vision, structured output with 5-dimension scores (0–10) + per-dimension verdicts (match/partial/miss) + critique text
  - `POST /api/refine` — takes evaluation_score_id (with possibly user-edited critique) → Agent B2 prompt rewrite using critique as directive → calls /api/generate → returns new GeneratedImage
  - `PATCH /api/evaluation-scores/[id]` — saves user edits to critique before resubmit
  - Ideogram as third image gen provider: `POST https://api.ideogram.ai/generate`, `Api-Key` header, env var `IDEOGRAM_API_KEY`, `IMAGE_GEN_PROVIDER=ideogram`
  - Output tab UI:
    - "Evaluate" button appears after image generation
    - Shows: per-dimension verdict chips (✓ Color / ⚠ Hierarchy / ✗ Typography) + editable critique textarea
    - "Refine" button: locks critique → calls /api/refine → new image appears side-by-side with reference
    - Iteration badge (e.g., "Iteration 2") + history strip showing all previous attempts
    - "Accept" button: marks current iteration as final
- **Testable:** Generate image → Evaluate → verify verdicts + critique match observable gaps → edit critique to redirect focus → Refine → confirm new image addresses the critique → Accept; confirm Ideogram produces correct output for a typographic design
- **Outcome:** Closed feedback loop — users see exactly where the output diverged, can redirect the AI's focus with plain language, and iterate until satisfied. Ideogram available as a specialist provider for text-heavy compositions.

### Phase 8: Production Deploy
- **Build:** Supabase swap (DB + Storage + Auth), Vercel deploy config, edge rate limiting middleware, env hardening, magic link auth UI
- **Testable:** Deploy to Vercel, sign in via magic link, run a full pipeline end-to-end in production
- **Outcome:** Publicly accessible hosted version with auth and persistent storage

---

## Skill Loadout & Quality Gates

### Skills Used During Build

| Skill | When It Fires | Purpose |
|-------|--------------|---------|
| GSD | All phases | Structured build execution with atomic commits |
| ui-ux-pro-max | Phases 4, 7 | Structured Prompt Editor + polish pass |
| /paul:audit | End of Phase 6 | Architecture review before deploy prep |

### Quality Gates

| Gate | Threshold | When |
|------|-----------|------|
| TypeScript strict | Zero `any` types | Every phase |
| Zod validation | All agent outputs validated | Phases 2, 3, 5 |
| Schema integrity | No null required fields | Phase 1 migration |
| Prompt coherence | Manual review of 3 test cases | Phase 5 |
| Prompt export formats | Verify Midjourney / Freepik / Higgsfield syntax | Phase 5 |
| Image gen provider swap | Both Nano Banana 2 and Replicate produce valid output | Phase 6 |

---

## Design Decisions

1. **Vercel AI SDK over raw API calls** — unified provider interface means local/prod swap is one env var, not a code change
2. **SQLite local, Supabase production** — same query patterns, zero migration complexity, no Docker dependency for local dev
3. **Gemini 1.5 Flash as production vision model** — cheaper than GPT-4V, comparable quality for structured extraction tasks
8. **Nano Banana 2 as primary image gen** — same Google API key already in use for Agent A; one less credential, native streaming, 4K output, ranked #1 on image arena at launch (Feb 2026)
9. **Replicate kept as fallback** — account exists; provides a safety net if Nano Banana 2 is rate-limited, down, or too expensive at scale
10. **Prompt export panel over API integrations** — Freepik, Higgsfield AI, and Midjourney don't expose write APIs; clipboard export is the correct abstraction and keeps the system platform-agnostic
11. **Typography fingerprint nested inside `type_scale`** — classifying a typeface's visual character (stroke contrast, editorial style) is a typographic concern; grouping it with size/leading avoids a proliferation of top-level schema fields
12. **`frame` carries composition intent** — bleed, crop treatment, and composition notes describe how the frame is used, which is closer to frame geometry than to layout structure; avoids the same data living in two places
13. **Agent D reuses Gemini 2.5 Flash** — no new API key or provider needed; same vision model used for extraction (Agent A) is used for evaluation (Agent D); one key, two roles
14. **User-editable critique before refinement** — Agent D's critique is a starting point, not a directive; users may disagree with the AI's assessment or want to reprioritize which gap to fix first; editable critique makes the loop collaborative
15. **Ideogram as specialist provider, not replacement** — Gemini 2.5 Flash image gen remains primary; Ideogram added as a targeted choice for text-heavy, typographic, and editorial compositions where it consistently outperforms generalist models
16. **Typography fingerprint derived from Figma's schema, not copied from it** — Figma's Typography panel has 38+ fields covering all OpenType feature flags; 22 are invisible in a raster image (kerningPairs, contextualAlternates, rareLigatures, all characterVariants/stylisticSets, etc.). The fingerprint includes the 16 visually detectable Figma fields plus 3 inference fields Agent A adds (classification, strokeContrast, editorialStyle). Layout-interaction fields (hangingPunctuation, paragraphIndent, listStyle) live on `type_scale.fingerprint` because they affect how type is rendered, not how the frame is shaped.
4. **GrammarBlueprint as a reusable entity** — one blueprint can serve many projects; users build a library of prompt styles over time
5. **Streaming for all agent routes** — long-running LLM calls need progressive feedback; SSE via Vercel AI SDK is simplest
6. **Desktop-first UI** — the editor workspace requires horizontal space; mobile complexity deferred
7. **No auth in local mode** — removes friction during development; added only at production deploy phase

---

## Open Questions

1. **Nano Banana 2 vs Replicate Flux.1-dev** — which produces stronger results for design-system-derived prompts? Benchmark head-to-head in Phase 6.
2. **cogvlm2:10b vs qwen3-vl:30b** — is the smaller model sufficient for Agent A? Test in Phase 2.
3. **Grammar blueprint granularity** — how many reference prompts are needed for a reliable blueprint? Need to test with 3, 5, 10 samples.
4. **Schema complexity ceiling** — what happens when Agent A encounters highly complex images (photography vs flat design vs 3D)? May need prompt tuning per image category.
5. **Production model costs** — estimate full pipeline cost including Phase 9 loop: Gemini 2.5 Flash (Agent A + Agent D) + GPT-4o mini (B1/B2) + image gen provider + up to N refinement iterations. Target: under $0.50/full refined run.
7. **Ideogram model version** — confirm current best model tier (V_2 vs V_2_TURBO vs V_3 if available) for typographic design quality vs cost before Phase 9-02.
8. **EvaluationScore retention policy** — keep all iterations indefinitely, or prune after N days? Storage cost is low but could accumulate for active users.
6. **Platform prompt formatting** — confirm current Midjourney v7, Freepik, and Higgsfield AI parameter syntax before Phase 5 build.

---

## Next Actions

- [x] Run `/gsd:new-project` in `Design-Prompt-Generator/` — PAUL initialized
- [x] Phases 1–8 complete — app live at `design-prompt-generator-eta.vercel.app`
- [ ] Run `/gsd:new-milestone` or plan Phase 9-01 via PAUL for extraction upgrade
- [ ] Obtain Ideogram API key before Phase 9-02 (`ideogram.ai` → API access)
- [ ] Collect 5–10 diverse reference images for Phase 9-01 manual extraction test

---

## References

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Vercel AI SDK — Ollama Provider](https://sdk.vercel.ai/providers/community-providers/ollama)
- [Vercel AI SDK — Google Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai)
- [Nano Banana 2 — Google AI for Developers](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini 3.1 Flash Image Preview — Model Docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview)
- [Replicate API Docs](https://replicate.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Supabase + Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- Existing v3 engine: `/Volumes/RMNDS1 AI CORE/Projects/design-prompt-generator-v3/` (reference only — not carried over)

---

*Last updated: 2026-03-31*

---

**Graduated:** 2026-03-28
**Location:** `/Volumes/RMNDS1 AI CORE/Projects/Design-Prompt-Generator/`
**README:** `README.md`
