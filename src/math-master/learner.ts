import type { Learner, Master } from './types.ts';
export function createLearner(m: Master, id = 'temporary-learner'): Learner {
  return {schemaVersion:1, diagnosticPending:[], diagnosticMaxEvidence:{}, id, diagnosticCompleted:false, activeUnit:null, skills:Object.fromEntries(m.skills.map(s => [s.id,'unseen'])), maxUnits:[], assessments:[], maxAttempts:{}, repair:null, resume:null, lastSkillId:null, warmupRemaining:0, crossSkillEvidence:{}, humanExp:0, behaviorEvents:[]};
}
export function recordBehavior(p: Learner, eventId: string): void {
  if (!p.behaviorEvents.includes(eventId)) {p.behaviorEvents.push(eventId); p.humanExp += 1;}
}
export function beginSession(p: Learner): void {
  p.warmupRemaining = p.diagnosticCompleted && p.lastSkillId ? 1 : 0;
}
