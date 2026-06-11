const COURIER_COLORS = [
  '#64748B',
  '#94A3B8',
  '#475569',
  '#CBD5E1',
  '#CBD5E1',
  '#A1A1AA',
  '#71717A',
  '#94A3B8',
  '#52525B',
  '#334155',
  '#64748B',
  '#1E293B',
]

export function getCourierColor(courierId: string): string {
  if (!courierId) return '#94A3B8' // slate-400
  let hash = 0
  for (let i = 0; i < courierId.length; i++) {
    hash = courierId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COURIER_COLORS[Math.abs(hash) % COURIER_COLORS.length]
}

