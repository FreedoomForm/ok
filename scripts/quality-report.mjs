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

const tsFiles = walkFiles(srcRoot, (p) => p.endsWith('.ts') || p.endsWith('.tsx'))

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

process.stdout.write(`## Admin Dashboard\n\n`)
process.stdout.write(`- AdminDashboardPage LOC: ${report.admin.adminDashboardLines ?? 'n/a'}\n`)
process.stdout.write(`- Admin files > 1200 LOC: ${report.admin.bigAdminFiles.length}\n`)
for (const item of report.admin.bigAdminFiles.slice(0, 10)) {
  process.stdout.write(`  - ${item.lines} ${item.file}\n`)
}
process.stdout.write('\n')

process.stdout.write(`## Theme Tokens\n\n`)
process.stdout.write(`- Hardcoded hits (bg-white/bg-slate-50/border-slate-*): ${report.theme.hardcodedThemeHits}\n\n`)

