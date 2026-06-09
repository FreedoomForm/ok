import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

/**
 * Force CJS resolution for @radix-ui packages.
 *
 * Root cause of "Cannot access 'e$' before initialization" (TDZ ReferenceError):
 *   @radix-ui packages ship both ESM (.mjs) and CJS (.js) versions.
 *   Webpack prefers the ESM version (via the `module` / `exports["import"]` fields).
 *   ESM modules use live `const`/`let` bindings for exports. When circular
 *   dependencies exist (e.g. react-dialog → react-dismissable-layer → react-focus-scope),
 *   and these modules are split across webpack chunks (some eager via static imports
 *   like Tabs/Select/DropdownMenu, some lazy via dynamic imports of Dialog/Sheet),
 *   webpack's chunk runtime cannot guarantee initialization order, and accessing
 *   a `const`/`let` binding before its declaration triggers TDZ.
 *
 * Fix:
 *   Resolve the CJS version of every @radix-ui package.
 *   CJS uses `module.exports = __toCommonJS(...)` with `Object.defineProperty`
 *   on the exports object — no live `const`/`let` bindings, no TDZ possible.
 *
 *   Only @radix-ui/* packages are aliased because:
 *   1. The circular dependency chain is entirely within @radix-ui packages.
 *   2. Transitive deps (react-remove-scroll, aria-hidden, etc.) do NOT have
 *      circular dependencies with radix-ui and don't cause TDZ on their own.
 *   3. Aliasing transitive deps breaks sub-path imports
 *      (e.g. react-remove-scroll-bar/constants).
 *
 * This is more robust than:
 *   - splitChunks (creates a separate chunk; still ESM inside → TDZ within the chunk)
 *   - concatenateModules:false (each module is in its own scope, but ESM getters
 *     still capture const/let bindings → TDZ when the getter runs before init)
 *   - Per-component dynamic() imports (whack-a-mole; any remaining static import
 *     of Tabs/Select/DropdownMenu alongside Dialog/Sheet re-creates the boundary)
 */
function buildRadixCjsAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  const projectRoot = process.cwd();
  const radixDir = path.join(projectRoot, "node_modules", "@radix-ui");

  if (!fs.existsSync(radixDir)) return aliases;

  for (const pkg of fs.readdirSync(radixDir)) {
    const pkgJsonPath = path.join(radixDir, pkg, "package.json");
    if (!fs.existsSync(pkgJsonPath)) continue;
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      const mainField = pkgJson.main; // always points to CJS entry
      if (typeof mainField === "string") {
        const cjsPath = path.join(radixDir, pkg, mainField);
        if (fs.existsSync(cjsPath)) {
          aliases[`@radix-ui/${pkg}`] = cjsPath;
        }
      }
    } catch {
      // skip packages with unreadable package.json
    }
  }

  return aliases;
}

const radixCjsAliases = buildRadixCjsAliases();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  typescript: {
    // Keep local builds unblocked, but fail fast on CI.
    ignoreBuildErrors: !isCI,
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      // ── Core fix: resolve radix-ui packages as CJS ──────────────────
      // CJS has no live const/let bindings → no TDZ from circular deps.
      config.resolve.alias = {
        ...((config.resolve.alias as Record<string, string>) ?? {}),
        ...radixCjsAliases,
      };

      // ── Safety net: prevent scope hoisting from re-introducing TDZ ───
      // With CJS modules this is less critical, but keeps each module in
      // its own function scope just in case any ESM slips through.
      config.optimization = config.optimization || {};
      config.optimization.concatenateModules = false;
    }
    return config;
  },
};

export default nextConfig;
