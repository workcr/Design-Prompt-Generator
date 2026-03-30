# Roadmap: Design Prompt Generator

## Overview

Eight phases take the project from a bare Next.js scaffold to a deployed, authenticated web product. The first six phases deliver the full local pipeline — image in, prompt out, image generated. Phase 7 polishes it into a daily-usable tool. Phase 8 ships it to Vercel with Supabase and auth. Each phase is independently testable and delivers a user-facing outcome.

## Current Milestone

**v0.1 — Local Pipeline MVP** (v0.1.0)
Status: In progress
Phases: 7 of 8 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation | 3 | ✅ Complete | 2026-03-28 |
| 2 | Agent A — Design Schema Extraction | 2 | ✅ Complete | 2026-03-28 |
| 3 | Agent B1 — Grammar Blueprint Distillation | 2 | ✅ Complete | 2026-03-28 |
| 4 | Structured Prompt Editor | 2 | ✅ Complete | 2026-03-29 |
| 5 | Agent B2 + Prompt Export Panel | 3 | ✅ Complete | 2026-03-29 |
| 6 | Image Generation + Comparison | 2 | ✅ Complete | 2026-03-30 |
| 7 | Polish + Local-First UX | 2 | ✅ Complete | 2026-03-30 |
| 8 | Production Deploy | TBD | Not started | - |

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

### Phase 8: Production Deploy

**Goal:** Publicly accessible hosted version with auth and persistent storage
**Depends on:** Phase 7 (polished local product)
**Research:** Likely (Supabase auth + storage swap, Vercel edge middleware, env hardening)
**Research topics:** Supabase magic link auth with Next.js App Router; Vercel edge rate limiting

**Scope:**
- Supabase DB + Storage swap (replaces SQLite + local /uploads)
- Vercel deploy config + environment variable setup
- Edge rate limiting middleware
- Supabase Auth (magic link)
- Auth-protected routes + session handling
- End-to-end production smoke test

**Plans:**
- [ ] 08-01: TBD during /paul:plan

---
*Roadmap created: 2026-03-28*
*Last updated: 2026-03-30 — Phase 7 complete*
