import type { Learner, Master, RepairState } from './types.ts';
import { repairCandidates } from './diagnosis.ts';
export function beginRepair(m: Master, p: Learner, r: RepairState): void {
  if (p.repair) throw new Error('Repair already active');
  const source = m.skills.find(s => s.id === r.sourceSkillId);
  if (!source || source.unitId !== p.activeUnit || r.returnToSkillId !== source.id || !r.returnToProblemId) throw new Error('Invalid repair return context');
  const ancestors = (id: string): string[] => m.skills.find(s => s.id === id)!.prerequisites.flatMap(pre => [pre,...ancestors(pre)]);
  if (r.repairSkillId !== source.id && !ancestors(source.id).includes(r.repairSkillId)) throw new Error('Repair must target source or prerequisite');
  if (repairCandidates(p,r.repairSkillId).length === 0) throw new Error('Insufficient targeted prerequisite evidence');
  p.repair = {...r}; p.skills[r.repairSkillId] = 'needs_repair';
}
export function finishRepair(p: Learner): void {
  if (!p.repair || p.skills[p.repair.repairSkillId] !== 'stable') throw new Error('Repair is not stable');
  p.resume = {skillId:p.repair.returnToSkillId, problemId:p.repair.returnToProblemId}; p.repair = null;
}
