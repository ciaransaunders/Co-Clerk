import { ConflictChecker, InstructionIntake, ConflictCheck, ConflictPass, ConflictResult, ConflictExplanation } from '@coclerk/domain';
import { query } from '@coclerk/database';
import crypto from 'crypto';

export class DatabaseConflictChecker implements ConflictChecker {
  async check(intake: InstructionIntake): Promise<ConflictCheck> {
    const passes: ConflictPass[] = [];
    const matchedMatterIds = new Set<string>();
    
    const parsed = intake.parsed_fields || {};
    const opponent = parsed.opponent?.toLowerCase() || '';
    const client = parsed.client?.toLowerCase() || '';
    const solicitorFirm = parsed.solicitor_firm?.toLowerCase() || '';

    // Pass 1: Direct Conflict (Adversarial Party Match)
    const pass1: ConflictPass = {
      pass_number: 1,
      name: 'Direct Party Match',
      result: 'clear',
      matches: []
    };

    if (opponent) {
      // Look for active matters where the title suggests the opponent is involved, 
      // or check the solicitor_details JSON.
      // For Tier-1 simplicity in v1, we check if the opponent name appears in the matter title 
      // or if it matches raw text representations of parties.
      const opponentMatches = await query(
        `SELECT id, title, status FROM matters WHERE LOWER(title) LIKE $1 AND status != 'closed'`,
        [`%${opponent}%`]
      );

      for (const row of opponentMatches.rows) {
        pass1.matches.push({
          entity: parsed.opponent,
          type: 'opponent',
          related_matter_id: row.id,
          reason: `Adversarial party matches active matter: ${row.title}`
        });
        matchedMatterIds.add(row.id);
      }

      if (pass1.matches.length > 0) {
        pass1.result = 'blocked';
      }
    }
    passes.push(pass1);

    // Pass 2: Related Party Match (Solicitor / Firm Match)
    const pass2: ConflictPass = {
      pass_number: 2,
      name: 'Related Party Match',
      result: 'clear',
      matches: []
    };

    if (solicitorFirm) {
      // Tier-1: query the `firm` key directly rather than scanning the serialized JSONB blob.
      // Falls back gracefully when `solicitor_details` is NULL or missing the `firm` key.
      const solicitorMatches = await query(
        `SELECT id, title, status FROM matters
         WHERE LOWER(COALESCE(solicitor_details->>'firm', '')) LIKE $1
           AND status != 'closed'`,
        [`%${solicitorFirm}%`]
      );

      for (const row of solicitorMatches.rows) {
        pass2.matches.push({
          entity: parsed.solicitor_firm,
          type: 'solicitor',
          related_matter_id: row.id,
          reason: `Solicitor firm currently active in: ${row.title}`
        });
        matchedMatterIds.add(row.id);
      }

      if (pass2.matches.length > 0) {
        pass2.result = 'possible_conflict';
      }
    }
    passes.push(pass2);

    // Pass 3: Client Cross-Reference — the incoming client appears in an existing
    // active matter (potentially as opposing party or shared client across cases).
    const pass3: ConflictPass = {
      pass_number: 3,
      name: 'Client Cross-Reference',
      result: 'clear',
      matches: []
    };

    if (client) {
      const clientMatches = await query(
        `SELECT id, title, status FROM matters
         WHERE LOWER(title) LIKE $1
           AND status != 'closed'`,
        [`%${client}%`]
      );

      for (const row of clientMatches.rows) {
        // Don't double-count matters already flagged by an earlier pass.
        if (matchedMatterIds.has(row.id)) continue;
        pass3.matches.push({
          entity: parsed.client,
          type: 'client_cross_ref',
          related_matter_id: row.id,
          reason: `Client name appears in active matter: ${row.title}`
        });
        matchedMatterIds.add(row.id);
      }

      if (pass3.matches.length > 0) {
        pass3.result = 'possible_conflict';
      }
    }
    passes.push(pass3);

    // Aggregate results
    let overallResult: ConflictResult = 'clear';
    if (passes.some(p => p.result === 'blocked')) {
      overallResult = 'blocked';
    } else if (passes.some(p => p.result === 'possible_conflict')) {
      overallResult = 'possible_conflict';
    }

    const explanation: ConflictExplanation = {
      passes,
      summary: overallResult === 'clear' 
        ? 'No conflicts found.' 
        : `Potential conflict found: ${overallResult.toUpperCase()}`
    };

    return {
      id: crypto.randomUUID(),
      intake_id: intake.id,
      result: overallResult,
      matched_matter_ids: Array.from(matchedMatterIds),
      explanation,
      checked_at: new Date().toISOString()
    };
  }
}
