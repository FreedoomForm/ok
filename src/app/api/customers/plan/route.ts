import { NextRequest, NextResponse } from 'next/server'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { toggleCustomerPlan } from '@/modules/sites'
import { AppError } from '@/modules/shared/errors'

export async function PATCH(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const active = typeof body.active === 'boolean' ? body.active : null

    if (active === null) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '`active` boolean is required' } },
        { status: 400 },
      )
    }

    const result = await toggleCustomerPlan(customer.id, active)
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
