import { z } from 'zod'

export const adminSettingsSchema = z.object({
  compactMode: z.boolean(),
  showStats: z.boolean(),
  enableAnimations: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
}).strict()

export const adminSettingsPatchSchema = adminSettingsSchema.partial().strict()

export type AdminSettingsRecord = z.infer<typeof adminSettingsSchema>

const DEFAULT_ADMIN_SETTINGS: AdminSettingsRecord = {
  compactMode: false,
  showStats: true,
  enableAnimations: true,
  theme: 'light',
}

export function mergeAdminSettings(value: unknown): AdminSettingsRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ...DEFAULT_ADMIN_SETTINGS }
  const candidate = value as Record<string, unknown>
  return {
    compactMode: typeof candidate.compactMode === 'boolean' ? candidate.compactMode : DEFAULT_ADMIN_SETTINGS.compactMode,
    showStats: typeof candidate.showStats === 'boolean' ? candidate.showStats : DEFAULT_ADMIN_SETTINGS.showStats,
    enableAnimations: typeof candidate.enableAnimations === 'boolean' ? candidate.enableAnimations : DEFAULT_ADMIN_SETTINGS.enableAnimations,
    theme: candidate.theme === 'light' || candidate.theme === 'dark' || candidate.theme === 'system' ? candidate.theme : DEFAULT_ADMIN_SETTINGS.theme,
  }
}
