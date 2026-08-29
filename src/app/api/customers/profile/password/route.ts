import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest, hashPassword, normalizeCustomerPhone } from '@/lib/customer-auth'
import { customerLoginSelect } from '@/lib/customer-access'
import { verifyCustomerPasswordChange } from '@/lib/customer-login'

export async function PUT(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 })
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      return NextResponse.json({ error: 'Password must be between 6 and 72 characters' }, { status: 400 })
    }

    const record = await db.customer.findUnique({
      where: { id: customer.id },
      select: { ...customerLoginSelect, deletedAt: true },
    })
    if (!record || !record.isActive || record.deletedAt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // A legacy account without a stored hash still owns its documented initial
    // credential: the normalized phone. The change flow verifies against that
    // instead of silently accepting any caller who knows the id.
    const effectiveCurrentHash = record.password ?? (await hashPassword(normalizeCustomerPhone(record.phone)))
    const outcome = await verifyCustomerPasswordChange({ currentPassword, effectiveCurrentHash })
    if (outcome.status !== 'OK') {
      return NextResponse.json({ error: outcome.error }, { status: outcome.httpStatus })
    }

    const passwordHash = await hashPassword(newPassword)
    await db.customer.update({
      where: { id: customer.id },
      data: { password: passwordHash },
      select: { id: true },
    })

    return NextResponse.json({
      success: true,
      customer: {
        id: record.id,
        name: record.name,
        phone: record.phone,
        address: record.address,
      },
    })
  } catch (error) {
    console.error('Customer password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
