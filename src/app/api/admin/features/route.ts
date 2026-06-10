import { createApiRoute } from '@/modules/shared/http'
import { BadRequestError, NotFoundError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { featureCreateSchema, featureIdSchema } from '@/lib/validations'
import { listFeatures, findFeatureForOwner, createFeature, deleteFeature } from '@/modules/admins'
import { Prisma } from '@prisma/client'

async function resolveOwnerAdminId(user: { id: string; role: string }) {
  if (user.role === 'SUPER_ADMIN') return user.id
  return (await getOwnerAdminId(user)) ?? user.id
}

export const GET = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ user }) => {
    const ownerAdminId = await resolveOwnerAdminId(user)
    const features = await listFeatures(ownerAdminId)
    return { data: features }
  },
})

export const POST = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const body = await request.json().catch(() => null)
    const parsed = featureCreateSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Invalid payload')
    }

    const ownerAdminId = await resolveOwnerAdminId(user)

    const optionsList =
      parsed.data.type === 'SELECT'
        ? (parsed.data.options ?? '')
            .split(',')
            .map((opt) => opt.trim())
            .filter(Boolean)
        : null

    const feature = await createFeature(ownerAdminId, {
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type as 'TEXT' | 'SELECT',
      options: optionsList,
    })

    return { data: { message: 'Feature successfully created', feature } }
  },
})

// DELETE is handled here too (using ?id= query param)
export const DELETE = createApiRoute({
  requireAuth: ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'],
  handler: async ({ request, user }) => {
    const idParam = request.nextUrl.searchParams.get('id')
    const idParsed = featureIdSchema.safeParse(idParam)
    if (!idParsed.success) {
      throw new BadRequestError(idParsed.error.issues[0]?.message ?? 'Invalid id')
    }

    const ownerAdminId = await resolveOwnerAdminId(user)

    const existing = await findFeatureForOwner(idParsed.data, ownerAdminId)
    if (!existing) {
      throw new NotFoundError('Feature')
    }

    await deleteFeature(idParsed.data)
    return { data: { success: true } }
  },
})
