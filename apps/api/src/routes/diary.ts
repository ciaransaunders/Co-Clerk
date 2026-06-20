import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { determineRiskTier, DiaryEntry, AvailabilityBlock } from '@coclerk/domain';
import { DatabaseAuditService } from '@coclerk/database';

const router = Router();
const auditService = new DatabaseAuditService();

// Mock store
const diaryDb: DiaryEntry[] = [];
const availabilityDb: AvailabilityBlock[] = [];

router.get('/', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json(diaryDb);
});

router.post('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  // Explicitly pick allowed fields — prevents mass assignment.
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    user_id: user.id,
    matter_id: req.body.matter_id,
    entry_type: req.body.entry_type,
    title: req.body.title,
    starts_at: req.body.starts_at,
    ends_at: req.body.ends_at,
    visibility: req.body.visibility ?? 'normal',
    source: 'manual',
    status: 'active',
  };

  // Validate before any audit write so invalid input never produces an audit row.
  if (!entry.entry_type || !entry.title || !entry.starts_at || !entry.ends_at) {
    return res.status(400).json({ error: 'Missing required fields: entry_type, title, starts_at, ends_at' });
  }

  const riskTier = determineRiskTier({ actionType: 'diary_modification', entityType: 'diary', actorUserId: user.id });

  if (riskTier === 'high') {
    await auditService.log({
      actor_user_id: user.id,
      action: 'diary_modification',
      entity_type: 'diary',
      entity_id: entry.id,
      risk_tier: riskTier,
      outcome: 'pending_confirmation'
    });
    return res.status(202).json({ status: 'pending_confirmation', entry_id: entry.id });
  }

  diaryDb.push(entry);

  await auditService.log({
    actor_user_id: user.id,
    action: 'diary_modification',
    entity_type: 'diary',
    entity_id: entry.id,
    risk_tier: riskTier,
    outcome: 'completed'
  });

  res.status(201).json(entry);
}));

router.post('/availability-block', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  // Explicitly pick allowed fields
  const block: AvailabilityBlock = {
    id: crypto.randomUUID(),
    user_id: user.id,
    created_by_user_id: user.id,
    block_type: req.body.block_type,
    starts_at: req.body.starts_at,
    ends_at: req.body.ends_at,
    visibility_to_clerks: req.body.visibility_to_clerks ?? 'transparent',
    visible_reason: req.body.visible_reason,
    private_reason: req.body.private_reason,
  };

  if (!block.starts_at || !block.ends_at || !block.block_type) {
    return res.status(400).json({ error: 'Missing required fields: block_type, starts_at, ends_at' });
  }

  availabilityDb.push(block);
  res.status(201).json(block);
});

export default router;
