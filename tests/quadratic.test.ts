import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedCurriculum as c,steps,lessons,stablePolicies} from '../src/curriculum/quadratic.ts';
import {curriculum as old} from '../src/curriculum/master.ts';
import {LearningService} from '../src/services/learning-service.ts';
import {LearningApplication} from '../src/application/learning-application.ts';
import {MemoryLearningRepository} from '../src/persistence/repository.ts';
import {ManualClock} from '../src/application/clock.ts';
import {unitStatus,skillAvailable} from '../src/math-master/unlock.ts';
import {gradeMock} from '../src/services/mock-grader.ts';
import {stableReady,canUse} from '../src/learning/material-policy.ts';
import {migrateDocument} from '../src/curriculum/migration.ts';
import {graphSvg} from '../src/ui/quadratic-view.ts';
const at='2026-09-08T03:00:00Z';
function ready(){const e=new LearningService(true,c);e.switchProfile('quadratic');return e;}
function solve(e:LearningService,kind:'correct'|'prerequisite'='correct',skill?:string){e.submission();e.submit(kind,skill);}
test('QF: five steps, eight live skills and only reviewed new material',()=>{
 assert.equal(steps.length,5);assert.equal(steps.flatMap(s=>s.skills).length,8);
 assert.equal(c.master.units.length,41);assert.equal(c.problems.filter(p=>p.reviewStatus==='unreviewed').length,410);
 assert.equal(c.problems.filter(p=>p.reviewStatus==='reviewed').length,33);
 assert.equal(c.master.units.find(u=>u.id==='QFN')!.prerequisites.join(','),old.master.units.find(u=>u.id==='QFN')!.prerequisites.join(','));
 for(const l of lessons){assert.equal(l.review.checks.length,15);assert.ok(l.problem.solution.length>25);assert.ok(l.problem.reviewStatus==='reviewed');}
});
test('QF: all eight skills and five steps advance using policy evidence, never old three skills',()=>{
 const e=ready();e.continueLearning();
 for(const id of steps.flatMap(s=>s.skills)){
  assert.equal(e.snapshot.problem?.skillId,id);
  for(let n=0;n<stablePolicies[id].minimum;n++){solve(e);assert.equal(e.snapshot.result?.stable,n===stablePolicies[id].minimum-1);e.next();}
  assert.equal(e.snapshot.learner.skills[id],'stable');e.continueLearning();
 }
 assert.equal(e.snapshot.screen,'max');assert.ok(!e.snapshot.learner.maxUnits.includes('QFN'));
});
for(const step of steps)test(`QF STEP ${step.number}: prerequisite learning blocks; stable or MAX unlocks`,()=>{
 const p=ready().snapshot.learner;
 for(const id of step.skills){const skill=c.master.skills.find(s=>s.id===id)!;
  for(const pre of skill.prerequisites){const owner=c.master.skills.find(s=>s.id===pre)!.unitId;p.maxUnits=p.maxUnits.filter(u=>u!==owner);p.skills[pre]='learning';assert.equal(skillAvailable(c.master,p,id),false);p.skills[pre]='stable';}
  assert.equal(skillAvailable(c.master,p,id),true);
 }
});
test('QF: repeated IDs, correlated families, incomplete dimensions and hints do not grant stable',()=>{
 const pool=lessons.filter(l=>l.problem.skillId==='QF-FORM').slice(0,3);
 const evidence=pool.map((l,i)=>gradeMock(l.problem,'correct',String(i),at,'practice'));
 assert.equal(stableReady(c,'QF-FORM',evidence.slice(0,2)),false);
 assert.equal(stableReady(c,'QF-FORM',evidence),true);
 const repeated=[evidence[0],{...evidence[0],id:'repeat'},evidence[1]];assert.equal(stableReady(c,'QF-FORM',repeated),false);
 const bad=structuredClone(evidence);bad[2].dimensions.conditions='partial';assert.equal(stableReady(c,'QF-FORM',bad),false);
 const catalog=structuredClone(c);catalog.problems.find(p=>p.id===pool[2].problem.id)!.independenceKey=pool[0].problem.independenceKey;assert.equal(stableReady(catalog,'QF-FORM',evidence),false);
 const e=ready();e.continueLearning();e.showIntroduction();solve(e);assert.equal(e.snapshot.result!.assessment.independent,false);e.next();solve(e);assert.equal(e.snapshot.result!.stable,false);e.next();solve(e);assert.equal(e.snapshot.result!.stable,true);
});
test('QF: stable requires coverage of zero/one/two intersections and range outside/downward cases',()=>{
 const evidence=(ids:string[])=>ids.map((id,i)=>gradeMock(c.problems.find(p=>p.id===id)!,'correct',String(i),at,'practice'));
 assert.equal(stableReady(c,'QF-COUNT',evidence([1,2,4].map(n=>`QF-COUNT-V1-${n}`))),false);
 assert.equal(stableReady(c,'QF-COUNT',evidence([2,3,4].map(n=>`QF-COUNT-V1-${n}`))),true);
 assert.equal(stableReady(c,'QF-RANGE',evidence([1,2,4].map(n=>`QF-RANGE-V1-${n}`))),false);
 assert.equal(stableReady(c,'QF-RANGE',evidence([2,3,4].map(n=>`QF-RANGE-V1-${n}`))),true);
});
test('QF: range repeated prerequisite failure repairs FORM only and returns exact problem',()=>{
 const e=ready(),cp=e.exportCheckpoint();cp.learner.skills['QF-GRAPH']='stable';cp.learner.skills['QF-FORM']='stable';e.restoreCheckpoint(cp);e.continueLearning();
 solve(e,'prerequisite','QF-FORM');assert.equal(e.snapshot.learner.repair,null);e.next();const original=e.snapshot.problem!.id;
 solve(e,'prerequisite','QF-FORM');assert.equal(e.snapshot.learner.repair!.repairSkillId,'QF-FORM');e.next();
 for(let i=0;i<3;i++){assert.equal(e.snapshot.problem!.skillId,'QF-FORM');solve(e);e.next();}
 assert.equal(e.snapshot.problem!.id,original);assert.equal(e.snapshot.learner.activeUnit,'QFN');assert.equal(e.snapshot.learner.repair,null);
});
test('QF: specific factorization repair uses reviewed HSX2 pool and rejoins source',()=>{
 const e=ready(),cp=e.exportCheckpoint();for(const id of steps.flatMap(s=>s.skills).filter(id=>!['QF-SIGN','QF-INTEGRATE'].includes(id)))cp.learner.skills[id]='stable';e.restoreCheckpoint(cp);e.continueLearning();
 solve(e,'prerequisite','HSX2');e.next();const original=e.snapshot.problem!.id;solve(e,'prerequisite','HSX2');e.next();
 for(let i=0;i<2;i++){assert.equal(e.snapshot.problem!.reviewStatus,'reviewed');assert.equal(e.snapshot.problem!.skillId,'HSX2');solve(e);e.next();}
 assert.equal(e.snapshot.problem!.id,original);assert.equal(e.snapshot.learner.activeUnit,'QFN');
});
test('QF: unrelated repair observation rejected before any grading mutation',()=>{
 const e=ready();e.continueLearning();e.submission();const before=e.exportCheckpoint();assert.throws(()=>e.submit('prerequisite','TRIG1'));assert.deepEqual(e.exportCheckpoint(),before);
});
test('QF: three MAX days unlock TRIG only when all other required MAX flags exist',()=>{
 const e=ready(),cp=e.exportCheckpoint();cp.learner.maxUnits.push('TRATIO');e.restoreCheckpoint(cp);
 for(let i=0;i<3;i++){
  e.startMax();assert.match(e.snapshot.problem!.id,/QF-MAX/);solve(e);assert.equal(e.snapshot.result!.acquired,i===2);e.next();
  assert.equal(unitStatus(c.master,e.snapshot.learner,'TRIG'),i===2?'OPEN':'LOCKED');if(i<2){assert.throws(()=>e.startMax(),/本日/);e.advanceDay();}
 }
});
test('QF: MAX failure retains stable and stale seven-day evidence cannot complete MAX',()=>{
 const e=ready(),cp=e.exportCheckpoint();cp.learner.skills['QF-FORM']='stable';e.restoreCheckpoint(cp);e.startMax();e.submission();e.submit('calculation');assert.equal(e.snapshot.learner.skills['QF-FORM'],'stable');
 const other=ready();other.startMax();solve(other);other.next();other.advanceDay(8);other.startMax();solve(other);assert.equal(other.snapshot.evidence.length,1);assert.equal(other.snapshot.result!.acquired,false);
});
test('QF: unreviewed first diagnostic fails closed without granting a gate',()=>{
 const e=new LearningService(true,c),before=e.exportCheckpoint();assert.throws(()=>e.startDiagnostic(),/確認待ち/);assert.deepEqual(e.exportCheckpoint(),before);
 assert.equal(canUse(c,c.problems[0],'practice'),false);assert.equal(canUse(c,lessons.find(l=>l.step===0)!.problem,'practice'),false);
});
test('QF: diagnostic integrations give stable only, targeted failure descends the implicated branch',()=>{
 const e=ready(),cp=e.exportCheckpoint();cp.learner.diagnosticCompleted=false;cp.diagUnit=c.mainUnitIds.indexOf('QFN');e.restoreCheckpoint(cp);e.startDiagnostic();
 assert.equal(e.snapshot.problem!.skillId,'QF-INTEGRATE');solve(e,'prerequisite','QF-FORM');e.next();assert.equal(e.snapshot.problem!.skillId,'QF-FORM');solve(e);e.next();assert.equal(e.snapshot.diagnosisFinished,true);assert.ok(!e.snapshot.learner.maxUnits.includes('QFN'));
});
test('QF: save/reopen retains intro evidence and exact current reviewed problem',async()=>{
 const repo=new MemoryLearningRepository(),clock=new ManualClock(at),app=new LearningApplication(repo,clock,true,c);await app.boot();await app.useDemo('quadratic');await app.execute(()=>app.service.continueLearning());await app.execute(()=>app.service.showIntroduction());const id=app.service.snapshot.problem!.id;
 const next=new LearningApplication(repo,clock,true,c);await next.boot();assert.equal(next.service.snapshot.problem!.id,id);assert.ok(next.service.exportCheckpoint().hintedProblems.includes(id));
});
for(const profile of ['quadratic','repair','qfn-ready','complete'] as const)test(`QF: v0.5 migration preserves ${profile} history and adds no automatic stable`,async()=>{
 const repo=new MemoryLearningRepository(),clock=new ManualClock(at),app=new LearningApplication(repo,clock,true,old);await app.boot();await app.useDemo(profile);const raw=await repo.load(app.namespace);
 const migrated=migrateDocument(raw,app.namespace,c,at);for(const id of steps.flatMap(s=>s.skills))assert.equal(migrated.checkpoint.learner.skills[id],'unseen');
 const from=migrateDocument(raw,app.namespace,old,at);assert.deepEqual(migrated.checkpoint.learner.maxUnits,from.checkpoint.learner.maxUnits);assert.deepEqual(migrated.checkpoint.learner.repair,from.checkpoint.learner.repair);assert.deepEqual(migrated.checkpoint.learner.assessments,from.checkpoint.learner.assessments);assert.deepEqual(migrated.expEvents,from.expEvents);
 const next=new LearningApplication(repo,clock,true,c);await next.boot();assert.equal(next.service.snapshot.learner.activeUnit,from.checkpoint.learner.activeUnit);
});
test('QF: failed migration CAS leaves old save intact and can retry',async()=>{
 const repo=new MemoryLearningRepository(),clock=new ManualClock(at),oldApp=new LearningApplication(repo,clock,true,old);await oldApp.boot();await oldApp.useDemo('repair');const before=await repo.load(oldApp.namespace);repo.failNext=true;
 const a=new LearningApplication(repo,clock,true,c);await assert.rejects(()=>a.boot());assert.deepEqual(await repo.load(oldApp.namespace),before);await a.boot();
});
test('QF: graph specification produces bounded SVG and no MAX method graphic',()=>{
 for(const l of lessons.filter(l=>l.graph)){const svg=graphSvg(l.graph!);assert.ok(svg.includes('viewBox'));assert.ok(!svg.includes('NaN'));assert.ok(!svg.includes('Infinity'));}
 for(const l of lessons.filter(l=>l.roles.includes('max')))assert.equal(l.graph,undefined);
});
test('QF: legacy successful MAX attempts remain in history but cannot complete a reviewed MAX',()=>{
 const oldService=new LearningService(true,old);oldService.switchProfile('qfn-ready');
 const e=ready(),cp=e.exportCheckpoint();cp.learner.maxAttempts.QFN=structuredClone(oldService.snapshot.learner.maxAttempts.QFN);e.restoreCheckpoint(cp);
 assert.equal(e.snapshot.evidence.length,0);e.startMax();solve(e);assert.equal(e.snapshot.result!.acquired,false);assert.equal(e.snapshot.evidence.length,1);assert.equal(e.snapshot.learner.maxAttempts.QFN.length,3);assert.equal(e.snapshot.learner.maxAttempts.QFN[0].examQuality,true);
});
test('QF: three independent diagnostic integrations grant stable without MAX',()=>{
 const e=ready(),cp=e.exportCheckpoint();cp.learner.diagnosticCompleted=false;cp.diagUnit=c.mainUnitIds.indexOf('QFN');e.restoreCheckpoint(cp);e.startDiagnostic();
 for(let i=0;i<3;i++){solve(e);e.next();}
 assert.equal(e.snapshot.diagnosisFinished,true);assert.equal(e.snapshot.learner.diagnosticCompleted,true);assert.ok(steps.flatMap(s=>s.skills).every(id=>e.snapshot.learner.skills[id]==='stable'));assert.ok(!e.snapshot.learner.maxUnits.includes('QFN'));
});
test('QF: explicit save migration supports pre-hint-checkpoint format',async()=>{
 const repo=new MemoryLearningRepository(),a=new LearningApplication(repo,new ManualClock(at),true,old);await a.boot();const raw=JSON.parse(JSON.stringify(await repo.load(a.namespace)));delete raw.checkpoint.hintedProblems;
 const next=migrateDocument(raw,a.namespace,c,at);assert.deepEqual(next.checkpoint.hintedProblems,[]);
});
test('QF: graph display bounds do not imply an unstated restricted domain',()=>{
 assert.equal(lessons.find(l=>l.problem.id==='QF-GRAPH-V1-1')!.graph!.restricted,undefined);
 assert.ok(!graphSvg(lessons.find(l=>l.problem.id==='QF-GRAPH-V1-1')!.graph!).includes('fill="#edf5fc"'));
 assert.equal(lessons.find(l=>l.problem.id==='QF-RANGE-V1-1')!.graph!.restricted,true);
});
test('QF: MAX beyond 25 minutes records the answer without valid success evidence',()=>{
 const e=ready();e.startMax();const cp=e.exportCheckpoint();cp.realStartedAt=Date.now()-26*60*1000;e.restoreCheckpoint(cp);solve(e);
 assert.equal(e.snapshot.result!.assessment.solved,true);assert.equal(e.snapshot.evidence.length,0);assert.equal(e.snapshot.learner.maxAttempts.QFN[0].practicalTime,false);
});
