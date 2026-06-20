import { IntakeWorkflowService } from '../services/intakeWorkflowService';

// We mock the database client to verify behavior decoupled from a live Postgres instance
jest.mock('@coclerk/database', () => {
    const memoryDb: Record<string, any[]> = {
        instruction_intakes: [],
        matters: [],
        conflict_checks: [],
        allocation_suggestions: [],
        notification_queue: [],
        allocation_decisions: [],
        approval_requests: [],
        diary_entries: [],
        matter_lifecycle_events: [],
        audit_log: []
    };

    return {
        DatabaseAuditService: class {
            async log(entry: any) { memoryDb.audit_log.push({ ...entry, id: crypto.randomUUID(), occurred_at: new Date().toISOString() }); }
            async list(_entityType: string, entityId: string) { return memoryDb.audit_log.filter((l: any) => l.entity_id === entityId); }
        },
        query: jest.fn().mockImplementation((text: string, params: any[]) => {
            const tableMatch = text.match(/INTO ([a-z_]+)/i) || text.match(/FROM ([a-z_]+)/i) || text.match(/UPDATE ([a-z_]+)/i);
            const table = tableMatch ? tableMatch[1] : null;
            
            if (text.startsWith('SELECT') && table) {
                // Mock simple select
                const filter = text.includes('id = $1') ? params[0] : null;
                const rows = filter ? memoryDb[table].filter(r => r.id === filter) : memoryDb[table];
                return Promise.resolve({ rows });
            } else if (text.startsWith('INSERT') && table) {
                // Mock simple insert
                const obj: any = { id: params[0] };
                if (table === 'matters') { obj.status = params[4]; obj.assigned_barrister_id = params[7]; }
                else if (table === 'approval_requests') { obj.entity_id = params[2]; obj.status = params[6]; }
                else if (table === 'notification_queue') { obj.matter_id = params[2]; obj.status = params[6]; }
                else if (table === 'allocation_decisions') { obj.matter_id = params[1]; obj.decision_status = params[3]; }
                
                memoryDb[table] = memoryDb[table].filter(r => r.id !== obj.id);
                memoryDb[table].push(obj);
            }
            return Promise.resolve({ rows: [] });
        }),
        IntakeRepository: class {
            save(intake: any) { memoryDb.instruction_intakes.push(intake); return Promise.resolve(); }
        },
        MatterRepository: class {
            save(m: any) { 
               memoryDb.matters = memoryDb.matters.filter(x => x.id !== m.id);
               memoryDb.matters.push(m);
            }
            findById(id: string) { return Promise.resolve(memoryDb.matters.find(x => x.id === id)); }
        },
        NotificationRepository: class {
            save(n: any) { 
                memoryDb.notification_queue = memoryDb.notification_queue.filter(x => x.id !== n.id);
                memoryDb.notification_queue.push(n);
             }
            findById(id: string) { return Promise.resolve(memoryDb.notification_queue.find(x => x.id === id)); }
        },
        ApprovalRepository: class {
             save(a: any) { 
                memoryDb.approval_requests = memoryDb.approval_requests.filter(x => x.id !== a.id);
                memoryDb.approval_requests.push(a);
             }
             findById(id: string) { return Promise.resolve(memoryDb.approval_requests.find(x => x.id === id)); }
        },
        AllocationDecisionRepository: class {
            save(d: any) { 
               memoryDb.allocation_decisions = memoryDb.allocation_decisions.filter(x => x.id !== d.id);
               memoryDb.allocation_decisions.push(d);
            }
            findById(id: string) { return Promise.resolve(memoryDb.allocation_decisions.find(x => x.id === id)); }
        },
        DiaryRepository: class {
            save(d: any) { memoryDb.diary_entries.push(d); }
        },
        GeneralMetricsRepository: class {
            saveConflictCheck(c: any) { memoryDb.conflict_checks.push(c); }
            saveAllocationSuggestion(s: any) { memoryDb.allocation_suggestions.push(s); }
            saveLifecycleEvent(e: any) { memoryDb.matter_lifecycle_events.push(e); }
        },
        getMockDb: () => memoryDb
    };
});

describe('Intake Workflow Orchestration (Phase 3 Slice)', () => {
  it('should process intake, conflict check, construct DB records securely', async () => {
    const service = new IntakeWorkflowService();
    // Simulate receipt
    const intake = await service.receiveInstruction('body data', 'solicitor@test.com');
    expect(intake).toBeDefined();
    
    const db = require('@coclerk/database').getMockDb();
    expect(db.matters.length).toBe(1);
    expect(db.notification_queue.length).toBe(1);
  });

  it('should mark approval and decision as rejected when clerk rejects', async () => {
    const service = new IntakeWorkflowService();
    await service.receiveInstruction('body data', 'solicitor@test.com');

    const db = require('@coclerk/database').getMockDb();
    const notificationId = db.notification_queue[db.notification_queue.length - 1].id;

    await service.handleBarristerResponse(notificationId, 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'accept');

    const approvals = db.approval_requests;
    const approvalId = approvals[approvals.length - 1].id;

    await service.rejectAllocation(approvalId, 'clerk-1', 'Conflict identified post-acceptance');

    const approval = db.approval_requests.find((a: any) => a.id === approvalId);
    expect(approval.status).toBe('rejected');

    const decision = db.allocation_decisions[db.allocation_decisions.length - 1];
    expect(decision.decision_status).toBe('rejected');

    // No matter mutation (still draft) and no diary entry should result from a rejection.
    const matter = db.matters[db.matters.length - 1];
    expect(matter.status).toBe('draft');
    expect(db.diary_entries.length).toBe(0);
  });

  it('should safely mutate matter state and diary only after clerk approval', async () => {
    const service = new IntakeWorkflowService();
    const intake = await service.receiveInstruction('body data', 'solicitor@test.com');
    
    const db = require('@coclerk/database').getMockDb();
    const notificationId = db.notification_queue[db.notification_queue.length - 1].id;
    
    await service.handleBarristerResponse(notificationId, 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'accept');
    
    const approvals = db.approval_requests;
    const approvalId = approvals[approvals.length - 1].id;
    
    const matterId = intake.matter_id;
    let matter = db.matters.find((m: any) => m.id === matterId);
    expect(matter.status).toBe('draft');
    
    await service.approveAllocation(approvalId, 'clerk-1');
    
    // Check mutations
    matter = db.matters.find((m: any) => m.id === matterId);
    expect(matter.status).toBe('instructed');
    expect(matter.assigned_barrister_id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(db.diary_entries.length).toBe(1);
  });
});
