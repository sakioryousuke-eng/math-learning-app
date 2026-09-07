import {validateMaster} from '../math-master/validate.ts';
import requiredMaxRules from '../../data/curriculum-requirements.json' with {type:'json'};
import type {Curriculum} from './types.ts';
// Versioned audit policy is separate from the editable route definitions.
const requirements=new Map<string,string[]>(Object.entries(requiredMaxRules));
function assert(ok:unknown,message:string):asserts ok{if(!ok)throw new Error(message);}
export function validateCurriculum(c:Curriculum){
 const m=c.master;validateMaster(m);
 const unitIds=new Set(m.units.map(u=>u.id)),skillIds=new Set(m.skills.map(s=>s.id));
 assert([...requirements.keys()].every(id=>unitIds.has(id)),'Missing required curriculum unit');
 assert(c.units.length===unitIds.size&&new Set(c.units.map(u=>u.unitId)).size===unitIds.size,'Unit metadata mismatch');
 assert(c.skills.length===skillIds.size&&new Set(c.skills.map(s=>s.skillId)).size===skillIds.size,'Skill metadata mismatch');
 for(const u of c.units){
  const node=m.units.find(n=>n.id===u.unitId);assert(node,'Unknown guide unit');
  assert(['MAIN','EXTRA','ANOTHER'].includes(u.lane),'Invalid lane');
  assert(node.prerequisites.length===u.requiredMax.length&&node.prerequisites.every(id=>u.requiredMax.includes(id)),'Unlock metadata mismatch');
  assert((requirements.get(u.unitId)??[]).every(id=>node.prerequisites.includes(id)),`Missing mandatory MAX requirement: ${u.unitId}`);
  if(u.lane==='MAIN')assert(node.prerequisites.every(id=>c.units.find(p=>p.unitId===id)?.lane==='MAIN'),'Optional route cannot unlock MAIN');
  assert(!u.theoryRecoveredIn||unitIds.has(u.theoryRecoveredIn),'Missing theory recovery unit');
  assert(u.max.writing&&u.max.noHint&&u.max.noMethodLabel&&u.max.minutes>0&&u.max.template.length>0,'Invalid MAX template');
 }
 assert(c.mainUnitIds.length===c.units.filter(u=>u.lane==='MAIN').length&&new Set(c.mainUnitIds).size===c.mainUnitIds.length&&c.mainUnitIds.every(id=>c.units.some(u=>u.unitId===id&&u.lane==='MAIN')),'Invalid main route');
 for(const g of c.skills){const s=m.skills.find(s=>s.id===g.skillId);assert(s,'Unknown skill guide');assert(g.crossSkillIds.every(id=>s.crossSkillIds.includes(id)),'CrossSkill guide mismatch');}
 for(const d of m.maxDefinitions)assert(d.requiredSuccesses===3&&d.validityDays===7&&d.dailyLimit===1,'MAX policy must remain 3/7/1');
 const reached=new Set<string>();let changed=true;
 while(changed){changed=false;for(const u of m.units)if(!reached.has(u.id)&&u.prerequisites.every(id=>reached.has(id))){reached.add(u.id);changed=true;}}
 assert(reached.size===m.units.length,'Unreachable unit');
 const pids=new Set(c.problems.map(p=>p.id));assert(pids.size===c.problems.length,'Duplicate problem ID');
 assert(c.problemGuides.length===pids.size&&new Set(c.problemGuides.map(g=>g.problemId)).size===pids.size,'Problem metadata mismatch');
 for(const p of c.problems){assert(skillIds.has(p.skillId)&&(!p.repairSkillId||skillIds.has(p.repairSkillId)),'Invalid problem reference');assert(p.prompt&&p.solution&&p.answer&&p.independenceKey,'Incomplete representative');}
 for(const g of c.problemGuides)assert(pids.has(g.problemId)&&g.roles.length&&g.roles.every(r=>['introduction','basic','repair','integration','max'].includes(r)),'Invalid problem role');
 for(const s of m.skills)assert(c.problems.filter(p=>p.skillId===s.id&&p.purpose==='practice').length>=2,`Missing practice variants: ${s.id}`);
 for(const u of m.units){const representatives=c.problems.filter(p=>p.purpose==='max'&&m.skills.find(s=>s.id===p.skillId)?.unitId===u.id);assert(new Set(representatives.map(p=>p.independenceKey)).size>=3,`Missing independent MAX representatives: ${u.id}`);}
}
