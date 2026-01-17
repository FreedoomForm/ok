import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { orchestrateTask } from '@/lib/ai/orchestrator'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { message, adminId, websiteId, history } = body

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
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
                adminId,
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
