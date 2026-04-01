---
phase: 08-production-deploy
plan: 03
status: complete
completed: 2026-03-31
---

# Plan 08-03 — Storage Migration + First Vercel Deploy: Summary

## What was built

All image I/O migrated from the local `uploads/` filesystem to Supabase Storage.
App deployed to Vercel and verified working end-to-end on the production URL.

### Files changed
| File | Change |
|------|--------|
| `src/app/api/upload/route.ts` | Writes uploaded images to Supabase Storage bucket "uploads"; returns public CDN URL |
| `src/app/api/uploads/[filename]/route.ts` | 302 redirect to Supabase Storage public URL (no fs read) |
| `src/app/api/analyze/route.ts` | Downloads image buffer from Supabase Storage; adds `maxDuration = 60` |
| `src/app/api/generate/route.ts` | Uploads generated images to Supabase Storage; stores CDN URL; adds `maxDuration = 60` |
| `src/app/api/rewrite/route.ts` | Adds `maxDuration = 60` |
| `src/app/api/distill/route.ts` | Adds `maxDuration = 60` |
| `src/lib/env.ts` | Vision model upgraded: `gemini-1.5-flash` → `gemini-2.5-flash` |

## Acceptance criteria

- [x] AC-1: Supabase Storage bucket "uploads" (public) created
- [x] AC-2: Upload route writes to Supabase Storage — no fs imports
- [x] AC-3: Image serving redirects to Supabase CDN
- [x] AC-4: Analyze downloads buffer from Supabase Storage
- [x] AC-5: Generate writes image to Supabase Storage
- [x] AC-6: `pnpm typecheck && pnpm build` exit 0
- [x] AC-7: Vercel production deploy succeeds
- [x] AC-8: Smoke test passes — full flow works on production URL

## Issues encountered and resolved

### 1. Vercel 10s function timeout
- **Symptom:** `/api/analyze` returned 500 within ~8 seconds
- **Root cause:** Vercel Hobby plan defaults to 10s per function; Gemini vision analysis exceeds this
- **Fix:** Added `export const maxDuration = 60` to `analyze`, `distill`, `rewrite`, `generate`

### 2. Gemini model deprecations
- **Symptom:** `gemini-1.5-flash` → "not found for API version v1beta"
- **Attempted:** `gemini-2.0-flash` → "no longer available to new users"
- **Attempted:** `gemini-2.5-flash-preview-04-17` → "not found for API version v1beta"
- **Root cause:** Google deprecated 1.5/2.0 models for new API users; preview date suffix was wrong
- **Fix:** Called `GET /v1beta/models` with the actual API key → confirmed `gemini-2.5-flash` is the correct stable ID

### 3. All env vars confirmed set in Vercel
`LOCAL_MODE`, `IMAGE_GEN_PROVIDER`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`,
`REPLICATE_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` — all present.

## Decisions recorded

| Decision | Impact |
|----------|--------|
| `maxDuration = 60` on all AI routes | Required for Vercel Hobby; Gemini/OpenAI calls exceed 10s default |
| `gemini-2.5-flash` as vision model | Verified via ListModels API; 1.5/2.0 deprecated for new users |
| Supabase Storage public bucket | No RLS needed for reads; service role key protects writes |
| Supabase CDN URL stored in `generated_images.url` | Direct CDN URL, no proxy hop through `/api/uploads/` |
