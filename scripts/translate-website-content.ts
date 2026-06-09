import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Lang = 'uz' | 'ru' | 'en'
type Text3 = { uz: string; ru: string; en: string }

type Args = {
  apply: boolean
  limit: number
  adminId?: string
  subdomain?: string
  source: Lang
  targets: Lang[]
  model: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    apply: false,
    limit: 50,
    source: 'ru',
    targets: ['uz', 'en'],
    model: 'gemini-1.5-flash',
  }

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index] ?? ''
    const next = argv[index + 1]

    if (token === '--apply') {
      args.apply = true
      continue
    }

    if (token === '--limit' && next) {
      const parsed = Number.parseInt(next, 10)
      if (Number.isFinite(parsed) && parsed > 0) args.limit = parsed
      index += 1
      continue
    }

    if (token === '--adminId' && next) {
      args.adminId = next
      index += 1
      continue
    }

    if (token === '--subdomain' && next) {
      args.subdomain = next
      index += 1
      continue
    }

    if (token === '--source' && next) {
      if (next === 'ru' || next === 'uz' || next === 'en') args.source = next
      index += 1
      continue
    }

    if (token === '--targets' && next) {
      const parsedTargets = next
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is Lang => value === 'ru' || value === 'uz' || value === 'en')
      args.targets = parsedTargets.length > 0 ? parsedTargets : args.targets
      index += 1
      continue
    }

    if (token === '--model' && next) {
      args.model = next
      index += 1
      continue
    }
  }

  // Remove source from targets if present.
  args.targets = args.targets.filter((lang) => lang !== args.source)
  if (args.targets.length === 0) {
    const defaultTargets: Lang[] = ['uz', 'en']
    args.targets = defaultTargets.filter((lang) => lang !== args.source)
  }

  return args
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeLangText(value: unknown): Text3 | null {
  if (!isRecord(value)) return null
  const uz = asNonEmptyString(value.uz) ?? ''
  const ru = asNonEmptyString(value.ru) ?? ''
  const en = asNonEmptyString(value.en) ?? ''
  if (uz === '' && ru === '' && en === '') return null
  return { uz, ru, en }
}

function pickSourceText(value: Text3, preferred: Lang): { text: string; lang: Lang } | null {
  const preferredText = value[preferred].trim()
  if (preferredText) return { text: preferredText, lang: preferred }

  const ordered: Lang[] = preferred === 'ru' ? ['uz', 'en'] : preferred === 'uz' ? ['ru', 'en'] : ['ru', 'uz']
  for (const lang of ordered) {
    const candidate = value[lang].trim()
    if (candidate) return { text: candidate, lang }
  }
  return null
}

function languageLabel(lang: Lang): string {
  if (lang === 'uz') return 'Uzbek'
  if (lang === 'ru') return 'Russian'
  return 'English'
}

