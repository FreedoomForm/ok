/**
 * Profile panel UI text — trilingual (ru / uz / en).
 *
 * This was extracted from AdminDashboardPage to reduce its inline size.
 * All keys are stable — they are consumed by the shell, settings panel,
 * warehouse section, and client/order filter areas.
 */

export interface ProfileUiText {
  database: string
  noDateSelected: string
  allOrders: string
  profileCenter: string
  profileCenterDescription: string
  role: string
  visibleTabs: string
  dispatchDate: string
  dispatchChooseDate: string
  dispatchSave: string
  dispatchStart: string
  security: string
  securityDescription: string
  changePassword: string
  quickNavigation: string
  warehouseStartPoint: string
  warehouseStartPointDescription: string
  warehouseInputLabel: string
  readOnly: string
  warehousePlaceholder: string
  current: string
  notConfigured: string
  preview: string
  refresh: string
  saving: string
  saveLocation: string
  useMyLocation: string
  geolocationUnsupported: string
  geolocationDenied: string
  geolocationFailed: string
  geolocationSet: string
  messages: string
  messagesDescription: string
  ordersBin: string
  clientsBin: string
  autoSet: string
  active: string
  enableAutoOrderCreation: string
  searchClientPlaceholder: string
  searchClientsAria: string
  clear: string
  calendar: string
  today: string
  clearDate: string
  allTime: string
  thisWeek: string
  thisMonth: string
  next: string
  yesterday: string
  tomorrow: string
  searchOrdersPlaceholder: string
  searchOrdersAria: string
  rows: string
  filters: string
  resetFilters: string
  noOrdersFound: string
  noOrdersFoundDescription: string
  showing: string
  of: string
  statusFilter: string
  allClients: string
  activeOnly: string
  pausedOnly: string
  bin: string
  createClient: string
  editClient: string
  updateClientDetails: string
  createClientDescription: string
  nickname: string
  nicknamePlaceholder: string
  mapLink: string
  map: string
  mapHint: string
  phoneFormat: string
  balance: string
  days: string
  daysShort: string
}

const ru: ProfileUiText = {
  database: 'База данных',
  noDateSelected: 'Дата не выбрана',
  allOrders: 'Все заказы',
  profileCenter: 'Профиль',
  profileCenterDescription: 'Безопасность, контекст аккаунта и быстрая навигация в одном месте',
  role: 'Роль',
  visibleTabs: 'Видимые вкладки',
  dispatchDate: 'Дата распределения',
  dispatchChooseDate: 'Выбрать дату',
  dispatchSave: 'Сохранить',
  dispatchStart: 'Начать',
  security: 'Безопасность',
  securityDescription: 'Защитите доступ к аккаунту и быстро завершайте сессии.',
  changePassword: 'Сменить пароль',
  quickNavigation: 'Быстрая навигация',
  warehouseStartPoint: 'Стартовая точка склада',
  warehouseStartPointDescription: 'Используется для построения и сортировки маршрутов всех курьеров.',
  warehouseInputLabel: 'Ссылка Google Maps или координаты (lat,lng)',
  readOnly: '(только чтение)',
  warehousePlaceholder: 'Пример: 41.311081,69.240562',
  current: 'Текущая',
  notConfigured: 'не настроено',
  preview: 'Предпросмотр',
  refresh: 'Обновить',
  saving: 'Сохранение...',
  saveLocation: 'Сохранить точку',
  useMyLocation: 'Моё местоположение',
  geolocationUnsupported: 'Геолокация не поддерживается в этом браузере.',
  geolocationDenied: 'Доступ к геолокации запрещён.',
  geolocationFailed: 'Не удалось получить текущее местоположение.',
  geolocationSet: 'Точка установлена по геолокации.',
  messages: 'Сообщения',
  messagesDescription: 'Командные диалоги и быстрая координация.',
  ordersBin: 'Корзина заказов',
  clientsBin: 'Корзина клиентов',
  autoSet: 'Авто (активный глобальный набор)',
  active: '(Активный)',
  enableAutoOrderCreation: 'Включить автоматическое создание заказов',
  searchClientPlaceholder: 'Поиск клиента...',
  searchClientsAria: 'Поиск клиентов',
  clear: 'Очистить',
  calendar: 'Календарь',
  today: 'Сегодня',
  clearDate: 'Очистить дату',
  allTime: 'За все время',
  thisWeek: 'Эта неделя',
  thisMonth: 'Этот месяц',
  next: 'Далее',
  yesterday: 'Вчера',
  tomorrow: 'Завтра',
  searchOrdersPlaceholder: 'Поиск по имени, адресу или номеру заказа...',
  searchOrdersAria: 'Поиск заказов',
  rows: 'строк',
  filters: 'фильтров',
  resetFilters: 'Сбросить фильтры',
  noOrdersFound: 'Заказы не найдены',
  noOrdersFoundDescription: 'Измените фильтры или поисковый запрос.',
  showing: 'Показано',
  of: 'из',
  statusFilter: 'Фильтр статуса',
  allClients: 'Все клиенты',
  activeOnly: 'Только активные',
  pausedOnly: 'Только приостановленные',
  bin: 'Корзина',
  createClient: 'Создать клиента',
  editClient: 'Редактировать клиента',
  updateClientDetails: 'Обновите данные клиента.',
  createClientDescription: 'Создайте нового клиента в системе.',
  nickname: 'Псевдоним',
  nicknamePlaceholder: 'Пример: Офис, Дом... (необязательно)',
  mapLink: 'Ссылка на карту',
  map: 'Карта',
  mapHint: 'Кликните по карте, чтобы выбрать точку (можно также перетаскивать маркер).',
  phoneFormat: 'Формат: +998 XX XXX XX XX',
  balance: 'Баланс',
  days: 'Дни',
  daysShort: 'дн.',
}

