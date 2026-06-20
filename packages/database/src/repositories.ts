import { query } from './client';
import { 
  InstructionIntake, ConflictCheck, AllocationSuggestion, 
  NotificationQueueItem, AllocationDecision, Matter, DiaryEntry, MatterLifecycleEvent,
  ApprovalRequestRecord
} from '@coclerk/domain';

export class IntakeRepository {
  async save(intake: InstructionIntake): Promise<void> {
    await query(
      `INSERT INTO instruction_intakes (id, matter_id, raw_subject, raw_sender, received_at, parsed_fields, parse_confidence, review_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET review_status = EXCLUDED.review_status, matter_id = EXCLUDED.matter_id`,
      [intake.id, intake.matter_id, intake.raw_subject, intake.raw_sender, intake.received_at, intake.parsed_fields, intake.parse_confidence, intake.review_status]
    );
  }
}

export class MatterRepository {
  async save(matter: Matter): Promise<void> {
    await query(
      `INSERT INTO matters (id, title, case_type, court_name, status, source, opened_at, assigned_barrister_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status, 
        assigned_barrister_id = EXCLUDED.assigned_barrister_id`,
      [matter.id, matter.title, matter.case_type, matter.court_name, matter.status, matter.source, matter.opened_at, matter.assigned_barrister_id]
    );
  }

  async findById(id: string): Promise<Matter | null> {
    const res = await query(`SELECT * FROM matters WHERE id = $1`, [id]);
    return res.rows[0] ? (res.rows[0] as Matter) : null;
  }
}

export class ApprovalRepository {
  async save(approval: ApprovalRequestRecord): Promise<void> {
    await query(
      `INSERT INTO approval_requests (id, entity_type, entity_id, action_type, risk_tier, requested_by_user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
      [approval.id, approval.entity_type, approval.entity_id, approval.action_type, approval.risk_tier, approval.requested_by_user_id, approval.status]
    );
  }

  async findById(id: string): Promise<ApprovalRequestRecord | null> {
    const res = await query(`SELECT * FROM approval_requests WHERE id = $1`, [id]);
    return res.rows[0] ? (res.rows[0] as ApprovalRequestRecord) : null;
  }
}

export class NotificationRepository {
  async save(n: NotificationQueueItem): Promise<void> {
    await query(
      `INSERT INTO notification_queue (id, user_id, matter_id, type, priority, payload, status, scheduled_for, acted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, acted_at = EXCLUDED.acted_at`,
      [n.id, n.user_id, n.matter_id, n.type, n.priority, n.payload, n.status, n.scheduled_for, n.acted_at]
    );
  }

  async findById(id: string): Promise<NotificationQueueItem | null> {
    const res = await query(`SELECT * FROM notification_queue WHERE id = $1`, [id]);
    return res.rows[0] ? (res.rows[0] as NotificationQueueItem) : null;
  }
}

export class AllocationDecisionRepository {
  async save(d: AllocationDecision): Promise<void> {
    await query(
      `INSERT INTO allocation_decisions (id, matter_id, selected_barrister_id, decision_status, made_by_user_id, made_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET decision_status = EXCLUDED.decision_status`,
      [d.id, d.matter_id, d.selected_barrister_id, d.decision_status, d.made_by_user_id, d.made_at]
    );
  }

  async findById(id: string): Promise<AllocationDecision | null> {
    const res = await query(`SELECT * FROM allocation_decisions WHERE id = $1`, [id]);
    return res.rows[0] ? (res.rows[0] as AllocationDecision) : null;
  }
}

export class DiaryRepository {
  async save(d: DiaryEntry): Promise<void> {
    await query(
      `INSERT INTO diary_entries (id, user_id, matter_id, entry_type, title, starts_at, ends_at, visibility, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [d.id, d.user_id, d.matter_id, d.entry_type, d.title, d.starts_at, d.ends_at, d.visibility, d.source, d.status]
    );
  }
}

export class GeneralMetricsRepository {
  // Catchall for simpler mocks like conflict and suggestion
  async saveConflictCheck(c: ConflictCheck) {
     await query(`INSERT INTO conflict_checks (id, intake_id, result, matched_matter_ids, explanation, checked_at) VALUES ($1, $2, $3, $4, $5, $6)`, 
     [c.id, c.intake_id, c.result, JSON.stringify(c.matched_matter_ids), c.explanation, c.checked_at]);
  }
  async saveAllocationSuggestion(s: AllocationSuggestion) {
     await query(`INSERT INTO allocation_suggestions (id, matter_id, generated_at, model_provider, inputs_snapshot, ranked_candidates) VALUES ($1, $2, $3, $4, $5, $6)`, 
     [s.id, s.matter_id, s.generated_at, s.model_provider, s.inputs_snapshot, JSON.stringify(s.ranked_candidates)]);
  }
  async saveLifecycleEvent(e: MatterLifecycleEvent) {
     await query(`INSERT INTO matter_lifecycle_events (id, matter_id, event_type, from_status, to_status, occurred_at, actor_user_id, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
     [e.id, e.matter_id, e.event_type, e.from_status, e.to_status, e.occurred_at, e.actor_user_id, e.metadata]);
  }
}

export class UserRepository {
  async findByEmail(email: string) {
    const res = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    return res.rows[0] || null;
  }

  async findById(id: string) {
    const res = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }
}

