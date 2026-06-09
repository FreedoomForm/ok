import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { generateWebsiteContent, type GeneratedSiteContent } from '@/lib/ai-site-generator'
import {
  DEFAULT_STYLE_VARIANT,
  RESERVED_SUBDOMAINS,
  SITE_RENDER_PAGES,
  buildThemePayload,
  getStylePreset,
  isValidSubdomain,
  normalizeSubdomain,
  parseSiteContent,
  parseThemePayload,
  updateSiteName,
} from '@/lib/site-builder'
import { buildSubdomainUrl } from '@/lib/subdomain-host'

function getHostBase() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
}

function buildFallbackSubdomain(adminName: string, adminId: string) {
  const namePart = normalizeSubdomain(adminName).slice(0, 18)
  const idPart = normalizeSubdomain(adminId).slice(0, 8)
  const candidate = normalizeSubdomain(`${namePart || 'site'}-${idPart || 'admin'}`)
  if (isValidSubdomain(candidate) && !RESERVED_SUBDOMAINS.has(candidate)) {
    return candidate
  }
  return `site-${idPart || 'admin'}`
}

function inferStyleVariantFromPrompt(prompt: string, current: string) {
  const normalized = prompt.toLowerCase()

  if (/(terminal|neon|cyber|dashboard|lime|matrix|tech)/.test(normalized)) {
    return 'neo-terminal' as const
  }

  if (/(retro|poster|bold|orange|editorial|campaign)/.test(normalized)) {
    return 'retro-poster' as const
  }

  if (/(paper|calm|minimal|luxury|serif|editorial|clean)/.test(normalized)) {
    return 'nordic-paper' as const
  }

  if (/(organic|warm|natural|earth|soft|healthy|wellness)/.test(normalized)) {
    return 'organic-warm' as const
  }

  return getStylePreset(current).id
}

const CONTENT_SECTIONS = ['hero', 'features', 'pricing', 'about'] as const
type ContentSection = (typeof CONTENT_SECTIONS)[number]
const EDIT_MODES = ['full_rebuild', 'merge_existing', 'section_patch'] as const
type EditMode = (typeof EDIT_MODES)[number]

function parseEditMode(value: unknown): EditMode {
  if (typeof value !== 'string') return 'full_rebuild'
  return (EDIT_MODES as readonly string[]).includes(value) ? (value as EditMode) : 'full_rebuild'
}

function parseSections(value: unknown): ContentSection[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<ContentSection>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    if ((CONTENT_SECTIONS as readonly string[]).includes(item)) {
      seen.add(item as ContentSection)
    }
  }
  return Array.from(seen)
}

function inferSectionsFromPrompt(prompt: string): ContentSection[] {
  const normalized = prompt.toLowerCase()
  const sections: ContentSection[] = []

  if (/(hero|headline|banner|first screen|above the fold)/.test(normalized)) {
    sections.push('hero')
  }
  if (/(feature|benefit|value prop|advantage)/.test(normalized)) {
    sections.push('features')
  }
  if (/(price|pricing|plan|tariff|cost|payment)/.test(normalized)) {
    sections.push('pricing')
  }
  if (/(about|company|story|mission|team)/.test(normalized)) {
    sections.push('about')
  }

  return Array.from(new Set(sections))
}

function withSubdomainSuffix(base: string, index: number) {
  const suffix = `-${index}`
  const maxBaseLength = Math.max(3, 32 - suffix.length)
  const trimmedBase = base.slice(0, maxBaseLength).replace(/-+$/g, '')
  return normalizeSubdomain(`${trimmedBase}${suffix}`)
}

