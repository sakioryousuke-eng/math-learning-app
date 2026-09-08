import test from 'node:test';
import assert from 'node:assert/strict';
import {paperCurriculum as c,paperSpecs,shuffledChoices} from '../src/grading/paper-choices.ts';
import {LearningService} from '../src/services/learning-service.ts';
import {LearningApplication} from '../src/application/learning-application.ts';
import {MemoryLearningRepository} from '../src/persistence/repository.ts';
import {unitStatus} from '../src/math-master/unlock.ts';
import {quadraticExplanation} from '../src/ui/quadratic-explanation.ts';
const correct=(id:string)=>paperSpecs[id].choices.find(c=>c.correct)!.choiceId;
const checks=(id:string)=>paperSpecs[id].checks.map(c=>c.id);
function start(id:string){const e=new LearningService(true,c);e.openReviewedPreview(id);e.submission();return e;}
test('paper: 30 four-choice tasks and 3 six-choice tasks, unique conclusions and one correct ID',()=>{
 assert.equal(Object.values(paperSpecs).filter(s=>s.choices.length===4).length,30);
 assert.equal(Object.values(paperSpecs).filter(s=>s.choices.length===6).length,3);
 for(const s of Object.values(paperSpecs)){assert.equal(new Set(s.choices.map(c=>c.text)).size,s.choices.length);assert.equal(s.choices.filter(c=>c.correct).length,1);assert.deepEqual(new Set(shuffledChoices(s).map(c=>c.choiceId)),new Set(s.choices.map(c=>c.choiceId)));for(const choice of s.choices)assert.ok(choice.correct||choice.mistakeType);}
});
test('paper: choice ID, not position, decides correctness; no invented intermediate success',()=>{
 const id='QF-FORM-V1-1',e=start(id);e.submitChoice([...paperSpecs[id].choices].reverse().find(c=>c.correct)!.choiceId,[]);
 const a=e.snapshot.result!.assessment;assert.equal(a.solved,true);assert.equal(a.dimensions.conclusion,'success');assert.equal(a.dimensions.method,'unobserved');assert.equal(a.dimensions.calculation,'unobserved');assert.equal(e.snapshot.result!.stable,false);assert.equal(a.choice!.source,'paper-self-report');
 assert.throws(()=>e.submitChoice(correct(id),[]));
});
test('paper: incorrect choice retains mistake type and repair candidate; invalid input is atomic',()=>{
 const id='QF-RANGE-V1-4',e=start(id),wrong=paperSpecs[id].choices.find(c=>c.repairSkillId)!;const cp=e.exportCheckpoint();assert.throws(()=>e.submitChoice('unknown',[]));assert.deepEqual(e.exportCheckpoint(),cp);e.submitChoice(wrong.choiceId,[]);const a=e.snapshot.result!.assessment;assert.equal(a.solved,false);assert.equal(a.choice!.mistakeType,'calculation');assert.equal(a.choice!.repairSkillId,'QF-FORM');
});
test('paper: ordinary self-reported evidence still requires multiple independent tasks for stable',()=>{
 const e=new LearningService(true,c);e.switchProfile('quadratic');e.continueLearning();
 for(let i=0;i<2;i++){const id=e.snapshot.problem!.id;e.submission();e.submitChoice(correct(id),checks(id));assert.equal(e.snapshot.result!.stable,i===1);e.next();}
});
for(let n=1;n<=3;n++)test(`paper: MAX candidate ${n} grants QFN with one complete success in production service`,()=>{
 const id=`QF-MAX-V1-${n}`,demo=start(id),e=new LearningService(false,c);e.restoreCheckpoint(demo.exportCheckpoint());e.submitChoice(correct(id),checks(id));assert.equal(e.snapshot.result!.acquired,true);assert.ok(e.snapshot.learner.maxUnits.includes('QFN'));assert.equal(e.snapshot.learner.maxAttempts.QFN.length,1);assert.equal(e.snapshot.learner.activeUnit,null);
});
test('paper: incomplete or wrong MAX does not demote stable; same-day and post-7-day retries succeed',()=>{
 const id='QF-MAX-V1-1',e=start(id);const cp=e.exportCheckpoint();cp.learner.skills['QF-FORM']='stable';e.restoreCheckpoint(cp);e.submitChoice(correct(id),[]);assert.equal(e.snapshot.result!.acquired,false);assert.equal(e.snapshot.learner.skills['QF-FORM'],'stable');assert.ok(e.snapshot.result!.assessment.choice!.missing.length);e.next();e.startMax();assert.equal(e.snapshot.problem!.id,'QF-MAX-V1-2');e.submission();e.submitChoice(paperSpecs['QF-MAX-V1-2'].choices.find(c=>!c.correct)!.choiceId,checks('QF-MAX-V1-2'));assert.equal(e.snapshot.result!.acquired,false);e.next();e.advanceDay(9);e.startMax();e.submission();e.submitChoice(correct('QF-MAX-V1-3'),checks('QF-MAX-V1-3'));assert.equal(e.snapshot.result!.acquired,true);
});
test('paper: exhausted MAX candidates rotate; no daily wait',()=>{
 const e=start('QF-MAX-V1-1');for(let i=0;i<4;i++){const id=e.snapshot.problem!.id;e.submitChoice(correct(id),[]);e.next();e.startMax();e.submission();}assert.equal(e.snapshot.learner.maxAttempts.QFN.length,4);
});
test('paper: gate still requires other prerequisite MAX and rejects locked QFN',()=>{
 const e=start('QF-MAX-V1-1');e.submitChoice(correct('QF-MAX-V1-1'),checks('QF-MAX-V1-1'));assert.equal(unitStatus(c.master,e.snapshot.learner,'TRIG'),'LOCKED');const locked=start('QF-MAX-V1-1'),cp=locked.exportCheckpoint();cp.learner.maxUnits=[];locked.restoreCheckpoint(cp);assert.throws(()=>locked.submitChoice(correct('QF-MAX-V1-1'),checks('QF-MAX-V1-1')));assert.deepEqual(locked.exportCheckpoint(),cp);
});
test('paper: assessments and self-report survive repository reopen',async()=>{
 const repo=new MemoryLearningRepository(),app=new LearningApplication(repo,undefined,true,c);await app.boot();await app.useReviewedPreview('QF-RANGE-V1-1');await app.execute(()=>{app.service.submission();app.service.submitChoice(correct('QF-RANGE-V1-1'),checks('QF-RANGE-V1-1'));});const before=app.service.snapshot.result!.assessment;const reopened=new LearningApplication(repo,undefined,true,c);await reopened.boot();assert.deepEqual(reopened.service.snapshot.result!.assessment,before);
});
test('paper: reviewed factorization repair returns to the original quadratic task',()=>{
 const e=new LearningService(true,c);e.switchProfile('repair');const original=e.snapshot.learner.repair!.returnToProblemId;e.continueLearning();
 for(let i=0;i<2;i++){const id=e.snapshot.problem!.id;e.submission();e.submitChoice(correct(id),checks(id));e.next();}
 assert.equal(e.snapshot.learner.activeUnit,'QFN');assert.equal(e.snapshot.learner.repair,null);assert.equal(e.snapshot.problem!.id,original);
});
test('paper: explanations keep ordinary mathematics and graphs, with no choice labels',()=>{
 for(const p of c.problems.filter(p=>p.skillId.startsWith('QF-'))){const html=quadraticExplanation(p);assert.ok(!html.includes('choiceId'));assert.ok(!/Aが正解|番を選|選択肢/.test(html));assert.ok(html.includes('グラフ')||html.includes('動かして'));}
 assert.ok(c.problems.find(p=>p.id==='QF-INTEGRATE-V1-1')!.prompt.includes('壁に垂直な辺をx mとし、1≦x≦4とする。'));
});
