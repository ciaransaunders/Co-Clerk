import { determineRiskTier, ActionContext } from './riskTier';

describe('Risk Tier Engine', () => {
  it('should classify diary modification as high risk', () => {
    const ctx: ActionContext = { actionType: 'diary_modification', entityType: 'diary', actorUserId: '123' };
    expect(determineRiskTier(ctx)).toBe('high');
  });

  it('should classify internal suggestions as low risk', () => {
    const ctx: ActionContext = { actionType: 'view_dashboard', entityType: 'metrics', actorUserId: '123' };
    expect(determineRiskTier(ctx)).toBe('low');
  });
});
