import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

import { prisma } from '../prisma/client';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Access token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Validate live security status in database for instant session revocation
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        securityStatus: true,
        tokenVersion: true,
        enrollmentId: true,
      },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized: User account no longer exists' });
    }

    if (dbUser.status === 'BANNED') {
      return res.status(403).json({ error: 'Access denied: This account has been banned by administrators' });
    }

    if (dbUser.securityStatus === 'SECURITY_LOCKED') {
      return res.status(403).json({
        error: 'ACCOUNT_SECURITY_LOCKED',
        message: 'Your account has been temporarily locked after repeated security verification failures. Contact your college KILOGRAM administrator for identity review. Your account data has not been deleted.',
        securityLocked: true,
      });
    }

    // Verify token version (if user sessions were revoked or incremented on lock)
    if (decoded.tokenVersion && dbUser.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Unauthorized: Session has been revoked. Please log in again.' });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
      securityStatus: dbUser.securityStatus,
      tokenVersion: dbUser.tokenVersion,
      enrollmentId: dbUser.enrollmentId,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
}

export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
}
