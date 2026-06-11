// Shared validation helpers — Backend Design System v1.0

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return phone.length >= 10 && phone.length <= 15 && /^[\d+\-()\s]+$/.test(phone);
}

export function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sanitizeString(input: string, maxLength = 500): string {
  return input.trim().slice(0, maxLength);
}