const uz: ProfileUiText = {
  database: "Ma'lumotlar bazasi",
  noDateSelected: 'Sana tanlanmagan',
  allOrders: 'Barcha buyurtmalar',
  profileCenter: 'Profil markazi',
  profileCenterDescription: 'Xavfsizlik, akkaunt holati va tezkor navigatsiya bir joyda',
  role: 'Rol',
  visibleTabs: "Ko'rinadigan tablar",
  dispatchDate: "Jo'natish sanasi",
  dispatchChooseDate: 'Sanani tanlang',
  dispatchSave: 'Saqlash',
  dispatchStart: 'Boshlash',
  security: 'Xavfsizlik',
  securityDescription: 'Akkauntga kirishni himoya qiling va sessiyalarni tez yakunlang.',
  changePassword: "Parolni o'zgartirish",
  quickNavigation: 'Tezkor navigatsiya',
  warehouseStartPoint: "Ombor boshlang'ich nuqtasi",
  warehouseStartPointDescription: 'Barcha kuryerlar uchun marshrut qurish va saralashda ishlatiladi.',
  warehouseInputLabel: 'Google Maps havolasi yoki koordinatalar (lat,lng)',
  readOnly: "(faqat o'qish)",
  warehousePlaceholder: 'Misol: 41.311081,69.240562',
  current: 'Joriy',
  notConfigured: 'sozlanmagan',
  preview: "Ko'rib chiqish",
  refresh: 'Yangilash',
  saving: 'Saqlanmoqda...',
  saveLocation: 'Joylashuvni saqlash',
  useMyLocation: 'Mening joylashuvim',
  geolocationUnsupported: "Geolokatsiya ushbu brauzerda qo'llab-quvvatlanmaydi.",
  geolocationDenied: 'Geolokatsiyaga ruxsat berilmadi.',
  geolocationFailed: "Joriy joylashuvni aniqlab bo'lmadi.",
  geolocationSet: "Nuqta geolokatsiya orqali o'rnatildi.",
  messages: 'Xabarlar',
  messagesDescription: 'Jamoa suhbatlari va tezkor muvofiqlashtirish.',
  ordersBin: 'Buyurtmalar savati',
  clientsBin: 'Mijozlar savati',
  autoSet: "Avto (faol global to'plam)",
  active: '(Faol)',
  enableAutoOrderCreation: 'Buyurtmalarni avtomatik yaratishni yoqish',
  searchClientPlaceholder: 'Mijozni qidirish...',
  searchClientsAria: 'Mijozlarni qidirish',
  clear: 'Tozalash',
  calendar: 'Kalendar',
  today: 'Bugun',
  clearDate: 'Sanani tozalash',
  allTime: 'Barcha vaqt',
  thisWeek: 'Shu hafta',
  thisMonth: 'Shu oy',
  next: 'Keyingi',
  yesterday: 'Kecha',
  tomorrow: 'Ertaga',
  searchOrdersPlaceholder: "Ism, manzil yoki buyurtma raqami bo'yicha qidirish...",
  searchOrdersAria: 'Buyurtmalarni qidirish',
  rows: 'qator',
  filters: 'filtr',
  resetFilters: 'Filtrlarni tozalash',
  noOrdersFound: 'Buyurtmalar topilmadi',
  noOrdersFoundDescription: "Filtrlar yoki qidiruv so'rovini o'zgartiring.",
  showing: "Ko'rsatilmoqda",
  of: 'dan',
  statusFilter: 'Holat filtri',
  allClients: 'Barcha mijozlar',
  activeOnly: 'Faqat faol',
  pausedOnly: "Faqat to'xtatilgan",
  bin: 'Savat',
  createClient: 'Mijoz yaratish',
  editClient: 'Mijozni tahrirlash',
  updateClientDetails: "Mijoz ma'lumotlarini yangilang.",
  createClientDescription: 'Tizimda yangi mijoz yarating.',
  nickname: 'Laqab',
  nicknamePlaceholder: 'Misol: Ofis, Uy... (ixtiyoriy)',
  mapLink: 'Xarita havolasi',
  map: 'Xarita',
  mapHint: "Nuqtani tanlash uchun xaritaga bosing (marker-ni sudrab ham bo'ladi).",
  phoneFormat: 'Format: +998 XX XXX XX XX',
  balance: 'Balans',
  days: 'Kunlar',
  daysShort: 'kun',
}

