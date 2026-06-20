import { RedactionEngine, RedactionLevel, RedactionResult } from './types';

/**
 * Stage 1 redaction patterns — deterministic regex-based masking for
 * structured PII.  These run at all redaction levels except 'none'.
 *
 * Each pattern produces a category tag used by the reversible tokenizer
 * (e.g. [EMAIL_1], [PHONE_2]).  Patterns are ordered so that more
 * specific rules (case refs) run before generic ones (names/orgs, which
 * are Stage 2 NER and not yet implemented).
 */
interface RegexRule {
  category: string;
  pattern: RegExp;
  /** Redaction levels at which this rule fires */
  levels: ReadonlySet<RedactionLevel>;
}

const LEVEL_ALL: ReadonlySet<RedactionLevel> = new Set(['maximum', 'moderate', 'minimum']);
const LEVEL_MAX_MOD: ReadonlySet<RedactionLevel> = new Set(['maximum', 'moderate']);

const REGEX_RULES: readonly RegexRule[] = [
  // UK postcode — e.g. SW1A 1AA, EC2R 8AH, M1 4RJ
  {
    category: 'POSTCODE',
    pattern: /\b([Gg][Ii][Rr] 0[Aa]{2})|([A-Za-z][A-Ha-hJ-Yj-y]?\d[A-Za-z0-9]? ?\d[A-Za-z]{2})\b/g,
    levels: LEVEL_MAX_MOD,
  },
  // UK phone — landline and mobile, with optional +44 / 0044 prefix
  {
    category: 'PHONE',
    pattern: /(?<!\w)(?:\+44|0044|0)\s?(?:\d[\s.-]?){9,10}\b/g,
    levels: LEVEL_ALL,
  },
  // Email address
  {
    category: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    levels: LEVEL_ALL,
  },
  // UK court case references — e.g. [2024] EWHC 1234 (Ch), [2023] UKSC 12
  {
    category: 'CASE_REF',
    pattern: /\[\d{4}\]\s+[A-Z]{2,6}\s+\d{1,5}(?:\s*\([A-Za-z]+\))?/g,
    levels: LEVEL_MAX_MOD,
  },
  // UK National Insurance Number — e.g. QQ 12 34 56 C
  {
    category: 'NINO',
    pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
    levels: LEVEL_MAX_MOD,
  },
  // Date of birth patterns — e.g. 01/02/1990, 1 February 1990
  {
    category: 'DOB',
    pattern: /\b\d{1,2}[\s/\-.](?:January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2})[\s/\-.]\d{2,4}\b/gi,
    levels: LEVEL_MAX_MOD,
  },
  // URL
  {
    category: 'URL',
    pattern: /https?:\/\/[^\s)]+/g,
    levels: LEVEL_ALL,
  },
] as const;

/**
 * CoClerkRedactionEngine — Stage 1 implementation.
 *
 * Deterministic, regex-based PII detection and reversible tokenization.
 * Satisfies the `redaction-engine.md` §6 Stage 1 requirement.
 *
 * Reversibility:  Every detected entity is replaced with a categorized
 * token ([CATEGORY_N]) and stored in a token map.  The `deredact` method
 * reverses this using the map.
 *
 * Fail-closed:  If the engine throws, callers must not transmit the
 * original text to a cloud LLM.
 */
export class CoClerkRedactionEngine implements RedactionEngine {
  async redact(text: string, level: RedactionLevel): Promise<RedactionResult> {
    const startTime = Date.now();

    if (level === 'none') {
      return this.buildResult(text, text, {}, level, 0, startTime);
    }

    // 1) Collect all matches across all active rules against the original text.
    type RawMatch = { start: number; end: number; category: string; match: string; ruleIndex: number };
    const raw: RawMatch[] = [];

    REGEX_RULES.forEach((rule, ruleIndex) => {
      if (!rule.levels.has(level)) return;
      // Fresh RegExp each time so lastIndex is local to this pass.
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const matched = m[0];
        // Defensive: skip empty matches to avoid an infinite loop.
        if (matched.length === 0) {
          pattern.lastIndex++;
          continue;
        }
        raw.push({
          start: m.index,
          end: m.index + matched.length,
          category: rule.category,
          match: matched,
          ruleIndex,
        });
      }
    });

    // 2) Sort by start ascending; on tie, longer match first; on further tie, earlier rule first.
    raw.sort((a, b) =>
      (a.start - b.start) || ((b.end - b.start) - (a.end - a.start)) || (a.ruleIndex - b.ruleIndex)
    );

    // 3) Greedy non-overlap selection — first accepted wins for any overlapping span.
    const accepted: RawMatch[] = [];
    let lastEnd = -1;
    for (const m of raw) {
      if (m.start >= lastEnd) {
        accepted.push(m);
        lastEnd = m.end;
      }
    }

    // 4) Allocate tokens with per-category counters in source order.
    const counters: Record<string, number> = {};
    const tokenMap: Record<string, string> = {};
    type Replacement = { start: number; end: number; token: string };
    const replacements: Replacement[] = accepted.map(m => {
      counters[m.category] = (counters[m.category] ?? 0) + 1;
      const token = `[${m.category}_${counters[m.category]}]`;
      tokenMap[token] = m.match;
      return { start: m.start, end: m.end, token };
    });

    // 5) Apply in reverse so earlier indices stay valid.
    let redacted = text;
    for (let i = replacements.length - 1; i >= 0; i--) {
      const r = replacements[i];
      redacted = redacted.substring(0, r.start) + r.token + redacted.substring(r.end);
    }

    return this.buildResult(redacted, text, tokenMap, level, accepted.length, startTime);
  }

  deredact(redactedResponse: string, tokenMap: Record<string, string>): string {
    let result = redactedResponse;

    // Replace longest tokens first to avoid partial overlap issues.
    const sortedTokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);

    for (const token of sortedTokens) {
      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escapedToken, 'g'), tokenMap[token]);
    }

    return result;
  }

  private buildResult(
    redacted: string,
    original: string,
    tokenMap: Record<string, string>,
    level: RedactionLevel,
    entitiesFound: number,
    startTime: number,
  ): RedactionResult {
    return {
      redacted_text: redacted,
      original_text: original,
      token_map: tokenMap,
      level_applied: level,
      metadata: {
        entities_found: entitiesFound,
        processing_time_ms: Date.now() - startTime,
      },
    };
  }
}
