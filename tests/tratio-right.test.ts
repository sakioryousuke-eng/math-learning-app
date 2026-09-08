import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {rightVariants,generateRightVariant,scalePool,coordinateOracle,validateRightVariant,equivalentRightAnswers as equal} from '../src/prototype/tratio-right.ts';
import {rightSceneFigure,rightSubmission,shuffleRightChoices,rightResult,renderRightPrototype,rightVerifyStorageKey} from '../src/prototype/tratio-right-view.ts';
import {tratioLessons,tratioSkills,tratioSteps} from '../src/tratio/lessons.ts';
import {tratioCurriculum} from '../src/tratio/catalog.ts';
import {bankCurriculum} from '../src/bank/catalog.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} != ${b}`);

// Independently read printed expressions, so a correct numeric payload cannot
// conceal an incorrect answer/choice/diagram label. This is a tiny arithmetic
// grammar: sums of rational multiples of square roots; no executable input.
function printedNumber(text:string){
  let source=text.includes('=')?text.slice(text.indexOf('=')+1):text;
  source=source.replace(/^[^0-9√−-]*/,'').replace(/\s*(m|°).*$/,'').replaceAll('−','-').trim();
  assert.match(source,/^[0-9.√+\-/]+$/);
  return (source.match(/[+-]?[^+-]+/g)??[]).reduce((sum,term)=>{
    const sign=term.startsWith('-')?-1:1,plain=term.replace(/^[+-]/,''),[top,bottom='1']=plain.split('/');
    const [coefficient,radicand]=top.split('√');
    return sum+sign*(radicand===undefined?Number(coefficient):Number(coefficient||1)*Math.sqrt(Number(radicand)))/Number(bottom);
  },0);
}
test('TRATIO right: 12 distinct scenes with difficulty 3/5/4',()=>{
  assert.equal(rightVariants.length,12);assert.equal(new Set(rightVariants.map(v=>v.structureSignature)).size,12);
  assert.deepEqual(['STANDARD','APPLIED','PRACTICAL'].map(d=>rightVariants.filter(v=>v.difficulty===d).length),[3,5,4]);
  assert.equal(new Set(rightVariants.map(v=>v.variantId)).size,12);
});
for(let index=0;index<12;index++)test(`TRATIO right scene ${index+1}: all 5 safe parameter samples / coordinates / printed answers / choices`,()=>{
  for(const scale of scalePool){
    const v=generateRightVariant(index,scale);assert.equal(validateRightVariant(v).matched,true);
    assert.ok(equal(coordinateOracle(v.scene),v.values));assert.equal(v.choices.length,4);assert.equal(v.choices.filter(c=>c.correct).length,1);
    for(const c of v.choices){
      const printed=c.text.split('、').map(printedNumber);assert.ok(equal(printed,c.values),`${v.variantId} ${c.text} ${printed} ${c.values}`);
      assert.equal(c.mistakeHypotheses===null,c.correct);
    }
    assert.ok(equal(v.answer.split('、').map(printedNumber),v.values));
    for(const k of v.scene.knownLengths)near(printedNumber(k.label),k.value);
    for(const c of v.candidates){assert.ok(equal(c.text.split('、').map(printedNumber),c.values));assert.ok(c.formula&&c.relevance);assert.equal(c.mistakeHypotheses.crossSkills.length,1);assert.ok(c.diagnosticScore>0);assert.equal(c.exclusionReason===null,c.selected);}
    assert.equal(v.candidates.filter(c=>c.selected).length,3);
    assert.doesNotMatch(v.prompt,/sin|cos|tan|正弦定理|余弦定理|三平方.*用い/);
    assert.doesNotMatch(v.working.join(''),/sinの定義|cosの定義|正弦定理|余弦定理|加法定理/);
    assert.match(v.working.join(''),/相似|単位円/);
  }
});
test('coordinate oracle depends only on geometry and target, not route or answer',()=>{
  const v=rightVariants[8],scene=structuredClone(v.scene);scene.solutionRoute=[];scene.knownLengths=[];
  assert.ok(equal(coordinateOracle(scene),v.values));scene.points.T[1]+=2;
  assert.equal(equal(coordinateOracle(scene),v.values),false);
  assert.throws(()=>validateRightVariant({...v,scene}),/oracle/);
  const source=readFileSync(new URL('../src/prototype/tratio-right.ts',import.meta.url),'utf8').split('export function coordinateOracle')[1].split('export function validateRightVariant')[0];
  assert.doesNotMatch(source,/sn\(|cs\(|tn\(|solutionRoute|\.values/);
});
test('validator rejects wrong labels, angles, reference sides and invalid parameters',()=>{
  const v=structuredClone(rightVariants[0]);v.scene.knownLengths[0].value++;assert.throws(()=>validateRightVariant(v),/ラベル/);
  const a=structuredClone(rightVariants[0]);a.scene.angles[0].degrees=60;assert.throws(()=>validateRightVariant(a),/角度/);
  const b=structuredClone(rightVariants[0]);b.scene.solutionRoute[0].angle=60;assert.throws(()=>validateRightVariant(b),/辺対応/);
  for(const s of [0,-1,1.01,999,NaN])assert.throws(()=>generateRightVariant(0,s));
  assert.throws(()=>generateRightVariant(12));
});
test('misconception models: sin/cos, reciprocal tan, hypotenuse, reference angle',()=>{
  const [slope,tower,ladder,inverse]=rightVariants;
  assert.ok(equal(slope.candidates.find(c=>c.type==='sin_cos_swap')!.values,[slope.values[1],slope.values[0]]));
  const d=tower.scene.knownLengths[0].value;near(tower.candidates.find(c=>c.type==='tan_reciprocal')!.values[0],d*d/tower.values[0]);
  near(ladder.candidates.find(c=>c.type==='hypotenuse_identification')!.values[0],ladder.scale/2);
  assert.deepEqual(inverse.candidates.map(c=>c.values[0]).sort((a,b)=>a-b),[45,60,150]);
});
test('offsets are neither omitted nor doubled in correct routes',()=>{
  for(const i of [5,7]){const v=rightVariants[i],targetIndex=i===5?0:1;const rise=v.scene.points[i===5?'T':'B'][1]-v.scale/2;
    near(v.values[targetIndex],rise+v.scale/2);
    const offsets=v.candidates.filter(c=>c.type==='height_offset').map(c=>c.values[targetIndex]);assert.ok(offsets.some(x=>Math.abs(x-rise)<1e-8));assert.ok(offsets.some(x=>Math.abs(x-rise-v.scale)<1e-8));
  }
});
test('common height, hidden perpendicular and Pythagoras use distinct structures',()=>{
  const tower=rightVariants[8],roof=rightVariants[11],trap=rightVariants[9],circle=rightVariants[10];
  assert.equal(tower.scene.referenceTriangle.length,2);assert.equal(roof.scene.referenceTriangle.length,2);
  assert.equal(trap.scene.auxiliaryConstruction.length,2);assert.equal(circle.scene.circle?.radius,2*circle.scale);
  near(tower.candidates.find(c=>c.type==='common_height')!.values[0],tower.values[0]/2);
  near(trap.values[0]**2,28*trap.scale**2);
  near(trap.candidates.find(c=>c.type==='pythagoras_scope')!.values[0],2*trap.scale);
});
test('problem diagrams suppress constructed points, lines and right marks; explanation adds them',()=>{
  for(const v of rightVariants){const before=rightSceneFigure(v),after=rightSceneFigure(v,true);
    assert.doesNotMatch(before,/data-auxiliary/);
    for(const a of v.scene.auxiliaryConstruction){assert.ok(!before.includes(`data-point="${a.point}"`));assert.ok(after.includes(`data-point="${a.point}"`));}
    for(const k of v.scene.knownLengths)assert.ok(before.includes(k.label));
    assert.match(before,/<svg viewBox="0 0 360 290"/);
    if(v.scene.auxiliaryConstruction.length)assert.match(after,/data-auxiliary="true"/);
    assert.ok(!before.includes('diagnosticScore'));
  }
});
test('X09 only for a task requiring reading givens from the figure; capabilities are not blanket tags',()=>{
  const visual=rightVariants.filter(v=>v.problemRequirements.some(r=>r.crossSkills.includes('X09')));assert.equal(visual.length,1);assert.equal(visual[0].variantId,rightVariants[6].variantId);assert.match(visual[0].prompt,/図に示/);
  assert.ok(rightVariants[5].problemRequirements.some(r=>r.id==='preserve_offset'));
  assert.ok(!rightVariants[0].problemRequirements.some(r=>r.id==='preserve_offset'));
  assert.ok(!rightVariants.some(v=>v.problemRequirements.some(r=>r.crossSkills.includes('X06'))));
});
test('duplicate candidates excluded with reason; scoring is attached to actual scene features',()=>{
  for(const i of [4,6])assert.ok(rightVariants[i].candidates.some(c=>!c.selected&&c.exclusionReason?.includes('同値')));
  const rectangle=rightVariants[6];assert.ok(rectangle.candidates.find(c=>c.type==='reference_angle_confusion')!.selected);
  assert.ok(rightVariants[5].candidates.filter(c=>c.type==='height_offset').every(c=>c.selected&&c.diagnosticScore>=100));
});
test('choiceId grading independent of shuffle; one narrow hypothesis and family/structure group only',()=>{
  for(const v of rightVariants){const order=shuffleRightChoices(v,()=>0);assert.notDeepEqual(order.map(c=>c.choiceId),v.choices.map(c=>c.choiceId));
    for(const c of order){const result=rightSubmission(v,c.choiceId);assert.equal(result.correct,c.correct);assert.deepEqual(result.mistakeHypotheses,c.mistakeHypotheses);assert.equal(result.independent,false);assert.equal(result.context,'verify-only');assert.equal(result.independenceGroup,`${v.familyId}/${v.structureSignature}`);}
    assert.throws(()=>rightSubmission(v,'A'));
  }
  assert.match(rightVerifyStorageKey,/verify.*tratio-right/);
});
test('answer and diagnostic metadata appear after submission only',()=>{
  const before=renderRightPrototype();assert.doesNotMatch(before,/独立coordinate oracle|diagnosticScore|この問題で必要な能力/);
  const v=rightVariants[9],after=rightResult(v,v.choices[0].choiceId);
  for(const title of ['考え方','解き方','図で確かめる','答え','structureSignature','diagnosticScore','oracle'])assert.ok(after.includes(title));
});
test('existing 27 TRATIO lessons, skills, steps and QFN bank remain byte-equivalent as data',()=>{
  const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
  assert.equal(hash([tratioLessons,tratioSkills,tratioSteps]),'925e95fb5c51c6e0a9765a0a7a711aacbb6b5319021e791693454e77a376ff94');
  assert.equal(hash(bankCurriculum),'e9da9a3b33b9ebcd775c57fa4c4b375090c5d8b7a5027d7f77c8e3585497e3a8');
  assert.ok(!tratioCurriculum.problems.some(p=>p.id.startsWith('TR-RIGHT-MEASURE')));
  assert.deepEqual(tratioCurriculum.master.units.find(u=>u.id==='TRIG'),bankCurriculum.master.units.find(u=>u.id==='TRIG'));
});
