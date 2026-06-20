CREATE TABLE instruction_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NULL REFERENCES matters(id),
    source_message_id VARCHAR(255),
    raw_subject TEXT,
    raw_sender TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    parsed_fields JSONB DEFAULT '{}',
    parse_confidence DECIMAL(5,2),
    review_status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE conflict_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID REFERENCES instruction_intakes(id) ON DELETE CASCADE,
    result VARCHAR(50), -- clear, possible_conflict, blocked
    matched_matter_ids JSONB DEFAULT '[]',
    explanation JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_key VARCHAR(100) NOT NULL,
    matter_id UUID NULL REFERENCES matters(id),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    context JSONB DEFAULT '{}'
);

CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
    step_key VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    output JSONB,
    error_message TEXT
);
