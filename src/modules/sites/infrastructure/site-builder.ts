import type { GeneratedSiteContent } from '@/lib/ai-site-generator'

export const SITE_RENDER_PAGES = [
  { id: 'landing', label: 'Landing' },
  { id: 'login', label: 'Login' },
  { id: 'register', label: 'Register' },
  { id: 'history', label: 'History' },
  { id: 'client', label: 'Client Home' },
] as const

export type SiteRenderPageId = (typeof SITE_RENDER_PAGES)[number]['id']

export type SiteStyleVariant = 'nordic-paper' | 'retro-poster' | 'organic-warm' | 'neo-terminal'

export type SitePalette = {
  pageBackground: string
  panelBackground: string
  textPrimary: string
  textMuted: string
  border: string
  accent: string
  accentSoft: string
  heroFrom: string
  heroTo: string
  heroText: string
}

export type SiteStylePreset = {
  id: SiteStyleVariant
  title: string
  description: string
  headingClass: string
  bodyClass: string
  palette: SitePalette
}

export const DEFAULT_STYLE_VARIANT: SiteStyleVariant = 'organic-warm'

export const SITE_STYLE_PRESETS: SiteStylePreset[] = [
  {
    id: 'nordic-paper',
    title: 'Nordic Paper',
    description: 'Editorial and calm style with airy spacing',
    headingClass: 'font-serif',
    bodyClass: 'font-sans',
    palette: {
      pageBackground: '#f5f4ef',
      panelBackground: '#ffffff',
      textPrimary: '#111827',
      textMuted: '#475569',
      border: '#d9d8d3',
      accent: '#0f766e',
      accentSoft: '#ccfbf1',
      heroFrom: '#f0fdf4',
      heroTo: '#e2e8f0',
      heroText: '#0f172a',
    },
  },
  {
    id: 'retro-poster',
    title: 'Retro Poster',
    description: 'Bold contrast blocks and energetic accents',
    headingClass: 'font-mono',
    bodyClass: 'font-sans',
    palette: {
      pageBackground: '#fff7ed',
      panelBackground: '#ffffff',
      textPrimary: '#1f2937',
      textMuted: '#7c2d12',
      border: '#fdba74',
      accent: '#ea580c',
      accentSoft: '#ffedd5',
      heroFrom: '#fb923c',
      heroTo: '#facc15',
      heroText: '#111827',
    },
  },
  {
    id: 'organic-warm',
    title: 'Organic Warm',
    description: 'Natural gradients and soft earthy cards',
    headingClass: 'font-serif',
    bodyClass: 'font-sans',
    palette: {
      pageBackground: '#fefce8',
      panelBackground: '#ffffff',
      textPrimary: '#27272a',
      textMuted: '#52525b',
      border: '#fde68a',
      accent: '#ca8a04',
      accentSoft: '#fef3c7',
      heroFrom: '#fef3c7',
      heroTo: '#fde68a',
      heroText: '#3f3f46',
    },
  },
  {
    id: 'neo-terminal',
    title: 'Neo Terminal',
    description: 'Dark dashboard vibe with lime highlights',
    headingClass: 'font-mono',
    bodyClass: 'font-sans',
    palette: {
      pageBackground: '#09090b',
      panelBackground: '#18181b',
      textPrimary: '#e4e4e7',
      textMuted: '#a1a1aa',
      border: '#3f3f46',
      accent: '#84cc16',
      accentSoft: '#365314',
      heroFrom: '#14532d',
      heroTo: '#052e16',
      heroText: '#ecfccb',
    },
  },
]

export type SiteThemePayload = {
  styleVariant: SiteStyleVariant
  palette: SitePalette
}

export function getStylePreset(id: string | null | undefined): SiteStylePreset {
  const fallback = SITE_STYLE_PRESETS.find((preset) => preset.id === DEFAULT_STYLE_VARIANT)!
  if (!id) return fallback
  return SITE_STYLE_PRESETS.find((preset) => preset.id === id) ?? fallback
}

export function buildThemePayload(styleVariant: SiteStyleVariant): SiteThemePayload {
  const style = getStylePreset(styleVariant)
  return {
    styleVariant: style.id,
    palette: style.palette,
  }
}

