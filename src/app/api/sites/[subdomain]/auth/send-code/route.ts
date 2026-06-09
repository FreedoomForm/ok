import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { canSendOtp, issueOtp } from '@/lib/otp-store'
import { sendOtpSms } from '@/lib/sms-provider'
import { getSiteBySubdomain, getSiteGroupAdminIds } from '@/lib/site-access'

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
    const purpose = 'login' as RequestPurpose

    if (!phone || phone.length < 10 || phone.length > 16) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
    }

    const groupAdminIds = await getSiteGroupAdminIds(site.adminId)

    const customer = await db.customer.findFirst({
      where: {
        phone,
        deletedAt: null,
        createdBy: { in: groupAdminIds },
      },
      select: {
        id: true,
        isActive: true,
      },
    })

    if (purpose === 'login') {
      if (!customer) {
        return NextResponse.json({ error: 'Customer not found for this site' }, { status: 404 })
      }
      if (!customer.isActive) {
        return NextResponse.json({ error: 'Customer account is inactive' }, { status: 403 })
      }
    }

    const sendStatus = canSendOtp(subdomain, phone)
    if (!sendStatus.allowed) {
      return NextResponse.json(
        {
          error: 'Please wait before requesting another code',
          retryAfterSec: Math.ceil((sendStatus.retryAfterMs || 0) / 1000),
        },
        { status: 429 }
      )
    }

    const otp = issueOtp(subdomain, phone, purpose)
    const smsResult = await sendOtpSms(phone, otp.code)

    if (!smsResult.ok) {
      return NextResponse.json(
        {
          error: smsResult.error || 'Failed to send OTP SMS',
          provider: smsResult.provider,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      provider: smsResult.provider,
      expiresInSec: otp.expiresInSec,
      ...(process.env.NODE_ENV !== 'production' ? { debugCode: otp.code } : {}),
    })
  } catch (error) {
    console.error('Error sending OTP code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
