import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import type { DesignSchema } from "@/types/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: schema, error } = await supabase
      .from("design_schemas")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!schema) {
      return NextResponse.json({ error: "No schema found for this project" }, { status: 404 })
    }

    return NextResponse.json(schema as DesignSchema)
  } catch (error) {
    console.error("[GET /api/schemas]", error)
    return NextResponse.json({ error: "Failed to fetch schema" }, { status: 500 })
  }
}