const en: ProfileUiText = {
  database: 'Database',
  noDateSelected: 'No date selected',
  allOrders: 'All orders',
  profileCenter: 'Profile center',
  profileCenterDescription: 'Security, account context, and quick navigation from one place',
  role: 'Role',
  visibleTabs: 'Visible tabs',
  dispatchDate: 'Dispatch date',
  dispatchChooseDate: 'Choose date',
  dispatchSave: 'Save',
  dispatchStart: 'Start',
  security: 'Security',
  securityDescription: 'Protect account access and end sessions quickly.',
  changePassword: 'Change password',
  quickNavigation: 'Quick navigation',
  warehouseStartPoint: 'Warehouse start point',
  warehouseStartPointDescription: 'Used for route generation and sorting for all couriers.',
  warehouseInputLabel: 'Google Maps URL or coordinates (lat,lng)',
  readOnly: '(read only)',
  warehousePlaceholder: 'Example: 41.311081,69.240562',
  current: 'Current',
  notConfigured: 'not configured',
  preview: 'Preview',
  refresh: 'Refresh',
  saving: 'Saving...',
  saveLocation: 'Save location',
  useMyLocation: 'Use my location',
  geolocationUnsupported: 'Geolocation is not supported by this browser.',
  geolocationDenied: 'Geolocation permission denied.',
  geolocationFailed: 'Failed to get current location.',
  geolocationSet: 'Location set from device.',
  messages: 'Messages',
  messagesDescription: 'Team conversations and quick coordination.',
  ordersBin: 'Orders bin',
  clientsBin: 'Clients bin',
  autoSet: 'Auto (active global set)',
  active: '(Active)',
  enableAutoOrderCreation: 'Enable automatic order creation',
  searchClientPlaceholder: 'Search client...',
  searchClientsAria: 'Search clients',
  clear: 'Clear',
  calendar: 'Calendar',
  today: 'Today',
  clearDate: 'Clear date',
  allTime: 'All time',
  thisWeek: 'This week',
  thisMonth: 'This month',
  next: 'Next',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  searchOrdersPlaceholder: 'Search by name, address, or order number...',
  searchOrdersAria: 'Search orders',
  rows: 'rows',
  filters: 'filters',
  resetFilters: 'Reset filters',
  noOrdersFound: 'No orders found',
  noOrdersFoundDescription: 'Adjust the filters or search query.',
  showing: 'Showing',
  of: 'of',
  statusFilter: 'Status filter',
  allClients: 'All clients',
  activeOnly: 'Active only',
  pausedOnly: 'Paused only',
  bin: 'Bin',
  createClient: 'Create client',
  editClient: 'Edit client',
  updateClientDetails: 'Update the client details.',
  createClientDescription: 'Create a new client in the system.',
  nickname: 'Nickname',
  nicknamePlaceholder: 'Example: Office, Home... (optional)',
  mapLink: 'Map link',
  map: 'Map',
  mapHint: 'Click the map to pick a point (you can also drag the marker).',
  phoneFormat: 'Format: +998 XX XXX XX XX',
  balance: 'Balance',
  days: 'Days',
  daysShort: 'd',
}

const localeMap: Record<string, ProfileUiText> = { ru, uz, en }

/** Return the profile UI text for the given language code. Defaults to English. */
export function getProfileUiText(language: string): ProfileUiText {
  return localeMap[language] ?? en
}
