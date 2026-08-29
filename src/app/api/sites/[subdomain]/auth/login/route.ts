import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createCustomerToken } from '@/lib/customer-auth'
import { customerSiteAuthSelect } from '@/lib/customer-access'
import { resolveSiteCustomerLogin } from '@/lib/customer-login'
import { getSiteBySubdomain, getSiteGroupAdminIds } from '@/lib/site-access'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const LOGIN_RATE_LIMIT = 15
const LOGIN_WINDOW_MS = 10 * 60 * 1000

function normalizePhone(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const digits = trimmed.startsWith('+') ? trimmed.slice(1).replace(/\D/g, '') : trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return `+${digits}`
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
    const password = typeof body.password === 'string' ? body.password : ''
    const ip = getClientIp(request.headers)

    if (!phone || phone.length < 10 || phone.length > 16) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }

    if (!password) {
      return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })
    }

    const limit = checkRateLimit(`site-login:${subdomain}:${ip}:${phone}`, LOGIN_RATE_LIMIT, LOGIN_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', retryAfterSec: limit.retryAfterSec },
        { status: 429 }
      )
    }

    const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

    // Prefer owner-admin customer record if duplicates exist across the group.
    // The password hash is read through the dedicated credential select and is
    // never included in any response payload.
    const credentialSelect = { ...customerSiteAuthSelect, password: true } as const
    let customer = await db.customer.findFirst({
      where: {
        phone,
        deletedAt: null,
        createdBy: site.adminId,
      },
      select: credentialSelect,
    })

    if (!customer) {
      customer = await db.customer.findFirst({
        where: {
          phone,
          deletedAt: null,
          createdBy: { in: groupAdminIds },
        },
        select: credentialSelect,
      })
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found for this site' }, { status: 404 })
    }

    const outcome = await resolveSiteCustomerLogin({ password, customer })
    if (outcome.status !== 'OK' || !outcome.customer) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.httpStatus })
    }

    const token = createCustomerToken({
      id: customer.id,
      phone: customer.phone,
      websiteId: site.id,
      ownerAdminId: site.adminId,
      subdomain: site.subdomain,
    })

    const response = NextResponse.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        balance: customer.balance,
      },
    })

    response.cookies.set({
      name: 'customerToken',
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
    })

    return response
  } catch (error) {
    console.error('Error logging in customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


