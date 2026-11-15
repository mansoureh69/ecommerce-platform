import type { NextConfig } from "next";

// Landing-page photography is hosted on Unsplash; product images come from the API through /api/backend.
const config: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] },
};

export default config;
