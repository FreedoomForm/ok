import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyOtp } from '@/lib/otp-store'
import { createCustomerToken } from '@/lib/customer-auth'
import { getSiteBySubdomain, getSiteGroupAdminIds } from '@/lib/site-access'
import { cookieDomainFromRootHost } from '@/lib/subdomain-host'

type RequestPurpose = 'login' | 'register'

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
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const purpose = 'login' as RequestPurpose

    if (!phone || phone.length < 10 || phone.length > 16) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code must contain exactly 6 digits' }, { status: 400 })
    }

    const otpStatus = verifyOtp(subdomain, phone, purpose, code)
    if (!otpStatus.ok) {
      return NextResponse.json(
        {
          error: otpStatus.error,
          attemptsLeft: 'attemptsLeft' in otpStatus ? otpStatus.attemptsLeft : undefined,
        },
        { status: 401 }
      )
    }

    const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

    // Prefer the owner-admin customer record if duplicates exist in the group.
    let customer = await db.customer.findFirst({
      where: {
        phone,
        deletedAt: null,
        createdBy: site.adminId,
      },
    })

    if (!customer) {
      customer = await db.customer.findFirst({
        where: {
          phone,
          deletedAt: null,
          createdBy: { in: groupAdminIds },
        },
      })
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found for this site' }, { status: 404 })
    }

    if (!customer.isActive) {
      return NextResponse.json({ error: 'Customer account is inactive' }, { status: 403 })
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

    // Persist auth across subdomains (production). On localhost the cookie becomes host-only.
    response.cookies.set({
      name: 'customerToken',
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      domain: cookieDomainFromRootHost(process.env.NEXT_PUBLIC_ROOT_DOMAIN),
    })

    return response
  } catch (error) {
    console.error('Error verifying OTP code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

