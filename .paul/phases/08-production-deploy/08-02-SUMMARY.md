---
phase: 08-production-deploy
plan: 02
subsystem: database
tags: [supabase, postgresql, migration, better-sqlite3, next.js, api-routes]

requires:
  - phase: 08-production-deploy/08-01
    provides: getSupabaseServer() factory, PostgreSQL schema live in Supabase

provides:
  - All 13 API routes migrated from better-sqlite3 → @supabase/supabase-js
  - src/app/projects/[id]/page.tsx migrated (server component, not an API route)
  - next.config.ts serverExternalPackages: ['better-sqlite3'] for Vercel build compat
  - App fully functional against Supabase end-to-end (projects, schemas, blueprints, prompts, images)

affects: [08-03-storage-deploy]

tech-stack:
  added: []
  patterns:
    - "getSupabaseServer() per-request — no shared client instance; stateless pattern safe for serverless"
    - "onFinish callback creates fresh getSupabaseServer() inline — avoids stale closure over async client"
    - "prompt-outputs: 3 batched Supabase queries + JS join replaces SQLite correlated subquery"
    - ".maybeSingle() for optional single-row fetches; .single() for required rows (throws on missing)"
    - "updated_at: new Date().toISOString() passed explicitly in .update() — Supabase does not auto-set it"

key-files:
  modified:
    - next.config.ts
    - src/app/projects/[id]/page.tsx
    - src/app/api/projects/route.ts
    - src/app/api/projects/[id]/route.ts
    - src/app/api/blueprints/route.ts
    - src/app/api/blueprints/[id]/route.ts
    - src/app/api/schemas/route.ts
    - src/app/api/schemas/[id]/route.ts
    - src/app/api/generated-images/route.ts
    - src/app/api/analyze/route.ts
    - src/app/api/distill/route.ts
    - src/app/api/rewrite/route.ts
    - src/app/api/generate/route.ts
    - src/app/api/prompt-outputs/route.ts

key-decisions:
  - "page.tsx (server component) migrated in a hotfix commit — scope was API routes only; discovered at human-verify"
  - "3-query Supabase join in prompt-outputs: outputs → schema (1 query) + images batched .in() → Map lookup"
  - "onFinish in rewrite creates getSupabaseServer() inside callback — stateless, no connection overhead"
  - "serverExternalPackages keeps better-sqlite3 out of Vercel bundle without removing the package"

patterns-established:
  - ".maybeSingle() for queries that may return null (no error thrown); .single() for must-exist rows"
  - "explicit updated_at in .update() calls for tables that track modification time"
  - "Map<outputId, image> pattern for O(1) correlated lookups after batched fetch"

duration: ~45min
started: 2026-03-30T21:00:00Z
completed: 2026-03-30T22:00:00Z
---

# Phase 8 Plan 02: DB Route Migration Summary

**All 13 API routes + project page server component migrated from better-sqlite3 (sync) to Supabase JS client (async). App works end-to-end against PostgreSQL. Vercel build unblocked via serverExternalPackages.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Started | 2026-03-30 |
| Completed | 2026-03-30 |
| Tasks | 3 auto + 1 human-verify + 1 hotfix |
| Files modified | 15 (14 routes/pages + next.config.ts) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: next.config.ts build compat | Pass | serverExternalPackages: ['better-sqlite3'] added |
| AC-2: Simple routes migrated | Pass | projects, blueprints, schemas, generated-images — all getDb() removed |
| AC-3: Complex routes migrated | Pass | analyze, distill, rewrite (onFinish), generate, prompt-outputs all migrated |
| AC-4: TypeScript passes | Pass | pnpm typecheck exits 0 |
| AC-5: Build passes | Pass | pnpm build exits 0, all 16 routes compiled |

## Accomplishments

