export type DecisionStatus = 'proposed' | 'confirmed' | 'rejected';

export interface AllocationSuggestion {
  id: string;
  matter_id: string;
  generated_at: string;
  model_provider?: string;
  inputs_snapshot: any;
  ranked_candidates: any[];
}

export interface AllocationDecision {
  id: string;
  matter_id: string;
  selected_barrister_id?: string;
  decision_status: DecisionStatus;
  made_by_user_id?: string;
  made_at: string;
}

export interface AllocationReasoningLog {
  id: string;
  allocation_decision_id: string;
  original_reasoning: any;
  current_reasoning: any;
  edited_by_user_id?: string;
  edited_at?: string;
}
