import type { NextConfig } from "next";

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Output standalone for Docker — generates a minimal server.js
  output: "standalone",

  // Enable gzip compression for responses (Vercel does this by default,
  // but standalone Docker deployments need it explicitly)
  compress: true,

  // Optimize images: prefer AVIF over WebP for smaller payloads
  images: {
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    // Tree-shake barrel imports — huge savings for lucide-react, date-fns, recharts
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
      "recharts",
      "framer-motion",
      "motion",
    ],
  },

  typescript: {
    // Keep local builds unblocked, but fail fast on CI.
    ignoreBuildErrors: !isCI,
  },
};

export default nextConfig;
