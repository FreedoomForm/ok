const COURIER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#CBD5E1',
  '#DDA0DD',
  '#98D8C8',
  '#94A3B8',
  '#BB8FCE',
  '#85C1E9',
  '#64748B',
  '#00CED1',
]

export function getCourierColor(courierId: string): string {
  if (!courierId) return '#94A3B8' // slate-400
  let hash = 0
  for (let i = 0; i < courierId.length; i++) {
    hash = courierId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COURIER_COLORS[Math.abs(hash) % COURIER_COLORS.length]
}

