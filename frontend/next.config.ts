import type { NextConfig } from "next";

// No Content-Security-Policy here on purpose: Clerk's own scripts/iframes
// need CSP directives tuned and tested against a live sign-in flow, and a
// wrong policy silently breaks auth rather than failing loudly. These are
// the headers safe to set blind — they don't touch anything Clerk, the
// API client, or Turbopack rely on.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
