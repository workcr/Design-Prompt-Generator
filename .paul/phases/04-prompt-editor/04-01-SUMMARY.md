---
phase: 04-prompt-editor
plan: 01
subsystem: api
tags: [nextjs, sqlite, zod, rest, better-sqlite3]

requires:
  - phase: 02-agent-a (plan 01)
    provides: design_schemas table, DesignSchema DB type, locked_fields column

provides:
  - "GET /api/schemas?projectId=X — latest design_schemas row for a project"
  - "PATCH /api/schemas/[id] — partial field updates + locked_fields persistence"

affects: [04-prompt-editor (plan 02), 05-agent-b2]

tech-stack:
  added: []
  patterns:
    - "z.unknown().optional() for JSON field columns — accepts any object/value, server stringifies before write"
    - "JSON_FIELDS const tuple + loop — avoids repetitive setClauses per field, scales cleanly to 6 columns"
    - "PATCH returns RETURNING * — full updated row; UI never needs a follow-up GET after save"

key-files:
  created:
    - src/app/api/schemas/route.ts
    - src/app/api/schemas/[id]/route.ts
  modified: []

key-decisions:
  - "z.unknown().optional() for JSON field columns — editor sends parsed objects; server calls JSON.stringify before DB write"
  - "locked_fields accepted as string[] — server stringifies to match DB TEXT column convention"

patterns-established:
  - "JSON field PATCH pattern: z.unknown() input → JSON.stringify at write boundary — same pattern for all future JSON column updates"

duration: 1 session
started: 2026-03-28T00:00:00Z
completed: 2026-03-28T00:00:00Z
---

# Phase 4 Plan 01: Schema API Routes Summary

**GET `/api/schemas` and PATCH `/api/schemas/[id]` — editor backend complete, all 11 ACs passed, clean build.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 session |
| Tasks | 4 completed |
| Files created | 2 |
| Files modified | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: GET returns latest schema row | ✅ Pass | `ORDER BY created_at DESC LIMIT 1` |
| AC-2: GET returns 400 when projectId missing | ✅ Pass | `searchParams.get("projectId")` null check |
| AC-3: GET returns 404 when project not found | ✅ Pass | Project existence check before schema query |
| AC-4: GET returns 404 when no schema for project | ✅ Pass | `schema` undefined guard |
| AC-5: PATCH updates any subset of 6 JSON columns | ✅ Pass | `JSON_FIELDS` loop with `JSON.stringify` |
| AC-6: PATCH updates locked_fields as JSON array | ✅ Pass | Separate `locked_fields` branch with `JSON.stringify` |
| AC-7: PATCH returns 404 when schema not found | ✅ Pass | `exists` check before body parse |
| AC-8: PATCH returns 400 when body has no fields | ✅ Pass | `.refine(data => Object.keys(data).length > 0)` |
| AC-9: PATCH returns updated full row | ✅ Pass | `RETURNING *` + `.get()` |
| AC-10: TypeScript strict mode passes | ✅ Pass | `pnpm typecheck` exits 0 |
| AC-11: Next.js build passes | ✅ Pass | Both routes appear in build manifest |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/api/schemas/route.ts` | Created | GET handler — fetches latest design_schemas row for a project |
| `src/app/api/schemas/[id]/route.ts` | Created | PATCH handler — partial field + locked_fields updates with RETURNING * |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `z.unknown().optional()` for JSON field columns | Editor sends parsed objects (Frame, Palette, etc.); server owns the stringify boundary — keeps route consistent with `parseDbSchema()` deserializing at the display layer | Plan 04-02 editor can send field objects directly without pre-stringifying |
| `locked_fields` accepted as `string[]` | Zod validates type; server stringifies — matches DB TEXT column and `parseDbBlueprint()` boundary conventions | Consistent with all other JSON-as-TEXT fields in the schema |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `GET /api/schemas?projectId=X` available for Prompt tab to load current schema on mount
- `PATCH /api/schemas/[id]` available for field edits and lock toggle saves
- Both routes typed and build-verified — Plan 04-02 can build the editor UI against these endpoints immediately

**Concerns:**
- None

**Blockers:** None.

---
*Phase: 04-prompt-editor, Plan: 01*
*Completed: 2026-03-28*
