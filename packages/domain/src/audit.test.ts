import { MockAuditService } from './audit';

describe('Audit Logging Primitive', () => {
  it('should log an event and retrieve it', async () => {
    const service = new MockAuditService();
    await service.log({
      actor_user_id: 'u1',
      action: 'allocation_decision',
      entity_type: 'matter',
      entity_id: 'm1',
      risk_tier: 'high',
      outcome: 'pending'
    });

    const logs = await service.list('matter', 'm1');
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('allocation_decision');
    expect(logs[0].id).toBeDefined();
    expect(logs[0].occurred_at).toBeDefined();
  });
});