- Replaced `getDb()` (synchronous, SQLite) with `getSupabaseServer()` (async, PostgreSQL) across all 13 API routes. No getDb() import remains in any route or page file.
- `/api/prompt-outputs` correlated subquery migrated to 3 batched Supabase queries joined in JavaScript — equivalent result set, no N+1 queries.
- `/api/rewrite` onFinish callback correctly creates a fresh `getSupabaseServer()` inline, avoiding closure-over-stale-client bugs in async streaming.
- `next.config.ts` serverExternalPackages fix ensures Vercel's build pipeline doesn't attempt to compile the better-sqlite3 native addon.
- Hotfix for `src/app/projects/[id]/page.tsx` — server component was calling `getDb()` directly, causing all project opens to hit SQLite, find nothing, and redirect to `/`.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Tasks 1–3: all routes migrated | `56f16ea` | feat(08-02): Migrate all API routes from SQLite → Supabase |
| Hotfix: page.tsx | `d136180` | fix(08-02): migrate project page server component to Supabase |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `next.config.ts` | Modified | Added serverExternalPackages: ['better-sqlite3'] |
| `src/app/projects/[id]/page.tsx` | Modified | Server component: getDb() → getSupabaseServer() (hotfix) |
| `src/app/api/projects/route.ts` | Modified | GET + POST → Supabase |
| `src/app/api/projects/[id]/route.ts` | Modified | GET + PATCH + DELETE → Supabase |
| `src/app/api/blueprints/route.ts` | Modified | GET → Supabase |
| `src/app/api/blueprints/[id]/route.ts` | Modified | DELETE → Supabase |
| `src/app/api/schemas/route.ts` | Modified | GET → Supabase |
| `src/app/api/schemas/[id]/route.ts` | Modified | PATCH with dynamic field map → Supabase |
| `src/app/api/generated-images/route.ts` | Modified | GET → Supabase |
| `src/app/api/analyze/route.ts` | Modified | POST + INSERT 10 columns → Supabase |
| `src/app/api/distill/route.ts` | Modified | POST + INSERT 8 columns → Supabase |
| `src/app/api/rewrite/route.ts` | Modified | Streaming POST, onFinish → Supabase |
| `src/app/api/generate/route.ts` | Modified | POST + INSERT generated_images → Supabase |
| `src/app/api/prompt-outputs/route.ts` | Modified | GET with 3-query join → Supabase |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| page.tsx hotfix as separate commit | Discovered at human-verify; scoped fix, not a re-do of all tasks | Clean git history: migration + hotfix clearly separated |
| 3-query join for prompt-outputs | Supabase JS has no correlated subquery API; batched .in() + Map is O(n) not O(n²) | Equivalent result, potentially faster for large sets |
| Fresh getSupabaseServer() in onFinish | Supabase client is stateless (HTTP-based); creating inline in callback is the correct pattern | No closure risk, no connection pool exhaustion |
| .maybeSingle() vs .single() | .single() throws PGRST116 on no rows; .maybeSingle() returns null cleanly | Optional fetches (schema, blueprint) use maybeSingle; required rows use single + 404 check |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope additions | 1 | Essential fix — app non-functional without it |
| Auto-fixed | 1 | page.tsx missed in route sweep |
| Deferred | 0 | — |

**Total impact:** One essential scope addition; plan scope was "API routes" but page.tsx was also a direct getDb() caller.

### Auto-fixed Issues

**1. Server Component missed in route migration sweep**
- **Found during:** Task 4 (human-verify checkpoint)
- **Issue:** `src/app/projects/[id]/page.tsx` called `getDb()` directly. SQLite had no Supabase-created UUIDs, so `project` was always `undefined` → `redirect("/")` fired on every project open.
- **Fix:** Replaced `getDb().prepare(...).get(id)` with `await getSupabaseServer().from("projects").select("*").eq("id", id).single()`
- **Files:** `src/app/projects/[id]/page.tsx`
- **Verification:** Project open loads workspace correctly; server logs show 200 + no redirect
- **Commit:** d136180

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Shell backslash-continuation split curl command in zsh | Ran curl as single line; confirmed Supabase write worked via JSON response with UUID + TIMESTAMPTZ |
| "Failed to create project" on first curl attempt | Body never arrived (shell split ate -d flag); not a Supabase issue |

## Next Phase Readiness

**Ready:**
- All reads/writes go through Supabase — database layer is fully production-ready
- `pnpm build` passes — Vercel can compile and deploy the app
- File uploads still use local `uploads/` directory — works for local dev, needs Supabase Storage for production
- Generated images saved to `uploads/` and served via `/api/uploads/[filename]` — same concern

**Concerns:**
- Local `uploads/` files will not persist on Vercel (ephemeral filesystem). Plan 08-03 must migrate both upload handling and image generation to Supabase Storage before the first deploy.

**Blockers:**
- None — ready for 08-03 (Storage Migration + First Vercel Deploy)

---
*Phase: 08-production-deploy, Plan: 02*
*Completed: 2026-03-30*
