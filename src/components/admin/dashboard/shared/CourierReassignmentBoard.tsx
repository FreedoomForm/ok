'use client'

import { useState } from 'react'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'

import { cn } from '@/lib/utils'
import { applyOrderDrop, hasUnassignedOrders, ordersByTarget, unassignedOrderIds, REASSIGNMENT_UNASSIGNED } from '@/lib/admin/reassignment-board'

export type ReassignmentOrder = {
  id: string
  orderNumber: number
  customerName?: string | null
  deliveryDate?: string | null
}

export type ReassignmentCourier = {
  id: string
  name: string
}

export type CourierReassignmentBoardTexts = {
  ordersPane: string
  couriersPane: string
  unassigned: string
  assignHint: string
  dropHere: string
  pickHint: string
}

type BoardProps = {
  orders: readonly ReassignmentOrder[]
  couriers: readonly ReassignmentCourier[]
  targets: Record<string, string>
  onTargetsChange: (next: Record<string, string>) => void
  texts: CourierReassignmentBoardTexts
}

function OrderCard({ order, assigned, onPick }: { order: ReassignmentOrder; assigned: boolean; onPick: (orderId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      data-reassignment-order={order.id}
      data-assigned={assigned || undefined}
      onClick={() => onPick(order.id)}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        'flex w-full cursor-grab touch-none items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        assigned ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-border bg-muted/40 hover:bg-accent',
        isDragging && 'opacity-60',
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 truncate">#{order.orderNumber} · {order.customerName ?? 'Клиент'} · {order.deliveryDate?.slice(0, 10) ?? '—'}</span>
    </button>
  )
}

function CourierDropZone({
  courier,
  orders,
  selectedOrderId,
  onDropOrder,
  texts,
}: {
  courier: ReassignmentCourier
  orders: readonly ReassignmentOrder[]
  selectedOrderId: string | null
  onDropOrder: (orderId: string, courierId: string) => void
  texts: CourierReassignmentBoardTexts
}) {
  const { setNodeRef, isOver } = useDroppable({ id: courier.id })
  return (
    <div
      ref={setNodeRef}
      data-reassignment-courier={courier.id}
      onClick={() => { if (selectedOrderId) onDropOrder(selectedOrderId, courier.id) }}
      className={cn(
        'min-h-16 rounded-md border border-dashed p-2 text-xs transition-colors',
        isOver ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40' : 'border-border bg-background',
      )}
    >
      <p className="mb-1 font-medium">{courier.name}</p>
      {orders.length === 0 ? <p className="text-[11px] text-muted-foreground">{texts.dropHere}</p> : (
        <ul className="space-y-1">
          {orders.map((order) => (
            <li key={order.id} className="truncate rounded bg-muted/50 px-1.5 py-0.5" data-reassignment-assigned-order={order.id}>
              #{order.orderNumber} · {order.customerName ?? 'Клиент'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * C7 / R19: the two-pane distribution board — orders on the left, couriers on
 * the right. Pointer drag via dnd-kit; an accessible click-to-pick fallback
 * (tap an order, tap a courier) doubles as the touch path.
 */
export function CourierReassignmentBoard({ orders, couriers, targets, onTargetsChange, texts }: BoardProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const unassigned = unassignedOrderIds(orders.map((order) => order.id), targets)
  const grouped = ordersByTarget(orders.map((order) => order.id), targets)
  const orderById = new Map(orders.map((order) => [order.id, order]))

  const handleDragEnd = (event: DragEndEvent) => {
    const orderId = String(event.active.id ?? '')
    const targetId = event.over?.id ? String(event.over.id) : REASSIGNMENT_UNASSIGNED
    if (!orderId) return
    onTargetsChange(applyOrderDrop(targets, orderId, targetId))
    setSelectedOrderId(null)
  }

  const handlePick = (orderId: string) => setSelectedOrderId((current) => (current === orderId ? null : orderId))
  const handleDropByClick = (orderId: string, courierId: string) => {
    onTargetsChange(applyOrderDrop(targets, orderId, courierId))
    setSelectedOrderId(null)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-2" data-reference-reassignment-board="true">
        <section
          className="space-y-2 rounded-md border border-border bg-muted/20 p-2"
          aria-label={texts.ordersPane}
          data-reassignment-unassigned-pane="true"
          onClick={() => { if (selectedOrderId) handleDropByClick(selectedOrderId, REASSIGNMENT_UNASSIGNED) }}
        >
          <h3 className="text-sm font-medium">{texts.ordersPane}: {orders.length}</h3>
          {orders.length === 0 ? <p className="text-sm text-muted-foreground">{texts.unassigned}</p> : (
            <div className="space-y-1.5">
              {unassigned.map((orderId) => {
                const order = orderById.get(orderId)
                return order ? <OrderCard key={orderId} order={order} assigned={false} onPick={handlePick} /> : null
              })}
              {[...grouped.entries()].flatMap(([courierId, orderIds]) => orderIds.map((orderId) => {
                const order = orderById.get(orderId)
                return order ? <OrderCard key={orderId} order={order} assigned onPick={handlePick} /> : null
              }))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">{texts.assignHint}</p>
        </section>
        <section className="space-y-2" aria-label={texts.couriersPane}>
          <h3 className="text-sm font-medium">{texts.couriersPane}</h3>
          {selectedOrderId ? <p className="text-[11px] text-muted-foreground">{texts.pickHint}</p> : null}
          <div className="space-y-2">
            {couriers.map((courier) => (
              <CourierDropZone
                key={courier.id}
                courier={courier}
                orders={(grouped.get(courier.id) ?? []).map((orderId) => orderById.get(orderId)).filter((order): order is ReassignmentOrder => Boolean(order))}
                selectedOrderId={selectedOrderId}
                onDropOrder={handleDropByClick}
                texts={texts}
              />
            ))}
          </div>
        </section>
      </div>
    </DndContext>
  )
}

export function ReassignmentBoardSaveDisabled(orders: readonly ReassignmentOrder[], targets: Record<string, string>): boolean {
  // Save stays disabled with an empty board (nothing to apply) or with any
  // order still unassigned.
  return orders.length === 0 || hasUnassignedOrders(orders.map((order) => order.id), targets)
}
