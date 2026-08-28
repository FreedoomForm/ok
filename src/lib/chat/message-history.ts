export type MessageHistoryPage<T> = {
  messages: T[]
  hasMore: boolean
  nextBefore: string | null
}

export function buildMessageHistoryPage<T extends { createdAt: Date }>(messages: T[], limit: number): MessageHistoryPage<T> {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50
  const page = messages.slice(0, safeLimit)
  return {
    messages: page.reverse(),
    hasMore: messages.length > safeLimit,
    nextBefore: page.length > 0 ? page[0].createdAt.toISOString() : null,
  }
}
