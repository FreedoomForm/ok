export interface AuthSession {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
  isActive: boolean;
}
