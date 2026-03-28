# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-28)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Phase 1 Plan 03 — File Upload + Dashboard UI

## Current Position

Milestone: v0.1 — Local Pipeline MVP
Phase: 1 of 8 (Foundation) — In Progress
Plan: 01-02 complete (2 of 3) — ready for 01-03
Status: Loop closed — ready for next PLAN
Last activity: 2026-03-28 — Unified 01-02 (Data Layer + Project API)

Progress:
- Milestone: [██░░░░░░░░] 8%
- Phase 1:   [██████░░░░] 67%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop closed — ready for next PLAN]
```

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Zod v4: `.default()` before `.transform()` | 01-01 | Pattern for all future transformed env vars |
| Next.js 16 + Tailwind v4 | 01-01 | All future phases target these versions |
| `!.env.example` gitignore exception | 01-01 | All env changes documented in .env.example first |
| `pnpm.onlyBuiltDependencies` for native addons | 01-02 | Non-interactive way to allow native builds (better-sqlite3) |
| JSON fields as TEXT in db.ts | 01-02 | Serialization belongs to API layer, not transport layer |
| Next.js 16 params are `Promise<{id}>` | 01-02 | All dynamic route handlers must `await params` |

Decisions imported from PLANNING.md at init:

| Decision | Impact |
|----------|--------|
| Vercel AI SDK | Single interface for Ollama/Gemini/OpenAI — swap via env var |
| Nano Banana 2 primary + Replicate fallback | IMAGE_GEN_PROVIDER env flag controls swap |
| SQLite local → Supabase prod | Same queries both envs; no migration complexity |
| Prompt export panel (clipboard) | Freepik/Midjourney/Higgsfield don't expose write APIs |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| cogvlm2:10b vs qwen3-vl:30b benchmark | PLANNING.md | S | Phase 2 |
| Blueprint granularity (3/5/10 prompts) | PLANNING.md | S | Phase 3 |
| Full pipeline cost estimate (<$0.20 target) | PLANNING.md | S | Phase 8 |
| Platform prompt format syntax (MJ v7, Freepik, Higgsfield) | PLANNING.md | S | Phase 5 |

### Blockers/Concerns
None yet.

## Session Continuity

Last session: 2026-03-28
Stopped at: Plan 01-02 unified — loop closed
Next action: Run /paul:plan for Plan 01-03 (File Upload + Dashboard UI)
Resume context: .paul/phases/01-foundation/01-02-SUMMARY.md

---
*STATE.md — Updated after every significant action*
