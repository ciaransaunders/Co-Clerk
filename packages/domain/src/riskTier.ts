export type RiskTier = 'low' | 'high';

export interface ActionContext {
  actionType: string;
  entityType: string;
  actorUserId: string;
  chambersConfig?: {
    double_approval_comms?: boolean;
    senior_clerk_reason_visibility?: boolean;
  };
}

/**
 * Risk tier engine that distinguishes between auto-executable low-risk actions
 * and high-risk actions that require human confirmation.
 * Incorporates Chambers Config for dynamic overrides.
 */
export function determineRiskTier(context: ActionContext): RiskTier {
  const highRiskActions = ['diary_modification', 'send_fee_note', 'allocation_decision'];
  
  // If config allows single-step comms, outbound comms is low risk. Otherwise high.
  if (context.actionType === 'outbound_comms') {
    if (context.chambersConfig && context.chambersConfig.double_approval_comms === false) {
      return 'low';
    }
    return 'high';
  }

  if (highRiskActions.includes(context.actionType)) {
    return 'high';
  }
  
  return 'low';
}

export function canAutoExecute(riskTier: RiskTier): boolean {
  return riskTier === 'low';
}
