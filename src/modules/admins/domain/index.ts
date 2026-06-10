/**
 * Admins Domain — barrel export.
 */

export {
  AdminEntity,
} from './admins.entity'

export {
  AdminPolicy,
  type AdminPolicyUser,
  type AdminPolicyTarget,
} from './admins.policy'

export {
  CannotCreateSubordinateError,
  CannotDeleteAdminError,
  CannotToggleOwnStatusError,
} from './admins.errors'

export {
  type AdminCreatedEvent,
  type AdminDeletedEvent,
  type AdminStatusToggledEvent,
  type AdminCreatedPayload,
  type AdminDeletedPayload,
  type AdminStatusToggledPayload,
  createAdminCreatedEvent,
  createAdminDeletedEvent,
  createAdminStatusToggledEvent,
} from './admins.events'
