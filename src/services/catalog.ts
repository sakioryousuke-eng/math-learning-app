import units from '../../data/units.json' with {type:'json'};
import crossSkills from '../../data/cross-skills.json' with {type:'json'};
import maxDefinitions from '../../data/max-definitions.json' with {type:'json'};
import cal from '../../data/skills/calculation.json' with {type:'json'};
import exp from '../../data/skills/expression.json' with {type:'json'};
import equ from '../../data/skills/equation.json' with {type:'json'};
import fun from '../../data/skills/function.json' with {type:'json'};
import hsx from '../../data/skills/numbers-expressions.json' with {type:'json'};
import qeq from '../../data/skills/quadratic-equation.json' with {type:'json'};
import qfn from '../../data/skills/quadratic-function.json' with {type:'json'};
import rawProblems from '../../data/problems.json' with {type:'json'};
import {validateMaster} from '../math-master/validate.ts';
import type {Master} from '../math-master/types.ts';
export interface Problem {
  id:string; skillId:string; topic:string; purpose:'practice'|'max'; difficulty:number;
  prompt:string; solution:string; answer:string; point:string; examAnswer:string; transfer:string;
  repairSkillId:string|null; independenceKey:string;
}
export const master:Master={units,crossSkills,maxDefinitions,skills:[...cal,...exp,...equ,...fun,...hsx,...qeq,...qfn]};
validateMaster(master);
export function assertProblems(rows:unknown):asserts rows is Problem[] {
  if(!Array.isArray(rows))throw new Error('Problem array required');
  const ids=new Set<string>();
  for(const value of rows as unknown[]){
    if(typeof value!=='object'||value===null)throw new Error('Invalid problem');
    const p=value as Record<string,unknown>;
    for(const k of ['id','skillId','topic','prompt','solution','answer','point','examAnswer','transfer','independenceKey'])if(typeof p[k]!=='string'||!p[k])throw new Error(`Missing problem ${k}`);
    if(typeof p.id!=='string'||ids.has(p.id))throw new Error('Duplicate problem');
    ids.add(p.id);
    if(p.purpose!=='practice'&&p.purpose!=='max')throw new Error('Invalid purpose');
    if(typeof p.difficulty!=='number'||!Number.isInteger(p.difficulty)||p.difficulty<1||p.difficulty>5||!master.skills.some(s=>s.id===p.skillId))throw new Error('Invalid problem skill/difficulty');
    const owner=master.skills.find(s=>s.id===p.skillId)!;
    if(!master.units.some(u=>u.id===owner.unitId)||'unitId'in p&&p.unitId!==owner.unitId)throw new Error('Invalid problem unit');
    if(p.repairSkillId!==null&&!master.skills.some(s=>s.id===p.repairSkillId))throw new Error('Invalid repair target');
  }
  for(const skill of master.skills){const practice=(rows as Problem[]).filter(p=>p.skillId===skill.id&&p.purpose==='practice');if(new Set(practice.map(p=>p.difficulty)).size>1)throw new Error('Inconsistent practice difficulty');}
}
assertProblems(rawProblems);
export const problems:Problem[]=rawProblems;

export const legacyCatalog={master,problems,version:'math-v0.1-100',mainUnitIds:master.units.map(u=>u.id)};
