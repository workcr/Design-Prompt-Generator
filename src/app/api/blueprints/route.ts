import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

interface BlueprintListItem {
  id: string
  name: string | null
  created_at: string
}

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

    const blueprints = db
      .prepare(
        "SELECT id, name, created_at FROM grammar_blueprints WHERE project_id = ? ORDER BY created_at DESC"
      )
      .all(projectId) as BlueprintListItem[]

    return NextResponse.json(blueprints)
  } catch (error) {
    console.error("[GET /api/blueprints]", error)
    return NextResponse.json({ error: "Failed to fetch blueprints" }, { status: 500 })
  }
}
