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
| Vision (production) | Gemini 1.5 Flash | Cheap, fast, strong vision capabilities |
| Text (production) | GPT-4o mini | Cost-effective for B1/B2 grammar tasks |
| Image Generation (primary) | Nano Banana 2 — `gemini-3.1-flash-image-preview` | Same Gemini API key already in use; 4K output, grounding, ~$0.067/1024px |
| Image Generation (fallback) | Replicate API | Account exists; Flux / SDXL when Nano Banana 2 is unavailable or too expensive |
| UI | Tailwind CSS + shadcn/ui | Structured editor primitives (color pickers, locked fields, comboboxes) |
| Storage (local) | SQLite via `better-sqlite3` | Zero-config, file-based, perfect for local-first |
| Storage (production) | Supabase | Drop-in swap, same query patterns, adds auth + file storage |
| Package Manager | pnpm | Fast, efficient, monorepo-ready |

### AI Provider Config (env-driven switching)

```
LOCAL_MODE=true  → Ollama (qwen3-vl:30b) for all agents; Replicate for image gen
LOCAL_MODE=false → Gemini 1.5 Flash (Agent A) + GPT-4o mini (B1, B2) + Nano Banana 2 (image gen)
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
| `GeneratedImage` | id, prompt_output_id, provider, provider_job_id, model, url, status, created_at | belongs to PromptOutput; provider = "nano_banana_2" \| "replicate" |

### Schema Detail: `DesignSchema`

```json
{
  "frame": { "aspect_ratio": "4:5", "orientation": "portrait", "bleed": false },
  "palette": { "primary": "#1A1A2E", "secondary": "#E94560", "accent": "#0F3460", "neutral": "#F5F5F5" },
  "layout": { "type": "grid", "columns": 12, "hierarchy": ["headline", "subhead", "body", "cta"] },
  "text_fields": [{ "role": "headline", "content": "...", "locked": false }],
  "type_scale": { "headline": "72px/1.1", "body": "16px/1.5" },
  "elements": [{ "type": "image", "position": "top-60%", "locked": false }],
  "style_checksum": "swiss_editorial_dark"
}
```

### Notes
- `locked_fields` is a string array on `DesignSchema` listing field paths the user has pinned
- `GrammarBlueprint` is reusable — one blueprint can be applied to many projects
- `raw_analysis` and `raw_prompts` stored as JSON for auditability and replay

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
| Google AI (Gemini) | REST API | Gemini 1.5 Flash (Agent A) + Nano Banana 2 (image gen) | API key — one key, two uses |
| Replicate | REST API | Image gen fallback (Flux / SDXL) | API token |
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
5. **Production model costs** — estimate full pipeline cost: Gemini 1.5 Flash (Agent A) + GPT-4o mini (B1/B2) + Nano Banana 2 (1024px image) before Phase 8. Target: under $0.20/run.
6. **Platform prompt formatting** — confirm current Midjourney v7, Freepik, and Higgsfield AI parameter syntax before Phase 5 build.

---

## Next Actions

- [ ] Run `/gsd:new-project` in `Design-Prompt-Generator/` to initialize the GSD build system
- [ ] Scaffold Phase 1: Next.js 15 + pnpm + Tailwind + shadcn/ui + SQLite
- [ ] Pull `cogvlm2:10b` locally and benchmark against `qwen3-vl:30b` on a test image before Phase 2

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

*Last updated: 2026-03-28*
