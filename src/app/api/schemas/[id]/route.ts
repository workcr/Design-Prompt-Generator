import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase-server"
import type { DesignSchema } from "@/types/db"

const PatchSchemaBody = z
  .object({
    frame:         z.unknown().optional(),
    palette:       z.unknown().optional(),
    layout:        z.unknown().optional(),
    text_fields:   z.unknown().optional(),
    type_scale:    z.unknown().optional(),
    elements:      z.unknown().optional(),
    locked_fields: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })

type RouteContext = { params: Promise<{ id: string }> }

const JSON_FIELDS = [
  "frame",
  "palette",
  "layout",
  "text_fields",
  "type_scale",
  "elements",
] as const

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = getSupabaseServer()

    const { data: exists } = await supabase
      .from("design_schemas")
      .select("id")
      .eq("id", id)
      .single()

    if (!exists) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 })
    }

    const body: unknown = await request.json()
    const parsed = PatchSchemaBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Build update object — only include provided fields
    const updateObj: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const field of JSON_FIELDS) {
      if (parsed.data[field] !== undefined) {
        updateObj[field] = JSON.stringify(parsed.data[field])
      }
    }

    if (parsed.data.locked_fields !== undefined) {
      updateObj.locked_fields = JSON.stringify(parsed.data.locked_fields)
    }

    const { data: updated, error } = await supabase
      .from("design_schemas")
      .update(updateObj)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(updated as DesignSchema)
  } catch (error) {
    console.error("[PATCH /api/schemas/[id]]", error)
    return NextResponse.json({ error: "Failed to update schema" }, { status: 500 })
  }
}
