import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Inline .env loader — see migrate.ts for context.
function loadEnvFile(filepath: string) {
  try {
    const text = fs.readFileSync(filepath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env absent — fall through.
  }
}
loadEnvFile(path.resolve(__dirname, '../../../.env'));

const connectionString = process.env.DATABASE_URL || 'postgresql://coclerk:coclerk_password@localhost:5432/coclerk_dev';

async function seed() {
  console.log('Seeding database...');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  const hashedPwd = bcrypt.hashSync('password123', 10);

  // All inserts run in one transaction — a half-failed seed leaves no partial state.
  await db.transaction(async (tx) => {

  // 1. Delete existing data (reverse order of dependencies)
  console.log('Cleaning up existing data...');
  await tx.delete(schema.auditLog);
  await tx.delete(schema.diaryEntries);
  await tx.delete(schema.matterLifecycleEvents);
  await tx.delete(schema.allocationDecisions);
  await tx.delete(schema.approvalRequests);
  await tx.delete(schema.notificationQueue);
  await tx.delete(schema.allocationSuggestions);
  await tx.delete(schema.conflictChecks);
  await tx.delete(schema.intakes);
  await tx.delete(schema.matters);
  await tx.delete(schema.users);
  await tx.delete(schema.roles);
  await tx.delete(schema.chambersConfig);

  // 2. Chambers Config
  console.log('Seeding config & roles...');
  await tx.insert(schema.chambersConfig).values([
    { config_key: 'chambers_name', config_value: 'Hardcastle Chambers' },
    { config_key: 'double_approval_comms', config_value: true },
    { config_key: 'senior_clerk_reason_visibility', config_value: false },
    { config_key: 'enable_fee_benchmarks', config_value: true },
    { config_key: 'redaction_level', config_value: 'maximum' },
    { config_key: 'llm_provider', config_value: 'ollama' }
  ]);

  // 3. Roles — order preserved so any existing rolesData[N] references still resolve.
  // Fees Clerk is appended at the end so it does not shift earlier indices.
  const rolesData = [
    { id: '11111111-1111-1111-1111-111111111111', key: 'practice_director', name: 'Practice Director', tier: 1, capabilities: ['manage_chambers', 'view_all_diaries', 'modify_all_diaries', 'view_financials', 'manage_billing'] },
    { id: '22222222-2222-2222-2222-222222222222', key: 'senior_clerk', name: 'Senior Clerk', tier: 2, capabilities: ['view_all_diaries', 'modify_all_diaries', 'view_financials', 'manage_billing'] },
    { id: '33333333-3333-3333-3333-333333333333', key: 'practice_manager', name: 'Practice Manager', tier: 3, capabilities: ['view_all_diaries'] },
    { id: '44444444-4444-4444-4444-444444444444', key: 'assistant_pm', name: 'Assistant PM', tier: 4, capabilities: ['view_all_diaries'] },
    { id: '55555555-5555-5555-5555-555555555555', key: 'junior_clerk', name: 'Junior Clerk', tier: 5, capabilities: [] },
    { id: '66666666-6666-6666-6666-666666666666', key: 'barrister', name: 'Barrister', tier: 0, capabilities: ['view_own_diary', 'modify_own_diary', 'accept_instructions', 'approve_own_fee_note', 'view_own_finance'] },
    { id: '77777777-7777-7777-7777-777777777777', key: 'fees_clerk', name: 'Fees Clerk', tier: 4, capabilities: ['view_financials', 'manage_billing', 'approve_fee_note'] }
  ];
  await tx.insert(schema.roles).values(rolesData);

  // 4. Users (4 Clerks, 6 Barristers)
  console.log('Seeding users...');
  const clerk1Id = crypto.randomUUID();
  const clerk2Id = crypto.randomUUID();
  const clerk3Id = crypto.randomUUID();
  const clerk4Id = crypto.randomUUID();

  const b1Id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Used in tests/mocks
  const b2Id = '550e8400-e29b-41d4-a716-446655440000'; // Used in tests/mocks
  const b3Id = crypto.randomUUID();
  const b4Id = crypto.randomUUID();
  const b5Id = crypto.randomUUID();
  const b6Id = crypto.randomUUID();

  await tx.insert(schema.users).values([
    // Clerks
    { id: clerk1Id, email: 'director@hardcastle.com', password_hash: hashedPwd, full_name: 'Sarah Hardcastle', role_id: rolesData[0].id },
    { id: clerk2Id, email: 'senior@hardcastle.com', password_hash: hashedPwd, full_name: 'Marcus Thorne', role_id: rolesData[1].id },
    { id: clerk3Id, email: 'clerk@hardcastle.com', password_hash: hashedPwd, full_name: 'Dev Clerk', role_id: rolesData[2].id }, // 'dev-clerk' mapping
    { id: clerk4Id, email: 'junior@hardcastle.com', password_hash: hashedPwd, full_name: 'Liam Vance', role_id: rolesData[4].id },
    // Barristers
    { id: b1Id, email: 'jane.doe@hardcastle.com', password_hash: hashedPwd, full_name: 'Jane Doe', role_id: rolesData[5].id },
    { id: b2Id, email: 'john.smith@hardcastle.com', password_hash: hashedPwd, full_name: 'John Smith', role_id: rolesData[5].id },
    { id: b3Id, email: 'barrister@hardcastle.com', password_hash: hashedPwd, full_name: 'Dev Barrister', role_id: rolesData[5].id }, // 'dev-barrister' mapping
    { id: b4Id, email: 'amanda.steele@hardcastle.com', password_hash: hashedPwd, full_name: 'Amanda Steele KC', role_id: rolesData[5].id },
    { id: b5Id, email: 'michael.chang@hardcastle.com', password_hash: hashedPwd, full_name: 'Michael Chang', role_id: rolesData[5].id },
    { id: b6Id, email: 'sophia.loren@hardcastle.com', password_hash: hashedPwd, full_name: 'Sophia Loren', role_id: rolesData[5].id }
  ]);

  // 5. Matters (8 matters)
  console.log('Seeding matters & workflow state...');
  const matterIds = Array.from({ length: 8 }, () => crypto.randomUUID());
  
  // The Drizzle `matters` schema omits `case_type` and `court_name` (those columns
  // are defined in the underlying SQL migrations but not mirrored into the Drizzle
  // types). Cast to `any[]` so the seed still writes them when the DB has those
  // columns; Drizzle drops unknown keys from the generated SQL when it doesn't.
  await tx.insert(schema.matters).values([
    { id: matterIds[0], title: 'Smith v MegaCorp', status: 'draft', case_type: 'employment_tribunal', court_name: 'London Central', assigned_barrister_id: null },
    { id: matterIds[1], title: 'R v Jackson', status: 'triage', case_type: 'crime', court_name: 'Southwark Crown Court', assigned_barrister_id: null },
    { id: matterIds[2], title: 'Tate v Bank of England', status: 'instructed', case_type: 'commercial', court_name: 'High Court', assigned_barrister_id: b1Id },
    { id: matterIds[3], title: 'Re: Project Phoenix', status: 'papers_received', case_type: 'advisory', court_name: null, assigned_barrister_id: b4Id },
    { id: matterIds[4], title: 'Local Authority v KD', status: 'prep', case_type: 'family', court_name: 'Family Court at London', assigned_barrister_id: b6Id },
    { id: matterIds[5], title: 'XYZ Ltd Insolvency', status: 'hearing', case_type: 'insolvency', court_name: 'Rolls Building', assigned_barrister_id: b3Id },
    { id: matterIds[6], title: 'Doe v Crown', status: 'closed', case_type: 'civil', court_name: 'Royal Courts of Justice', assigned_barrister_id: b2Id },
    { id: matterIds[7], title: 'Greenwood Arbitration', status: 'shortlisting', case_type: 'commercial', court_name: 'IDRC', assigned_barrister_id: null }
  ] as any[]);

  // 6. Intakes
  const intakeId1 = crypto.randomUUID();
  await tx.insert(schema.intakes).values([
    {
      id: intakeId1,
      matter_id: matterIds[0],
      raw_subject: 'New Instruction: Smith v MegaCorp',
      raw_sender: 'solicitor@lawfirm.com',
      parsed_fields: { case_type: 'employment_tribunal', court: 'London Central', hearing_date: '2026-06-01', opponent: 'MegaCorp', client: 'Jane Smith', solicitor_firm: 'Smith & Co' },
      parse_confidence: 95,
      review_status: 'pending'
    }
  ]);

  // 7. Conflict Checks
  await tx.insert(schema.conflictChecks).values([
    {
      id: crypto.randomUUID(),
      intake_id: intakeId1,
      result: 'clear',
      matched_matter_ids: [],
      explanation: { summary: "No conflicts found." }
    }
  ]);

  // 8. Allocation Suggestions
  const suggestionId = crypto.randomUUID();
  await tx.insert(schema.allocationSuggestions).values([
    {
      id: suggestionId,
      matter_id: matterIds[0],
      model_provider: 'mock-deterministic',
      inputs_snapshot: { case_type: 'employment_tribunal', court: 'London Central' },
      ranked_candidates: [
        { barrister_id: b1Id, name: 'Jane Doe', score: 95, reasoning: 'Strong employment track record' },
        { barrister_id: b2Id, name: 'John Smith', score: 80, reasoning: 'Available but less experienced' }
      ]
    }
  ]);

  // 9. Notifications (2 pending)
  await tx.insert(schema.notificationQueue).values([
    {
      id: crypto.randomUUID(),
      user_id: b1Id,
      matter_id: matterIds[0],
      type: 'instruction_offer',
      priority: 'high',
      payload: { summary: 'New ET case at London Central. 3 days prep.', shortlist_id: suggestionId },
      status: 'queued'
    },
    {
      id: crypto.randomUUID(),
      user_id: b3Id,
      matter_id: matterIds[5],
      type: 'diary_query',
      priority: 'medium',
      payload: { summary: 'Judge moved XYZ Ltd hearing to 2pm. Confirmed?' },
      status: 'queued'
    }
  ]);

  // 10. Approval Requests (1 pending allocation approval)
  const decisionId = crypto.randomUUID();
  await tx.insert(schema.allocationDecisions).values([
    {
      id: decisionId,
      matter_id: matterIds[7],
      selected_barrister_id: b5Id,
      decision_status: 'proposed',
      made_by_user_id: b5Id
    }
  ]);

  await tx.insert(schema.approvalRequests).values([
    {
      id: crypto.randomUUID(),
      entity_type: 'allocation_decision',
      entity_id: decisionId,
      action_type: 'confirm_allocation',
      risk_tier: 'high',
      status: 'pending',
      requested_by_user_id: b5Id
    }
  ]);

  // 11. Diary Entries
  console.log('Seeding diary...');
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  await tx.insert(schema.diaryEntries).values([
    {
      id: crypto.randomUUID(),
      user_id: b1Id,
      matter_id: matterIds[2],
      entry_type: 'hearing',
      title: 'Tate v Bank of England',
      starts_at: nextWeek,
      ends_at: new Date(nextWeek.getTime() + 4 * 3600 * 1000),
      visibility: 'normal',
      status: 'active'
    },
    {
      id: crypto.randomUUID(),
      user_id: b3Id,
      matter_id: matterIds[5],
      entry_type: 'hearing',
      title: 'XYZ Ltd Insolvency',
      starts_at: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
      ends_at: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
      visibility: 'normal',
      status: 'active'
    },
    {
      id: crypto.randomUUID(),
      user_id: b4Id, // Amanda Steele KC
      matter_id: null,
      entry_type: 'unavailability',
      title: 'Firm Unavailability',
      starts_at: new Date(now.getTime() + 4 * 24 * 3600 * 1000),
      ends_at: new Date(now.getTime() + 4 * 24 * 3600 * 1000 + 4 * 3600 * 1000),
      visibility: 'opaque',
      is_opaque_unavailability: true,
      status: 'active'
    }
  ]);

  }); // end transaction

  console.log('Seeding completed successfully!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
