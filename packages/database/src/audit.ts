import { query } from './client';
import { AuditLogEntry, AuditService } from '@coclerk/domain';

/**
 * Persists audit log entries to the audit_log table in PostgreSQL.
 * Replaces MockAuditService for production use.
 */
export class DatabaseAuditService implements AuditService {
  async log(entry: Omit<AuditLogEntry, 'id' | 'occurred_at'>): Promise<void> {
    const id = crypto.randomUUID();
    const occurred_at = new Date().toISOString();

    await query(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, changes, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        entry.actor_user_id,
        entry.action,
        entry.entity_type,
        entry.entity_id,
        JSON.stringify({
          risk_tier: entry.risk_tier,
          outcome: entry.outcome,
          before_state: entry.before_state ?? null,
          after_state: entry.after_state ?? null,
        }),
        occurred_at,
      ]
    );
  }

  async list(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    const res = await query(
      `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY timestamp DESC`,
      [entityType, entityId]
    );

    return res.rows.map((row: any) => {
      const changes = row.changes ?? {};
      return {
        id: row.id,
        actor_user_id: row.user_id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        risk_tier: changes.risk_tier ?? 'low',
        outcome: changes.outcome ?? 'completed',
        before_state: changes.before_state,
        after_state: changes.after_state,
        occurred_at: row.timestamp,
      };
    });
  }
}
