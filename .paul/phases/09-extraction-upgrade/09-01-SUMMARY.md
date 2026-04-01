---
phase: 09-extraction-upgrade
plan: 01
subsystem: api
tags: [gemini, zod, typescript, design-extraction, typography]

requires:
  - phase: 08-production-deploy
    provides: Working /api/analyze endpoint on Vercel with gemini-2.5-flash

provides:
  - TypeFingerprintSchema (19 fields) — per-role typographic fingerprint
  - TypeScaleEntrySchema — replaces flat TypeScaleSchema
  - Enriched FrameSchema (bleed, crop_treatment, composition_notes)
  - Enriched PaletteSchema (character)
  - Rewritten DESIGN_ANALYSIS_PROMPT with classification + editorial vocabulary
  - Updated analyze-tab.tsx and prompt-tab.tsx for new type_scale shape

affects: [phase-10-evaluation-refinement, prompt-rewrite, agent-b2]

tech-stack:
  added: []
  patterns:
    - "TypeFingerprintSchema: 19-field per-role typographic fingerprint on type_scale array entries"
    - "type_scale is now z.array(TypeScaleEntrySchema).nullable() — not a flat object"
    - "FrameSchema carries bleed boolean for downstream prompt logic"
    - "PaletteSchema.character is free-text design vocabulary (not mood enum)"

key-files:
  modified:
    - src/lib/schemas/design-extraction.ts
    - src/app/projects/[id]/analyze-tab.tsx
    - src/app/projects/[id]/prompt-tab.tsx

key-decisions:
  - "type_scale restructured from flat object to per-role array — old fields (primary_typeface, weight_range, scale, letter_spacing) removed entirely"
  - "Local FieldRow added to prompt-tab.tsx — not imported from analyze-tab"
  - "DESIGN_ANALYSIS_PROMPT now embeds full classification taxonomy in the prompt body — not just field descriptions"

patterns-established:
  - "Fingerprint vocabulary: 10 classification values, 5 strokeContrast levels, free-text editorialStyle"
  - "Null fields for numberStyle, numberPosition, variable — explicit null when not detectable"
  - "Prompt-embedded taxonomy: classification examples inline in prompt text for reliable LLM output"

duration: ~30min
started: 2026-03-31T00:00:00Z
completed: 2026-03-31T00:30:00Z
---

# Phase 9 Plan 01: Extraction Upgrade Summary

**Replaced the flat `TypeScaleSchema` with a per-role `TypeFingerprintSchema` array (19 fields), enriched `FrameSchema` with bleed/crop detection, added `PaletteSchema.character`, and rewrote `DESIGN_ANALYSIS_PROMPT` with embedded classification taxonomy — all verified by `pnpm typecheck` + `pnpm build`.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-03-31 |
| Completed | 2026-03-31 |
| Tasks | 7 completed |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: `TypeFingerprintSchema` with 19 fields | Pass | Core, inferred, spacing, case/align, decorative, numbers, variable, layout-interactions all present |
| AC-2: `type_scale` → `z.array(TypeScaleEntrySchema).nullable()` | Pass | Each entry: `{ role: string, fingerprint: TypeFingerprintSchema }` |
| AC-3: `FrameSchema` + `crop_treatment`, `composition_notes`, `bleed` | Pass | All three fields added with appropriate types |
| AC-4: `PaletteSchema` + `character` | Pass | Free-text palette personality field added |
| AC-5: `DESIGN_ANALYSIS_PROMPT` rewritten | Pass | Includes classification taxonomy, stroke contrast, editorial style, bleed/crop, palette character instructions |
| AC-6: `analyze-tab.tsx` updated | Pass | Iterates `type_scale` array, renders role label + 9 fingerprint fields per entry |
| AC-7: `prompt-tab.tsx` updated | Pass | Reads per-role fingerprints via new local `FieldRow`; lock/unlock at whole `type_scale` key |
| AC-8: `pnpm typecheck` exits 0 | Pass | Zero errors after FieldRow deviation fix |
| AC-9: Manual test 2–3 images | Pending | Awaiting user verification — new schema shape deployed to Vercel |

