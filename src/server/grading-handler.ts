import {z} from 'zod';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {prepareImage} from './image.ts';
import {gradeWithOpenAI} from './provider.ts';
import type {ProviderConfig} from './provider.ts';
import {gradingSpec} from '../grading/problems.ts';
import {GradingError} from '../grading/schema.ts';
import type {GradingReceipt,TechnicalCode} from '../grading/schema.ts';
const inputSchema=z.object({submissionId:z.string().uuid(),problemId:z.string().min(1).max(100),context:z.enum(['practice','diagnostic','warmup','repair','max']),image:z.object({mime:z.enum(['image/jpeg','image/png','image/webp']),base64:z.string().max(14_000_000)}).strict()}).strict();
export function loadGradingConfig(root:string):ProviderConfig{
 let local:Record<string,string|undefined>={};try{local=parseEnv(readFileSync(`${root}/.env.local`,'utf8'));}catch{/* Optional local configuration. */}
 return {apiKey:process.env.OPENAI_API_KEY||local.OPENAI_API_KEY||'',model:process.env.OPENAI_GRADING_MODEL||local.OPENAI_GRADING_MODEL||'gpt-4.1-2025-04-14'};
}
export interface TechnicalEvent{at:string;code:TechnicalCode;submissionId:string|null}
export function createGradingHandler(config:()=>ProviderConfig,provider=gradeWithOpenAI){
 const completed=new Map<string,{fingerprint:string;receipt:GradingReceipt}>();
 const pending=new Map<string,{fingerprint:string;promise:Promise<GradingReceipt>}>();
 const technicalEvents:TechnicalEvent[]=[];
 function log(e:GradingError,id:string|null){technicalEvents.push({at:new Date().toISOString(),code:e.code,submissionId:id});if(technicalEvents.length>100)technicalEvents.shift();}
 async function execute(raw:unknown):Promise<GradingReceipt>{
  const parsed=inputSchema.safeParse(raw);if(!parsed.success)throw new GradingError('INVALID_REQUEST','提出データの形式が不正です。');
  const data=parsed.data;
  try{gradingSpec(data.problemId);}catch{throw new GradingError('UNSUPPORTED_PROBLEM','この問題は実答案採点の対象外です。仮採点を利用してください。');}
  const fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const cache=completed.get(data.submissionId);if(cache){if(cache.fingerprint!==fingerprint)throw new GradingError('INVALID_REQUEST','同じ提出IDに別の画像が指定されました。');return cache.receipt;}
  const existing=pending.get(data.submissionId);if(existing){if(existing.fingerprint!==fingerprint)throw new GradingError('INVALID_REQUEST','提出IDが競合しています。');return existing.promise;}
  if(pending.size>=2)throw new GradingError('BUSY','採点処理中です。少し待ってから再提出してください。');
  const promise=(async()=>{
   const image=await prepareImage(data.image.base64,data.image.mime);
   const settings=config();
   const evaluation=await provider(data.problemId,data.context,image,settings);
   // Revalidate injectable provider output as well as network provider output.
   const {validateEvaluation}=await import('../grading/schema.ts');
   const receipt:GradingReceipt={submissionId:data.submissionId,problemId:data.problemId,context:data.context,imageSha256:createHash('sha256').update(image).digest('hex'),gradedAt:new Date().toISOString(),model:settings.model,rubricVersion:'stage3-v1',evaluation:validateEvaluation(evaluation,data.problemId)};
   completed.set(data.submissionId,{fingerprint,receipt});if(completed.size>100)completed.delete(completed.keys().next().value!);return receipt;
  })();
  pending.set(data.submissionId,{fingerprint,promise});
  try{return await promise;}finally{pending.delete(data.submissionId);}
 }
 function send(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
 async function handle(req:IncomingMessage,res:ServerResponse,next:()=>void){
  if(req.url?.split('?')[0]!=='/api/grading'){next();return;}
  let submissionId:string|null=null;
  try{
   if(req.method!=='POST')throw new GradingError('INVALID_REQUEST','POSTで提出してください。');
   if(req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host)throw new GradingError('INVALID_REQUEST','別のサイトからの提出は受け付けません。');}
   if(req.headers['sec-fetch-site']==='cross-site')throw new GradingError('INVALID_REQUEST','別のサイトからの提出は受け付けません。');
   if(!req.headers['content-type']?.startsWith('application/json'))throw new GradingError('INVALID_REQUEST','JSON形式で提出してください。');
   const chunks:Buffer[]=[];let size=0;
   for await(const chunk of req){const b:Buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(String(chunk));size+=b.length;if(size>15_000_000)throw new GradingError('IMAGE_TOO_LARGE','画像が大きすぎます。');chunks.push(b);}
   let raw:unknown;try{raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new GradingError('INVALID_REQUEST','提出データを読み込めません。');}
   if(typeof raw==='object'&&raw!==null&&'submissionId'in raw&&typeof raw.submissionId==='string')submissionId=raw.submissionId;
   send(res,200,{ok:true,receipt:await execute(raw)});
  }catch(error){const e=error instanceof GradingError?error:new GradingError('PROVIDER_ERROR','採点処理に技術的な問題が発生しました。カルテは更新しません。');log(e,submissionId);send(res,e.code==='CONFIG_MISSING'?503:400,{ok:false,error:{code:e.code,message:e.message,retryable:true}});}
 }
 return {handle,execute,get technicalEvents(){return [...technicalEvents];}};
}
