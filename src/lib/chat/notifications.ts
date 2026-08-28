import type { Prisma } from '@prisma/client'

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
