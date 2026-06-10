/**
 * Admins Domain Errors — Domain layer.
 */

import { ForbiddenError, ConflictError } from '@/modules/shared/errors'

/** Thrown when a user tries to create a subordinate they're not allowed to. */
export class CannotCreateSubordinateError extends ForbiddenError {
  constructor(userRole: string, targetRole: string) {
    super(`Role ${userRole} cannot create subordinate with role ${targetRole}`, { userRole, targetRole })
    this.name = 'CannotCreateSubordinateError'
  }
}

/** Thrown when a user tries to delete themselves or a higher-level admin. */
export class CannotDeleteAdminError extends ForbiddenError {
  constructor(reason: string) {
    super(reason)
    this.name = 'CannotDeleteAdminError'
  }
}

/** Thrown when an admin cannot toggle their own status. */
export class CannotToggleOwnStatusError extends ConflictError {
  constructor() {
    super('Cannot toggle your own status')
    this.name = 'CannotToggleOwnStatusError'
  }
}
