import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

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

    const supabase = getSupabaseServer()

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: blueprints, error } = await supabase
      .from("grammar_blueprints")
      .select("id, name, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json((blueprints ?? []) as BlueprintListItem[])
  } catch (error) {
    console.error("[GET /api/blueprints]", error)
    return NextResponse.json({ error: "Failed to fetch blueprints" }, { status: 500 })
  }
}
