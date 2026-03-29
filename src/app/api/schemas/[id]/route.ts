import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
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
    const db = getDb()

    const exists = db.prepare("SELECT id FROM design_schemas WHERE id = ?").get(id)
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

    const setClauses: string[] = []
    const values: unknown[] = []

    for (const field of JSON_FIELDS) {
      if (parsed.data[field] !== undefined) {
        setClauses.push(`${field} = ?`)
        values.push(JSON.stringify(parsed.data[field]))
      }
    }

    if (parsed.data.locked_fields !== undefined) {
      setClauses.push("locked_fields = ?")
      values.push(JSON.stringify(parsed.data.locked_fields))
    }

    const updated = db
      .prepare(
        `UPDATE design_schemas
         SET ${setClauses.join(", ")}, updated_at = datetime('now')
         WHERE id = ?
         RETURNING *`
      )
      .get([...values, id]) as DesignSchema

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PATCH /api/schemas/[id]]", error)
    return NextResponse.json({ error: "Failed to update schema" }, { status: 500 })
  }
}