async function translateText(
  genAI: GoogleGenerativeAI,
  opts: { model: string; from: Lang; to: Lang; text: string; cache: Map<string, string> }
): Promise<string> {
  const cacheKey = `${opts.model}:${opts.from}->${opts.to}:${opts.text}`
  const cached = opts.cache.get(cacheKey)
  if (cached) return cached

  const model = genAI.getGenerativeModel({ model: opts.model })
  const prompt = [
    'You are a professional translator.',
    `Translate from ${languageLabel(opts.from)} to ${languageLabel(opts.to)}.`,
    'Rules:',
    '- Preserve meaning and tone.',
    '- Keep placeholders like {siteName}, {count}, {subdomain} exactly as-is.',
    '- Return only the translated text, no quotes, no extra commentary.',
    '',
    opts.text,
  ].join('\n')

  const result = await model.generateContent(prompt)
  const response = await result.response
  const out = response.text().trim()
  const normalized = out.replace(/^["']|["']$/g, '').trim()

  opts.cache.set(cacheKey, normalized)
  return normalized
}

function fillText3(
  value: Text3,
  args: Pick<Args, 'source' | 'targets'>,
  translate: (from: Lang, to: Lang, text: string) => Promise<string>
): Promise<{ next: Text3; changed: boolean; filled: number }> {
  const source = pickSourceText(value, args.source)
  if (!source) return Promise.resolve({ next: value, changed: false, filled: 0 })

  const next: Text3 = { ...value }
  const work = args.targets.map(async (to) => {
    if (next[to].trim()) return 0
    const translated = await translate(source.lang, to, source.text)
    next[to] = translated
    return 1
  })

  return Promise.all(work).then((counts) => {
    const filled = counts.reduce((sum, item) => sum + item, 0 as number)
    return { next, changed: filled > 0, filled }
  })
}

function ensureSiteContentShape(raw: unknown): raw is {
  hero?: { title?: unknown; subtitle?: unknown; cta?: unknown }
  features?: Array<{ title?: unknown; description?: unknown; icon?: unknown }>
  pricing?: Array<{ name?: unknown; price?: unknown; features?: unknown[] }>
  about?: { title?: unknown; description?: unknown }
} {
  return isRecord(raw)
}

async function backfillWebsiteContent(
  parsed: unknown,
  args: Pick<Args, 'source' | 'targets'>,
  translate: (from: Lang, to: Lang, text: string) => Promise<string>
) {
  if (!ensureSiteContentShape(parsed)) {
    return { updated: parsed, changed: false, filled: 0 }
  }

  let filled = 0
  let changed = false
  const updated: Record<string, unknown> = { ...parsed }

  const hero = isRecord(parsed.hero) ? { ...parsed.hero } : null
  if (hero) {
    const title = normalizeLangText(hero.title)
    if (title) {
      const res = await fillText3(title, args, translate)
      hero.title = res.next
      filled += res.filled
      changed ||= res.changed
    }

    const subtitle = normalizeLangText(hero.subtitle)
    if (subtitle) {
      const res = await fillText3(subtitle, args, translate)
      hero.subtitle = res.next
      filled += res.filled
      changed ||= res.changed
    }

    const cta = normalizeLangText(hero.cta)
    if (cta) {
      const res = await fillText3(cta, args, translate)
      hero.cta = res.next
      filled += res.filled
      changed ||= res.changed
    }

    updated.hero = hero
  }

  const about = isRecord(parsed.about) ? { ...parsed.about } : null
  if (about) {
    const title = normalizeLangText(about.title)
    if (title) {
      const res = await fillText3(title, args, translate)
      about.title = res.next
      filled += res.filled
      changed ||= res.changed
    }

    const description = normalizeLangText(about.description)
    if (description) {
      const res = await fillText3(description, args, translate)
      about.description = res.next
      filled += res.filled
      changed ||= res.changed
    }

    updated.about = about
  }

  if (Array.isArray(parsed.features)) {
    const nextFeatures: Array<Record<string, unknown>> = []
    for (const feature of parsed.features) {
      if (!isRecord(feature)) continue
      const next = { ...feature }

      const title = normalizeLangText(feature.title)
      if (title) {
        const res = await fillText3(title, args, translate)
        next.title = res.next
        filled += res.filled
        changed ||= res.changed
      }

      const description = normalizeLangText(feature.description)
      if (description) {
        const res = await fillText3(description, args, translate)
        next.description = res.next
        filled += res.filled
        changed ||= res.changed
      }

      nextFeatures.push(next)
    }
    updated.features = nextFeatures
  }

  if (Array.isArray(parsed.pricing)) {
    const nextPricing: Array<Record<string, unknown>> = []
    for (const plan of parsed.pricing) {
      if (!isRecord(plan)) continue
      const next = { ...plan }

      const name = normalizeLangText(plan.name)
      if (name) {
        const res = await fillText3(name, args, translate)
        next.name = res.next
        filled += res.filled
        changed ||= res.changed
      }

      if (Array.isArray(plan.features)) {
        const nextPlanFeatures: unknown[] = []
        for (const feature of plan.features) {
          const asText3 = normalizeLangText(feature)
          if (!asText3) {
            nextPlanFeatures.push(feature)
            continue
          }
          const res = await fillText3(asText3, args, translate)
          nextPlanFeatures.push(res.next)
          filled += res.filled
          changed ||= res.changed
        }
        next.features = nextPlanFeatures
      }

      nextPricing.push(next)
    }
    updated.pricing = nextPricing
  }

  return { updated, changed, filled }
}

async function main() {
  const args = parseArgs(process.argv)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Set it to enable DB translation backfill.')
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Set it to connect and update Website.content.')
  }

  const prisma = new PrismaClient()
  const genAI = new GoogleGenerativeAI(apiKey)
  const cache = new Map<string, string>()

  try {
    const websites = await prisma.website.findMany({
      where: {
        ...(args.adminId ? { adminId: args.adminId } : {}),
        ...(args.subdomain ? { subdomain: args.subdomain } : {}),
      },
      select: { id: true, adminId: true, subdomain: true, content: true },
      orderBy: { updatedAt: 'desc' },
      take: args.limit,
    })

    let totalFilled = 0
    let updatedCount = 0
    let skipped = 0

    const translate = async (from: Lang, to: Lang, text: string) =>
      translateText(genAI, { model: args.model, from, to, text, cache })

    for (const website of websites) {
      const raw = website.content
      if (!raw) {
        skipped += 1
        continue
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        skipped += 1
        continue
      }

      const res = await backfillWebsiteContent(parsed, args, translate)
      totalFilled += res.filled
      if (!res.changed) continue

      updatedCount += 1
      if (args.apply) {
        await prisma.website.update({
          where: { id: website.id },
          data: { content: JSON.stringify(res.updated) },
        })
      }

      // Keep log output intentionally short so it is readable in CI/terminal.
      // eslint-disable-next-line no-console -- script output.
      console.log(
        `[${args.apply ? 'APPLIED' : 'DRY'}] subdomain=${website.subdomain} filled=${res.filled} websiteId=${website.id}`
      )
    }

    // eslint-disable-next-line no-console -- script output.
    console.log(
      `Done. websites_scanned=${websites.length} websites_updated=${updatedCount} fields_filled=${totalFilled} skipped=${skipped}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console -- script diagnostics.
  console.error(error)
  process.exitCode = 1
})
