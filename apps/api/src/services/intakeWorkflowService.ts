import {
  InstructionIntake, ConflictCheck, AllocationSuggestion,
  NotificationQueueItem, determineRiskTier, AllocationDecision, Matter, DiaryEntry, MatterLifecycleEvent, ApprovalRequestRecord
} from '@coclerk/domain';

import {
  IntakeRepository, MatterRepository, NotificationRepository,
  ApprovalRepository, AllocationDecisionRepository, DiaryRepository, GeneralMetricsRepository,
  DatabaseAuditService, query
} from '@coclerk/database';

import { DatabaseConflictChecker } from './conflictChecker';

const auditService = new DatabaseAuditService();
const conflictChecker = new DatabaseConflictChecker();

/**
 * Best-effort read of chambers-level config flags from the `chambers_config` table.
 * Falls back to safe defaults (double-approval ON) when the row is absent or
 * the query fails. Used by the workflow service to drive risk-tier decisions.
 */
async function loadChambersConfig(): Promise<{ double_approval_comms: boolean }> {
  try {
    const res = await query('SELECT config_key, config_value FROM chambers_config');
    const map: Record<string, any> = {};
    for (const row of (res?.rows ?? [])) {
      map[row.config_key] = row.config_value;
    }
    return {
      double_approval_comms: typeof map.double_approval_comms === 'boolean'
        ? map.double_approval_comms
        : true,
    };
  } catch {
    return { double_approval_comms: true };
  }
}

const intakeRepo = new IntakeRepository();
const matterRepo = new MatterRepository();
const notificationRepo = new NotificationRepository();
const approvalRepo = new ApprovalRepository();
const decisionRepo = new AllocationDecisionRepository();
const diaryRepo = new DiaryRepository();
const metricsRepo = new GeneralMetricsRepository();

/**
 * Service to orchestrate the end-to-end Phase 3 Slice: Instruction Intake to Approved Allocation.
 */
export class IntakeWorkflowService {
  
  /** Step 1 to 5: Intake -> Parse -> Conflict Check -> Shortlist -> Notification */
  async receiveInstruction(rawEmailBody: string, sender: string): Promise<InstructionIntake> {
    const intakeId = crypto.randomUUID();
    
    // 1 & 2. Parse instruction (Mock deterministically)
    const parsedFields = {
      case_type: 'employment_tribunal',
      court: 'London Central',
      hearing_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      opponent: 'MegaCorp',
      client: 'Jane Smith',
      solicitor_firm: 'Smith & Co'
    };

    const intake: InstructionIntake = {
      id: intakeId,
      raw_subject: 'New Instruction: Smith v MegaCorp',
      raw_sender: sender,
      received_at: new Date().toISOString(),
      parsed_fields: parsedFields,
      // Integer percent (0–100). Schema column is integer; seed and DB driver agree on this scale.
      parse_confidence: 95,
      review_status: 'pending',
      is_lpp_sensitive: false
    };

    // Draft matter creation to link entities
    const draftMatter: Matter = {
      id: crypto.randomUUID(),
      title: 'Smith v MegaCorp',
      case_type: parsedFields.case_type,
      court_name: parsedFields.court,
      status: 'draft',
      source: 'email',
      opened_at: new Date().toISOString(),
      has_lpp_data: false
    };
    
    intake.matter_id = draftMatter.id;

    // Persist Matter & Intake
    await matterRepo.save(draftMatter);
    await intakeRepo.save(intake);

    await auditService.log({
      actor_user_id: 'system',
      action: 'intake_received',
      entity_type: 'intake',
      entity_id: intake.id,
      risk_tier: 'low',
      outcome: 'completed'
    });

    // 3. Conflict check against existing matters
    const conflict = await conflictChecker.check(intake);
    await metricsRepo.saveConflictCheck(conflict);

    // 4. Shortlist generation (Mock ranking)
    const suggestion: AllocationSuggestion = {
      id: crypto.randomUUID(),
      matter_id: draftMatter.id,
      generated_at: new Date().toISOString(),
      model_provider: 'mock-deterministic',
      inputs_snapshot: parsedFields,
      ranked_candidates: [
        { barrister_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'Jane Doe', score: 95, reasoning: 'Strong employment track record' },
        { barrister_id: '550e8400-e29b-41d4-a716-446655440000', name: 'John Smith', score: 80, reasoning: 'Available but less experienced' }
      ]
    };
    await metricsRepo.saveAllocationSuggestion(suggestion);

    // 5. Barrister pending action notification
    const notification: NotificationQueueItem = {
      id: crypto.randomUUID(),
      user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // notifying top ranked candidate
      matter_id: draftMatter.id,
      type: 'instruction_offer',
      priority: 'high',
      payload: { summary: 'New ET case at London Central. 3 days prep.', shortlist_id: suggestion.id },
      status: 'queued',
      scheduled_for: new Date().toISOString()
    };
    await notificationRepo.save(notification);

    return intake;
  }

