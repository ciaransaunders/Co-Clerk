export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'acted' | 'expired' | 'failed';

export interface NotificationQueueItem {
  id: string;
  user_id: string;
  matter_id?: string;
  type: string;
  priority: string;
  payload: any;
  status: NotificationStatus;
  scheduled_for: string;
  acted_at?: string;
}
