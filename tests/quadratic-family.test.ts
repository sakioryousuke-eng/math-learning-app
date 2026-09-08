import test from 'node:test';
import assert from 'node:assert/strict';
import {familyProblems,familyModel,rangeText,accepts} from '../src/prototype/quadratic-family.ts';
import type {FamilyParameters} from '../src/prototype/quadratic-family.ts';
import {explanationGraph} from '../src/ui/explanation-graph.ts';
import {paperCurriculum} from '../src/grading/paper-choices.ts';
// Independent oracle: solve the two intersections and check each original endpoint inequality.
function satisfies(p:FamilyParameters,k:number){if(k<=p.c)return false;const d=Math.sqrt(k-p.c);return [p.h-d,p.h+d].every(x=>(p.leftClosed?x>=p.L:x>p.L)&&(p.rightClosed?x<=p.R:x<p.R));}
for(const p of familyProblems)test(`family ${p.index}: complete model, four distinct choices, boundaries, derivation and SVG`,()=>{
 const m=p.model,params=m.parameters,{h,c,L,R,leftClosed,rightClosed}=params;
 const left=(L-h)**2+c,right=(R-h)**2+c,upper=Math.min(left,right);
 const inclusive=left<right?leftClosed:right<left?rightClosed:leftClosed&&rightClosed;
 assert.deepEqual(m.finalRange,{lower:c,lowerClosed:false,upper,upperClosed:inclusive});
 assert.equal(p.answer,rangeText(m.finalRange));assert.equal(p.explanation.answer,p.answer);assert.deepEqual(p.explanation.finalRange,m.finalRange);assert.ok(p.explanation.steps.at(-1)!.includes(p.answer));
 assert.equal(p.choices.length,4);assert.equal(p.choices.filter(c=>c.correct).length,1);assert.equal(new Set(p.choices.map(c=>c.text)).size,4);
 const points=new Set([c-1,c,c+.01,p.sampleK,upper-.01,upper,upper+.01,...p.choices.flatMap(choice=>choice.range.upper===null?[]:[choice.range.upper-.01,choice.range.upper,choice.range.upper+.01])]);
 for(let k=c-1;k<=Math.max(left,right)+1;k+=.25)points.add(k);
 for(const k of points)assert.equal(accepts(m.finalRange,k),satisfies(params,k),`k=${k}`);
 for(const choice of p.choices){assert.equal(choice.text,rangeText(choice.range));const equivalent=[...points].every(k=>accepts(choice.range,k)===satisfies(params,k));assert.equal(equivalent,choice.correct);if(!choice.correct){assert.ok(choice.mistakeType);assert.ok(choice.weaknessTags.length);assert.ok(choice.crossSkills.length);}}
 assert.deepEqual(p.graph.curves[0].coefficients,[1,-2*h,h*h+c]);assert.deepEqual(p.graph.curves[1].coefficients,[0,0,p.sampleK]);assert.deepEqual(p.graph.domain,[L,R]);assert.equal(p.graph.openLeft,!leftClosed);assert.equal(p.graph.openRight,!rightClosed);
 assert.ok(p.prompt.includes(m.curve));assert.ok(p.prompt.includes(m.interval));assert.ok(m.leftRootCondition.includes(leftClosed?'≦':'<'));assert.ok(m.rightRootCondition.includes(rightClosed?'≦':'<'));
 assert.ok(satisfies(params,p.sampleK));for(const x of [h-Math.sqrt(p.sampleK-c),h+Math.sqrt(p.sampleK-c)])assert.ok(Math.abs((x-h)**2+c-p.sampleK)<1e-9);
 const svg=explanationGraph(p.graph);assert.ok(svg.includes('<svg'));assert.ok(!/NaN|Infinity/.test(svg));
});
test('family: 20 unique prototypes, six geometric/boundary situations, excluded from main curriculum',()=>{
 assert.equal(familyProblems.length,20);assert.equal(new Set(familyProblems.map(p=>p.prompt)).size,20);assert.equal(new Set(familyProblems.map(p=>JSON.stringify(p.model.parameters))).size,20);
 assert.equal(new Set(familyProblems.map(p=>p.variation)).size,6);
 for(const p of familyProblems){assert.equal(p.status,'prototype-unreviewed');assert.ok(!paperCurriculum.problems.some(x=>x.id===p.id));assert.ok(p.model.finalRange.upper!>p.model.finalRange.lower);}
 assert.equal(new Set(familyProblems.flatMap(p=>p.choices.flatMap(c=>c.mistakeType?[c.mistakeType]:[]))).size,4);
});
test('family: reject impossible or unsafe inputs',()=>{
 for(const parameters of [{h:0,c:0,L:0,R:2},{h:3,c:0,L:0,R:2},{h:1,c:Infinity,L:0,R:2},{h:1.234,c:0,L:0,R:3}])assert.throws(()=>familyModel({...parameters,leftClosed:true,rightClosed:true}));
});
