import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError } from '@/modules/shared/errors'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { orchestrateTask } from '@/lib/ai/orchestrator'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user, request }) => {
    const body = await request.json()
    const { message, websiteId, history } = body

    if (!message) {
      throw new BadRequestError('Message is required')
    }

    // Build conversation context from history
    const historyContext = history
      ?.slice(-5)
      .map((msg: { role: string; content: string }) =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`,
      )
      .join('\n') || ''

    // Check if this is a complex task that needs orchestration
    const isComplexTask = message.toLowerCase().match(
      /(создай|добавь|удали|измени|сделай|настрой|create|add|delete|modify|make|setup)/,
    )

    if (isComplexTask) {
      // Use orchestrator for complex tasks
      const orchestratorResult = await orchestrateTask(message, {
        adminId: user.id,
        websiteData: websiteId ? { id: websiteId } : undefined,
      })

      if (orchestratorResult.success) {
        return {
          data: {
            response: orchestratorResult.summary,
            tasks: orchestratorResult.tasks,
            isOrchestrated: true,
          },
        }
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
${historyContext}`,
    })

    const result = await model.generateContent(message)
    const response = result.response.text()

    return {
      data: {
        response,
        tasks: [],
        isOrchestrated: false,
      },
    }
  },
})
