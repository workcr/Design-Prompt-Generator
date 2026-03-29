# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-28)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Phase 3 — Agent B1 Grammar Blueprint Distillation

## Current Position

Milestone: v0.1 — Local Pipeline MVP
Phase: 3 of 8 (Agent B1 — Grammar Blueprint Distillation) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-28 — Phase 2 complete, transitioned to Phase 3

Progress:
- Milestone: [██████░░░░] 25%
- Phase 1:   [██████████] 100% ✅
- Phase 2:   [██████████] 100% ✅
- Phase 3:   [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready to plan Phase 3]
```

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Zod v4: `.default()` before `.transform()` | 01-01 | Pattern for all future transformed env vars |
| Next.js 16 + Tailwind v4 | 01-01 | All future phases target these versions |
| `!.env.example` gitignore exception | 01-01 | All env changes documented in .env.example first |
| `pnpm.onlyBuiltDependencies` for native addons | 01-02 | Non-interactive way to allow native builds (better-sqlite3) |
| JSON fields as TEXT in db.ts | 01-02 | Serialization belongs to API layer, not transport layer |
| Next.js 16 params are `Promise<{id}>` | 01-02 | All dynamic route handlers must `await params` |
| `@ai-sdk/openai` for Ollama (not `@ai-sdk/ollama`) | 02-01 | Ollama uses `/v1` OpenAI-compat endpoint; `@ai-sdk/ollama` doesn't exist on npm |
| Provider factory in `src/lib/ai.ts` | 02-01 | Routes never import from AI SDK directly; single swap point |
| Raw Buffer → AI SDK (not base64 data URL) | 02-01 | SDK handles encoding; cleaner interface |
| 16-char SHA-256 style checksum | 02-01 | Fast equality check for schema deduplication |
| 6-state `Phase` type in AnalyzeTab | 02-02 | Eliminates impossible boolean flag combos; pattern for future multi-step flows |
| `parseDbSchema()` at display layer | 02-02 | DB TEXT → typed object parsing at render boundary |
| `style_summary` from `raw_analysis` JSON | 02-02 | No dedicated column; deferred migration to Phase 7 |

Decisions imported from PLANNING.md at init:

| Decision | Impact |
|----------|--------|
| Vercel AI SDK | Single interface for Ollama/Gemini/OpenAI — swap via env var |
| Nano Banana 2 primary + Replicate fallback | IMAGE_GEN_PROVIDER env flag controls swap |
| SQLite local → Supabase prod | Same queries both envs; no migration complexity |
| Prompt export panel (clipboard) | Freepik/Midjourney/Higgsfield don't expose write APIs |

### Git State

Last commit: (pending phase commit)
Branch: main

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| cogvlm2:10b vs qwen3-vl:30b benchmark | PLANNING.md | S | Phase 2 ← revisit |
| Blueprint granularity (3/5/10 prompts) | PLANNING.md | S | Phase 3 |
| Full pipeline cost estimate (<$0.20 target) | PLANNING.md | S | Phase 8 |
| Platform prompt format syntax (MJ v7, Freepik, Higgsfield) | PLANNING.md | S | Phase 5 |
| `style_summary` dedicated DB column | 02-02 | S | Phase 7 (Polish) |

### Blockers/Concerns
None.

## Session Continuity

Last session: 2026-03-28
Stopped at: Phase 2 complete — transition done
Next action: Run /paul:plan for Phase 3 (Agent B1 — Grammar Blueprint Distillation)
Resume context: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
