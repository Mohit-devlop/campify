import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string; // USER, MODERATOR, ADMIN
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
