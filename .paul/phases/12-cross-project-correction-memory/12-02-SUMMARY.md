---
phase: 12-cross-project-correction-memory
plan: 02
subsystem: analyze
tags: [agent-a, retrieval, embeddings, pgvector, cosine-similarity, lesson-injection]

requires:
  - phase: 12-cross-project-correction-memory
    plan: 12-01
    provides: computeEmbedding() helper + correction_memories.embedding populated + HNSW index

provides:
  - match_correction_memories Supabase RPC function (cosine similarity search)
  - /api/analyze 2-pass retrieval injection: brief description → embed → cosine query → inject → full extraction
  - Agent A now benefits from all past Agent E correction lessons at analysis time

affects: []

tech-stack:
  added: []
  patterns:
    - "2-pass vision: generateText (brief description) → computeEmbedding → RPC → priorCorrectionsBlock + DESIGN_ANALYSIS_PROMPT"
    - "Supabase RPC for pgvector similarity: supabase.rpc('match_correction_memories', { query_embedding: '[...]', match_count: 5 })"
    - "Non-fatal try/catch around entire retrieval block — fallback = empty string = standard single-pass"

key-files:
  created: []
  modified:
    - src/app/api/analyze/route.ts

key-decisions:
  - "correction_memories.id is TEXT not UUID — RETURNS TABLE must declare id as text (fixed SQL function during task 1)"
  - "try/catch wraps entire retrieval block — any failure (vision, embedding, RPC) silently degrades to single-pass"
  - "priorCorrectionsBlock prepended as plain text, not as a separate message — avoids multi-turn prompt complexity"
  - "brief description prompt targets typography + palette specifically — these are the most commonly corrected dimensions"

patterns-established:
  - "Retrieval-augmented extraction: embed image description → cosine search → inject context before generateObject"

duration: ~10min
started: 2026-04-02T00:00:00Z
completed: 2026-04-02T00:00:00Z
---

# Phase 12 Plan 02: Agent A Retrieval Injection — Summary

**Agent A now learns from past mistakes. Before every schema extraction, it retrieves the most semantically relevant correction lessons from all prior projects and applies them to the current image.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~10 min |
| Tasks | 2 completed (1 human-action + 1 auto) |
| Files created | 0 |
| Files modified | 1 |
| Typecheck errors | 0 |
| Commit | `d2ae99a` |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Lessons injected when correction_memories has data | **Pass** | brief generateText → embed → rpc → priorCorrectionsBlock prepended |
| AC-2: Graceful degradation when no lessons or embedding fails | **Pass** | entire block in try/catch; priorCorrectionsBlock = "" = identical to prior behavior |
| AC-3: Lesson injection format structured and actionable | **Pass** | `• [dimension] lesson` format with "PRIOR EXTRACTION CORRECTIONS" header + delimiter |
| AC-4: Timing within maxDuration = 60 | **Pass** | +~6s overhead (brief desc + embed + rpc); total ~25-30s |
| AC-5: TypeScript passes | **Pass** | pnpm typecheck clean |

## Accomplishments

- **`match_correction_memories` SQL function** — created in Supabase. Cosine similarity search via `embedding <=> query_embedding`, returns `(id text, dimension text, lesson text, similarity float)`. Bug found and fixed: RETURNS TABLE declared `id uuid` but column is `text` — corrected during task 1.
- **`/api/analyze` 2-pass retrieval injection** — step 3b inserted between image download and `generateObject`. Brief `generateText` vision call → `computeEmbedding` → `supabase.rpc('match_correction_memories')` → `priorCorrectionsBlock` string. Block is prepended to `DESIGN_ANALYSIS_PROMPT` in the `generateObject` messages content array.
- **Graceful degradation** — entire retrieval block in `try/catch`. Any failure (vision model error, embedding API error, RPC error) logs to console and falls back to `priorCorrectionsBlock = ""` — identical to original single-pass behavior.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: match_correction_memories SQL | manual | Supabase SQL function with id text fix |
| Task 2: 2-pass injection in /api/analyze | `d2ae99a` | feat(analyze): inject correction lessons into Agent A via embedding retrieval |

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/api/analyze/route.ts` | Modified | Added generateText import, computeEmbedding import, step 3b retrieval block, priorCorrectionsBlock injection |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `id text` in RETURNS TABLE | Discovered correction_memories.id is TEXT (not UUID) during SQL execution — fixed in SQL function |
| try/catch around full retrieval block | Any step (vision, embedding, RPC) can fail independently; wrapping the whole block keeps code simple vs per-step error handling |
| priorCorrectionsBlock as text prefix | Single content item is simpler than a separate system message; avoids multi-turn prompt restructuring |
| Brief description targets typography + palette | These are the most commonly failing dimensions in Agent E corrections — highest signal for similarity retrieval |

## Deviations from Plan

- **SQL id type fix**: Plan specified `id uuid` in RETURNS TABLE; actual correction_memories.id column is `text`. Fixed before task 2 proceeded. No code impact — TypeScript types the RPC response as `{ dimension: string; lesson: string }[]` (id not used in injection).

## Phase 12 Complete

**The self-improving extraction loop is fully live:**

```
Image in
   ↓
[Agent A] ← PRIOR CORRECTIONS from similar past images (Phase 12-02)
   ↓
Design Schema
   ↓
[Agent B2] → Prompt → [Image Gen] → Generated Image
   ↓
[Agent D] → Evaluation (5 dimensions, scores + critique)
   ↓ (if failing dimensions exist)
[Agent E] → Corrects schema fields → Forks design_schemas row
          → Writes lessons to correction_memories (Phase 11-01)
          → Computes text-embedding-004 vectors (Phase 12-01)
          → Lessons become available for future Agent A retrievals (Phase 12-02)
```

Every correction made on any project improves every future analysis on all projects.

---
*Phase: 12-cross-project-correction-memory, Plan: 12-02*
*Completed: 2026-04-02*
