/**
 * Order Entity — Domain layer.
 *
 * Encapsulates business rules for order status transitions,
 * payment resolution, and validation.
 */

import type { OrderStatus, PaymentStatus } from '../contracts'
import { OrderStatusTransitionError, OrderAlreadyDeliveredError, OrderNotDeliverableError } from './order.errors'

// ── Status transition map ──────────────────────────────────────────────────

/**
 * Valid status transitions for orders.
 * Key = current status, Value = set of allowed next statuses.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'CANCELED'],
  PENDING: ['IN_PROCESS', 'IN_DELIVERY', 'PAUSED', 'CANCELED'],
  IN_PROCESS: ['IN_DELIVERY', 'CANCELED'],
  IN_DELIVERY: ['DELIVERED', 'PAUSED', 'CANCELED', 'FAILED'],
  PAUSED: ['IN_DELIVERY', 'CANCELED'],
  DELIVERED: [], // terminal state
  CANCELED: [], // terminal state
  FAILED: [], // terminal state
}

// ── Entity ─────────────────────────────────────────────────────────────────

export class OrderEntity {
  constructor(
    public readonly id: string,
    public readonly orderStatus: OrderStatus,
    public readonly paymentStatus: PaymentStatus,
    public readonly isPrepaid: boolean = false,
    public readonly amountReceived: number | null = null,
    public readonly quantity: number = 1,
    public readonly dailyPrice: number = 84000,
  ) {}

  /**
   * Check if the order can transition to a new status.
   */
  canTransitionTo(newStatus: OrderStatus): boolean {
    const allowed = VALID_TRANSITIONS[this.orderStatus]
    if (!allowed) return false
    return allowed.includes(newStatus)
  }

  /**
   * Assert that the transition is valid; throw if not.
   */
  assertCanTransitionTo(newStatus: OrderStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new OrderStatusTransitionError(this.orderStatus, newStatus)
    }
  }

  /**
   * Check if the order is in a terminal (immutable) state.
   */
  isTerminal(): boolean {
    return this.orderStatus === 'DELIVERED' || this.orderStatus === 'CANCELED' || this.orderStatus === 'FAILED'
  }

  /**
   * Check if the order can be delivered (completed).
   */
  canBeDelivered(): boolean {
    return this.canTransitionTo('DELIVERED')
  }

  /**
   * Check if the order can be cancelled.
   */
  canBeCancelled(): boolean {
    return this.canTransitionTo('CANCELED')
  }

  /**
   * Check if the order can be started for delivery.
   */
  canStartDelivery(): boolean {
    return this.canTransitionTo('IN_DELIVERY')
  }

  /**
   * Check if the delivery can be paused.
   */
  canPauseDelivery(): boolean {
    return this.canTransitionTo('PAUSED')
  }

  /**
   * Check if the delivery can be resumed.
   */
  canResumeDelivery(): boolean {
    return this.canTransitionTo('IN_DELIVERY') && this.orderStatus === 'PAUSED'
  }

  /**
   * Resolve payment status based on amount received and total cost.
   */
  resolvePaymentStatus(amountReceived: number): PaymentStatus {
    const totalCost = this.dailyPrice * this.quantity
    if (totalCost > 0 && amountReceived >= totalCost) return 'PAID'
    if (amountReceived > 0) return 'PARTIAL'
    return 'UNPAID'
  }

  /**
   * Calculate total order cost.
   */
  totalCost(): number {
    return this.dailyPrice * this.quantity
  }
}

// Re-export errors from order.errors for convenience
export { OrderStatusTransitionError, OrderAlreadyDeliveredError, OrderNotDeliverableError }
