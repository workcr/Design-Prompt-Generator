import { NextResponse } from "next/server"

const AUTH_COOKIE = "site_auth"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string }
    const sitePassword = process.env.SITE_PASSWORD

    if (!sitePassword) {
      // No password configured — always grant access
      const res = NextResponse.json({ ok: true })
      res.cookies.set(AUTH_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      })
      return res
    }

    if (!body.password || body.password !== sitePassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(AUTH_COOKIE, sitePassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })
    return res
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
