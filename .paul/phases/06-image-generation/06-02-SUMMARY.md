---
phase: 06-image-generation
plan: 02
subsystem: ui
tags: [output-tab, image-comparison, react, api-routes, gemini-image-gen]

# Dependency graph
requires:
  - phase: 06-image-generation/06-01
    provides: POST /api/generate, GET /api/uploads/[filename], generated_images table
  - phase: 05-agent-b2/05-01
    provides: prompt_outputs table — outputId available

provides:
  - GET /api/prompt-outputs — latest output with reference_image join
  - GET /api/generated-images — latest complete image for outputId
  - output-tab.tsx — prompt preview + side-by-side comparison + generate button
  - page.tsx — OutputTab wired, PlaceholderTab removed
  - Full end-to-end pipeline: upload → analyze → blueprint → prompt → generate → compare

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Correlated subquery for reference_image join (avoid JOIN ambiguity with multiple schemas per project)
    - Plain <img> tag with eslint-disable for user-generated content with unknown dimensions
    - LoadPhase + ImagePhase dual-state pattern for independent load vs generation states
    - gemini-2.5-flash-image via direct REST (not AI SDK) for native image generation

key-files:
  created:
    - src/app/api/prompt-outputs/route.ts
    - src/app/api/generated-images/route.ts
    - src/app/projects/[id]/output-tab.tsx
  modified:
    - src/app/projects/[id]/page.tsx
    - src/app/api/generate/route.ts (model name corrections during checkpoint)

key-decisions:
  - "Correlated subquery for reference_image: avoids JOIN ambiguity; correct SQLite idiom for latest-per-group"
  - "gemini-2.5-flash-image: final working model after imagen-3.0-* (wrong endpoint) and gemini-2.0-flash-exp-image-generation (retired) both failed"
  - "Plain <img> tag: next/image requires known dimensions; external Replicate URLs + local uploads have unknown sizes"
  - "IMAGE_GEN_PROVIDER=nano_banana_2 in .env.local: override mechanism; no code changes needed to swap providers"

patterns-established:
  - "Dual load phases: LoadPhase (data) + ImagePhase (generation) as independent state machines in same component"
  - "Gemini native image gen: POST to /v1beta/models/gemini-2.5-flash-image:generateContent with responseModalities:[IMAGE]; extract inlineData from candidates[0].content.parts"

# Metrics
duration: ~60min (including model name debugging)
started: 2026-03-30T02:00:00Z
completed: 2026-03-30T03:00:00Z
---

# Phase 6 Plan 02: Output Tab UI Summary

**Output tab live — reference image vs Gemini-generated image side-by-side; full pipeline end-to-end validated.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~60min (including model debugging) |
| Started | 2026-03-30 |
| Completed | 2026-03-30 |
| Tasks | 5 completed (4 code + 1 checkpoint) |
| Files modified | 2 modified, 3 created |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: /api/prompt-outputs 400 if no projectId | Pass | Zod validation |
| AC-2: /api/prompt-outputs 404 if no outputs | Pass | .get() returns undefined → 404 |
| AC-3: /api/prompt-outputs returns id, final_prompt, model_used, created_at, reference_image | Pass | Correlated subquery joins reference_image |
| AC-4: /api/generated-images 400 if no outputId | Pass | Guard in place |
| AC-5: /api/generated-images 404 if no complete image | Pass | status='complete' filter |
| AC-6: /api/generated-images returns correct fields | Pass | Full GeneratedImage row |
| AC-7: Output tab spinner while loading | Pass | LoadPhase="loading" renders SpinnerCard |
| AC-8: Output tab empty state when no prompt output | Pass | "No prompt generated yet" |
| AC-9: Output tab shows prompt text truncated to 4 lines | Pass | line-clamp-4 applied |
| AC-10: Output tab shows reference image | Pass | /api/uploads/{filename} renders correctly |
| AC-11: Output tab shows generated image when exists | Pass | Loads from DB on mount |
| AC-12: "Generate Image" button when no image | Pass | Empty right panel CTA |
| AC-13: Generate Image calls /api/generate, shows spinner, then image | Pass | Verified live |
| AC-14: Provider badge on generated image | Pass | "Nano Banana 2" badge shown |
| AC-15: Generation error message on failure | Pass | imageError state rendered |
| AC-16: page.tsx renders OutputTab, PlaceholderTab removed | Pass | Fully removed |
| AC-17: pnpm typecheck exits 0 | Pass | Clean |
| AC-18: pnpm build exits 0 | Pass | All routes in build output |

## Accomplishments

- Full pipeline end-to-end verified: upload reference image → analyze → distil blueprint → generate prompt → generate image → compare side-by-side in Output tab
- `GET /api/prompt-outputs` uses correlated subquery to join `reference_image` from `design_schemas` without JOIN ambiguity
- Output tab loads previously generated images from DB on mount — session-persistent
- Gemini 2.5 Flash image generation working: `gemini-2.5-flash-image` via direct REST call, base64 image extracted from `candidates[0].content.parts` `inlineData`, saved to `uploads/`, served via `/api/uploads/`

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/api/prompt-outputs/route.ts` | Created | Latest prompt output for project + reference_image join |
| `src/app/api/generated-images/route.ts` | Created | Latest complete generated image for outputId |
| `src/app/projects/[id]/output-tab.tsx` | Created | Full Output tab UI — prompt preview + side-by-side comparison |
| `src/app/projects/[id]/page.tsx` | Modified | OutputTab wired; PlaceholderTab removed |
| `src/app/api/generate/route.ts` | Modified | Model name fixed to gemini-2.5-flash-image; removed experimental_generateImage/createGoogleGenerativeAI |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Plain `<img>` tag | Generated images (local + external) have unknown dimensions; next/image needs known width/height or fill layout | No next/image optimization; acceptable for MVP |
| Dual state machines (LoadPhase + ImagePhase) | Data loading and image generation are independent — separate states avoids impossible combos | Clean render branches; regenerate doesn't re-fetch prompt |
| IMAGE_GEN_PROVIDER=nano_banana_2 in .env.local | Zero-code provider switch; no hardcoding | Replicate still works by reverting the env var |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Model name corrected — essential fix |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One fix to resolve Google API model name; no scope creep.

### Auto-fixed Issues

**1. Google image generation model name — 3 iterations**
- **Found during:** Task 5 checkpoint verification
- **Issue:** `imagen-3.0-generate-002` (404 — wrong endpoint, uses `:predict` not `:generateContent`), then `imagen-3.0-generate-001` (same), then `gemini-2.0-flash-exp-image-generation` (retired), then `gemini-2.0-flash-preview-image-generation` (404), finally `gemini-2.5-flash-image` (working)
- **Fix:** Updated model string in `/api/generate/route.ts`; also removed unused `experimental_generateImage` and `createGoogleGenerativeAI` imports; switched to direct Gemini REST API
- **Verification:** Live generation produced image with "Nano Banana 2" badge

## Next Phase Readiness

**Ready:**
- Full pipeline working end-to-end — Phase 6 complete
- All 8 API routes shipped and verified
- generated_images table populated; reference + generated images displayable side-by-side
- IMAGE_GEN_PROVIDER env flag switches between Gemini and Replicate with zero code changes

**Concerns:**
- Replicate image URLs expire — download-and-save deferred to Phase 7
- Generated images not downloadable yet — download button deferred to Phase 7
- Only latest prompt output shown in Output tab — history view deferred to Phase 7

**Blockers:** None — Phase 7 (Polish) can begin

---
*Phase: 06-image-generation, Plan: 02*
*Completed: 2026-03-30*
