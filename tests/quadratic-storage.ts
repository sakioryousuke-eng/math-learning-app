import {IndexedDbLearningRepository} from '../src/persistence/indexeddb-repository.ts';
import {LearningApplication} from '../src/application/learning-application.ts';
import {ManualClock} from '../src/application/clock.ts';
import {reviewedCurriculum as current,steps} from '../src/curriculum/quadratic.ts';
import {curriculum as old} from '../src/curriculum/master.ts';
import {decodeDocument} from '../src/persistence/model.ts';
const result=document.querySelector('#result')!;
const checks:string[]=[];
function assert(condition:unknown,label:string):asserts condition{if(!condition)throw new Error(label);checks.push(`PASS ${label}`);}
async function run(){
 const clock=new ManualClock('2026-09-08T03:00:00Z');
 for(const profile of ['quadratic','repair','complete'] as const){
  const name=`qfn-test-migration-${profile}-${crypto.randomUUID()}`;
  const repo=new IndexedDbLearningRepository(indexedDB,name),app=new LearningApplication(repo,clock,true,old);
  await app.boot();await app.useDemo(profile);if(profile==='quadratic')await app.execute(()=>app.service.continueLearning());
  const before=decodeDocument(await repo.load(app.namespace),app.namespace,old);await repo.close();
  const nextRepo=new IndexedDbLearningRepository(indexedDB,name),next=new LearningApplication(nextRepo,clock,true,current);await next.boot();
  const after=decodeDocument(await nextRepo.load(next.namespace),next.namespace,current);
  assert(JSON.stringify(before.checkpoint.learner.assessments)===JSON.stringify(after.checkpoint.learner.assessments),`${profile}: histories retained`);
  assert(JSON.stringify(before.checkpoint.learner.repair)===JSON.stringify(after.checkpoint.learner.repair),`${profile}: repair return retained`);
  assert(JSON.stringify(before.checkpoint.learner.maxUnits)===JSON.stringify(after.checkpoint.learner.maxUnits),`${profile}: MAX retained`);
  assert(steps.flatMap(s=>s.skills).every(id=>after.checkpoint.learner.skills[id]==='unseen'),`${profile}: no invented new stable`);
  if(profile==='quadratic'){assert(after.checkpoint.current?.problemId===before.checkpoint.current?.problemId,'old interrupted problem ID retained');assert(after.checkpoint.screen==='home','unreviewed problem quarantined');}
  await nextRepo.close();
 }
 const name=`qfn-test-new-${crypto.randomUUID()}`,repo=new IndexedDbLearningRepository(indexedDB,name),app=new LearningApplication(repo,clock,true,current);
 await app.boot();await app.useDemo('quadratic');await app.execute(()=>app.service.continueLearning());await app.execute(()=>app.service.showIntroduction());
 const id=app.service.snapshot.problem!.id;await repo.close();
 const nextRepo=new IndexedDbLearningRepository(indexedDB,name),next=new LearningApplication(nextRepo,clock,true,current);await next.boot();
 assert(next.service.snapshot.problem?.id===id,'reviewed problem resumes in new repository connection');
 assert(next.service.exportCheckpoint().hintedProblems.includes(id),'hint evidence survives browser IndexedDB reopen');
 await nextRepo.close();
 result.textContent=checks.join('\n')+`\nALL ${checks.length} CHECKS PASSED`;
}
void run().catch(error=>{result.textContent=checks.join('\n')+'\nFAIL '+String(error);});
