import test from 'node:test';
import assert from 'node:assert/strict';
import {boundaryJump,dynamicQuadratic} from '../src/ui/dynamic-quadratic.ts';
import type {DynamicSpec} from '../src/ui/dynamic-quadratic.ts';
import type {ExplanationGraph} from '../src/ui/explanation-graph.ts';

const emptyGraph=(title:string):ExplanationGraph=>({title,curves:[{formula:'y=0',coefficients:[0,0,0]}],view:[-3,3,-3,3],caption:'test'});
const epsilon=1e-10;
const countFromD=(d:number)=>Math.abs(d)<=epsilon?1:d>0?2:0;

function irrationalSpec(kind:'simple'|'double'):DynamicSpec{
 const root=Math.sqrt(2),D=kind==='simple'?(k:number)=>k*k-2:(k:number)=>(k-root)**2;
 const boundaries=kind==='simple'?[{value:-root,label:'−√2'},{value:root,label:'√2'}]:[{value:root,label:'√2'}];
 return {
  parameter:'k',min:-3,max:3,initial:0,boundaries,
  regions:kind==='simple'?['k＜−√2','k=−√2','−√2＜k＜√2','k=√2','k＞√2']:['k＜√2','k=√2','k＞√2'],
  region:k=>kind==='simple'?(k< -root-epsilon?0:Math.abs(k+root)<=epsilon?1:k<root-epsilon?2:Math.abs(k-root)<=epsilon?3:4):(k<root-epsilon?0:Math.abs(k-root)<=epsilon?1:2),
  graph:k=>emptyGraph(`D=${D(k)}`),reason:k=>`D=${D(k)}／共有点${countFromD(D(k))}個`
 };
}

test('dynamic boundary: exact irrational value and symbolic label stay separate',()=>{
 const spec=irrationalSpec('simple'),jump=boundaryJump(spec,1),root=Math.sqrt(2);
 assert.equal(jump.value,root);
 assert.equal(jump.label,'√2');
 assert.equal(jump.rangeValue,String(root));
 assert.notEqual(jump.value,1.41);
 assert.ok(Math.abs(jump.value*jump.value-2)<=epsilon);
 assert.equal(jump.region,3);
 assert.ok(jump.reason.includes('共有点1個'));
 assert.ok(evalAt(spec,root-.01)<0);
 assert.ok(evalAt(spec,root+.01)>0);
 const html=dynamicQuadratic('irrational-simple',spec);
 assert.ok(html.includes('境界 k=√2'));
 assert.ok(html.includes('data-boundary-index="1"'));
 assert.ok(html.includes(`title="exact: ${root}"`));
 assert.ok(!html.includes('data-boundary="1.41"'));
 const initiallyExact={...spec,initial:root};
 const initialHtml=dynamicQuadratic('irrational-initial',initiallyExact);
 assert.ok(initialHtml.includes('<output>√2</output>'));
});

test('dynamic boundary: a double irrational boundary remains nonnegative on both sides',()=>{
 const spec=irrationalSpec('double'),jump=boundaryJump(spec,0),root=Math.sqrt(2);
 assert.equal(jump.value,root);
 assert.equal(jump.label,'√2');
 assert.ok(Math.abs(evalAt(spec,jump.value))<=epsilon);
 assert.equal(countFromD(evalAt(spec,jump.value)),1);
 assert.ok(evalAt(spec,root-.01)>0);
 assert.ok(evalAt(spec,root+.01)>0);
 assert.equal(countFromD(evalAt(spec,root-.01)),2);
 assert.equal(countFromD(evalAt(spec,root+.01)),2);
});

function evalAt(spec:DynamicSpec,k:number){
 const title=spec.graph(k).title;
 return Number(title.slice(title.indexOf('=')+1));
}
