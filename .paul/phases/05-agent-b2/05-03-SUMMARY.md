---
phase: 05-agent-b2
plan: 03
subsystem: ui
tags: [export-panel, clipboard, platform-presets, midjourney, freepik, higgsfield]

# Dependency graph
requires:
  - phase: 05-agent-b2/05-02
    provides: generationPhase state; promptText in PromptTab; generation panel structure

provides:
  - Export Panel in PromptTab — platform selector, formatted prompt, clipboard copy, char/token count
  - Platform presets: Plain Text, Midjourney v7 (--v 7 --ar), Freepik, Higgsfield AI
  - formatPromptForPlatform() helper — pure function, client-side only
  - Clipboard copy with execCommand fallback
affects: [06-image-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - navigator.clipboard + document.execCommand fallback — clipboard robustness pattern for dev + prod
    - IIFE in JSX for computed values (formatted prompt, char/token counts) — avoids useMemo for MVP
    - Platform preset config array + type union — extensible pattern for future platform additions

key-files:
  created: []
  modified:
    - src/app/projects/[id]/prompt-tab.tsx

key-decisions:
  - "Client-side formatPromptForPlatform() — no server round-trip; pure function easy to extend"
  - "document.execCommand fallback — navigator.clipboard fails silently in some dev contexts; fallback ensures copy works everywhere"
  - "Token estimate = chars / 4 — rough approximation sufficient for v0.1; no tokenizer library needed"
  - "Platform note instead of suffix for Freepik/Higgsfield — these platforms use natural language; adding noise would degrade prompt quality"

patterns-established:
  - "Clipboard copy: try navigator.clipboard, catch → try document.execCommand, catch → silent fail"
  - "Platform preset config: const array of {id, label, note} + type union — add new platforms by extending array"

# Metrics
duration: ~20min
started: 2026-03-29T00:00:00Z
completed: 2026-03-29T00:00:00Z
---

# Phase 5 Plan 03: Export Panel Summary

**Platform export panel shipped in PromptTab — Plain Text / Midjourney v7 / Freepik / Higgsfield AI presets with clipboard copy (+ execCommand fallback), character count, and token estimate; closes the deferred "Platform prompt format syntax" issue from PLANNING.md.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Started | 2026-03-29 |
| Completed | 2026-03-29 |
| Tasks | 3 completed (incl. checkpoint) |
| Files modified | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Export panel hidden before completion | Pass | Gated on `generationPhase === "complete" && promptText` |
| AC-2: Export panel visible after generation | Pass | Appears below prompt output display |
| AC-3: Four platform options | Pass | Plain Text, Midjourney v7, Freepik, Higgsfield AI |
| AC-4: Plain Text — no suffix | Pass | `formatPromptForPlatform` returns base unchanged |
| AC-5: Midjourney v7 — suffix appended | Pass | `{prompt} --v 7 --ar 16:9` (default) |
| AC-6: MJ aspect ratio selector | Pass | 6 options (1:1, 4:3, 3:2, 16:9, 9:16, 2:3); default 16:9 |
| AC-7: Freepik/Higgsfield — no suffix + note | Pass | Platform note explains natural language expectation |
| AC-8: Copy button copies formatted prompt | Pass | Works via execCommand fallback (see deviation) |
| AC-9: Character count shown | Pass | Updates reactively as platform/AR changes |
| AC-10: Token estimate shown | Pass | `Math.ceil(chars / 4)` with "(est.)" label |
| AC-11: TypeScript strict mode passes | Pass | `pnpm typecheck` exits 0 |
| AC-12: Next.js build passes | Pass | `pnpm build` exits 0 |

## Accomplishments

- `Platform` type union + `PLATFORM_PRESETS` config array + `MJ_ASPECT_RATIOS` const tuple — all platform logic co-located, easily extensible
- `formatPromptForPlatform()` — pure client-side helper; Midjourney appends `--v 7 --ar {ar}`; all others return base prompt unchanged
- Export panel JSX gated on `generationPhase === "complete"` — hidden in all other states; platform selector with active/inactive button styles; MJ AR dropdown conditional on platform; per-platform notes; `select-all` on formatted prompt for easy selection
- `copyPrompt()` — `navigator.clipboard` primary, `document.execCommand("copy")` fallback; `setCopied(true)` fires on both success paths; 1.5s reset via `setTimeout`
- Human checkpoint approved on re-verify after clipboard fix

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/projects/[id]/prompt-tab.tsx` | Modified | Export panel, platform types/config, copy helper |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Client-side `formatPromptForPlatform()` | No server round-trip needed; pure function; fast | All platform formatting stays in one place; easy to extend |
| `document.execCommand` fallback | `navigator.clipboard` throws silently in dev without HTTPS in some browsers | Copy works reliably in all dev/prod contexts |
| Token estimate = chars / 4 | Rough approximation; no tokenizer needed for v0.1 | Zero dependencies; accurate enough for prompt length guidance |
| Notes not suffixes for Freepik/Higgsfield | These platforms expect clean natural language; appending tags would degrade output | Platform guidance without polluting the prompt |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Clipboard copy now works in dev + prod |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One essential fix — clipboard fallback ensures AC-8 passes in all browser contexts.

### Auto-fixed Issues

**1. Clipboard — `navigator.clipboard.writeText()` fails silently in dev context**
- **Found during:** Human checkpoint (step 11–12 failed)
- **Issue:** `navigator.clipboard` may throw in non-HTTPS non-localhost contexts or certain browser security configurations; original code caught the error silently, so `setCopied(true)` never fired and nothing was copied
- **Fix:** Added `document.execCommand("copy")` fallback via temporary `<textarea>` element; `setCopied(true)` called in both success paths
- **Files:** `src/app/projects/[id]/prompt-tab.tsx`
- **Verification:** Human re-verified steps 11–12 — approved

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Clipboard silent failure in dev | execCommand fallback added; re-verified and approved |

## Deferred Issues Resolved

| Issue | Origin | Resolution |
|-------|--------|------------|
| Platform prompt format syntax (MJ v7, Freepik, Higgsfield AI) | PLANNING.md | Resolved — presets implemented with correct syntax |

## Next Phase Readiness

**Ready:**
- Full Phase 5 pipeline complete: schema edit → blueprint select → generate → export
- `outputId` in component state — Phase 6 can read it to associate generated images with prompt outputs
- `promptText` in state — Phase 6 Generate button can use it as the image generation prompt
- Export panel is self-contained — Phase 6 adds below it without conflict

**Concerns:**
- `PromptTab` is now a large component (~800 lines). If Phase 6 adds significant UI, consider extracting `GenerationPanel` and `ExportPanel` as named sub-components
- `document.execCommand` is deprecated but functional; production HTTPS deploy will use `navigator.clipboard` exclusively

**Blockers:**
- None

---
*Phase: 05-agent-b2, Plan: 03*
*Completed: 2026-03-29*
