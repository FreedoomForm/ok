// DTO levels — Backend Design System v1.0 §7
// List endpoint returns ListItem, not Detail. Detail returns full data.

export interface OrderSummary {
  id: string;
  orderNumber: number;
  orderStatus: string;
  customerId: string;
  customerName?: string;
  adminId: string | null;
  courierId: string | null;
  deliveryDate: string | null;
  updatedAt: string;
}

export interface OrderListItem extends OrderSummary {
  deliveryAddress: string;
  paymentStatus: string;
  paymentMethod: string;
  amountReceived: number | null;
  calories: number;
  quantity: number;
  courierName?: string | null;
}

export interface OrderDetail extends OrderListItem {
  notes: string | null;
  specialFeatures: string | null;
  latitude: number | null;
  longitude: number | null;
  routeDistanceKm: number | null;
  routeDurationMin: number | null;
  etaMinutes: number | null;
  customerPhone: string | null;
  customerAddress: string | null;
  auditEvents: OrderAuditEventSummary[];
}

export interface OrderAuditEventSummary {
  id: string;
  eventType: string;
  actorName: string | null;
  previousStatus: string | null;
  nextStatus: string | null;
  occurredAt: string;
  message: string | null;
}

export interface PaginatedOrders {
  items: OrderListItem[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}
