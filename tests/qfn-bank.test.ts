import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQfnBank} from '../scripts/build-qfn-bank.ts';
import {bankArtifact,bankRecords,bankCurriculum as c} from '../src/bank/catalog.ts';
import {paperCurriculum,paperSpecs} from '../src/grading/paper-choices.ts';
import {allPaperSpecs} from '../src/bank/paper.ts';
import {canUse,stableReady} from '../src/learning/material-policy.ts';
import {selectQfnPractice} from '../src/bank/selector.ts';
import {LearningService} from '../src/services/learning-service.ts';
import {createLearner} from '../src/math-master/learner.ts';
import {LearningApplication} from '../src/application/learning-application.ts';
import {MemoryLearningRepository} from '../src/persistence/repository.ts';
import {ManualClock} from '../src/application/clock.ts';
import {decodeDocument} from '../src/persistence/model.ts';
import {bankDynamicSpec,bankExplanation,bankDetails,renderBank} from '../src/ui/qfn-bank.ts';
import {boundaryJump} from '../src/ui/dynamic-quadratic.ts';
import {bankGraphs} from '../src/bank/graphs.ts';
import {lessonPanel} from '../src/ui/quadratic-view.ts';
import {unitStatus} from '../src/math-master/unlock.ts';
const rebuilt=buildQfnBank();
test('static artifact is reproducible after independent oracle and semantic choice checks',()=>assert.deepEqual(JSON.parse(JSON.stringify(rebuilt)),bankArtifact));
for(const p of bankRecords)test(`production variant ${p.id}: original-expression oracle, boundaries, unique choices, metadata`,()=>{
 const checked=rebuilt.records.find(r=>r.id===p.id);assert.ok(checked,JSON.stringify(rebuilt.rejected));assert.ok(checked.validation.sampleCount>=1003);
 assert.equal(p.unitId,'QFN');assert.equal(p.verificationStatus,'verified-generated');assert.equal(p.purpose,'practice');
 assert.equal(p.choices.length,4);assert.equal(p.choices.filter(c=>c.correct).length,1);assert.equal(p.choices.filter(c=>!c.correct).length,3);assert.equal(new Set(p.choices.map(c=>c.text)).size,4);
 assert.ok(p.problemRequirements.length);assert.ok(p.structureSignature);assert.equal(p.choices.find(c=>c.correct)!.mistakeHypotheses.length,0);assert.ok(p.choices.filter(c=>!c.correct).every(c=>c.mistakeHypotheses.length&&c.mistakeHypotheses.every(h=>h.hypothesisOnly)));
 assert.equal(lessonPanel(c.lessonMetadata!.find(l=>l.problem.id===p.id),false),'');
 const html=bankExplanation(p);for(const title of ['考え方','解き方','答え'])assert.ok(html.includes(title));
 const spec=bankDynamicSpec(p);if(spec)for(let i=0;i<spec.boundaries.length;i++){const target=boundaryJump(spec,i);assert.equal(target.value,p.graphSpec!.boundaries[i].value);assert.equal(target.label,p.graphSpec!.boundaries[i].label);}
 if(p.graphSpec)for(const v of [p.graphSpec.initial,...p.graphSpec.boundaries.map(b=>b.value)])for(const g of bankGraphs(p.graphSpec,v))assert.ok(g.curves.every(q=>q.coefficients.every(Number.isFinite)));
});
test('90 curated variants / family budgets / advanced majority / unique composite IDs',()=>{
 assert.equal(bankRecords.length,90);assert.deepEqual([1,2,3,4,5].map(i=>bankRecords.filter(p=>p.familyId===`QFN-F${i}`).length),[15,15,15,20,25]);
 assert.equal(new Set(bankRecords.map(p=>p.familyId+p.variantId)).size,90);assert.equal(new Set(bankRecords.map(p=>p.id)).size,90);
 assert.ok(bankRecords.filter(p=>['APPLIED','PRACTICAL'].includes(p.difficultyTier)).length>45);assert.equal(new Set(bankRecords.map(p=>p.difficultyTier)).size,4);
 assert.equal(bankArtifact.audit.promptDuplicates,0);assert.equal(new Set(bankRecords.map(p=>p.prompt)).size,90);assert.ok(bankArtifact.audit.signatureMaximum<=3);assert.ok(new Set(bankRecords.map(p=>p.structureSignature)).size>=70);
 for(const group of bankArtifact.audit.answerGroups){const rows=group.ids.map(id=>bankRecords.find(p=>p.id===id)!);assert.equal(new Set(rows.map(p=>p.familyId+p.structureSignature)).size,rows.length,'same answer requires a different mathematical structure');}
 assert.ok(bankArtifact.rejected.some(r=>r.reason.includes('diagnostic errors')));assert.ok(bankArtifact.rejected.some(r=>r.reason==='same answer and same structure'));
});
test('fixed reviewed, old unreviewed, repair, all other units and MAX definitions stay unchanged',()=>{
 assert.deepEqual(c.problems.filter(p=>p.reviewStatus!=='verified-generated'),paperCurriculum.problems);
 assert.deepEqual(c.master,paperCurriculum.master);assert.deepEqual(c.stablePolicies,paperCurriculum.stablePolicies);
 for(const p of c.problems)if(p.reviewStatus==='unreviewed')for(const context of ['practice','diagnostic','max','repair','warmup'] as const)assert.equal(canUse(c,p,context),false);
 for(const p of bankRecords){assert.ok(canUse(c,p,'practice'));for(const context of ['repair','diagnostic','max'] as const)assert.equal(canUse(c,p,context),false);}
 assert.equal(canUse({...c,generatedBank:[]},bankRecords[0],'practice'),false);
 assert.deepEqual(Object.fromEntries(Object.keys(paperSpecs).map(id=>[id,allPaperSpecs[id]])),paperSpecs);
});
const pool=(skill:string)=>c.problems.filter(p=>p.skillId===skill&&p.purpose==='practice'&&canUse(c,p,'practice'));
test('adaptive selector changes tier between learning/stable and uses practical for preparation',()=>{
 const learner=createLearner(c.master);for(const skill of ['QF-COUNT','QF-SIGN','QF-PARAM']){learner.skills[skill]='learning';const low=selectQfnPractice(c,learner,skill,pool(skill),[])!;learner.skills[skill]='stable';const high=selectQfnPractice(c,learner,skill,pool(skill),[])!;assert.ok(low.difficulty<=2);assert.ok(high.difficulty>=3);}
 const last=selectQfnPractice(c,learner,'QF-INTEGRATE',pool('QF-INTEGRATE'),[],true)!;assert.equal(last.difficulty,4);assert.equal(c.problemGuides.find(g=>g.problemId===last.id)!.hideMethodLabel,true);
 assert.equal(selectQfnPractice(c,learner,'HSX2',pool('HSX2'),[]),undefined);
});
test('selector retains skill/STEP and avoids recent family/signature/variant when alternatives exist',()=>{
 const learner=createLearner(c.master);learner.skills['QF-SIGN']='stable';const used:string[]=[];const generated=bankRecords.filter(p=>p.skillId==='QF-SIGN');
 let differentFamily=false;
 for(let i=0;i<12;i++){const p=selectQfnPractice(c,learner,'QF-SIGN',generated,used)!;const previous=bankRecords.find(p=>p.id===used.at(-1));assert.equal(p.skillId,'QF-SIGN');assert.equal(bankRecords.find(b=>b.id===p.id)!.step,4);assert.notEqual(p.id,previous?.id);assert.notEqual(p.independenceKey,previous?.independenceKey);if(previous&&previous.familyId!==bankRecords.find(b=>b.id===p.id)!.familyId)differentFamily=true;used.push(p.id);}
 assert.ok(differentFamily);
});
test('same-family same-structure successes do not overcount independent stable evidence',()=>{
 const rows=bankRecords.filter(p=>p.familyId==='QFN-F2');const group=rows.filter(p=>p.structureSignature===rows.find(p=>rows.some(q=>q.id!==p.id&&q.structureSignature===p.structureSignature))!.structureSignature);assert.ok(group.length>=2);
 const service=new LearningService(true,c),assessments=group.map(p=>{service.openReviewedPreview(p.id);service.submission();service.submitChoice(p.choices.find(c=>c.correct)!.choiceId,['method','conditions','calculation']);return service.snapshot.result!.assessment;});
 assert.equal(stableReady(c,group[0].skillId,assessments),false);assert.equal(new Set(assessments.map(a=>a.generatedEvidence!.independenceGroup)).size,1);
});
test('normal choice submission persists hypotheses without automatic repair; resume retains all evidence',async()=>{
 const repo=new MemoryLearningRepository(),clock=new ManualClock('2026-09-08T03:00:00Z');const app=new LearningApplication(repo,clock,true,c);await app.boot();const before=await repo.load('student:local');const p=bankRecords[0];await app.useReviewedPreview(p.id);assert.deepEqual(await repo.load('student:local'),before);
 const document=decodeDocument(await repo.load(app.namespace),app.namespace,c);document.namespace='student:local';document.revision=1;repo.records.set('student:local',document);await repo.selectNamespace('student:local');
 const ordinary=new LearningApplication(repo,clock,false,c);await ordinary.boot();const wrong=p.choices.find(c=>!c.correct)!;await ordinary.execute(()=>{ordinary.service.submission();ordinary.service.submitChoice(wrong.choiceId,[]);});
 const assessment=ordinary.service.snapshot.result!.assessment;assert.equal(assessment.solved,false);assert.equal(assessment.generatedEvidence!.mistakeType,wrong.mistakeType);assert.deepEqual(assessment.generatedEvidence!.mistakeHypotheses,wrong.mistakeHypotheses);assert.deepEqual(assessment.crossSkills,{});assert.equal(ordinary.service.snapshot.learner.repair,null);
 const restart=new LearningApplication(repo,clock,false,c);await restart.boot();assert.deepEqual(restart.service.snapshot.result!.assessment,assessment);assert.equal(restart.service.snapshot.learner.activeUnit,'QFN');
 await restart.execute(()=>restart.service.next());assert.ok(restart.service.snapshot.problem);assert.notEqual(restart.service.snapshot.problem!.reviewStatus,'unreviewed');assert.equal(restart.service.snapshot.problem!.skillId,p.skillId);
});
test('normal locked QFN remains locked; only demo preview creates prerequisites',()=>{const s=new LearningService(false,c);assert.throws(()=>s.openReviewedPreview(bankRecords[0].id));assert.equal(unitStatus(c.master,s.snapshot.learner,'QFN'),'LOCKED');assert.throws(()=>s.chooseUnit('QFN'));});
test('MAX stays one complete success in three fixed candidates; generated practice never awards MAX',()=>{
 const s=new LearningService(true,c);s.switchProfile('qfn-ready');s.prepareQfn();assert.equal(s.snapshot.current!.context,'practice');const spec=allPaperSpecs[s.snapshot.problem!.id];assert.equal(s.snapshot.problem!.purpose,'practice');s.submission();s.submitChoice(spec.choices.find(c=>c.correct)!.choiceId,spec.checks.map(c=>c.id));assert.equal(s.snapshot.learner.maxUnits.includes('QFN'),false);
 s.startMax();const first=s.snapshot.problem!.id;assert.ok(first.startsWith('QF-MAX-V1-'));s.submission();s.submitChoice(paperSpecs[first].choices.find(c=>!c.correct)!.choiceId,paperSpecs[first].checks.map(c=>c.id));assert.ok(Object.entries(s.snapshot.learner.skills).filter(([id])=>id.startsWith('QF-')).every(([,v])=>v==='stable'));
 s.startMax();assert.notEqual(s.snapshot.problem!.id,first);const second=paperSpecs[s.snapshot.problem!.id];s.submission();s.submitChoice(second.choices.find(c=>c.correct)!.choiceId,second.checks.map(c=>c.id));assert.equal(s.snapshot.result!.acquired,true);assert.ok(s.snapshot.learner.maxUnits.includes('QFN'));
 assert.equal(c.problems.filter(p=>p.id.startsWith('QF-MAX-V1-')).length,3);
});
test('verification UI exposes counts and separate hypotheses; graphs only in answer explanation',()=>{const p=bankRecords[0];assert.ok(renderBank().includes('verified-generated 90'));assert.ok(bankDetails(p).includes('独立oracle'));assert.ok(bankDetails(p).includes('必要な能力'));assert.ok(bankExplanation(p).includes('<svg'));assert.equal(lessonPanel(c.lessonMetadata!.find(l=>l.problem.id===p.id),false),'');});
