import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {compareAnswer,summarize} from '../src/grading/verification.ts';
import type {AnswerCase} from '../src/grading/verification.ts';
import {createGradingHandler,loadGradingConfig} from '../src/server/grading-handler.ts';
import {GradingError} from '../src/grading/schema.ts';
const live=process.argv.includes('--live');
if(live)throw new Error('Stage 4: live AI grading is disabled. Use verify:prepared; no requests sent.');
const config=loadGradingConfig(process.cwd());
if(live&&!config.apiKey)throw new Error('Live grading requires server-side OPENAI_API_KEY. No requests sent.');
const answers=JSON.parse(readFileSync('verification/answers.json','utf8')) as AnswerCase[];
const handler=createGradingHandler(()=>config);
const rows:ReturnType<typeof compareAnswer>[]=[];
for(const answer of answers){
 if(!live){rows.push(compareAnswer(answer,null));continue;}
 try{const receipt=await handler.execute({submissionId:randomUUID(),problemId:answer.problemId,context:answer.problemId.includes('-MAX-')?'max':'practice',image:{mime:'image/png',base64:readFileSync(answer.image).toString('base64')}});rows.push(compareAnswer(answer,receipt.evaluation));}
 catch(e){rows.push(compareAnswer(answer,null,e instanceof GradingError?e.code:'UNKNOWN'));}
}
const mode=live?'live':'prepared';mkdirSync('verification/results',{recursive:true});
const result={runAt:new Date().toISOString(),mode,model:live?config.model:null,summary:summarize(rows),rows};
writeFileSync(`verification/results/${mode}.json`,JSON.stringify(result,null,2)+'\n');
const quote=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
const table=[['id','problemId','variant','source','humanReviewed','status','expectedOverall','aiOverall','overallMatch','expectedTags','aiTags','extraTags','missedTags','expectedLegibility','aiLegibility','technicalError'],...rows.map(r=>[r.id,r.problemId,r.variant,r.source,r.humanReviewed,r.status,r.expected.overall,r.ai?.overall,r.overallMatch,r.expected.errorTags.join('|'),r.ai?.errorTags.join('|'),r.extraErrorTags?.join('|'),r.missedErrorTags?.join('|'),r.expected.legibility,r.ai?.legibility,r.technicalError])];
writeFileSync(`verification/results/${mode}.csv`,'\uFEFF'+table.map(row=>row.map(quote).join(',')).join('\r\n'));
console.log(JSON.stringify(result.summary,null,2));
