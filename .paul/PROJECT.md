# Design Prompt Generator

## What This Is

An AI-powered visual prompt operating system that takes an existing image, reverse-engineers it into an editable design schema, and rewrites that schema into a high-quality image-generation prompt — written in the style of a specific prompt family. The system separates two concerns that are normally conflated: the visual logic of a design and the writing grammar of strong prompts. These are handled independently and merged only at the final step.

## Core Value

Designers and prompt engineers can convert any image into a fully controllable, style-aware image-gen prompt — without losing the structural logic of the original design or the writing quality of their preferred prompt family.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.1.0-dev |
| Status | Agent B1 complete — Phase 4 ready |
| Last Updated | 2026-03-28 |

**Repository:** https://github.com/workcr/Design-Prompt-Generator

## Requirements

### Core Features

- **Image → Design Schema:** Upload a reference image; Agent A reverse-engineers it into a structured, editable design schema (frame, palette, layout, type scale, elements, style checksum)
- **Prompts → Grammar Blueprint:** Input reference prompts from a target prompt family; Agent B1 distills only their writing grammar (sequence, density, compression, style language) into a reusable blueprint
- **Structured Prompt Editor:** Edit and lock schema fields safely — change text, colors, layout, image slots; lock style-critical fields to preserve coherence
- **Schema + Blueprint → Final Prompt:** Agent B2 merges the edited schema and grammar blueprint into one high-quality prompt; Export Panel lets users copy it formatted for Midjourney, Freepik, Higgsfield AI, or plain text
- **Image Generation:** Send the final prompt to Nano Banana 2 (primary) or Replicate (fallback); compare output against the original reference image side-by-side

### Validated (Shipped)

