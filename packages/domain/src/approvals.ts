export interface ApprovalRequestRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  risk_tier: string;
  requested_by_user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  snapshot?: any;
}
