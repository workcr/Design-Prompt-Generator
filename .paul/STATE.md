# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-28)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Phase 4 — Structured Prompt Editor

## Current Position

Milestone: v0.1 — Local Pipeline MVP
Phase: 4 of 8 (Structured Prompt Editor) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-28 — Phase 3 complete, transitioned to Phase 4

Progress:
- Milestone: [████████░░] 37%
- Phase 1:   [██████████] 100% ✅
- Phase 2:   [██████████] 100% ✅
- Phase 3:   [██████████] 100% ✅
- Phase 4:   [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready to plan Phase 4]
```

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Zod v4: `.default()` before `.transform()` | 01-01 | Pattern for all future transformed env vars |
| Next.js 16 + Tailwind v4 | 01-01 | All future phases target these versions |
| JSON fields as TEXT in SQLite | 01-02 | Serialization belongs to API layer |
| Next.js 16 params are `Promise<{id}>` | 01-02 | All dynamic route handlers must `await params` |
| `@ai-sdk/openai` for Ollama (not `@ai-sdk/ollama`) | 02-01 | Ollama uses `/v1` OpenAI-compat endpoint |
| Provider factory in `src/lib/ai.ts` | 02-01 | Routes never import from AI SDK directly |
| `parseDbSchema()` / `parseDbBlueprint()` at display layer | 02-02 / 03-02 | DB TEXT → typed object boundary at render |
| `style_summary` + grammar sub-fields from JSON columns | 02-02 / 03-02 | No dedicated DB columns; deferred migration to Phase 7 |
| `idle` + `error` merged in BlueprintTab | 03-02 | Textarea preserved on error; pattern for future multi-step forms |
| `getTextProvider()` reuses `@ai-sdk/openai` | 03-01 | Covers both Ollama and OpenAI prod — no new package |

Decisions imported from PLANNING.md at init:

| Decision | Impact |
|----------|--------|
| Vercel AI SDK | Single interface for Ollama/Gemini/OpenAI — swap via env var |
| SQLite local → Supabase prod | Same queries both envs; no migration complexity |
| Prompt export panel (clipboard) | Freepik/Midjourney/Higgsfield don't expose write APIs |

### Git State

Last commit: 06334a0 (Phase 2)
Branch: main
Phase 3 commit: pending

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| cogvlm2:10b vs qwen3-vl:30b benchmark | PLANNING.md | S | Phase 2 ← still open |
| Blueprint granularity (3/5/10 prompts) | PLANNING.md | S | Phase 3 ← still open |
| Full pipeline cost estimate (<$0.20 target) | PLANNING.md | S | Phase 8 |
| Platform prompt format syntax (MJ v7, Freepik, Higgsfield) | PLANNING.md | S | Phase 5 |
| `style_summary` dedicated DB column | 02-02 | S | Phase 7 (Polish) |
| Grammar sub-fields dedicated DB columns | 03-02 | S | Phase 7 (Polish) |
| Blueprint selection UI (which blueprint to use) | 03-02 | M | Phase 5 |

### Blockers/Concerns
None.

## Session Continuity

Last session: 2026-03-28
Stopped at: Phase 3 complete — transition done
Next action: Run /paul:plan for Phase 4 (Structured Prompt Editor)
Resume context: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
