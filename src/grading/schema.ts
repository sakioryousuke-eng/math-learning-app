import {z} from 'zod';
import {errorTags} from '../math-master/types.ts';
import {gradingProblem,gradingSpec,prerequisiteIds} from './problems.ts';
export const dimensionsSchema=z.object({understanding:z.enum(['success','partial','failure','unobserved']),modeling:z.enum(['success','partial','failure','unobserved']),method:z.enum(['success','partial','failure','unobserved']),conditions:z.enum(['success','partial','failure','unobserved']),calculation:z.enum(['success','partial','failure','unobserved']),expression:z.enum(['success','partial','failure','unobserved']),conclusion:z.enum(['success','partial','failure','unobserved'])}).strict();
export const evaluationSchema=z.object({
 schemaVersion:z.literal('1'),problemId:z.string().min(1),overall:z.enum(['correct','unresolved']),
 legibility:z.enum(['readable','unreadable','blank']),dimensions:dimensionsSchema,
 errorTags:z.array(z.enum(errorTags)).max(22),confidence:z.number().min(0).max(1),
 sufficientWriting:z.boolean(),examQuality:z.boolean(),alternativeMethod:z.boolean(),
 observedWork:z.string().max(4000),explanation:z.string().min(1).max(2000),
 prerequisiteObservations:z.array(z.object({skillId:z.string(),dimensions:dimensionsSchema,errorTags:z.array(z.enum(errorTags)).min(1),evidence:z.string().min(1).max(800)}).strict()).max(3)
}).strict();
export type Evaluation=z.infer<typeof evaluationSchema>;
export type TechnicalCode='CONFIG_MISSING'|'UNSUPPORTED_PROBLEM'|'INVALID_IMAGE'|'IMAGE_TOO_LARGE'|'NETWORK'|'TIMEOUT'|'PROVIDER_ERROR'|'SCHEMA_INVALID'|'CONTRADICTORY_RESULT'|'LOW_CONFIDENCE'|'STALE_ATTEMPT'|'BUSY'|'INVALID_REQUEST';
export class GradingError extends Error {readonly code:TechnicalCode;constructor(code:TechnicalCode,message:string){super(message);this.name='GradingError';this.code=code;}}
const unreadableTags=['handwriting_unreadable','layout_unclear','expression_ambiguous'];
export function validateEvaluation(raw:unknown,problemId:string):Evaluation{
 const parsed=evaluationSchema.safeParse(raw);if(!parsed.success)throw new GradingError('SCHEMA_INVALID','採点結果の形式が不正です。カルテは更新しません。');
 const e=parsed.data;const spec=gradingSpec(problemId),problem=gradingProblem(problemId);
 const fail=(why:string):never=>{throw new GradingError('CONTRADICTORY_RESULT',`採点結果に矛盾があります（${why}）。`);};
 if(e.problemId!==problemId)fail('問題の取り違え');
 if(new Set(e.errorTags).size!==e.errorTags.length)fail('タグの重複');
 if(e.overall==='correct'){
  if(e.legibility!=='readable'||e.errorTags.length||e.dimensions.conclusion!=='success'||Object.values(e.dimensions).some(d=>d==='failure'||d==='partial'))fail('正解と途中評価');
  if(spec.requiresReasoning&&!e.sufficientWriting)fail('必須記述の不足');
  if(spec.requiresReasoning&&e.dimensions.method!=='success')fail('方法の根拠が未確認');
 }
 if(e.overall==='unresolved'&&!e.errorTags.length)fail('原因タグなし');
 if(e.examQuality&&(e.overall!=='correct'||!e.sufficientWriting))fail('MAX答案品質');
 const hasUnreadable=e.errorTags.some(t=>unreadableTags.includes(t));
 if(e.legibility==='unreadable'&&(e.overall!=='unresolved'||!hasUnreadable||e.sufficientWriting||e.examQuality||e.prerequisiteObservations.length))fail('判読不能');
 if(e.legibility!=='unreadable'&&hasUnreadable)fail('可読性タグ');
 if(e.legibility==='blank'&&(e.overall!=='unresolved'||e.sufficientWriting||e.examQuality||e.prerequisiteObservations.length||e.dimensions.method==='success'||e.dimensions.calculation==='success'))fail('白紙');
 if(e.legibility==='blank'&&Object.values(e.dimensions).some(d=>d==='success'||d==='partial'))fail('白紙から成功証拠を推測');
 if(e.errorTags.some(t=>['condition_omission','domain_omission','case_split','equivalence'].includes(t))&&e.dimensions.conditions==='success')fail('条件の評価');
 if(e.errorTags.some(t=>['calculation','sign','fraction','expansion','factorization'].includes(t))&&e.dimensions.calculation==='success')fail('計算の評価');
 if(e.errorTags.includes('writing')&&e.sufficientWriting)fail('記述の評価');
 const allowed=prerequisiteIds(problem.skillId);
 if(new Set(e.prerequisiteObservations.map(o=>o.skillId)).size!==e.prerequisiteObservations.length)fail('前提観測の重複');
 for(const o of e.prerequisiteObservations){if(e.overall==='correct'||!allowed.includes(o.skillId)||o.errorTags.some(t=>unreadableTags.includes(t))||Object.values(o.dimensions).every(d=>d==='success'))fail('前提技能の観測');}
 if(e.confidence<0.6)throw new GradingError('LOW_CONFIDENCE','採点の信頼性を確保できませんでした。技術エラーとして記録し、カルテは更新しません。');
 return e;
}
export const receiptSchema=z.object({submissionId:z.string().uuid(),problemId:z.string(),context:z.enum(['practice','diagnostic','warmup','repair','max']),imageSha256:z.string().regex(/^[a-f0-9]{64}$/),gradedAt:z.string().datetime(),model:z.string().min(1),rubricVersion:z.literal('stage3-v1'),evaluation:evaluationSchema}).strict();
export type GradingReceipt=z.infer<typeof receiptSchema>;
export function validateReceipt(raw:unknown,problemId:string):GradingReceipt{
 const parsed=receiptSchema.safeParse(raw);if(!parsed.success)throw new GradingError('SCHEMA_INVALID','採点応答の形式が不正です。');
 validateEvaluation(parsed.data.evaluation,problemId);if(parsed.data.problemId!==problemId)throw new GradingError('CONTRADICTORY_RESULT','問題IDが一致しません。');return parsed.data;
}
