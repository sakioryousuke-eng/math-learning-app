import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {integratedProblems} from '../src/prototype/quadratic-integrated-family.ts';
import {contains,answerText,equivalentAnswers,evaluateCases,expressionAt,extremaOracle,constrainExtrema,intersectSets,unionSets,allBoundaries,setBoundaries} from '../src/prototype/integrated-quadratic-math.ts';
import type {IntegratedAnswer,ExtremaComponent} from '../src/prototype/integrated-quadratic-math.ts';
import {evaluate,rootPlacementOracle,placementBoundaries} from '../src/prototype/quadratic-placement-family.ts';
import {countGraphState} from '../src/prototype/quadratic-count-family.ts';
import {axisValues} from '../src/prototype/quadratic-axis-family.ts';
import {accepts} from '../src/prototype/quadratic-family.ts';
import {boundaryJump} from '../src/ui/dynamic-quadratic.ts';
import {integratedDynamicSpec,renderIntegratedPrototype,renderIntegratedResult,resetIntegratedProblem,integratedAttempt} from '../src/ui/integrated-family-prototype.ts';

const expected=['最大値 5\n最小値 -4','最大値 3\n最小値 -12',null,'k=-2 または k=3','2<k<3','k=2√2、接点 (√2, 3)','0≦k≦3','-1≦k<0','3/4≦k≦1+√2','2<k<10/3','4≦k≦17/4','k=0 または k=2'];
// Independent numerical oracle: substitute into the original expression, without cases.
function directExtrema(c:ExtremaComponent,k:number){const [A,B,C]=expressionAt(c.expression,k),xs=[c.L,c.R],vertex=-B/(2*A);if(vertex>=c.L&&vertex<=c.R)xs.push(vertex);const points=xs.map(x=>({x,y:A*x*x+B*x+C}));return {min:Math.min(...points.map(p=>p.y)),max:Math.max(...points.map(p=>p.y)),points};}
function directRoots(A:number,B:number,C:number){const d=B*B-4*A*C;return d>1e-9?[(-B-Math.sqrt(d))/(2*A),(-B+Math.sqrt(d))/(2*A)].sort((a,b)=>a-b):[];}
// Literal original requirements for these composite seeds, not generated graph conditions.
function originalCondition(index:number,k:number):boolean{
 if(index===4)return Math.abs(directExtrema(integratedProblems[3].models.extrema!,k).max-1)<1e-8;
 if(index===5){const roots=directRoots(1,-k,1);return roots.length===2&&roots[0]>1e-9&&roots[0]+roots[1]<3-1e-9;}
 if(index===6)return Math.abs(k*k-8)<1e-8&&k/2>0;
 if(index===7){const roots=directRoots(1,-4,3-k);return roots.length===2&&roots[0]>=-1e-9&&roots[1]<=4+1e-9&&roots[1]-roots[0]>=2-1e-9;}
 if(index===8){const values=directExtrema(integratedProblems[7].models.extrema!,k),roots=directRoots(1,-2*k,k);return values.min>=-2-1e-8&&roots.length===2&&roots[0]<-1e-9&&roots[1]>1e-9;}
 if(index===9){const values=directExtrema(integratedProblems[8].models.extrema!,k);return values.min>=-1-1e-8&&values.max<=6+1e-8;}
 if(index===10){const roots=directRoots(1,-k-2,k+2);return roots.length===2&&roots[0]>=-1e-9&&roots[1]<4-1e-9;}
 if(index===11){const values=directExtrema(integratedProblems[10].models.extrema!,k),roots=directRoots(-1,k,-1);return values.max>=3-1e-8&&roots.length===2&&roots[0]>=-1e-9&&roots[1]<=4+1e-9;}
 if(index===12){const values=directExtrema(integratedProblems[11].models.extrema!,k);return Math.abs(values.min+1)<1e-8&&Math.abs(values.max-3)<1e-8;}
 return true;
}
test('12 integrated problems: 2/5/5 levels, distinct structures, no prescribed method',()=>{
 assert.equal(integratedProblems.length,12);assert.deepEqual(['標準','応用','実戦'].map(level=>integratedProblems.filter(p=>p.level===level).length),[2,5,5]);
 assert.ok(new Set(integratedProblems.map(p=>[...p.structureSignature].sort().join('+'))).size>=8);
 integratedProblems.forEach((p,i)=>{assert.doesNotMatch(p.prompt,/平方完成せよ|判別式を用|場合分けせよ|場合分けして/);assert.ok(p.structureSignature.length>=2);if(expected[i])assert.equal(p.explanation.answer,expected[i]);});
});
for(const p of integratedProblems){
 const cuts=allBoundaries(p.boundaries,...p.choices.map(c=>c.answer.kind==='set'?setBoundaries(c.answer.set):[])).map(b=>b.value);
 const samples=[...Array.from({length:1601},(_,i)=>(i-800)/40),...cuts.flatMap(k=>[k-1e-5,k,k+1e-5]),-100,100];
 test(`${p.id}: final answer and original-condition oracle across parameter intervals`,()=>{
  for(const k of samples){const oracle=p.oracle(k);assert.equal(oracle.satisfied,originalCondition(p.index,k),`runtime oracle ${k}`);
   if(p.answer.kind==='set')assert.equal(contains(p.answer.set,k),originalCondition(p.index,k),`answer ${k}`);
   if(p.answer.kind==='cases'){const v=evaluateCases(p.answer.cases,k),o=directExtrema(p.models.extrema!,k);assert.equal(v.min.length,1,`min coverage ${k}`);assert.equal(v.max.length,1,`max coverage ${k}`);assert.ok(Math.abs(v.min[0]-o.min)<1e-7);assert.ok(Math.abs(v.max[0]-o.max)<1e-7);}
  }
  if(p.answer.kind==='values'){const o=directExtrema(p.models.extrema!,0);assert.equal(p.answer.min,o.min);assert.equal(p.answer.max,o.max);}
  if(p.answer.kind==='tangent'){assert.equal(p.answer.points.length,1);for(const point of p.answer.points){assert.ok(originalCondition(p.index,point.k.value));assert.ok(Math.abs(point.x**2+1-point.y)<1e-8);assert.ok(Math.abs(point.k.value*point.x-1-point.y)<1e-8);assert.ok(Math.abs(2*point.x-point.k.value)<1e-8);}}
 });
 test(`${p.id}: intermediate facts and existing-family cross-checks`,()=>{
  for(const k of samples){const e=p.models.extrema;
   if(e){const q=expressionAt(e.expression,k),h=evaluate(e.axis,k),v=evaluate(e.vertical,k),o=directExtrema(e,k),old=extremaOracle(e,k);assert.ok(Math.abs(h+q[1]/(2*q[0]))<1e-8);assert.ok(Math.abs(v-evaluate(q,h))<1e-7);
    for(const x of [e.L,e.R,h,0])assert.ok(Math.abs(evaluate(q,x)-(q[0]*(x-h)**2+v))<1e-7,`completion ${k},${x}`);
    assert.ok(Math.abs(evaluate(e.left,k)-evaluate(q,e.L))<1e-7);assert.ok(Math.abs(evaluate(e.right,k)-evaluate(q,e.R))<1e-7);
    assert.equal(old.min,o.min);assert.equal(old.max,o.max);assert.equal(old.points.length,o.points.length);
    for(const key of ['min','max'] as const){const from2=axisValues(e.base.answer,key,h)[0]+v;assert.ok(Math.abs(from2-o[key])<1e-7);const lifted:number[]=evaluateCases(e.answer,k)[key];assert.equal(lifted.length,1);assert.ok(Math.abs(lifted[0]-o[key])<1e-7);}
   }
   const c=p.models.intersection;if(c){const B=evaluate(c.B,k),C=evaluate(c.C,k),D=B*B-4*c.A*C;assert.ok(Math.abs(D-evaluate(c.D,k))<1e-7);const state=countGraphState(c.parameters,k);assert.equal(state.count,Math.abs(D)<1e-8?1:D>0?2:0);for(const x of [-2,0,1,3])assert.ok(Math.abs((evaluate(c.f,x)-(evaluate(c.lineSlope,k)*x+evaluate(c.lineIntercept,k)))-(c.A*x*x+B*x+C))<1e-7);}
   const r=p.models.placement;if(r){const oracle=rootPlacementOracle(r.parameters,k);assert.equal(contains(r.answer,k),oracle.satisfied);if(c){assert.deepEqual(r.D,c.D);assert.deepEqual(r.B,c.B);assert.deepEqual(r.C,c.C);}}
   const f=p.models.horizontal;if(f)assert.equal(accepts(f.finalRange,k),contains(p.models.placement!.answer,k));
  }
 });
 test(`${p.id}: four distinct diagnostic choices and narrow hypotheses`,()=>{
  assert.equal(p.choices.length,4);assert.equal(p.choices.filter(c=>c.correct).length,1);
  assert.equal(new Set(p.choices.map(c=>c.text)).size,4);
  for(const c of p.choices)if(c.answer.kind==='values'){assert.equal(typeof c.answer.min,'number');assert.equal(typeof c.answer.max,'number');}
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.equal(equivalentAnswers(p.choices[i].answer,p.choices[j].answer),false);
  assert.deepEqual(p.choices[0].mistakeHypotheses,[]);for(const c of p.choices.slice(1)){assert.equal(c.mistakeHypotheses.length,1);assert.ok(c.mistakeHypotheses[0].hypothesisOnly);assert.ok(!c.mistakeHypotheses[0].crossSkills.includes('X09'));}
  for(const d of p.decisions){assert.ok(d.reason);assert.ok(d.selectionReason);assert.ok(d.errorModel);if(d.selected)assert.equal(equivalentAnswers(d.answer,p.answer),false);}
 });
 test(`${p.id}: trace drives explanation; no pre-submission graphs or internal method hints`,()=>{
  assert.equal(p.solutionTrace[0].kind,'InterpretPrompt');assert.equal(p.solutionTrace.at(-1)!.kind,'Conclude');assert.equal(p.solutionTrace.at(-2)!.kind,'VerifyOriginal');
  assert.deepEqual(p.explanation.steps,p.solutionTrace.filter(s=>s.kind!=='InterpretPrompt'&&s.kind!=='Conclude').map(s=>s.explanation));assert.ok(p.solutionTrace.every(s=>s.result!==undefined));
  assert.ok(p.problemRequirements.some(r=>r.crossSkills.includes('X11')));assert.ok(p.problemRequirements.every(r=>!r.crossSkills.includes('X09')));
  resetIntegratedProblem(p.id);const before=renderIntegratedPrototype();assert.doesNotMatch(before,/data-dynamic|solution trace|structure signature|<h2>答え/);
  const after=renderIntegratedResult(p,p.choices[0].choiceId);for(const heading of ['考え方','解き方','グラフで確かめる','答え'])assert.ok(after.includes(`<h2>${heading}</h2>`));assert.match(after,/solution trace/);assert.match(after,/独立oracle/);
  assert.doesNotMatch(p.explanation.steps.join(''),/選択肢[ABCD]|[ABCD]を選/);
 });
}
test('numeric set composition preserves irrational labels and exact boundary equalities',()=>{
 const p=integratedProblems[8],s=integratedDynamicSpec(p),i=s.boundaries.findIndex(b=>Math.abs(b.value-(1+Math.SQRT2))<1e-9),jump=boundaryJump(s,i);
 assert.equal(jump.value,1+Math.SQRT2);assert.equal(jump.label,'1+√2');assert.ok(p.oracle(jump.value).satisfied);assert.equal(p.oracle(jump.value+1e-5).satisfied,false);
 const tangent=integratedProblems[5],ts=integratedDynamicSpec(tangent),j=ts.boundaries.findIndex(b=>b.label==='2√2');assert.ok(tangent.oracle(boundaryJump(ts,j).value).satisfied);
});
test('new set adapters retain shared-boundary inclusion without overlap',()=>{
 const a={lo:{value:0,label:'0'},hi:{value:1,label:'1'},loClosed:true,hiClosed:false},b={lo:{value:1,label:'1'},hi:{value:2,label:'2'},loClosed:true,hiClosed:true};
 const u=unionSets([[a],[b]]);assert.equal(u.length,1);assert.ok(contains(u,1));assert.deepEqual(intersectSets([[a],[b]]),[]);
 assert.equal(intersectSets([[{...a,hiClosed:true}],[b]]).length,1);
});
test('graphs are purposeful, submitted-only, and exact boundary jumps stay internal',()=>{
 assert.equal(integratedProblems.filter(p=>p.graphs(p.initial).length===0).length,1);
 for(const p of integratedProblems){if(!p.dynamic||!p.graphs(p.initial).length)continue;const s=integratedDynamicSpec(p);s.boundaries.forEach((b,i)=>{const jump=boundaryJump(s,i);assert.equal(jump.value,b.value);assert.equal(jump.label,b.label);assert.ok(s.graph(jump.value).curves.length);});}
});
test('only prototype history is written and verification flag gates entry',()=>{
 for(const p of integratedProblems)for(const c of p.choices){const a=integratedAttempt(p,c.choiceId,'test');assert.deepEqual(a.mistakeHypotheses,c.mistakeHypotheses);assert.ok(a.hypothesisOnly);}
 const ui=readFileSync(new URL('../src/ui/integrated-family-prototype.ts',import.meta.url),'utf8');assert.match(ui,/math-integrated-family-prototype:attempts:v1/);assert.doesNotMatch(ui,/indexedDB|learning\.execute|useStudent/);
 const main=readFileSync(new URL('../src/ui/main.ts',import.meta.url),'utf8');assert.match(main,/if\(verifyEnabled&&integratedFamilyOpen\)content=renderIntegratedPrototype/);assert.match(main,/if\(action==='integrated-family-open'\)\{if\(verifyEnabled\)/);
});
