import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildTratioBank,sameValues} from '../src/tratio-bank/generate.ts';
import {productionTratioCurriculum as c,productionTratioPaperSpecs as specs,tratioBankRecords as rows,tratioMaxRecords as max,tratioBankArtifact as artifact} from '../src/tratio-bank/catalog.ts';
import {selectTratioPractice,tratioMaxReady} from '../src/tratio-bank/selector.ts';
import {coordinateOracle,type RightTriangleScene,rightVariants} from '../src/prototype/tratio-right.ts';
import {generalOracle,inspectTriangle,enumerateSSA,type GeneralTriangleScene,generalVariants} from '../src/prototype/tratio-general.ts';
import {integratedOracle,integratedTratioVariants,type IntegratedTratioProblem} from '../src/prototype/tratio-integrated.ts';
import {tratioLessons,tratioSkills,tratioSteps,normalTratio} from '../src/tratio/lessons.ts';
import {tratioCurriculum as previous} from '../src/tratio/catalog.ts';
import {bankCurriculum} from '../src/bank/catalog.ts';
import {canUse,stableReady} from '../src/learning/material-policy.ts';
import {createLearner} from '../src/math-master/learner.ts';
import {LearningService} from '../src/services/learning-service.ts';
import {gradeMock} from '../src/services/mock-grader.ts';
import {unitStatus} from '../src/math-master/unlock.ts';
import {LearningApplication} from '../src/application/learning-application.ts';
import {ManualClock} from '../src/application/clock.ts';
import {MemoryLearningRepository} from '../src/persistence/repository.ts';
import {migrateDocument} from '../src/curriculum/migration.ts';
import {decodeDocument} from '../src/persistence/model.ts';
import {tratioBankExplanation,renderTratioBank} from '../src/tratio-bank/view.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const pool=(skill:string)=>c.problems.filter(p=>p.skillId===skill&&p.purpose==='practice'&&canUse(c,p,'practice'));
const success=(id:string)=>{const p=c.problems.find(p=>p.id===id)!;return gradeMock(p,'correct','success-'+id,'2026-09-15T00:00:00Z','practice');};
const maxService=()=>{const s=new LearningService(true,c);s.openReviewedPreview(max[0].id,true);return s;};
const answer=(s:LearningService,correct=true,complete=true)=>{const p=s.snapshot.problem!,spec=specs[p.id];s.submission();s.submitChoice(spec.choices.find(c=>c.correct===correct)!.choiceId,complete?spec.checks.map(c=>c.id):[]);};

