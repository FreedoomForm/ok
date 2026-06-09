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
      // Fix TDZ "Cannot access 'e0' before initialization" in production.
      //
      // Root cause: webpack's ModuleConcatenationPlugin (scope hoisting) inlines
      // multiple modules into a single function scope. When a `const`/`let`
      // declaration from one module is referenced by code from another inlined
      // module before the declaration has executed, JavaScript throws a TDZ
      // ReferenceError. This is especially common with @radix-ui packages which
      // have circular internal dependencies (e.g., react-dialog ↔
      // react-dismissable-layer ↔ react-focus-scope).
      //
      // Disabling concatenateModules keeps each module in its own function scope,
      // so variables are accessed through __webpack_require__ (which is
      // hoisted) instead of direct const/let references (which have TDZ).
      config.optimization = config.optimization || {};
      config.optimization.concatenateModules = false;
    }
    return config;
  },
};

export default nextConfig;
