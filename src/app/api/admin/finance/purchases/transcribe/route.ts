import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { createGeminiClient, discoverGeminiModel, getGeminiConfiguration } from '@/lib/ai/config'
import { isSupportedAudioUpload, normalizeAudioMimeType, normalizeTranscript } from '@/lib/ai/transcription'


export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const audio = formData.get('audio')
    if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: 'Audio file is required', fallback: 'text' }, { status: 400 })
    if (audio.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Audio file is too large', fallback: 'text' }, { status: 413 })
    if (!isSupportedAudioUpload(audio.size, audio.type)) return NextResponse.json({ error: 'Unsupported audio type', fallback: 'text' }, { status: 415 })

    const configuration = getGeminiConfiguration()
    const genAI = createGeminiClient()
    if (!genAI || !configuration.apiKey) return NextResponse.json({ error: 'Audio transcription is unavailable; enter a transcript manually', fallback: 'text' }, { status: 503 })
    const modelName = await discoverGeminiModel(configuration.apiKey, process.env.GEMINI_TRANSCRIPTION_MODEL)
    if (!modelName) return NextResponse.json({ error: 'No supported transcription model is available; enter a transcript manually', fallback: 'text' }, { status: 503 })

    const bytes = Buffer.from(await audio.arrayBuffer())
    const mimeType = normalizeAudioMimeType(audio.type)
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: 'Transcribe the supplied audio faithfully. Return only the spoken text, with no markdown, explanation, or invented words.',
    })
    const result = await model.generateContent([{ inlineData: { data: bytes.toString('base64'), mimeType } }])
    const transcript = normalizeTranscript(result.response.text())
    if (!transcript) return NextResponse.json({ error: 'The audio produced no transcript; enter text manually', fallback: 'text' }, { status: 422 })

    return NextResponse.json({ transcript, source: 'server-audio', requiresConfirmation: true })
  } catch (error) {
    console.error('Audio transcription unavailable:', error)
    return NextResponse.json({ error: 'Audio transcription is unavailable; enter a transcript manually', fallback: 'text' }, { status: 503 })
  }
}
