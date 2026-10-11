// C8 / R33: the universal workspace enable/disable commands are mapped to the
// chat contact STATE (ENABLED/DISABLED) instead of availability-calendar rows.
// Trash keeps its own mapping (DELETED) inside the resource adapter.

export type ChatContactStateForCommand = 'ENABLED' | 'DISABLED'

export function resolveChatContactStateForMode(
  modeKind: 'enabled' | 'disabled',
): ChatContactStateForCommand {
  return modeKind === 'enabled' ? 'ENABLED' : 'DISABLED'
}

// The system contact is provisioned by the platform: universal commands must
// never flip it (the dashboard disables it in the UI as well).
export function isSystemContactShape(contact: { type: string } | null | undefined): boolean {
  return contact?.type === 'SYSTEM'
}
