import type { NextConfig } from "next";

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  typescript: {
    // Keep local builds unblocked, but fail fast on CI.
    ignoreBuildErrors: !isCI,
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      // Bundle ALL @radix-ui packages (and their close deps) into a single chunk.
      // Root cause of TDZ "Cannot access 'e0' before initialization":
      //   @radix-ui/react-dialog has circular dependencies with other radix primitives
      //   (DismissableLayer, FocusScope, etc.). When webpack splits them across
      //   separate chunks, the chunk initialization order can cause a TDZ violation
      //   where one chunk tries to access a `const` from another chunk that hasn't
      //   finished initializing yet. Grouping them into one chunk eliminates the
      //   boundary entirely.
      config.optimization = config.optimization || {};
      const existing = config.optimization.splitChunks as any;
      config.optimization.splitChunks = {
        ...existing,
        cacheGroups: {
          ...existing?.cacheGroups,
          radixUI: {
            test: /[\\/]node_modules[\\/](@radix-ui|aria-hidden|react-remove-scroll)[\\/]/,
            name: 'radix-ui-vendor',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
