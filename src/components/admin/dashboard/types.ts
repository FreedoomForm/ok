export interface Admin {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  allowedTabs?: string[]
  salary?: number
  latitude?: number | null
  longitude?: number | null
  transportType?: string | null
  vehicleNumber?: string | null
  maxLoad?: number
  isOnShift?: boolean
  shiftStartedAt?: string | null
  shiftEndedAt?: string | null
  lastSeenAt?: string | null
  averageDeliveryMinutes?: number | null
}

export interface Order {
  id: string
  orderNumber: number
  customer: {
    name: string
    phone: string
    assignedSetId?: string | null
    assignedSetName?: string | null
  }
  deliveryAddress: string
  latitude?: number
  longitude?: number
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  paymentStatus: string
  paymentMethod: string
  orderStatus: string
  isPrepaid: boolean
  priority?: number
  sourceChannel?: string | null
  statusChangedAt?: string
  assignedAt?: string | null
  pickedUpAt?: string | null
  pausedAt?: string | null
  resumedAt?: string | null
  deliveredAt?: string | null
  failedAt?: string | null
  canceledAt?: string | null
  confirmedAt?: string | null
  etaMinutes?: number | null
  routeDistanceKm?: number | null
  routeDurationMin?: number | null
  sequenceInRoute?: number | null
  customerRating?: number | null
  customerFeedback?: string | null
  lastLatitude?: number | null
  lastLongitude?: number | null
  lastLocationAt?: string | null
  createdAt: string
  deliveryDate?: string
  isAutoOrder?: boolean
  customerName?: string
  customerPhone?: string
  courierId?: string
  courierName?: string
  assignedSetId?: string | null
  assignedSetName?: string | null
  amountReceived?: number | null
}

export interface Client {
  id: string
  name: string
  nickName?: string | null
  phone: string
  address: string
  calories: number
  planType: 'CLASSIC' | 'INDIVIDUAL' | 'DIABETIC'
  dailyPrice: number
  balance: number
  notes?: string
  specialFeatures: string
  deliveryDays: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  autoOrdersEnabled: boolean
  isActive: boolean
  createdAt: string
  deletedAt?: string
  deletedBy?: string
  defaultCourierId?: string
  defaultCourierName?: string
  assignedSetId?: string
  assignedSetName?: string
  googleMapsLink?: string
  latitude?: number | null
  longitude?: number | null
}

export interface Stats {
  successfulOrders: number
  failedOrders: number
  pendingOrders: number
  inDeliveryOrders: number
  pausedOrders: number
  prepaidOrders: number
  unpaidOrders: number
  cardOrders: number
  cashOrders: number
  dailyCustomers: number
  evenDayCustomers: number
  oddDayCustomers: number
  specialPreferenceCustomers: number
  orders1200: number
  orders1600: number
  orders2000: number
  orders2500: number
  orders3000: number
  singleItemOrders: number
  multiItemOrders: number
}

// ---------------------------------------------------------------------------
// Shared form data types & defaults (extracted from AdminDashboardPage)
// ---------------------------------------------------------------------------

export type AdminRoleOption = 'LOW_ADMIN' | 'COURIER' | 'WORKER'

export type AdminFormData = {
  name: string
  email: string
  password: string
  role: AdminRoleOption
  salary: number
  allowedTabs: string[]
}

export type EditAdminFormData = AdminFormData & {
  isActive: boolean
}

export const DEFAULT_ADMIN_FORM: AdminFormData = {
  name: '',
  email: '',
  password: '',
  role: 'LOW_ADMIN',
  allowedTabs: [],
  salary: 0,
}

export const DEFAULT_EDIT_ADMIN_FORM: EditAdminFormData = {
  ...DEFAULT_ADMIN_FORM,
  isActive: true,
}

export type DeliveryDays = {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

export const DEFAULT_DELIVERY_DAYS: DeliveryDays = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
}

export type OrderFormData = {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryTime: string
  quantity: number
  calories: number
  specialFeatures: string
  paymentStatus: string
  paymentMethod: string
  isPrepaid: boolean
  amountReceived: number | null
  selectedClientId: string
  latitude: number | null
  longitude: number | null
  courierId: string
  assignedSetId: string
}

export const DEFAULT_ORDER_FORM: OrderFormData = {
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  deliveryTime: '',
  quantity: 1,
  calories: 1200,
  specialFeatures: '',
  paymentStatus: 'UNPAID',
  paymentMethod: 'CASH',
  isPrepaid: false,
  amountReceived: null,
  selectedClientId: '',
  latitude: null,
  longitude: null,
  courierId: '',
  assignedSetId: '',
}

export type ClientFormData = {
  name: string
  nickName: string
  phone: string
  address: string
  calories: number
  planType: 'CLASSIC' | 'INDIVIDUAL' | 'DIABETIC'
  dailyPrice: number
  notes: string
  specialFeatures: string
  deliveryDays: DeliveryDays
  autoOrdersEnabled: boolean
  isActive: boolean
  defaultCourierId: string
  googleMapsLink: string
  latitude: number | null
  longitude: number | null
  assignedSetId: string
}

export const DEFAULT_CLIENT_FORM: ClientFormData = {
  name: '',
  nickName: '',
  phone: '',
  address: '',
  calories: 1200,
  planType: 'CLASSIC',
  dailyPrice: 84000,
  notes: '',
  specialFeatures: '',
  deliveryDays: { ...DEFAULT_DELIVERY_DAYS },
  autoOrdersEnabled: true,
  isActive: true,
  defaultCourierId: '',
  googleMapsLink: '',
  latitude: null,
  longitude: null,
  assignedSetId: '',
}

export type CourierFormData = {
  name: string
  email: string
  password: string
  salary: string
}

export const DEFAULT_COURIER_FORM: CourierFormData = {
  name: '',
  email: '',
  password: '',
  salary: '',
}

export type BulkOrderUpdates = {
  orderStatus: string
  paymentStatus: string
  courierId: string
  deliveryDate: string
}

export const DEFAULT_BULK_ORDER_UPDATES: BulkOrderUpdates = {
  orderStatus: '',
  paymentStatus: '',
  courierId: '',
  deliveryDate: '',
}

export type BulkClientUpdates = {
  isActive: boolean | undefined
  calories: string
}

export const DEFAULT_BULK_CLIENT_UPDATES: BulkClientUpdates = {
  isActive: undefined,
  calories: '',
}

export const DEFAULT_ORDER_FILTERS = {
  successful: false,
  failed: false,
  pending: false,
  inDelivery: false,
  prepaid: false,
  paid: false,
  unpaid: false,
  card: false,
  cash: false,
  daily: false,
  evenDay: false,
  oddDay: false,
  special: false,
  calories1200: false,
  calories1600: false,
  calories2000: false,
  calories2500: false,
  calories3000: false,
  singleItem: false,
  multiItem: false,
  autoOrders: false,
  manualOrders: false,
} as const

export type OrderFilters = { -readonly [K in keyof typeof DEFAULT_ORDER_FILTERS]: boolean }