test('TRATIO production budgets, statuses, steps, retained reviewed and repair',()=>{
 assert.equal(rows.length,48);assert.equal(max.length,3);assert.deepEqual(['TR-RIGHT-MEASURE','TR-GENERAL-MEASURE','TR-INTEGRATED-JUDGMENT'].map(f=>rows.filter(p=>p.familyId===f).length),[14,16,18]);
 assert.deepEqual(['STANDARD','APPLIED','PRACTICAL'].map(d=>rows.filter(p=>p.difficultyTier===d).length),[8,20,20]);assert.deepEqual([1,2,3,4].map(s=>rows.filter(p=>p.step===s).length),[0,14,16,18]);
 assert.equal(normalTratio.length,22);assert.equal(tratioLessons.filter(l=>l.kind==='repair').length,2);
 assert.equal(c.problems.filter(p=>c.master.skills.find(s=>s.id===p.skillId)?.unitId==='TRATIO'&&canUse(c,p,'practice')).length,70);
 assert.equal(c.problems.filter(p=>c.master.skills.find(s=>s.id===p.skillId)?.unitId==='TRATIO'&&canUse(c,p,'max')).length,3);
 assert.ok(rows.every(p=>p.reviewStatus==='verified-generated'&&canUse(c,p,'practice')&&!canUse(c,p,'repair')&&!canUse(c,p,'max')&&!canUse(c,p,'diagnostic')));
 assert.ok(c.problems.filter(p=>p.reviewStatus==='unreviewed').every(p=>!canUse(c,p,'practice')));
});
test('static artifact byte reproducibility, safe parameters and boundaries',()=>{assert.equal(JSON.stringify(buildTratioBank(),null,2)+'\n',readFileSync(new URL('../data/tratio-bank.json',import.meta.url),'utf8'));assert.equal(artifact.audit.mathematicalCases,156);assert.equal(artifact.audit.boundaryCases,24);});
for(const locale of ['ja','en'])test(`TRATIO deterministic tie-break under ${locale} host collation`,()=>{const compare=String.prototype.localeCompare;String.prototype.localeCompare=function(that:string,locales?:string|string[],options?:Intl.CollatorOptions){return compare.call(this,that,locales??locale,options);};try{assert.deepEqual(JSON.parse(JSON.stringify(buildTratioBank())),artifact);}finally{String.prototype.localeCompare=compare;}});
test('duplicate audit keeps original signatures and permits only 0/1/2 SSA existence exception',()=>{assert.equal(new Set(rows.map(p=>p.prompt)).size,48);assert.equal(new Set(rows.map(p=>p.variantId)).size,48);assert.ok(Object.keys(artifact.audit.signatures).length>=30);for(const [sig,count] of Object.entries(artifact.audit.signatures)){assert.ok(count<=2||sig==='SSA_RAY_CIRCLE_EXISTENCE'&&count===3);}for(const p of rows)assert.ok(!normalTratio.some(l=>l.problem.prompt===p.prompt));});
for(const p of rows)test(`TRATIO production independent geometry, labels and choices: ${p.id}`,()=>{
 const param=p.parameters as {model:RightTriangleScene|GeneralTriangleScene|{scene:RightTriangleScene;target:IntegratedTratioProblem['target']}};
 const oracle=p.familyId==='TR-RIGHT-MEASURE'?coordinateOracle(param.model as RightTriangleScene):p.familyId==='TR-GENERAL-MEASURE'?generalOracle(param.model as GeneralTriangleScene).values:[integratedOracle((param.model as {scene:RightTriangleScene}).scene,(param.model as {target:IntegratedTratioProblem['target']}).target)];
 assert.ok(sameValues(oracle,p.expected));assert.equal(p.choices.length,4);assert.equal(p.choices.filter(c=>c.correct).length,1);assert.equal(new Set(p.choices.map(c=>c.text)).size,4);assert.ok(sameValues(p.choices.find(c=>c.correct)!.values,oracle));
 for(const [i,a] of p.choices.entries())for(const b of p.choices.slice(i+1))assert.equal(sameValues(a.values,b.values),false);
 assert.ok(p.choices.filter(c=>!c.correct).every(c=>c.hypothesis?.hypothesisOnly&&c.hypothesis.description&&c.values.every(Number.isFinite)));
 assert.ok(p.problemFigure.includes('<svg'));assert.doesNotMatch(p.problemFigure,/data-general-auxiliary="true"|data-right-auxiliary="true"/);assert.ok(p.solutionFigure.includes('<svg'));
 for(const h of ['考え方','解き方','図で確かめる','答え'])assert.ok(tratioBankExplanation(p).includes(h));assert.ok(p.explanation.steps.length>=2);assert.ok(p.explanation.answer===p.answer);
 assert.ok(p.problemRequirements.length);assert.ok(p.crossSkills.every(x=>c.master.crossSkills.some(k=>k.id===x)));
 const scene=p.familyId==='TR-GENERAL-MEASURE'?null:p.familyId==='TR-RIGHT-MEASURE'?param.model as RightTriangleScene:(param.model as {scene:RightTriangleScene}).scene;
 if(scene)for(const k of scene.knownLengths)near(Math.hypot(scene.points[k.ends[0]][0]-scene.points[k.ends[1]][0],scene.points[k.ends[0]][1]-scene.points[k.ends[1]][1]),k.value);
});
for(const [i,p] of max.entries())test(`TRATIO fixed MAX ${i+1}: independent original geometry, six answers, strict checks`,()=>{
 let expected:number[]=[];
 if(i===2){const ts=enumerateSSA(30,5,5*Math.sqrt(2)).sort((a,b)=>b.B[0]-a.B[0]);expected=ts.flatMap(t=>{const g=inspectTriangle(t);return [g.c,g.area];}).concat(inspectTriangle(ts[0]).R);}
 else {const m=p.parameters as RightTriangleScene,points=m.points,ids=i===0?['B','D','E']:['A','B','C'];const g=inspectTriangle({A:points[ids[0]],B:points[ids[1]],C:points[ids[2]]});expected=[g.area,g.R];for(const k of m.knownLengths)near(Math.hypot(points[k.ends[0]][0]-points[k.ends[1]][0],points[k.ends[0]][1]-points[k.ends[1]][1]),k.value);}
 assert.ok(sameValues(expected,p.expected));assert.equal(p.choices.length,6);assert.equal(p.choices.filter(c=>c.correct).length,1);
 for(const [j,a] of p.choices.entries())for(const b of p.choices.slice(j+1))assert.equal(sameValues(a.values,b.values),false);
 assert.doesNotMatch(p.prompt,/使え|用いよ|正弦定理|余弦定理|まず.*求め/);assert.ok(p.explanation.steps.length>=4);
 for(const id of ['no-hint','no-answer','not-guess','complete','original','readable'])assert.ok(specs[p.id].checks.some(c=>c.id===id));
 assert.ok(p.candidateAudit);assert.ok(p.validation.rules.length>=15);
});
test('first exposure starts reviewed, generated practice adapts and avoids recent variants/structures',()=>{
 const l=createLearner(c.master),skill='TR-RIGHT',ps=pool(skill);l.skills[skill]='learning';assert.equal(selectTratioPractice(c,l,skill,ps,[])!.reviewStatus,'reviewed');
 const reviewed=ps.find(p=>p.reviewStatus==='reviewed')!;l.assessments=[success(reviewed.id)];let q=selectTratioPractice(c,l,skill,ps,[reviewed.id])!;assert.equal(q.reviewStatus,'verified-generated');assert.equal(rows.find(p=>p.id===q.id)!.difficultyTier,'STANDARD');
 l.assessments.push(success(q.id));let next=selectTratioPractice(c,l,skill,ps,[reviewed.id,q.id])!;assert.equal(rows.find(p=>p.id===next.id)!.difficultyTier,'APPLIED');assert.notEqual(next.independenceKey,q.independenceKey);
 l.skills[skill]='stable';next=selectTratioPractice(c,l,skill,ps,[reviewed.id,q.id])!;assert.equal(rows.find(p=>p.id===next.id)!.difficultyTier,'PRACTICAL');
});
test('same structure variants cannot make stable, different structures can',()=>{const pair=rows.filter(p=>p.structureSignature==='INVERSE_SIDE_TO_ANGLE');assert.equal(pair.length,2);assert.equal(stableReady(c,pair[0].skillId,pair.map(p=>success(p.id))),false);const other=rows.find(p=>p.skillId===pair[0].skillId&&p.structureSignature!==pair[0].structureSignature)!;assert.ok(stableReady(c,pair[0].skillId,[success(pair[0].id),success(other.id)]));});
test('positive and narrow mistaken evidence persists, without broad failure ratings',()=>{const s=new LearningService(true,c);s.openReviewedPreview(rows[0].id);answer(s);const a=s.snapshot.result!.assessment;assert.equal(a.generatedEvidence!.structureSignature,rows[0].structureSignature);assert.ok(Object.values(a.crossSkills).every(v=>v==='success'));assert.ok(!a.generatedEvidence!.mistakeHypotheses.length);const w=new LearningService(true,c);w.openReviewedPreview(rows[0].id);answer(w,false);assert.equal(w.snapshot.result!.assessment.generatedEvidence!.mistakeHypotheses.length,1);assert.deepEqual(w.snapshot.result!.assessment.crossSkills,{});assert.equal(w.snapshot.learner.repair,null);});
test('MAX refuses before any one of the seven skills is stable',()=>{for(const [id] of tratioSkills){const s=maxService(),cp=s.exportCheckpoint();cp.current=null;cp.learner.skills[id]='learning';s.restoreCheckpoint(cp);assert.throws(()=>s.startMax(),/7技能/);assert.equal(s.snapshot.learner.maxUnits.includes('TRATIO'),false);}});
test('MAX strict one-success override, failed retry is fresh on the same day, stable remains',()=>{const s=maxService();answer(s,false);assert.ok(tratioSkills.every(([id])=>s.snapshot.learner.skills[id]==='stable'));assert.equal(s.snapshot.learner.maxUnits.includes('TRATIO'),false);const first=s.snapshot.problem!.id;s.next();s.startMax();assert.notEqual(s.snapshot.problem!.id,first);answer(s,true,false);assert.equal(s.snapshot.learner.maxUnits.includes('TRATIO'),false);s.next();s.startMax();assert.notEqual(s.snapshot.problem!.id,first);answer(s);assert.ok(s.snapshot.result!.acquired);assert.ok(s.snapshot.learner.maxUnits.includes('TRATIO'));assert.equal(s.snapshot.learner.maxAttempts.TRATIO.length,3);assert.equal(new Set(s.snapshot.learner.maxAttempts.TRATIO.map(a=>a.at.slice(0,10))).size,1);});
test('one first strict success earns MAX; mock, hint or immediate same candidate cannot',()=>{const s=maxService();answer(s);assert.ok(s.snapshot.learner.maxUnits.includes('TRATIO'));assert.equal(s.snapshot.learner.maxAttempts.TRATIO.length,1);const mock=maxService();mock.submission();assert.throws(()=>mock.submit('correct'),/6択/);const hinted=maxService(),cp=hinted.exportCheckpoint();cp.hintedProblems.push(max[0].id);hinted.restoreCheckpoint(cp);answer(hinted);assert.equal(hinted.snapshot.learner.maxUnits.includes('TRATIO'),false);const repeat=maxService(),r=repeat.exportCheckpoint();r.learner.maxAttempts.TRATIO=s.snapshot.learner.maxAttempts.TRATIO;repeat.restoreCheckpoint(r);repeat.submission();assert.throws(()=>repeat.submitChoice(specs[max[0].id].choices[0].choiceId,specs[max[0].id].checks.map(c=>c.id)),/異なるMAX/);});
test('PRACTICAL practice cannot grant MAX; technical errors leave all mathematical evidence untouched',()=>{const s=new LearningService(true,c);s.openReviewedPreview(rows.find(p=>p.difficultyTier==='PRACTICAL')!.id,true);const before=s.snapshot.learner;s.recordTechnicalError('PROVIDER_ERROR');assert.deepEqual(s.snapshot.learner,before);answer(s);assert.equal(s.snapshot.learner.maxUnits.includes('TRATIO'),false);assert.equal(s.snapshot.learner.maxAttempts.TRATIO?.length??0,0);});
test('TRIG opens exactly for both MAX, never either stable substitute',()=>{for(const q of [false,true])for(const t of [false,true]){const l=createLearner(c.master);for(const id of Object.keys(l.skills))l.skills[id]='stable';l.maxUnits=[...(q?['QFN']:[]),...(t?['TRATIO']:[])];assert.equal(unitStatus(c.master,l,'TRIG'),q&&t?'OPEN':'LOCKED');}});
test('additive migration preserves reviewed progress, repair/resume and old history but not old MAX',async()=>{const repo=new MemoryLearningRepository(),clock=new ManualClock('2026-09-15T00:00:00Z'),app=new LearningApplication(repo,clock,true,previous);await app.boot();await app.useReviewedPreview('TR-SINE-R1-1',true);const raw=decodeDocument(await repo.load(app.namespace),app.namespace,previous);raw.checkpoint.learner.maxUnits.push('TRATIO');const next=migrateDocument(raw,app.namespace,c,new Date(clock.now()).toISOString());assert.deepEqual(next.checkpoint.learner.skills,raw.checkpoint.learner.skills);assert.deepEqual(next.checkpoint.current,raw.checkpoint.current);assert.deepEqual(next.checkpoint.learner.repair,raw.checkpoint.learner.repair);assert.deepEqual(next.checkpoint.learner.resume,raw.checkpoint.learner.resume);assert.deepEqual(next.checkpoint.learner.assessments,raw.checkpoint.learner.assessments);assert.ok(!next.checkpoint.learner.maxUnits.includes('TRATIO'));assert.deepEqual(next.migration!.previousCheckpoint,raw.checkpoint);});
test('production choice evidence round-trip and verify isolation',async()=>{const repo=new MemoryLearningRepository(),app=new LearningApplication(repo,new ManualClock('2026-09-15T00:00:00Z'),true,c);await app.boot();const student=await repo.load('student:local');await app.useReviewedPreview(rows[0].id);await app.execute(()=>answer(app.service));const restored=new LearningApplication(repo,new ManualClock('2026-09-15T00:00:00Z'),true,c);await restored.boot();assert.deepEqual(restored.service.snapshot.result,app.service.snapshot.result);assert.deepEqual(await repo.load('student:local'),student);});
test('QFN, prototype families, reviewed TRATIO and curriculum gate remain unchanged',()=>{
 assert.equal(hash([tratioLessons,tratioSkills,tratioSteps]),'925e95fb5c51c6e0a9765a0a7a711aacbb6b5319021e791693454e77a376ff94');
 assert.equal(hash(bankCurriculum),'e9da9a3b33b9ebcd775c57fa4c4b375090c5d8b7a5027d7f77c8e3585497e3a8');
 assert.equal(hash(rightVariants),'361399178e460f435d8f02cb6a9ab4391eca949f809faf6a6fb95e22dc65e710');assert.equal(hash(generalVariants),'8d02bbaef80fb704bf9c0275576e57f428f6b544e43e4e1b40b60407ff2a9882');assert.equal(integratedTratioVariants.length,12);
 assert.deepEqual(c.generatedBank,previous.generatedBank);assert.deepEqual(c.master,previous.master);assert.deepEqual(c.stablePolicies,previous.stablePolicies);assert.deepEqual(c.problems.filter(p=>!p.id.startsWith('TR-BANK')&&!p.id.startsWith('TR-MAX-FINAL')),previous.problems);
 assert.ok(renderTratioBank().includes('通常70題'));assert.ok(renderTratioBank().includes('固定MAX3候補'));
});

