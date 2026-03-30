import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

/**
 * Returns a Supabase client for server-side use (API routes only).
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY — bypasses Row Level Security.
 * Never expose the service role key to the browser.
 *
 * Throws immediately with a clear message if required env vars are missing,
 * so misconfigured deployments fail fast at the call site.
 */
export function getSupabaseServer(): SupabaseClient {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (local) " +
        "or Vercel Environment Variables (production)."
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
