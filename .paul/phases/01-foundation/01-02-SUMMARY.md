---
phase: 01-foundation
plan: 02
subsystem: database, api
tags: [better-sqlite3, sqlite, wal, zod, rest-api, crud, typescript]

requires:
  - phase: 01-01
    provides: Next.js 16 scaffold, TypeScript strict mode, Zod, env.ts

provides:
  - WAL-mode SQLite singleton (getDb()) with auto-migration on first call
  - Full 5-table schema with cascade rules and 4 indexes
  - TypeScript interfaces for all 5 entities + ProjectDetail join type
  - /api/projects REST API — list, create, get, update, delete

affects: [02-agent-a, 03-agent-b1, 04-prompt-editor, 05-agent-b2, 06-image-gen]

tech-stack:
  added:
    - better-sqlite3@12.8.0 (with native addon compiled)
    - "@types/better-sqlite3@7.6.13"
  patterns:
    - DB singleton via getDb() — only place migrations run
    - JSON fields stored as TEXT — serialization belongs to the API layer
    - All SQL values via prepared statements — no string interpolation for values
    - Dynamic SET clauses for PATCH use key enumeration, not string concat for values

key-files:
  created:
    - src/lib/schema.sql
    - src/lib/db.ts
    - src/types/db.ts
    - src/app/api/projects/route.ts
    - src/app/api/projects/[id]/route.ts
  modified:
    - package.json (better-sqlite3 dep + pnpm.onlyBuiltDependencies)
    - pnpm-lock.yaml

key-decisions:
  - "pnpm.onlyBuiltDependencies: better-sqlite3 requires native compilation — approved via package.json config, not interactive CLI"
  - "JSON fields stored as TEXT in SQLite: serialization/deserialization stays in the API layer, not db.ts"
  - "RouteContext params typed as Promise<{id: string}>: Next.js 15+ dynamic route params are async"

patterns-established:
  - "All DB access via getDb() — never instantiate Database directly in route files"
  - "RETURNING * pattern for INSERT/UPDATE — avoids a second SELECT round-trip"
  - "Zod .safeParse() on all request bodies — never trust raw request.json()"

duration: ~30min
started: 2026-03-28T00:00:00Z
completed: 2026-03-28T00:00:00Z
---

# Phase 1 Plan 02: Data Layer + Project API Summary

**WAL-mode SQLite singleton with auto-migration, full 5-table schema, TypeScript interfaces for all entities, and a complete /api/projects CRUD REST API with Zod-validated request bodies.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Tasks | 2 completed |
| Files created | 5 |
| Files modified | 2 |
| Deviations auto-fixed | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Database Initialises on First Run | Pass | `getDb()` creates `data/dpg.db`, runs schema.sql, WAL mode + FK enforcement on every startup |
| AC-2: Project CRUD API — List and Create | Pass | `GET /api/projects` returns array; `POST` with `{name}` returns 201 with full row |
| AC-3: Project CRUD API — Get, Update, Delete | Pass | `GET [id]` returns `ProjectDetail` with `design_schema`/`grammar_blueprint` (null until created); `PATCH` updates and returns row; `DELETE` returns 204 |
| AC-4: Input Validation Rejects Bad Data | Pass | Zod on all POST/PATCH bodies; 400 with `fieldErrors`; 404 on all `[id]` routes for missing projects |
| AC-5: TypeScript Strict Mode Passes | Pass | `pnpm typecheck` returns zero errors |

## Accomplishments

- `better-sqlite3` installed with native addon compiled — WAL-mode DB singleton ready with single-call auto-migration
- All 5 schema tables defined with proper CASCADE/SET NULL rules; 4 covering indexes for foreign keys
- 6 TypeScript interfaces exported including `ProjectDetail` (join type for Phase 2/3 reads)
- Complete 5-method REST API with Zod validation, 400/404 error handling, and generic client-safe error messages

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Tasks 1 + 2 (batched) | `69cc8ad` | feat(01-02): SQLite data layer + /api/projects CRUD |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/schema.sql` | Created | 5 tables + 4 indexes — all constraints, cascade rules, and defaults |
| `src/lib/db.ts` | Created | WAL-mode SQLite singleton; runs schema on first `getDb()` call |
| `src/types/db.ts` | Created | TypeScript interfaces: Project, DesignSchema, GrammarBlueprint, PromptOutput, GeneratedImage, ProjectDetail |
| `src/app/api/projects/route.ts` | Created | GET (list all) + POST (create with Zod validation) |
| `src/app/api/projects/[id]/route.ts` | Created | GET (detail + joins) + PATCH (partial update) + DELETE (cascade) |
| `package.json` | Modified | Added `better-sqlite3` dep + `pnpm.onlyBuiltDependencies` for native build |
| `pnpm-lock.yaml` | Modified | Lockfile updated for better-sqlite3 and @types/better-sqlite3 |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `pnpm.onlyBuiltDependencies: ["better-sqlite3"]` | `pnpm approve-builds` is interactive-only; package.json config is the non-interactive equivalent | All future devs who clone the repo get the native addon compiled automatically |
| JSON fields as TEXT in db.ts | db.ts has no business logic — JSON parsing belongs to the API layer (or Phase 2's schema viewer) | Keeps db.ts a clean transport layer; Phase 2 can parse/validate JSON fields with Zod |
| `RouteContext = { params: Promise<{ id: string }> }` | Next.js 15+ App Router dynamic params are async Promises | Correct typing for Next.js 16; `await params` required in every handler |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential infrastructure fix, no scope impact |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One minor auto-fixed issue. Plan executed as specified.

### Auto-fixed Issues

**1. pnpm native build approval**
- **Found during:** Task 1 (better-sqlite3 install)
- **Issue:** `pnpm add better-sqlite3` succeeded but native addon was not compiled — `pnpm approve-builds` is interactive and can't be automated
- **Fix:** Added `"pnpm": { "onlyBuiltDependencies": ["better-sqlite3"] }` to `package.json`, then ran `pnpm install` to trigger compilation
- **Verification:** `prebuild-install: Done` in pnpm output; subsequent `pnpm typecheck` passed

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `pnpm approve-builds` is interactive — can't automate via shell | Added `pnpm.onlyBuiltDependencies` to `package.json`; both local dev and CI will compile on install |

## Next Phase Readiness

**Ready:**
- `getDb()` exportable from `@/lib/db` — import in any API route, middleware, or server action
- All 5 DB entities typed and ready for Phase 2 (Agent A writes `design_schemas`) and Phase 3 (Agent B1 writes `grammar_blueprints`)
- `/api/projects` CRUD tested and available — Plan 01-03 dashboard UI can read/write projects immediately
- `ProjectDetail` join type already defined — Phase 2 UI only needs to call `GET /api/projects/[id]`

**Concerns:**
- `data/dpg.db` is gitignored (correct) — developers need to run the app once to generate it; no seed script exists yet
- JSON fields in DB are stored as raw TEXT strings — Phase 2 will need to `JSON.parse()` when reading DesignSchema fields from API responses

**Blockers:** None

---
*Phase: 01-foundation, Plan: 02*
*Completed: 2026-03-28*
