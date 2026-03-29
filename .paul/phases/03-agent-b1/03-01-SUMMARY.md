---
phase: 03-agent-b1
plan: 01
subsystem: api
tags: [ai-sdk, zod, grammar-extraction, text-model, openai, ollama, sqlite]

requires:
  - phase: 01-foundation (plan 02)
    provides: getDb(), grammar_blueprints table, GrammarBlueprint TS interface

provides:
  - "getTextProvider() factory in src/lib/ai.ts — Ollama local / OpenAI prod"
  - "GrammarBlueprintExtractionSchema — 9-field Zod schema for grammar extraction"
  - "GRAMMAR_DISTILLATION_PROMPT — system prompt for Agent B1"
  - "POST /api/distill — accepts prompts[], extracts grammar, persists to DB"

affects: [03-agent-b1-plan-02, 05-agent-b2, 07-polish]

tech-stack:
  added: []
  patterns:
    - "getTextProvider() mirrors getVisionProvider() — same @ai-sdk/openai, different model + key"
    - "Text-only generateObject() call — no image, prompts formatted as numbered list in user message"
    - "density and avg_length stored as raw values (TEXT / INTEGER), not JSON.stringify"

key-files:
  created:
    - src/lib/schemas/grammar-blueprint.ts
    - src/app/api/distill/route.ts
  modified:
    - src/lib/ai.ts

key-decisions:
  - "getTextProvider() reuses @ai-sdk/openai for both Ollama and OpenAI — no new package needed"
  - "sentence_structure, qualifier_placement, characteristic_phrases, style_vocabulary, summary have no dedicated DB columns — stored inside distilled_grammar JSON"
  - "Blueprint name auto-generated as 'Blueprint — YYYY-MM-DD' when name not provided"
  - "density stored as raw TEXT (not JSON.stringify) — it's an enum string value"
  - "avg_length stored as INTEGER (not JSON.stringify) — direct number insert"

patterns-established:
  - "Text provider follows same factory pattern as vision provider — getTextProvider() in src/lib/ai.ts"
  - "Prompts formatted as numbered list prepended with system prompt in single user message"

duration: 1 session
started: 2026-03-28T00:00:00Z
completed: 2026-03-28T00:00:00Z
---

# Phase 3 Plan 01: Grammar Blueprint Backend Summary

**Text provider factory, 9-field GrammarBlueprint Zod schema, and POST /api/distill — Agent B1 backend fully wired.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 session |
| Tasks | 2 auto |
| Files created | 2 |
| Files modified | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Text Provider Factory Resolves Correctly | ✅ Pass | Ollama path via `/v1`; OpenAI prod path; throws on missing key |
| AC-2: GrammarBlueprintExtraction Schema Complete | ✅ Pass | 9 fields, all typed, exports type + prompt constant |
| AC-3: /api/distill Extracts and Persists | ✅ Pass | generateObject() → numbered prompt list → RETURNING * insert → `{ id, blueprint }` |
| AC-4: Error Cases Return Correct Status Codes | ✅ Pass | 400 bad input, 404 missing project, 500 AI failure |
| AC-5: TypeScript Strict Mode Passes | ✅ Pass | `pnpm typecheck` — zero errors |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/ai.ts` | Modified | Added `getTextProvider()` + `getTextModel` import |
| `src/lib/schemas/grammar-blueprint.ts` | Created | `SequencePatternSchema`, `GrammarBlueprintExtractionSchema` (9 fields), `GrammarBlueprintExtraction` type, `GRAMMAR_DISTILLATION_PROMPT` |
| `src/app/api/distill/route.ts` | Created | POST handler: validates → checks project → `generateObject()` → persists → `{ id, blueprint }` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Reuse `@ai-sdk/openai` for text provider | Package already installed; Ollama /v1 + OpenAI prod both handled — no new dependency | Zero package additions for entire Phase 3 backend |
| `density` stored as raw TEXT | It's an enum string — `JSON.stringify` would add unnecessary quotes | Consistent with how it's read back (no JSON.parse needed) |
| `avg_length` stored as INTEGER | Direct number — DB column is INTEGER type | Consistent with schema.sql column type |
| Fields without DB columns in `distilled_grammar` | `sentence_structure`, `qualifier_placement`, `characteristic_phrases`, `style_vocabulary`, `summary` have no dedicated columns — live in full JSON | Avoids schema migration; dedicated columns deferred to Phase 7 if needed |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `getTextProvider()` available for Agent B2 (Phase 5) — no additional setup needed
- `GrammarBlueprintExtractionSchema` + `GRAMMAR_DISTILLATION_PROMPT` ready for Plan 03-02 UI
- `/api/distill` accepts `{ projectId, prompts[], name? }` and returns `{ id, blueprint }`

**Concerns:**
- `sentence_structure`, `qualifier_placement`, `characteristic_phrases`, `style_vocabulary`, and `summary` have no dedicated DB columns — all inside `distilled_grammar` JSON. Blueprint tab UI (Plan 03-02) must parse `distilled_grammar` to display these fields (same pattern as `parseDbSchema()` in Phase 2).

**Blockers:** None.

---
*Phase: 03-agent-b1, Plan: 01*
*Completed: 2026-03-28*
