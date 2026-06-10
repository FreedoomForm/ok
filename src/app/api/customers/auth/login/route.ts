import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createCustomerToken } from '@/lib/customer-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { AppError } from '@/modules/shared/errors'

const LOGIN_RATE_LIMIT = 10
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, password } = body
    const ip = getClientIp(request.headers)

    if (!phone || !password) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Phone and password are required' } },
        { status: 400 },
      )
    }

    const limit = checkRateLimit(`customer-login:${ip}:${String(phone)}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later.', retryAfterSec: limit.retryAfterSec } },
        { status: 429 },
      )
    }

    const customer = await db.customer.findFirst({
      where: { phone, deletedAt: null },
    })

    if (!customer) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
        { status: 401 },
      )
    }

    if (!customer.isActive) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Account is inactive' } },
        { status: 403 },
      )
    }

    if (!customer.password) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Password not set. Please contact support or set password.' } },
        { status: 400 },
      )
    }

    const isValid = await verifyPassword(password, customer.password)

    if (!isValid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
        { status: 401 },
      )
    }

    const token = createCustomerToken({
      id: customer.id,
      phone: customer.phone,
    })

    return NextResponse.json({
      data: {
        token,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        },
      },
    })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode })
    }
    console.error('Customer login error:', error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 })
  }
}
