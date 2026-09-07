// Independent numeric checks supplement the written derivations; they are not proofs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {lessons} from '../src/curriculum/quadratic.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const f=(a:number,b:number,c:number,x:number)=>a*x*x+b*x+c;
function extrema(a:number,b:number,c:number,l:number,r:number){const xs=[l,r];const v=-b/(2*a);if(v>=l&&v<=r)xs.push(v);const ys=xs.map(x=>f(a,b,c,x));return [Math.min(...ys),Math.max(...ys)];}
// Independent polynomial identities for graph, conversion and bounded extrema lessons.
for(const [a,b,c,h,k] of [[.5,-2,1,2,-1],[-2,-4,1,-1,3],[2,-12,16,3,-2],[1,-6,5,3,-4],[-2,-8,-5,-2,3],[3,-3,2,.5,1.25],[-.5,3,-2,3,2.5]]){
 for(let x=-6;x<=6;x+=.25)close(f(a,b,c,x),a*(x-h)**2+k);
 close(f(a,b,c,h),k);
}
for(const [a,b,c,l,r,min,max] of [[1,-4,1,0,3,-3,1],[1,-8,17,0,2,5,17],[-1,2,3,-1,3,0,4],[2,4,-1,-1,2,-3,15]])assert.deepEqual(extrema(a,b,c,l,r),[min,max]);
for(const x of [-1,3])close(x*x,2*x+3);
for(const x of [-Math.sqrt(2),Math.sqrt(2)]){close(x*x+1,-x*x+5);close(x*x+1,3);}
close(2*2+2,2*2-2+4);
for(const [a,b,c,count] of [[1,-2,-2,2],[2,-4,2,1],[1,2,3,0],[-1,2,1,2]]){const d=b*b-4*a*c;assert.equal(d>0?2:d===0?1:0,count);}
// Dense samples include exact boundaries. Extrema are from candidates, not grid search.
let samples=0;
for(let a=-4;a<=5;a+=.125){
 const [min,max]=extrema(1,-2*a,a*a,0,2);
 close(min,a<0?a*a:a<=2?0:(2-a)**2);
 close(max,a<1?(2-a)**2:a*a);
 close(extrema(-1,2*a,2-a*a,-1,1)[1],a< -1?2-(a+1)**2:a<=1?2:2-(a-1)**2);
 const d=4*a*a-4*a;assert.equal(d>0?2:d===0?1:0,a<0||a>1?2:a===0||a===1?1:0);
 close(extrema(1,-2,0,a,a+2)[0],a< -1?(a+1)**2-1:a<=1?-1:(a-1)**2-1);
 assert.equal(extrema(1,-2,0,a,a+2)[1]<=3,a>=-1&&a<=1);
 // MAX 1 root membership, endpoints, full nonnegative condition.
 const roots=[a-1,a+1].filter(x=>x>=0&&x<=2);
 assert.equal(roots.length,a< -1||a>3?0:a===1?2:1);
 assert.equal(extrema(1,-2*a,a*a-1,0,2)[0]>=0,a<=-1||a>=3);
 samples++;
}
for(let x=-5;x<=5;x+=.125){
 assert.equal(x>=-2&&x<3&&f(1,-1,-2,x)>=0,x>=-2&&x<=-1||x>=2&&x<3);
 close(f(1,-5,6,x),(x-2)*(x-3));close(2*x*x-8,2*(x-2)*(x+2));
 if(x>=1&&x<=4){close(x*(12-2*x),18-2*(x-3)**2);assert.equal(x*(12-2*x)>=16,x>=2&&x<=4);}
 if(x>=0&&x<=4)assert.equal(-x*x+4*x+1>=4,x>=1&&x<=3);
}
for(const k of [-2,-1,-.999,-.75,-.749,0,1,3,3.001,4,4.999,5,6]){
 if(k>=-1){const r=Math.sqrt(k+1);assert.equal(r>0&&2-r>=0&&2+r<=4,k>-1&&k<=3);
  if(k>-1&&k<=3)assert.equal(2-r<=1+r,k>=-.75);
 }
 if(k<=5){const r=Math.sqrt(5-k);assert.equal(r>0&&2-r>=0&&2+r<=4,k>=1&&k<5);}
}
for(const p of [.1,3,4,4.001,5,20/3,20/3+.001,10,12,12.001,15]){
 close(extrema(-1,p,-4,0,6)[1],p<=12?p*p/4-4:6*p-40);
 if(p>4){const r=Math.sqrt(p*p-16),lo=(p-r)/2,hi=(p+r)/2;close(lo*lo-p*lo+4,0);close(hi*hi-p*hi+4,0);assert.equal(lo>=0&&hi<=6+1e-10,p<=20/3);}
}
const manifest:Record<string,string>=JSON.parse(readFileSync(new URL('../docs/education-design/quadratic-reviewed-hashes.json',import.meta.url),'utf8'));
for(const l of lessons){const hash=createHash('sha256').update(JSON.stringify(l)).digest('hex');assert.equal(hash,manifest[l.problem.id],`Re-review required: ${l.problem.id}`);}
assert.equal(Object.keys(manifest).length,lessons.length);
console.log(`Mathematical audit PASS: ${lessons.length} reviewed records sealed; ${samples} parameter samples plus identities, interval/root/endpoint checks. Written proofs remain authoritative.`);
