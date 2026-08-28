export const GLOBAL_OPERATIONAL_RESOURCE_KINDS = ['INGREDIENT', 'DISH', 'COOKING_RECORD'] as const

export type GlobalOperationalResourceKind = (typeof GLOBAL_OPERATIONAL_RESOURCE_KINDS)[number]

const GLOBAL_OPERATIONAL_ROLES = new Set(['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])

export function isGlobalOperationalResource(resourceType: string): resourceType is GlobalOperationalResourceKind {
  return (GLOBAL_OPERATIONAL_RESOURCE_KINDS as readonly string[]).includes(resourceType)
}

export function canManageGlobalOperationalResource(role: string): boolean {
  return GLOBAL_OPERATIONAL_ROLES.has(role)
}
