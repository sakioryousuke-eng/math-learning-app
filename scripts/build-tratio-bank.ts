import {readFileSync,writeFileSync} from 'node:fs';
import {buildTratioBank} from '../src/tratio-bank/generate.ts';
const file=new URL('../data/tratio-bank.json',import.meta.url),artifact=buildTratioBank(),text=JSON.stringify(artifact,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(file,'utf8')!==text)throw new Error('TRATIO artifact differs. Regenerate and review.');}else writeFileSync(file,text);
console.log(JSON.stringify({generated:artifact.records.length,max:artifact.max.length,...artifact.audit}));
