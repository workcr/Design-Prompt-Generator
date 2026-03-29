import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import type { DesignSchema } from "@/types/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    const db = getDb()

    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const schema = db
      .prepare(
        "SELECT * FROM design_schemas WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(projectId) as DesignSchema | undefined

    if (!schema) {
      return NextResponse.json({ error: "No schema found for this project" }, { status: 404 })
    }

    return NextResponse.json(schema)
  } catch (error) {
    console.error("[GET /api/schemas]", error)
    return NextResponse.json({ error: "Failed to fetch schema" }, { status: 500 })
  }
}
