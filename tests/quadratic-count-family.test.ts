import test from 'node:test';import assert from 'node:assert/strict';
import {countProblems,countModel,countGraphState,generateCountProblem,evalCountPolynomial,inCountRange,equivalentCountAnswers,classifyDiscriminant} from '../src/prototype/quadratic-count-family.ts';
import {countDynamicSpec,renderCountPrototype,renderCountResult,countAttempt,resetCountProblem} from '../src/ui/count-family-prototype.ts';
import {paperCurriculum} from '../src/grading/paper-choices.ts';import {readFileSync} from 'node:fs';
for(const p of countProblems)test(`count family ${p.index}: equations, discriminant, parameter sets, intersections and paired graphs`,()=>{
 const m=p.model,z=m.parameters,samples=new Set<number>();for(let k=-12;k<=12;k+=.25)samples.add(k);for(const b of m.boundaries)for(const d of [-.1,0,.1])samples.add(b.value+d);
 for(const k of samples){
  const slope=z.kind==='intercept'?z.slope:k,intercept=z.kind==='intercept'?z.intercept+k:z.kind==='pivot'?z.intercept-z.pivotX*k:z.intercept;
  const A=z.A,B=z.p-slope,C=z.q-intercept,D=B*B-4*A*C;
  assert.equal(m.A,A);assert.ok(Math.abs(evalCountPolynomial(m.B,k)-B)<1e-9);assert.ok(Math.abs(evalCountPolynomial(m.C,k)-C)<1e-9);assert.ok(Math.abs(evalCountPolynomial(m.D,k)-D)<1e-8);
  for(const x of [-2,0,1,3])assert.ok(Math.abs((z.A*x*x+z.p*x+z.q)-(slope*x+intercept)-(A*x*x+B*x+C))<1e-8);
  // Independent geometric check: minimum/maximum of the vertical difference.
  const vertexX=-B/(2*A),gap=(z.A*vertexX*vertexX+z.p*vertexX+z.q)-(slope*vertexX+intercept);
  const expected=Math.abs(gap)<1e-8?1:A*gap<0?2:0;
  const matches=([0,1,2] as const).filter(count=>m.classification[count].some(r=>inCountRange(r,k)));
  assert.deepEqual(matches,[expected],`k=${k}`);
  for(const count of [0,1,2] as const)if(m.answer[count])assert.equal(m.answer[count]!.some(r=>inCountRange(r,k)),expected===count);
  const state=countGraphState(z,k);assert.equal(state.count,expected);assert.deepEqual(state.q,[A,B,C]);assert.deepEqual(state.original.curves[0].coefficients,[z.A,z.p,z.q]);assert.deepEqual(state.original.curves[1].coefficients,[0,slope,intercept]);assert.deepEqual(state.difference.curves[0].coefficients,[A,B,C]);assert.deepEqual(state.difference.curves[1].coefficients,[0,0,0]);
  assert.equal(state.roots.length,expected);
  const actualRoots=expected===0?[]:expected===1?[-B/(2*A)]:[(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)];
  for(const x of actualRoots)assert.ok(Math.abs(z.A*x*x+z.p*x+z.q-(slope*x+intercept))<1e-7);
  if(expected===1){assert.ok(Math.abs(2*A*actualRoots[0]+B)<1e-9);}
 }
 assert.equal(p.choices.length,4);assert.equal(p.choices.filter(c=>c.correct).length,1);assert.equal(new Set(p.choices.map(c=>c.text)).size,4);
 for(let i=0;i<4;i++){const c=p.choices[i];assert.equal(equivalentCountAnswers(c.answer,m.answer),c.correct);for(let j=i+1;j<4;j++)assert.ok(!equivalentCountAnswers(c.answer,p.choices[j].answer));const record=countAttempt(p,c.choiceId,'2026-09-08');assert.equal(record.hypothesisOnly,true);assert.equal(record.mistakeHypotheses.length,c.correct?0:1);assert.ok(!JSON.stringify(record).includes('X09'));}
 assert.equal(p.decisions.filter(d=>d.selected).length,3);assert.ok(p.decisions.every(d=>d.reason&&d.selectionReason));
 for(const index of [1,2,39]){const other=generateCountProblem(z,index);assert.deepEqual(other.decisions.map(d=>[d.type,d.diagnosticScore,d.selected,d.choice.text]),p.decisions.map(d=>[d.type,d.diagnosticScore,d.selected,d.choice.text]));}
 const spec=countDynamicSpec(p);for(const b of m.boundaries){assert.equal(spec.region(b.value)%2,1);assert.ok(spec.reason(b.value).includes('1個'));assert.deepEqual(spec.graph(b.value),countGraphState(z,b.value).original);assert.deepEqual(spec.comparisonGraph!(b.value),countGraphState(z,b.value).difference);}
 const html=renderCountResult(p,p.choices[0].choiceId);assert.ok(html.includes('type="range"'));assert.ok(html.includes('元の放物線と直線'));assert.ok(html.includes('差のグラフ'));assert.ok(!html.includes('NaN'));
 assert.ok(!p.prompt.includes('判別式'));assert.ok(!p.explanation.thinking.includes('判別式'));assert.ok(p.explanation.steps[0].includes('f(x)=g(x)'));assert.ok(p.explanation.steps[1].includes('f(x)−g(x)=0'));assert.ok(p.explanation.steps[2].includes('判別式'));
 assert.ok(!paperCurriculum.problems.some(q=>q.id===p.id));
});
test('count family: diversity, safe boundaries and intended classification scope',()=>{
 assert.equal(countProblems.length,12);assert.equal(new Set(countProblems.map(p=>p.prompt)).size,12);
 assert.deepEqual(['標準','応用','高め'].map(l=>countProblems.filter(p=>p.model.parameters.level===l).length),[3,5,4]);
 assert.equal(new Set(countProblems.map(p=>p.model.parameters.kind)).size,3);assert.deepEqual([...new Set(countProblems.map(p=>p.model.D[0]===0?1:2))].sort(),[1,2]);assert.deepEqual([...new Set(countProblems.map(p=>p.model.boundaries.length))].sort(),[1,2]);
 for(const p of countProblems){assert.ok(p.model.boundaries.every(b=>Number.isFinite(b.value)));if(p.model.parameters.kind==='intercept')assert.notEqual(p.model.parameters.slope,0);if(p.model.parameters.target==='all')assert.ok(p.problemRequirements.some(r=>r.crossSkills.includes('X06')));else if(p.model.parameters.target===1)assert.ok(!p.problemRequirements.some(r=>r.crossSkills.includes('X06')));}
});
test('count family: wrong models are computed through to final conditions and equivalent errors excluded',()=>{
 let duplicates=0;
 for(const p of countProblems){
  for(const d of p.decisions){const e=d.errorModel;for(const k of [-2,0,3]){const B=evalCountPolynomial(e.B,k),C=evalCountPolynomial(e.C,k),expected=B*B+(d.type==='discriminant_calculation_sign'?4:-4)*e.A*C;assert.ok(Math.abs(evalCountPolynomial(e.D,k)-expected)<1e-8);}
   const all=classifyDiscriminant(e.D,e.mapping);assert.deepEqual(d.choice.answer,p.model.parameters.target==='all'?all:{[p.model.parameters.target]:all[p.model.parameters.target]});
   const matching=p.decisions.find(other=>other.selected&&other.type!==d.type&&equivalentCountAnswers(other.choice.answer,d.choice.answer));if(matching){duplicates++;assert.ok(!d.selected);assert.ok(d.selectionReason.includes('同値'));}
  }
 }assert.ok(duplicates>0);
});
test('count family: double parameter root does not force a sign change',()=>{
 const p=countProblems[9];assert.equal(p.model.boundaries.length,1);const b=p.model.boundaries[0].value;assert.equal(countGraphState(p.model.parameters,b).count,1);assert.equal(countGraphState(p.model.parameters,b-1).count,2);assert.equal(countGraphState(p.model.parameters,b+1).count,2);assert.deepEqual(p.model.classification[0],[]);
});
test('count family: pre-submission isolation and dedicated verification entry/history',()=>{
 resetCountProblem(countProblems[0].id);const html=renderCountPrototype();assert.ok(!html.includes('<svg'));assert.ok(!html.includes('type="range"'));assert.ok(!html.includes('name="count-choice"'));assert.ok(!html.includes('<h2>答え'));
 const ui=readFileSync(new URL('../src/ui/count-family-prototype.ts',import.meta.url),'utf8');assert.ok(ui.includes('math-count-family-prototype:attempts:v1'));assert.ok(!/indexedDB|application.execute/.test(ui));
 const main=readFileSync(new URL('../src/ui/main.ts',import.meta.url),'utf8');assert.ok(main.includes('if(verifyEnabled&&countFamilyOpen)content=renderCountPrototype()'));assert.ok(main.includes('target.dataset.countAction!==undefined'));
 assert.throws(()=>countModel({...countProblems[0].model.parameters,q:Infinity}));
});
