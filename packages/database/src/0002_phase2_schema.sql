-- Phase 2 Core Domain Schema Migrations

CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_cms_id VARCHAR(255),
    reference_code VARCHAR(100),
    title TEXT NOT NULL,
    case_type VARCHAR(100),
    court_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    funding_model VARCHAR(100),
    solicitor_contact_id UUID, -- References contacts(id), created below
    assigned_barrister_id UUID REFERENCES users(id),
    source VARCHAR(50) DEFAULT 'manual',
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE matter_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor_user_id UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- e.g., solicitor, client, court
    name VARCHAR(255) NOT NULL,
    organisation VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

ALTER TABLE matters ADD CONSTRAINT fk_solicitor_contact FOREIGN KEY (solicitor_contact_id) REFERENCES contacts(id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    direction VARCHAR(50) NOT NULL,
    external_message_id VARCHAR(255),
    sender_user_id UUID REFERENCES users(id),
    sender_contact_id UUID REFERENCES contacts(id),
    subject TEXT,
    body_text TEXT,
    body_redacted TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    payload JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'queued',
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE allocation_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    model_provider VARCHAR(100),
    inputs_snapshot JSONB DEFAULT '{}',
    ranked_candidates JSONB DEFAULT '[]'
);

CREATE TABLE allocation_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    selected_barrister_id UUID REFERENCES users(id),
    decision_status VARCHAR(50) DEFAULT 'proposed',
    made_by_user_id UUID REFERENCES users(id),
    made_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE allocation_reasoning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_decision_id UUID REFERENCES allocation_decisions(id) ON DELETE CASCADE,
    original_reasoning JSONB DEFAULT '{}',
    current_reasoning JSONB DEFAULT '{}',
    edited_by_user_id UUID REFERENCES users(id),
    edited_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_cms_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    entry_type VARCHAR(50) NOT NULL, -- hearing, conference, prep, travel, personal_block
    title VARCHAR(255) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    location_name VARCHAR(255),
    visibility VARCHAR(50) DEFAULT 'normal',
    source VARCHAR(50) DEFAULT 'system',
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    block_type VARCHAR(50) NOT NULL,
    visibility_to_clerks VARCHAR(50) DEFAULT 'opaque', -- opaque vs transparent
    private_reason TEXT,
    visible_reason TEXT,
    created_by_user_id UUID REFERENCES users(id)
);
