# Design Prompt Generator

> An AI-powered visual prompt operating system that converts an image into editable design logic, learns the writing grammar of a target prompt family, and combines both into a high-quality image-generation prompt.

**Type:** Application
**Stack:** Next.js 15 + TypeScript + SQLite → Supabase + Vercel AI SDK + Tailwind + shadcn/ui
**Skill Loadout:** GSD · ui-ux-pro-max · /paul:audit
**Quality Gates:** TypeScript strict · Zod agent output validation · Schema integrity · Prompt coherence · Provider swap verification

---

## Overview

Prompt quality for image generation depends on two things that are almost always conflated: the **visual logic of an image** (composition, palette, layout, type scale, element hierarchy) and the **writing grammar of strong prompts** (how ideas are sequenced, compressed, and expressed). This system separates those two layers, handles them independently, and only combines them at the final step.

**Who it's for:** Solo use (dogfooding), with a path to a hosted web product.
**Why build vs buy:** No existing tool separates design-logic extraction from prompt-grammar learning. Tools either describe images or remix prompts — none treat them as orthogonal concerns.

---

## The Pipeline

```
INPUT
  ├── Upload: Reference image       → Agent A   → Design Schema (structured, editable)
  └── Input: Reference prompt list  → Agent B1  → Grammar Blueprint (reusable)

EDITOR
  └── Structured Prompt Editor
        ├── Edit: text, colors, layout, image slots, typographic scale
        └── Lock: style-critical fields to preserve coherence

OUTPUT
  └── Agent B2 (Schema + Blueprint) → Final Prompt ──┬── Nano Banana 2 (primary) → Output Image
                                                      ├── Replicate (fallback)     → Output Image
                                                      └── Copy → Freepik / Higgsfield AI / Midjourney
```

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend + Backend | Next.js 15 (App Router) + TypeScript | Local-first → Vercel; API routes handle agent streaming |
| AI Orchestration | Vercel AI SDK | Unified interface for OpenAI, Google, Anthropic, Ollama — swap via env var |
| Vision (local) | Ollama — `qwen3-vl:30b` | Already installed; free for dev |
| Vision (production) | Gemini 1.5 Flash | Cheap, fast, strong for structured extraction |
| Text (production) | GPT-4o mini | Cost-effective for B1/B2 grammar tasks |
| Image Gen (primary) | Nano Banana 2 — `gemini-3.1-flash-image-preview` | Same Google API key; 4K output, ~$0.067/1024px |
| Image Gen (fallback) | Replicate — Flux.1-dev | Provider-swappable via `IMAGE_GEN_PROVIDER` env flag |
| UI | Tailwind CSS + shadcn/ui | Structured editor primitives out of the box |
| Storage (local) | SQLite via `better-sqlite3` | Zero-config, file-based |
| Storage (production) | Supabase | Drop-in swap + auth + file storage |
| Package Manager | pnpm | Fast, monorepo-ready |

### Provider Switching

```
LOCAL_MODE=true   → Ollama for agents · Replicate for image gen
LOCAL_MODE=false  → Gemini Flash (A) + GPT-4o mini (B1/B2) + Nano Banana 2 (image gen)
IMAGE_GEN_PROVIDER=replicate  → override to Replicate at any time
```

---

## Data Model

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| `Project` | id, name, created_at, status | has one DesignSchema, one GrammarBlueprint, many PromptOutputs |
| `DesignSchema` | id, project_id, frame, palette, layout, text_fields, type_scale, elements, style_checksum, locked_fields | belongs to Project; user-editable |
| `GrammarBlueprint` | id, project_id, sequence_pattern, density, avg_length, compression_style, raw_prompts | belongs to Project; reusable across projects |
| `PromptOutput` | id, project_id, schema_snapshot, blueprint_id, final_prompt, model_used | belongs to Project |
| `GeneratedImage` | id, prompt_output_id, provider, provider_job_id, model, url, status | belongs to PromptOutput |

---

