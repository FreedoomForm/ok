import { createApiRoute } from '@/modules/shared/http'
import { ForbiddenError, NotFoundError } from '@/modules/shared/errors'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { findMenuSet, updateMenuSet, deactivateOtherMenuSets, deleteMenuSet } from '@/modules/admins'

export const GET = createApiRoute({
  handler: async ({ user, params }) => {
    const id = params?.id ?? ''
    const set = await findMenuSet(id)

    if (!set) {
      throw new NotFoundError('Set')
    }

    if (user.role === 'MIDDLE_ADMIN') {
      if (set.adminId !== user.id) {
        throw new ForbiddenError('Forbidden')
      }
    } else if (user.role === 'LOW_ADMIN') {
      const ownerAdminId = await getOwnerAdminId(user)
      if (!ownerAdminId || set.adminId !== ownerAdminId) {
        throw new ForbiddenError('Forbidden')
      }
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Forbidden')
    }

    return { data: set }
  },
})

export const PATCH = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, request, params }) => {
    const id = params?.id ?? ''
    const existingSet = await findMenuSet(id)

    if (!existingSet) {
      throw new NotFoundError('Set')
    }

    if (user.role === 'MIDDLE_ADMIN' && existingSet.adminId !== user.id) {
      throw new ForbiddenError('Forbidden')
    }

    const body = await request.json()
    const { name, description, calorieGroups, isActive } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (calorieGroups !== undefined) updateData.calorieGroups = calorieGroups
    if (isActive !== undefined) {
      updateData.isActive = isActive
      if (isActive && existingSet.adminId) {
        await deactivateOtherMenuSets(id, existingSet.adminId)
      }
    }

    const updatedSet = await updateMenuSet(id, updateData)
    return { data: updatedSet }
  },
})

export const DELETE = createApiRoute({
  requireAuth: ['MIDDLE_ADMIN', 'SUPER_ADMIN'],
  handler: async ({ user, params }) => {
    const id = params?.id ?? ''

    const existingSet = await findMenuSet(id)
    if (!existingSet) {
      throw new NotFoundError('Set')
    }

    if (user.role === 'MIDDLE_ADMIN' && existingSet.adminId !== user.id) {
      throw new ForbiddenError('Forbidden')
    }

    await deleteMenuSet(id)
    return { data: { success: true } }
  },
})
