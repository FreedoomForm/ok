const MAX_CUSTOMER_CHAT_CONTENT = 2000

export interface CustomerChatMessagePayload {
  content: string
}

/**
 * Validates and normalizes a customer-authored chat message before it reaches
 * the database layer: the content must stay within the 1..2000 bound after
 * trimming and cannot be empty.
 */
export function buildCustomerChatMessagePayload(input: { content: string }): CustomerChatMessagePayload {
  const content = typeof input.content === 'string' ? input.content.trim() : ''
  if (!content) {
    throw new Error('EMPTY_CUSTOMER_CHAT_CONTENT')
  }
  if (content.length > MAX_CUSTOMER_CHAT_CONTENT) {
    throw new Error('INVALID_CUSTOMER_CHAT_CONTENT')
  }
  return { content }
}

export interface CustomerThreadMessageRow {
  id: string
  content: string
  createdAt: Date
  author: 'CUSTOMER' | 'ADMIN'
  senderName: string | null
}

export interface CustomerThreadMessage {
  id: string
  content: string
  author: 'CUSTOMER' | 'ADMIN'
  senderName: string | null
  createdAt: string
}

export const CustomerThreadMessageView = {
  fromRow(row: CustomerThreadMessageRow): CustomerThreadMessage {
    return {
      id: row.id,
      content: row.content,
      author: row.author,
      senderName: row.senderName,
      createdAt: row.createdAt.toISOString(),
    }
  },
}
