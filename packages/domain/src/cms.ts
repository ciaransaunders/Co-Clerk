export type CmsProvider = 'lex' | 'mlc' | 'barbooks' | 'manual';

export interface CmsMatter {
  external_id: string;
  reference_code: string;
  title: string;
  case_type?: string;
  solicitor_firm?: string;
  is_lpp_sensitive?: boolean;
}

export interface CmsDiaryEntry {
  external_id: string;
  external_matter_id?: string;
  start_time: string;
  end_time: string;
  entry_type: 'hearing' | 'prep' | 'unavailability' | 'other';
  description: string;
}

export interface CmsSyncResult {
  synced_at: string;
  matters_count: number;
  diary_entries_count: number;
  errors: Array<{
    item_id: string;
    message: string;
  }>;
}

export interface CmsAdapter {
  provider: CmsProvider;
  fetchMatters(): Promise<CmsMatter[]>;
  fetchDiaryEntries(start: string, end: string): Promise<CmsDiaryEntry[]>;
}
