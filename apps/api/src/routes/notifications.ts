import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '@coclerk/database';

const router = Router();

// List the current user's notifications, newest scheduled first.
router.get('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const rows = await query(
    'SELECT * FROM notification_queue WHERE user_id = $1 ORDER BY scheduled_for DESC',
    [user.id]
  );
  res.json(rows.rows);
}));

export default router;
