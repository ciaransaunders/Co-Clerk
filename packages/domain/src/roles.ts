export type RoleKey =
  | 'practice_director'
  | 'senior_clerk'
  | 'practice_manager'
  | 'assistant_pm'
  | 'fees_clerk'
  | 'junior_clerk'
  | 'barrister';

export interface Role {
  id: string;
  key: RoleKey;
  name: string;
  tier: number;
  capabilities: string[];
}

export const ROLES: Record<RoleKey, Role> = {
  practice_director: { 
    id: 'r1', key: 'practice_director', name: 'Practice Director', tier: 1,
    capabilities: ['manage_chambers', 'view_all_diaries', 'modify_all_diaries', 'view_financials', 'manage_billing']
  },
  senior_clerk: { 
    id: 'r2', key: 'senior_clerk', name: 'Senior Clerk', tier: 2,
    capabilities: ['view_all_diaries', 'modify_all_diaries', 'view_financials', 'manage_billing']
  },
  practice_manager: { 
    id: 'r3', key: 'practice_manager', name: 'Practice Manager', tier: 3,
    capabilities: ['view_all_diaries']
  },
  assistant_pm: { 
    id: 'r4', key: 'assistant_pm', name: 'Assistant PM', tier: 4,
    capabilities: ['view_all_diaries']
  },
  fees_clerk: {
    id: 'r7', key: 'fees_clerk', name: 'Fees Clerk', tier: 4,
    capabilities: ['view_financials', 'manage_billing', 'approve_fee_note']
  },
  junior_clerk: {
    id: 'r5', key: 'junior_clerk', name: 'Junior Clerk', tier: 5,
    capabilities: []
  },
  barrister: { 
    id: 'r6', key: 'barrister', name: 'Barrister', tier: 0,
    capabilities: ['view_own_diary', 'modify_own_diary', 'accept_instructions', 'approve_own_fee_note', 'view_own_finance']
  }
};

export interface User {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
}

export function hasPermission(userRole: Role, requiredTier: number, requiredCapability?: string): boolean {
  // When a capability is required, the user must have it — tier alone is not sufficient
  if (requiredCapability) {
    return userRole.capabilities.includes(requiredCapability);
  }

  // Barristers are outside the clerk tier hierarchy
  if (userRole.key === 'barrister') return false;
  return userRole.tier <= requiredTier;
}
