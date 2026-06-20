import { CoClerkRedactionEngine } from './engine';

describe('CoClerkRedactionEngine', () => {
  const engine = new CoClerkRedactionEngine();

  describe('redact()', () => {
    it('should pass through text unchanged at level "none"', async () => {
      const text = 'Jane Doe lives at SW1A 1AA and her email is jane@example.com';
      const result = await engine.redact(text, 'none');
      expect(result.redacted_text).toBe(text);
      expect(result.token_map).toEqual({});
      expect(result.metadata.entities_found).toBe(0);
    });

    it('should redact email addresses at all non-none levels', async () => {
      const text = 'Contact jane.doe@example.com for details.';
      for (const level of ['minimum', 'moderate', 'maximum'] as const) {
        const result = await engine.redact(text, level);
        expect(result.redacted_text).not.toContain('jane.doe@example.com');
        expect(result.redacted_text).toContain('[EMAIL_1]');
        expect(result.token_map['[EMAIL_1]']).toBe('jane.doe@example.com');
        expect(result.metadata.entities_found).toBeGreaterThanOrEqual(1);
      }
    });

    it('should redact UK phone numbers at all non-none levels', async () => {
      const text = 'Call me on 07700 900123 or +44 20 7946 0958.';
      const result = await engine.redact(text, 'minimum');
      expect(result.redacted_text).not.toContain('07700 900123');
      expect(result.redacted_text).not.toContain('+44 20 7946 0958');
      expect(result.metadata.entities_found).toBeGreaterThanOrEqual(2);
    });

    it('should redact UK postcodes at moderate and maximum levels', async () => {
      const text = 'The chambers are located at EC4Y 1AA.';
      const resultMod = await engine.redact(text, 'moderate');
      expect(resultMod.redacted_text).not.toContain('EC4Y 1AA');
      expect(resultMod.redacted_text).toContain('[POSTCODE_1]');

      // minimum level should NOT redact postcodes
      const resultMin = await engine.redact(text, 'minimum');
      expect(resultMin.redacted_text).toContain('EC4Y 1AA');
    });

    it('should redact court case references at moderate and maximum levels', async () => {
      const text = 'See [2024] EWHC 1234 (Ch) for the ruling.';
      const result = await engine.redact(text, 'maximum');
      expect(result.redacted_text).not.toContain('[2024] EWHC 1234 (Ch)');
      expect(result.redacted_text).toContain('[CASE_REF_1]');
    });

    it('should redact URLs at all non-none levels', async () => {
      const text = 'Details at https://courts.gov.uk/case/12345.';
      const result = await engine.redact(text, 'minimum');
      expect(result.redacted_text).not.toContain('https://courts.gov.uk/case/12345');
      expect(result.redacted_text).toContain('[URL_1]');
    });

    it('should produce unique tokens for multiple entities of same type', async () => {
      const text = 'Email john@a.com or jane@b.com for info.';
      const result = await engine.redact(text, 'minimum');
      expect(result.redacted_text).toContain('[EMAIL_1]');
      expect(result.redacted_text).toContain('[EMAIL_2]');
      expect(Object.keys(result.token_map)).toHaveLength(2);
    });

    it('should redact NINOs at moderate and maximum levels', async () => {
      const text = 'My NI number is AB 12 34 56 C.';
      const result = await engine.redact(text, 'maximum');
      expect(result.redacted_text).not.toContain('AB 12 34 56 C');
      expect(result.redacted_text).toContain('[NINO_1]');
    });

    it('should redact dates at moderate and maximum levels', async () => {
      const text = 'Born on 15 March 1985 in London.';
      const result = await engine.redact(text, 'moderate');
      expect(result.redacted_text).not.toContain('15 March 1985');
      expect(result.redacted_text).toContain('[DOB_1]');
    });

    it('should handle text with no PII gracefully', async () => {
      const text = 'The judge agreed with the submission.';
      const result = await engine.redact(text, 'maximum');
      expect(result.redacted_text).toBe(text);
      expect(result.metadata.entities_found).toBe(0);
    });

    it('should not double-redact overlapping spans (overlap defense)', async () => {
      // Two PII categories that could conceivably overlap on the same span should
      // be redacted exactly once — never produce a token-of-a-token.
      const text = 'See [2024] EWHC 42 (Ch) for the ruling.';
      const result = await engine.redact(text, 'maximum');
      // The case-ref is one entity. The redacted text must contain a single CASE_REF token
      // and no double-brackets like '[[CASE_REF_1]_…' that would indicate re-processing.
      expect(result.redacted_text).toContain('[CASE_REF_1]');
      expect(result.redacted_text).not.toMatch(/\[\[/);
      expect(Object.keys(result.token_map)).toEqual(['[CASE_REF_1]']);
    });

    it('should number tokens stably per category regardless of rule order', async () => {
      // Two emails and one URL in the text. Per-category counters reset independently
      // and the order of (EMAIL_1, EMAIL_2, URL_1) must reflect source position.
      const text = 'Read https://x.test for context, ping a@x.test, then b@x.test.';
      const result = await engine.redact(text, 'minimum');
      expect(result.token_map['[URL_1]']).toBe('https://x.test');
      expect(result.token_map['[EMAIL_1]']).toBe('a@x.test');
      expect(result.token_map['[EMAIL_2]']).toBe('b@x.test');
    });

    it('should handle mixed PII in a single passage', async () => {
      const text =
        'Jane Doe (jane.doe@chambers.com, 07700 900123) of EC4Y 1AA ' +
        'appeared in [2024] EWHC 42 (Admin). NI: AB 12 34 56 D. DOB: 01/02/1980.';
      const result = await engine.redact(text, 'maximum');

      expect(result.redacted_text).not.toContain('jane.doe@chambers.com');
      expect(result.redacted_text).not.toContain('07700 900123');
      expect(result.redacted_text).not.toContain('EC4Y 1AA');
      expect(result.redacted_text).not.toContain('[2024] EWHC 42 (Admin)');
      expect(result.redacted_text).not.toContain('AB 12 34 56 D');
      expect(result.redacted_text).not.toContain('01/02/1980');
      expect(result.metadata.entities_found).toBeGreaterThanOrEqual(5);
    });
  });

  describe('deredact()', () => {
    it('should reverse all token replacements', async () => {
      const original = 'Contact jane@example.com at EC4Y 1AA for matter [2024] EWHC 42 (Ch).';
      const redacted = await engine.redact(original, 'maximum');

      const restored = engine.deredact(redacted.redacted_text, redacted.token_map);
      expect(restored).toBe(original);
    });

    it('should handle LLM response that uses tokens', async () => {
      const original = 'Please advise jane@example.com about the ruling.';
      const redacted = await engine.redact(original, 'moderate');

      // Simulate an LLM response that uses the same tokens
      const llmResponse = `I recommend contacting ${Object.keys(redacted.token_map)[0]} urgently.`;
      const restored = engine.deredact(llmResponse, redacted.token_map);
      expect(restored).toContain('jane@example.com');
      expect(restored).not.toContain('[EMAIL_1]');
    });

    it('should not corrupt text when token map is empty', () => {
      const text = 'Nothing to reverse here.';
      const result = engine.deredact(text, {});
      expect(result).toBe(text);
    });
  });
});
