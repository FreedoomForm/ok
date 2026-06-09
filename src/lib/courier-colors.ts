const COURIER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8B500',
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

