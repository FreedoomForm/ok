import type { Prisma, PrismaClient } from '@prisma/client'

export type CourierAssignmentNotificationInput = {
  courierName: string
  orderNumbers: readonly number[]
  dateRange: string
}

export function buildCourierAssignmentNotification(input: CourierAssignmentNotificationInput) {
  const numbers = input.orderNumbers.slice(0, 10).join(', ')
  const remaining = Math.max(0, input.orderNumbers.length - 10)
  const suffix = remaining > 0 ? ` и ещё ${remaining}` : ''
  return `Курьер ${input.courierName} получил заказы: ${numbers}${suffix}. Период: ${input.dateRange}.`
}

export type ContractAssignmentNotificationInput = {
  courierName: string
  contractId: string
  dateRange: string
  weekdays: readonly string[]
  orderNumbers: readonly number[]
  status: string
}

export function buildContractAssignmentNotification(input: ContractAssignmentNotificationInput) {
  const numbers = input.orderNumbers.slice(0, 10).join(', ') || 'пока нет'
  const remaining = Math.max(0, input.orderNumbers.length - 10)
  const suffix = remaining > 0 ? ` и ещё ${remaining}` : ''
  return `Назначен контракт ${input.contractId} для курьера ${input.courierName}. Период: ${input.dateRange}; дни: ${input.weekdays.slice(0, 7).join(', ')}; заказы: ${numbers}${suffix}; статус: ${input.status}.`
}

export type CourierDayListRow = {
  orderNumber: number
  customerName: string
  address: string
  deliveryTime: string
}

export type CourierDayListNotificationInput = {
  courierName: string
  date: string
  rows: readonly CourierDayListRow[]
}

/**
 * C6 / R8+R10: the day-list message the scheduler posts to the assigned
 * courier on every assigned weekday — the chat-visible list of that day's
 * orders (the spec's «в каждый назначенный день курьер будет получать
 * уведомления в странице чата»).
 */
export function buildCourierDayListNotification(input: CourierDayListNotificationInput) {
  const head = `Заказы на ${input.date} для курьера ${input.courierName}:`
  if (input.rows.length === 0) return `${head} пока нет заказов.`
  const lines = input.rows.slice(0, 10).map((row) => `#${row.orderNumber} — ${row.customerName}, ${row.address}, ${row.deliveryTime}`)
  const remaining = Math.max(0, input.rows.length - 10)
  const suffix = remaining > 0 ? `… и ещё ${remaining}` : ''
  return [head, ...lines, suffix].filter(Boolean).join('\n')
}

type DayListDb = Prisma.TransactionClient | PrismaClient

export function courierDayListSystemCode(dateKey: string): string {
  return `COURIER_DAY_LIST:${dateKey.slice(0, 10)}`
}

/**
 * Idempotent day-list notification: one SYSTEM message per (courier, date) —
 * the scheduler may run several times a day, and re-runs must not duplicate
 * the courier's list.
 */
export async function createCourierDayListNotification(
  db: DayListDb,
  input: { actorAdminId: string; courierId: string; dateKey: string; content: string },
) {
  const [participant1Id, participant2Id] = [input.actorAdminId, input.courierId].sort()
  const systemCode = courierDayListSystemCode(input.dateKey)
  const now = new Date()
  const conversation = await db.conversation.upsert({
    where: { participant1Id_participant2Id: { participant1Id, participant2Id } },
    update: { lastMessage: input.content, lastMessageAt: now },
    create: { participant1Id, participant2Id, isSystem: false, lastMessage: input.content, lastMessageAt: now },
    select: { id: true },
  })
  const existing = await db.message.findFirst({
    where: { conversationId: conversation.id, systemCode },
    select: { id: true },
  })
  if (existing) return null
  return db.message.create({
    data: { conversationId: conversation.id, senderId: input.actorAdminId, content: input.content, messageType: 'SYSTEM', systemCode },
    select: { id: true },
  })
}

export async function createCourierAssignmentNotification(
  tx: Prisma.TransactionClient,
  input: { actorAdminId: string; courierId: string; content: string },
) {
  const [participant1Id, participant2Id] = [input.actorAdminId, input.courierId].sort()
  const now = new Date()
  const conversation = await tx.conversation.upsert({
    where: { participant1Id_participant2Id: { participant1Id, participant2Id } },
    update: { lastMessage: input.content, lastMessageAt: now },
    create: { participant1Id, participant2Id, isSystem: false, lastMessage: input.content, lastMessageAt: now },
    select: { id: true },
  })
  return tx.message.create({
    data: { conversationId: conversation.id, senderId: input.actorAdminId, content: input.content, messageType: 'SYSTEM', systemCode: 'COURIER_ASSIGNED' },
    select: { id: true },
  })
}
