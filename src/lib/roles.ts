export const ADMIN_ROLES = ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER', 'WORKER'] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && (ADMIN_ROLES as readonly string[]).includes(role)
}

export const ADMIN_ROLE_LEVEL: Record<AdminRole, number> = {
  SUPER_ADMIN: 5,
  MIDDLE_ADMIN: 4,
  LOW_ADMIN: 3,
  WORKER: 2,
  COURIER: 1,
}

