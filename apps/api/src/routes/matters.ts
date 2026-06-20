import { Router, Response } from 'express';
import { requireAuth, requireTier, AuthenticatedRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { determineRiskTier, Matter, MatterLifecycleEvent, MatterStatus } from '@coclerk/domain';
import { DatabaseAuditService, query } from '@coclerk/database';

const router = Router();
const auditService = new DatabaseAuditService();

// Mock store (since no real db connection for these CRUD routes yet)
const mattersDb: Matter[] = [];
const lifecycleDb: MatterLifecycleEvent[] = [];

// Create Matter
router.post('/', requireAuth, requireTier(3), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  const riskTier = determineRiskTier({ actionType: 'create_matter', entityType: 'matter', actorUserId: user.id });

  const newMatter: Matter = {
    id: crypto.randomUUID(),
    title: req.body.title || 'Draft Matter',
    status: 'draft',
    source: 'manual',
    has_lpp_data: false,
    opened_at: new Date().toISOString()
  };

  await auditService.log({
    actor_user_id: user.id,
    action: 'create_matter',
    entity_type: 'matter',
    entity_id: newMatter.id,
    risk_tier: riskTier,
    outcome: 'completed'
  });

  mattersDb.push(newMatter);
  res.status(201).json(newMatter);
}));

// List Matters
router.get('/', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json(mattersDb);
});

// Matter Detail
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const matter = mattersDb.find(m => m.id === req.params.id);
  if (!matter) return res.status(404).json({ error: 'Matter not found' });
  res.json(matter);
});

// Lifecycle history for a matter — sourced from the matter_lifecycle_events table.
router.get('/:id/lifecycle', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const events = await query(
    'SELECT * FROM matter_lifecycle_events WHERE matter_id = $1 ORDER BY occurred_at DESC',
    [req.params.id]
  );
  res.json(events.rows);
}));

// Lifecycle Transition
router.post('/:id/lifecycle', requireAuth, requireTier(3), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const matterId = req.params.id;
  const toStatus: MatterStatus = req.body.status;

  if (!toStatus) {
    return res.status(400).json({ error: 'Missing required field: status' });
  }

  const riskTier = determineRiskTier({ actionType: 'matter_status_change', entityType: 'matter', actorUserId: user.id });

  if (riskTier === 'high') {
    await auditService.log({
      actor_user_id: user.id,
      action: 'matter_status_change',
      entity_type: 'matter',
      entity_id: matterId,
      risk_tier: riskTier,
      outcome: 'pending_confirmation'
    });
    return res.status(202).json({ status: 'pending_confirmation', message: 'State change requires confirmation' });
  }

  const matter = mattersDb.find(m => m.id === matterId);
  if (!matter) return res.status(404).json({ error: 'Matter not found' });

  const fromStatus = matter.status;
  matter.status = toStatus;

  const event: MatterLifecycleEvent = {
    id: crypto.randomUUID(),
    matter_id: matterId,
    event_type: 'status_transition',
    from_status: fromStatus,
    to_status: toStatus,
    occurred_at: new Date().toISOString(),
    actor_user_id: user.id,
    metadata: {}
  };
  lifecycleDb.push(event);

  await auditService.log({
    actor_user_id: user.id,
    action: 'matter_status_change',
    entity_type: 'matter',
    entity_id: matterId,
    risk_tier: riskTier,
    outcome: 'completed'
  });

  res.json({ matter, event });
}));

export default router;
