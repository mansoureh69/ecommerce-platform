import type { NextConfig } from "next";

// Admin data is private: forbid shared/browser caching of every response.
const config: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Frame-Options", value: "DENY" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "same-origin" }] }];
  },
};
export default config;
