# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-29)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Milestone v0.2 — Output Quality Loop 🔄 Active

## Current Position

Milestone: v0.3 — Self-Improving Extraction Loop 🔄 Active
Phase: 12 of 12 (Cross-Project Correction Memory) — 🔄 In Progress (1/2 plans)
Plan: 12-01 complete — 12-02 pending
Status: Plan 12-01 unified — ready for Plan 12-02
Last activity: 2026-04-02 — Plan 12-01 applied + unified

Progress (v0.1 — shipped ✅):
- v0.1:      [██████████] 100% ✅ SHIPPED

Progress (v0.2 — complete ✅):
- Milestone: [██████████] 100% ✅ COMPLETE
- Phase 9:   [██████████] 100% ✅ Complete
- Phase 10:  [██████████] 100% ✅ Complete

Progress (v0.3 — active 🔄):
- Milestone: [█████░░░░░]  50%
- Phase 11:  [██████████] 100% ✅ Complete (2/2 plans)
- Phase 12:  [░░░░░░░░░░]   0% (not started)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Plan 12-01 complete — run /paul:plan for 12-02]
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
| `z.record(z.string(), z.unknown())` not `z.record(z.unknown())` | 11-01 | This Zod version requires explicit key + value type args — apply to all future record schemas |
| Supabase JSONB → cast via `as unknown as T` not JSON.parse | 11-01 | JSONB columns return parsed objects from Supabase JS client; db.ts types them as string — cast without parsing |
| HNSW over IVFFlat for pgvector index | 12-01 | HNSW is incremental — works on empty tables; IVFFlat requires minimum rows for training |
| pgvector UPDATE via Supabase JS: `[f1,f2,...]` string | 12-01 | PostgREST requires vector as `[n,n,...]` string format, not raw JS array |
| correction_memories insert non-fatal | 11-01 | Memory write failure shouldn't abort the refine cycle — console.error only |
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

Last commit: e465805 (feat(embeddings): compute text-embedding-004 vectors after Agent E corrections)
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

Last session: 2026-04-02
Stopped at: Plan 12-01 applied + unified
Next action: /paul:plan for Plan 12-02 (Agent A retrieval injection)
Resume context: Plan 12-01 shipped. correction_memories.embedding now populated after each Agent E correction. HNSW index live in Supabase. Plan 12-02 adds retrieval injection to /api/analyze: brief first-pass to get style_summary → embed → cosine query top-K lessons → inject into DESIGN_ANALYSIS_PROMPT → full analysis. env key is GOOGLE_GENERATIVE_AI_API_KEY (not GEMINI_API_KEY).

---
*STATE.md — Updated after every significant action*
