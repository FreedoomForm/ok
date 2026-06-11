export class NotificationPolicy {
  canSend(user: { role: string }): boolean {
    return ['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role);
  }

  canViewAll(user: { role: string }): boolean {
    return user.role === 'SUPER_ADMIN';
  }
}
