import { Router, Response } from 'express';
import { requireAuth, requireTier, AuthenticatedRequest } from '../middleware/authMiddleware';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { IntakeWorkflowService } from '../services/intakeWorkflowService';
import { query } from '@coclerk/database';

const router = Router();
const workflowService = new IntakeWorkflowService();

// Step 1: Simulate Intake receipt
router.post('/intake/simulate', requireAuth, requireTier(3), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sender = 'solicitor@lawfirm.com', body = 'Instruction text here' } = req.body;
  const intake = await workflowService.receiveInstruction(body, sender);

  const conflicts = await query('SELECT * FROM conflict_checks WHERE intake_id = $1', [intake.id]);
  const suggestions = await query('SELECT * FROM allocation_suggestions WHERE matter_id = $1', [intake.matter_id]);
  const matterRes = await query('SELECT * FROM matters WHERE id = $1', [intake.matter_id]);

  const conflict = conflicts.rows[0];
  const suggestion = suggestions.rows[0];
  const matter = matterRes.rows[0];

  // pg jsonb columns come back already-parsed; guard against legacy text rows.
  const ranked = suggestion?.ranked_candidates;
  const suggestionCount = Array.isArray(ranked)
    ? ranked.length
    : typeof ranked === 'string'
      ? (() => { try { return JSON.parse(ranked).length; } catch { return 0; } })()
      : 0;

  res.status(201).json({
    message: 'Intake simulation complete: pending actions distributed',
    intake,
    conflict_result: conflict?.result,
    suggestion_count: suggestionCount,
    draft_matter_id: matter?.id
  });
}));

// Step 2: List current intakes
router.get('/intake', requireAuth, requireTier(3), asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const intakes = await query('SELECT * FROM instruction_intakes');
  res.json(intakes.rows);
}));

// Step 3: Get Pending Items for Barrister.
// Supports ?limit (default 50, max 200) and ?offset (default 0) for paging.
router.get('/pending-actions', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const rawLimit = parseInt((req.query.limit as string) ?? '50', 10);
  const rawOffset = parseInt((req.query.offset as string) ?? '0', 10);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 200)) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

  const notifications = await query(
    "SELECT * FROM notification_queue WHERE user_id = $1 AND status = 'queued' ORDER BY scheduled_for DESC LIMIT $2 OFFSET $3",
    [user.id, limit, offset]
  );
  res.json(notifications.rows);
}));

// Step 4: Submit Barrister Response
router.post('/barrister-response/:notificationId', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { notificationId } = req.params;
  const { response, note } = req.body;

  if (!response || !['accept', 'decline', 'concern'].includes(response)) {
    throw new AppError(400, "Invalid response — must be 'accept', 'decline', or 'concern'");
  }

  await workflowService.handleBarristerResponse(notificationId, user.id, response, note);
  res.json({ status: 'response_recorded' });
}));

// Step 5: Clerk lists pending approvals
router.get('/approvals', requireAuth, requireTier(3), asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const approvals = await query("SELECT * FROM approval_requests WHERE status = 'pending'");
  res.json(approvals.rows);
}));

// Step 6: Clerk Approves Pending Allocation
router.post('/approve-allocation/:approvalId', requireAuth, requireTier(3), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clerkId = req.user!.id;
  const { approvalId } = req.params;

  await workflowService.approveAllocation(approvalId, clerkId);
  res.json({ message: 'Allocation approved. Matter and Diary mutated successfully.' });
}));

// Symmetric: clerk rejects a pending allocation approval.
router.post('/reject-allocation/:approvalId', requireAuth, requireTier(3), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const clerkId = req.user!.id;
  const { approvalId } = req.params;
  const { reason } = (req.body ?? {}) as { reason?: string };

  await workflowService.rejectAllocation(approvalId, clerkId, reason);
  res.json({ message: 'Allocation rejected.' });
}));

// Step 7: Inspect resulting state
router.get('/state/inspect', requireAuth, requireTier(3), asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const matters = await query('SELECT * FROM matters');
  const diaryEn = await query('SELECT * FROM diary_entries');
  res.json({
    matters: matters.rows,
    diary_entries: diaryEn.rows
  });
}));

export default router;
