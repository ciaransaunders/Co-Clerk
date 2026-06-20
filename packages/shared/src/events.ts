export type EventDomain = 'intake' | 'matter' | 'diary' | 'notification' | 'system';

export interface BaseEvent {
  id: string;
  correlation_id: string;
  timestamp: string;
  version: number;
}

export interface IntakeReceivedEvent extends BaseEvent {
  domain: 'intake';
  type: 'intake:received';
  payload: {
    intake_id: string;
    source: string;
  };
}

export interface IntakeProcessedEvent extends BaseEvent {
  domain: 'intake';
  type: 'intake:processed';
  payload: {
    intake_id: string;
    matter_id: string;
  };
}

export interface MatterAllocatedEvent extends BaseEvent {
  domain: 'matter';
  type: 'matter:allocated';
  payload: {
    matter_id: string;
    barrister_id: string;
    is_clash_resolution: boolean;
  };
}

export interface MatterStatusUpdatedEvent extends BaseEvent {
  domain: 'matter';
  type: 'matter:status_updated';
  payload: {
    matter_id: string;
    old_status: string;
    new_status: string;
  };
}

export interface DiaryClashDetectedEvent extends BaseEvent {
  domain: 'diary';
  type: 'diary:clash_detected';
  payload: {
    matter_id: string;
    barrister_id: string;
    clash_date: string;
  };
}

export interface NotificationSentEvent extends BaseEvent {
  domain: 'notification';
  type: 'notification:sent';
  payload: {
    notification_id: string;
    user_id: string;
    channel: string;
  };
}

export interface ChannelBridgeMessageReceivedEvent extends BaseEvent {
  domain: 'system';
  type: 'channel_bridge:message_received';
  payload: {
    channel: string;
    sender_id_hash: string;
    text_length: number;
    command_detected?: string;
  };
}

export interface ChannelBridgeDeliveryFailedEvent extends BaseEvent {
  domain: 'system';
  type: 'channel_bridge:delivery_failed';
  payload: {
    notification_id: string;
    channel: string;
    error_code: string;
  };
}

export type CoClerkEvent = 
  | IntakeReceivedEvent 
  | IntakeProcessedEvent 
  | MatterAllocatedEvent 
  | MatterStatusUpdatedEvent 
  | DiaryClashDetectedEvent 
  | NotificationSentEvent
  | ChannelBridgeMessageReceivedEvent
  | ChannelBridgeDeliveryFailedEvent;
