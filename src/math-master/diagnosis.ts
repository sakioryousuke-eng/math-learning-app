import { errorTags } from './types.ts';
import type { Assessment, Learner, Master } from './types.ts';
export function recordAssessment(m: Master, p: Learner, a: Assessment): void {
  if (!m.skills.some(s => s.id === a.skillId)) throw new Error('Unknown assessment skill');
  if (p.assessments.some(x => x.id === a.id)) throw new Error('Duplicate assessment');
  if (!Number.isFinite(Date.parse(a.at)) || a.tags.some(t => !errorTags.includes(t))) throw new Error('Invalid assessment');
  if (Object.keys(a.crossSkills).some(id => !m.crossSkills.some(c => c.id === id))) throw new Error('Unknown cross skill');
  const saved = structuredClone(a);
  if (!saved.readable) {saved.solved = false; if (!saved.tags.includes('handwriting_unreadable')) saved.tags.push('handwriting_unreadable');}
  p.assessments.push(saved);
  if (saved.context === 'diagnostic' && saved.solved && saved.readable && saved.independent) {
    p.diagnosticPending = p.diagnosticPending.filter(id => id !== saved.skillId);
  }
  for (const [id,rating] of Object.entries(saved.crossSkills)) {
    if (rating) (p.crossSkillEvidence[id] ??= []).push({assessmentId:saved.id,rating});
  }
  if (saved.context === 'warmup') {p.warmupRemaining = Math.max(0,p.warmupRemaining-1); return;}
  p.lastSkillId = saved.skillId;
  // Repeated evidence is a candidate, never an automatic demotion.
}
export function repairCandidates(p: Learner, skillId: string): string[] {
  const recent = p.assessments.filter(a => a.skillId === skillId && a.context !== 'warmup').slice(-4);
  const afterSuccess = recent.slice(recent.findLastIndex(a => a.solved) + 1);
  return errorTags.filter(tag => !['handwriting_unreadable','layout_unclear','expression_ambiguous'].includes(tag) && new Set(afterSuccess.filter(a => !a.solved && a.tags.includes(tag)).map(a => a.problemId)).size >= 2);
}
export function confirmStable(p: Learner, skillId: string): void {
  if (!(skillId in p.skills)) throw new Error('Unknown skill');
  const attempts = p.assessments.filter(a => a.skillId === skillId && a.context !== 'warmup');
  const successes = attempts.slice(attempts.findLastIndex(a => !a.solved) + 1).filter(a => a.solved && a.readable && a.independent);
  if (new Set(successes.map(a => a.problemId)).size < 2) throw new Error('Two different independent successful tasks required');
  p.skills[skillId] = 'stable';
}
export function completeDiagnostic(m: Master, p: Learner, passedSections: {unitId:string; assessmentIds:string[]}[]): void {
  if (p.diagnosticCompleted) throw new Error('Initial diagnosis runs only once');
  if (p.diagnosticPending.length) throw new Error('Targeted diagnosis is pending');
  for (const section of passedSections) {
    if (!m.units.some(u => u.id === section.unitId)) throw new Error('Unknown diagnostic unit');
    const evidence = p.assessments.filter(a => section.assessmentIds.includes(a.id) && a.context === 'diagnostic' && a.solved && a.readable && a.independent && a.integration && m.skills.some(s => s.id === a.skillId && s.unitId === section.unitId));
    if (new Set(evidence.map(a => a.problemId)).size < 2) throw new Error('Two successful integration tasks required');
  }
  for (const section of passedSections) for (const s of m.skills.filter(s => s.unitId === section.unitId)) p.skills[s.id] = 'stable';
  p.diagnosticCompleted = true;
}

// The evaluator supplies implicated skills. Tags alone cannot identify a prerequisite.
export function planDiagnosticFollowup(m: Master, p: Learner, assessmentId: string, candidates: string[]): void {
  if (p.diagnosticCompleted) throw new Error('Initial diagnosis already completed');
  const a = p.assessments.find(a => a.id === assessmentId);
  if (!a || a.context !== 'diagnostic' || a.solved) throw new Error('Failed diagnostic evidence required');
  const ancestors = (id: string): string[] => m.skills.find(s => s.id === id)!.prerequisites.flatMap(pre => [pre,...ancestors(pre)]);
  const allowed = new Set([a.skillId,...ancestors(a.skillId)]);
  if (!candidates.length || candidates.some(id => !allowed.has(id))) throw new Error('Only implicated prerequisite branches may be diagnosed');
  p.diagnosticPending = [...new Set([...p.diagnosticPending.filter(id => id !== a.skillId), ...candidates])];
}
