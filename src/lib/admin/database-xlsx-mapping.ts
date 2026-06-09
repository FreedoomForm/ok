export type TableId =
  | 'admins'
  | 'customers'
  | 'orders'
  | 'transactions'
  | 'websites'
  | 'menuSets'
  | 'menus'
  | 'dishes'
  | 'warehouse'
  | 'cookingPlans'
  | 'actionLogs'
  | 'orderAudit'

export function isTableId(value: string): value is TableId {
  return (
    value === 'admins' ||
    value === 'customers' ||
    value === 'orders' ||
    value === 'transactions' ||
    value === 'websites' ||
    value === 'menuSets' ||
    value === 'menus' ||
    value === 'dishes' ||
    value === 'warehouse' ||
    value === 'cookingPlans' ||
    value === 'actionLogs' ||
    value === 'orderAudit'
  )
}

function normalizeLabel(value: string) {
  return value
    .replace(/\t/g, ' ')
    // Handle both real curly quotes and common mojibake variants that can appear in exports.
    .replace(/[’‘â€™â€˜`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Common header aliases across tables (uz/ru/en).
const COMMON_ALIASES: Record<string, string> = {
  id: 'id',
  'i̇d': 'id',
  '№': 'id',
  createdat: 'createdAt',
  created_at: 'createdAt',
  'yaratilgan': 'createdAt',
  'created at': 'createdAt',
  'создано': 'createdAt',
  updatedat: 'updatedAt',
  updated_at: 'updatedAt',
  'yangilangan': 'updatedAt',
  'updated at': 'updatedAt',
  'обновлено': 'updatedAt',
  deletedat: 'deletedAt',
  deleted_at: 'deletedAt',
  "o'chirilgan": 'deletedAt',
  "o‘chirilgan": 'deletedAt',
  'deleted at': 'deletedAt',
  'удалено': 'deletedAt',
  latitude: 'latitude',
  longitude: 'longitude',
  'last latitude': 'lastLatitude',
  'last longitude': 'lastLongitude',
  'last location at': 'lastLocationAt',
}

const ALIASES_BY_TABLE: Partial<Record<TableId, Record<string, string>>> = {
  customers: {
    ism: 'name',
    имя: 'name',
    name: 'name',
    laqab: 'nickName',
    никнейм: 'nickName',
    nickname: 'nickName',
    telefon: 'phone',
    телефон: 'phone',
    phone: 'phone',
    manzil: 'address',
    адрес: 'address',
    address: 'address',
    preferences: 'preferences',
    настройки: 'preferences',
    'order pattern': 'orderPattern',
    'шаблон заказа': 'orderPattern',
    password: 'password',
    parol: 'password',
    пароль: 'password',
    'фаол': 'isActive',
    faol: 'isActive',
    active: 'isActive',
    активен: 'isActive',
    'deleted by': 'deletedBy',
    'удалил': 'deletedBy',
    yaratgan: 'createdBy',
    создал: 'createdBy',
    'default courier id': 'defaultCourierId',
    'курьер по умолчанию id': 'defaultCourierId',
    'kaloriya': 'calories',
    calories: 'calories',
    'plan type': 'planType',
    'тип плана': 'planType',
    'kunlik narx': 'dailyPrice',
    'daily price': 'dailyPrice',
    izohlar: 'notes',
    'примечания': 'notes',
    notes: 'notes',
    'delivery days': 'deliveryDays',
    'дни доставки': 'deliveryDays',
    'auto orders enabled': 'autoOrdersEnabled',
    'авто заказы включены': 'autoOrdersEnabled',
    balance: 'balance',
    баланс: 'balance',
    'assigned set id': 'assignedSetId',
  },
  orders: {
    'buyurtma raqami': 'orderNumber',
    'номер заказа': 'orderNumber',
    'order number': 'orderNumber',
    'buyurtma holati': 'orderStatus',
    'статус заказа': 'orderStatus',
    'order status': 'orderStatus',
    'mijoz id': 'customerId',
    'клиент id': 'customerId',
    'customer id': 'customerId',
    'yetkazish sanasi': 'deliveryDate',
    'дата доставки': 'deliveryDate',
    'delivery date': 'deliveryDate',
    'yetkazish manzili': 'deliveryAddress',
    'адрес доставки': 'deliveryAddress',
    'delivery address': 'deliveryAddress',
    'yetkazish vaqti': 'deliveryTime',
    'время доставки': 'deliveryTime',
    'delivery time': 'deliveryTime',
    miqdor: 'quantity',
    quantity: 'quantity',
    kaloriya: 'calories',
    calories: 'calories',
    'maxsus istak': 'specialFeatures',
    'особые пожелания': 'specialFeatures',
    izohlar: 'notes',
    'примечания': 'notes',
    "to'lov holati": 'paymentStatus',
    'статус оплаты': 'paymentStatus',
    "to'lov usuli": 'paymentMethod',
    'способ оплаты': 'paymentMethod',
    "oldindan to'lov": 'isPrepaid',
    'предоплата': 'isPrepaid',
    priority: 'priority',
    приоритет: 'priority',
    'source channel': 'sourceChannel',
    'канал источника': 'sourceChannel',
    'status changed at': 'statusChangedAt',
    'статус изменен': 'statusChangedAt',
    'assigned at': 'assignedAt',
    назначено: 'assignedAt',
    'picked up at': 'pickedUpAt',
    забрано: 'pickedUpAt',
    'paused at': 'pausedAt',
    приостановлено: 'pausedAt',
    'resumed at': 'resumedAt',
    возобновлено: 'resumedAt',
    'delivered at': 'deliveredAt',
    доставлено: 'deliveredAt',
    'failed at': 'failedAt',
    'не удалось': 'failedAt',
    'canceled at': 'canceledAt',
    отменено: 'canceledAt',
    'confirmed at': 'confirmedAt',
    подтверждено: 'confirmedAt',
    'eta minutes': 'etaMinutes',
    'route distance km': 'routeDistanceKm',
    'route duration min': 'routeDurationMin',
    'sequence in route': 'sequenceInRoute',
    'customer rating': 'customerRating',
    'customer feedback': 'customerFeedback',
    "qabul qilingan": 'amountReceived',
    'admin id': 'adminId',
    'админ id': 'adminId',
    'kuryer id': 'courierId',
    'курьер id': 'courierId',
    'order type': 'orderType',
    'from auto order': 'fromAutoOrder',
  },
  admins: {
    email: 'email',
    password: 'password',
    parol: 'password',
    ism: 'name',
    имя: 'name',
    rol: 'role',
    роль: 'role',
    faol: 'isActive',
    активен: 'isActive',
    yaratgan: 'createdBy',
    создал: 'createdBy',
    'trial ends at': 'trialEndsAt',
    'окончание пробного периода': 'trialEndsAt',
    'allowed tabs': 'allowedTabs',
    'разрешенные вкладки': 'allowedTabs',
    'google id': 'googleId',
    'has password': 'hasPassword',
    telefon: 'phone',
    телефон: 'phone',
    'transport type': 'transportType',
    'тип транспорта': 'transportType',
    'vehicle number': 'vehicleNumber',
    'номер машины': 'vehicleNumber',
    'max load': 'maxLoad',
    'макс груз': 'maxLoad',
    smenada: 'isOnShift',
    'shift started at': 'shiftStartedAt',
    'shift endded at': 'shiftEndedAt',
    'shift ended at': 'shiftEndedAt',
    'last seen at': 'lastSeenAt',
    'average delivery minutes': 'averageDeliveryMinutes',
    'company balance': 'companyBalance',
    maosh: 'salary',
    'зарплата': 'salary',
  },
  warehouse: {
    name: 'name',
    ism: 'name',
    nomi: 'name',
    название: 'name',
    amount: 'amount',
    miqdori: 'amount',
    количество: 'amount',
    unit: 'unit',
    birligi: 'unit',
    единица: 'unit',
    'kcal per gram': 'kcalPerGram',
    kaloriya: 'kcalPerGram',
    калории: 'kcalPerGram',
    'price per unit': 'pricePerUnit',
    narxi: 'pricePerUnit',
    цена: 'pricePerUnit',
    'price unit': 'priceUnit',
    'narx birligi': 'priceUnit',
    'единица цены': 'priceUnit',
  },
}

export function mapHeaderToKey(tableId: TableId, header: string): string {
  const trimmed = header.trim()
  if (!trimmed) return ''
  const normalized = normalizeLabel(trimmed)

  const byTable = ALIASES_BY_TABLE[tableId]?.[normalized]
  if (byTable) return byTable

  const common = COMMON_ALIASES[normalized]
  if (common) return common

  // If the header is already a Prisma field key, keep it.
  return trimmed
}

export function mapHeaderRow(tableId: TableId, headerRow: string[]) {
  return headerRow.map((header) => mapHeaderToKey(tableId, header))
}

export function sheetNameToTableId(sheetName: string): TableId | null {
  const normalized = normalizeLabel(sheetName)

  const direct = normalized.replace(/\s+/g, '')
  if (isTableId(direct as string)) return direct as TableId

  const dict: Record<string, TableId> = {
    admins: 'admins',
    'админы': 'admins',
    adminlar: 'admins',
    customers: 'customers',
    'клиенты': 'customers',
    mijozlar: 'customers',
    orders: 'orders',
    'заказы': 'orders',
    buyurtmalar: 'orders',
    transactions: 'transactions',
    'транзакции': 'transactions',
    tranzaksiyalar: 'transactions',
    websites: 'websites',
    'сайты': 'websites',
    saytlar: 'websites',
    'menu sets': 'menuSets',
    'сеты меню': 'menuSets',
    'menyu setlari': 'menuSets',
    menus: 'menus',
    'меню': 'menus',
    menyular: 'menus',
    dishes: 'dishes',
    'блюда': 'dishes',
    taomlar: 'dishes',
    warehouse: 'warehouse',
    'склад': 'warehouse',
    ombor: 'warehouse',
    'cooking plans': 'cookingPlans',
    'планы готовки': 'cookingPlans',
    'pishirish rejalari': 'cookingPlans',
    'action logs': 'actionLogs',
    'логи': 'actionLogs',
    loglar: 'actionLogs',
    'order audit': 'orderAudit',
    'аудит': 'orderAudit',
    audit: 'orderAudit',
  }

  return dict[normalized] ?? null
}
