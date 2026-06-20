/**
 * @coclerk/config — Environment and feature flag definitions.
 * 
 * Centralises configuration that varies between environments (dev, staging, prod)
 * and chambers-level feature flags read from the database.
 */

export interface ChambersConfig {
  chambers_name: string;
  double_approval_comms: boolean;
  senior_clerk_reason_visibility: boolean;
  enable_fee_benchmarks: boolean;
  redaction_level: 'maximum' | 'moderate' | 'minimum' | 'none';
  llm_provider: 'anthropic' | 'openai' | 'google' | 'ollama';
  notification_quiet_hours_start?: string; // HH:MM
  notification_quiet_hours_end?: string;   // HH:MM
}

export const DEFAULT_CHAMBERS_CONFIG: ChambersConfig = {
  chambers_name: 'Chambers',
  double_approval_comms: true,
  senior_clerk_reason_visibility: false,
  enable_fee_benchmarks: false,
  redaction_level: 'maximum',
  llm_provider: 'ollama',
};

export interface AppConfig {
  apiPort: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  nodeEnv: 'development' | 'production' | 'test';
}

export function getAppConfig(): AppConfig {
  return {
    apiPort: parseInt(process.env.API_PORT || '4000', 10),
    databaseUrl: process.env.DATABASE_URL || 'postgresql://coclerk:coclerk_password@localhost:5432/coclerk_dev',
    jwtSecret: process.env.JWT_SECRET || 'coclerk-dev-secret-do-not-use-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  };
}
