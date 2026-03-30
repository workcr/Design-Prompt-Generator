import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const db = getDb()
    const exists = db
      .prepare("SELECT id FROM grammar_blueprints WHERE id = ?")
      .get(id)
    if (!exists) {
      return NextResponse.json({ error: "Blueprint not found" }, { status: 404 })
    }
    db.prepare("DELETE FROM grammar_blueprints WHERE id = ?").run(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[DELETE /api/blueprints/[id]]", error)
    return NextResponse.json({ error: "Failed to delete blueprint" }, { status: 500 })
  }
}
