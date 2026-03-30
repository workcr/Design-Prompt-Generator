import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { getDb } from "@/lib/db"
import { getVisionProvider } from "@/lib/ai"
import {
  DesignExtractionSchema,
  DESIGN_ANALYSIS_PROMPT,
} from "@/lib/schemas/design-extraction"
import type { DesignSchema } from "@/types/db"

const RequestSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    // 1. Validate request body
    const body: unknown = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { projectId, filename } = parsed.data
    const db = getDb()

    // 2. Verify project exists
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // 3. Read image from uploads/
    const filePath = path.join(process.cwd(), "uploads", filename)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Image file not found" }, { status: 404 })
    }
    const imageBuffer = fs.readFileSync(filePath)

    // 4. Run structured extraction via AI SDK
    const { object: extraction } = await generateObject({
      model: getVisionProvider(),
      schema: DesignExtractionSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: imageBuffer },
            { type: "text", text: DESIGN_ANALYSIS_PROMPT },
          ],
        },
      ],
    })

    // 5. Compute style checksum (first 16 chars of SHA-256)
    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(extraction))
      .digest("hex")
      .slice(0, 16)

    // 6. Persist to design_schemas
    const schema = db
      .prepare(
        `INSERT INTO design_schemas
           (project_id, frame, palette, layout, text_fields, type_scale,
            elements, style_checksum, raw_analysis, reference_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .get(
        projectId,
        JSON.stringify(extraction.frame),
        JSON.stringify(extraction.palette),
        JSON.stringify(extraction.layout),
        JSON.stringify(extraction.text_fields),
        JSON.stringify(extraction.type_scale),
        JSON.stringify(extraction.elements),
        checksum,
        JSON.stringify(extraction),
        filename
      ) as DesignSchema

    return NextResponse.json({ id: schema.id, schema })
  } catch (error) {
    console.error("[POST /api/analyze]", error)
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    )
  }
}
