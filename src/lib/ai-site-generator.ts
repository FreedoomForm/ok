import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  // eslint-disable-next-line no-console -- local diagnostics when Gemini is not configured.
  console.warn('GEMINI_API_KEY is not defined. Falling back to deterministic site generation.')
}

const genAI = new GoogleGenerativeAI(apiKey || '')

export interface GeneratedSiteContent {
  hero: {
    title: { uz: string; ru: string; en: string }
    subtitle: { uz: string; ru: string; en: string }
    cta: { uz: string; ru: string; en: string }
  }
  features: Array<{
    title: { uz: string; ru: string; en: string }
    description: { uz: string; ru: string; en: string }
    icon: string
  }>
  pricing: Array<{
    name: { uz: string; ru: string; en: string }
    price: string
    features: Array<{ uz: string; ru: string; en: string }>
  }>
  about: {
    title: { uz: string; ru: string; en: string }
    description: { uz: string; ru: string; en: string }
  }
}

function trimPrompt(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim()
}

function fallbackCopy(
  prompt: string,
  language: 'uz' | 'ru' | 'en',
  type: 'title' | 'subtitle' | 'cta' | 'aboutTitle' | 'aboutDescription'
) {
  const compact = trimPrompt(prompt)

  if (language === 'en') {
    if (type === 'title') return compact ? `A better client portal for ${compact}` : 'A better client portal for daily meal delivery'
    if (type === 'subtitle') return compact ? `Updated from your request: ${compact}. Clients can track plans, menus, balance, and delivery status in one place.` : 'Clients can track plans, menus, balance, and delivery status in one place.'
    if (type === 'cta') return 'Open client portal'
    if (type === 'aboutTitle') return 'About this service'
    return compact ? `This website was updated from the prompt: ${compact}. It is optimized for clearer customer onboarding and daily order visibility.` : 'This website is optimized for clearer customer onboarding and daily order visibility.'
  }

  if (language === 'ru') {
    if (type === 'title') return compact ? `Obnovlennyi klientskii portal dlya: ${compact}` : 'Obnovlennyi klientskii portal dlya ezhednevnoi dostavki'
    if (type === 'subtitle') return compact ? `Portal obnovlen po zaprosu: ${compact}. Klient vidit balans, menyu, plan i status dostavki v odnom meste.` : 'Klient vidit balans, menyu, plan i status dostavki v odnom meste.'
    if (type === 'cta') return 'Otkryt kabinet'
    if (type === 'aboutTitle') return 'O servise'
    return compact ? `Sait obnovlen na osnove zaprosa: ${compact}. On luchshe obyasnyaet servis i uporyadochivaet klientskii put.` : 'Sait luchshe obyasnyaet servis i uporyadochivaet klientskii put.'
  }

  if (type === 'title') return compact ? `Yangilangan mijoz portali: ${compact}` : 'Kundalik yetkazib berish uchun yangilangan mijoz portali'
  if (type === 'subtitle') return compact ? `Portal sizning sorovingiz asosida yangilandi: ${compact}. Mijoz balans, menyu, tarif va yetkazib berish holatini bir joyda koradi.` : 'Mijoz balans, menyu, tarif va yetkazib berish holatini bir joyda koradi.'
  if (type === 'cta') return 'Kabinetni ochish'
  if (type === 'aboutTitle') return 'Xizmat haqida'
  return compact ? `Sayt sizning sorovingiz asosida yangilandi: ${compact}. U mijoz uchun aniqroq yol va qulayroq foydalanishni beradi.` : 'Sayt mijoz uchun aniqroq yol va qulayroq foydalanishni beradi.'
}

