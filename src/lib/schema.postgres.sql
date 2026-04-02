-- Design Prompt Generator — PostgreSQL Schema (Supabase)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run: all statements use IF NOT EXISTS

CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_schemas (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  frame           TEXT,
  palette         TEXT,
  layout          TEXT,
  text_fields     TEXT,
  type_scale      TEXT,
  elements        TEXT,
  style_checksum  TEXT,
  locked_fields   TEXT NOT NULL DEFAULT '[]',
  raw_analysis    TEXT,
  reference_image TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grammar_blueprints (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id        TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name              TEXT,
  sequence_pattern  TEXT,
  density           TEXT,
  avg_length        INTEGER,
  compression_style TEXT,
  raw_prompts       TEXT,
  distilled_grammar TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompt_outputs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  schema_snapshot TEXT,
  blueprint_id    TEXT REFERENCES grammar_blueprints(id) ON DELETE SET NULL,
  final_prompt    TEXT,
  model_used      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_images (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prompt_output_id TEXT NOT NULL REFERENCES prompt_outputs(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_job_id  TEXT,
  model            TEXT,
  url              TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prompt_output_id    TEXT NOT NULL REFERENCES prompt_outputs(id) ON DELETE CASCADE,
  generated_image_id  TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
  project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reference_image     TEXT,
  generated_image_url TEXT,
  scores              JSONB,
  critique            TEXT,
  iteration           INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_schemas_project_id     ON design_schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_grammar_blueprints_project_id ON grammar_blueprints(project_id);
CREATE INDEX IF NOT EXISTS idx_prompt_outputs_project_id     ON prompt_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_output_id    ON generated_images(prompt_output_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_output_id   ON evaluation_scores(prompt_output_id);

-- ─── Phase 11: Correction Memories (Phase 12 feed table) ─────────────────────

-- Enable pgvector extension (required for Phase 12 embedding retrieval)
-- Safe to run even if already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Agent E lessons: populated by Phase 11, embedded by Phase 12
-- embedding column is NULL until Phase 12 computes text-embedding-004 (768 dims)
CREATE TABLE IF NOT EXISTS correction_memories (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id           TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  evaluation_score_id  TEXT REFERENCES evaluation_scores(id) ON DELETE SET NULL,
  dimension            TEXT NOT NULL,       -- 'typography' | 'composition' | 'palette' | 'layout' | 'elements'
  lesson               TEXT NOT NULL,       -- transferable text; Phase 12 embeds this field
  bad_value            JSONB,               -- what was extracted (incorrect) — for debugging
  correct_value        JSONB,               -- what Agent E determined (correct) — for debugging
  embedding            vector(768),         -- NULL until Phase 12 computes it
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correction_memories_project_id ON correction_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_correction_memories_dimension  ON correction_memories(dimension);
-- Phase 12 will add:
-- CREATE INDEX ON correction_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
