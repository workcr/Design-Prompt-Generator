CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS design_schemas (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  frame          TEXT,
  palette        TEXT,
  layout         TEXT,
  text_fields    TEXT,
  type_scale     TEXT,
  elements       TEXT,
  style_checksum TEXT,
  locked_fields  TEXT NOT NULL DEFAULT '[]',
  raw_analysis    TEXT,
  reference_image TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grammar_blueprints (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id        TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name              TEXT,
  sequence_pattern  TEXT,
  density           TEXT,
  avg_length        INTEGER,
  compression_style TEXT,
  raw_prompts       TEXT,
  distilled_grammar TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prompt_outputs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  schema_snapshot TEXT,
  blueprint_id    TEXT REFERENCES grammar_blueprints(id) ON DELETE SET NULL,
  final_prompt    TEXT,
  model_used      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generated_images (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prompt_output_id TEXT NOT NULL REFERENCES prompt_outputs(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_job_id  TEXT,
  model            TEXT,
  url              TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_design_schemas_project_id     ON design_schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_grammar_blueprints_project_id ON grammar_blueprints(project_id);
CREATE INDEX IF NOT EXISTS idx_prompt_outputs_project_id     ON prompt_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_output_id    ON generated_images(prompt_output_id);
