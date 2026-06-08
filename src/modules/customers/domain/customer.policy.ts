export interface UserContext {
  id: string;
  role: string;
  adminId?: string | null;
}

export class CustomerPolicy {
  canView(user: UserContext, customerAdminId: string | null): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    return customerAdminId === user.id;
  }

  canEdit(user: UserContext, customerAdminId: string | null): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    return customerAdminId === user.id;
  }
}
