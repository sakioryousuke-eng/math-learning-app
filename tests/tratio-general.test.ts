import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {generalVariants,generalScales,generateGeneralVariant,validateGeneral,generalOracle,inspectTriangle,enumerateSSA,solveSSA,sameGeneralAnswer} from '../src/prototype/tratio-general.ts';
import type {GeneralAnswer,GeneralVariant} from '../src/prototype/tratio-general.ts';
import {generalFigures,generalSubmission,shuffleGeneral,generalResult,renderGeneralPrototype,generalStorageKey} from '../src/prototype/tratio-general-view.ts';
import {rightVariants} from '../src/prototype/tratio-right.ts';
import {tratioLessons,tratioSkills,tratioSteps} from '../src/tratio/lessons.ts';
import {tratioCurriculum} from '../src/tratio/catalog.ts';
import {bankCurriculum} from '../src/bank/catalog.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const sn=(a:number)=>Math.sin(a*Math.PI/180),cs=(a:number)=>Math.cos(a*Math.PI/180);
// Separate parser for printed exact numbers, not answer/solution string equality.
function number(s:string){s=s.replaceAll('−','-');assert.match(s,/^[0-9√.\/+\-]+$/);return (s.match(/[+-]?[^+-]+/g)??[]).reduce((sum,term)=>{const sign=term.startsWith('-')?-1:1,[top,den='1']=term.replace(/^[+-]/,'').split('/'),[n,r]=top.split('√');return sum+sign*(r===undefined?Number(n):Number(n||1)*Math.sqrt(Number(r)))/Number(den);},0);}
function printed(v:GeneralVariant,a:GeneralAnswer):GeneralAnswer {
  if(v.scene.target==='A'||v.scene.target==='ssa')return {values:[...a.label.matchAll(/([0-9.]+)°/g)].map(m=>Number(m[1])),label:'',...(v.scene.target==='ssa'?{count:Number(a.label.match(/([0-9]+)個/)![1])}:{unordered:true as const})};
  return {values:[...a.label.matchAll(/(?:cosA|[abRS])=([0-9√.\/+−\-]+)/g)].map(m=>number(m[1])),label:''};
}
test('general: 12 variants / 3-5-4 / 10 genuine structures, SSA outcomes share one signature',()=>{
  assert.equal(generalVariants.length,12);assert.equal(new Set(generalVariants.map(v=>v.structureSignature)).size,10);
  assert.deepEqual(['STANDARD','APPLIED','PRACTICAL'].map(d=>generalVariants.filter(v=>v.difficulty===d).length),[3,5,4]);
  assert.equal(new Set(generalVariants.slice(9).map(v=>v.structureSignature)).size,1);
});
for(let i=0;i<12;i++)test(`general ${i+1}: all 4 parameter samples, printed exact values, independent geometry and choices`,()=>{
  for(const s of generalScales){const v=generateGeneralVariant(i,s);assert.equal(validateGeneral(v).matched,true);
    assert.ok(sameGeneralAnswer(printed(v,v.answer),generalOracle(v.scene)),v.answer.label);
    for(const c of v.choices){assert.ok(sameGeneralAnswer(printed(v,c.answer),c.answer),c.answer.label);assert.equal(c.correct,c.mistakeHypotheses===null);}
    for(const c of v.candidates){assert.ok(sameGeneralAnswer(printed(v,c.answer),c.answer),c.answer.label);assert.ok(c.model&&c.reason);assert.equal(c.mistakeHypotheses.crossSkills.length,1);assert.equal(c.selected,c.exclusionReason===null);}
    for(const x of Object.values(v.scene.knownValues))near(number(x.label),x.value);
    assert.equal(v.choices.length,4);assert.equal(v.choices.filter(c=>c.correct).length,1);
    for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)assert.equal(sameGeneralAnswer(v.choices[a].answer,v.choices[b].answer),false);
    assert.doesNotMatch(v.prompt,/正弦定理|余弦定理|面積公式|sinを|cosを/);
    assert.doesNotMatch(v.thinking,/^(正弦定理|余弦定理|面積公式)/);
    for(const t of v.scene.coordinates){const g=inspectTriangle(t);near(g.A+g.B+g.C,180);assert.ok(g.a+g.b>g.c&&g.b+g.c>g.a&&g.c+g.a>g.b);
      near(g.a/sn(g.A),g.b/sn(g.B));near(g.a/sn(g.A),2*g.R);
      near(g.a*g.a,g.b*g.b+g.c*g.c-2*g.b*g.c*cs(g.A));near(g.area,.5*g.b*g.c*sn(g.A));
    }
  }
});
test('SSA geometric enumeration crosses height and endpoint boundaries independently (126 cases)',()=>{
  let checked=0;
  for(const A of [30,45,60,90,120,150])for(const b of [1,2,5]){
    const h=b*sn(A);
    for(const a of [h*(1-1e-6),h,h*(1+1e-6),b*(1-1e-6),b,b*(1+1e-6),2*b]){
      const coords=enumerateSSA(A,a,b),angles=solveSSA(A,a,b);
      assert.equal(coords.length,angles.length,`${A} ${a} ${b}`);
      const oracleAngles=coords.map(t=>inspectTriangle(t).B).sort((a,b)=>a-b);
      oracleAngles.forEach((x,i)=>near(x,angles[i]));
      for(const t of coords){const g=inspectTriangle(t);near(g.A,A);near(g.a,a);near(g.b,b);assert.ok(g.A+g.B<180);assert.ok(t.B[0]>0);}
      checked++;
    }
  }
  assert.equal(checked,126);
  assert.equal(enumerateSSA(30,1,2).length,1); // tangent, counted once
  assert.equal(enumerateSSA(30,2,2).length,1); // second root at A, degenerate
  assert.equal(enumerateSSA(120,2,2).length,0); // only endpoint A
  assert.equal(enumerateSSA(90,2,2).length,0); // tangent at A is not a triangle
});
test('0 / 1 / 2 SSA solutions, supplementary candidates, positive remaining angle',()=>{
  assert.deepEqual(generalVariants.slice(9).map(v=>v.answer.count),[0,1,2]);
  const one=generalVariants[10],two=generalVariants[11];assert.ok(sameGeneralAnswer(one.answer,{values:[30],count:1,label:''}));assert.ok(sameGeneralAnswer(two.answer,{values:[45,135],count:2,label:''}));
  assert.match(one.working.join(''),/150°.*内角和/);assert.match(two.working.join(''),/105°.*15°/);
  for(const A of [0,180,-1,NaN])assert.equal(enumerateSSA(A,2,2).length,0);
  assert.throws(()=>inspectTriangle({A:[0,0],B:[1,0],C:[2,0]}),/退化/);
});
test('oracle does not use sine law, cosine-law rearrangement or circumradius formula',()=>{
  const source=readFileSync(new URL('../src/prototype/tratio-general.ts',import.meta.url),'utf8');
  const geometry=source.split('export function inspectTriangle')[1].split('export function enumerateSSA')[0];
  assert.doesNotMatch(geometry,/\bsin\(|\bcos\(|4\*area|\.answer|solutionRoute/);
  const ssa=source.split('export function enumerateSSA')[1].split('export function solveSSA')[0];assert.doesNotMatch(ssa,/asin|solveSSA|sinB/);
  const v=structuredClone(generalVariants[0]);v.scene.solutionRoute=[];v.working=[];assert.ok(sameGeneralAnswer(generalOracle(v.scene),v.answer));v.scene.coordinates[0].C[1]++;assert.throws(()=>validateGeneral(v),/oracle/);
});
test('R is obtained by perpendicular bisectors in oracle; R/2R misconception; Pythagoras special case',()=>{
  const v=generalVariants[3],t=v.scene.coordinates[0],g=inspectTriangle(t);
  for(const p of Object.values(t))near(Math.hypot(p[0]-g.center[0],p[1]-g.center[1]),g.R);
  assert.ok(v.candidates.some(c=>c.mistakeHypotheses.type==='circumradius_factor'&&Math.abs(c.answer.values[0]-2*g.R)<1e-8));
  const right=inspectTriangle({A:[0,0],B:[4,0],C:[0,3]});near(right.A,90);near(right.a**2,right.b**2+right.c**2);
  assert.match(generalVariants[1].working.join(''),/90°.*cosA=0.*三平方/);
});
test('non-special SSS angle, obtuse height, area inversion and both area angles',()=>{
  near(generalVariants[2].answer.values[0],7/25);assert.match(generalVariants[2].answer.label,/鋭角/);
  assert.ok(generalVariants[4].scene.coordinates[0].C[0]<0);assert.match(generalVariants[4].working.join(''),/高さ|h=/);
  assert.match(generalVariants[5].working.join(''),/h=2S\/c/);
  assert.ok(sameGeneralAnswer(generalVariants[8].answer,{values:[120,60],unordered:true,label:''}));
  assert.equal(sameGeneralAnswer({values:[2,3],label:''},{values:[3,2],label:''}),false);
});
test('conceptual error formulas are fully evaluated, not random numerical offsets',()=>{
  for(const i of [1,6]){const v=generalVariants[i],s=v.scale;
    near(v.candidates.find(c=>c.mistakeHypotheses.type==='cosine_correction_sign')!.answer.values[0],Math.sqrt(37)*s);
    near(v.candidates.find(c=>c.mistakeHypotheses.type==='cosine_correction_factor')!.answer.values[0],Math.sqrt(19)*s);
    near(v.candidates.find(c=>c.mistakeHypotheses.type==='pythagoras_scope')!.answer.values[0],5*s);
  }
  const area=generalVariants[4];near(area.candidates[0].answer.values[0],2*area.answer.values[0]);near(area.candidates[1].answer.values[0],-6*area.scale**2);
  assert.ok(generalVariants[6].candidates.some(c=>!c.selected&&c.exclusionReason));
});
test('problem figures hide constructions and SSA count; results display every candidate triangle',()=>{
  for(const v of generalVariants){const before=generalFigures(v),after=generalFigures(v,true);assert.match(before,/<svg/);assert.doesNotMatch(before,/data-general-auxiliary/);
    if(v.scene.altitudes||v.scene.circumcircle||v.scene.ssa)assert.match(after,/data-general-auxiliary/);
    if(v.scene.ssa){assert.ok(!before.includes('B1'));assert.equal((after.match(/<svg/g)??[]).length,1+v.answer.count!);assert.match(before,/位置はまだ決めていません/);}
    if(v.scene.target==='A')assert.equal((after.match(/<svg/g)??[]).length,2);
  }
});
test('narrow requirements; SSA-specific X03/X04/X06/X07/X13; no mandatory X09 for helper diagrams',()=>{
  for(const v of generalVariants.slice(10)){const skills=new Set(v.problemRequirements.flatMap(r=>r.crossSkills));for(const id of ['X03','X04','X06','X07','X13'])assert.ok(skills.has(id));}
  assert.ok(!generalVariants[9].problemRequirements.some(r=>r.crossSkills.includes('X06')||r.crossSkills.includes('X07')));
  assert.ok(!generalVariants[0].problemRequirements.some(r=>r.crossSkills.includes('X06')));
  assert.ok(!generalVariants.some(v=>v.problemRequirements.some(r=>r.crossSkills.includes('X09'))));
});
test('shuffle and choiceId grading; verify-only hypothesis saved with family and shared structure',()=>{
  for(const v of generalVariants){const shuffled=shuffleGeneral(v,()=>0);assert.notDeepEqual(shuffled.map(c=>c.choiceId),v.choices.map(c=>c.choiceId));
    for(const c of shuffled){const e=generalSubmission(v,c.choiceId);assert.equal(e.correct,c.correct);assert.deepEqual(e.mistakeHypotheses,c.mistakeHypotheses);assert.equal(e.independent,false);assert.equal(e.context,'verify-only');assert.equal(e.independenceGroup,`${v.familyId}/${v.structureSignature}`);}
    assert.throws(()=>generalSubmission(v,'A'));
  }
  assert.match(generalStorageKey,/verify.*tratio-general/);
  assert.doesNotMatch(renderGeneralPrototype(),/diagnosticScore|独立oracle|必要能力/);
  const v=generalVariants[11],html=generalResult(v,v.choices[0].choiceId);for(const text of ['考え方','解き方','図で確かめる','答え','候補三角形一覧','diagnosticScore'])assert.ok(html.includes(text));
});
test('existing family1, reviewed, QFN and TRIG gate unchanged; new family absent from ordinary catalog',()=>{
  const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
  assert.equal(hash(rightVariants),'361399178e460f435d8f02cb6a9ab4391eca949f809faf6a6fb95e22dc65e710');
  assert.equal(hash([tratioLessons,tratioSkills,tratioSteps]),'925e95fb5c51c6e0a9765a0a7a711aacbb6b5319021e791693454e77a376ff94');
  assert.equal(hash(bankCurriculum),'e9da9a3b33b9ebcd775c57fa4c4b375090c5d8b7a5027d7f77c8e3585497e3a8');
  assert.ok(!tratioCurriculum.problems.some(p=>p.id.startsWith('TR-GENERAL-MEASURE')));
  assert.deepEqual(tratioCurriculum.master.units.find(u=>u.id==='TRIG'),bankCurriculum.master.units.find(u=>u.id==='TRIG'));
});
