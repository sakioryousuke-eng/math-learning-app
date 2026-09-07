import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import baseline from './stage1-hashes.json' with {type:'json'};
test('stage 1 source, DAG data, MAX policies and all 35 original tests are byte-for-byte unchanged',()=>{
  for(const entry of baseline){
    const bytes=readFileSync(new URL(`../${entry.path}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.path);
  }
});
