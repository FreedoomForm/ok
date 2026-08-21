export type DeliverySettlementInput = {
  dailyPrice: number | null | undefined
  quantity: number | null | undefined
  previousAmountReceived: number | null | undefined
  amountReceivedDelta: unknown
  isPrepaid: boolean
}

export type DeliverySettlement = {
  dailyPrice: number
  paymentDelta: number
  nextAmountReceived: number
  paymentStatus: 'PAID' | 'UNPAID' | undefined
}

export type PaymentAdjustment = {
  nextAmountReceived: number | null
  delta: number
}

function positiveFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function calculateDeliverySettlement(input: DeliverySettlementInput): DeliverySettlement {
  const dailyPrice = positiveFiniteNumber(input.dailyPrice, 84000)
  const quantity = positiveFiniteNumber(input.quantity, 1)
  const previousAmountReceived = positiveFiniteNumber(input.previousAmountReceived, 0)
  const paymentDelta = positiveFiniteNumber(input.amountReceivedDelta, 0)
  const nextAmountReceived = previousAmountReceived + paymentDelta
  const totalOrderCost = dailyPrice * quantity

  return {
    dailyPrice,
    paymentDelta,
    nextAmountReceived,
    paymentStatus:
      nextAmountReceived >= totalOrderCost
        ? 'PAID'
        : input.isPrepaid
          ? undefined
          : 'UNPAID',
  }
}

export function calculatePaymentAdjustment(
  previousAmountReceived: number | null | undefined,
  requestedAmountReceived: unknown
): PaymentAdjustment {
  const previous = positiveFiniteNumber(previousAmountReceived, 0)
  const requested = positiveFiniteNumber(requestedAmountReceived, 0)
  return {
    nextAmountReceived: requested > 0 ? requested : null,
    delta: requested - previous,
  }
}
