import type {Assessment,MaxAttempt} from '../math-master/types.ts';
import type {GradingReceipt,Evaluation} from './schema.ts';
import {gradingProblem,gradingSpec} from './problems.ts';
export function toAssessment(e:Evaluation,id:string,at:string,context:Assessment['context'],independent:boolean):Assessment{
 const problem=gradingProblem(e.problemId);
 return {id,problemId:e.problemId,skillId:problem.skillId,at,context,solved:e.overall==='correct',readable:e.legibility!=='unreadable',independent,integration:context==='max'||context==='diagnostic',tags:[...e.errorTags],dimensions:{...e.dimensions},crossSkills:{X01:e.dimensions.modeling,X02:e.dimensions.conditions,X06:e.dimensions.conditions,X11:e.dimensions.method,X12:e.dimensions.expression,X13:e.dimensions.conclusion}};
}
export function toMaxAttempt(receipt:GradingReceipt,at:string,independent:boolean,elapsedSeconds:number):MaxAttempt{
 const e=receipt.evaluation,p=gradingProblem(e.problemId),spec=gradingSpec(p.id);
 return {problemId:p.id,independenceKey:p.independenceKey,at,noHint:true,noMethodSpecified:true,independent,examQuality:e.examQuality,practicalTime:elapsedSeconds>0&&elapsedSeconds<=spec.maxSeconds,correctConclusion:e.overall==='correct',readable:e.legibility==='readable',sufficientWriting:e.sufficientWriting};
}
