---
phase: 02-agent-a
plan: 01
status: complete
completed: 2026-03-28
---

# Summary: Plan 02-01 — AI SDK + /api/analyze Backend

## What Was Built

Three files delivering the full Agent A backend:

1. **`src/lib/ai.ts`** — Provider factory. `getVisionProvider()` reads `LOCAL_MODE` from env.ts and returns either an Ollama model (via OpenAI-compat endpoint) or Google Gemini 1.5 Flash. All downstream AI calls import from here — never directly from the SDK.

2. **`src/lib/schemas/design-extraction.ts`** — Full Zod extraction schema with 7 sub-schemas (`FrameSchema`, `PaletteSchema`, `LayoutSchema`, `TextFieldSchema`, `TypeScaleSchema`, `VisualElementSchema`, `DesignExtractionSchema`) plus the `DESIGN_ANALYSIS_PROMPT` constant. All fields typed; no `z.any()`.

3. **`src/app/api/analyze/route.ts`** — POST handler. Validates request body, checks project + file existence, calls `generateObject()` with image buffer + analysis prompt, computes a 16-char SHA-256 style checksum, persists all fields to `design_schemas` via RETURNING *, returns `{ id, schema }`.

## Acceptance Criteria Results

| AC | Result | Notes |
|----|--------|-------|
| AC-1: Provider factory resolves correctly | ✅ | Ollama path uses `createOpenAI` with `/v1` baseURL; Gemini path uses `createGoogleGenerativeAI` |
| AC-2: DesignExtraction schema complete and valid | ✅ | 7 sub-schemas, all fields typed, exports `DesignExtraction` type + `DESIGN_ANALYSIS_PROMPT` |
| AC-3: /api/analyze extracts and persists | ✅ | `generateObject()` → checksum → RETURNING * insert → `{ id, schema }` |
| AC-4: Error cases return correct status codes | ✅ | 400 bad input, 404 project/file not found, 500 AI failure |
| AC-5: TypeScript strict mode passes | ✅ | `pnpm typecheck` — zero errors |

## Deviations from Plan

**`@ai-sdk/ollama` → `@ai-sdk/openai` for Ollama:**
- Plan specified `pnpm add @ai-sdk/ollama` and `createOllama` from `@ai-sdk/ollama`
- `@ai-sdk/ollama` does not exist on npm (ERR_PNPM_FETCH_404)
- Fix: Ollama exposes an OpenAI-compatible API at `${OLLAMA_BASE_URL}/v1`; use `createOpenAI({ baseURL: "…/v1", apiKey: "ollama" })` from `@ai-sdk/openai` (already installed)
- `src/lib/ai.ts` documents this with an inline comment

## Decisions Made

| Decision | Impact |
|----------|--------|
| `@ai-sdk/openai` with Ollama `/v1` endpoint instead of `@ai-sdk/ollama` | Pattern for all future local AI calls — no dedicated Ollama package needed |
| Image passed as raw `Buffer` to `generateObject()` (not base64 data URL) | AI SDK handles encoding internally; cleaner interface |
| 16-char SHA-256 checksum of extracted JSON as `style_checksum` | Fast equality check for downstream deduplication without full JSON comparison |
| Provider factory in `src/lib/ai.ts` — routes never import from AI SDK directly | Single swap point for future model changes; mirrors env.ts for config changes |

## Files Created

- `src/lib/ai.ts` (new)
- `src/lib/schemas/design-extraction.ts` (new)
- `src/app/api/analyze/route.ts` (new)

## Files NOT Modified

All files in the DO NOT CHANGE boundary were left untouched: `src/lib/db.ts`, `src/lib/schema.sql`, `src/types/db.ts`, `src/lib/env.ts`, `src/app/api/projects/*`, `src/app/api/upload/route.ts`.

## Duration

~1 session (continuing from prior context compaction)
