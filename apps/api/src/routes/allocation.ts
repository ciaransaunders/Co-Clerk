import { Router, Response } from 'express';
import { requireAuth, requireTier, AuthenticatedRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { query } from '@coclerk/database';

const router = Router();

// Suggestions for a matter — clerks (tier 3) and above.
router.get('/:matterId/suggestions', requireAuth, requireTier(3), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const rows = await query(
    'SELECT * FROM allocation_suggestions WHERE matter_id = $1 ORDER BY generated_at DESC',
    [req.params.matterId]
  );
  res.json(rows.rows);
}));

// Reasoning audit trail for allocations — derived from the audit_log table.
// Senior clerks (tier 2) and above only.
router.get('/logs', requireAuth, requireTier(2), asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const rows = await query(
    "SELECT * FROM audit_log WHERE action IN ('approve_allocation', 'reject_allocation', 'allocation_decision', 'barrister_instruction_response') ORDER BY timestamp DESC LIMIT 100"
  );
  res.json(rows.rows);
}));

export default router;
