import { NextRequest, NextResponse } from 'next/server'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { executeGetTodayMenu } from '@/modules/sites'
import { AppError } from '@/modules/shared/errors'

export async function GET(request: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(request)
    if (!customer) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }

    const menu = await executeGetTodayMenu({ customerId: customer.id })
    return NextResponse.json({ data: menu })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
