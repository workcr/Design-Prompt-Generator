import { NextResponse } from "next/server"
import crypto from "crypto"
import { getSupabaseServer } from "@/lib/supabase-server"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

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

    const ext = file.name.split(".").pop() ?? "bin"
    const filename = `${crypto.randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const supabase = getSupabaseServer()
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(filename, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from("uploads")
      .getPublicUrl(filename)

    return NextResponse.json({
      filename,
      url: publicUrl,
      path: `uploads/${filename}`,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("[POST /api/upload]", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
