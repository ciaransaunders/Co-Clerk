export type RedactionLevel = 'maximum' | 'moderate' | 'minimum' | 'none';

export interface RedactionResult {
  redacted_text: string;
  original_text: string;
  token_map: Record<string, string>;
  level_applied: RedactionLevel;
  metadata: {
    entities_found: number;
    ner_confidence?: number;
    processing_time_ms: number;
  };
}

export interface RedactionEngine {
  /**
   * Redacts PII from text based on the specified level.
   * Returns a RedactionResult which includes a reversible token map.
   */
  redact(text: string, level: RedactionLevel): Promise<RedactionResult>;

  /**
   * Reverses redaction in a response using a provided token map.
   */
  deredact(redactedResponse: string, tokenMap: Record<string, string>): string;
}

export interface NERProvider {
  name: string;
  detectEntities(text: string): Promise<DetectedEntity[]>;
}

export interface DetectedEntity {
  text: string;
  type: string;
  start: number;
  end: number;
  score: number;
}
