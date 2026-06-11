export class TransactionPolicy {
  canViewBalance(user: { role: string }): boolean {
    return ['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role);
  }

  canCreateTransaction(user: { role: string }): boolean {
    return ['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(user.role);
  }

  canProcessSalary(user: { role: string }): boolean {
    return user.role === 'SUPER_ADMIN';
  }
}
