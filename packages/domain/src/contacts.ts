export interface Contact {
  id: string;
  type: string;
  name: string;
  organisation?: string;
  email?: string;
  phone?: string;
  metadata: any;
}

export interface Message {
  id: string;
  matter_id?: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  external_message_id?: string;
  sender_user_id?: string;
  sender_contact_id?: string;
  subject?: string;
  body_text?: string;
  body_redacted?: string;
  received_at?: string;
  sent_at?: string;
}
