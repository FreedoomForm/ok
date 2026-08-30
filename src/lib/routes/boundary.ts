export type BoundaryRect = { x: number; y: number; width: number; height: number }

export type BoundaryPointEntry = {
  id?: string
  centerX: number
  centerY: number
}

/**
 * Inclusive-edge point-in-rect test for the schematic routes map: an order tile
 * belongs to a drawn route area when its center lies on or inside the boundary.
 */
export function isPointInsideBoundary(point: BoundaryPointEntry, boundary: BoundaryRect): boolean {
  return (
    point.centerX >= boundary.x &&
    point.centerX <= boundary.x + boundary.width &&
    point.centerY >= boundary.y &&
    point.centerY <= boundary.y + boundary.height
  )
}

/** Resolves the order ids captured by a drawn boundary, preserving the caller's entry order. */
export function orderIdsInsideBoundary(entries: readonly BoundaryPointEntry[], boundary: BoundaryRect): string[] {
  return entries.filter((entry): entry is BoundaryPointEntry & { id: string } => typeof entry.id === 'string' && entry.id !== '' && isPointInsideBoundary(entry, boundary)).map((entry) => entry.id)
}
