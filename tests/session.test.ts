import test from 'node:test';
import assert from 'node:assert/strict';
import {LearningService} from '../src/services/learning-service.ts';
import {master,problems} from '../src/services/catalog.ts';
import {unitStatus} from '../src/math-master/unlock.ts';
import type {MockOutcome} from '../src/services/mock-grader.ts';
const submit=(s:LearningService,outcome:MockOutcome='correct')=>{s.submission();s.submit(outcome);};
test('fixed bank: every skill has different practice tasks and all units have four MAX tasks',()=>{
 for(const skill of master.skills){const bank=problems.filter(p=>p.skillId===skill.id&&p.purpose==='practice');assert.ok(bank.length>=2);assert.equal(new Set(bank.map(p=>p.prompt)).size,bank.length);}
 for(const unit of master.units)assert.equal(problems.filter(p=>p.purpose==='max'&&p.skillId===`${unit.id}3`).length,4);
 for(const topic of ['式変形','最大最小','場合分け','判別式・交点','二次不等式','統合'])assert.ok(problems.some(p=>p.topic===topic));
});
test('fresh session: diagnosis failure follows only a branch, decides start, warms up then learns',()=>{
 const s=new LearningService();s.continueLearning();assert.equal(s.snapshot.current?.context,'diagnostic');submit(s,'prerequisite');assert.deepEqual(s.snapshot.learner.diagnosticPending,['CAL2']);s.next();assert.equal(s.snapshot.problem?.skillId,'CAL2');submit(s,'correct');s.next();assert.equal(s.snapshot.screen,'diagnostic');assert.equal(s.snapshot.diagnosisFinished,true);s.acceptDiagnosis();assert.equal(s.snapshot.screen,'home');assert.equal(s.snapshot.learner.activeUnit,'CAL');assert.deepEqual(s.snapshot.learner.maxUnits,[]);s.continueLearning();assert.equal(s.snapshot.current?.context,'warmup');submit(s);s.next();assert.equal(s.snapshot.current?.context,'practice');
});
test('diagnosis all passes: two integration successes per section; stable only',()=>{const s=new LearningService();s.continueLearning();for(let i=0;i<14;i++){submit(s);s.next();}assert.equal(s.snapshot.diagnosisFinished,true);assert.deepEqual(s.snapshot.learner.maxUnits,[]);assert.ok(Object.values(s.snapshot.learner.skills).every(v=>v==='stable'));s.acceptDiagnosis();s.continueLearning();submit(s);s.next();assert.equal(s.snapshot.screen,'max');});
test('warmup mistake cannot demote and proceeds to selected QFN2',()=>{const s=new LearningService();s.switchProfile('quadratic');s.continueLearning();submit(s,'calculation');assert.equal(s.snapshot.learner.skills.QFN1,'stable');s.next();assert.equal(s.snapshot.problem?.skillId,'QFN2');});
test('calculation failure retains method evidence; explanation retry has a different problem at same difficulty',()=>{const s=new LearningService();s.switchProfile('quadratic');s.continueLearning();submit(s);s.next();const previous=s.snapshot.problem!;submit(s,'calculation');assert.equal(s.snapshot.result?.assessment.solved,false);assert.equal(s.snapshot.result?.assessment.dimensions.method,'success');s.explanation();s.next();const next=s.snapshot.problem!;assert.notEqual(next.id,previous.id);assert.equal(next.skillId,previous.skillId);assert.equal(next.difficulty,previous.difficulty);assert.equal(s.snapshot.learner.humanExp,1);});
test('unreadable mock answer is unresolved with readability tag',()=>{const s=new LearningService();s.switchProfile('quadratic');s.continueLearning();submit(s,'unreadable');assert.equal(s.snapshot.result?.assessment.solved,false);assert.ok(s.snapshot.result?.assessment.tags.includes('handwriting_unreadable'));});
test('two prerequisite failures cause minimal repair; two repair successes return exact original',()=>{
 const s=new LearningService();s.switchProfile('quadratic');s.continueLearning();submit(s);s.next();submit(s,'prerequisite');
 const first=s.snapshot;assert.equal(first.learner.repair,null);
 s.explanation();s.next();const original=s.snapshot.problem!.id;submit(s,'prerequisite');
 const second=s.snapshot;assert.equal(second.learner.repair?.repairSkillId,'HSX2');assert.equal(second.learner.activeUnit,'QFN');
 s.next();assert.equal(s.snapshot.problem?.skillId,'HSX2');submit(s);s.next();submit(s);assert.equal(s.snapshot.result?.repaired,true);assert.equal(s.snapshot.learner.activeUnit,'QFN');s.next();assert.equal(s.snapshot.problem?.id,original);assert.equal(s.snapshot.learner.resume,null);assert.equal(s.snapshot.learner.repair,null);
});
test('stable creates a mathematical stopping point, then advances skill',()=>{const s=new LearningService();s.switchProfile('quadratic');s.continueLearning();submit(s);s.next();submit(s);s.next();submit(s);assert.equal(s.snapshot.learner.skills.QFN2,'stable');s.next();assert.equal(s.snapshot.screen,'home');assert.equal(s.snapshot.ended,true);s.continueLearning();assert.equal(s.snapshot.problem?.skillId,'QFN3');});
test('MAX 2/3 to MAX opens QFN; behavior EXP is separate',()=>{const s=new LearningService();s.switchProfile('max-two');const before=s.snapshot.learner.humanExp;assert.equal(s.snapshot.evidence.length,2);assert.equal(unitStatus(master,s.snapshot.learner,'QFN'),'LOCKED');s.startMax();submit(s);assert.equal(s.snapshot.result?.acquired,true);assert.equal(s.snapshot.learner.humanExp,before+1);assert.equal(unitStatus(master,s.snapshot.learner,'QFN'),'OPEN');s.next();s.continueLearning();assert.equal(s.snapshot.learner.activeUnit,'QFN');});
test('MAX failure preserves stable; same day is blocked even after navigation',()=>{const s=new LearningService();s.switchProfile('max-two');const skills=s.snapshot.learner.skills;s.startMax();submit(s,'case_split');assert.deepEqual(s.snapshot.learner.skills,skills);s.navigate('max');assert.throws(()=>s.startMax(),/本日の/);assert.equal(s.snapshot.learner.maxAttempts.QEQ.length,3);});
test('MAX evidence expires after date advance without granting MAX',()=>{const s=new LearningService();s.switchProfile('max-two');assert.equal(s.snapshot.evidence.length,2);s.advanceDay(8);assert.equal(s.snapshot.evidence.length,0);s.startMax();submit(s);assert.equal(s.snapshot.result?.acquired,false);assert.ok(!s.snapshot.learner.maxUnits.includes('QEQ'));});
test('open unit allows MAX before internal stable; three distinct days unlock upper unit',()=>{const s=new LearningService();s.continueLearning();submit(s,'prerequisite');s.next();submit(s);s.next();s.acceptDiagnosis();for(let i=0;i<3;i++){s.startMax();submit(s);if(i<2){s.next();s.advanceDay();}}assert.equal(s.snapshot.learner.maxUnits.includes('CAL'),true);assert.equal(unitStatus(master,s.snapshot.learner,'EXP'),'OPEN');});
test('profile repair and complete are operable',()=>{const s=new LearningService();s.switchProfile('repair');s.continueLearning();assert.equal(s.snapshot.current?.context,'repair');submit(s);s.next();submit(s);s.next();assert.equal(s.snapshot.problem?.skillId,'QFN3');s.switchProfile('complete');assert.equal(s.snapshot.learner.maxUnits.length,7);assert.equal(s.snapshot.task.kind,'complete');});
test('double submission rejected without duplicate assessment or evidence',()=>{const s=new LearningService();s.switchProfile('max-two');s.startMax();submit(s);const before=s.snapshot.learner;assert.throws(()=>s.submit('correct'));assert.deepEqual(s.snapshot.learner,before);});
test('UI snapshots cannot mutate learner; non-development mode rejects mock writes and clock controls',()=>{const s=new LearningService();const copy=s.snapshot;copy.learner.maxUnits.push('CAL');assert.deepEqual(s.snapshot.learner.maxUnits,[]);const prod=new LearningService(false);prod.continueLearning();prod.submission();assert.throws(()=>prod.submit('correct'));assert.throws(()=>prod.advanceDay());assert.throws(()=>prod.switchProfile('complete'));});
test('MAX failure can be followed by next-day success without resetting profile or stable',()=>{const s=new LearningService();s.switchProfile('max-two');s.startMax();submit(s,'calculation');const before=s.snapshot.learner.skills;s.advanceDay();s.startMax();submit(s);assert.equal(s.snapshot.result?.acquired,true);assert.deepEqual(s.snapshot.learner.skills,before);});
test('viewing explanation after stable still leads to another problem at the same level',()=>{const s=new LearningService();s.switchProfile('quadratic');s.continueLearning();submit(s);s.next();submit(s);s.next();const old=s.snapshot.problem!;submit(s);s.explanation();s.next();assert.notEqual(s.snapshot.problem!.id,old.id);assert.equal(s.snapshot.problem!.skillId,old.skillId);assert.equal(s.snapshot.problem!.difficulty,old.difficulty);});
test('end-to-end fresh learner: exhausted practice pool still alternates repair tasks, resumes, reaches MAX and unlocks',()=>{
 const s=new LearningService();s.continueLearning();submit(s,'prerequisite');s.next();submit(s);s.next();s.acceptDiagnosis();
 s.continueLearning();submit(s);s.next(); // warmup
 submit(s,'calculation');s.explanation();s.next();submit(s);s.next();submit(s);s.next(); // CAL1 stable
 s.continueLearning();submit(s);s.next(); // CAL2 stable using diagnostic evidence
 s.continueLearning();submit(s,'prerequisite');s.explanation();s.next();submit(s,'prerequisite');const original=s.snapshot.problem!.id;s.next();
 const first=s.snapshot.problem!.id;submit(s);s.next();assert.notEqual(s.snapshot.problem!.id,first);
 submit(s);assert.equal(s.snapshot.result?.repaired,true);s.next();assert.equal(s.snapshot.problem!.id,original);
 submit(s);s.next();submit(s);s.next();assert.equal(s.snapshot.screen,'home');
 for(let day=0;day<3;day++){s.startMax();submit(s);s.next();if(day<2)s.advanceDay();}
 assert.equal(unitStatus(master,s.snapshot.learner,'CAL'),'MAX');assert.equal(unitStatus(master,s.snapshot.learner,'EXP'),'OPEN');
});
