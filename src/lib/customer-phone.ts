export function normalizeCustomerPhone(input: string): string {
  const trimmed = input.trim()
  const digits = trimmed.startsWith('+') ? trimmed.slice(1).replace(/\D/g, '') : trimmed.replace(/\D/g, '')
  return digits ? `+${digits}` : ''
}
