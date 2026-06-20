export type MatterStatus = 'draft' | 'instructed' | 'papers_received' | 'prep_in_progress' | 'hearing' | 'post_hearing' | 'closed';

export interface Matter {
  id: string;
  external_cms_id?: string;
  reference_code?: string;
  title: string;
  case_type?: string;
  court_name?: string;
  status: MatterStatus;
  funding_model?: string;
  solicitor_contact_id?: string;
  assigned_barrister_id?: string;
  has_lpp_data: boolean;
  source: string;
  opened_at: string;
  closed_at?: string;
}

export interface MatterLifecycleEvent {
  id: string;
  matter_id: string;
  event_type: string;
  from_status?: MatterStatus;
  to_status?: MatterStatus;
  occurred_at: string;
  actor_user_id?: string;
  metadata: any;
}
