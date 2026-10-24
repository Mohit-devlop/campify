import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string; // USER, MODERATOR, ADMIN
  securityStatus?: string; // ACTIVE, SECURITY_REVIEW, SECURITY_LOCKED
  tokenVersion?: number;
  enrollmentId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