## Accomplishments

- `TypeFingerprintSchema`: 19 fields spanning Figma-panel-detectable and inferred typographic properties — eliminates vague "bold serif" descriptions in favour of "high-contrast-serif / extreme / Didot-class high fashion"
- `type_scale` is now per-role — one fingerprint per text role (headline, body, caption…) rather than a single flattened description of the whole typographic system
- `DESIGN_ANALYSIS_PROMPT` embeds the full 10-value classification taxonomy inline with Didot/Bodoni/Helvetica examples — reduces hallucination of off-spec values
- `frame.bleed` enables Phase 10 evaluation to flag missing bleed in generated output
- `palette.character` gives downstream prompt-rewrite (Agent B2) vocabulary to describe colour in design terms rather than mood adjectives

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/schemas/design-extraction.ts` | Modified | `TypeFingerprintSchema` + `TypeScaleEntrySchema` + enriched Frame/Palette + rewritten prompt |
| `src/app/projects/[id]/analyze-tab.tsx` | Modified | Typography card iterates new array — 9 fingerprint rows per role |
| `src/app/projects/[id]/prompt-tab.tsx` | Modified | Typography editor replaced with read-only per-role display + added local `FieldRow` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Removed `TypeScaleSchema` entirely (no legacy fields) | Old flat fields (`primary_typeface`, `weight_range`, `scale`, `letter_spacing`) are fully superseded — keeping them would cause schema confusion | Clean break; existing DB rows with old shape will deserialize to `null` on `type_scale` field |
| Local `FieldRow` added to `prompt-tab.tsx` rather than shared import | `prompt-tab.tsx` had only `FieldInput`; creating a shared component would be premature abstraction for a 4-line helper | No cross-file dependency introduced |
| Classification taxonomy embedded in prompt text | Relying only on Zod enum `.describe()` produced off-spec values in testing; inline examples (Didot, Futura, Helvetica) anchor the LLM | Future prompt changes should preserve inline examples |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Minimal — local helper added |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Single implementation detail resolved inline; no scope change.

### Auto-fixed Issues

**1. Missing `FieldRow` in `prompt-tab.tsx`**
- **Found during:** Task 7 execution
- **Issue:** `prompt-tab.tsx` uses `FieldInput` (editable) but the new type_scale section needed display-only rows; `FieldRow` doesn't exist in this file
- **Fix:** Added 8-line local `FieldRow` function before `FieldInput`
- **Files:** `src/app/projects/[id]/prompt-tab.tsx`
- **Verification:** `pnpm typecheck` exits 0

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `pnpm typecheck` failed after Tasks 1–5 with 9 errors | Expected — Tasks 6+7 (UI updates) were the downstream fix. Resolved by executing Tasks 6+7. |
| `prompt-tab.tsx` missing `FieldRow` component | Auto-fixed: added local definition (see Deviations) |

## Next Phase Readiness

**Ready:**
- `/api/analyze` returns new schema shape — `type_scale` array with per-role fingerprints, `frame.bleed`, `palette.character`
- `DESIGN_ANALYSIS_PROMPT` has full vocabulary for Agent A to classify typefaces precisely
- `DesignExtraction` type now carries all data Phase 10 evaluation needs to compare against generated output
- `analyze-tab.tsx` and `prompt-tab.tsx` display new fingerprint structure

**Concerns:**
- AC-9 (manual test) still pending — user should run 2–3 images through `/api/analyze` to confirm Gemini respects new prompt vocabulary before building Phase 10 evaluation on top
- Existing DB rows have old `type_scale` shape (flat object) — they will return `null` for `type_scale` when parsed with new Zod schema; this is acceptable (old schemas show "No typography detected")
- `prompt-rewrite.ts` serialises `type_scale` via `schemaSection()` as a raw JSON string — Phase 10 should confirm Agent B2 prompt quality with new verbose fingerprint

**Blockers:**
- None for Phase 10 planning — manual test is recommended before Phase 10 execution

---
*Phase: 09-extraction-upgrade, Plan: 01*
*Completed: 2026-03-31*
