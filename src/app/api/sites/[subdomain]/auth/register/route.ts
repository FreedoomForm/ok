import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSiteBySubdomain, getSiteGroupAdminIds } from '@/lib/site-access'

function normalizePhone(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const digits = trimmed.startsWith('+') ? trimmed.slice(1).replace(/\D/g, '') : trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return `+${digits}`
}

function buildDefaultName(phone: string) {
  const suffix = phone.replace(/\D/g, '').slice(-4)
  return `Client ${suffix || 'new'}`
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await context.params
    const site = await getSiteBySubdomain(subdomain)

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '')
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''

    if (!phone || phone.length < 10 || phone.length > 16) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }

    const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

    const existing = await db.customer.findFirst({
      where: {
        phone,
        deletedAt: null,
        createdBy: { in: groupAdminIds },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ error: 'Phone is already registered on this site' }, { status: 409 })
    }

    const customer = await db.customer.create({
      data: {
        name: name || buildDefaultName(phone),
        phone,
        address: 'Location not set',
        preferences: '',
        orderPattern: 'daily',
        isActive: true,
        autoOrdersEnabled: true,
        createdBy: site.adminId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    })

    return NextResponse.json({
      success: true,
      customer,
      message: 'Registered. Please login to receive SMS code.',
    })
  } catch (error) {
    console.error('Error registering customer:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Phone is already registered' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
