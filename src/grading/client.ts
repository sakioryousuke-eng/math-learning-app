import {GradingError,validateReceipt} from './schema.ts';
import type {GradingReceipt,TechnicalCode} from './schema.ts';
import type {Assessment} from '../math-master/types.ts';
export async function requestGrading(submissionId:string,problemId:string,context:Assessment['context'],image:{mime:string;base64:string},signal:AbortSignal,transport:typeof fetch=fetch):Promise<GradingReceipt>{
 let response:Response;
 try{response=await transport('/api/grading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId,problemId,context,image}),signal:AbortSignal.any([signal,AbortSignal.timeout(70000)])});}
 catch(e){throw new GradingError(e instanceof Error&&['AbortError','TimeoutError'].includes(e.name)?'TIMEOUT':'NETWORK','通信が完了しませんでした。答案の正誤には数えません。再提出できます。');}
 let body:unknown;try{body=await response.json();}catch{throw new GradingError('SCHEMA_INVALID','採点サーバーの応答を読み込めません。');}
 if(typeof body!=='object'||body===null||!('ok'in body))throw new GradingError('SCHEMA_INVALID','採点応答の形式が不正です。');
 if(body.ok!==true||!response.ok){
  const codes:TechnicalCode[]=['CONFIG_MISSING','UNSUPPORTED_PROBLEM','INVALID_IMAGE','IMAGE_TOO_LARGE','NETWORK','TIMEOUT','PROVIDER_ERROR','SCHEMA_INVALID','CONTRADICTORY_RESULT','LOW_CONFIDENCE','STALE_ATTEMPT','BUSY','INVALID_REQUEST'];
  if('error'in body&&typeof body.error==='object'&&body.error!==null&&'code'in body.error&&'message'in body.error){const e=body.error;const code=codes.find(c=>c===e.code);if(code&&typeof e.message==='string')throw new GradingError(code,e.message);}
  throw new GradingError('PROVIDER_ERROR','採点サーバーが結果を返せませんでした。再提出できます。');
 }
 if(!('receipt'in body))throw new GradingError('SCHEMA_INVALID','採点結果がありません。');return validateReceipt(body.receipt,problemId);
}
