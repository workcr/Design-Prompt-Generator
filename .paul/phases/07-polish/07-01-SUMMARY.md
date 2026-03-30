---
phase: 07-polish
plan: 01
subsystem: ui
tags: [next.js, sqlite, replicate, gemini, image-generation, history]

requires:
  - phase: 06-image-generation
    provides: generated_images table, /api/generate route, output-tab.tsx, /api/prompt-outputs route

provides:
  - Replicate images downloaded and persisted in uploads/ at generation time (no expiry)
  - /api/prompt-outputs returns array of up to 10 outputs with joined image_url + image_provider
  - Output tab with history selector, copy-prompt button, download button, in-place generate updates

affects: [07-02-blueprint-management, 08-production-deploy]

tech-stack:
  added: []
  patterns:
    - "In-place array update via setOutputs(prev => prev.map((o, i) => i === activeIndex ? {...o, ...patch} : o))"
    - "Derived state guarded for noUncheckedIndexedAccess: outputs[activeIndex] ?? null"
    - "Correlated subqueries for joined data in SQLite (image_url, image_provider per prompt output)"

key-files:
  modified:
    - src/app/api/generate/route.ts
    - src/app/api/prompt-outputs/route.ts
    - src/app/projects/[id]/output-tab.tsx

key-decisions:
  - "Provider stays env-var only (IMAGE_GEN_PROVIDER) — no UI toggle; deployment-level config"
  - "Replicate images stored as .webp (content-type from Replicate responses)"
  - "limit param clamped to [1, 50] — protects against runaway queries"

patterns-established:
  - "History selector: <select> rendered only when outputs.length > 1"
  - "Copy prompt: navigator.clipboard with execCommand fallback for restricted contexts"
  - "Download: <a href download> works because all images are now /api/uploads/ local paths"

duration: ~20min
started: 2026-03-30T00:00:00Z
completed: 2026-03-30T00:00:00Z
---

# Phase 7 Plan 01: Output History + Download Summary

**Replicate image persistence fixed, prompt-outputs API extended to return history list with joined image data, and Output tab overhauled with history selector, copy-prompt, and download.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Started | 2026-03-30 |
| Completed | 2026-03-30 |
| Tasks | 3 auto + 1 checkpoint completed |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Replicate images persist locally | Pass | URL now starts with /api/uploads/; file saved to uploads/ |
| AC-2: prompt-outputs returns history list | Pass | Array of up to 10, each with image_url + image_provider |
| AC-3: prompt-outputs 404 when no outputs | Pass | rows.length === 0 → 404 |
| AC-4: Output tab history selector | Pass | <select> renders when outputs.length > 1 |
| AC-5: Copy prompt button | Pass | navigator.clipboard + execCommand fallback; 2s "Copied!" feedback |
| AC-6: Download image button | Pass | <a href download> in actions row when imagePhase=complete |
| AC-7: Generate updates active output in-place | Pass | setOutputs(prev => prev.map(...)) pattern |
| AC-8: TypeScript and build pass | Pass | pnpm typecheck && pnpm build both exit 0 |

## Accomplishments

- Replicate-generated images are now downloaded at generation time and stored in `uploads/` — eliminating the 24h expiry problem. All image URLs now start with `/api/uploads/` for both providers.
- `/api/prompt-outputs` now returns a list (default 10, max 50) with two correlated subqueries joining the latest complete generated image per output — eliminating the need for a separate `/api/generated-images` call on load.
- Output tab transformed from single-output viewer to a full history tool: select past outputs by date, copy any prompt to clipboard, download any image, regenerate in-place.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/api/generate/route.ts` | Modified | Replicate path now downloads image → saves to uploads/ → stores /api/uploads/ url |
| `src/app/api/prompt-outputs/route.ts` | Modified | .get() → .all(), added limit param, added image_url + image_provider correlated subqueries |
| `src/app/projects/[id]/output-tab.tsx` | Modified | Rewrote: outputs[] array state, activeIndex, history selector, copy prompt, download button, in-place generate |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Provider stays env-var only (no UI toggle) | Provider is a deployment concern, not a per-user setting | User must edit .env.local and restart dev server to switch |
| Replicate images saved as .webp | Replicate Flux Schnell returns WebP; simpler than content-type detection | All Replicate files end in .webp in uploads/ |
| limit clamped to [1, 50] | Protects DB query from runaway values; 50 is a generous cap | Future pagination possible if needed |
| Removed GeneratedImageItem interface | No longer needed — image data embedded in PromptOutputItem | Cleaner types; generate() response uses new GenerateResponse interface |

## Deviations from Plan

None — plan executed exactly as written. pnpm typecheck and build passed clean on first attempt.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- All generated images are locally persisted — safe foundation for production deploy (Phase 8)
- Output tab is the primary UX for the generation pipeline — ready for any additional polish
- `/api/prompt-outputs` list API is flexible (limit param) — ready for pagination if needed

**Concerns:**
- `/api/generated-images` route still exists but is no longer called by output-tab.tsx (image data now comes from prompt-outputs). Could be removed in 07-02 or left for future use.
- History selector uses a plain `<select>` — could be styled more elegantly, but functional.

**Blockers:**
- None

---
*Phase: 07-polish, Plan: 01*
*Completed: 2026-03-30*