export function parseThemePayload(raw: string | null | undefined): SiteThemePayload {
  if (!raw) {
    return buildThemePayload(DEFAULT_STYLE_VARIANT)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SiteThemePayload>
    const style = getStylePreset(parsed.styleVariant)
    return {
      styleVariant: style.id,
      palette: {
        ...style.palette,
        ...(parsed.palette ?? {}),
      },
    }
  } catch {
    return buildThemePayload(DEFAULT_STYLE_VARIANT)
  }
}

function withSiteName(text: string, siteName: string) {
  return text.replace(/\{siteName\}/g, siteName)
}

export function buildDefaultSiteContent(siteName: string): GeneratedSiteContent {
  return {
    hero: {
      title: {
        uz: withSiteName('{siteName} - Kundalik soglom ovqatlar', siteName),
        ru: withSiteName('{siteName} - Ezhednevnye poleznye obedy', siteName),
        en: withSiteName('{siteName} - Daily healthy meals', siteName),
      },
      subtitle: {
        uz: 'Profilingiz, bugungi menyu va buyurtmalar bir joyda.',
        ru: 'Profil, segodnyashnee menyu i istoriya zakazov v odnom kabinete.',
        en: 'Profile, today menu, and order history in one place.',
      },
      cta: {
        uz: 'Kabinetga kirish',
        ru: 'Voyti v kabinet',
        en: 'Open client area',
      },
    },
    features: [
      {
        icon: 'Leaf',
        title: {
          uz: 'Shaxsiy menyu',
          ru: 'Personalnoe menyu',
          en: 'Personal menu',
        },
        description: {
          uz: 'Middle admin sozlagan kunlik taomlar.',
          ru: 'Dnevnye blyuda po nastroikam middle admina.',
          en: 'Daily dishes based on middle-admin configuration.',
        },
      },
      {
        icon: 'Wallet',
        title: {
          uz: 'Balans nazorati',
          ru: 'Kontrol balansa',
          en: 'Balance tracking',
        },
        description: {
          uz: 'Balans va tarixni real vaqtga yaqin ko ring.',
          ru: 'Smotrite balans i istoriyu pochti v realnom vremeni.',
          en: 'Check your balance and history in near real time.',
        },
      },
    ],
    pricing: [
      {
        name: {
          uz: 'Standart',
          ru: 'Standart',
          en: 'Standard',
        },
        price: 'From your admin plan',
        features: [
          {
            uz: 'Menyu va yetkazib berish',
            ru: 'Menyu i dostavka',
            en: 'Daily menu and delivery',
          },
          {
            uz: 'Shaxsiy kabinet',
            ru: 'Lichnyi kabinet',
            en: 'Private client cabinet',
          },
        ],
      },
    ],
    about: {
      title: {
        uz: withSiteName('{siteName} haqida', siteName),
        ru: withSiteName('O servise {siteName}', siteName),
        en: withSiteName('About {siteName}', siteName),
      },
      description: {
        uz: 'Har bir mijozga moslashtirilgan taom va xizmat.',
        ru: 'Servis s personalnym podhodom k kazhdomu klientu.',
        en: 'A personalized service for each customer.',
      },
    },
  }
}

export function parseSiteContent(raw: string | null | undefined, siteName: string): GeneratedSiteContent {
  if (!raw) return buildDefaultSiteContent(siteName)
  try {
    const parsed = JSON.parse(raw) as GeneratedSiteContent
    if (!parsed || typeof parsed !== 'object') return buildDefaultSiteContent(siteName)
    return parsed
  } catch {
    return buildDefaultSiteContent(siteName)
  }
}

export function updateSiteName(content: GeneratedSiteContent, siteName: string): GeneratedSiteContent {
  return {
    ...content,
    hero: {
      ...content.hero,
      title: {
        uz: withSiteName('{siteName} - Kundalik soglom ovqatlar', siteName),
        ru: withSiteName('{siteName} - Ezhednevnye poleznye obedy', siteName),
        en: withSiteName('{siteName} - Daily healthy meals', siteName),
      },
    },
    about: {
      ...content.about,
      title: {
        uz: withSiteName('{siteName} haqida', siteName),
        ru: withSiteName('O servise {siteName}', siteName),
        en: withSiteName('About {siteName}', siteName),
      },
    },
  }
}

export function normalizeSubdomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidSubdomain(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(value)
}

export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'middle-admin',
  'low-admin',
  'super-admin',
  'login',
  'signup',
  'register',
  'sites',
  'dashboard',
])
