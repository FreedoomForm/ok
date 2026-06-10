import { createPublicApiRoute } from '@/modules/shared/http'
import { BadRequestError, ConflictError } from '@/modules/shared/errors'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { emailSchema, passwordSchema } from '@/modules/shared/validation/validations'
import { z } from 'zod'

export const POST = createPublicApiRoute(async ({ request }) => {
  const body = await request.json()
  const { email, password, name } = body

  // Validate input
  if (!email || !password || !name) {
    throw new BadRequestError('All fields are required')
  }

  // Validate email format
  try {
    emailSchema.parse(email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0].message)
    }
  }

  // Validate password strength
  try {
    passwordSchema.parse(password)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.issues[0].message)
    }
  }

  // Check if user already exists
  const existingAdmin = await db.admin.findUnique({
    where: { email },
  })

  if (existingAdmin) {
    throw new ConflictError('User with this email already exists')
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Set trial period to 30 days from now
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 30)

  // Create new admin
  const admin = await db.admin.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'MIDDLE_ADMIN',
      isActive: true,
      hasPassword: true,
      trialEndsAt,
    },
  })

  return {
    data: {
      success: true,
      message: 'Account created successfully. You have a 30-day trial period.',
      trialEndsAt: admin.trialEndsAt,
    },
  }
})
