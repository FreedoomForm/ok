export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  recipientId: string;
  data?: Record<string, unknown>;
}
