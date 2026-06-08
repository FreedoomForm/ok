// Domain events — Backend Design System v1.0 §17
// Events are named in past tense. Fired after successful state change.

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly adminId: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly previousStatus: string,
    public readonly nextStatus: string,
    public readonly actorId: string | null,
    public readonly actorRole: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

export class CourierAssignedEvent {
  constructor(
    public readonly orderId: string,
    public readonly courierId: string,
    public readonly adminId: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
