import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()

    const { data: exists } = await supabase
      .from("grammar_blueprints")
      .select("id")
      .eq("id", id)
      .single()

    if (!exists) {
      return NextResponse.json({ error: "Blueprint not found" }, { status: 404 })
    }

    const { error } = await supabase.from("grammar_blueprints").delete().eq("id", id)
    if (error) throw error
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[DELETE /api/blueprints/[id]]", error)
    return NextResponse.json({ error: "Failed to delete blueprint" }, { status: 500 })
  }
}
