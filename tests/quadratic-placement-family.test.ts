import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {placementProblems,placementSeeds,placementModel,generatePlacementProblem,rootPlacementOracle,evaluate,contains,equivalentSets,solveConditions,placementGraphState,placementBoundaries,setText} from '../src/prototype/quadratic-placement-family.ts';
import type {PlacementParameters} from '../src/prototype/quadratic-placement-family.ts';
import {placementDynamicSpec,renderPlacementResult,renderPlacementPrototype,resetPlacementProblem,placementAttempt} from '../src/ui/placement-family-prototype.ts';
import {boundaryJump} from '../src/ui/dynamic-quadratic.ts';
import {explanationGraph} from '../src/ui/explanation-graph.ts';

// A second, test-local calculation starts from coefficients, never from generated conditions.
function direct(p:PlacementParameters,k:number){
 const b=p.b1*k+p.b0,c=p.c1*k+p.c0,d=b*b-4*p.A*c;if(d<=1e-9)return false;
 const center=-b/(2*p.A),radius=Math.sqrt(d)/(2*Math.abs(p.A)),a=center-radius,z=center+radius,t=p.target;
 const lt=(x:number,y:number)=>x<y-1e-9,le=(x:number,y:number)=>x<=y+1e-9;
 switch(t.kind){case 'right':return lt(t.r,a);case 'left':return lt(z,t.r);case 'straddle':return lt(a,t.r)&&lt(t.r,z);case 'outside':return lt(a,t.L)&&lt(t.R,z);case 'inside':return (t.leftClosed?le(t.L,a):lt(t.L,a))&&(t.rightClosed?le(z,t.R):lt(z,t.R));}
}
const expected=['1<k','0<k<1','k<0','-5/2<k<-2 または 2<k<5/2','-3/2≦k≦3/2','2<k<18/7','-1/3<k<0 または 1<k≦9/5','-2<k<-1/2','√2<k<3/2','k<-1','2<k≦8/3','-3/4<k<3/4'];
test('12 seeds cover levels, A signs, all placements and interval closures',()=>{
 assert.equal(placementProblems.length,12);assert.deepEqual(['標準','応用','高め'].map(l=>placementSeeds.filter(p=>p.level===l).length),[3,5,4]);
 assert.deepEqual(new Set(placementSeeds.map(p=>Math.sign(p.A))),new Set([-1,1]));
 assert.deepEqual(new Set(placementSeeds.map(p=>p.target.kind)),new Set(['right','left','inside','straddle','outside']));
 assert.deepEqual(new Set(placementSeeds.flatMap(p=>p.target.kind==='inside'?[`${p.target.leftClosed}/${p.target.rightClosed}`]:[])),new Set(['false/false','true/true','true/false','false/true']));
 assert.ok(placementProblems.some(p=>p.model.D[0]===0&&p.model.D[1]!==0));assert.ok(placementProblems.some(p=>p.model.D[0]!==0));
 assert.deepEqual(placementProblems.map(p=>p.explanation.answer),expected);
});
for(const problem of placementProblems){
 test(`${problem.id}: coefficients, each condition, intersection and independent roots`,()=>{
  const m=problem.model,p=m.parameters,cuts=m.boundaries.map(b=>b.value);
  const samples=[...Array.from({length:2401},(_,i)=>(i-1200)/24),...cuts.flatMap(k=>[k-1e-5,k,k+1e-5]),...[-1000,-100,100,1000]];
  for(const k of samples){
   const B=p.b1*k+p.b0,C=p.c1*k+p.c0,D=B*B-4*p.A*C;
   assert.ok(Math.abs(evaluate(m.D,k)-D)<1e-6);assert.ok(Math.abs(evaluate(m.axis,k)+B/(2*p.A))<1e-10);
   for(const point of m.pointValues)assert.ok(Math.abs(evaluate(point.polynomial,k)-(p.A*point.x**2+B*point.x+C))<1e-8);
   for(const c of m.conditions){const v=evaluate(c.polynomial,k);assert.equal(contains(c.set,k),c.inclusive?v>=-1e-9:v>1e-9,`${c.id} at ${k}`);}
   assert.equal(contains(m.answer,k),m.conditions.every(c=>contains(c.set,k)),`intersection at ${k}`);
   assert.equal(contains(m.answer,k),direct(p,k),`test-local root placement at ${k}`);
   assert.equal(rootPlacementOracle(p,k).satisfied,direct(p,k),`runtime oracle at ${k}`);
  }
 });
 test(`${problem.id}: graph roots, exact boundary buttons, endpoint markers`,()=>{
  const s=placementDynamicSpec(problem),samples=[s.initial,...mids(problem.model.boundaries.map(b=>b.value)),...problem.model.boundaries.map(b=>b.value)];
  for(const k of samples){const state=placementGraphState(problem.model.parameters,k);if(state.roots.length){assert.equal(state.graphRoots.length,2);state.graphRoots.forEach((x,i)=>assert.ok(Math.abs(x-state.roots[i])<1e-8));}assert.equal(state.satisfied,direct(problem.model.parameters,k));assert.match(explanationGraph(state.graph),/指定|端/);}
  s.boundaries.forEach((b,i)=>{const jump=boundaryJump(s,i);assert.equal(jump.value,b.value);assert.equal(jump.label,b.label);assert.equal(placementGraphState(problem.model.parameters,jump.value).satisfied,direct(problem.model.parameters,b.value));});
  const t=problem.model.parameters.target,g=s.graph(s.initial);if(t.kind==='inside'){assert.deepEqual(g.domain,[t.L,t.R]);assert.equal(g.openLeft,!t.leftClosed);assert.equal(g.openRight,!t.rightClosed);}
 });
 test(`${problem.id}: distinct mathematical options and index-independent scoring`,()=>{
  assert.equal(problem.choices.length,4);assert.equal(problem.choices.filter(c=>c.correct).length,1);
  problem.choices.forEach((c,i)=>problem.choices.slice(i+1).forEach(other=>assert.equal(equivalentSets(c.answer,other.answer),false)));
  const again=generatePlacementProblem(problem.model.parameters,987);
  assert.deepEqual(problem.decisions.map(d=>[d.type,d.diagnosticScore,d.selected,d.choice.answer]),again.decisions.map(d=>[d.type,d.diagnosticScore,d.selected,d.choice.answer]));
  for(const d of problem.decisions){assert.ok(d.selectionReason);assert.ok(d.reason);assert.deepEqual(d.choice.answer,solveConditions(d.errorModel.conditions,d.errorModel.operation==='union'));if(d.selected)assert.equal(equivalentSets(d.choice.answer,problem.model.answer),false);}
  const correct=problem.choices.find(c=>c.correct)!;assert.deepEqual(correct.mistakeHypotheses,[]);
  for(const c of problem.choices.filter(c=>!c.correct)){assert.equal(c.mistakeHypotheses.length,1);assert.ok(c.mistakeHypotheses[0].hypothesisOnly);assert.equal(c.mistakeHypotheses[0].mistakeType,c.mistakeType);}
 });
}
function mids(values:number[]){return values.slice(1).map((v,i)=>(v+values[i])/2);}
test('straddling uses only sign conditions; axis conditions prevent wrong-side roots',()=>{
 for(const p of placementProblems.filter(p=>['straddle','outside'].includes(p.model.parameters.target.kind)))assert.ok(p.model.conditions.every(c=>!c.id.startsWith('axis')&&c.id!=='distinct'));
 const p=placementProblems[0],omit=p.decisions.find(d=>d.type==='axis_condition_missing')!;assert.ok(contains(omit.choice.answer,-2));assert.equal(contains(p.model.answer,-2),false);assert.ok(omit.selected);
});
test('opening misconception recalculates signs for negative A; equivalents excluded',()=>{
 assert.ok(placementProblems.some(p=>p.model.A<0&&p.decisions.some(d=>d.type==='opening_sign_confusion'&&d.selected)));
 for(const p of placementProblems.filter(p=>p.model.A>0))assert.match(p.decisions.find(d=>d.type==='opening_sign_confusion')!.selectionReason,/同値/);
 assert.ok(placementProblems.some(p=>p.decisions.some(d=>/採用候補.*同値/.test(d.selectionReason))));
});
test('irrational boundary retains √2 rather than rounded slider value',()=>{
 const p=placementProblems[8],s=placementDynamicSpec(p),i=s.boundaries.findIndex(b=>b.label==='√2'),b=boundaryJump(s,i);
 assert.equal(b.value,Math.SQRT2);assert.notEqual(b.value,1.41);assert.ok(Math.abs(evaluate(p.model.D,b.value))<1e-10);assert.equal(rootPlacementOracle(p.model.parameters,b.value).satisfied,false);
 assert.equal(rootPlacementOracle(p.model.parameters,b.value+1e-5).satisfied,true);assert.equal(rootPlacementOracle(p.model.parameters,b.value-1e-5).satisfied,false);
 assert.deepEqual(placementBoundaries([1,0,-2]).map(b=>b.label),['−√2','√2']);
});
test('endpoint equality and distinct-root boundaries match concrete root placements',()=>{
 assert.equal(rootPlacementOracle(placementSeeds[4],1.5).satisfied,true);
 assert.equal(rootPlacementOracle(placementSeeds[5],18/7).satisfied,false);
 assert.equal(rootPlacementOracle(placementSeeds[6],9/5).satisfied,true);
 assert.equal(rootPlacementOracle(placementSeeds[6],-1/3).satisfied,false);
 assert.equal(rootPlacementOracle(placementSeeds[10],2).satisfied,false);
 assert.equal(rootPlacementOracle(placementSeeds[10],8/3).satisfied,true);
});
test('answer and graph appear only after submission; Japanese explains reasons and original target',()=>{
 for(const p of placementProblems){resetPlacementProblem(p.id);const before=renderPlacementPrototype();assert.doesNotMatch(before,/data-dynamic=|<h2>考え方|<h2>答え/);
 const after=renderPlacementResult(p,p.choices[0].choiceId);for(const title of ['考え方','解き方','グラフで確かめる','答え'])assert.ok(after.includes(`<h2>${title}</h2>`));assert.ok(after.includes('root-placement oracle'));assert.ok(after.includes('diagnosticScore'));assert.ok(p.explanation.steps.at(-1)!.includes('元の条件'));assert.ok(p.explanation.thinking.includes('指定された位置'));assert.ok(p.model.equalityReasons.length);
 }
});
test('prototype-only history preserves narrow hypotheses and never requires X09',()=>{
 for(const p of placementProblems){assert.ok(p.problemRequirements.length);assert.ok(p.problemRequirements.every(r=>!r.crossSkills.includes('X09')));for(const c of p.choices){const r=placementAttempt(p,c.choiceId,'test');assert.deepEqual(r.mistakeHypotheses,c.mistakeHypotheses);assert.ok(r.hypothesisOnly);assert.ok(r.mistakeHypotheses.every(h=>!h.crossSkills.includes('X09')));}}
 const ui=readFileSync(new URL('../src/ui/placement-family-prototype.ts',import.meta.url),'utf8');assert.match(ui,/math-placement-family-prototype:attempts:v1/);assert.doesNotMatch(ui,/indexedDB|learning\.execute|useStudent/);
 const main=readFileSync(new URL('../src/ui/main.ts',import.meta.url),'utf8');assert.match(main,/if\(verifyEnabled&&placementFamilyOpen\)content=renderPlacementPrototype/);assert.match(main,/if\(action==='placement-family-open'\)\{if\(verifyEnabled\)/);
});
