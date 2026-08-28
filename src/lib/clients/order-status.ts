export type ClientLanguage = 'ru' | 'uz'

const LABELS: Record<ClientLanguage, Record<string, string>> = {
  ru: {
    PENDING: 'Ожидает',
    IN_DELIVERY: 'Доставляется',
    DELIVERED: 'Доставлено',
    FAILED: 'Ошибка',
    PAUSED: 'Приостановлено',
    CANCELED: 'Отменено',
    CANCELLED: 'Отменено',
  },
  uz: {
    PENDING: 'Kutilmoqda',
    IN_DELIVERY: 'Yetkazilmoqda',
    DELIVERED: 'Yetkazildi',
    FAILED: 'Xatolik',
    PAUSED: 'To‘xtatilgan',
    CANCELED: 'Bekor qilingan',
    CANCELLED: 'Bekor qilingan',
  },
}

export function clientOrderStatusLabel(status: string, language: string): string {
  const locale: ClientLanguage = language === 'uz' ? 'uz' : 'ru'
  return LABELS[locale][status] || (locale === 'ru' ? 'Неизвестно' : 'Nomaʼlum')
}
