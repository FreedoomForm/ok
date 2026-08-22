# AutoFood production CSS/query audit — 2026-08-22

## Findings

The official Next.js production checklist recommends preserving Server Components where possible, keeping Client Component boundaries intentional, using route-level code splitting and lazy loading for client components, and running `next build` followed by a production-like server check before release. It also recommends bundle analysis when dependencies or client payloads may be large. Source: [Next.js production checklist][1].

The official Prisma performance guidance identifies over-fetching, missing indexes, repeated uncached queries and full scans as common causes of slow queries. It recommends bulk operations for bulk writes, reusing one PrismaClient instance in serverless-compatible applications, and avoiding n+1 query loops by using nested reads, `in` filters or joins where appropriate. Source: [Prisma query optimization][2].

Tailwind's official color documentation confirms that semantic/custom theme variables and utility classes can be used for theme-aware surfaces, while direct palette classes remain valid when a deliberate state color is needed. Source: [Tailwind colors][3].

## AutoFood evidence

The latest full gate is green on branch `manus/next-professional-improvements`: all unit/integration baseline tests and 90/90 Chromium + Mobile Chrome Playwright scenarios pass. The repository is clean and pushed at the current HEAD.

The following visual utilities were confirmed to have zero active source references and were removed in commit `f76704f`: `bg-dot-grid`, `accent-line`, `animate-pulse-glow`, and `pulse-glow` keyframes. This reduced dead stylesheet code without changing active markup.

The next low-risk candidate is a second dead-CSS pass: inventory remaining custom utility definitions such as unused animation helpers and decorative backgrounds, remove only utilities with zero references outside `globals.css`, then repeat typecheck, build, browser smoke and full regression. Do not remove `glass-card` yet because it remains actively used in warehouse/features components and needs a separate visual contract decision.

## References

[1]: https://nextjs.org/docs/app/guides/production-checklist "How to optimize your Next.js application for production — Next.js"
[2]: https://www.prisma.io/docs/orm/prisma-client/queries/advanced/query-optimization-performance "Query optimization — Prisma"
[3]: https://tailwindcss.com/docs/colors "Colors — Tailwind CSS"
