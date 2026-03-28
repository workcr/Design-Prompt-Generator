import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import type { Project } from "@/types/db"

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
})

export async function GET() {
  try {
    const db = getDb()
    const projects = db
      .prepare("SELECT * FROM projects ORDER BY created_at DESC")
      .all() as Project[]
    return NextResponse.json(projects)
  } catch (error) {
    console.error("[GET /api/projects]", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    const parsed = CreateProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const db = getDb()
    const project = db
      .prepare(
        `INSERT INTO projects (name)
         VALUES (?)
         RETURNING *`
      )
      .get(parsed.data.name) as Project

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("[POST /api/projects]", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