function generateFallbackWebsiteContent(prompt: string): GeneratedSiteContent {
  const compact = trimPrompt(prompt)

  return {
    hero: {
      title: {
        uz: fallbackCopy(compact, 'uz', 'title'),
        ru: fallbackCopy(compact, 'ru', 'title'),
        en: fallbackCopy(compact, 'en', 'title'),
      },
      subtitle: {
        uz: fallbackCopy(compact, 'uz', 'subtitle'),
        ru: fallbackCopy(compact, 'ru', 'subtitle'),
        en: fallbackCopy(compact, 'en', 'subtitle'),
      },
      cta: {
        uz: fallbackCopy(compact, 'uz', 'cta'),
        ru: fallbackCopy(compact, 'ru', 'cta'),
        en: fallbackCopy(compact, 'en', 'cta'),
      },
    },
    features: [
      {
        title: {
          uz: 'Mijoz uchun aniq kabinet',
          ru: 'Ponatnyi kabinet klienta',
          en: 'Clear client dashboard',
        },
        description: {
          uz: 'Balans, menyu, tarix va buyurtma holati bir joyga jamlandi.',
          ru: 'Balans, menyu, istoriya i status zakaza sobrany v odnom interfeise.',
          en: 'Balance, menu, history, and order status are grouped into one interface.',
        },
        icon: 'Shield',
      },
      {
        title: {
          uz: 'Kuchli birinchi taassurot',
          ru: 'Silnyi pervyi ekran',
          en: 'Stronger first impression',
        },
        description: {
          uz: compact ? `Dizayn prompt asosida boyitildi: ${compact}.` : 'Dizayn yanada boy, aniq va ishonchli korinishga keltirildi.',
          ru: compact ? `Dizain usilen po zaprosu: ${compact}.` : 'Dizain stal bolee bogatym, yasnym i doveritelnym.',
          en: compact ? `The design was strengthened around this request: ${compact}.` : 'The design was made richer, clearer, and more trustworthy.',
        },
        icon: 'Sparkles',
      },
      {
        title: {
          uz: 'Operatsion malumotga yaqin',
          ru: 'Blizhe k operatsionnym dannym',
          en: 'Closer to live operations',
        },
        description: {
          uz: 'Mijozlar kundalik xizmat holatini tezroq tushunadi.',
          ru: 'Klienty bystree ponimayut tekushchee sostoyanie servisa.',
          en: 'Customers understand the current service state faster.',
        },
        icon: 'Zap',
      },
    ],
    pricing: [
      {
        name: {
          uz: 'Asosiy tarif',
          ru: 'Osnovnoi plan',
          en: 'Core plan',
        },
        price: 'Configured by admin',
        features: [
          {
            uz: 'Kunlik menyu va tarix',
            ru: 'Ezhednevnoe menyu i istoriya',
            en: 'Daily menu and history',
          },
          {
            uz: 'Shaxsiy kabinet va balans',
            ru: 'Lichnyi kabinet i balans',
            en: 'Private dashboard and balance',
          },
        ],
      },
    ],
    about: {
      title: {
        uz: fallbackCopy(compact, 'uz', 'aboutTitle'),
        ru: fallbackCopy(compact, 'ru', 'aboutTitle'),
        en: fallbackCopy(compact, 'en', 'aboutTitle'),
      },
      description: {
        uz: fallbackCopy(compact, 'uz', 'aboutDescription'),
        ru: fallbackCopy(compact, 'ru', 'aboutDescription'),
        en: fallbackCopy(compact, 'en', 'aboutDescription'),
      },
    },
  }
}

const DATABASE_CONTEXT = `
## Available Database Models for This Middle Admin:

### Customer (Client)
- id: Unique identifier
- name: Client name
- phone: Phone number (unique)
- address: Delivery address
- calories: Daily calorie target
- preferences: Special dietary needs/features
- deliveryDays: JSON array of delivery days
- autoOrdersEnabled: Whether auto-orders are enabled
- isActive: Whether the client is active
- createdAt: Account creation date
- orders: List of all orders

### Order
- id: Unique identifier
- customerId: Link to Customer
- orderStatus: PENDING | CONFIRMED | COOKING | ON_WAY | DELIVERED | CANCELLED
- deliveryTime: Scheduled delivery time
- calories: Calories in this order
- specialFeatures: Special instructions
- courier: Assigned courier info

### Courier
- id: Unique identifier
- name: Courier name
- phone: Phone number
- status: AVAILABLE | ON_DELIVERY | OFFLINE

## Data Flow:
1. Middle Admin creates Customers (clients) with their settings
2. Orders are created for each Customer (automatically or manually)
3. Couriers are assigned to deliver orders
4. Customers can view their orders, calories, and status via the generated website
`

export async function generateWebsiteContent(prompt: string): Promise<GeneratedSiteContent> {
  if (!apiKey) {
    return generateFallbackWebsiteContent(prompt)
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const systemPrompt = `
You are an expert web designer and copywriter for a food delivery management platform.

${DATABASE_CONTEXT}

## Your Task:
Generate website content for a client portal based on their description.
The content MUST be in 3 languages: Uzbek (uz), Russian (ru), and English (en).

## Client Description:
"${prompt}"

## Generated Features Should Know:
- Each Middle Admin has their own set of Customers (clients)
- Each Customer can log in to see ONLY their own orders and data
- The website connects to the Middle Admin's database automatically
- All data queries are scoped to the Middle Admin who created the website

Return ONLY valid JSON matching this structure:
{
  "hero": {
    "title": { "uz": "", "ru": "", "en": "" },
    "subtitle": { "uz": "", "ru": "", "en": "" },
    "cta": { "uz": "", "ru": "", "en": "" }
  },
  "features": [
    {
      "title": { "uz": "", "ru": "", "en": "" },
      "description": { "uz": "", "ru": "", "en": "" },
      "icon": "lucide-react-icon-name"
    }
  ],
  "pricing": [
    {
      "name": { "uz": "", "ru": "", "en": "" },
      "price": "",
      "features": [{ "uz": "", "ru": "", "en": "" }]
    }
  ],
  "about": {
    "title": { "uz": "", "ru": "", "en": "" },
    "description": { "uz": "", "ru": "", "en": "" }
  }
}

Ensure the tone is professional, engaging, and persuasive.
For icons, use valid Lucide React icon names (e.g., "Zap", "Shield", "Heart", "Leaf").
`

  try {
    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const text = response.text()
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(jsonStr)
  } catch {
    return generateFallbackWebsiteContent(prompt)
  }
}
