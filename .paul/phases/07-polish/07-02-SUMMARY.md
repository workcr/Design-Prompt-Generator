---
phase: 07-polish
plan: 02
subsystem: ui
tags: [next.js, sqlite, blueprint-management, project-management, export]

requires:
  - phase: 06-image-generation
    provides: full pipeline, generated_images table
  - phase: 07-01
    provides: /api/prompt-outputs list, output-tab history

provides:
  - DELETE /api/blueprints/[id] — blueprint delete endpoint
  - Blueprint library panel in Blueprint tab (load + delete saved blueprints)
  - Project rename inline on dashboard
  - Schema JSON export button in Analyze tab

affects: [08-production-deploy]

tech-stack:
  added: []
  patterns:
    - "Blueprint library: useEffect load on mount, prepend on new distillation, filter on delete"
    - "Inline rename: single renamingId state gates all cards (only one edit at a time)"
    - "Client-side JSON export: Blob + URL.createObjectURL + programmatic <a> click + revokeObjectURL"

key-files:
  created:
    - src/app/api/blueprints/[id]/route.ts
  modified:
    - src/app/projects/[id]/blueprint-tab.tsx
    - src/app/page.tsx
    - src/app/projects/[id]/analyze-tab.tsx

key-decisions:
  - "Blueprint library in idle/error phase only — distill form is the entry point; library is curation, not navigation"
  - "renamingId is a single nullable string — only one card editable at a time; avoids conflicting PATCH calls"
  - "Export parsedSchema not raw DesignSchema — typed parsed form is more useful than raw DB TEXT columns"

patterns-established:
  - "Blob download: new Blob → URL.createObjectURL → appendChild(<a>) → click → removeChild → revokeObjectURL"
  - "DELETE endpoint: SELECT exists → DELETE → 204; 404 if not found (same pattern as /api/projects/[id])"

duration: ~15min
started: 2026-03-30T00:00:00Z
completed: 2026-03-30T00:00:00Z
---

# Phase 7 Plan 02: Blueprint + Project Management Summary

**Blueprint library panel with delete, project rename inline on dashboard, and schema JSON export — completing Phase 7 Polish.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Started | 2026-03-30 |
| Completed | 2026-03-30 |
| Tasks | 3 auto + 1 checkpoint completed |
| Files modified | 4 (1 created, 3 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Delete a saved blueprint | Pass | DELETE /api/blueprints/[id] → 204; list updates in-place |
| AC-2: Blueprint library loads on tab open | Pass | useEffect on mount, fetches /api/blueprints?projectId |
| AC-3: Blueprint library empty state | Pass | "No blueprints yet." shown when array is empty |
| AC-4: Project rename inline | Pass | Rename button → inline input → PATCH → card updates |
| AC-5: Project rename cancel | Pass | Cancel dismisses input, name unchanged |
| AC-6: Schema JSON export | Pass | "Export JSON" button downloads schema-{projectId}.json |
| AC-7: TypeScript and build pass | Pass | pnpm typecheck && pnpm build both exit 0 |

## Accomplishments

- Users can now manage their blueprint library: the Blueprint tab shows all saved blueprints on load, new distillations prepend to the list immediately, and each blueprint has a Delete button with a confirm dialog.
- Project cards on the dashboard now have an inline Rename flow — a single `renamingId` state ensures only one card is editable at a time, keeping the UI clean.
- Analyze tab done state now has an "Export JSON" button next to "Upload new image" — downloads the full parsed design schema as a JSON file, useful for debugging or sharing schemas externally.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/api/blueprints/[id]/route.ts` | Created | DELETE handler — validates existence, deletes, returns 204 |
| `src/app/projects/[id]/blueprint-tab.tsx` | Modified | Added BlueprintListItem type, savedBlueprints state, useEffect load, deleteBlueprint, library panel JSX |
| `src/app/page.tsx` | Modified | Added renamingId/renameValue/renaming state, handleRename(), inline rename form in CardFooter |
| `src/app/projects/[id]/analyze-tab.tsx` | Modified | Added exportJson(), "Export JSON" button in done render |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Library panel in idle/error phase only | Distill form is the entry point; library is curation not navigation | Users see library when in "create or manage" mode, not cluttering the results view |
| renamingId as single nullable string | Prevents two cards being in edit mode simultaneously | Clean single-edit UX; no race conditions on PATCH calls |
| Export parsedSchema (not raw DesignSchema) | Parsed form has typed objects vs raw TEXT JSON strings; more useful externally | Export is clean structured JSON rather than double-encoded strings |
| No blueprint click-to-view | Viewing requires a separate distillation flow; adding viewer would duplicate the done-state render | Kept scope clean; view-on-click can be Phase 8+ |

## Deviations from Plan

None — plan executed exactly as written. pnpm typecheck and build passed clean on first attempt.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Full Phase 7 Polish complete — tool is daily-usable: history, copy, download, library management, rename, export
- All local API endpoints stable and tested
- SQLite schema unchanged — clean Supabase migration path for Phase 8

**Concerns:**
- `GET /api/generated-images` route still exists but is no longer called by output-tab.tsx (image data now joined in prompt-outputs query). Can be removed in Phase 8 cleanup or left unused.
- No blueprint click-to-view in library — deferred

**Blockers:**
- None

---
*Phase: 07-polish, Plan: 02*
*Completed: 2026-03-30*
