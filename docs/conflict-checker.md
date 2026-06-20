# Technical Specification: Conflict Checker Engine

## 1. Overview
The Conflict Checker Engine automates the first pass of conflict detection in chambers. It compares extracted entities from a new instruction (solicitors, parties, witnesses) against the chambers' historic matter database to identify potential BSB Handbook and IBC Code of Conduct conflicts.

## 2. Multi-Pass Logic

### Pass 1: Direct Conflict (Automatic Block)
- **Target**: Adversarial Party Match.
- **Logic**: If the `Opponent` in the new instruction matches a `Client` in an active or recent matter (within 6 years) for the same barrister, or a `Client` in an active matter for another barrister where sensitive information may overlap.
- **Result**: `blocked`.

### Pass 2: Related Party Match (Possible Conflict)
- **Target**: Solicitor / Firm / Witness Match.
- **Logic**: 
    - Same Solicitor/Firm represented in a related case area.
    - Witness in a current matter appearing as a Party in the new matter.
- **Result**: `possible_conflict` — Requires Clerk + Barrister review.

### Pass 3: Chambers-Wide "Concern"
- **Target**: Overlapping Client in different matters.
- **Logic**: Two barristers in the same chambers representing different parties in the same litigation (even if not adversarial).
- **Result**: `possible_conflict` — Must be flagged to the Senior Clerk set.

## 3. Matching Algorithm
- **Exact Match**: Case-insensitive string match on cleaned names.
- **Fuzzy Match**: Levenshtein distance threshold (default 0.85) for individual names.
- **Entity ID Match**: Company Registration Numbers or Solicitor SRA numbers (extracted from headers).

## 4. Outcome Schema
The `explanation` field in the `ConflictCheck` must follow this structure:

```json
{
  "passes": [
    {
      "pass_number": 1,
      "name": "Direct Party Match",
      "result": "clear",
      "matches": []
    },
    {
      "pass_number": 2,
      "name": "Related Party Match",
      "result": "possible_conflict",
      "matches": [
        {
          "entity": "Smith & Co Solicitors",
          "type": "solicitor",
          "related_matter_id": "uuid-123",
          "reason": "Currently representing opposing side in Matter X"
        }
      ]
    }
  ],
  "summary": "Potential conflict found in Pass 2: Related Solicitor match."
}
```

## 5. UI Requirements
- Conflicts must be displayed with links to the `related_matter_id`.
- The Clerk must be able to "Override" a `possible_conflict` with a mandatory reasoning log.
- A `blocked` result cannot be overridden without Senior Clerk (Tier 2) approval.
