export const CHAT_CONTACT_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4f46e5',
] as const

export const CHAT_CONTACT_ICONS = [
  'briefcase',
  'shield',
  'truck',
  'clipboard',
  'user-check',
  'headphones',
  'building',
  'star',
] as const

export type ContactStyle = {
  color: string
  icon: string
}

export function normalizeContactPhone(value: string): string {
  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function selectContactStyle(
  usedStyles: readonly ContactStyle[],
): ContactStyle {
  const usedColors = new Set(usedStyles.map((style) => style.color))
  const usedIcons = new Set(usedStyles.map((style) => style.icon))
  const color = CHAT_CONTACT_COLORS.find((candidate) => !usedColors.has(candidate)) ?? CHAT_CONTACT_COLORS[usedStyles.length % CHAT_CONTACT_COLORS.length]
  const icon = CHAT_CONTACT_ICONS.find((candidate) => !usedIcons.has(candidate)) ?? CHAT_CONTACT_ICONS[usedStyles.length % CHAT_CONTACT_ICONS.length]
  return { color, icon }
}
