import {LearningService} from '../services/learning-service.ts';
import {seedVerification} from './verification.ts';
import type {VerificationState} from './verification.ts';
import type {Profile} from '../services/learning-service.ts';
import type {LearningRepository} from '../persistence/repository.ts';
import {curriculumVersion,decodeDocument,PersistenceError} from '../persistence/model.ts';
import type {LearningDocument,LearningSession} from '../persistence/model.ts';
import {SystemClock} from './clock.ts';
import type {Clock} from './clock.ts';
import {legacyCatalog} from '../services/catalog.ts';
import type {LearningCatalog} from '../curriculum/types.ts';
import {migrateDocument} from '../curriculum/migration.ts';
import {maxEvidence} from '../math-master/max.ts';
import {unitStatus} from '../math-master/unlock.ts';
export function mathematicsRank(p:LearningDocument['checkpoint']['learner']){return {value:p.maxUnits.length,basis:'MAX単元数',version:1};}
export class LearningApplication {
 readonly service:LearningService;
 private catalog:LearningCatalog;
 private get master(){return this.catalog.master;} // Temporary grading provider, including ordinary local learning.
 private repo:LearningRepository;private time:Clock;private development:boolean;
 private document:LearningDocument|null=null;private busy=false;
 constructor(repository:LearningRepository,clock:Clock=new SystemClock(),development=false,catalog:LearningCatalog=legacyCatalog){this.repo=repository;this.time=clock;this.development=development;this.catalog=catalog;this.service=new LearningService(true,catalog);}
 get namespace(){return this.document?.namespace??'student:local';}
 get snapshot(){
  if(!this.document)throw new PersistenceError('LOAD','保存データはまだ読み込まれていません。');
  const d=structuredClone(this.document),p=d.checkpoint.learner;
  const maxHistory=Object.entries(p.maxAttempts).flatMap(([unitId,attempts])=>attempts.map(a=>{const evidence=maxEvidence(this.master,p,unitId,a.at);return {unitId,challengeDate:a.at,problemId:a.problemId,success:a.noHint&&a.noMethodSpecified&&a.independent&&a.examQuality&&a.practicalTime&&a.correctConclusion&&a.readable&&a.sufficientWriting,independentSuccessCount:evidence.length,acquiredAt:evidence.length>=3?a.at:null};}));
  return {student:d.student,sessions:d.sessions,repairs:d.repairs,maxHistory,humanExp:{totalExp:p.humanExp,level:1+Math.floor(p.humanExp/5),events:d.expEvents},rank:mathematicsRank(p),map:this.master.units.map(u=>({unitId:u.id,status:unitStatus(this.master,p,u.id),requiredMax:u.prerequisites.filter(id=>!p.maxUnits.includes(id))})),evidence:p.assessments.map(a=>({assessmentId:a.id,skillId:a.skillId,problemId:a.problemId,result:a.solved?'correct':'unresolved',errorTags:a.tags,timestamp:a.at,evidenceType:a.context,isMaxEvidence:a.context==='max'&&Object.keys(p.maxAttempts).some(unit=>maxEvidence(this.master,p,unit,a.at).some(e=>e.problemId===a.problemId&&e.at===a.at))||Object.values(p.diagnosticMaxEvidence).flat().some(e=>e.assessmentId===a.id)})),diagnostic:{completed:p.diagnosticCompleted,passed:d.checkpoint.passed,pending:p.diagnosticPending,evidence:p.assessments.filter(a=>a.context==='diagnostic')},revision:d.revision,namespace:d.namespace};
 }
 private async exclusive(work:()=>Promise<void>){if(this.busy)throw new PersistenceError('BUSY','保存中です。少し待ってから操作してください。');this.busy=true;try{await work();}finally{this.busy=false;}}
 async boot(){await this.exclusive(async()=>{const active=await this.repo.activeNamespace();await this.open(this.development&&active?.startsWith('demo:')?active:'student:local');});}
 private fresh(namespace:string,seed?:()=>void):LearningDocument{
  const temporary=new LearningService(true,this.catalog);this.service.restoreCheckpoint(temporary.exportCheckpoint());
  if(seed)seed();
  const c=this.service.exportCheckpoint(),now=this.time.now(),delta=now-c.clock;
  if(namespace.startsWith('demo:')){
   for(const a of c.learner.assessments)a.at=new Date(Date.parse(a.at)+delta).toISOString();
   for(const a of Object.values(c.learner.maxAttempts).flat())a.at=new Date(Date.parse(a.at)+delta).toISOString();
  }
  c.clock=now;c.learner.id=namespace==='student:local'?crypto.randomUUID():namespace;
  this.service.restoreCheckpoint(c);const at=new Date(now).toISOString();
  return {schemaVersion:1,curriculumVersion:this.catalog.version,namespace,revision:1,student:{learnerId:c.learner.id,createdAt:at,lastActiveAt:at},checkpoint:c,repairs:[],sessions:[],expEvents:[]};
 }
 private newSession(d:LearningDocument){
  const at=this.service.snapshot.now;const previous=d.sessions.at(-1);if(previous&&!previous.end)previous.end=d.student.lastActiveAt;
  const session:LearningSession={id:crypto.randomUUID(),start:at,end:null,completedTasks:[],sessionCheckpoint:{screen:this.service.snapshot.screen,problemId:this.service.snapshot.current?.problemId??null}};
  d.sessions.push(session);this.service.beginPersistedSession();
 }
 private async open(namespace:string,seed?:()=>void,reset=false){
  const before=this.service.exportCheckpoint(),old=this.document;
  try{
   const raw=await this.repo.load(namespace),saved=raw===null?null:migrateDocument(raw,namespace,this.catalog,new Date(this.time.now()).toISOString());
   const d=reset||!saved?this.fresh(namespace,seed):structuredClone(saved);
   this.service.restoreCheckpoint(d.checkpoint);
   if(namespace==='student:local')this.service.synchronizeClock(this.time.now());
   // An image Blob is intentionally not persisted; restore to the problem to reselect it.
   if(d.checkpoint.screen==='submission'&&d.checkpoint.realSubmittedAt!==null)this.service.backToProblem();
   this.newSession(d);this.capture(d);
   d.revision=(saved?.revision??0)+1;decodeDocument(d,namespace,this.catalog);
   await this.repo.save(d,saved?.revision??0);await this.repo.selectNamespace(namespace);this.document=d;
  }catch(e){this.service.restoreCheckpoint(before);this.document=old;throw e;}
 }
 private capture(d:LearningDocument){
  const previous=d.checkpoint,c=this.service.exportCheckpoint(),at=this.service.snapshot.now,session=d.sessions.at(-1)!;
  for(const a of c.learner.assessments)if(!previous.learner.assessments.some(p=>p.id===a.id)&&!session.completedTasks.includes(a.id))session.completedTasks.push(a.id);
  for(const id of c.learner.behaviorEvents)if(!d.expEvents.some(e=>e.id===id))d.expEvents.push({id,at,sessionId:session.id});
  const r=c.learner.repair,active=d.repairs.findLast(r=>r.completedAt===null);
  if(active&&!r)active.completedAt=at;
  if(r&&!active)d.repairs.push({id:crypto.randomUUID(),sourceSkill:r.sourceSkillId,repairedSkill:r.repairSkillId,startedAt:at,completedAt:null,returnToSkill:r.returnToSkillId,returnToProblemId:r.returnToProblemId});
  session.sessionCheckpoint={screen:c.screen,problemId:c.current?.problemId??null};d.checkpoint=c;d.student.lastActiveAt=at;
 }
 async execute(action:()=>void){await this.exclusive(async()=>{
  if(!this.document)throw new PersistenceError('LOAD','保存状態を読み込めていません。');
  const before=this.service.exportCheckpoint(),d=structuredClone(this.document);
  try{
   if(d.namespace==='student:local')this.service.synchronizeClock(this.time.now());
   action();
   const after=this.service.snapshot;
   if(after.current?.problemId!==before.current?.problemId&&after.current||after.learner.assessments.length>before.learner.assessments.length)this.service.recordLearningStart(d.sessions.at(-1)!.id);
   this.capture(d);d.revision++;decodeDocument(d,d.namespace,this.catalog);
   await this.repo.save(d,this.document.revision);this.document=d;
  }catch(e){this.service.restoreCheckpoint(before);throw e;}
 });}
 async useStudent(){await this.exclusive(()=>this.open('student:local'));}
 async useVerification(state:VerificationState){if(!this.development)throw new PersistenceError('MODE','開発モード専用です。');await this.exclusive(()=>this.open(`demo:verify:${state}`,()=>seedVerification(this.service,this.catalog,state),true));}
 async useDemo(profile:Profile){if(!this.development)throw new PersistenceError('MODE','開発モード専用です。');await this.exclusive(()=>this.open(`demo:${profile}`,()=>this.service.switchProfile(profile)));}
 async useGradingDemo(id:string){if(!this.development)throw new PersistenceError('MODE','開発モード専用です。');await this.exclusive(()=>this.open(`demo:grading:${id}`,()=>this.service.openGradingDemo(id)));}
 async resetDemo(){if(!this.development||!this.namespace.startsWith('demo:'))throw new PersistenceError('MODE','通常学習はこの操作では初期化できません。');const key=this.namespace;await this.exclusive(()=>this.open(key,()=>{if(key.startsWith('demo:verify:'))seedVerification(this.service,this.catalog,key.slice('demo:verify:'.length) as VerificationState);else if(key.startsWith('demo:grading:'))this.service.openGradingDemo(key.slice('demo:grading:'.length));else this.service.switchProfile(key.slice(5) as Profile);},true));}
}
