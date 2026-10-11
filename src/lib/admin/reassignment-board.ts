// C7 / R19: pure assignment logic for the courier reassignment board — the
// drag&drop surface only renders this state. An order is either unassigned
// ('') or bound to exactly one target courier; several orders may share a
// target. Dropping back on the source pane clears the assignment.

export type ReassignmentTargets = Record<string, string>

export const REASSIGNMENT_UNASSIGNED = ''

export function applyOrderDrop(
  targets: ReassignmentTargets,
  orderId: string,
  targetCourierId: string,
): ReassignmentTargets {
  if (!orderId) return targets
  const next: ReassignmentTargets = { ...targets }
  if (!targetCourierId || targetCourierId === REASSIGNMENT_UNASSIGNED) {
    next[orderId] = REASSIGNMENT_UNASSIGNED
    return next
  }
  next[orderId] = targetCourierId
  return next
}

export function unassignedOrderIds(
  orderIds: readonly string[],
  targets: ReassignmentTargets,
): string[] {
  return orderIds.filter((orderId) => !targets[orderId])
}

export function ordersByTarget(
  orderIds: readonly string[],
  targets: ReassignmentTargets,
): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const orderId of orderIds) {
    const target = targets[orderId]
    if (!target) continue
    const list = grouped.get(target) ?? []
    list.push(orderId)
    grouped.set(target, list)
  }
  return grouped
}

export function hasUnassignedOrders(
  orderIds: readonly string[],
  targets: ReassignmentTargets,
): boolean {
  return unassignedOrderIds(orderIds, targets).length > 0
}
