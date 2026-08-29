import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { createGeminiClient, discoverGeminiModelWithCache, getGeminiConfiguration } from '@/lib/ai/config'
import { groundPurchaseSuggestion } from '@/lib/ai/purchase-assistant'

const requestSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  audioTranscript: z.string().trim().max(5000).optional(),
}).strict()

function parseModelJson(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) as unknown } catch { return null }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = requestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid assistant request' }, { status: 400 })
    const inventory = await db.warehouseItem.findMany({ where: { isActive: true, deletedAt: null }, select: { name: true, unit: true, pricePerUnit: true }, orderBy: { name: 'asc' }, take: 1000 })
    const prompt = `${parsed.data.text}\n${parsed.data.audioTranscript ?? ''}`.trim()
    const configuration = getGeminiConfiguration()
    const genAI = createGeminiClient()
    if (!genAI || !configuration.apiKey) return NextResponse.json({ error: 'AI provider is not configured' }, { status: 503 })
    const modelName = await discoverGeminiModelWithCache(configuration.apiKey, process.env.GEMINI_PURCHASE_MODEL)
    if (!modelName) return NextResponse.json({ error: 'No supported AI purchase model is available' }, { status: 503 })
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: 'Return JSON only with this exact shape: {"items":[{"name":"known inventory name","amount":1,"unit":"known inventory unit"}]}. Use only names and units from the inventory context. Never invent prices. Do not include extra keys.',
    })
    const result = await model.generateContent(`Inventory context:\n${JSON.stringify(inventory)}\nRequest:\n${prompt}`)
    const modelJson = parseModelJson(result.response.text())
    const grounded = groundPurchaseSuggestion(modelJson, inventory)
    return NextResponse.json({
      requiresConfirmation: true,
      items: grounded.items,
      rejected: grounded.rejected,
      source: parsed.data.audioTranscript ? 'audio-transcript' : 'text',
      message: grounded.rejected.length ? 'Some items were rejected because they were not fully grounded in inventory.' : 'Review and confirm this purchase before completion.',
    })
  } catch (error) {
    console.error('Error generating grounded purchase suggestion:', error)
    return NextResponse.json({ error: 'AI purchase assistant failed' }, { status: 500 })
  }
}
