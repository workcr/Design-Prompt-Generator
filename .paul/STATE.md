# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-29)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Phase 6 — Image Generation + Comparison

## Current Position

Milestone: v0.1 — Local Pipeline MVP
Phase: 6 of 8 (Image Generation + Comparison) — ✅ Complete
Plan: All plans complete
Status: Phase 6 complete — ready for Phase 7
Last activity: 2026-03-30 — Phase 6 complete, full pipeline verified

Progress:
- Milestone: [████████░░] 80%
- Phase 1:   [██████████] 100% ✅
- Phase 2:   [██████████] 100% ✅
- Phase 3:   [██████████] 100% ✅
- Phase 4:   [██████████] 100% ✅
- Phase 5:   [██████████] 100% ✅
- Phase 6:   [██████████] 100% ✅

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Phase 6 complete — ready for Phase 7]
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
| `z.unknown().optional()` for PATCH JSON field columns | 04-01 | Editor sends objects; server owns stringify boundary |
| `isDirty` via JSON.stringify comparison | 04-02 | Simple whole-schema dirty tracking; reset = setOriginal(schema) |
| `NonNullable<T>["field"]` for nullable Zod type index | 04-02 | Pattern for all future nullable Zod field type casts |
| Text Fields + Elements display-only in editor | 04-02 | Array content editing deferred to Phase 7 Polish |
| `toTextStreamResponse()` not `toDataStreamResponse()` | 05-01 | AI SDK v6 API for plain text streams — all future streaming routes |
| `GrammarBlueprintExtraction["sequence_pattern"]` indexed type | 05-01 | Access unexported nested types without new exports |
| Pre-generate UUID → X-Output-Id header | 05-01 | Client has DB record ID before stream ends; onFinish writes the row |
| GET /api/blueprints returns minimal fields only | 05-02 | id, name, created_at — no raw_prompts exposed; lean payload pattern |
| Native `<select>` styled with Input tokens | 05-02 | No shadcn Select dependency; consistent with existing form elements |
| noUncheckedIndexedAccess: extract array[n] to const | 05-02 | Guard pattern for all future array element access in strict TS |
| ALTER TABLE try/catch migration | 06-01 | Idempotent SQLite column addition — throws on existing column, safe to catch |
| Replicate URL stored directly (not downloaded) | 06-01 | MVP sufficient; download-and-save deferred to Phase 7 |
| Prefer:wait header for Replicate | 06-01 | Synchronous prediction — no polling loop needed for flux-schnell |
| Gemini image gen via direct REST (not AI SDK) | 06-02 | experimental_generateImage targets Imagen (Vertex/allowlisted); gemini-2.5-flash-image:generateContent works with standard keys |
| gemini-2.5-flash-image model name | 06-02 | imagen-3.0-* uses :predict not :generateContent; gemini-2.0-flash-exp-image-generation retired; gemini-2.5-flash-image is current |

Decisions imported from PLANNING.md at init:

| Decision | Impact |
|----------|--------|
| Vercel AI SDK | Single interface for Ollama/Gemini/OpenAI — swap via env var |
| SQLite local → Supabase prod | Same queries both envs; no migration complexity |
| Prompt export panel (clipboard) | Freepik/Midjourney/Higgsfield don't expose write APIs |

### Git State

Last commit: 64cd189 (Phase 4)
Branch: main

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| cogvlm2:10b vs qwen3-vl:30b benchmark | PLANNING.md | S | Phase 2 ← still open |
| Blueprint granularity (3/5/10 prompts) | PLANNING.md | S | Phase 3 ← still open |
| Full pipeline cost estimate (<$0.20 target) | PLANNING.md | S | Phase 8 |
| ~~Platform prompt format syntax (MJ v7, Freepik, Higgsfield)~~ | PLANNING.md | S | ✅ Resolved Phase 5 |
| `style_summary` dedicated DB column | 02-02 | S | Phase 7 (Polish) |
| Grammar sub-fields dedicated DB columns | 03-02 | S | Phase 7 (Polish) |
| ~~Blueprint selection UI (which blueprint to use)~~ | 03-02 | M | ✅ Resolved Phase 5 |
| Text Fields + Elements per-item editing | 04-02 | M | Phase 7 (Polish) |

### Blockers/Concerns
None.

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 6 complete — full pipeline verified end-to-end
Next action: Run /paul:plan for Phase 7 (Polish + Local-First UX)
Resume context: .paul/phases/06-image-generation/06-02-SUMMARY.md

---
*STATE.md — Updated after every significant action*
