import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const MIME: Record<string, string> = {
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  const filePath = path.join(process.cwd(), "uploads", filename)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const ext = path.extname(filename).toLowerCase()
  const contentType = MIME[ext] ?? "application/octet-stream"
  const buffer = fs.readFileSync(filePath)

  return new Response(buffer, {
    headers: { "Content-Type": contentType },
  })
}
