import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLES, hasPermission, User } from '@coclerk/domain';
import { getAppConfig } from '@coclerk/config';
import { UserRepository } from '@coclerk/database';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const userRepo = new UserRepository();
const config = getAppConfig();

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await userRepo.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireTier = (requiredTier: number, requiredCapability?: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    const roleKey = Object.values(ROLES).find(r => r.id === user.role_id);
    if (!roleKey) return res.status(403).json({ error: 'Role not found' });
    
    const permitted = hasPermission(roleKey, requiredTier, requiredCapability);
    
    if (!permitted) {
      const message = requiredCapability 
        ? `Insufficient permission tier or missing required capability: ${requiredCapability}`
        : 'Insufficient permission tier for this action';
      return res.status(403).json({ error: message });
    }

    next();
  };
};
