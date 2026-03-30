import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

interface PromptOutputWithImage {
  id: string
  final_prompt: string | null
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

  const db = getDb()
  const rows = db
    .prepare(
      `SELECT
         po.id,
         po.final_prompt,
         po.model_used,
         po.created_at,
         (SELECT ds.reference_image
          FROM design_schemas ds
          WHERE ds.project_id = po.project_id
          ORDER BY ds.created_at DESC
          LIMIT 1) AS reference_image,
         (SELECT gi.url
          FROM generated_images gi
          WHERE gi.prompt_output_id = po.id AND gi.status = 'complete'
          ORDER BY gi.created_at DESC
          LIMIT 1) AS image_url,
         (SELECT gi.provider
          FROM generated_images gi
          WHERE gi.prompt_output_id = po.id AND gi.status = 'complete'
          ORDER BY gi.created_at DESC
          LIMIT 1) AS image_provider
       FROM prompt_outputs po
       WHERE po.project_id = ?
       ORDER BY po.created_at DESC
       LIMIT ?`
    )
    .all(projectId, limit) as PromptOutputWithImage[]

  if (rows.length === 0) {
    return NextResponse.json({ error: "No prompt outputs found" }, { status: 404 })
  }

  return NextResponse.json(rows)
}
