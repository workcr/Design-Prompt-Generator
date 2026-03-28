---
phase: 01-foundation
plan: 03
subsystem: api, ui
tags: [file-upload, dashboard, workspace-shell, nextjs, shadcn, react, tabs]

requires:
  - phase: 01-02
    provides: /api/projects CRUD, Project type, getDb() singleton

provides:
  - POST /api/upload — validated image upload (image/*, ≤10MB) → uploads/ filesystem
  - Live project dashboard at / — create, open, delete projects
  - Workspace shell at /projects/[id] — 4-tab scaffold for Phases 2–6

affects: [02-agent-a, 03-agent-b1, 04-prompt-editor, 05-agent-b2, 06-image-gen]

tech-stack:
  added: []
  patterns:
    - File upload via Next.js native request.formData() — no multipart library needed
    - UUID-based filenames for uploads — prevents path traversal
    - Dashboard as client component (fetch + state); workspace as server component (getDb() direct)
    - Link + buttonVariants() for styled anchor buttons — @base-ui/react Button has no asChild

key-files:
  created:
    - src/app/api/upload/route.ts
    - src/app/projects/[id]/page.tsx
  modified:
    - src/app/page.tsx (placeholder → live dashboard)
    - next.config.ts (allowedDevOrigins for network dev access)

key-decisions:
  - "allowedDevOrigins: Next.js 16 blocks cross-origin dev resources by default — added 192.168.4.192 to allow network IP access during development"
  - "Link + buttonVariants() instead of Button asChild: @base-ui/react ButtonPrimitive has no asChild prop — use Link with CVA classes directly"
  - "Workspace is a server component: calls getDb() directly rather than fetching /api/projects/[id] — avoids unnecessary HTTP round-trip for server-rendered page"
  - "UUID filenames for uploads: never trust client-supplied filenames — randomUUID().ext prevents path traversal and collisions"

patterns-established:
  - "Server components call getDb() directly — only client components fetch via API routes"
  - "Styled links: Link + buttonVariants({size, variant}) for anchor elements that need button appearance"
  - "Upload path is uploads/{uuid}.ext — relative filesystem path returned; Phase 2 reads from filesystem server-side"

duration: ~35min
started: 2026-03-28T00:00:00Z
completed: 2026-03-28T00:00:00Z
---

# Phase 1 Plan 03: File Upload + Dashboard UI Summary

**POST /api/upload with image validation, live project dashboard at /, and workspace shell at /projects/[id] with 4-tab navigation — Phase 1 foundation complete.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35 min |
| Tasks | 3 completed + 1 checkpoint approved |
| Files created | 2 |
| Files modified | 2 |
| Deviations auto-fixed | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Upload accepts valid images | Pass | POST /api/upload saves image/* ≤10MB to uploads/, returns { filename, path, size, type } |
| AC-2: Upload rejects invalid files | Pass | 400 for non-image or no file; 413 for >10MB |
| AC-3: Dashboard lists and manages projects | Pass | Create (inline form), Open (link), Delete (confirm + remove) — all live |
| AC-4: Workspace shell loads with tab navigation | Pass | Server component, 4 tabs, redirect("/") on invalid ID |
| AC-5: TypeScript strict mode passes | Pass | pnpm typecheck — zero errors |

## Accomplishments

- File upload endpoint validates type and size without external libraries — uses Next.js native `request.formData()` and Node.js `fs`
- Dashboard is a fully functional client component: fetch on mount, optimistic list updates on create/delete, error and empty states
- Workspace shell is a server component calling `getDb()` directly — no API round-trip for the initial page render; Phase 2 can start adding content immediately
- Phase 1 is complete — the full foundation is in place for all downstream phases

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Tasks 1–3 + next.config.ts fix (batched) | `8a87174` | feat(01-03): file upload + dashboard UI + workspace shell |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/api/upload/route.ts` | Created | POST handler — validates image/*, ≤10MB, saves to uploads/{uuid}.ext |
| `src/app/projects/[id]/page.tsx` | Created | Server component workspace shell — 4 tabs, project header, redirect on 404 |
| `src/app/page.tsx` | Modified | Replaced placeholder with live dashboard (client component) |
| `next.config.ts` | Modified | Added `allowedDevOrigins: ["192.168.4.192"]` for network dev access |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `allowedDevOrigins: ["192.168.4.192"]` | Next.js 16 blocks /_next/* dev resources from non-localhost origins by default; JS bundle fails to load and React doesn't hydrate | Dev server now accessible from network IP (phone, tablet, other machines on LAN) |
| `Link + buttonVariants()` for "Open" button | `@base-ui/react` Button has no `asChild` prop — cannot render as anchor; use CVA classes on Link directly | Pattern for all future "button-styled links" in this codebase |
| Workspace as server component | `getDb()` can be called directly in server components; no need for an API fetch round-trip just to load the project name and status | Phase 2 can extend the workspace page with server-side data without adding client complexity |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential fixes, no scope creep |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** Two auto-fixed issues, one discovered in implementation and one discovered at checkpoint. Plan executed as specified.

### Auto-fixed Issues

**1. Button `asChild` not supported by @base-ui/react**
- **Found during:** Task 2 (Dashboard) — typecheck
- **Issue:** `<Button asChild>` pattern requires Radix-style slot composition; `@base-ui/react` ButtonPrimitive has no `asChild` prop — TypeScript error TS2322
- **Fix:** Replaced `<Button asChild><Link>Open</Link></Button>` with `<Link className={cn(buttonVariants({ size: "sm" }))}>`
- **Verification:** `pnpm typecheck` zero errors

**2. Next.js 16 cross-origin dev resource blocking**
- **Found during:** Checkpoint human-verify
- **Issue:** Dashboard accessed via network IP (192.168.4.192) — Next.js 16 blocks `/_next/*` dev resources from non-localhost origins by default; React bundle fails to load, page stays in server-rendered loading state, clicks not responding
- **Fix:** Added `allowedDevOrigins: ["192.168.4.192"]` to `next.config.ts` + dev server restart
- **Verification:** Checkpoint approved after fix — dashboard, project creation, workspace navigation all confirmed working

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `pnpm dev` uses port 3001 (3000 taken) | Normal dev behaviour — no action needed |
| Cross-origin HMR warning triggered React hydration failure | Added allowedDevOrigins to next.config.ts |

## Next Phase Readiness

**Ready:**
- `/api/upload` endpoint live — Phase 2 can POST images immediately; files land in `uploads/{uuid}.ext`
- Workspace shell at `/projects/[id]` is the scaffold for every downstream agent phase — "Analyze" tab (Phase 2), "Blueprint" tab (Phase 3), etc.
- Dashboard is live — projects can be created and managed before Phase 2 lands
- `getDb()` pattern established for server components — Phase 2 can read/write DesignSchema rows without touching the API layer

**Concerns:**
- `uploads/` has no size cap at the directory level — a future phase should consider cleanup or limits, but not urgent for local dev
- `allowedDevOrigins` is hardcoded to `192.168.4.192` — other team members or devices on different IPs will need to update this, or use `localhost`

**Blockers:** None

---
*Phase: 01-foundation, Plan: 03*
*Completed: 2026-03-28*
