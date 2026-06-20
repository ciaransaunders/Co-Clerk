import { pgTable, uuid, text, integer, timestamp, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';

// Enums
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected', 'needs_clarification']);
export const conflictResultEnum = pgEnum('conflict_result', ['clear', 'possible_conflict', 'blocked']);
export const matterStatusEnum = pgEnum('matter_status', ['draft', 'triage', 'conflict_check', 'shortlisting', 'pending_barrister', 'instructed', 'papers_received', 'prep', 'hearing', 'closed']);

// Roles & Users
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  tier: integer('tier').notNull(),
  capabilities: jsonb('capabilities').default([]).notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role_id: uuid('role_id').references(() => roles.id),
  whatsapp_opt_in: boolean('whatsapp_opt_in').default(false),
  whatsapp_phone_hash: text('whatsapp_phone_hash'),
  created_at: timestamp('created_at').defaultNow(),
});

// Matters & Lifecycle
export const matters = pgTable('matters', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: text('status').notNull().default('draft'),
  risk_tier: integer('risk_tier').default(0),
  assigned_barrister_id: uuid('assigned_barrister_id').references(() => users.id),
  has_lpp_data: boolean('has_lpp_data').default(false),
  solicitor_details: jsonb('solicitor_details'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Intake & Workflow
export const intakes = pgTable('instruction_intakes', {
  id: uuid('id').primaryKey().defaultRandom(),
  matter_id: uuid('matter_id').references(() => matters.id),
  source_id: text('source_id'),
  raw_subject: text('raw_subject'),
  raw_sender: text('raw_sender'),
  received_at: timestamp('received_at').defaultNow(),
  parsed_fields: jsonb('parsed_fields'),
  parse_confidence: integer('parse_confidence'),
  is_lpp_sensitive: boolean('is_lpp_sensitive').default(false),
  review_status: text('review_status').default('pending'),
});

// Checks & Metrics
export const conflictChecks = pgTable('conflict_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  intake_id: uuid('intake_id').references(() => intakes.id),
  result: text('result').notNull(),
  matched_matter_ids: jsonb('matched_matter_ids').default([]),
  explanation: jsonb('explanation'),
  checked_at: timestamp('checked_at').defaultNow(),
});

export const allocationSuggestions = pgTable('allocation_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  matter_id: uuid('matter_id').references(() => matters.id),
  generated_at: timestamp('generated_at').defaultNow(),
  model_provider: text('model_provider'),
  inputs_snapshot: jsonb('inputs_snapshot'),
  ranked_candidates: jsonb('ranked_candidates'),
});

// Notifications & Approvals
export const notificationQueue = pgTable('notification_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id),
  matter_id: uuid('matter_id').references(() => matters.id),
  type: text('type').notNull(),
  priority: text('priority').default('medium'),
  payload: jsonb('payload'),
  status: text('status').default('queued'),
  scheduled_for: timestamp('scheduled_for'),
  sent_at: timestamp('sent_at'),
});

// Approvals & Decisions
export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  entity_type: text('entity_type'),
  entity_id: uuid('entity_id'),
  action_type: text('action_type').notNull(),
  risk_tier: text('risk_tier').notNull(),
  status: text('status').default('pending'),
  requested_by_user_id: uuid('requested_by_user_id').references(() => users.id),
});

export const allocationDecisions = pgTable('allocation_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  matter_id: uuid('matter_id').references(() => matters.id),
  selected_barrister_id: uuid('selected_barrister_id').references(() => users.id),
  decision_status: text('decision_status').notNull(),
  made_by_user_id: uuid('made_by_user_id').references(() => users.id),
  made_at: timestamp('made_at').defaultNow(),
});

export const matterLifecycleEvents = pgTable('matter_lifecycle_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  matter_id: uuid('matter_id').references(() => matters.id),
  event_type: text('event_type').notNull(),
  from_status: text('from_status'),
  to_status: text('to_status'),
  occurred_at: timestamp('occurred_at').defaultNow(),
  actor_user_id: uuid('actor_user_id').references(() => users.id),
  metadata: jsonb('metadata'),
});

// Diary
export const diaryEntries = pgTable('diary_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id),
  matter_id: uuid('matter_id').references(() => matters.id),
  entry_type: text('entry_type').notNull(), // 'hearing', 'prep', 'unavailability'
  title: text('title').notNull(),
  starts_at: timestamp('starts_at').notNull(),
  ends_at: timestamp('ends_at').notNull(),
  visibility: text('visibility').default('normal'),
  source: text('source'),
  status: text('status').default('active'),
  is_opaque_unavailability: boolean('is_opaque_unavailability').default(false),
  metadata: jsonb('metadata'),
});

// Config & Audit
export const chambersConfig = pgTable('chambers_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  config_key: text('config_key').unique().notNull(),
  config_value: jsonb('config_value'),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id'),
  action: text('action').notNull(),
  entity_type: text('entity_type'),
  entity_id: uuid('entity_id'),
  changes: jsonb('changes'),
  timestamp: timestamp('timestamp').defaultNow(),
});
