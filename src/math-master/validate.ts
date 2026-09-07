import type { Master } from './types.ts';
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function graph(nodes: {id: string; prerequisites: string[]}[], label: string) {
  const index = new Map(nodes.map(n => [n.id, n]));
  assert(index.size === nodes.length, `${label}: duplicate ID`);
  const visiting = new Set<string>(), done = new Set<string>();
  function visit(id: string) {
    assert(!visiting.has(id), `${label}: cycle at ${id}`);
    if (done.has(id)) return;
    const node = index.get(id);
    assert(node, `${label}: missing reference ${id}`);
    visiting.add(id);
    for (const pre of node.prerequisites) visit(pre);
    visiting.delete(id); done.add(id);
  }
  nodes.forEach(n => visit(n.id));
}
export function validateMaster(m: Master): void {
  assert(m && Array.isArray(m.units) && Array.isArray(m.skills) && Array.isArray(m.crossSkills) && Array.isArray(m.maxDefinitions), 'Invalid master arrays');
  for (const n of [...m.units, ...m.skills]) {
    assert(typeof n.id === 'string' && n.id.length > 0 && typeof n.name === 'string', 'Invalid node');
    assert(Array.isArray(n.prerequisites) && n.prerequisites.every(p => typeof p === 'string'), 'Invalid prerequisites');
    assert(new Set(n.prerequisites).size === n.prerequisites.length, 'Duplicate prerequisite');
  }
  graph(m.units, 'unit DAG'); graph(m.skills, 'skill DAG');
  const units = new Map(m.units.map(u => [u.id, u]));
  const cross = new Set(m.crossSkills.map(c => c.id));
  assert(cross.size === m.crossSkills.length && cross.size >= 13, 'Invalid cross skills');
  function ancestors(id: string): string[] { return units.get(id)!.prerequisites.flatMap(p => [p, ...ancestors(p)]); }
  for (const s of m.skills) {
    assert(units.has(s.unitId), `Missing unit ${s.unitId}`);
    assert(Array.isArray(s.crossSkillIds) && s.crossSkillIds.every(c => cross.has(c)), `Invalid cross skill in ${s.id}`);
    for (const p of s.prerequisites) {
      const pre = m.skills.find(x => x.id === p)!;
      assert(pre.unitId === s.unitId || ancestors(s.unitId).includes(pre.unitId), `Skill dependency outside unit route: ${s.id}`);
    }
  }
  assert(m.maxDefinitions.length === m.units.length && new Set(m.maxDefinitions.map(d => d.unitId)).size === m.units.length, 'One MAX definition per unit required');
  for (const u of m.units) assert(m.skills.some(s => s.unitId === u.id), `Empty unit ${u.id}`);
  for (const d of m.maxDefinitions) {
    assert(units.has(d.unitId), 'Unknown MAX unit');
    assert([d.requiredSuccesses,d.validityDays,d.dailyLimit].every(n => Number.isInteger(n) && n > 0), 'Invalid MAX policy');
    assert(typeof d.standard === 'string' && d.standard.length > 0, 'Missing MAX standard');
  }
}
