// Mapper: Prisma DB row ↔ Domain entity / DTO
// No HTTP imports. Pure transformation logic.

import { Order, OrderCore, OrderStatus, PaymentStatus, PaymentMethod } from '../../domain/order.entity';
import { OrderSummary, OrderListItem, OrderDetail, OrderAuditEventSummary } from '../../contracts/order.dto';

export class OrderMapper {
  static toDomain(row: any): Order {
    const core: OrderCore = {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.orderStatus as OrderStatus,
      customerId: row.customerId,
      adminId: row.adminId,
      courierId: row.courierId,
      deliveryDate: row.deliveryDate ? new Date(row.deliveryDate) : null,
      deliveryAddress: row.deliveryAddress,
      paymentStatus: row.paymentStatus as PaymentStatus,
      paymentMethod: row.paymentMethod as PaymentMethod,
      isPrepaid: row.isPrepaid,
      quantity: row.quantity,
      calories: row.calories,
      version: row.version,
    };
    return new Order(core);
  }

  static toSummary(order: Order): OrderSummary {
    const core = order.toJSON();
    return {
      id: core.id,
      orderNumber: core.orderNumber,
      orderStatus: core.status,
      customerId: core.customerId,
      adminId: core.adminId,
      courierId: core.courierId,
      deliveryDate: core.deliveryDate ? core.deliveryDate.toISOString().split('T')[0] : null,
      updatedAt: new Date().toISOString(), // populated from DB row in real use
    };
  }

  static toListItem(row: any): OrderListItem {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      orderStatus: row.orderStatus,
      customerId: row.customerId,
      customerName: row.customer?.name || 'Unknown',
      adminId: row.adminId,
      courierId: row.courierId,
      courierName: row.courier?.name || null,
      deliveryDate: row.deliveryDate ? row.deliveryDate.toISOString().split('T')[0] : null,
      deliveryAddress: row.deliveryAddress,
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod,
      amountReceived: row.amountReceived,
      calories: row.calories,
      quantity: row.quantity,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static toDetail(row: any, auditEvents: any[] = []): OrderDetail {
    return {
      ...this.toListItem(row),
      notes: row.notes,
      specialFeatures: row.specialFeatures,
      latitude: row.latitude,
      longitude: row.longitude,
      routeDistanceKm: row.routeDistanceKm,
      routeDurationMin: row.routeDurationMin,
      etaMinutes: row.etaMinutes,
      customerPhone: row.customer?.phone || null,
      customerAddress: row.customer?.address || null,
      auditEvents: auditEvents.map((e: any) => ({
        id: e.id,
        eventType: e.eventType,
        actorName: e.actorName,
        previousStatus: e.previousStatus,
        nextStatus: e.nextStatus,
        occurredAt: e.occurredAt.toISOString(),
        message: e.message,
      })),
    };
  }
}
