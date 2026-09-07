import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const checks:[string,string[]][]=[['tests',['--test','tests/*.test.ts']],['strict',['node_modules/typescript/bin/tsc','--noEmit']],['production',['node_modules/vite/bin/vite.js','build','--configLoader','native','--outDir','dist-production']],['demo',['node_modules/vite/bin/vite.js','build','--configLoader','native','--mode','demo']]];
let report='Stage 5 verification\n';
for(const [name,args] of checks){const r=spawnSync(process.execPath,args,{encoding:'utf8'}),output=(r.stdout??'')+(r.stderr??'');if(name==='tests')writeFileSync('STAGE5-TEST-RESULTS.txt',output);report+=`\n${name}: ${r.status===0?'PASS':'FAIL'}\n${output}`;writeFileSync('STAGE5-CHECKS.txt',report);console.log(name,r.status===0?'PASS':'FAIL');if(r.status!==0){console.error(output);process.exit(r.status??1);}}
