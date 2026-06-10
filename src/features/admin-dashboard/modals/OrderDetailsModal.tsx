'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  CalendarDays,
  MapPin,
  Clock,
  Truck,
} from 'lucide-react'

import type { Order, OrderTimelineEvent } from '@/features/admin-dashboard/model'

interface OrderDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  timeline: OrderTimelineEvent[]
  isTimelineLoading: boolean
  t: any  // translation object
  onEdit?: (order: Order) => void
}

export function OrderDetailsModal({
  open,
  onOpenChange,
  order,
  timeline,
  isTimelineLoading,
  t,
  onEdit,
}: OrderDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.admin.orderDetails} #{order?.orderNumber}</DialogTitle>
          <DialogDescription>
            {t.admin.orderFullInfo}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          {order && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-hierarchy">{t.admin.statusLabel}:</span>
                  <Badge
                    variant={
                      order.orderStatus === 'DELIVERED'
                        ? "success"
                        : order.orderStatus === 'IN_DELIVERY'
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {order.orderStatus === 'DELIVERED'
                      ? "Доставлен"
                      : order.orderStatus === 'IN_DELIVERY'
                        ? "В доставке"
                        : "Ожидает"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-hierarchy">{t.admin.paymentLabel}:</span>
                  <Badge
                    variant={order.paymentStatus === 'PAID' ? "success" : "destructive"}
                  >
                    {order.paymentStatus === 'PAID' ? "Оплачен" : "Не оплачен"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-hierarchy">{t.admin.methodLabel}:</span>
                  <span className="text-sm">{order.paymentMethod === 'CASH' ? t.admin.statsLabels.cashPayment : t.admin.card}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-hierarchy">{t.admin.quantityLabel}:</span>
                  <span className="text-sm font-bold">{order.quantity} {t.admin.portions}.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-hierarchy">{t.admin.caloriesLabel}:</span>
                  <span className="text-sm">{order.calories} {t.admin.kcal}</span>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.operationalDetails}</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-hierarchy">Priority</span>
                  <span>{order.priority ?? 3}</span>
                  <span className="text-muted-hierarchy">ETA</span>
                  <span>{order.etaMinutes ? `${order.etaMinutes} ${t.admin.min}` : '-'}</span>
                  <span className="text-muted-hierarchy">{t.admin.lastChange}</span>
                  <span>
                    {order.statusChangedAt
                      ? new Date(order.statusChangedAt).toLocaleString('ru-RU')
                      : '-'}
                  </span>
                  <span className="text-muted-hierarchy">{t.admin.assignedCourier}</span>
                  <span>{order.assignedAt ? new Date(order.assignedAt).toLocaleString('ru-RU') : '-'}</span>
                  <span className="text-muted-hierarchy">{t.admin.deliveryStart}</span>
                  <span>{order.pickedUpAt ? new Date(order.pickedUpAt).toLocaleString('ru-RU') : '-'}</span>
                  <span className="text-muted-hierarchy">{t.admin.pause}</span>
                  <span>{order.pausedAt ? new Date(order.pausedAt).toLocaleString('ru-RU') : '-'}</span>
                  <span className="text-muted-hierarchy">{t.admin.completed}</span>
                  <span>{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('ru-RU') : '-'}</span>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.client}</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-neutral-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-hierarchy" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{order.customerName || order.customer?.name}</p>
                    <p className="text-xs text-muted-hierarchy">{order.customer?.phone}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.delivery}</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-neutral-400" />
                    <p className="text-sm">{order.deliveryAddress}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <p className="text-sm">{order.deliveryTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-neutral-400" />
                    <p className="text-sm">
                      {order.deliveryDate && new Date(order.deliveryDate).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <h4 className="font-semibold text-sm text-primary-hierarchy">Timeline</h4>
                {isTimelineLoading ? (
                  <p className="text-xs text-muted-foreground">Loading timeline...</p>
                ) : timeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No events yet</p>
                ) : (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded bg-muted/20 p-2">
                    {timeline.map((event) => (
                      <div key={event.id} className="grid grid-cols-[140px_1fr] gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {new Date(event.occurredAt).toLocaleString('ru-RU')}
                        </span>
                        <span>
                          <span className="font-medium">{event.actorName || 'System'}</span>
                          {' - '}
                          {event.message || event.eventType}
                          {event.previousStatus || event.nextStatus
                            ? ` (${event.previousStatus || '-'} → ${event.nextStatus || '-'})`
                            : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {order.specialFeatures && (
                <div className="pt-4 space-y-2">
                  <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.features}</h4>
                  <p className="text-sm bg-warning-bg p-2 rounded-lg text-warning">
                    {order.specialFeatures}
                  </p>
                </div>
              )}

              {order.courierName && (
                <div className="pt-4 space-y-2">
                  <h4 className="font-semibold text-sm text-primary-hierarchy">{t.admin.courier}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-info-bg flex items-center justify-center">
                      <Truck className="w-4 h-4 text-info" />
                    </div>
                    <p className="text-sm">{order.courierName}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.admin.close}
          </Button>
          {order && onEdit && (
            <Button onClick={() => {
              onOpenChange(false)
              onEdit(order)
            }}>
              {t.admin.edit}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
