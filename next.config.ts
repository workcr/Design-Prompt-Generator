import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow network IP access during local development (e.g. preview on phone/tablet)
  allowedDevOrigins: ["192.168.4.192"],
};

export default nextConfig;
