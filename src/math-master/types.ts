export type SkillStatus = 'unseen' | 'learning' | 'stable' | 'needs_repair';
export type UnitStatus = 'LOCKED' | 'OPEN' | 'ACTIVE' | 'MAX';
export interface Unit { id: string; name: string; prerequisites: string[]; skillFile: string }
export interface Skill { id: string; unitId: string; name: string; prerequisites: string[]; crossSkillIds: string[] }
export interface CrossSkill { id: string; name: string }
export interface MaxDefinition { unitId: string; requiredSuccesses: number; validityDays: number; dailyLimit: number; standard: string }
export interface Master { units: Unit[]; skills: Skill[]; crossSkills: CrossSkill[]; maxDefinitions: MaxDefinition[] }
export const errorTags = ['concept','misread','modeling','method_selection','condition_omission','domain_omission','case_split','equivalence','sign','transposition','expansion','factorization','fraction','calculation','transcription','logic','writing','conclusion','handwriting_unreadable','layout_unclear','expression_ambiguous'] as const;
export type ErrorTag = typeof errorTags[number];
export type Dimension = 'understanding' | 'modeling' | 'method' | 'conditions' | 'calculation' | 'expression' | 'conclusion';
export type Rating = 'success' | 'partial' | 'failure' | 'unobserved';
export interface Assessment {
  id: string; problemId: string; skillId: string; at: string;
  context: 'practice' | 'diagnostic' | 'warmup' | 'repair' | 'max';
  solved: boolean; readable: boolean; independent: boolean; integration: boolean; tags: ErrorTag[];
  dimensions: Record<Dimension, Rating>;
  crossSkills: Partial<Record<string, Rating>>;
}
export interface MaxAttempt {
  problemId: string; independenceKey: string; at: string;
  noHint: boolean; noMethodSpecified: boolean; independent: boolean;
  examQuality: boolean; practicalTime: boolean; correctConclusion: boolean;
  readable: boolean; sufficientWriting: boolean;
}
export interface RepairState {
  sourceSkillId: string; repairSkillId: string; returnToSkillId: string;
  returnToProblemId: string;
}
export interface Learner {
  schemaVersion: 1;
  diagnosticPending: string[];
  diagnosticMaxEvidence: Record<string, (MaxAttempt & {assessmentId: string})[]>;
  id: string; diagnosticCompleted: boolean; activeUnit: string | null;
  skills: Record<string, SkillStatus>; maxUnits: string[];
  assessments: Assessment[]; maxAttempts: Record<string, MaxAttempt[]>;
  repair: RepairState | null; resume: {skillId: string; problemId: string} | null;
  lastSkillId: string | null; warmupRemaining: number;
  crossSkillEvidence: Record<string, {assessmentId: string; rating: Rating}[]>;
  humanExp: number; behaviorEvents: string[];
}
