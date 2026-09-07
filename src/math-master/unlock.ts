import type { Learner, Master, UnitStatus } from './types.ts';
export function unitStatus(m: Master, p: Learner, id: string): UnitStatus {
  const u = m.units.find(u => u.id === id);
  if (!u) throw new Error(`Unknown unit ${id}`);
  if (p.maxUnits.includes(id)) return 'MAX';
  if (!u.prerequisites.every(pre => p.maxUnits.includes(pre))) return 'LOCKED';
  return p.activeUnit === id ? 'ACTIVE' : 'OPEN';
}
export function skillAvailable(m: Master, p: Learner, id: string): boolean {
  const s = m.skills.find(s => s.id === id);
  if (!s) throw new Error(`Unknown skill ${id}`);
  return s.prerequisites.every(pre => {
    if (p.skills[pre] === 'needs_repair') return false;
    const owner = m.skills.find(s => s.id === pre)!;
    return p.skills[pre] === 'stable' || p.maxUnits.includes(owner.unitId);
  });
}
export function startUnit(m: Master, p: Learner, id: string): void {
  if (p.activeUnit && p.activeUnit !== id) throw new Error('Finish active unit before starting another');
  if (!['OPEN','ACTIVE'].includes(unitStatus(m,p,id))) throw new Error('Unit is not open');
  p.activeUnit = id;
}
