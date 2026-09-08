import {writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {generateFamilyProblem,accepts,equivalentRange} from '../src/prototype/quadratic-family.ts';
import {generateAxisProblem,axisValues,equivalentAxisAnswers} from '../src/prototype/quadratic-axis-family.ts';
import {generateCountProblem,inCountRange,equivalentCountAnswers} from '../src/prototype/quadratic-count-family.ts';
import {generatePlacementProblem,contains,equivalentSets,placementBoundaries,evaluate} from '../src/prototype/quadratic-placement-family.ts';
import type {PlacementParameters} from '../src/prototype/quadratic-placement-family.ts';
import {equivalentAnswers,evaluateCases,expressionAt} from '../src/prototype/integrated-quadratic-math.ts';
import type {IntegratedQuadraticProblem} from '../src/prototype/quadratic-integrated-family.ts';
import type {BankArtifact,BankRecord,BankChoice,BankGraphSpec,DifficultyTier} from '../src/bank/types.ts';
import {familyPool,axisPool,countPool,placementPool,integratedPool} from './qfn-bank-pools.ts';
import {bankGraphs} from '../src/bank/graphs.ts';
function ensure(ok:unknown,message:string):asserts ok{if(!ok)throw new Error(message);}
const near=(a:number,b:number)=>Math.abs(a-b)<1e-7;
function roots(A:number,B:number,C:number){const d=B*B-4*A*C;if(Math.abs(d)<1e-12)return [-B/(2*A)];if(d<0)return [];return [(-B-Math.sqrt(d))/(2*A),(-B+Math.sqrt(d))/(2*A)].sort((a,b)=>a-b);}
function placementDirect(p:PlacementParameters,k:number){const r=roots(p.A,p.b1*k+p.b0,p.c1*k+p.c0);if(r.length!==2)return false;const [a,b]=r,t=p.target,lt=(x:number,y:number)=>x<y-1e-8,le=(x:number,y:number)=>x<=y+1e-8;switch(t.kind){case 'right':return lt(t.r,a);case 'left':return lt(b,t.r);case 'straddle':return lt(a,t.r)&&lt(t.r,b);case 'outside':return lt(a,t.L)&&lt(t.R,b);case 'inside':return (t.leftClosed?le(t.L,a):lt(t.L,a))&&(t.rightClosed?le(b,t.R):lt(b,t.R));}}
function integratedDirect(p:IntegratedQuadraticProblem,k:number){
 const e=p.models.extrema;if(e){const q=expressionAt(e.expression,k),h=-q[1]/(2*q[0]),xs=[e.L,e.R,...(h>=e.L&&h<=e.R?[h]:[])],ys=xs.map(x=>q[0]*x*x+q[1]*x+q[2]),min=Math.min(...ys),max=Math.max(...ys);
  if(p.answer.kind==='values'){ensure(near(min,p.answer.min)&&near(max,p.answer.max),'fixed extrema oracle');return;}
  if(p.answer.kind==='cases'){const v=evaluateCases(p.answer.cases,k);ensure(v.min.length===1&&v.max.length===1&&near(v.min[0],min)&&near(v.max[0],max),'extrema cases oracle');return;}
  const valid=(p.models.constraints??[]).every(c=>c.op==='eq'?near(c.key==='min'?min:max,c.value):c.op==='ge'?(c.key==='min'?min:max)>=c.value-1e-8:(c.key==='min'?min:max)<=c.value+1e-8)&&(!p.models.placement||placementDirect(p.models.placement.parameters,k));
  ensure(p.answer.kind==='set'&&contains(p.answer.set,k)===valid,'inverse/composite extrema oracle');return;
 }
 const c=p.models.intersection;if(p.answer.kind==='tangent'&&c){
  const A=c.f[0],B=c.f[1]-evaluate(c.lineSlope,k),C=c.f[2]-evaluate(c.lineIntercept,k);
  const satisfies=Math.abs(B*B-4*A*C)<1e-10&&-B/(2*A)>0;
  ensure(p.answer.points.some(v=>near(v.k.value,k))===satisfies,'original positive tangent condition');
  for(const v of p.answer.points){ensure(v.x>0&&near(evaluate(c.f,v.x),v.y)&&near(evaluate(c.lineSlope,v.k.value)*v.x+evaluate(c.lineIntercept,v.k.value),v.y),'original contact point oracle');ensure(near(2*c.f[0]*v.x+c.f[1],evaluate(c.lineSlope,v.k.value)),'tangent slope oracle');}return;
 }
 const m=p.models.placement;ensure(m&&p.answer.kind==='set','integrated placement model');const r=roots(m.A,evaluate(m.B,k),evaluate(m.C,k));
 const extra=p.models.horizontal?r.length===2&&r[1]-r[0]>=2-1e-8:p.index===5?r.length===2&&r[0]+r[1]<3-1e-8:true;
 ensure(contains(p.answer.set,k)===(placementDirect(m.parameters,k)&&extra),'integrated original root constraints');
}
interface Candidate {family:number;sourceId:number;parameters:unknown;prompt:string;explanation:BankRecord['explanation'];choices:BankChoice[];requirements:BankRecord['problemRequirements'];signature:string[];tier:DifficultyTier;step:number;skill:string;situation:string;graph:BankGraphSpec|null;boundaries:number[];check:(k:number)=>void;equivalent:(i:number,j:number)=>boolean;empty:boolean;trace?:unknown}
const tier=(level:string):DifficultyTier=>level==='標準'?'STANDARD':level==='応用'?'APPLIED':'PRACTICAL';
function hypotheses(choices:{choiceId:string;text:string;correct:boolean;mistakeType:string|null;mistakeHypotheses:{description:string;crossSkills:string[];weaknessTags:string[];hypothesisOnly:true}[]}[]):BankChoice[]{return choices.map(c=>({choiceId:c.choiceId,text:c.text,correct:c.correct,mistakeType:c.mistakeType,mistakeHypotheses:c.mistakeHypotheses.map(h=>({description:h.description,crossSkills:h.crossSkills,weaknessTags:h.weaknessTags,hypothesisOnly:true,mistakeType:c.mistakeType!}))}));}
const signatureNumber=(value:number)=>value===0?'zero':value<0?'negative':'positive';
function* candidates():Generator<Candidate>{
 for(const [i,s] of familyPool.entries()){const p=safeGenerate(1,i+1,()=>generateFamilyProblem(s,i+1));if(!p)continue;const m=p.model;yield {family:1,sourceId:i+1,parameters:s,prompt:p.prompt,explanation:p.explanation,choices:hypotheses(p.choices),requirements:p.problemRequirements,signature:['ROOT_INTERVAL',m.limiting,s.leftClosed?'closed-left':'open-left',s.rightClosed?'closed-right':'open-right',Number.isInteger(s.h)?'integer-axis':'fraction-axis'],tier:m.limiting==='both'?'STANDARD':!s.leftClosed||!s.rightClosed?'PRACTICAL':'APPLIED',step:4,skill:'QF-SIGN',situation:'generated-root-interval',graph:{model:{kind:'static',graphs:[p.graph]},parameter:'k',initial:p.sampleK,dynamic:false,boundaries:[]},boundaries:[m.finalRange.lower,m.finalRange.upper!],empty:false,equivalent:(a,b)=>equivalentRange(p.choices[a].range,p.choices[b].range),check:k=>{const r=roots(1,-2*s.h,s.h*s.h+s.c-k);const valid=r.length===2&&(s.leftClosed?r[0]>=s.L-1e-8:r[0]>s.L+1e-8)&&(s.rightClosed?r[1]<=s.R+1e-8:r[1]<s.R-1e-8);ensure(accepts(m.finalRange,k)===valid,'family1 root oracle');}};}
 for(const [i,s] of axisPool.entries()){const p=safeGenerate(2,i+1,()=>generateAxisProblem(s,i+1));if(!p)continue;const m=p.model;yield {family:2,sourceId:i+1,parameters:s,prompt:p.prompt,explanation:p.explanation,choices:hypotheses(p.choices),requirements:p.problemRequirements,signature:['AXIS_EXTREMA',s.sign===1?'up':'down',s.target,signatureNumber(s.L),signatureNumber(s.R),(s.L+s.R)===0?'symmetric-domain':'asymmetric-domain'],tier:tier(s.level),step:4,skill:'QF-PARAM',situation:'generated-axis',graph:{model:{kind:'axis',parameters:s},parameter:'a',initial:m.midpoint,dynamic:true,boundaries:m.boundaries.map(value=>({value,label:String(value)}))},boundaries:m.boundaries,empty:false,equivalent:(a,b)=>equivalentAxisAnswers(p.choices[a].answer,p.choices[b].answer),check:k=>{const xs=[s.L,s.R,...(k>=s.L&&k<=s.R?[k]:[])],ys=xs.map(x=>s.sign*(x-k)**2+s.c);for(const key of ['min','max'] as const)if(m.answer[key]){const v=axisValues(m.answer,key,k);ensure(v.length===1&&near(v[0],key==='min'?Math.min(...ys):Math.max(...ys)),'family2 candidate oracle');}}};}
 for(const [i,s] of countPool.entries()){const p=safeGenerate(3,i+1,()=>generateCountProblem(s,i+1));if(!p)continue;const m=p.model;yield {family:3,sourceId:i+1,parameters:s,prompt:p.prompt,explanation:p.explanation,choices:hypotheses(p.choices),requirements:p.problemRequirements,signature:['INTERSECTION_COUNT',s.kind,s.A===1?'up':'down',String(s.target),m.D[0]?'quadratic-D':'linear-D',`${m.boundaries.length}-boundaries`],tier:s.kind==='intercept'&&s.target!== 'all'?'FOUNDATION':tier(s.level),step:3,skill:'QF-COUNT',situation:s.target===2?'two-independent':s.target===1?'touch':s.target===0?'none':'generated-all-counts',graph:{model:{kind:'count',parameters:s},parameter:'k',initial:m.boundaries[0]?.value??0,dynamic:true,boundaries:m.boundaries.map(b=>({value:b.value,label:b.text}))},boundaries:m.boundaries.map(b=>b.value),empty:Object.values(m.answer).every(a=>a.length===0),equivalent:(a,b)=>equivalentCountAnswers(p.choices[a].answer,p.choices[b].answer),check:k=>{const slope=s.kind==='intercept'?s.slope:k,intercept=s.kind==='intercept'?k+s.intercept:s.kind==='pivot'?s.intercept-k*s.pivotX:s.intercept;const count=roots(s.A,s.p-slope,s.q-intercept).length;ensure(near(evaluate(m.D,k),(s.p-slope)**2-4*s.A*(s.q-intercept)),'family3 difference D');for(const [n,ranges] of Object.entries(m.answer))ensure(ranges!.some(r=>inCountRange(r,k))===(count===Number(n)),'family3 original intersections oracle');}};}
 for(const [i,s] of placementPool.entries()){const p=safeGenerate(4,i+1,()=>generatePlacementProblem(s,i+1));if(!p)continue;const m=p.model,t=s.target;yield {family:4,sourceId:i+1,parameters:s,prompt:p.prompt,explanation:p.explanation,choices:hypotheses(p.choices),requirements:p.problemRequirements,signature:['PLACEMENT',t.kind,s.A>0?'up':'down',m.D[0]?'quadratic-D':'linear-D',...('L'in t?[t.leftClosed?'left-closed':'left-open',t.rightClosed?'right-closed':'right-open']:[]),`${m.answer.length}-ranges`],tier:s.level==='標準'?'STANDARD':s.level==='高め'?'PRACTICAL':'APPLIED',step:4,skill:'QF-SIGN',situation:'generated-'+t.kind,graph:{model:{kind:'placement',parameters:s},parameter:'k',initial:m.boundaries[0]?.value??0,dynamic:true,boundaries:m.boundaries},boundaries:m.boundaries.map(b=>b.value),empty:!m.answer.length,equivalent:(a,b)=>equivalentSets(p.choices[a].answer,p.choices[b].answer),check:k=>ensure(contains(m.answer,k)===placementDirect(s,k),'family4 independent roots oracle')};}
 for(const p of integratedPool()){const e=p.models.extrema,c=p.models.intersection,m=p.models.placement;
 const graph:BankGraphSpec|null=p.graphs(p.initial).length?{model:e?{kind:'extrema',expression:e.expression,L:e.L,R:e.R}:c?{kind:'count',parameters:c.parameters}:p.models.horizontal&&m?{kind:'horizontal',parameters:m.parameters}:m?{kind:'placement',parameters:m.parameters}:{kind:'static',graphs:p.graphs(p.initial)},initial:p.initial,parameter:'k',dynamic:p.dynamic,boundaries:p.boundaries}:null;
 const signature=[...p.structureSignature,...(e?[e.expression.A>0?'up':'down',e.axis[1]===0?e.axis[2]<e.L||e.axis[2]>e.R?'axis-outside':e.axis[2]===e.L||e.axis[2]===e.R?'axis-boundary':'axis-inside':'moving-axis']:[])];
 yield {family:5,sourceId:p.index,parameters:e?{expression:e.expression,L:e.L,R:e.R,constraints:p.models.constraints,placement:m?.parameters}:c?.parameters??m?.parameters,prompt:p.prompt,explanation:p.explanation,choices:hypotheses(p.choices),requirements:p.problemRequirements,signature,tier:tier(p.level),step:p.answer.kind==='values'?2:5,skill:p.answer.kind==='values'?'QF-RANGE':'QF-INTEGRATE',situation:p.answer.kind==='values'?(e!.axis[2]<e!.L||e!.axis[2]>e!.R?'vertex-outside':e!.expression.A<0?'down-tied':'vertex-inside'):'generated-integrated',graph,boundaries:p.boundaries.map(b=>b.value),trace:p.solutionTrace,empty:p.answer.kind==='set'&&!p.answer.set.length,equivalent:(a,b)=>equivalentAnswers(p.choices[a].answer,p.choices[b].answer),check:k=>integratedDirect(p,k)};
 }
}
const targets=[0,15,15,15,20,25];
const generationRejected:BankArtifact['rejected']=[];
function safeGenerate<T>(family:number,index:number,fn:()=>T):T|null{try{return fn();}catch(e){generationRejected.push({familyId:`QFN-F${family}`,variantId:`v1-${String(index).padStart(3,'0')}`,reason:e instanceof Error?e.message:String(e)});return null;}}
export function buildQfnBank():BankArtifact{
 generationRejected.length=0;
 const records:BankRecord[]=[],rejected:BankArtifact['rejected']=[],prompts=new Set<string>(),signatures=new Map<string,number>();
 for(const c of candidates()){
  const familyId=`QFN-F${c.family}`,variantId=`v1-${String(c.sourceId).padStart(3,'0')}`,signature=c.signature.join('|');
  try{
   if(records.filter(r=>r.familyId===familyId).length>=targets[c.family])continue;
   ensure(!c.empty,'unintended empty answer');ensure(!prompts.has(c.prompt),'duplicate prompt');ensure((signatures.get(familyId+signature)??0)<3,'same structure excess');
   ensure(!records.some(p=>p.familyId===familyId&&p.structureSignature===signature&&p.answer===c.explanation.answer),'same answer and same structure');
   const numeric=(v:unknown):boolean=>typeof v==='number'?Number.isFinite(v)&&Math.abs(v)<=32:Array.isArray(v)?v.every(numeric):v&&typeof v==='object'?Object.values(v).every(numeric):true;
   ensure(numeric(c.parameters),'unsafe coefficient/parameter');ensure(c.choices.length===4&&c.choices.filter(x=>x.correct).length===1,'four choices');ensure(new Set(c.choices.map(x=>x.text)).size===4,'duplicate choice text');for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)ensure(!c.equivalent(i,j),'equivalent answers');
   ensure(c.explanation.thinking.length>20&&c.explanation.steps.length>=3&&c.explanation.answer.length>0,'explanation incomplete');ensure(c.explanation.steps.join('').length<6500,'explanation too long');ensure(!/undefined|NaN|Infinity/.test(c.prompt+c.explanation.answer+c.explanation.steps.join('')),'unreadable mathematical rendering');
   ensure(c.boundaries.every(x=>Number.isFinite(x)&&Math.abs(x)<=30),'unsafe boundary');
   const samples=[...Array.from({length:1001},(_,i)=>(i-500)/40),...c.boundaries.flatMap(x=>[x-1e-5,x,x+1e-5]),-50,50];for(const k of samples)c.check(k);
   if(c.graph)for(const k of [c.graph.initial,...c.boundaries])for(const graph of bankGraphs(c.graph,k)){ensure(graph.view.every(Number.isFinite)&&graph.view[0]<graph.view[1]&&graph.view[2]<graph.view[3],'graph bounds');ensure(graph.curves.every(curve=>curve.coefficients.every(Number.isFinite)),'graph coefficients');}
   const id=`QFN-BANK-F${c.family}-${variantId}`,choices=c.choices.map((x,i)=>({...x,choiceId:`${id}:${x.correct?'correct':`wrong-${i}`}`})),crossSkills=[...new Set(c.requirements.flatMap(r=>r.crossSkills))];
   records.push({id,problemId:id,familyId,variantId,unitId:'QFN',step:c.step,skillId:c.skill,difficultyTier:c.tier,structureSignature:signature,structureTags:c.signature,problemRequirements:c.requirements,crossSkills,choices,mistakeHypotheses:choices.flatMap(x=>x.mistakeHypotheses),graphSpec:c.graph,generatorVersion:'qfn-bank-v1',reviewStatus:'verified-generated',verificationStatus:'verified-generated',topic:c.step===5?'総合':'二次関数',purpose:'practice',difficulty:{FOUNDATION:1,STANDARD:2,APPLIED:3,PRACTICAL:4}[c.tier],prompt:c.prompt,solution:c.explanation.steps.join('\n'),answer:c.explanation.answer,examAnswer:c.explanation.answer,point:c.explanation.thinking,transfer:'元の条件へ戻って、根拠と結論を確かめる。',repairSkillId:null,independenceKey:`${familyId}:${signature}`,explanation:c.explanation,situation:c.situation,parameters:c.parameters,...(c.trace?{solutionTrace:c.trace}:{}),validation:{safeParameters:true,mathematics:true,oracle:true,uniqueChoices:true,explanation:true,sampleCount:samples.length,rules:['safe parameter pool','independent original-expression oracle','boundary and both sides','semantic choice equality','finite graph viewport','complete explanation','structure cap 3']}});
   prompts.add(c.prompt);signatures.set(familyId+signature,(signatures.get(familyId+signature)??0)+1);
  }catch(error){rejected.push({familyId,variantId,reason:error instanceof Error?error.message:String(error)});}
 }
 rejected.push(...generationRejected);
 const grouped=new Map<string,string[]>();for(const r of records)grouped.set(r.answer,[...(grouped.get(r.answer)??[]),r.id]);
 return {version:'qfn-bank-v1',records,rejected,audit:{promptDuplicates:0,signatureMaximum:Math.max(...signatures.values()),answerGroups:[...grouped].filter(([,ids])=>ids.length>1).map(([answer,ids])=>({answer,ids}))}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const bank=buildQfnBank();ensure(bank.records.length>=85,'Fewer than 85 validated variants: '+JSON.stringify(bank.rejected));
 const path=new URL('../data/qfn-bank.json',import.meta.url),text=JSON.stringify(bank,null,2)+'\n';
 if(process.argv.includes('--check'))ensure(readFileSync(path,'utf8')===text,'Committed static bank is stale');else writeFileSync(path,text);
 console.log(JSON.stringify({accepted:bank.records.length,families:Object.fromEntries([1,2,3,4,5].map(i=>[i,bank.records.filter(r=>r.familyId===`QFN-F${i}`).length])),rejected:bank.rejected}));
}
