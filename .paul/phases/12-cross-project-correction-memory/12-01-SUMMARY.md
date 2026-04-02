---
phase: 12-cross-project-correction-memory
plan: 01
subsystem: embeddings
tags: [embeddings, pgvector, hnsw, text-embedding-004, correction-memories]

requires:
  - phase: 11-schema-corrective-refinement
    plan: 11-01
    provides: correction_memories table + Agent E lesson insertion in /api/refine

provides:
  - computeEmbedding() helper in src/lib/embeddings.ts
  - /api/refine now computes + stores 768-dim embeddings after every Agent E correction
  - HNSW index on correction_memories(embedding vector_cosine_ops) in Supabase

affects: [phase-12-02-agent-a-injection]

tech-stack:
  added: []
  patterns:
    - "Direct REST for text-embedding-004 (no AI SDK): same pattern as Gemini image gen"
    - "Promise.allSettled for parallel non-fatal async jobs — awaited to prevent serverless termination"
    - "pgvector string format: `[f1,f2,...]` string (not raw JS array) for PostgREST UPDATE"

key-files:
  created:
    - src/lib/embeddings.ts
  modified:
    - src/app/api/refine/route.ts

key-decisions:
  - "GOOGLE_GENERATIVE_AI_API_KEY reused — no new env var needed for text-embedding-004"
  - "HNSW over IVFFlat: HNSW builds incrementally on empty tables; IVFFlat requires training data (minimum rows)"
  - "Promise.allSettled awaited (not void): Vercel serverless must stay open until UPDATEs complete"
  - "embedding passed as `[f1,f2,...]` string: PostgREST expects this format for vector column UPDATEs"
  - "computeEmbedding returns null on any error: embedding failure never aborts the refine cycle"

patterns-established:
  - "Non-fatal parallel async: Promise.allSettled + await — absorbs individual failures, keeps function alive"

duration: ~10min
started: 2026-04-02T00:00:00Z
completed: 2026-04-02T00:00:00Z
---

# Phase 12 Plan 01: Embedding Compute + Storage — Summary

**Wired text-embedding-004 embedding computation into /api/refine — each Agent E lesson now gets a 768-dim vector stored immediately after insert. HNSW index created in Supabase for cosine similarity queries in Plan 12-02.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~10 min |
| Tasks | 2 completed (1 auto + 1 human-action) |
| Files created | 1 |
| Files modified | 1 |
| Typecheck errors | 0 |
| Commit | `e465805` |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Embeddings computed + stored after Agent E | **Pass** | Insert → .select("id,lesson") → Promise.allSettled UPDATE with `[f1,f2,...]` vector |
| AC-2: Non-fatal — embedding failure doesn't abort refine | **Pass** | computeEmbedding returns null on any error; Promise.allSettled absorbs per-row failures |
| AC-3: Fast path unaffected | **Pass** | Embedding block is inside `if (correction.lessons.length > 0)` guard |
| AC-4: HNSW index created in Supabase | **Pass** | correction_memories_embedding_idx USING hnsw (embedding vector_cosine_ops) m=16 ef=64 |
| AC-5: TypeScript passes | **Pass** | pnpm typecheck clean — caught GEMINI_API_KEY → GOOGLE_GENERATIVE_AI_API_KEY fix |

## Accomplishments

- **`src/lib/embeddings.ts`** — `computeEmbedding(text): Promise<number[] | null>` via direct REST to `text-embedding-004`. Same pattern as Gemini image gen (no AI SDK, reuses `GOOGLE_GENERATIVE_AI_API_KEY`).
- **`/api/refine` section 6e** — correction_memories insert now uses `.select("id, lesson")` to capture IDs; followed by `Promise.allSettled` embedding loop with `UPDATE` per row. Awaited — no fire-and-forget.
- **Type fix found**: env.ts uses `GOOGLE_GENERATIVE_AI_API_KEY` not `GEMINI_API_KEY`. Fixed during typecheck. Added to STATE.md decisions.
- **HNSW index live** in Supabase — cosine similarity queries (`embedding <=> $vector`) now index-backed for Plan 12-02.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: computeEmbedding + refine rewire | `e465805` | feat(embeddings): compute text-embedding-004 vectors after Agent E corrections |
| Task 2: HNSW index | manual | Supabase SQL: correction_memories_embedding_idx USING hnsw |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/embeddings.ts` | Created | computeEmbedding() helper — direct REST, null-safe, reusable |
| `src/app/api/refine/route.ts` | Modified | Section 6e: .select() + Promise.allSettled embedding loop |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| HNSW over IVFFlat | HNSW is incremental — no minimum row count needed; IVFFlat requires training data |
| `Promise.allSettled` awaited | Vercel serverless terminates after response; must await or UPDATEs won't complete |
| `[f1,f2,...]` string format | PostgREST requires vector as string, not raw JS array, for UPDATE via Supabase JS client |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Discovered during typecheck — env.ts uses this name, not GEMINI_API_KEY |

## Deviations from Plan

- **Env var name fix**: Plan referred to `GEMINI_API_KEY` in comments; actual key is `GOOGLE_GENERATIVE_AI_API_KEY`. Caught by typecheck, corrected before commit.

## Next Phase Readiness

**Ready:**
- Every future Agent E correction cycle now populates `correction_memories.embedding`
- HNSW index ready for `embedding <=> $vector` cosine similarity queries
- Plan 12-02 can retrieve top-K lessons by embedding similarity at Agent A analysis time

**Concerns:**
- Plan 12-02 needs a query vector at analyze time. Approach: brief first-pass vision call to get `style_summary` text → embed → retrieve → full analysis with injected lessons. Adds ~2s for embedding + ~1s for DB query.

**Blockers:**
- None

---
*Phase: 12-cross-project-correction-memory, Plan: 12-01*
*Completed: 2026-04-02*
