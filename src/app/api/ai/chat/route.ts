import { NextRequest, NextResponse } from 'next/server'
import { orchestrateTask } from '@/lib/ai/orchestrator'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { createGeminiClient } from '@/lib/ai/config'
import { aiChatRequestSchema } from '@/lib/ai/chat-input'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const parsed = aiChatRequestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Invalid request' },
                { status: 400 }
            )
        }

        const { message, websiteId, history } = parsed.data
        const genAI = createGeminiClient()
        if (!genAI) {
            return NextResponse.json(
                { error: 'AI provider is not configured', response: 'AI-сервис временно недоступен. Обратитесь к администратору.' },
                { status: 503 }
            )
        }

        // Build conversation context from history
        const historyContext = history
            ?.slice(-5)
            .map((msg: { role: string; content: string }) =>
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            )
            .join('\n') || ''

        // Check if this is a complex task that needs orchestration
        const isComplexTask = message.toLowerCase().match(
            /(создай|добавь|удали|измени|сделай|настрой|create|add|delete|modify|make|setup)/
        )

        if (isComplexTask) {
            // Use orchestrator for complex tasks
            const orchestratorResult = await orchestrateTask(message, {
                adminId: user.id,
                websiteData: websiteId ? { id: websiteId } : undefined
            })

            if (orchestratorResult.success) {
                return NextResponse.json({
                    response: orchestratorResult.summary,
                    tasks: orchestratorResult.tasks,
                    isOrchestrated: true
                })
            }
        }

        // Simple chat response
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: `Ты AI ассистент для no-code платформы AutoFood.
Ты помогаешь пользователям управлять их рабочим пространством, базой данных и веб-сайтами.

Возможности:
- Работа с таблицами (создание вкладок, столбцов, строк)
- Управление клиентами и заказами
- Настройка веб-сайтов
- Формулы Excel (SUM, AVERAGE, IF, и т.д.)

Отвечай кратко и по делу на русском языке.
Если пользователь просит выполнить действие, объясни что нужно сделать.

Контекст разговора:
${historyContext}`
        })

        const result = await model.generateContent(message)
        const response = result.response.text()

        return NextResponse.json({
            response,
            tasks: [],
            isOrchestrated: false
        })

    } catch (error) {
        console.error('AI Chat error:', error)
        return NextResponse.json(
            {
                error: 'Failed to process message',
                response: 'Произошла ошибка при обработке запроса. Попробуйте еще раз.'
            },
            { status: 500 }
        )
    }
}
