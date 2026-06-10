/**
 * Finance Domain Events — Domain layer.
 */

import type { DomainEvent } from '@/modules/orders/domain/order.events'
import type { TransactionType } from '../contracts'

export interface TransactionCreatedPayload {
  transactionId: string
  amount: number
  type: TransactionType
  category: string | null
  adminId: string | null
  customerId: string | null
  salaryRecipientAdminId: string | null
}

export type TransactionCreatedEvent = DomainEvent<'transaction.created', TransactionCreatedPayload>

export interface SalaryPaidPayload {
  transactionId: string
  recipientAdminId: string
  amount: number
  paidBy: string
}

export type SalaryPaidEvent = DomainEvent<'transaction.salary-paid', SalaryPaidPayload>

export interface IngredientsPurchasedPayload {
  transactionId: string
  totalCost: number
  itemCount: number
  purchasedBy: string
}

export type IngredientsPurchasedEvent = DomainEvent<'transaction.ingredients-purchased', IngredientsPurchasedPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createTransactionCreatedEvent(payload: TransactionCreatedPayload): TransactionCreatedEvent {
  return {
    type: 'transaction.created',
    aggregateType: 'transaction',
    aggregateId: payload.transactionId,
    payload,
    timestamp: new Date(),
  }
}

export function createSalaryPaidEvent(payload: SalaryPaidPayload): SalaryPaidEvent {
  return {
    type: 'transaction.salary-paid',
    aggregateType: 'transaction',
    aggregateId: payload.transactionId,
    payload,
    timestamp: new Date(),
  }
}

export function createIngredientsPurchasedEvent(payload: IngredientsPurchasedPayload): IngredientsPurchasedEvent {
  return {
    type: 'transaction.ingredients-purchased',
    aggregateType: 'transaction',
    aggregateId: payload.transactionId,
    payload,
    timestamp: new Date(),
  }
}
