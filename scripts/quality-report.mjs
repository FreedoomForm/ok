import fs from 'node:fs'
import path from 'node:path'

function walkFiles(rootDir, predicate) {
  /** @type {string[]} */
  const results = []
  /** @type {string[]} */
  const stack = [rootDir]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue
        stack.push(fullPath)
        continue
      }
      if (!entry.isFile()) continue
      if (predicate(fullPath)) results.push(fullPath)
    }
  }

  return results
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.length === 0) return 0
  return content.split(/\r?\n/).length
}

function countRegexInFiles(filePaths, regex) {
  let count = 0
  for (const filePath of filePaths) {
    const content = fs.readFileSync(filePath, 'utf8')
    const matches = content.match(regex)
    if (matches) count += matches.length
  }
  return count
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

const repoRoot = process.cwd()
const srcRoot = path.join(repoRoot, 'src')
const apiRoot = path.join(srcRoot, 'app', 'api')

const tsFiles = walkFiles(srcRoot, (p) => p.endsWith('.ts') || p.endsWith('.tsx'))
const apiRouteFiles = walkFiles(apiRoot, (p) => p.endsWith('route.ts'))
const apiRouteContents = apiRouteFiles.map((filePath) => ({
  file: toPosix(path.relative(repoRoot, filePath)),
  content: fs.readFileSync(filePath, 'utf8'),
}))

const withLineCounts = tsFiles
  .map((filePath) => ({
    file: toPosix(path.relative(repoRoot, filePath)),
    lines: countLines(filePath),
  }))
  .sort((a, b) => b.lines - a.lines)

const topFiles = withLineCounts.slice(0, 20)

const adminComponentFiles = withLineCounts.filter((f) =>
  f.file.startsWith('src/components/admin/')
)

const bigAdminFiles = adminComponentFiles.filter((f) => f.lines > 1200)

const adminDashboard = withLineCounts.find((f) => f.file === 'src/components/admin/AdminDashboardPage.tsx')

const themeScanFiles = withLineCounts
  .filter((f) => f.file.startsWith('src/components/admin/') || f.file.startsWith('src/components/layout/'))
  .map((f) => path.join(repoRoot, f.file))

const hardcodedThemeHits = countRegexInFiles(
  themeScanFiles,
  /\b(bg-white|bg-slate-50|border-slate-\d+)\b/g
)

const report = {
  generatedAt: new Date().toISOString(),
  topFiles,
  api: {
    routeCount: apiRouteFiles.length,
    routesWithAuth: apiRouteContents.filter(({ content }) => /getAuthUser|auth\(/.test(content)).length,
    routesWithRoleGuard: apiRouteContents.filter(({ content }) => /hasRole/.test(content)).length,
    routesWithoutAuth: apiRouteContents
      .filter(({ content }) => !/getAuthUser|auth\(/.test(content))
      .map(({ file }) => file),
  },
  codeSignals: {
    explicitAnyCount: countRegexInFiles(tsFiles, /\bas any\b|:\s*any\b/g),
    consoleStatementCount: countRegexInFiles(tsFiles, /console\.(log|warn|error)\s*\(/g),
  },
  admin: {
    adminDashboardLines: adminDashboard?.lines ?? null,
    bigAdminFiles,
  },
  theme: {
    hardcodedThemeHits,
  },
}

const args = new Set(process.argv.slice(2))
if (args.has('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
  process.exit(0)
}

process.stdout.write(`# Quality Report\n\n`)
process.stdout.write(`Generated: ${report.generatedAt}\n\n`)

process.stdout.write(`## Hotspots (Top 20 files by LOC)\n\n`)
for (const item of report.topFiles) {
  process.stdout.write(`- ${item.lines} ${item.file}\n`)
}
process.stdout.write('\n')

process.stdout.write(`## API/Auth coverage\n\n`)
process.stdout.write(`- API route files: ${report.api.routeCount}\n`)
process.stdout.write(`- Routes with auth lookup: ${report.api.routesWithAuth}\n`)
process.stdout.write(`- Routes with explicit role guard: ${report.api.routesWithRoleGuard}\n`)
process.stdout.write(`- Routes without auth lookup: ${report.api.routesWithoutAuth.length}\n\n`)

process.stdout.write(`## Code signals\n\n`)
process.stdout.write(`- Explicit any casts/annotations: ${report.codeSignals.explicitAnyCount}\n`)
process.stdout.write(`- Console statements: ${report.codeSignals.consoleStatementCount}\n\n`)

process.stdout.write(`## Admin Dashboard\n\n`)
process.stdout.write(`- AdminDashboardPage LOC: ${report.admin.adminDashboardLines ?? 'n/a'}\n`)
process.stdout.write(`- Admin files > 1200 LOC: ${report.admin.bigAdminFiles.length}\n`)
for (const item of report.admin.bigAdminFiles.slice(0, 10)) {
  process.stdout.write(`  - ${item.lines} ${item.file}\n`)
}
process.stdout.write('\n')

process.stdout.write(`## Theme Tokens\n\n`)
process.stdout.write(`- Hardcoded hits (bg-white/bg-slate-50/border-slate-*): ${report.theme.hardcodedThemeHits}\n\n`)