async function resolveAvailableSubdomain(
  candidate: string,
  adminId: string,
  options: { autoResolve: boolean }
) {
  const normalizedCandidate = normalizeSubdomain(candidate)

  const isAllowed = (value: string) => isValidSubdomain(value) && !RESERVED_SUBDOMAINS.has(value)
  if (!isAllowed(normalizedCandidate)) {
    return {
      ok: false as const,
      error: 'Cannot apply update because the current subdomain is invalid or reserved.',
    }
  }

  const isTakenByAnotherAdmin = async (value: string) => {
    const conflict = await db.website.findFirst({
      where: {
        subdomain: value,
        NOT: { adminId },
      },
      select: { id: true },
    })
    return Boolean(conflict)
  }

  const initiallyTaken = await isTakenByAnotherAdmin(normalizedCandidate)
  if (!initiallyTaken) {
    return {
      ok: true as const,
      subdomain: normalizedCandidate,
      subdomainAdjusted: false,
    }
  }

  if (!options.autoResolve) {
    return {
      ok: false as const,
      error: 'Subdomain is already used by another middle-admin.',
    }
  }

  for (let index = 2; index <= 150; index += 1) {
    const candidateWithSuffix = withSubdomainSuffix(normalizedCandidate, index)
    if (!isAllowed(candidateWithSuffix)) continue
    const taken = await isTakenByAnotherAdmin(candidateWithSuffix)
    if (!taken) {
      return {
        ok: true as const,
        subdomain: candidateWithSuffix,
        subdomainAdjusted: true,
      }
    }
  }

  return {
    ok: false as const,
    error: 'Unable to find an available subdomain variant. Try another base subdomain.',
  }
}

