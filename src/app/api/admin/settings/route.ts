import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { adminSettingsPatchSchema, mergeAdminSettings, type AdminSettingsRecord } from '@/lib/admin/settings'

const settingsRoles = ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'] as const

function preferencesForStorage(settings: AdminSettingsRecord): Prisma.InputJsonObject {
  return {
    compactMode: settings.compactMode,
    showStats: settings.showStats,
    enableAnimations: settings.enableAnimations,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, [...settingsRoles])) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    const config = await db.interfaceConfig.findUnique({ where: { adminId: user.id }, select: { id: true, theme: true, preferences: true, language: true } })
    const settings = mergeAdminSettings({ ...(config?.preferences && typeof config.preferences === 'object' && !Array.isArray(config.preferences) ? config.preferences : {}), theme: config?.theme })
    return NextResponse.json({ id: config?.id ?? null, settings, language: config?.language ?? 'ru' })
  } catch (error) {
    console.error('Error fetching admin settings:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, [...settingsRoles])) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    const parsed = adminSettingsPatchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Некорректные настройки' }, { status: 400 })
    const current = await db.interfaceConfig.findUnique({ where: { adminId: user.id }, select: { id: true, theme: true, preferences: true, language: true } })
    const previous = mergeAdminSettings({ ...(current?.preferences && typeof current.preferences === 'object' && !Array.isArray(current.preferences) ? current.preferences : {}), theme: current?.theme })
    const next = mergeAdminSettings({ ...previous, ...parsed.data })
    const config = await db.interfaceConfig.upsert({
      where: { adminId: user.id },
      update: { theme: next.theme, preferences: preferencesForStorage(next) },
      create: { adminId: user.id, theme: next.theme, language: 'ru', preferences: preferencesForStorage(next) },
      select: { id: true, theme: true, preferences: true, language: true },
    })
    await db.actionLog.create({ data: { adminId: user.id, action: 'UPDATE_SETTINGS', entityType: 'SETTINGS', entityId: config.id, details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'UPDATE_SETTINGS', entity: 'SETTINGS' } }), oldValues: JSON.stringify(previous), newValues: JSON.stringify(next) } })
    return NextResponse.json({ id: config.id, settings: next, language: config.language })
  } catch (error) {
    console.error('Error updating admin settings:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
