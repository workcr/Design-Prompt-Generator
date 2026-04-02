import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase-server"

const PatchSchema = z.object({
  critique: z.string().min(1),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: unknown = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from("evaluation_scores")
      .update({ critique: parsed.data.critique })
      .eq("id", id)
      .select("id, critique")
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Score not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (error) {
    console.error("[PATCH /api/evaluation-scores/[id]]", error)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}
