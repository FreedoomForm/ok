import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined. AI generation will fail.')
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
    chatEnabled: boolean
}

// Database schema context for Gemini to understand the data structure
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

// Check if prompt mentions chat or community features
function detectChatRequest(prompt: string): boolean {
    const chatKeywords = [
        'chat', 'чат', 'suhbat', 'community', 'сообщество', 'jamoa',
        'message', 'сообщение', 'xabar', 'talk', 'communicate', 'discuss'
    ]
    const lowerPrompt = prompt.toLowerCase()
    return chatKeywords.some(keyword => lowerPrompt.includes(keyword))
}

export async function generateWebsiteContent(prompt: string): Promise<GeneratedSiteContent> {
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing')
    }

    const chatEnabled = detectChatRequest(prompt)

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
${chatEnabled ? '- CHAT IS ENABLED: Clients can chat with each other (only clients of the same Middle Admin)' : ''}

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
  },
  "chatEnabled": ${chatEnabled}
}

Ensure the tone is professional, engaging, and persuasive.
For icons, use valid Lucide React icon names (e.g., "Zap", "Shield", "Heart", "Leaf", "MessageCircle").
`

    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const text = response.text()

    try {
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(jsonStr)
        // Ensure chatEnabled is set based on our detection
        parsed.chatEnabled = chatEnabled
        return parsed
    } catch (error) {
        console.error('Failed to parse AI response:', text)
        throw new Error('Failed to generate valid JSON content')
    }
}
