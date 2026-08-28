export type ChatContactLifecycle = {
  type: 'ADMIN' | 'SYSTEM'
  state: 'ENABLED' | 'DISABLED' | 'DELETED'
}

export function canSendToChatContact(contact: ChatContactLifecycle) {
  return contact.type === 'ADMIN' && contact.state !== 'DISABLED'
}
