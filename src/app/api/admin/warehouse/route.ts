import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { z } from 'zod'

function extractCoordinatesFromInput(input: string): { lat: number; lng: number } | null {
  if (!input) return null

  // 1) @lat,lng
  const atMatch = input.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) }

  // 2) q=lat,lng or ll=lat,lng
  const qMatch = input.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) }

  // 3) !3dLAT!4dLNG (pb params)
  const pbMatch = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pbMatch) return { lat: Number(pbMatch[1]), lng: Number(pbMatch[2]) }

  // 4) raw "lat,lng"
  const simpleMatch = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (simpleMatch) return { lat: Number(simpleMatch[1]), lng: Number(simpleMatch[2]) }

  // 5) /search/lat,lng
  const searchMatch = input.match(/search\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (searchMatch) return { lat: Number(searchMatch[1]), lng: Number(searchMatch[2]) }

  return null
}

async function expandShortUrlIfNeeded(url: string): Promise<string> {
  if (!url) return url
  if (!url.includes('goo.gl') && !url.includes('maps.app.goo.gl')) return url

  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
  return res.url || url
}

const patchSchema = z
  .object({
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
    googleMapsLink: z.string().min(1).optional(),
  })
  .refine((v) => (typeof v.lat === 'number' && typeof v.lng === 'number') || typeof v.googleMapsLink === 'string', {
    message: 'Provide either {lat,lng} or {googleMapsLink}',
  })

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ownerAdminId = (await getOwnerAdminId(user)) ?? user.id
  const row = await db.admin.findUnique({
    where: { id: ownerAdminId },
    select: { latitude: true, longitude: true },
  })

  return NextResponse.json({
    lat: row?.latitude ?? null,
    lng: row?.longitude ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 })
  }

  const ownerAdminId = (await getOwnerAdminId(user)) ?? user.id

  let lat: number | null = null
  let lng: number | null = null

  if (typeof parsed.data.lat === 'number' && typeof parsed.data.lng === 'number') {
    lat = parsed.data.lat
    lng = parsed.data.lng
  } else if (parsed.data.googleMapsLink) {
    const expanded = await expandShortUrlIfNeeded(parsed.data.googleMapsLink)
    const coords = extractCoordinatesFromInput(expanded) ?? extractCoordinatesFromInput(parsed.data.googleMapsLink)
    if (!coords || Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) {
      return NextResponse.json({ error: 'Не удалось распознать координаты' }, { status: 400 })
    }
    lat = coords.lat
    lng = coords.lng
  }

  if (lat == null || lng == null) {
    return NextResponse.json({ error: 'Не удалось определить координаты' }, { status: 400 })
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Координаты вне диапазона' }, { status: 400 })
  }

  await db.admin.update({
    where: { id: ownerAdminId },
    data: { latitude: lat, longitude: lng },
  })

  return NextResponse.json({ message: 'OK', lat, lng })
}

