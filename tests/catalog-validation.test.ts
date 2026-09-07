import test from 'node:test';
import assert from 'node:assert/strict';
import {assertProblems,problems} from '../src/services/catalog.ts';
test('catalog: all 100 fixed problems remain valid',()=>{assert.equal(problems.length,100);assert.doesNotThrow(()=>assertProblems(problems));});
for(const name of ['duplicate','unknownSkill','unknownUnit','missingAnswer','missingExplanation','difficulty','inconsistentDifficulty'])test(`catalog: rejects ${name}`,()=>{const rows:Record<string,unknown>[]=structuredClone(problems).map(p=>({...p}));if(name==='duplicate')rows[1].id=rows[0].id;if(name==='unknownSkill')rows[0].skillId='UNKNOWN';if(name==='unknownUnit')rows[0].unitId='UNKNOWN';if(name==='missingAnswer')rows[0].answer='';if(name==='missingExplanation')rows[0].solution='';if(name==='difficulty')rows[0].difficulty=NaN;if(name==='inconsistentDifficulty')rows[1].difficulty=5;assert.throws(()=>assertProblems(rows));});
