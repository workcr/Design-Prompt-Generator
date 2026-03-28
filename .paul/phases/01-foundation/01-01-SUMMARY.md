---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [nextjs, typescript, tailwind, shadcn, zod, env-config, scaffold]

requires: []
provides:
  - Next.js 16 app with TypeScript strict mode and Tailwind v4
  - 12 shadcn/ui components for workspace UI
  - src/lib/env.ts — typed, validated env config with LOCAL_MODE provider switching
  - .env.example — full variable reference for all providers

affects: [02-agent-a, 03-agent-b1, 04-prompt-editor, 05-agent-b2, 06-image-gen]

tech-stack:
  added:
    - next@16.2.1
    - react@19.2.4
    - typescript@5 (strict + noUncheckedIndexedAccess)
    - tailwindcss@4 + @tailwindcss/postcss
    - shadcn/ui (button, card, badge, input, textarea, tabs, separator, tooltip, dropdown-menu, label, scroll-area)
    - zod@4.3.6
    - class-variance-authority, clsx, tailwind-merge, lucide-react
  patterns:
    - All env vars accessed via src/lib/env.ts (never process.env directly)
    - LOCAL_MODE=true → Ollama + Replicate; LOCAL_MODE=false → Gemini + GPT-4o mini + Nano Banana 2
    - IMAGE_GEN_PROVIDER env flag overrides provider regardless of mode

key-files:
  created:
    - src/lib/env.ts
    - src/lib/utils.ts
    - src/components/ui/*.tsx (12 components)
    - components.json
    - .env.example
  modified:
    - package.json (name, typecheck script)
    - tsconfig.json (noUncheckedIndexedAccess)
    - next.config.ts (reactStrictMode)
    - .gitignore (data/, uploads/, .env.example exception)
    - src/app/layout.tsx (TooltipProvider, metadata)
    - src/app/page.tsx (placeholder)

key-decisions:
  - "Zod v4 default-before-transform: .string().default('true').transform(v => v === 'true')"
  - "Next.js 16 + Tailwind v4 used (latest available at scaffold time)"
  - ".env.example excluded from .env* gitignore pattern via !.env.example"

patterns-established:
  - "Import env helpers from @/lib/env — never read process.env directly in app code"
  - "shadcn components live in src/components/ui/ — add more per-phase as needed"
  - "TooltipProvider wraps the entire app in layout.tsx"

duration: ~45min
started: 2026-03-28T00:00:00Z
completed: 2026-03-28T00:00:00Z
---

# Phase 1 Plan 01: Scaffold + Env Config Summary

**Next.js 16 + TypeScript strict mode scaffolded with Tailwind v4, 12 shadcn/ui components, and a typed Zod env config system with single-var LOCAL_MODE provider switching.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Tasks | 3 completed + 1 checkpoint approved |
| Files modified | 22 |
| Deviations auto-fixed | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Dev server runs | Pass | `pnpm dev` serves at localhost:3000, no errors |
| AC-2: shadcn/ui components available | Pass | 12 components importable from `@/components/ui/*` |
| AC-3: Env config resolves correctly | Pass | LOCAL_MODE=true → Replicate; LOCAL_MODE=false → nano_banana_2 |
| AC-4: TypeScript strict mode passes | Pass | `pnpm typecheck` returns zero errors |

## Accomplishments

- Next.js 16 app scaffolded with TypeScript strict + `noUncheckedIndexedAccess` at the repo root
- shadcn/ui initialized (Tailwind v4 compatible) with all 12 workspace-critical components
- `src/lib/env.ts` provides `env`, `isLocalMode()`, `getImageGenProvider()`, `getVisionModel()`, `getTextModel()` — single source of truth for all provider resolution
- `.env.example` documents all 11 env vars across mode, Ollama, cloud AI, image gen, and Supabase

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| All tasks (batched) | `90496f3` | Apply Plan 01-01: Scaffold + Env Config |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/env.ts` | Created | Typed Zod env config — LOCAL_MODE provider resolution |
| `src/components/ui/*.tsx` (12 files) | Created | Core UI primitives for workspace |
| `src/lib/utils.ts` | Created | shadcn `cn()` utility |
| `components.json` | Created | shadcn/ui configuration |
| `.env.example` | Created | Full variable reference for all providers |
| `package.json` | Modified | Name fixed to `design-prompt-generator`; `typecheck` script added |
| `tsconfig.json` | Modified | Added `noUncheckedIndexedAccess: true` |
| `next.config.ts` | Modified | Added `reactStrictMode: true` |
| `.gitignore` | Modified | Added `data/`, `uploads/`; added `!.env.example` exception |
| `src/app/layout.tsx` | Modified | TooltipProvider wrapper; updated metadata title/description |
| `src/app/page.tsx` | Modified | Replaced boilerplate with minimal placeholder |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Zod v4 `.default()` before `.transform()` | Zod v4 requires default applied on the raw string before transform; `"true"` default → `true` boolean | Pattern to follow for all future transformed env vars |
| Next.js 16 + Tailwind v4 | Latest stable versions available at scaffold time; no functional difference from plan spec | All future phases should target these versions |
| `!.env.example` gitignore exception | `.env*` would block `.env.example`; example file must be committed as documentation | All env changes go to `.env.example` first |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential fixes, no scope creep |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** Two minor auto-fixed issues. Plan executed as specified.

### Auto-fixed Issues

**1. Zod v4 transform/default ordering**
- **Found during:** Task 3 (Env Config)
- **Issue:** `z.string().transform(...).default("true")` fails in Zod v4 — default must match the transformed output type (`boolean`), not the raw input type
- **Fix:** Reordered to `.string().default("true").transform(v => v === "true")` — default applied before transform
- **Verification:** `pnpm typecheck` passes with zero errors

**2. README.md overwritten by scaffold rsync**
- **Found during:** Task 1 file move
- **Issue:** `rsync` from `scaffold-temp/` overwrote the synthesized README.md with Next.js boilerplate
- **Fix:** Restored from `git checkout HEAD -- README.md`
- **Verification:** README.md matches the graduated project brief

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `create-next-app` rejects capital letters in directory name | Scaffolded to `scaffold-temp/` subdir, then rsync'd to repo root |
| `.env.example` blocked by `.env*` gitignore pattern | Added `!.env.example` exception to `.gitignore` |

## Next Phase Readiness

**Ready:**
- Dev server (`pnpm dev`) runs cleanly at localhost:3000
- TypeScript strict mode enforced — all future code must pass `pnpm typecheck`
- All 12 UI components available for Plans 01-02 and 01-03
- `src/lib/env.ts` is the single source of truth for model/provider resolution — import pattern established
- `.env.local` created locally with `LOCAL_MODE=true`

**Concerns:**
- `node_modules/` is large (~350 packages) — normal for Next.js, no action needed
- Tailwind v4 uses CSS-based config (no `tailwind.config.ts`) — future phases should configure in `globals.css`

**Blockers:** None

---
*Phase: 01-foundation, Plan: 01*
*Completed: 2026-03-28*
