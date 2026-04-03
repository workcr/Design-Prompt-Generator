import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

interface PromptOutputWithImage {
  id: string
  final_prompt: string | null
  schema_snapshot: string | null
  model_used: string | null
  created_at: string
  reference_image: string | null
  image_url: string | null
  image_provider: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10

  const supabase = getSupabaseServer()

  // 1. Fetch prompt outputs
  const { data: outputs, error: outputsError } = await supabase
    .from("prompt_outputs")
    .select("id, final_prompt, schema_snapshot, model_used, created_at, project_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (outputsError) {
    return NextResponse.json({ error: "Failed to fetch outputs" }, { status: 500 })
  }

  if (!outputs || outputs.length === 0) {
    return NextResponse.json({ error: "No prompt outputs found" }, { status: 404 })
  }

  // 2. Fetch latest design_schema for reference_image (same for all outputs in project)
  const { data: latestSchema } = await supabase
    .from("design_schemas")
    .select("reference_image")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const referenceImage = latestSchema?.reference_image ?? null

  // 3. Fetch generated images for all output IDs in one batched query
  const outputIds = outputs.map((o) => o.id)
  const { data: images } = await supabase
    .from("generated_images")
    .select("prompt_output_id, url, provider, created_at")
    .in("prompt_output_id", outputIds)
    .eq("status", "complete")
    .order("created_at", { ascending: false })

  // 4. Build lookup: outputId → latest image (images are DESC so first match is latest)
  const imageByOutputId = new Map<string, { url: string; provider: string }>()
  for (const img of images ?? []) {
    if (!imageByOutputId.has(img.prompt_output_id)) {
      imageByOutputId.set(img.prompt_output_id, {
        url: img.url,
        provider: img.provider,
      })
    }
  }

  // 5. Combine into final shape
  const rows: PromptOutputWithImage[] = outputs.map((o) => {
    const image = imageByOutputId.get(o.id) ?? null
    return {
      id:              o.id,
      final_prompt:    o.final_prompt,
      schema_snapshot: (o as Record<string, unknown>).schema_snapshot as string | null ?? null,
      model_used:      o.model_used,
      created_at:      o.created_at,
      reference_image: referenceImage,
      image_url:       image?.url ?? null,
      image_provider:  image?.provider ?? null,
    }
  })

  return NextResponse.json(rows)
}
