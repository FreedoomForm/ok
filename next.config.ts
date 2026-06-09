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
      // Fix TDZ "Cannot access 'e$' before initialization" in production.
      //
      // Root cause: @radix-ui packages have circular internal dependencies
      // (e.g., react-dialog ↔ react-dismissable-layer ↔ react-focus-scope).
      // When webpack splits these across chunk boundaries (some in eager chunks
      // via static imports like DropdownMenu/Select/Tabs, others in lazy chunks
      // via dynamic imports of Dialog/AlertDialog/Sheet), the chunk runtime
      // cannot guarantee initialization order, causing TDZ ReferenceError.
      //
      // Solution 1: Group ALL @radix-ui packages into a single shared chunk.
      // This keeps all circular dependencies within one chunk, where webpack
      // can correctly order module initialization. The chunk is loaded eagerly
      // as part of the initial page bundle, so it's available before any
      // lazy-loaded components need it.
      //
      // Solution 2: Disable concatenateModules (scope hoisting) to keep each
      // module in its own function scope, preventing direct const/let references
      // across module boundaries.
      config.optimization = config.optimization || {};
      config.optimization.concatenateModules = false;

      const existing = config.optimization.splitChunks as Record<string, unknown> | undefined;
      config.optimization.splitChunks = {
        ...existing,
        cacheGroups: {
          ...(existing?.cacheGroups as Record<string, unknown> | undefined),
          radixUI: {
            test: /[\\/]node_modules[\\/](@radix-ui|aria-hidden|react-remove-scroll|react-use-callback-ref|react-use-escape-keydown|react-use-controllable-state)[\\/]/,
            name: 'radix-ui-vendor',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