test('repeated narrow production hypothesis triggers reviewed repair and resumes original series',()=>{
 const s=new LearningService(true,c),problems=rows.filter(p=>p.skillId==='TR-SINE'&&p.choices.some(c=>c.hypothesis?.type==='sine_ratio_reversal')).slice(0,2);assert.equal(problems.length,2);
 s.openReviewedPreview(problems[0].id);
 for(const p of problems){const cp=s.exportCheckpoint();cp.current={problemId:p.id,context:'practice',probe:false};cp.result=null;cp.screen='problem';s.restoreCheckpoint(cp);s.submission();s.submitChoice(p.choices.find(c=>c.hypothesis?.type==='sine_ratio_reversal')!.choiceId,[]);}
 assert.equal(s.snapshot.learner.repair?.returnToProblemId,problems[1].id);assert.equal(s.snapshot.learner.activeUnit,'TRATIO');
 for(let i=0;i<2;i++){s.next();assert.ok(s.snapshot.problem!.id.includes('REPAIR'));assert.equal(s.snapshot.problem!.reviewStatus,'reviewed');answer(s);}
 assert.ok(s.snapshot.result!.repaired);s.next();assert.equal(s.snapshot.problem!.id,problems[1].id);assert.equal(s.snapshot.learner.activeUnit,'TRATIO');
});
test('production service progresses from reviewed introduction into generated practice',()=>{const s=new LearningService(true,c);s.openReviewedPreview('TR-RIGHT-R1-1');answer(s);s.next();assert.equal(s.snapshot.problem!.reviewStatus,'verified-generated');});
test('a saved narrow weakness lowers target difficulty and changes next mathematical structure',()=>{const skill='TR-RIGHT',l=createLearner(c.master),ps=pool(skill),intro=ps.find(p=>p.reviewStatus==='reviewed')!,last=rows.find(p=>p.skillId===skill&&p.difficultyTier==='PRACTICAL')!;l.skills[skill]='stable';l.assessments=[success(intro.id)];const failed=success(last.id);failed.solved=false;failed.tratioEvidence={choiceId:'test',mistakeType:'side_correspondence',description:'対応の候補',crossSkills:['X04'],repairSkillId:skill,hypothesisOnly:true};l.assessments.push(failed);const next=selectTratioPractice(c,l,skill,ps,[last.id])!;assert.equal(rows.find(p=>p.id===next.id)!.difficultyTier,'STANDARD');assert.notEqual(next.independenceKey,last.independenceKey);});
test('MAX records and acquisition date persist under new one-success catalog',async()=>{const repo=new MemoryLearningRepository(),app=new LearningApplication(repo,new ManualClock('2026-09-15T00:00:00Z'),true,c);await app.boot();await app.useReviewedPreview(max[0].id,true);await app.execute(()=>answer(app.service));const restored=new LearningApplication(repo,new ManualClock('2026-09-15T00:00:00Z'),true,c);await restored.boot();assert.ok(restored.service.snapshot.learner.maxUnits.includes('TRATIO'));assert.equal(restored.service.snapshot.learner.maxAttempts.TRATIO.length,1);assert.equal(restored.snapshot.maxHistory.find(h=>h.unitId==='TRATIO')!.independentSuccessCount,1);assert.ok(restored.snapshot.maxHistory.find(h=>h.unitId==='TRATIO')!.acquiredAt);assert.ok(restored.snapshot.evidence.find(e=>e.problemId===max[0].id)!.isMaxEvidence);});

