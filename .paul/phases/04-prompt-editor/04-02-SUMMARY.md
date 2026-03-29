---
phase: 04-prompt-editor
plan: 02
subsystem: ui
tags: [react, client-component, form, shadcn, color-picker, lock-toggle, tailwind]

requires:
  - phase: 04-prompt-editor (plan 01)
    provides: GET /api/schemas, PATCH /api/schemas/[id]
  - phase: 02-agent-a (plan 01)
    provides: DesignExtraction type, design_schemas DB table

provides:
  - "PromptTab client component: 5-state machine (loading/empty/ready/saving/error)"
  - "Editable schema fields: Frame (4), Palette (5 color + 2 text), Layout (3), Typography (4)"
  - "Per-section lock toggles with locked badge + disabled inputs"
  - "Amber modified dot per section for dirty tracking"
  - "Save button → PATCH /api/schemas/[id] with updated fields + locked_fields"
  - "Text Fields + Elements: display-only read-only cards with lock toggle"
  - "Workspace Prompt tab wired to live component"

affects: [05-agent-b2, 07-polish]

tech-stack:
  added: []
  patterns:
    - "NonNullable<DesignExtraction['type_scale']>['letter_spacing'] — index nullable Zod type safely"
    - "isDirty via JSON.stringify comparison — simple, no per-field tracking needed"
    - "pointer-events-none + opacity-60 on locked sections — belt-and-suspenders with input disabled"
    - "originalLocked separate from original — separate dirty sources need separate reset points"

key-files:
  created:
    - src/app/projects/[id]/prompt-tab.tsx
  modified:
    - src/app/projects/[id]/page.tsx

key-decisions:
  - "isDirty computed from JSON.stringify(schema) vs JSON.stringify(original) — no per-field dirty map needed for this stage"
  - "Text Fields + Elements display-only — per-item field editing deferred to Phase 7 Polish"
  - "better-sqlite3 rebuilt in-session — Node.js version changed (MODULE_VERSION 137→141); not a code change"

patterns-established:
  - "EditableSchema interface mirrors DesignExtraction but adds id field — enables PATCH without extra state"
  - "SectionHeader component: title + modified dot + locked badge + lock toggle button — reusable pattern for Phase 5 if schema fields expand"
  - "loadSchema() sets both schema+original (and lockedFields+originalLocked) atomically — single source of truth for dirty state"

duration: 1 session
started: 2026-03-29T00:00:00Z
completed: 2026-03-29T00:00:00Z
---

# Phase 4 Plan 02: Prompt Editor UI Summary

**PromptTab wired into workspace — editable schema fields, per-section lock toggles, modified indicators, and PATCH save — Phase 4 fully functional end-to-end.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 session |
| Tasks | 4 completed (3 auto + 1 checkpoint) |
| Files created | 1 |
| Files modified | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Empty state when no schema | ✅ Pass | "No design schema yet" with explanation |
| AC-2: Loading state while fetching | ✅ Pass | Spinner during GET /api/schemas |
| AC-3: Error state on fetch failure | ✅ Pass | Error card with Retry button |
| AC-4: All 6 sections rendered | ✅ Pass | Frame, Palette, Layout, Typography, Text Fields, Elements |
| AC-5: Scalar fields are editable | ✅ Pass | Text inputs for Frame/Layout/Typography; amber dot on change |
| AC-6: Color fields use color inputs | ✅ Pass | `<input type="color">` for all 5 Palette hex values |
| AC-7: Lock toggle works per section | ✅ Pass | "locked" badge + pointer-events-none + input disabled |
| AC-8: Save disabled when not dirty | ✅ Pass | `disabled={!isDirty \|\| phase === "saving"}` |
| AC-9: Save sends PATCH + resets dirty | ✅ Pass | PATCH all 6 fields + locked_fields; setOriginal(schema) on success |
| AC-10: Text Fields + Elements display-only | ✅ Pass | Read-only cards with lock toggle per section |
| AC-11: TypeScript strict mode passes | ✅ Pass | `pnpm typecheck` exits 0 |
| AC-12: Next.js build passes | ✅ Pass | `pnpm build` exits 0 |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/projects/[id]/prompt-tab.tsx` | Created | Full editor component: state machine, editable fields, lock toggles, save |
| `src/app/projects/[id]/page.tsx` | Modified | Replaced PlaceholderTab for "prompt" tab with `<PromptTab projectId={id} />` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `isDirty` via `JSON.stringify` comparison | No per-field tracking needed at this stage — whole-schema comparison is sufficient | Simple reset on save: `setOriginal(schema)` |
| Text Fields + Elements display-only | Per-item editing (role/style/position inputs per array item) adds significant plan complexity — deferred to Phase 7 | Users can lock/unlock these sections; content editing waits for Polish phase |
| `NonNullable<DesignExtraction["type_scale"]>["letter_spacing"]` | `type_scale` is Zod `.nullable()` so direct index `DesignExtraction["type_scale"]["letter_spacing"]` fails TS strict mode | Pattern for any future nullable Zod field type access |

## Deviations from Plan

### Auto-fixed Issues

**1. TypeScript TS2339 — nullable Zod type indexed directly**
- **Found during:** Task 2 qualify (typecheck)
- **Issue:** `v as DesignExtraction["type_scale"]["letter_spacing"]` fails because `DesignExtraction["type_scale"]` is `TypeScaleType | null` (from `.nullable()` in Zod schema) — cannot index a union containing null
- **Fix:** `NonNullable<DesignExtraction["type_scale"]>["letter_spacing"]`
- **Verification:** `pnpm typecheck` exits 0

### Infrastructure Fix (not a code deviation)

**2. better-sqlite3 NODE_MODULE_VERSION mismatch**
- **Found during:** Checkpoint human-verify (dev server startup)
- **Issue:** `better-sqlite3` compiled for Node MODULE_VERSION 137; current Node requires 141
- **Fix:** `pnpm rebuild better-sqlite3` — 30-second rebuild, no code changes
- **Impact:** None on plan output; environment-level fix only

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| better-sqlite3 Node.js version mismatch (MODULE_VERSION 137 vs 141) | `pnpm rebuild better-sqlite3` — instant fix |
| TS2339 on nullable type_scale index | `NonNullable<>` wrapper on cast target |

## Next Phase Readiness

**Ready:**
- `locked_fields` are now persisted — Agent B2 (Phase 5) can read them via GET /api/schemas and skip locked sections
- `PromptTab` establishes the editor pattern for Phase 5's prompt output display panel
- `DesignSchema` fields (frame, palette, layout, type_scale) are fully editable and saved — schema state is user-controlled going into Phase 5

**Concerns:**
- Text Fields and Elements per-item editing deferred to Phase 7 — users can lock but not modify array content
- `visual_hierarchy` array inside Layout is display-only (no editing) — same deferred scope

**Blockers:** None.

---
*Phase: 04-prompt-editor, Plan: 02*
*Completed: 2026-03-29*
