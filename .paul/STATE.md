# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-28)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Phase 2 — Agent A: Design Schema Extraction

## Current Position

Milestone: v0.1 — Local Pipeline MVP
Phase: 2 of 8 (Agent A — Design Schema Extraction) — Not started
Plan: Not started
Status: Ready to plan Phase 2
Last activity: 2026-03-28 — Phase 1 complete, transitioned to Phase 2

Progress:
- Milestone: [███░░░░░░░] 12%
- Phase 1:   [██████████] 100% ✅

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○                       [Ready for next PLAN]
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
Stopped at: Phase 1 complete — transitioned to Phase 2
Next action: Run /paul:plan for Phase 2 (Agent A — Design Schema Extraction)
Resume context: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
