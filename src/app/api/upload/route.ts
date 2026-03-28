import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import crypto from "crypto"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const UPLOADS_DIR = path.join(process.cwd(), "uploads")

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are accepted" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10MB limit" },
        { status: 413 }
      )
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true })

    const ext = file.name.split(".").pop() ?? "bin"
    const filename = `${crypto.randomUUID()}.${ext}`
    const filePath = path.join(UPLOADS_DIR, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    return NextResponse.json({
      filename,
      path: `uploads/${filename}`,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("[POST /api/upload]", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
