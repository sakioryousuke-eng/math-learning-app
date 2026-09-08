import {z} from 'zod';
import {dimensionsSchema,receiptSchema} from '../grading/schema.ts';
import {errorTags} from '../math-master/types.ts';
import type {Learner,Assessment,MaxAttempt} from '../math-master/types.ts';
import type {LearningService} from '../services/learning-service.ts';
import {legacyCatalog} from '../services/catalog.ts';
import type {LearningCatalog} from '../curriculum/types.ts';
export const curriculumVersion='math-v0.1-100';
export type Checkpoint=ReturnType<LearningService['exportCheckpoint']>;
export interface StudentProfile {learnerId:string;createdAt:string;lastActiveAt:string}
export interface RepairHistory {id:string;sourceSkill:string;repairedSkill:string;startedAt:string;completedAt:string|null;returnToSkill:string;returnToProblemId:string}
export interface LearningSession {id:string;start:string;end:string|null;completedTasks:string[];sessionCheckpoint:{screen:Checkpoint['screen'];problemId:string|null}}
export interface LearningDocument {migration?:{from:string;to:string;at:string;previousCheckpoint:Checkpoint};schemaVersion:1;curriculumVersion:string;namespace:string;revision:number;student:StudentProfile;checkpoint:Checkpoint;repairs:RepairHistory[];sessions:LearningSession[];expEvents:{id:string;at:string;sessionId:string}[]}
export class PersistenceError extends Error {readonly code:string;constructor(code:string,message:string){super(message);this.name='PersistenceError';this.code=code;}}
const at=z.string().datetime(),id=z.string().min(1),rating=z.enum(['success','partial','failure','unobserved']);
const generatedEvidence=z.object({familyId:id,variantId:id,structureSignature:id,structureTags:z.array(id),difficultyTier:z.enum(['FOUNDATION','STANDARD','APPLIED','PRACTICAL']),generatorVersion:id,independenceGroup:id,mistakeType:id.nullable(),mistakeHypotheses:z.array(z.object({mistakeType:id,description:id,crossSkills:z.array(id),weaknessTags:z.array(id),hypothesisOnly:z.literal(true)}).strict()),hypothesisOnly:z.literal(true)}).strict();
const assessment:z.ZodType<Assessment>=z.object({generatedEvidence:generatedEvidence.optional(),choice:z.object({choiceId:id,correct:z.boolean(),mistakeType:z.enum(errorTags).nullable(),repairSkillId:id.nullable(),confirmed:z.array(id),missing:z.array(id),source:z.literal('paper-self-report')}).strict().optional(),id,problemId:id,skillId:id,at,context:z.enum(['practice','diagnostic','warmup','repair','max']),solved:z.boolean(),readable:z.boolean(),independent:z.boolean(),integration:z.boolean(),tags:z.array(z.enum(errorTags)),dimensions:dimensionsSchema,crossSkills:z.record(rating)}).strict();
const attempt=z.object({problemId:id,independenceKey:id,at,noHint:z.boolean(),noMethodSpecified:z.boolean(),independent:z.boolean(),examQuality:z.boolean(),practicalTime:z.boolean(),correctConclusion:z.boolean(),readable:z.boolean(),sufficientWriting:z.boolean()}).strict() satisfies z.ZodType<MaxAttempt>;
const repair=z.object({sourceSkillId:id,repairSkillId:id,returnToSkillId:id,returnToProblemId:id}).strict();
const learner:z.ZodType<Learner>=z.object({schemaVersion:z.literal(1),id,diagnosticPending:z.array(id),diagnosticMaxEvidence:z.record(z.array(attempt.extend({assessmentId:id}))),diagnosticCompleted:z.boolean(),activeUnit:id.nullable(),skills:z.record(z.enum(['unseen','learning','stable','needs_repair'])),maxUnits:z.array(id),assessments:z.array(assessment),maxAttempts:z.record(z.array(attempt)),repair:repair.nullable(),resume:z.object({skillId:id,problemId:id}).strict().nullable(),lastSkillId:id.nullable(),warmupRemaining:z.number().int().min(0).max(2),crossSkillEvidence:z.record(z.array(z.object({assessmentId:id,rating}).strict())),humanExp:z.number().int().nonnegative(),behaviorEvents:z.array(id)}).strict();
const screen=z.enum(['diagnostic','home','problem','submission','result','explanation','map','records','max']);
const checkpoint:z.ZodType<Checkpoint,z.ZodTypeDef,unknown>=z.object({hintedProblems:z.array(id).default([]),learner,screen,current:z.object({problemId:id,context:z.enum(['practice','diagnostic','warmup','repair','max']),probe:z.boolean()}).strict().nullable(),result:z.object({assessment,outcome:z.enum(['correct','calculation','case_split','prerequisite','unreadable']),cause:z.string(),notice:z.string(),acquired:z.boolean(),repaired:z.boolean(),stable:z.boolean()}).strict().nullable(),profile:z.enum(['new','quadratic','repair','max-two','qfn-ready','complete']),clock:z.number().finite(),serial:z.number().int().nonnegative(),used:z.array(id),diagUnit:z.number().int().min(0).max(1000),passed:z.array(z.object({unitId:id,assessmentIds:z.array(id)}).strict()),diagIds:z.array(id),diagnosisFinished:z.boolean(),diagPlacement:id.nullable(),practiceFocus:id.nullable(),ended:z.boolean(),notice:z.string(),realToken:z.string(),realStartedAt:z.number().finite(),realSubmittedAt:z.number().finite().nullable(),realEvaluations:z.array(receiptSchema),technicalErrors:z.array(z.object({at,code:z.enum(['CONFIG_MISSING','UNSUPPORTED_PROBLEM','INVALID_IMAGE','IMAGE_TOO_LARGE','NETWORK','TIMEOUT','PROVIDER_ERROR','SCHEMA_INVALID','CONTRADICTORY_RESULT','LOW_CONFIDENCE','STALE_ATTEMPT','BUSY','INVALID_REQUEST'])}).strict())}).strict();
const documentSchema:z.ZodType<LearningDocument,z.ZodTypeDef,unknown>=z.object({migration:z.object({from:id,to:id,at,previousCheckpoint:checkpoint}).strict().optional(),schemaVersion:z.literal(1),curriculumVersion:id,namespace:id,revision:z.number().int().positive(),student:z.object({learnerId:id,createdAt:at,lastActiveAt:at}).strict(),checkpoint,repairs:z.array(z.object({id,sourceSkill:id,repairedSkill:id,startedAt:at,completedAt:at.nullable(),returnToSkill:id,returnToProblemId:id}).strict()),sessions:z.array(z.object({id,start:at,end:at.nullable(),completedTasks:z.array(id),sessionCheckpoint:z.object({screen,problemId:id.nullable()}).strict()}).strict()),expEvents:z.array(z.object({id,at,sessionId:id}).strict())}).strict();
export function decodeDocument(raw:unknown,namespace:string,catalog:LearningCatalog=legacyCatalog):LearningDocument{
 const {master,problems}=catalog;
 if(typeof raw==='object'&&raw!==null&&'schemaVersion'in raw&&raw.schemaVersion!==1)throw new PersistenceError('VERSION','未対応の保存バージョンです。元データを保持して停止します。');
 const parsed=documentSchema.safeParse(raw);if(!parsed.success)throw new PersistenceError('CORRUPT','保存データの形式が壊れています。上書きせず停止しました。');
 const d=parsed.data,c=d.checkpoint,p=c.learner;
 const fail=()=>{throw new PersistenceError('CORRUPT','保存データの参照または整合性が不正です。元データは保持しています。');};
 if(d.curriculumVersion!==catalog.version)throw new PersistenceError('CURRICULUM','教材バージョンが異なります。移行処理が必要なため上書きしません。');
 if(c.diagUnit>catalog.mainUnitIds.length)fail();
 const skills=new Set(master.skills.map(s=>s.id)),units=new Set(master.units.map(u=>u.id)),bank=new Set(problems.map(p=>p.id)),assessments=new Set(p.assessments.map(a=>a.id));
 if(c.hintedProblems.some(id=>!bank.has(id)))fail();
 if(d.namespace!==namespace||d.student.learnerId!==p.id||new Set(p.behaviorEvents).size!==p.behaviorEvents.length||p.humanExp!==p.behaviorEvents.length||assessments.size!==p.assessments.length)fail();
 if(Object.keys(p.skills).length!==skills.size||Object.keys(p.skills).some(s=>!skills.has(s))||p.maxUnits.some(u=>!units.has(u))||new Set(p.maxUnits).size!==p.maxUnits.length||p.activeUnit&&!units.has(p.activeUnit))fail();
 if([...p.diagnosticPending,p.lastSkillId,c.practiceFocus,c.diagPlacement].some(s=>s!==null&&!skills.has(s)))fail();
 if(c.used.some(id=>!bank.has(id))||c.current&&!bank.has(c.current.problemId)||c.result&&!assessments.has(c.result.assessment.id)||['result','explanation'].includes(c.screen)&&(!c.result||!c.current)||['problem','submission'].includes(c.screen)&&!c.current)fail();
 if(p.assessments.some(a=>!skills.has(a.skillId)||!bank.has(a.problemId))||c.diagIds.some(id=>!assessments.has(id))||c.passed.some(s=>!units.has(s.unitId)||s.assessmentIds.some(id=>!assessments.has(id))))fail();
 for(const [unit,attempts] of Object.entries(p.maxAttempts))if(!units.has(unit)||attempts.some(a=>!bank.has(a.problemId)||master.skills.find(s=>s.id===problems.find(p=>p.id===a.problemId)?.skillId)?.unitId!==unit))fail();
 for(const [unit,evidence] of Object.entries(p.diagnosticMaxEvidence))if(!units.has(unit)||evidence.some(e=>!bank.has(e.problemId)||!assessments.has(e.assessmentId)))fail();
 for(const [cross,evidence] of Object.entries(p.crossSkillEvidence))if(!master.crossSkills.some(s=>s.id===cross)||evidence.some(e=>!assessments.has(e.assessmentId)))fail();
 if(p.repair&&(![p.repair.sourceSkillId,p.repair.repairSkillId,p.repair.returnToSkillId].every(s=>skills.has(s))||!bank.has(p.repair.returnToProblemId)||master.skills.find(s=>s.id===p.repair?.sourceSkillId)?.unitId!==p.activeUnit))fail();
 if(p.resume&&(!skills.has(p.resume.skillId)||!bank.has(p.resume.problemId)))fail();
 if(d.repairs.some(r=>![r.sourceSkill,r.repairedSkill,r.returnToSkill].every(s=>skills.has(s))||!bank.has(r.returnToProblemId)))fail();
 if(d.sessions.some(s=>s.completedTasks.some(id=>!assessments.has(id)))||d.expEvents.some(e=>!p.behaviorEvents.includes(e.id)||!d.sessions.some(s=>s.id===e.sessionId)))fail();
 return structuredClone(d);
}
