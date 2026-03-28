# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-28)

**Core value:** Convert any image into a fully controllable, style-aware image-gen prompt — without losing structural design logic or writing quality
**Current focus:** Project initialized — ready for Phase 1 planning

## Current Position

Milestone: v0.1 — Local Pipeline MVP
Phase: 1 of 8 (Foundation) — Planning
Plan: 01-01 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-03-28 — Created .paul/phases/01-foundation/01-01-PLAN.md

Progress:
- Milestone: [░░░░░░░░░░] 0%
- Phase 1:   [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan created, awaiting approval]
```

## Accumulated Context

### Decisions

All key decisions imported from PLANNING.md at init:

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
Stopped at: Plan 01-01 created (Scaffold + Env Config)
Next action: Review 01-01-PLAN.md → approve → run /paul:apply
Resume context: .paul/phases/01-foundation/01-01-PLAN.md — 3 tasks + human-verify checkpoint

---
*STATE.md — Updated after every significant action*
