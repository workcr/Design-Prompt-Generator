import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import type { GeneratedImage } from "@/types/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const outputId = searchParams.get("outputId")
  if (!outputId) {
    return NextResponse.json({ error: "outputId is required" }, { status: 400 })
  }

  const db = getDb()
  const image = db
    .prepare(
      `SELECT * FROM generated_images
       WHERE prompt_output_id = ? AND status = 'complete'
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(outputId) as GeneratedImage | undefined

  if (!image) {
    return NextResponse.json({ error: "No generated image found" }, { status: 404 })
  }

  return NextResponse.json(image)
}
