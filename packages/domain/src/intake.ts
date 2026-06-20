export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_clarification';
export type ConflictResult = 'clear' | 'possible_conflict' | 'blocked';

export interface InstructionIntake {
  id: string;
  matter_id?: string;
  source_message_id?: string;
  raw_subject: string;
  raw_sender: string;
  received_at: string;
  parsed_fields: any;
  parse_confidence: number;
  is_lpp_sensitive: boolean;
  review_status: ReviewStatus;
}

export interface ConflictPass {
  pass_number: number;
  name: string;
  result: ConflictResult;
  matches: Array<{
    entity: string;
    type: string;
    related_matter_id?: string;
    reason: string;
  }>;
}

export interface ConflictExplanation {
  passes: ConflictPass[];
  summary: string;
}

export interface ConflictCheck {
  id: string;
  intake_id: string;
  result: ConflictResult;
  matched_matter_ids: string[];
  explanation: ConflictExplanation;
  checked_at: string;
}

export interface ConflictChecker {
  check(intake: InstructionIntake): Promise<ConflictCheck>;
}

export interface WorkflowRun {
  id: string;
  workflow_key: string;
  matter_id?: string;
  status: string;
  started_at: string;
  finished_at?: string;
  context: any;
}

export interface WorkflowStep {
  id: string;
  workflow_run_id: string;
  step_key: string;
  status: string;
  started_at: string;
  finished_at?: string;
  output: any;
  error_message?: string;
}
