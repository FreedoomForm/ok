export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
  isActive: boolean;
}

export class AuthPolicy {
  isAuthenticated(user: AuthUser | null): boolean {
    return user !== null && user.isActive === true;
  }

  hasRole(user: AuthUser, roles: string[]): boolean {
    return roles.includes(user.role);
  }

  isAdmin(user: AuthUser): boolean {
    return ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'].includes(user.role);
  }

  isCourier(user: AuthUser): boolean {
    return user.role === 'COURIER';
  }
}