test('active reviewed repair and resume migrate without losing return targets',async()=>{const repo=new MemoryLearningRepository(),clock=new ManualClock('2026-09-15T00:00:00Z'),app=new LearningApplication(repo,clock,true,previous);await app.boot();await app.useReviewedPreview('TR-SINE-R1-1');await app.execute(()=>{const s=app.service;for(let i=0;i<2;i++){if(i)s.next();const p=tratioLessons.find(l=>l.problem.id===s.snapshot.problem!.id)!;s.submission();s.submitChoice(p.choices.find(c=>c.hypothesis?.type==='opposite')!.choiceId,[]);}});const old=decodeDocument(await repo.load(app.namespace),app.namespace,previous);assert.ok(old.checkpoint.learner.repair);const migrated=migrateDocument(old,app.namespace,c,new Date(clock.now()).toISOString());assert.deepEqual(migrated.checkpoint.learner.repair,old.checkpoint.learner.repair);assert.deepEqual(migrated.checkpoint.learner.skills,old.checkpoint.learner.skills);const resumed=structuredClone(old);resumed.checkpoint.learner.resume={skillId:'TR-SINE',problemId:'TR-SINE-R1-2'};resumed.checkpoint.learner.repair=null;assert.deepEqual(migrateDocument(resumed,app.namespace,c,new Date(clock.now()).toISOString()).checkpoint.learner.resume,resumed.checkpoint.learner.resume);});
test('invalid choice is a technical rejection with zero mathematical mutation',()=>{const s=maxService();s.submission();const before=s.exportCheckpoint();assert.throws(()=>s.submitChoice('missing-choice',[]));assert.deepEqual(s.exportCheckpoint(),before);});

test('after reviewing failed fixed candidates, a different fresh attempt is still possible without day wait',()=>{const s=maxService();for(let i=0;i<3;i++){answer(s,false);s.explanation();s.next();s.startMax();}assert.equal(s.snapshot.problem!.id,max[0].id);assert.ok(!s.snapshot.hintedProblems.includes(max[0].id));answer(s);assert.ok(s.snapshot.result!.acquired);});
