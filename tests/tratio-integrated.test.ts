import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {integratedTratioVariants as variants,integratedScales,generateIntegratedTratio,runIntegratedRoute,integratedOracle,validateIntegrated,originalIntegratedPredicate,areaCandidateCoordinates,type IntegratedTratioProblem} from '../src/prototype/tratio-integrated.ts';
import {integratedTratioFigure,integratedTratioSubmission,integratedTratioResult,shuffleIntegratedTratio,integratedTratioStorageKey} from '../src/prototype/tratio-integrated-view.ts';
import {inspectTriangle,enumerateSSA,generalVariants,generateGeneralVariant,validateGeneral} from '../src/prototype/tratio-general.ts';
import {rightVariants,generateRightVariant,validateRightVariant} from '../src/prototype/tratio-right.ts';
import {tratioLessons,tratioSkills,tratioSteps} from '../src/tratio/lessons.ts';
import {bankCurriculum} from '../src/bank/catalog.ts';
const near=(a:number,b:number,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const sn=(a:number)=>Math.sin(a*Math.PI/180),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
// A separate arithmetic parser verifies printed radicals, not model labels.
function printed(label:string):number{
  if(label.startsWith('約'))return Number(label.slice(1));
  const ts=label.match(/√|[0-9]+(?:\.[0-9]+)?|[()+/×−-]/g)??[];let i=0;
  const atom=():number=>{const token=ts[i++];if(token==='√')return Math.sqrt(atom());if(token==='('){const x=sum();assert.equal(ts[i++],')');return x;}if(token==='−'||token==='-')return -atom();assert.match(token,/^\d/);return Number(token);};
  const product=():number=>{let x=atom();while(i<ts.length&&ts[i]!==')'&&!['+','−','-'].includes(ts[i])){if(ts[i]==='/'){i++;x/=atom();}else{if(ts[i]==='×')i++;x*=atom();}}return x;};
  const sum=():number=>{let x=product();while(['+','−','-'].includes(ts[i])){const operation=ts[i++];x+=(operation==='+'?1:-1)*product();}return x;};
  const x=sum();assert.equal(i,ts.length);return x;
}
function metric(v:IntegratedTratioProblem,names:string){const p=v.scene.points;return inspectTriangle({A:p[names[0]],B:p[names[1]],C:p[names[2]]});}
function length(v:IntegratedTratioProblem,pair:string){const p=v.scene.points;return Math.hypot(p[pair[0]][0]-p[pair[1]][0],p[pair[0]][1]-p[pair[1]][1]);}

test('integrated: 12 genuine signatures, 2/5/5, method-free prompts and titles',()=>{
  assert.equal(variants.length,12);assert.equal(new Set(variants.map(v=>v.structureSignature)).size,12);
  assert.deepEqual(['STANDARD','APPLIED','PRACTICAL'].map(d=>variants.filter(v=>v.difficulty===d).length),[2,5,5]);
  for(const [i,v] of variants.entries()){
    assert.equal(v.variantId,`TR-INTEGRATED-JUDGMENT-v${String(i+1).padStart(2,'0')}`);
    assert.doesNotMatch(v.title,/正弦|余弦|三平方|sin|cos|tan|公式/);
    assert.doesNotMatch(v.prompt,/を使[えい]|を用い|高さを引|垂線を引|まず|次に|正弦定理|余弦定理|三平方/);
    assert.ok(v.selectedMathematicalRoute.length>=2);
  }
});
for(let i=0;i<12;i++)test(`integrated v${i+1}: four scales / givens / all intermediate quantities / final oracle / printed answers / choices`,()=>{
  for(const s of integratedScales){
    const v=generateIntegratedTratio(i,s),audit=validateIntegrated(v);assert.ok(audit.pass,JSON.stringify(audit));
    const values=runIntegratedRoute(v.selectedMathematicalRoute);
    for(const [id,value] of Object.entries(values)){
      if(/^[A-Z]{2}$/.test(id))near(value,length(v,id));
      else if(id==='height')near(value,length(v,i===2?'AH':i===8?'CF':'CH'));
      else if(id==='offset')near(value,length(v,'BF'));
      else if(id==='Cangle')near(value,metric(v,'ABC').C);
      else if(id==='angleA')near(value,metric(v,'ABC').A);
      else if(id==='sinA')near(value,sn(metric(v,'ABC').A));
      else if(id==='sinB')near(value,sn(metric(v,'ABC').B));
      else if(id==='sinC')near(value,sn(metric(v,'BCD').B));
      else if(id==='sinD')near(value,sn(metric(v,'BDE').B));
      else if(id==='S1')near(value,metric(v,'ABC').area);
      else if(id==='S2')near(value,metric(v,'ACD').area);
      else near(value,audit.oracle);
    }
    for(const c of v.choices){near(printed(c.answer.label),c.answer.value,2e-6);assert.equal(originalIntegratedPredicate(v,c.answer.value),c.correct);}
    for(const k of v.scene.knownLengths){near(printed(k.label),k.value,2e-6);near(k.value,length(v,k.ends.join('')));}
    for(const a of v.scene.angles)near(a.degrees,metric(v,`${a.points[1]}${a.points[0]}${a.points[2]}`).A);
    for(const a of v.scene.rightAngles)near(metric(v,`${a.points[1]}${a.points[0]}${a.points[2]}`).A,90);
    assert.equal(v.choices.length,4);assert.equal(v.choices.filter(c=>c.correct).length,1);
    assert.equal(new Set(v.choices.map(c=>c.choiceId)).size,4);assert.equal(v.choices.filter(c=>c.mistakeHypotheses===null).length,1);
  }
});
test('integrated: coverage of shared sides, circle, area, similarity, perpendiculars, two distinct candidate structures',()=>{
  const req=new Set(variants.flatMap(v=>v.problemRequirements.map(r=>r.id)));
  for(const id of ['shared_side_transfer','auxiliary_line','sine_relation','cosine_relation','area_height_conversion','circumradius_relation','similarity_correspondence','pythagoras_scope','multiple_solution','method_selection','verify_original'])assert.ok(req.has(id as typeof variants[0]['problemRequirements'][number]['id']),id);
  assert.ok(variants.some(v=>v.target.kind==='areaSum'));
  assert.ok(variants.some(v=>v.scene.circle));
  assert.equal(variants.filter(v=>v.candidateConfigurations.length>1).length,2);
  assert.ok(variants.some(v=>v.components.length>=3));
});
test('integrated: the oracle is independent of trace, answer, distractors, and rendering metadata',()=>{
  for(const original of variants){const v=structuredClone(original),oracle=integratedOracle(v.scene,v.target);v.answer.value=123456;v.selectedMathematicalRoute=[];v.solutionTrace=[];v.candidates=[];v.scene.solutionRoute=[];v.scene.knownLengths=[];near(integratedOracle(v.scene,v.target),oracle);assert.equal(originalIntegratedPredicate(v,123456),false);}
});
test('integrated: original predicates reject corrupted givens, placement, circle, and candidate filters',()=>{
  for(const original of variants){const v=structuredClone(original);v.knownInformation.lengths[0].value+=1;assert.equal(originalIntegratedPredicate(v,v.answer.value),false);}
  const v=variants[6],scene=structuredClone(v.scene);scene.points.O=[100,100];assert.equal(originalIntegratedPredicate(v,v.answer.value,scene),false);
  for(const v of variants.filter(v=>v.candidateConfigurations.length)){
    assert.equal(v.candidateConfigurations.length,2);assert.equal(v.candidateConfigurations.filter(c=>c.accepted).length,1);
    for(const c of v.candidateConfigurations)assert.equal(originalIntegratedPredicate(v,c.finalValue,c.scene),c.accepted);
  }
});
test('integrated: determinant/circle-ray candidate enumeration at and around boundaries (24 cases)',()=>{
  for(const s of integratedScales){
    const maxArea=12*s*s;
    for(const [factor,count] of [[1-1e-6,2],[1,1],[1+1e-6,0]]){
      const ts=areaCandidateCoordinates(4*s,6*s,maxArea*factor);assert.equal(ts.length,count);
      for(const t of ts){near(inspectTriangle(t).area,maxArea*factor);near(inspectTriangle(t).b,6*s);}
    }
    const A=Math.acos(4/5)*180/Math.PI;
    for(const [factor,count] of [[1-1e-6,0],[1,1],[1+1e-6,2]]){
      const ts=enumerateSSA(A,3*s*factor,5*s);assert.equal(ts.length,count);
      for(const t of ts){const m=inspectTriangle(t);near(m.a,3*s*factor);near(m.b,5*s);near(m.A,A);}
    }
  }
});
test('integrated: coherent wrong routes change one decision and recompute every downstream node',()=>{
  for(const v of variants)for(const c of v.candidates){
    const model=c.coherentWrongModel,expected=runIntegratedRoute(v.selectedMathematicalRoute,c),normal=runIntegratedRoute(v.selectedMathematicalRoute);
    assert.deepEqual(model.propagatedValues,expected);near(c.answer.value,expected[model.finalTarget]);
    const changed=v.selectedMathematicalRoute.findIndex(s=>s.id===c.node);assert.ok(changed>=0);
    for(const st of v.selectedMathematicalRoute.slice(0,changed))near(expected[st.id],normal[st.id]);
    assert.notDeepEqual(model.originalExpression,model.replacement);assert.ok(c.reason);assert.ok(c.diagnosticScore>0);
    assert.equal(c.selected,c.exclusionReason===null);
  }
});
test('integrated: independent expected wrong-route final values for each of the 12 structures',()=>{
  const expected:[number,string,number][]=[
    [0,'shared_side_transfer',Math.sqrt(12)],
    [1,'height_transfer',4],
    [2,'cosine_correction_sign',15*Math.sqrt(3)/14],
    [3,'sine_ratio_reversal',Math.sqrt(42)],
    [4,'area_conversion',Math.sqrt(13)],
    [5,'cosine_correction_sign',2+1.5*Math.sqrt(20-8*Math.sqrt(3))],
    [6,'circumradius_factor',Math.sqrt(7+2*Math.sqrt(3))],
    [7,'similarity_correspondence',8*Math.sqrt(91)/(3*Math.sqrt(3))],
    [8,'height_transfer',Math.sqrt(77)/2],
    [9,'invalid_candidate_kept',2*Math.sqrt(21)/3],
    [10,'invalid_candidate_kept',4.5],
    [11,'height_transfer',25/3],
  ];
  for(const [i,id,value] of expected)near(variants[i].candidates.find(c=>c.id===id)!.answer.value,value);
});
test('integrated: equivalent wrong results are excluded, not doubled',()=>{
  for(const i of [3,9])assert.ok(variants[i].candidates.some(c=>c.exclusionReason?.includes('同値')));
  for(const v of variants)for(const c of v.candidates.filter(c=>c.selected))assert.ok(Math.abs(c.answer.value-v.answer.value)>1e-7);
});
test('integrated: solutionTrace generates thinking, working, transfer and final-condition verification',()=>{
  for(const v of variants){
    const phases=v.solutionTrace.map(t=>t.phase);
    for(const phase of ['INTERPRET','IDENTIFY_INTERMEDIATE','SELECT_REGION','CHOOSE_RELATION','CALCULATE','CHOOSE_NEXT_RELATION','VERIFY_CONDITION','CONCLUDE'])assert.ok(phases.includes(phase));
    assert.match(v.working.at(-1)!,/元の図形/);
    assert.equal(v.thinking,v.solutionTrace.find(t=>t.phase==='IDENTIFY_INTERMEDIATE')!.text);
    for(const st of v.selectedMathematicalRoute)assert.ok(v.working.some(w=>w.startsWith(st.formula)));
    assert.doesNotMatch(v.working.join(' '),/height=|radius=|offset=|Cangle=|angleA=|area=/);
  }
  assert.ok(variants.filter(v=>v.solutionTrace.some(t=>t.phase==='TRANSFER_RESULT')).length>=8);
});
test('integrated: X09 only for the two diagram-essential problems; X11 reflects alternative routes',()=>{
  assert.deepEqual(variants.flatMap((v,i)=>v.problemRequirements.some(r=>r.crossSkills.includes('X09'))?[i]:[]),[1,11]);
  for(const v of variants)assert.equal(v.problemRequirements.some(r=>r.id==='method_selection'),v.candidateRoutes.length>1);
});
test('integrated: narrow hypotheses separate route selection from execution; choiceId and verify storage only',()=>{
  assert.match(integratedTratioStorageKey,/^math:verify:/);
  const stages=new Set();
  for(const v of variants)for(const c of v.choices){
    const evidence=integratedTratioSubmission(v,c.choiceId);assert.equal(evidence.correct,c.correct);assert.equal(evidence.context,'verify-only');assert.equal(evidence.independent,false);assert.equal(evidence.independenceGroup,v.structureSignature);
    if(c.correct){assert.equal(evidence.routeSelection,null);assert.equal(evidence.execution,null);}else{stages.add(c.mistakeHypotheses!.stage);assert.equal(Boolean(evidence.routeSelection),!evidence.execution);assert.equal(c.mistakeHypotheses!.hypothesisOnly,true);assert.equal(c.mistakeHypotheses!.crossSkills.length,1);}
    assert.throws(()=>integratedTratioSubmission(v,'unknown'));
  }
  assert.deepEqual([...stages].sort(),['execution','routeSelection']);
  const shuffled=shuffleIntegratedTratio(variants[0],()=>0);assert.deepEqual(new Set(shuffled.map(c=>c.choiceId)),new Set(variants[0].choices.map(c=>c.choiceId)));assert.notDeepEqual(shuffled,variants[0].choices);
});
test('integrated: shared SVG hides all auxiliary lines and points before submission, shows them afterward',()=>{
  for(const v of variants){
    const before=integratedTratioFigure(v),after=integratedTratioFigure(v,true);assert.doesNotMatch(before,/data-auxiliary="true"/);
    for(const a of v.scene.auxiliaryConstruction){assert.ok(!before.includes(`data-point="${a.point}"`));assert.ok(after.includes(`data-point="${a.point}"`));}
    if(v.scene.segments.some(s=>s.auxiliary))assert.match(after,/data-auxiliary="true"/);
    if(v.target.kind==='circumradius'){assert.doesNotMatch(before,/<circle[^>]+r="[0-9]+\.[0-9]+"[^>]*stroke="#91aabd"/);assert.match(after,/stroke="#91aabd"/);}
    const result=integratedTratioResult(v,v.choices[0].choiceId);for(const text of ['考え方','解き方','図で確かめる','答え','solutionTrace','originalPredicate','coherent wrong model','独立coordinate oracle'])assert.ok(result.includes(text));
  }
});
test('integrated: normal selector, TRATIO lessons, QFN bank, and previous families unchanged',()=>{
  assert.equal(hash(generalVariants),'8d02bbaef80fb704bf9c0275576e57f428f6b544e43e4e1b40b60407ff2a9882');
  assert.equal(hash(rightVariants),'361399178e460f435d8f02cb6a9ab4391eca949f809faf6a6fb95e22dc65e710');
  assert.equal(hash([tratioLessons,tratioSkills,tratioSteps]),'925e95fb5c51c6e0a9765a0a7a711aacbb6b5319021e791693454e77a376ff94');
  assert.equal(hash(bankCurriculum),'e9da9a3b33b9ebcd775c57fa4c4b375090c5d8b7a5027d7f77c8e3585497e3a8');
  for(const path of ['src/tratio/catalog.ts','src/learning/task-selector.ts'])assert.doesNotMatch(readFileSync(path,'utf8'),/tratio-integrated|TR-INTEGRATED-JUDGMENT/);
  const main=readFileSync('src/ui/main.ts','utf8');assert.match(main,/verifyEnabled&&tratioIntegratedOpen/);
  for(let i=0;i<12;i++)for(const scale of [1,2,3,4]){assert.ok(validateGeneral(generateGeneralVariant(i,scale)).matched);assert.ok(validateRightVariant(generateRightVariant(i,scale)).matched);}
});
