import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  const supabase = getSupabaseServer()
  const { data: { publicUrl } } = supabase.storage
    .from("uploads")
    .getPublicUrl(filename)

  // 302 redirect to the Supabase CDN URL
  return NextResponse.redirect(publicUrl)
}
