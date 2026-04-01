export interface Project {
  id: string
  name: string
  status: "active" | "archived"
  created_at: string
  updated_at: string
}

export interface DesignSchema {
  id: string
  project_id: string
  frame:          string | null  // JSON
  palette:        string | null  // JSON
  layout:         string | null  // JSON
  text_fields:    string | null  // JSON
  type_scale:     string | null  // JSON
  elements:       string | null  // JSON
  style_checksum: string | null
  locked_fields:  string         // JSON array — defaults to '[]'
  raw_analysis:    string | null  // JSON
  reference_image: string | null
  created_at: string
  updated_at: string
}

export interface GrammarBlueprint {
  id: string
  project_id:        string | null
  name:              string | null
  sequence_pattern:  string | null  // JSON
  density:           string | null
  avg_length:        number | null
  compression_style: string | null
  raw_prompts:       string | null  // JSON array
  distilled_grammar: string | null  // JSON
  created_at: string
  updated_at: string
}

export interface PromptOutput {
  id: string
  project_id:      string
  schema_snapshot: string | null  // JSON
  blueprint_id:    string | null
  final_prompt:    string | null
  model_used:      string | null
  created_at: string
}

export interface GeneratedImage {
  id:               string
  prompt_output_id: string
  provider:         "nano_banana_2" | "replicate" | "recraft"
  provider_job_id:  string | null
  model:            string | null
  url:              string | null
  status:           "pending" | "complete" | "failed"
  created_at: string
}

export interface EvaluationScore {
  id:                  string
  prompt_output_id:    string
  generated_image_id:  string | null
  project_id:          string
  reference_image:     string | null
  generated_image_url: string | null
  scores:              string | null  // JSON: { composition, typography, palette, layout, elements }
  critique:            string | null  // editable by user
  iteration:           number
  created_at:          string
}

/** Project row joined with its latest DesignSchema and GrammarBlueprint */
export interface ProjectDetail extends Project {
  design_schema:     DesignSchema | null
  grammar_blueprint: GrammarBlueprint | null
}