function mergeSections(
  current: GeneratedSiteContent,
  generated: GeneratedSiteContent,
  sections: ContentSection[]
): GeneratedSiteContent {
  if (sections.length === 0) {
    return { ...current }
  }

  const next: GeneratedSiteContent = {
    ...current,
    hero: current.hero,
    features: current.features,
    pricing: current.pricing,
    about: current.about,
  }

  for (const section of sections) {
    if (section === 'hero') next.hero = generated.hero
    if (section === 'features') next.features = generated.features
    if (section === 'pricing') next.pricing = generated.pricing
    if (section === 'about') next.about = generated.about
  }

  return next
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
    const explicitApply = typeof body?.apply === 'boolean' ? body.apply : undefined
    const dryRun = body?.dryRun === true || body?.previewOnly === true
    const apply = dryRun ? false : explicitApply !== false
    const mode = parseEditMode(body?.mode)
    let requestedSections = parseSections(body?.sections)
    const requestedSiteName = typeof body?.siteName === 'string' ? body.siteName.trim().slice(0, 80) : ''
    const requestedSubdomainRaw = typeof body?.subdomain === 'string' ? body.subdomain : ''
    const requestedSubdomain = normalizeSubdomain(requestedSubdomainRaw)
    const autoResolveSubdomain = body?.autoResolveSubdomain !== false
    const requestedStyleVariant = typeof body?.styleVariant === 'string' ? body.styleVariant : ''
    const includeContentPreview = body?.includeContentPreview !== false
    const targetAdminId = typeof body?.targetAdminId === 'string' ? body.targetAdminId : ''

    if (prompt.length < 10) {
      return NextResponse.json(
        { error: 'Prompt must be at least 10 characters.' },
        { status: 400 }
      )
    }

    const editableAdminId = user.role === 'SUPER_ADMIN' && targetAdminId ? targetAdminId : user.id

    if (mode === 'section_patch' && requestedSections.length === 0) {
      requestedSections = inferSectionsFromPrompt(prompt)
    }

    const admin = await db.admin.findUnique({
      where: { id: editableAdminId },
      select: { id: true, name: true },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Target admin not found.' }, { status: 404 })
    }

    const fallbackName = admin?.name?.trim() || 'My Site'

    const existing = await db.website.findUnique({
      where: { adminId: editableAdminId },
      select: {
        id: true,
        subdomain: true,
        content: true,
        theme: true,
      },
    })

    const currentContent = parseSiteContent(existing?.content, fallbackName)
    const inferredSiteName =
      currentContent.about?.title?.en?.replace(/^About\s+/, '')?.trim() || fallbackName

    const currentVariant = parseThemePayload(existing?.theme).styleVariant || DEFAULT_STYLE_VARIANT
    const generatedContent = await generateWebsiteContent(prompt)
    const themedVariant = requestedStyleVariant
      ? getStylePreset(requestedStyleVariant).id
      : inferStyleVariantFromPrompt(prompt, currentVariant)
    const nextSiteName = requestedSiteName || inferredSiteName

    const sectionsToApply: ContentSection[] =
      mode === 'full_rebuild'
        ? [...CONTENT_SECTIONS]
        : requestedSections.length > 0
          ? requestedSections
          : [...CONTENT_SECTIONS]

    let updatedContent: GeneratedSiteContent
    if (mode === 'full_rebuild') {
      updatedContent = generatedContent
    } else {
      updatedContent = mergeSections(currentContent, generatedContent, sectionsToApply)
    }
    updatedContent = updateSiteName(updatedContent, nextSiteName)

    if (!apply) {
      const previewFallback = existing?.subdomain || buildFallbackSubdomain(fallbackName, editableAdminId)
      const previewRequestedValid =
        requestedSubdomain.length > 0 &&
        isValidSubdomain(requestedSubdomain) &&
        !RESERVED_SUBDOMAINS.has(requestedSubdomain)
      const previewSubdomain = previewRequestedValid ? requestedSubdomain : previewFallback

      return NextResponse.json({
        success: true,
        applied: false,
        mode,
        updatedSections: sectionsToApply,
        message: 'Generated website content preview only. Re-run with apply=true to persist changes.',
        website: {
          subdomain: previewSubdomain,
          requestedSubdomain: requestedSubdomain || undefined,
          subdomainAdjusted: Boolean(requestedSubdomain && requestedSubdomain !== previewSubdomain),
          siteName: nextSiteName,
          styleVariant: themedVariant,
        },
        renderPages: SITE_RENDER_PAGES,
        urls: {
          pathUrl: `/sites/${previewSubdomain}`,
          hostUrl: buildSubdomainUrl(previewSubdomain, getHostBase()),
        },
        ...(includeContentPreview ? { content: updatedContent } : {}),
      })
    }

    const subdomainCandidate =
      requestedSubdomain || existing?.subdomain || buildFallbackSubdomain(fallbackName, editableAdminId)
    const resolvedSubdomain = await resolveAvailableSubdomain(subdomainCandidate, editableAdminId, {
      autoResolve: autoResolveSubdomain,
    })

    if (!resolvedSubdomain.ok) {
      const status = /already used/i.test(resolvedSubdomain.error) ? 409 : 400
      return NextResponse.json({ error: resolvedSubdomain.error }, { status })
    }
    const subdomain = resolvedSubdomain.subdomain

    const updatedTheme = buildThemePayload(themedVariant)

    const website = await db.website.upsert({
      where: { adminId: editableAdminId },
      create: {
        adminId: editableAdminId,
        subdomain,
        theme: JSON.stringify(updatedTheme),
        content: JSON.stringify(updatedContent),
        chatEnabled: false,
      },
      update: {
        subdomain,
        theme: JSON.stringify(updatedTheme),
        content: JSON.stringify(updatedContent),
        chatEnabled: false,
      },
      select: {
        id: true,
        subdomain: true,
      },
    })

    return NextResponse.json({
      success: true,
      applied: true,
      mode,
      updatedSections: sectionsToApply,
      message: 'Subdomain website content updated from AI prompt.',
      website: {
        id: website.id,
        subdomain: website.subdomain,
        requestedSubdomain: requestedSubdomain || undefined,
        subdomainAdjusted: resolvedSubdomain.subdomainAdjusted,
        siteName: nextSiteName,
        styleVariant: themedVariant,
      },
      renderPages: SITE_RENDER_PAGES,
      urls: {
        pathUrl: `/sites/${website.subdomain}`,
        hostUrl: buildSubdomainUrl(website.subdomain, getHostBase()),
      },
      ...(includeContentPreview ? { content: updatedContent } : {}),
    })
  } catch (error) {
    // eslint-disable-next-line no-console -- route diagnostics for AI website edit failures.
    console.error('Error applying AI website edit:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Subdomain is already used by another middle-admin.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

