import type {Evaluation} from './schema.ts';
import type {ErrorTag} from '../math-master/types.ts';
export interface AnswerCase {id:string;problemId:string;variant:string;image:string;source:'synthetic-typeset'|'real-handwritten';humanReviewed:boolean;expected:{overall:Evaluation['overall'];errorTags:ErrorTag[];legibility:Evaluation['legibility']};text:string[]}
export function compareAnswer(answer:AnswerCase,evaluation:Evaluation|null,technicalError:string|null=null){
 const measured=evaluation!==null&&technicalError===null;
 return {id:answer.id,problemId:answer.problemId,variant:answer.variant,source:answer.source,humanReviewed:answer.humanReviewed,expected:answer.expected,ai:measured?evaluation:null,status:technicalError?'technical_error':measured?'measured':'not_run',technicalError,
  overallMatch:measured?evaluation.overall===answer.expected.overall:null,
  extraErrorTags:measured?evaluation.errorTags.filter(t=>!answer.expected.errorTags.includes(t)):null,
  missedErrorTags:measured?answer.expected.errorTags.filter(t=>!evaluation.errorTags.includes(t)):null,
  legibilityMatch:measured?evaluation.legibility===answer.expected.legibility:null};
}
export function summarize(rows:ReturnType<typeof compareAnswer>[]){
 const measured=rows.filter(r=>r.status==='measured');
 const rate=(matches:number,total:number)=>total?matches/total:null;
 const alternatives=measured.filter(r=>r.variant==='B'),readable=measured.filter(r=>r.expected.legibility==='readable'),unreadable=measured.filter(r=>r.expected.legibility==='unreadable');
 return {total:rows.length,measured:measured.length,notRun:rows.filter(r=>r.status==='not_run').length,technicalErrors:rows.filter(r=>r.status==='technical_error').length,humanReviewed:rows.filter(r=>r.humanReviewed).length,overallAgreement:rate(measured.filter(r=>r.overallMatch).length,measured.length),exactTagAgreement:rate(measured.filter(r=>!r.extraErrorTags?.length&&!r.missedErrorTags?.length).length,measured.length),alternativeAcceptance:rate(alternatives.filter(r=>r.ai?.overall==='correct').length,alternatives.length),readableFalselyUnreadable:rate(readable.filter(r=>r.ai?.legibility==='unreadable').length,readable.length),unreadableGuessedReadable:rate(unreadable.filter(r=>r.ai?.legibility==='readable').length,unreadable.length)};
}
