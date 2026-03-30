import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import type { GeneratedImage } from "@/types/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const outputId = searchParams.get("outputId")
  if (!outputId) {
    return NextResponse.json({ error: "outputId is required" }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const { data: image, error } = await supabase
    .from("generated_images")
    .select("*")
    .eq("prompt_output_id", outputId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
  if (!image) {
    return NextResponse.json({ error: "No generated image found" }, { status: 404 })
  }

  return NextResponse.json(image as GeneratedImage)
}
