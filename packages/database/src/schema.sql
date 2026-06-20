-- Foundation Schema Migrations

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    tier INTEGER NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role_id UUID REFERENCES roles(id),
    status VARCHAR(50) DEFAULT 'active',
    preferred_channel VARCHAR(50) DEFAULT 'email',
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE barrister_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    call_year INTEGER,
    seniority_band VARCHAR(50),
    practice_areas JSONB DEFAULT '[]',
    development_targets JSONB DEFAULT '[]',
    workload_threshold INTEGER,
    quiet_hours JSONB DEFAULT '{}'
);

CREATE TABLE chambers_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    default_llm_provider VARCHAR(100),
    redaction_policy JSONB DEFAULT '{}',
    double_approval_comms BOOLEAN DEFAULT true,
    enable_fee_benchmarks BOOLEAN DEFAULT false,
    senior_clerk_reason_visibility BOOLEAN DEFAULT false,
    notification_batching_rules JSONB DEFAULT '{}'
);

CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    risk_tier VARCHAR(10) NOT NULL,
    requested_by_user_id UUID REFERENCES users(id),
    assigned_to_user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    snapshot JSONB DEFAULT '{}',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_note TEXT
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    risk_tier VARCHAR(10) NOT NULL,
    outcome VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    before_state JSONB,
    after_state JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed basic roles
INSERT INTO roles (id, key, name, tier) VALUES 
('d290f1ee-6c54-4b01-90e6-d701748f0851', 'barrister', 'Barrister', 0),
(gen_random_uuid(), 'practice_director', 'Practice Director', 1),
(gen_random_uuid(), 'senior_clerk', 'Senior Clerk', 2),
(gen_random_uuid(), 'practice_manager', 'Practice Manager', 3),
(gen_random_uuid(), 'assistant_pm', 'Assistant PM', 4),
(gen_random_uuid(), 'junior_clerk', 'Junior Clerk', 5);

-- Seed sample barristers for mocks (Jane Doe and John Smith)
INSERT INTO users (id, email, full_name, role_id) VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'jane.doe@chambers.com', 'Jane Doe', 'd290f1ee-6c54-4b01-90e6-d701748f0851'),
('550e8400-e29b-41d4-a716-446655440000', 'john.smith@chambers.com', 'John Smith', 'd290f1ee-6c54-4b01-90e6-d701748f0851');
