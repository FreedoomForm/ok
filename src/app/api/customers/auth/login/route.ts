import { createPublicApiRoute } from '@/modules/shared/http'
import { BadRequestError, UnauthorizedError, RateLimitError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import { verifyPassword, createCustomerToken } from '@/modules/sites/infrastructure/customer-auth'
import { checkRateLimit, getClientIp } from '@/modules/shared/http/rate-limit'

const LOGIN_RATE_LIMIT = 10
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export const POST = createPublicApiRoute(async ({ request }) => {
  const body = await request.json()
  const { phone, password } = body
  const ip = getClientIp(request.headers)

  if (!phone || !password) {
    throw new BadRequestError('Phone and password are required')
  }

  const limit = checkRateLimit(`customer-login:${ip}:${String(phone)}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS)
  if (!limit.allowed) {
    throw new RateLimitError(limit.retryAfterSec, 'Too many login attempts. Please try again later.')
  }

  const customer = await db.customer.findFirst({
    where: { phone, deletedAt: null },
  })

  if (!customer) {
    throw new UnauthorizedError('Invalid credentials')
  }

  if (!customer.isActive) {
    throw new UnauthorizedError('Account is inactive')
  }

  if (!customer.password) {
    throw new BadRequestError('Password not set. Please contact support or set password.')
  }

  const isValid = await verifyPassword(password, customer.password)

  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const token = createCustomerToken({
    id: customer.id,
    phone: customer.phone,
  })

  return {
    data: {
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
    },
  }
})
