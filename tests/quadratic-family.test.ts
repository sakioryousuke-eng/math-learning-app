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
 for(const choice of p.choices){assert.equal(choice.text,rangeText(choice.range));const equivalent=[...points].every(k=>accepts(choice.range,k)===satisfies(params,k));assert.equal(equivalent,choice.correct);if(!choice.correct){assert.ok(choice.mistakeType);assert.ok(choice.mistakeHypotheses.length);}}
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

// Frozen from commit 4aef7be before the attribute-only change.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderFamilyAttributes} from '../src/ui/family-prototype.ts';
test('family: mathematical content, choices, explanations and graphs match the pre-change baseline',()=>{
 const baseline=JSON.parse(readFileSync(new URL('./quadratic-family-baseline.json',import.meta.url),'utf8')) as {id:string;sha256:string}[];
 const actual=familyProblems.map(p=>{
  const {problemRequirements,mistakeHypotheses,...content}=p;
  const snapshot={...content,choices:p.choices.map(({mistakeHypotheses,...choice})=>choice)};
  return {id:p.id,sha256:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')};
 });
 assert.deepEqual(actual,baseline);
});
test('family: requirements and narrowly scoped choice hypotheses are separate on all 20 problems',()=>{
 const expectedRequirements={intersection_equation:['X08'],distinct_roots:['X04'],both_roots:['X07'],preserve_interval:['X04'],endpoint_inclusion:['X03'],verify_original:['X13']};
 const expectedHypotheses={real_root_only:['X04'],double_root_included:['X04'],boundary_equality:['X03'],one_root_only:['X07']};
 for(const p of familyProblems){
  assert.deepEqual(Object.fromEntries(p.problemRequirements.map(r=>[r.id,r.crossSkills])),expectedRequirements);
  assert.ok(p.problemRequirements.every(r=>r.description.length>0));
  assert.deepEqual(p.mistakeHypotheses,p.choices.flatMap(c=>c.mistakeHypotheses));
  assert.ok(!('crossSkills' in p.model));
  for(const c of p.choices){
   assert.ok(!('weaknessTags' in c));assert.ok(!('crossSkills' in c));
   if(c.correct){assert.deepEqual(c.mistakeHypotheses,[]);assert.ok(!p.mistakeHypotheses.some(h=>h.choiceId===c.choiceId));continue;}
   assert.equal(c.mistakeHypotheses.length,1);
   const h=c.mistakeHypotheses[0];
   assert.equal(h.choiceId,c.choiceId);assert.equal(h.mistakeType,c.mistakeType);
   assert.deepEqual(h.weaknessTags,[c.mistakeType]);assert.deepEqual(h.crossSkills,expectedHypotheses[h.mistakeType]);
   assert.equal(h.hypothesisOnly,true);assert.ok(h.description.includes('可能性'));
  }
  const cross=[...p.problemRequirements.flatMap(r=>r.crossSkills),...p.mistakeHypotheses.flatMap(h=>h.crossSkills)];
  assert.ok(!cross.some(id=>String(id)==='X06'||String(id)==='X10'));
 }
});
test('family: verification display separates requirements from only the selected hypothesis',()=>{
 for(const p of familyProblems)for(const choice of p.choices){
  const html=renderFamilyAttributes(p,choice.choiceId);
  assert.ok(html.includes('この問題で必要な能力'));assert.ok(html.includes('今回選択した誤答から得られる弱点仮説'));
  for(const r of p.problemRequirements)assert.ok(html.includes(r.description));
  for(const h of p.mistakeHypotheses)assert.equal(html.includes(h.description),h.choiceId===choice.choiceId);
  if(choice.correct)assert.ok(html.includes('弱点仮説は付与しません'));
 }
});
