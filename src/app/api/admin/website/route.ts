import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import {
  DEFAULT_STYLE_VARIANT,
  RESERVED_SUBDOMAINS,
  SITE_RENDER_PAGES,
  SITE_STYLE_PRESETS,
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = await db.admin.findUnique({
      where: { id: user.id },
      select: { name: true },
    })
    const fallbackName = admin?.name || 'My Site'

    const website = await db.website.findUnique({
      where: { adminId: user.id },
      select: {
        id: true,
        subdomain: true,
        theme: true,
        content: true,
        chatEnabled: true,
      },
    })

    const existingTheme = parseThemePayload(website?.theme)
    const stylePreset = SITE_STYLE_PRESETS.find((preset) => preset.id === existingTheme.styleVariant)
    const inferredSiteName = website
      ? parseSiteContent(website.content, fallbackName).about.title.en.replace(/^About\s+/, '') || fallbackName
      : fallbackName

    return NextResponse.json({
      website: {
        id: website?.id ?? null,
        subdomain: website?.subdomain ?? '',
        siteName: inferredSiteName,
        styleVariant: stylePreset?.id ?? DEFAULT_STYLE_VARIANT,
        chatEnabled: false,
        style: stylePreset ?? SITE_STYLE_PRESETS[0],
      },
      presets: SITE_STYLE_PRESETS,
      renderPages: SITE_RENDER_PAGES,
      baseHost: getHostBase(),
    })
  } catch (error) {
    console.error('Error fetching website settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = await db.admin.findUnique({
      where: { id: user.id },
      select: { name: true },
    })
    const fallbackName = admin?.name || 'My Site'

    const body = await request.json()
    const rawSubdomain = typeof body.subdomain === 'string' ? body.subdomain : ''
    const subdomain = normalizeSubdomain(rawSubdomain)
    const siteName = typeof body.siteName === 'string' && body.siteName.trim().length > 0
      ? body.siteName.trim().slice(0, 80)
      : fallbackName
    const styleVariant = typeof body.styleVariant === 'string' ? body.styleVariant : DEFAULT_STYLE_VARIANT
    const chatEnabled = false

    if (!isValidSubdomain(subdomain)) {
      return NextResponse.json({ error: 'Subdomain must be 3-32 chars using letters, numbers, and hyphens' }, { status: 400 })
    }

    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return NextResponse.json({ error: 'This subdomain is reserved' }, { status: 400 })
    }

    const existing = await db.website.findUnique({
      where: { adminId: user.id },
      select: { id: true, content: true },
    })

    const normalizedVariant = getStylePreset(styleVariant).id
    const updatedTheme = buildThemePayload(normalizedVariant)
    const existingContent = parseSiteContent(existing?.content, siteName)
    const updatedContent = updateSiteName(existingContent, siteName)

    const website = await db.website.upsert({
      where: { adminId: user.id },
      create: {
        adminId: user.id,
        subdomain,
        theme: JSON.stringify(updatedTheme),
        content: JSON.stringify(updatedContent),
        chatEnabled,
      },
      update: {
        subdomain,
        theme: JSON.stringify(updatedTheme),
        content: JSON.stringify(updatedContent),
        chatEnabled,
      },
      select: {
        id: true,
        subdomain: true,
        chatEnabled: true,
      },
    })

    return NextResponse.json({
      success: true,
      website: {
        id: website.id,
        subdomain: website.subdomain,
        siteName,
        chatEnabled: false,
        styleVariant: updatedTheme.styleVariant,
      },
      urls: {
        pathUrl: `/sites/${website.subdomain}`,
        hostUrl: buildSubdomainUrl(website.subdomain, getHostBase()),
      },
    })
  } catch (error) {
    console.error('Error saving website settings:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Subdomain is already used by another middle-admin' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

