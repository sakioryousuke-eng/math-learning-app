import type { Learner, Master, MaxAttempt } from './types.ts';
import { unitStatus } from './unlock.ts';
const dayMs = 86400000;
const dayKey = (at:string) => new Date(Date.parse(at) + 9*3600000).toISOString().slice(0,10);
const qualifies = (a:MaxAttempt) => a.noHint && a.noMethodSpecified && a.independent && a.examQuality && a.practicalTime && a.correctConclusion && a.readable && a.sufficientWriting;
const allAttempts = (p:Learner,id:string):MaxAttempt[] => [...(p.maxAttempts[id] ?? []),...(p.diagnosticMaxEvidence[id] ?? [])];
export function saveDiagnosticMaxEvidence(m:Master,p:Learner,id:string,assessmentId:string,a:MaxAttempt):void {
  const source=p.assessments.find(e => e.id===assessmentId);
  if (!m.units.some(u => u.id===id) || !source || source.context!=='diagnostic' || !source.integration || !source.solved || !source.readable || !source.independent || !m.skills.some(s => s.id===source.skillId && s.unitId===id)) throw new Error('Successful integration diagnosis required');
  if (!qualifies(a) || !a.independenceKey || source.problemId!==a.problemId || source.at!==a.at || Object.values(source.dimensions).some(r => r!=='success')) throw new Error('MAX-equivalent evidence required');
  if (Object.values(p.diagnosticMaxEvidence).flat().some(e => e.assessmentId===assessmentId)) throw new Error('Diagnostic evidence already saved');
  (p.diagnosticMaxEvidence[id] ??= []).push({...structuredClone(a),assessmentId});
}
export function maxEvidence(m:Master,p:Learner,id:string,now:string): MaxAttempt[] {
  const policy = m.maxDefinitions.find(d => d.unitId === id);
  if (!policy || !Number.isFinite(Date.parse(now))) throw new Error('Invalid MAX query');
  let window:MaxAttempt[] = [];
  const countedDays = new Set<string>();
  for (const a of allAttempts(p,id).sort((a,b) => Date.parse(a.at)-Date.parse(b.at))) {
    if (Date.parse(a.at) > Date.parse(now) || !qualifies(a)) continue;
    if (countedDays.has(dayKey(a.at))) continue;
    if (window.length && Date.parse(a.at) >= Date.parse(window[0].at)+policy.validityDays*dayMs) window=[];
    if (!window.some(e => e.problemId === a.problemId || e.independenceKey === a.independenceKey)) {window.push(a); countedDays.add(dayKey(a.at));}
  }
  if (window.length && Date.parse(now) >= Date.parse(window[0].at)+policy.validityDays*dayMs) return [];
  return window;
}
export function submitMax(m:Master,p:Learner,id:string,a:MaxAttempt): boolean {
  if (!['OPEN','ACTIVE'].includes(unitStatus(m,p,id))) throw new Error('MAX requires open unit');
  if (p.activeUnit && p.activeUnit !== id) throw new Error('Another unit is active');
  if (!a.problemId || !a.independenceKey || !Number.isFinite(Date.parse(a.at))) throw new Error('Invalid MAX attempt');
  const policy = m.maxDefinitions.find(d => d.unitId === id)!;
  const attempts = allAttempts(p,id);
  if (attempts.some(e => Date.parse(e.at)>Date.parse(a.at))) throw new Error('Non-monotonic attempt time');
  if (attempts.filter(e => dayKey(e.at) === dayKey(a.at)).length >= policy.dailyLimit) throw new Error('Daily MAX limit reached');
  p.activeUnit = id; (p.maxAttempts[id] ??= []).push(structuredClone(a));
  if (maxEvidence(m,p,id,a.at).length < policy.requiredSuccesses) return false;
  p.maxUnits.push(id);
  for (const s of m.skills.filter(s => s.unitId === id)) p.skills[s.id]='stable';
  p.activeUnit=null; p.resume=null; p.repair=null; return true;
}
