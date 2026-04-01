---
phase: 08-production-deploy
plan: 01
subsystem: infra
tags: [supabase, vercel, postgresql, next.js, deployment]

requires:
  - phase: 07-polish
    provides: complete local pipeline, all API routes stable

provides:
  - @supabase/supabase-js 2.101.0 installed
  - src/lib/supabase-server.ts — getSupabaseServer() service role factory
  - src/lib/schema.postgres.sql — PostgreSQL DDL (5 tables, 4 indexes)
  - Supabase project provisioned with all tables created
  - Vercel project linked to GitHub, all production env vars set

affects: [08-02-db-storage-migration, 08-03-auth-ratelimit]

tech-stack:
  added:
    - "@supabase/supabase-js 2.101.0"
  patterns:
    - "getSupabaseServer() — service role client factory, throws fast if env vars missing"
    - "PostgreSQL schema mirrors SQLite schema: TEXT ids (gen_random_uuid()::text), TIMESTAMPTZ timestamps"

key-files:
  created:
    - src/lib/supabase-server.ts
    - src/lib/schema.postgres.sql

key-decisions:
  - "Service role key in server factory — bypasses RLS; appropriate for server-only API routes"
  - "IDs stay as TEXT (gen_random_uuid()::text) — preserves TypeScript string types, no cascade changes"
  - "TIMESTAMPTZ for timestamps — ISO strings from Supabase compatible with new Date() in all UI components"
  - "Deploy intentionally deferred — Vercel deploy withheld until 08-02 migrates all routes off SQLite"

patterns-established:
  - "getSupabaseServer() throws immediately with descriptive message if env vars missing — fail-fast pattern"

duration: ~15min
started: 2026-03-30T00:00:00Z
completed: 2026-03-30T00:00:00Z
---

# Phase 8 Plan 01: Supabase Foundation + Vercel Setup Summary

**Supabase project provisioned with PostgreSQL schema, server client factory created, Vercel project linked with all env vars — infrastructure ready for DB migration in 08-02.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Started | 2026-03-30 |
| Completed | 2026-03-30 |
| Tasks | 1 auto + 1 human-action + 1 auto + 1 human-verify |
| Files modified | 2 created + package.json + pnpm-lock.yaml |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Supabase client factory created | Pass | getSupabaseServer() with service role, throws on missing vars |
| AC-2: PostgreSQL schema is complete | Pass | 5 tables + 4 indexes, IF NOT EXISTS safe to re-run |
| AC-3: Supabase project has all tables | Pass | Verified in Table Editor |
| AC-4: Vercel project linked + env vars set | Pass | 8 vars set for Production, deploy pending 08-02 |
| AC-5: TypeScript passes | Pass | pnpm typecheck && pnpm build both exit 0 |

## Accomplishments

- `@supabase/supabase-js` 2.101.0 installed and typechecking clean.
- `getSupabaseServer()` factory created — service role client for all server-side API routes. Fails fast with a clear error message if env vars are not set.
- `schema.postgres.sql` is a clean PostgreSQL port of the SQLite schema — IDs kept as TEXT to preserve all existing TypeScript types without change, timestamps upgraded to TIMESTAMPTZ.
- Supabase project provisioned with all 5 tables and 4 indexes. Vercel project linked to GitHub with 8 production env vars set. Deploy intentionally held — routes still use SQLite and would crash if deployed now.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/supabase-server.ts` | Created | getSupabaseServer() factory — service role Supabase client |
| `src/lib/schema.postgres.sql` | Created | PostgreSQL DDL for all 5 tables + 4 indexes |
| `package.json` | Modified | Added @supabase/supabase-js 2.101.0 |
| `pnpm-lock.yaml` | Modified | Lock file updated |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| TEXT IDs via gen_random_uuid()::text | Keeps all TypeScript interfaces unchanged (string type) | No cascade type changes in 13 API routes |
| TIMESTAMPTZ for timestamps | Correct PostgreSQL type; Supabase returns ISO strings compatible with new Date() | All UI date formatting works unchanged |
| Service role in server factory | API routes are server-only; service role bypasses RLS cleanly for MVP | No RLS policies needed at this stage |
| Deploy deferred to 08-02 | All routes still call getDb() (SQLite) — deploying now would crash | Clean deploy in 08-02 after full route migration |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `getSupabaseServer()` is importable by any API route from `@/lib/supabase-server`
- PostgreSQL schema is live in Supabase — tables exist and accept writes
- Vercel project has all required env vars — one-click deploy possible after 08-02
- `pnpm build` clean — no regressions

**Concerns:**
- `better-sqlite3` native module: Vercel's build will attempt to compile it. Since `LOCAL_MODE=false` in production, `getDb()` should never be called — but the build step may still fail if better-sqlite3 can't be compiled for the Vercel environment. May need to handle this in 08-02 (e.g., conditional import or removing better-sqlite3 from production bundle).

**Blockers:**
- None — ready for 08-02

---
*Phase: 08-production-deploy, Plan: 01*
*Completed: 2026-03-30*
