export type EntryType = 'hearing' | 'conference' | 'prep' | 'travel' | 'personal_block';
export type VisibilityType = 'normal' | 'firm_unavailable';
export type BlockVisibility = 'opaque' | 'transparent';

export interface DiaryEntry {
  id: string;
  external_cms_id?: string;
  user_id: string;
  matter_id?: string;
  entry_type: EntryType;
  title: string;
  starts_at: string;
  ends_at: string;
  location_name?: string;
  visibility: VisibilityType;
  source: string;
  status: string;
}

export interface AvailabilityBlock {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  block_type: string;
  visibility_to_clerks: BlockVisibility;
  private_reason?: string;
  visible_reason?: string;
  created_by_user_id?: string;
}
