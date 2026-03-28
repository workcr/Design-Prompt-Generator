import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import type { Project, DesignSchema, GrammarBlueprint, ProjectDetail } from "@/types/db"

const UpdateProjectSchema = z.object({
  name:   z.string().min(1).max(200).optional(),
  status: z.enum(["active", "archived"]).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db = getDb()

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as Project | undefined

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const design_schema = db
      .prepare("SELECT * FROM design_schemas WHERE project_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(id) as DesignSchema | null ?? null

    const grammar_blueprint = db
      .prepare("SELECT * FROM grammar_blueprints WHERE project_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(id) as GrammarBlueprint | null ?? null

    const detail: ProjectDetail = { ...project, design_schema, grammar_blueprint }
    return NextResponse.json(detail)
  } catch (error) {
    console.error("[GET /api/projects/[id]]", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db = getDb()

    const exists = db.prepare("SELECT id FROM projects WHERE id = ?").get(id)
    if (!exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = UpdateProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const fields  = Object.keys(parsed.data) as (keyof typeof parsed.data)[]
    const setClauses = fields.map(f => `${f} = ?`).join(", ")
    const values     = fields.map(f => parsed.data[f])

    const updated = db
      .prepare(
        `UPDATE projects
         SET ${setClauses}, updated_at = datetime('now')
         WHERE id = ?
         RETURNING *`
      )
      .get([...values, id]) as Project

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PATCH /api/projects/[id]]", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db = getDb()

    const exists = db.prepare("SELECT id FROM projects WHERE id = ?").get(id)
    if (!exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    db.prepare("DELETE FROM projects WHERE id = ?").run(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[DELETE /api/projects/[id]]", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
