import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow network IP access during local development (e.g. preview on phone/tablet)
  allowedDevOrigins: ["192.168.4.192"],
  // Prevent Vercel from bundling the native better-sqlite3 module.
  // getDb() is never called when LOCAL_MODE=false, but without this the
  // build step tries (and fails) to cross-compile the native addon.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
