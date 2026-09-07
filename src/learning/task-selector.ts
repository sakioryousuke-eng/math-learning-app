import type { Learner, Master } from '../math-master/types.ts';
import { skillAvailable, unitStatus } from '../math-master/unlock.ts';
export type Task = {kind:'diagnostic';skillId?:string} | {kind:'warmup'|'repair'|'learn';skillId:string} | {kind:'resume';skillId:string;problemId:string} | {kind:'start'|'max';unitId:string} | {kind:'complete'} | {kind:'blocked';reason:string};
export function selectTask(m:Master,p:Learner):Task {
  if (!p.diagnosticCompleted) return p.diagnosticPending.length ? {kind:'diagnostic',skillId:p.diagnosticPending[0]} : {kind:'diagnostic'};
  if (p.warmupRemaining && p.lastSkillId) return {kind:'warmup',skillId:p.lastSkillId};
  if (p.repair) return {kind:'repair',skillId:p.repair.repairSkillId};
  if (p.resume) return {kind:'resume',...p.resume};
  if (!p.activeUnit) {
    const next=m.units.find(u => unitStatus(m,p,u.id)==='OPEN');
    return next ? {kind:'start',unitId:next.id} : {kind:'complete'};
  }
  const pending=m.skills.filter(s => s.unitId===p.activeUnit && p.skills[s.id]!=='stable');
  const next=pending.find(s => skillAvailable(m,p,s.id));
  if (next) return {kind:'learn',skillId:next.id};
  return pending.length ? {kind:'blocked',reason:'前提技能の追加診断が必要です'} : {kind:'max',unitId:p.activeUnit};
}
