---
phase: 06-image-generation
plan: 01
subsystem: api
tags: [image-gen, replicate, nano-banana-2, sqlite-migration, uploads, rest-api]

# Dependency graph
requires:
  - phase: 05-agent-b2/05-01
    provides: prompt_outputs table + /api/rewrite — outputId available for image gen
  - phase: 01-foundation/01-02
    provides: design_schemas table + uploads/ directory

provides:
  - reference_image TEXT column on design_schemas (migration + type + analyze store)
  - GET /api/uploads/[filename] — serves uploads/ directory with correct Content-Type
  - POST /api/generate — generates image via active provider; saves generated_images row
  - Nano Banana 2 path: experimental_generateImage → base64 → saved to uploads/
  - Replicate path: fetch + Prefer:wait → external URL stored directly

affects: [06-02-output-tab-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - experimental_generateImage from ai package with @ai-sdk/google .image() method
    - Replicate REST API via fetch + Prefer:wait header (no replicate package)
    - ALTER TABLE try/catch migration pattern for SQLite column additions
    - params: Promise<{filename}> awaited in dynamic GET routes (Next.js 16)

key-files:
  created:
    - src/app/api/uploads/[filename]/route.ts
    - src/app/api/generate/route.ts
  modified:
    - src/lib/schema.sql
    - src/lib/db.ts
    - src/types/db.ts
    - src/app/api/analyze/route.ts

key-decisions:
  - "ALTER TABLE try/catch: idempotent column migration — throws on existing column, catch is safe"
  - "Replicate URL stored directly: external URL sufficient for local MVP; download-and-save deferred"
  - "Prefer:wait header: synchronous Replicate prediction — no polling loop needed"
  - "uploads/ mkdirSync in generate route: defensive guard in case directory doesn't exist"

patterns-established:
  - "SQLite column migration: try { ALTER TABLE ... ADD COLUMN } catch { /* already exists */ }"
  - "Image serve route: params Promise<{filename}> awaited; MIME map; 404 if not found"

# Metrics
duration: ~45min
started: 2026-03-30T00:00:00Z
completed: 2026-03-30T02:24:00Z
---

# Phase 6 Plan 01: Image Generation Backend Summary

**POST /api/generate endpoint live — Replicate flux-schnell image generated and saved to DB with status='complete' in first verified run.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45min |
| Started | 2026-03-30 |
| Completed | 2026-03-30 |
| Tasks | 7 completed (6 code + 1 checkpoint) |
| Files modified | 4 modified, 2 created |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: reference_image in schema.sql CREATE TABLE | Pass | Column added after raw_analysis |
| AC-2: db.ts ALTER TABLE migration (try/catch) | Pass | Idempotent; runs on every getDb() call |
| AC-3: DesignSchema type has reference_image | Pass | `string \| null` added to interface |
| AC-4: /api/analyze stores filename as reference_image | Pass | 10th param in INSERT; verified via sqlite3 |
| AC-5: GET /api/uploads/[filename] serves with correct Content-Type | Pass | 200 for .webp file; 404 if missing |
| AC-6: /api/generate returns 400 if outputId missing | Pass | Zod validation |
| AC-7: /api/generate returns 404 if outputId not found | Pass | Verified — literal placeholder sent returned 404 correctly |
| AC-8: /api/generate returns 400 if final_prompt null | Pass | Guard in place |
| AC-9: Nano Banana 2 path saves base64 to uploads/ | Pass | Code path verified; not live-tested (no Google key locally) |
| AC-10: Replicate path returns output[0] URL | Pass | Verified — `https://replicate.delivery/...out-0.webp` returned |
| AC-11: generated_images row saved with correct fields | Pass | sqlite3 query confirmed id, prompt_output_id, provider, url, status |
| AC-12: /api/generate returns { id, url, provider } | Pass | `{"id":"5d9269fb...","url":"https://replicate.delivery/...","provider":"replicate"}` |
| AC-13: pnpm typecheck exits 0 | Pass | Clean — no TS errors |
| AC-14: pnpm build exits 0 | Pass | Both new routes appear in route table |

## Accomplishments

- Schema migration pattern established: `ALTER TABLE ... ADD COLUMN` wrapped in try/catch runs after every `getDb()` init — works on fresh DBs and existing DBs alike
- `/api/uploads/[filename]` route serves the `uploads/` directory (previously inaccessible from browser) with MIME-correct responses
- `/api/generate` endpoint abstracts the provider switch cleanly — same request/response shape for both Nano Banana 2 and Replicate; `getImageGenProvider()` from `env.ts` drives the fork
- First live Replicate generation confirmed: prompt → `Prefer:wait` synchronous prediction → `generated_images` row with `status='complete'` in single request round-trip

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/schema.sql` | Modified | Added `reference_image TEXT` to design_schemas CREATE TABLE |
| `src/lib/db.ts` | Modified | Added ALTER TABLE migration block after exec(schema) |
| `src/types/db.ts` | Modified | Added `reference_image: string \| null` to DesignSchema interface |
| `src/app/api/analyze/route.ts` | Modified | Added reference_image column + filename param to INSERT |
| `src/app/api/uploads/[filename]/route.ts` | Created | Serve uploads/ directory with correct Content-Type |
| `src/app/api/generate/route.ts` | Created | POST image gen endpoint — Nano Banana 2 + Replicate paths |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Replicate URL stored directly (not downloaded) | External URL sufficient for local MVP; simplifies route | Replicate URLs may expire; download-and-save deferred to Phase 7 if needed |
| `Prefer: wait` header | Synchronous prediction response — no polling loop, no webhooks, fits within 60s for flux-schnell | Simpler code; works for MVP; may need async polling for slower models in future |
| `flux-schnell` version string | Fast model; no pinned SHA for MVP | Model may be updated by Replicate; pin SHA in Phase 7 if stability needed |
| `mkdirSync` in generate route | Defensive guard in case uploads/ doesn't exist | No crash on fresh installs |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** None — plan executed exactly as written.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Checkpoint step 10/11: user ran curl with literal placeholder `<output-id-from-step-7>` | Guidance provided — user re-ran with actual UUID; passed |
| REPLICATE_API_TOKEN not set in .env.local | Environment config issue — user resolved; generation succeeded |

## Next Phase Readiness

**Ready:**
- `generated_images` table populated with `status='complete'` rows and valid URLs
- `/api/uploads/[filename]` serves both user-uploaded reference images and AI-generated images
- `design_schemas.reference_image` stores the filename for side-by-side comparison in UI
- All data contracts established for Plan 06-02 (Output Tab UI)

**Concerns:**
- Replicate URLs expire after a period — for production use, images should be downloaded and stored locally. Deferred to Phase 7.
- Nano Banana 2 path not live-tested locally (requires `GOOGLE_GENERATIVE_AI_API_KEY`); code path is correct but only verified via typecheck/build

**Blockers:** None

---
*Phase: 06-image-generation, Plan: 01*
*Completed: 2026-03-30*
