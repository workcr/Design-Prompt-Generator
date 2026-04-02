# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-29)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Milestone v0.2 — Output Quality Loop 🔄 Active

## Current Position

Milestone: v0.2 — Output Quality Loop 🔄 Active
Phase: 10 of 10 (Evaluation + Refinement Loop) — Planning
Plan: 10-03 — Output Tab UI (approved, ready to apply)
Status: Plan 10-03 created — ready to execute
Last activity: 2026-04-01 — Plan 10-03 written

Progress (v0.1 — shipped ✅):
- v0.1:      [██████████] 100% ✅ SHIPPED

Progress (v0.2 — active 🔄):
- Milestone: [█████░░░░░] 50%
- Phase 9:   [██████████] 100% ✅ Complete
- Phase 10:  [██░░░░░░░░] 20% — Planning (3 plans total: 10-01 ready, 10-02/03 pending)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan 10-03 created — run /paul:apply]
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
| ~~Replicate URL stored directly (not downloaded)~~ | 06-01 | ✅ Fixed in 07-01 — now downloaded to uploads/ at generation time |
| Blueprint library in idle/error phase only | 07-02 | Distill form is the entry point; library is curation |
| `renamingId` single nullable string for project rename | 07-02 | One card editable at a time; no PATCH race conditions |
| Export `parsedSchema` (not raw DesignSchema) for JSON export | 07-02 | Typed objects more useful than double-encoded TEXT |
| `serverExternalPackages: ['better-sqlite3']` in next.config.ts | 08-02 | Prevents Vercel from bundling the native addon; getDb() never called in prod |
| `.maybeSingle()` for optional rows, `.single()` for required | 08-02 | maybeSingle returns null cleanly; single throws PGRST116 on missing |
| Fresh `getSupabaseServer()` in onFinish callback | 08-02 | Stateless HTTP client — inline creation is correct for serverless callbacks |
| 3-query join for prompt-outputs | 08-02 | No correlated subquery API in Supabase JS; batched .in() + Map is O(n) |
| page.tsx server component also calls getDb() directly | 08-02 | Scope was API routes — server component missed; hotfix commit d136180 |
| `maxDuration = 60` on all AI routes | 08-03 | Vercel Hobby default is 10s; Gemini/OpenAI calls exceed this — required for analyze, distill, rewrite, generate |
| `gemini-2.5-flash` as vision model (not 1.5 or 2.0) | 08-03 | gemini-1.5-flash + gemini-2.0-flash deprecated for new API users; confirmed via ListModels API |
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

Last commit: b4a80a8 (chore(analyze): remove debug detail field from 500 response)
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

Last session: 2026-04-01
Stopped at: Plan 10-03 created — .paul/phases/10-evaluation-refinement-loop/10-03-PLAN.md
Next action: /paul:apply (Plan 10-03)
Resume context: Last plan of v0.2 — UI only, single file output-tab.tsx. After UNIFY: run /paul:complete-milestone to close v0.2.

---
*STATE.md — Updated after every significant action*
