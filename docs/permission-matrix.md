# CoClerk Permission Matrix

This matrix maps the 63 user stories from `FEATURE_SPEC.md` to the minimum required Role Tier and/or specific Capabilities.

## 1. Hierarchy Key
- **T1**: Practice Director
- **T2**: Senior Clerk
- **T3**: Practice Manager
- **T4**: Assistant PM
- **T5**: Junior Clerk
- **B**: Barrister

## 2. Matrix

### Phase 1: Intake & Conflict Checking
| ID | Story Name | Min Role | Capability Required | Risk |
|----|------------|----------|---------------------|------|
| C1.1 | Automate instruction parsing | T3 | | Low |
| C1.2 | Automated conflict check | T3 | | Low |
| C1.3 | Ranked shortlist visibility | T2 | | Low |
| C1.4 | Allocation reasoning logs | T2 | | **High** |
| C1.5 | Competency/Practice Area flag | T3 | | Low |
| B1.1 | Instruction summary delivery | B | `view_own_diary` | Low |
| B1.2 | Accept/Decline response | B | `accept_instructions` | **High** |
| B1.3 | Personal stats (by case type) | B | | Low |
| B1.4 | Development target alert | B | | Low |

### Phase 2: Diary & Scheduling
| ID | Story Name | Min Role | Capability Required | Risk |
|----|------------|----------|---------------------|------|
| C2.1 | Auto-calculate prep time | T3 | `modify_all_diaries` | **High** |
| C2.2 | Real-time clash detection | T5 | `view_all_diaries` | Low |
| C2.3 | Suggest alternative counsel | T2 | `view_all_diaries` | Low |
| C2.4 | CMS/Outlook Bidirectional sync | T3 | `modify_all_diaries` | **High** |
| C2.5 | Surface court listing changes | T3 | | Low |
| C2.6 | Back-to-back hearing alerts | T3 | | Low |
| C2.7 | Court knowledge file access | T5 | | Low |
| B2.1 | Opaque unavailability | B | `modify_own_diary` | **High** |
| B2.2 | Load estimation visibility | B | `view_own_diary` | Low |
| B2.3 | Priority-ranked query queue | B | `modify_own_diary` | **High** |
| B2.4 | Over-commitment warning | B | `view_own_diary` | Low |
| B2.5 | Court travel/tips access | B | | Low |
| B2.6 | Contribute court tips (PR) | B | | **High** |

### Phase 3: Case Lifecycle
| ID | Story Name | Min Role | Capability Required | Risk |
|----|------------|----------|---------------------|------|
| C3.1 | Track matter status | T3 | | Low |
| C3.2 | Flag missing papers | T5 | | Low |
| C3.3 | Return handover summary | T3 | | **High** |
| C3.4 | Chambers-wide matter view | T2 | | Low |
| C3.5 | Solicitor update drafting | T3 | | **High** |
| B3.1 | Matter status quick-update | B | | **High** |
| B3.2 | Case preparation checklist | B | | Low |
| B3.3 | AI verification step | B | | **High** |
| B3.4 | Matter timeline view | B | | Low |
| B3.5 | Return handover view | B | | Low |
| B3.6 | Citation verification | B | | Low |

### Phase 4: Fee & Billing
| ID | Story Name | Min Role | Capability Required | Risk |
|----|------------|----------|---------------------|------|
| C4.1 | Auto-generate fee note | T5 | `manage_billing` | **High** |
| C4.2 | Aged debt dashboard | T5 | `view_financials` | Low |
| C4.3 | Flag late-paying solicitors | T2 | `view_financials` | Low |
| C4.4 | Fee quote range suggestion | T3 | `view_financials` | Low |
| C4.5 | Chambers-wide financial reports | T1 | `view_financials` | Low |
| B4.1 | Personal financial dashboard | B | `view_own_finance` | Low |
| B4.2 | Record time spent | B | `modify_own_diary` | **High** |
| B4.3 | Review/Approve fee note | B | `approve_own_fee_note` | **High** |
| B4.4 | Payment/Overdue alerts | B | `view_own_finance` | Low |
| B4.5 | Anonymised fee benchmarks | B | `view_own_finance` | Low |

### Phase 5: Communication
| ID | Story Name | Min Role | Capability Required | Risk |
|----|------------|----------|---------------------|------|
| C5.1 | Unified matter comms trail | T3 | | Low |
| C5.2 | Instant-view query generation | T5 | | Low |
| C5.3 | Routine comms drafting | T3 | | **High** |
| C5.4 | Chambers broadcast | T2 | | **High** |
| C5.5 | Batch digest delivery | T3 | | Low |
| B5.1 | preferred channels/quiet hours | B | | Low |
| B5.2 | Response via quick-actions | B | | **High** |
| B5.3 | Pending items view | B | | Low |
| B5.4 | Message source distinction | B | | Low |
| B5.5 | Comms approval step | B | | **High** |

### Phase 6: Practice Review
| ID | Story Name | Min Role | Capability Required | Risk |
|----|------------|----------|---------------------|------|
| C6.1 | Generate pre-review pack | T2 | `view_all_diaries` | Low |
| C6.2 | Schedule practice reviews | T2 | | Low |
| C6.3 | Record action points | T3 | | **High** |
| C6.4 | Fair access/EDI reporting | T2 | `view_financials` | Low |
| C6.5 | Review gap flagging | T1 | | Low |
| B6.1 | Review pre-meeting pack | B | | Low |
| B6.2 | Private goals/wellbeing notes | B | | Low |
| B6.3 | Practice trend view | B | | Low |
| B6.4 | Action item progress | B | | Low |
| B6.5 | Wellbeing concern flag | B | | **High** |
