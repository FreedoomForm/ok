import { z } from 'zod'

const startDayPayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты (ожидается YYYY-MM-DD)'),
})

export function parseStartDayDate(raw: unknown, now = new Date()) {
  const parsed = startDayPayloadSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid payload' as const }
  }

  const { date } = parsed.data
  const start = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
    return { error: 'Неверная календарная дата' as const }
  }

  const todayISO = now.toISOString().slice(0, 10)
  if (date !== todayISO) {
    return { error: 'Можно начать только заказы за сегодня' as const }
  }

  return {
    date,
    start,
    end: new Date(`${date}T23:59:59.999Z`),
  }
}
