export type BulkOrderFormState = {
  orderStatus: string
  paymentStatus: string
  courierId: string
  deliveryDate: string
}

export type BulkClientFormState = {
  isActive?: boolean
  calories: string
}

export type BulkOrderUpdates = Partial<Pick<BulkOrderFormState, 'orderStatus' | 'paymentStatus' | 'courierId' | 'deliveryDate'>>
export type BulkClientUpdates = Partial<Pick<BulkClientFormState, 'isActive' | 'calories'>>

export function buildBulkOrderUpdates(form: BulkOrderFormState): BulkOrderUpdates {
  return Object.fromEntries(
    Object.entries(form).filter(([, value]) => value !== ''),
  ) as BulkOrderUpdates
}

export function buildBulkClientUpdates(form: BulkClientFormState): BulkClientUpdates {
  return {
    ...(form.isActive !== undefined ? { isActive: form.isActive } : {}),
    ...(form.calories !== '' ? { calories: form.calories } : {}),
  }
}
