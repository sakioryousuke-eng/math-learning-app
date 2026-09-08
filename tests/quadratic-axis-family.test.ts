import test from 'node:test';
import assert from 'node:assert/strict';
import {axisProblems,generateAxisProblem,axisModel,axisState,axisValues,includesAxis,evaluatePolynomial,equivalentAxisAnswers,axisGraph} from '../src/prototype/quadratic-axis-family.ts';
import {axisDynamicSpec,renderAxisPrototype,renderAxisResult,axisAttempt,resetAxisProblem} from '../src/ui/axis-family-prototype.ts';
import {paperCurriculum} from '../src/grading/paper-choices.ts';
import {readFileSync} from 'node:fs';
for(const p of axisProblems)test(`axis family ${p.index}: all cases, boundaries, extrema, choices and dynamic graph`,()=>{
 const m=p.model,{L,R,c,sign}=m.parameters;
 const cuts=[L,m.midpoint,R],samples=new Set<number>();
 for(const cut of cuts)for(const d of [-.5,-.01,0,.01,.5])samples.add(cut+d);
 for(let a=L-4;a<=R+4;a+=.125)samples.add(a);
 for(const a of samples){
  const xs=[L,R,...(a>=L&&a<=R?[a]:[])];
  const values=xs.map(x=>sign*(x-a)**2+c);
  const state=axisState(m.parameters,a);assert.equal(state.vertexInside,a>=L&&a<=R);assert.deepEqual(state.minCandidates.map(q=>q.value),values);assert.deepEqual(state.maxCandidates.map(q=>q.value),values);
  for(const key of ['min','max'] as const){
   const expected=key==='min'?Math.min(...values):Math.max(...values);
   const rows=m[key].filter(r=>includesAxis(r,a));assert.equal(rows.length,1,`${key}, a=${a}: no gap/overlap`);
   assert.ok(Math.abs(evaluatePolynomial(rows[0].polynomial,a)-expected)<1e-8);
   const point=rows[0].point;const selected=point==='vertex'?[a]:point==='left'?[L]:point==='right'?[R]:[L,R];
   assert.ok(selected.every(x=>x>=L&&x<=R));assert.ok(selected.every(x=>Math.abs(sign*(x-a)**2+c-expected)<1e-8));
   if(m.answer[key]){const actual=axisValues(m.answer,key,a);assert.equal(actual.length,1);assert.ok(Math.abs(actual[0]-expected)<1e-8);}
  }
  const graph=axisGraph(m.parameters,a);assert.deepEqual(graph.domain,[L,R]);assert.deepEqual(graph.curves[0].coefficients,[sign,-2*sign*a,sign*a*a+c]);
 }
 // Neighboring cases must meet at each transition without a jump in the value.
 for(const key of ['min','max'] as const){const rows=m[key];for(let i=0;i<rows.length-1;i++){const b=rows[i].hi!;assert.equal(b,rows[i+1].lo);assert.ok(Math.abs(evaluatePolynomial(rows[i].polynomial,b)-evaluatePolynomial(rows[i+1].polynomial,b))<1e-9);}}
 assert.equal(p.choices.length,4);assert.equal(p.choices.filter(c=>c.correct).length,1);assert.equal(new Set(p.choices.map(c=>c.text)).size,4);
 for(let i=0;i<4;i++){assert.equal(equivalentAxisAnswers(p.choices[i].answer,m.answer),p.choices[i].correct);for(let j=i+1;j<4;j++)assert.ok(!equivalentAxisAnswers(p.choices[i].answer,p.choices[j].answer));}
 for(const choice of p.choices){const rec=axisAttempt(p,choice.choiceId,'2026-09-08');assert.equal(rec.hypothesisOnly,true);assert.deepEqual(rec.mistakeHypotheses,choice.mistakeHypotheses);assert.equal(choice.mistakeHypotheses.length,choice.correct?0:1);}
 assert.equal(p.decisions.filter(c=>c.selected).length,3);assert.ok(p.decisions.every(c=>c.reason&&c.selectionReason));
 for(const index of [1,2,27,100]){const other=generateAxisProblem(m.parameters,index);assert.deepEqual(other.decisions.map(c=>[c.type,c.diagnosticScore,c.selected,c.choice.text]),p.decisions.map(c=>[c.type,c.diagnosticScore,c.selected,c.choice.text]));}
 const spec=axisDynamicSpec(p);assert.deepEqual(spec.boundaries,m.boundaries);
 for(const b of m.boundaries){assert.equal(spec.region(b)%2,1);assert.notEqual(spec.region(b-.01),spec.region(b+.01));assert.deepEqual(spec.graph(b).curves,axisGraph(m.parameters,b).curves);}
 const result=renderAxisResult(p,p.choices[0].choiceId);assert.ok(result.includes('type="range"'));assert.ok(result.includes('parameter-line'));assert.ok(result.includes('diagnosticScore'));assert.ok(!result.includes('NaN'));
 assert.ok(p.problemRequirements.some(r=>r.crossSkills.includes('X06')));assert.ok(!paperCurriculum.problems.some(q=>q.id===p.id));
});
test('axis family: twelve unique problems with six mathematical forms and three difficulty groups',()=>{
 assert.equal(axisProblems.length,12);assert.equal(new Set(axisProblems.map(p=>p.prompt)).size,12);
 assert.equal(new Set(axisProblems.map(p=>`${p.model.parameters.sign}:${p.model.parameters.target}`)).size,6);
 assert.deepEqual(['標準','応用','高め'].map(l=>axisProblems.filter(p=>p.model.parameters.level===l).length),[3,5,4]);
 assert.equal(axisProblems.filter(p=>p.model.boundaries.length===3).length,4);
});
test('axis family: semantic equality recognizes alternate equality assignment and catches missing boundaries',()=>{
 const p=axisProblems[0],rows=p.model.min.map(r=>({...r}));
 rows[0].hiClosed=true;rows[1].loClosed=false;
 assert.ok(equivalentAxisAnswers({min:rows},p.model.answer));
 rows[0].hiClosed=false;assert.ok(!equivalentAxisAnswers({min:rows},p.model.answer));
});
test('axis family: no graph or answers before paper submission, separate verify entry and history',()=>{
 resetAxisProblem(axisProblems[0].id);const html=renderAxisPrototype();assert.ok(!html.includes('<svg'));assert.ok(!html.includes('type="range"'));assert.ok(!html.includes('axis-choice'));assert.ok(!html.includes('<h2>答え'));
 const ui=readFileSync(new URL('../src/ui/axis-family-prototype.ts',import.meta.url),'utf8');assert.ok(ui.includes('math-axis-family-prototype:attempts:v1'));assert.ok(!ui.includes('application.execute'));assert.ok(!ui.includes('indexedDB'));
 const main=readFileSync(new URL('../src/ui/main.ts',import.meta.url),'utf8');assert.ok(main.includes('if(verifyEnabled&&axisFamilyOpen)content=renderAxisPrototype()'));assert.ok(main.includes('target.dataset.axisAction!==undefined'));
});
test('axis family: rejects unsafe numeric ranges',()=>{
 for(const patch of [{L:0,R:0},{L:0,R:1},{c:NaN},{L:.123},{R:20}])assert.throws(()=>axisModel({...axisProblems[0].model.parameters,...patch}));
});
