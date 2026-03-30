import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase-server"
import type { Project } from "@/types/db"

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
})

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json((projects ?? []) as Project[])
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

    const supabase = getSupabaseServer()
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ name: parsed.data.name })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(project as Project, { status: 201 })
  } catch (error) {
    console.error("[POST /api/projects]", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