## API Surface

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects` | GET, POST | List / create projects |
| `/api/projects/[id]` | GET, PATCH, DELETE | Project detail |
| `/api/analyze` | POST | Agent A — image → DesignSchema (streaming) |
| `/api/distill` | POST | Agent B1 — prompts → GrammarBlueprint (streaming) |
| `/api/rewrite` | POST | Agent B2 — schema + blueprint → final prompt (streaming) |
| `/api/generate` | POST | Nano Banana 2 or Replicate → image |
| `/api/schemas/[id]` | GET, PATCH | Edit / lock schema fields |
| `/api/blueprints` | GET, POST, GET[id] | Blueprint CRUD + library |

All agent routes stream via Vercel AI SDK SSE.

---

## Key Views

| View | Purpose |
|------|---------|
| `/` — Dashboard | Project list, create new |
| `/projects/[id]` — Workspace | Main pipeline canvas |
| `→ Analyze` | Upload image → run Agent A → view/edit schema |
| `→ Grammar` | Input reference prompts → run Agent B1 → view blueprint |
| `→ Editor` | Structured Prompt Editor — edit fields, lock style |
| `→ Rewrite` | Run Agent B2 → final prompt + Export Panel (Midjourney / Freepik / Higgsfield / plain) |
| `→ Generate` | Nano Banana 2 or Replicate → output + side-by-side compare |
| `/blueprints` | Grammar Blueprint library |

Desktop-first. Mobile out of scope for MVP.

---

## Implementation Phases

| Phase | Name | Outcome |
|-------|------|---------|
| 1 | Foundation | Project workspace with file upload — the shell everything plugs into |
| 2 | Agent A | System reverse-engineers an image into an editable design schema |
| 3 | Agent B1 | System learns how a prompt family writes, independently of subject matter |
| 4 | Structured Prompt Editor | Users safely customize design logic without breaking coherence |
| 5 | Agent B2 + Export Panel | Schema + blueprint → final prompt, copyable for any platform |
| 6 | Image Generation | Full pipeline: image in → image out, provider-swappable |
| 7 | Polish + Local-First UX | Daily-usable tool with history, export, and onboarding |
| 8 | Production Deploy | Vercel + Supabase + auth — publicly accessible hosted version |

---

## Design Decisions

1. **Vercel AI SDK** — unified provider interface; local/prod swap is one env var
2. **SQLite local → Supabase production** — same query patterns, zero migration complexity
3. **Gemini 1.5 Flash for Agent A** — cheaper than GPT-4V, strong structured extraction
4. **GrammarBlueprint as reusable entity** — one blueprint serves many projects; users build a style library
5. **Streaming for all agent routes** — progressive feedback via SSE; simplest pattern with Vercel AI SDK
6. **Desktop-first UI** — editor workspace requires horizontal space; mobile deferred
7. **No auth in local mode** — friction removed during dev; added only at Phase 8
8. **Nano Banana 2 as primary image gen** — reuses Google API key; 4K output; #1 on image arena at launch
9. **Replicate as fallback** — provider-swappable via env flag; no code changes needed
10. **Prompt export panel over API integrations** — Freepik/Higgsfield/Midjourney don't expose write APIs; clipboard is the correct abstraction

---

## Open Questions

1. Nano Banana 2 vs Replicate Flux.1-dev quality for design-system-derived prompts — benchmark Phase 6
2. `cogvlm2:10b` vs `qwen3-vl:30b` sufficiency for Agent A — benchmark Phase 2
3. Grammar blueprint granularity — test with 3 / 5 / 10 reference prompts
4. Schema complexity ceiling for complex images (photo vs flat vs 3D)
5. Full pipeline cost target: under $0.20/run — verify before Phase 8
6. Platform prompt formatting rules (Midjourney v7, Freepik, Higgsfield) — confirm before Phase 5

---

## Local Dev Setup

```bash
git clone https://github.com/workcr/Design-Prompt-Generator
cd Design-Prompt-Generator
pnpm install
cp .env.example .env.local   # set LOCAL_MODE=true + OLLAMA_BASE_URL
pnpm dev
```

Requires Ollama running locally with `qwen3-vl:30b` pulled.

---

## References

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Vercel AI SDK — Google Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai)
- [Nano Banana 2 — Google AI for Developers](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini 3.1 Flash Image Preview](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview)
- [Replicate API Docs](https://replicate.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
