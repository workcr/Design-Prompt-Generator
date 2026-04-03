import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const AUTH_COOKIE = "site_auth"

export function middleware(request: NextRequest) {
  const password = process.env.SITE_PASSWORD

  // No password set → open access (local dev / intentionally public)
  if (!password) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Always allow the login page and auth API through
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Check auth cookie
  const cookie = request.cookies.get(AUTH_COOKIE)
  if (cookie?.value === password) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to login, preserving intended destination
  const loginUrl = new URL("/login", request.url)
  if (pathname !== "/") {
    loginUrl.searchParams.set("from", pathname)
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
