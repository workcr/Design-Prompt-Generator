import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

interface PromptOutputWithRef {
  id: string
  final_prompt: string | null
  model_used: string | null
  created_at: string
  reference_image: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const db = getDb()
  const row = db
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
          LIMIT 1) AS reference_image
       FROM prompt_outputs po
       WHERE po.project_id = ?
       ORDER BY po.created_at DESC
       LIMIT 1`
    )
    .get(projectId) as PromptOutputWithRef | undefined

  if (!row) {
    return NextResponse.json({ error: "No prompt outputs found" }, { status: 404 })
  }

  return NextResponse.json(row)
}
