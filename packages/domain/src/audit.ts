export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  risk_tier: string;
  outcome: string;
  before_state?: any;
  after_state?: any;
  occurred_at: string;
}

export interface AuditService {
  log(entry: Omit<AuditLogEntry, 'id' | 'occurred_at'>): Promise<void>;
  list(entityType: string, entityId: string): Promise<AuditLogEntry[]>;
}

// In-memory mock for demonstration before database wiring
export class MockAuditService implements AuditService {
  private logs: AuditLogEntry[] = [];

  async log(entry: Omit<AuditLogEntry, 'id' | 'occurred_at'>): Promise<void> {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      occurred_at: new Date().toISOString()
    };
    this.logs.push(newEntry);
    console.log('[AUDIT LOG]', newEntry);
  }

  async list(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return this.logs.filter(l => l.entity_type === entityType && l.entity_id === entityId);
  }
}