  /** Step 6: Barrister Response Capture */
  async handleBarristerResponse(notificationId: string, barristerId: string, response: 'accept' | 'decline' | 'concern', note?: string) {
    const notification = await notificationRepo.findById(notificationId);
    if (!notification) throw new Error('Notification not found');
    
    notification.status = 'acted';
    notification.acted_at = new Date().toISOString();
    await notificationRepo.save(notification);

    const matterId = notification.matter_id!;
    
    await auditService.log({
      actor_user_id: barristerId,
      action: 'barrister_instruction_response',
      entity_type: 'matter',
      entity_id: matterId,
      risk_tier: 'low',
      outcome: 'completed',
      after_state: { response, note }
    });

    if (response === 'accept') {
      // Create allocation decision
      const decision: AllocationDecision = {
        id: crypto.randomUUID(),
        matter_id: matterId,
        selected_barrister_id: barristerId,
        decision_status: 'proposed',
        made_by_user_id: barristerId,
        made_at: new Date().toISOString()
      };
      await decisionRepo.save(decision);

      // 7. High-risk write requires approval gate. We create a pending approval for the clerk.
      // chambersConfig is sourced from the database with safe defaults — no longer a hardcoded stub.
      const chambersConfig = await loadChambersConfig();
      const riskTier = determineRiskTier({
        actionType: 'allocation_decision',
        entityType: 'matter',
        actorUserId: barristerId,
        chambersConfig,
      });
      
      if (riskTier === 'high') { // Expected to be high per policy
        const approvalReq: ApprovalRequestRecord = {
          id: crypto.randomUUID(),
          action_type: 'confirm_allocation',
          entity_id: decision.id,
          entity_type: 'allocation_decision',
          requested_by_user_id: barristerId,
          risk_tier: 'high',
          status: 'pending'
        };
        await approvalRepo.save(approvalReq);
      }
    }
  }

  /** Clerk rejects a pending allocation approval; symmetry with approveAllocation. */
  async rejectAllocation(approvalId: string, clerkId: string, reason?: string) {
    const approval = await approvalRepo.findById(approvalId);
    if (!approval || approval.status !== 'pending') throw new Error('Invalid approval request');

    const decision = await decisionRepo.findById(approval.entity_id);
    if (!decision) throw new Error('Allocation decision not found');

    approval.status = 'rejected';
    decision.decision_status = 'rejected';

    await approvalRepo.save(approval);
    await decisionRepo.save(decision);

    await auditService.log({
      actor_user_id: clerkId,
      action: 'reject_allocation',
      entity_type: 'allocation_decision',
      entity_id: decision.id,
      risk_tier: 'high',
      outcome: 'completed',
      after_state: { reason: reason ?? null }
    });
  }

  /** Step 8: Final approval mutation of Matter and Diary */
  async approveAllocation(approvalId: string, clerkId: string) {
    const approval = await approvalRepo.findById(approvalId);
    if (!approval || approval.status !== 'pending') throw new Error('Invalid approval request');
    
    const decision = await decisionRepo.findById(approval.entity_id);
    if (!decision) throw new Error('Allocation decision not found');

    const matter = await matterRepo.findById(decision.matter_id);
    if (!matter) throw new Error('Matter not found');

    // Mutate state
    approval.status = 'approved';
    decision.decision_status = 'confirmed';
    matter.assigned_barrister_id = decision.selected_barrister_id;
    matter.status = 'instructed';

    await approvalRepo.save(approval);
    await decisionRepo.save(decision);
    await matterRepo.save(matter);

    const lifecycleEvent: MatterLifecycleEvent = {
        id: crypto.randomUUID(),
        matter_id: matter.id,
        event_type: 'status_transition',
        from_status: 'draft',
        to_status: 'instructed',
        occurred_at: new Date().toISOString(),
        actor_user_id: clerkId,
        metadata: { allocation_decision_id: decision.id }
    };
    await metricsRepo.saveLifecycleEvent(lifecycleEvent);

    // Mutate diary (internal)
    const dummyDate = new Date(Date.now() + 86400000 * 7);
    const diaryEntry: DiaryEntry = {
      id: crypto.randomUUID(),
      user_id: decision.selected_barrister_id!,
      matter_id: matter.id,
      entry_type: 'hearing',
      title: matter.title,
      starts_at: dummyDate.toISOString(),
      ends_at: new Date(dummyDate.getTime() + 7200000).toISOString(),
      visibility: 'normal',
      source: 'system',
      status: 'active'
    };
    await diaryRepo.save(diaryEntry);

    // 9. Full audit across mutations
    await auditService.log({
      actor_user_id: clerkId,
      action: 'approve_allocation',
      entity_type: 'allocation_decision',
      entity_id: decision.id,
      risk_tier: 'high',
      outcome: 'completed',
      after_state: { matter_status: matter.status, diary_entry_created: diaryEntry.id }
    });
  }
}
