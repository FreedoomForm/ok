import { createPublicApiRoute } from '@/modules/shared/http'
import { BadRequestError, UnauthorizedError, InternalError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const JWT_SECRET = process.env.JWT_SECRET
const LOGIN_RATE_LIMIT = 10
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export const POST = createPublicApiRoute(async ({ request }) => {
  if (!JWT_SECRET) {
    throw new InternalError('JWT_SECRET is not set in environment')
  }

  const { email, password } = await request.json()
  const ip = getClientIp(request.headers)

  if (!email || !password) {
    throw new BadRequestError('Email и пароль обязательны')
  }

  const limit = checkRateLimit(
    `admin-login:${ip}:${String(email).toLowerCase()}`,
    LOGIN_RATE_LIMIT,
    LOGIN_WINDOW_MS,
  )
  if (!limit.allowed) {
    throw new BadRequestError('Too many login attempts. Please try again later.')
  }

  const admin = await db.admin.findUnique({
    where: { email },
  })

  if (!admin) {
    throw new UnauthorizedError('Неверные учетные данные')
  }

  // Check if user has a password (not OAuth-only user)
  if (!admin.password || !admin.hasPassword) {
    throw new UnauthorizedError(
      'Этот аккаунт использует вход через Google. Используйте кнопку "Войти через Google"',
    )
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password)
  if (!isPasswordValid) {
    throw new UnauthorizedError('Неверные учетные данные')
  }

  if (!admin.isActive) {
    throw new UnauthorizedError('Аккаунт деактивирован')
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    JWT_SECRET as string,
    { expiresIn: '24h' },
  )

  await db.actionLog.create({
    data: {
      adminId: admin.id,
      action: 'LOGIN',
      entityType: 'ADMIN',
      entityId: admin.id,
      description: `Admin ${admin.name} logged in`,
    },
  })

  return {
    data: {
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        trialEndsAt: admin.trialEndsAt || null,
      },
    },
  }
})
