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
      // Force @radix-ui/react-dialog into its own chunk to prevent TDZ ReferenceError.
      // The root cause: Dialog (static import) and Sheet (dynamic import, via TableFilterPanel)
      // both depend on @radix-ui/react-dialog. When webpack places it in a shared chunk,
      // the module initialization order can cause "Cannot access 'X' before initialization"
      // at runtime. Isolating it into a dedicated chunk ensures it's fully evaluated
      // before any consumer tries to access its exports.
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...(config.optimization.splitChunks as any)?.cacheGroups,
          radixDialog: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]react-dialog[\\/]/,
            name: 'radix-dialog',
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
