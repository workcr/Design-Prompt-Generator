import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase-server"
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
    const supabase = getSupabaseServer()

    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: design_schema } = await supabase
      .from("design_schemas")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: grammar_blueprint } = await supabase
      .from("grammar_blueprints")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const detail: ProjectDetail = {
      ...(project as Project),
      design_schema: (design_schema as DesignSchema | null) ?? null,
      grammar_blueprint: (grammar_blueprint as GrammarBlueprint | null) ?? null,
    }
    return NextResponse.json(detail)
  } catch (error) {
    console.error("[GET /api/projects/[id]]", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()

    const { data: exists } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .single()

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

    const { data: updated, error } = await supabase
      .from("projects")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(updated as Project)
  } catch (error) {
    console.error("[PATCH /api/projects/[id]]", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()

    const { data: exists } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .single()

    if (!exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) throw error
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[DELETE /api/projects/[id]]", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
