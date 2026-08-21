export type ChatParticipant = {
  id: string
  role: string
  createdBy: string | null
  isActive: boolean
}

const MANAGEMENT_ROLES = new Set(['MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER'])
const TEAM_ROLES = new Set(['LOW_ADMIN', 'COURIER'])

export function canStartConversation(currentUser: ChatParticipant, targetUser: ChatParticipant): boolean {
  if (!currentUser.isActive || !targetUser.isActive || currentUser.id === targetUser.id) return false

  if (currentUser.role === 'SUPER_ADMIN') {
    return MANAGEMENT_ROLES.has(targetUser.role)
  }

  if (currentUser.role === 'MIDDLE_ADMIN') {
    return targetUser.role === 'SUPER_ADMIN' ||
      (TEAM_ROLES.has(targetUser.role) && targetUser.createdBy === currentUser.id)
  }

  if (currentUser.role === 'LOW_ADMIN' || currentUser.role === 'COURIER') {
    const creatorId = currentUser.createdBy
    return targetUser.role === 'SUPER_ADMIN' ||
      (creatorId !== null && (
        targetUser.id === creatorId ||
        (TEAM_ROLES.has(targetUser.role) && targetUser.createdBy === creatorId)
      ))
  }

  return false
}
