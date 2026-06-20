import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getAppConfig } from '@coclerk/config';
import { UserRepository } from '@coclerk/database';
import { ROLES } from '@coclerk/domain';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();
const userRepo = new UserRepository();
const config = getAppConfig();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // jsonwebtoken's SignOptions.expiresIn is typed as a branded StringValue
    // (e.g. `${number}h`) from the `ms` package. Our config exposes a plain string
    // sourced from env, which is wider than that branded type — cast to satisfy
    // the overload without leaking the brand into the rest of the codebase.
    const signOptions: jwt.SignOptions = { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
    const token = jwt.sign(
      { userId: user.id, roleId: user.role_id },
      config.jwtSecret,
      signOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Returns the authenticated user's role and capabilities — drives client-side gating.
router.get('/me/capabilities', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const role = Object.values(ROLES).find(r => r.id === req.user!.role_id);
  if (!role) return res.status(404).json({ error: 'Role not found' });
  return res.json({
    role: role.key,
    name: role.name,
    tier: role.tier,
    capabilities: role.capabilities,
  });
});

router.post('/logout', (_req: Request, res: Response) => {
  // Client-side handles token removal; this is just for symmetry.
  res.json({ message: 'Logged out successfully' });
});

export default router;