- ✓ **Project scaffold** — Next.js 16, TypeScript strict + noUncheckedIndexedAccess, Tailwind v4, pnpm — Phase 1
- ✓ **Env config system** — `src/lib/env.ts` with LOCAL_MODE provider switching, IMAGE_GEN_PROVIDER override — Phase 1
- ✓ **shadcn/ui component library** — 12 components installed and importable — Phase 1
- ✓ **SQLite data layer** — WAL-mode singleton (`getDb()`), auto-migration, 5-table schema, 4 indexes, cascade rules — Phase 1
- ✓ **TypeScript interfaces** — Project, DesignSchema, GrammarBlueprint, PromptOutput, GeneratedImage, ProjectDetail — Phase 1
- ✓ **Project CRUD API** — GET/POST `/api/projects`, GET/PATCH/DELETE `/api/projects/[id]`, Zod validation — Phase 1
- ✓ **File upload endpoint** — POST `/api/upload`, image/* only, ≤10MB, UUID filenames, saves to `uploads/` — Phase 1
- ✓ **Project dashboard** — live list, create, open, delete at `/` — Phase 1
- ✓ **Workspace shell** — `/projects/[id]` with Analyze/Blueprint/Prompt/Output tab scaffold — Phase 1
- ✓ **AI provider factory** — `src/lib/ai.ts` with `getVisionProvider()`, switches Ollama/Gemini via `LOCAL_MODE` — Phase 2
- ✓ **DesignExtraction schema** — `src/lib/schemas/design-extraction.ts`, 7 sub-schemas (Frame, Palette, Layout, TextFields, TypeScale, VisualElement, DesignExtraction) + `DESIGN_ANALYSIS_PROMPT` — Phase 2
- ✓ **Agent A — /api/analyze** — POST endpoint: validates → reads image → `generateObject()` → persists to `design_schemas` → returns `{ id, schema }` — Phase 2
- ✓ **Analyze tab UI** — Upload widget (drop zone + browse), 6-state machine, schema viewer with color swatches — Phase 2
- ✓ **Text provider factory** — `getTextProvider()` in `src/lib/ai.ts`, switches Ollama/OpenAI via `LOCAL_MODE` — Phase 3
- ✓ **GrammarBlueprint schema** — `src/lib/schemas/grammar-blueprint.ts`, 9-field Zod schema (SequencePattern, density, avg_length, compression, sentence structure, qualifier placement, characteristic phrases, style vocab, summary) + `GRAMMAR_DISTILLATION_PROMPT` — Phase 3
- ✓ **Agent B1 — /api/distill** — POST endpoint: validates → `generateObject()` with text model → persists to `grammar_blueprints` → returns `{ id, blueprint }` — Phase 3
- ✓ **Blueprint tab UI** — Prompt textarea (one per line, live count), 4-state machine, grammar blueprint viewer with 5 sections — Phase 3

### Active (In Progress)
None.

### Planned (Next)
- [ ] Phase 4: Structured Prompt Editor
- [ ] Phase 5: Agent B2 + prompt export panel
- [ ] Phase 6: Image generation + comparison
- [ ] Phase 7: Polish + local-first UX
- [ ] Phase 8: Production deploy (Vercel + Supabase + auth)

### Out of Scope

- Mobile UI — desktop-first; mobile deferred post-MVP
- Auth in local mode — added only at Phase 8 for production
- Real-time collaboration — single-user tool for now
- Fine-tuning models — uses existing foundation models only

## Target Users

**Primary:** Solo designer / prompt engineer (dogfooding)
- Iterates frequently between reference images and generated outputs
- Wants structural control over prompts, not just loose descriptions
- Works with multiple image-gen platforms (Midjourney, Freepik, Higgsfield AI, in-app gen)

**Secondary:** Hosted web product users (post-Phase 8)

## Context

**Business Context:**
Solo build → hosted SaaS. Key differentiator: no existing tool separates design-logic extraction from prompt-grammar learning. Most tools either describe images loosely or imitate prompts wholesale.

**Technical Context:**
Local-first development using Ollama for free inference; production swaps to Gemini API + GPT-4o mini via env flag. All AI calls server-side only — no client-side key exposure.

## Constraints

### Technical Constraints
- All API keys server-side only — no client-side AI calls
- Image uploads: max 10MB, image/* types only
- Agent outputs validated against Zod schemas before DB write
- LOCAL_MODE=true uses Ollama; LOCAL_MODE=false uses paid APIs — no silent fallback
- Desktop-first UI — horizontal workspace not suitable for mobile

### Business Constraints
- Solo build — complexity must stay manageable per phase
- Production cost target: under $0.20/run (full pipeline)
- Local dev must work without internet (Ollama mode)

### Compliance Constraints
- API keys never committed to git — managed via .env.local (local) and Vercel env vars (production)

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Vercel AI SDK for all AI calls | Unified provider interface — local/prod swap is one env var | 2026-03-28 | Active |
| SQLite local → Supabase production | Same query patterns, zero migration complexity, no Docker needed | 2026-03-28 | Active |
| Gemini 1.5 Flash for Agent A (production) | Cheaper than GPT-4V, strong structured extraction | 2026-03-28 | Active |
| GrammarBlueprint as reusable entity | One blueprint serves many projects; users build a style library over time | 2026-03-28 | Active |
| Streaming for all agent routes | SSE via Vercel AI SDK — progressive feedback for long LLM calls | 2026-03-28 | Active |
| Nano Banana 2 as primary image gen | Reuses Google API key; 4K output; ranked #1 on image arena at launch (Feb 2026) | 2026-03-28 | Active |
| Replicate as fallback | Provider-swappable via IMAGE_GEN_PROVIDER env flag — no code changes needed | 2026-03-28 | Active |
| Prompt export panel over API integrations | Freepik/Higgsfield/Midjourney don't expose write APIs; clipboard is correct abstraction | 2026-03-28 | Active |
| No auth in local mode | Removes friction during development | 2026-03-28 | Active |
| Desktop-first UI | Editor workspace requires horizontal space; mobile deferred | 2026-03-28 | Active |
| Zod v4: `.default()` before `.transform()` | Default must match raw input type, not transformed output | 2026-03-28 | Active |
| `pnpm.onlyBuiltDependencies` for native addons | Non-interactive equivalent of `pnpm approve-builds` — required for better-sqlite3 | 2026-03-28 | Active |
| JSON fields stored as TEXT in SQLite | Serialization belongs to the API layer, not the transport layer | 2026-03-28 | Active |
| Next.js 16 route params are `Promise<{id}>` | Dynamic route params are async in Next.js 15+ — must `await params` | 2026-03-28 | Active |
| Server components call `getDb()` directly | No HTTP round-trip needed for server-rendered pages; client components use fetch | 2026-03-28 | Active |
| `Link + buttonVariants()` for styled anchors | `@base-ui/react` Button has no `asChild` — use CVA classes directly on Link | 2026-03-28 | Active |
| `allowedDevOrigins` for LAN dev access | Next.js 16 blocks `/_next/*` from non-localhost by default; needed for network preview | 2026-03-28 | Active |
| `@ai-sdk/openai` for Ollama (not `@ai-sdk/ollama`) | `@ai-sdk/ollama` doesn't exist on npm; Ollama exposes OpenAI-compat API at `/v1` — use `createOpenAI({ baseURL: "…/v1" })` | 2026-03-28 | Active |
| Provider factory in `src/lib/ai.ts` | Routes never import from AI SDK directly — single swap point for future model changes | 2026-03-28 | Active |
| Raw Buffer to AI SDK (not base64 data URL) | SDK handles image encoding internally; cleaner interface, no size inflation | 2026-03-28 | Active |
| 16-char SHA-256 as `style_checksum` | Fast equality check for schema deduplication without full JSON comparison | 2026-03-28 | Active |
| 6-state `Phase` type in AnalyzeTab | Eliminates impossible boolean flag combos; each render branch is exhaustive | 2026-03-28 | Active |
| `parseDbSchema()` at display layer | DB TEXT → typed object boundary explicit in component, matching serialization-at-API-layer decision | 2026-03-28 | Active |
| `style_summary` from `raw_analysis` JSON | No dedicated column; parsed from full extraction JSON — migration deferred to Phase 7 | 2026-03-28 | Active |
| `idle` + `error` merged in BlueprintTab | Textarea preserved on error — splitting branches would require duplicating the entire form | 2026-03-28 | Active |
| Grammar sub-fields in `distilled_grammar` JSON | sentence_structure, qualifier_placement, characteristic_phrases, style_vocabulary, summary have no dedicated DB columns — deferred migration to Phase 7 | 2026-03-28 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Full pipeline runs end-to-end | Image in → prompt out → image generated | - | Not started |
| Agent A schema quality | All required fields populated and valid | - | Not started |
| Agent B2 prompt coherence | 3/3 manual test cases pass review | - | Not started |
| Provider swap | Both Nano Banana 2 and Replicate produce valid output | - | Not started |
| Production cost per run | Under $0.20 | - | Not started |
| Vercel deploy | Full pipeline works in production with auth | - | Not started |

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend + Backend | Next.js 15 (App Router) + TypeScript | Local-first → Vercel; zero-config deploy |
| AI Orchestration | Vercel AI SDK | Unified interface: OpenAI / Google / Anthropic / Ollama |
| Vision — Local | Ollama — qwen3-vl:30b | Already installed; free dev inference |
| Vision — Production | Gemini 1.5 Flash | Cheap, fast, strong structured extraction |
| Text — Production | GPT-4o mini | B1/B2 grammar tasks |
| Image Gen — Primary | Nano Banana 2 (gemini-3.1-flash-image-preview) | Google API key already in use; ~$0.067/1024px |
| Image Gen — Fallback | Replicate — Flux.1-dev | Provider-swappable via env flag |
| UI | Tailwind CSS + shadcn/ui | Structured editor primitives |
| Storage — Local | SQLite via better-sqlite3 | Zero-config, file-based |
| Storage — Production | Supabase | Drop-in swap + auth + file storage |
| Package Manager | pnpm | Fast, monorepo-ready |

## Links

| Resource | URL |
|----------|-----|
| Repository | https://github.com/workcr/Design-Prompt-Generator |
| Vercel AI SDK | https://sdk.vercel.ai/docs |
| Nano Banana 2 Docs | https://ai.google.dev/gemini-api/docs/image-generation |
| shadcn/ui | https://ui.shadcn.com |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-03-28 after Phase 3 (Agent B1 — Grammar Blueprint Distillation)*
