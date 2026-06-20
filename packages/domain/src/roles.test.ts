import { hasPermission, ROLES } from './roles';

describe('Roles & Permissions', () => {
  it('should allow Practice Manager (tier 3) to execute tier 3 actions', () => {
    expect(hasPermission(ROLES.practice_manager, 3)).toBe(true);
  });

  it('should deny Junior Clerk (tier 5) from executing tier 3 actions', () => {
    expect(hasPermission(ROLES.junior_clerk, 3)).toBe(false);
  });

  it('should deny Barrister from executing any clerk action without capability', () => {
    expect(hasPermission(ROLES.barrister, 5)).toBe(false);
  });

  it('should allow Barrister to execute action with valid capability', () => {
    expect(hasPermission(ROLES.barrister, 5, 'modify_own_diary')).toBe(true);
  });

  it('should deny clerk from executing action with missing capability', () => {
    expect(hasPermission(ROLES.junior_clerk, 5, 'manage_chambers')).toBe(false);
  });

  it('should allow Barrister to view own finance', () => {
    expect(hasPermission(ROLES.barrister, 0, 'view_own_finance')).toBe(true);
  });

  it('should allow Fees Clerk to approve a fee note via capability', () => {
    expect(hasPermission(ROLES.fees_clerk, 5, 'approve_fee_note')).toBe(true);
  });

  it('should deny Fees Clerk from clerk-only tier-3 actions without capability', () => {
    // Fees Clerk has tier 4; without a required capability they may not act at tier 3.
    expect(hasPermission(ROLES.fees_clerk, 3)).toBe(false);
  });

  it('should allow Fees Clerk to manage billing', () => {
    expect(hasPermission(ROLES.fees_clerk, 5, 'manage_billing')).toBe(true);
  });
});
