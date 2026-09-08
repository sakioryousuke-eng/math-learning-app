import {axisModel,axisState,equivalentAxisAnswers} from './quadratic-axis-family.ts';
import type {AxisAnswer,AxisCase} from './quadratic-axis-family.ts';
import {evaluate,fraction,polynomialText,placementBoundaries,solveConditions,contains,equivalentSets,setText} from './quadratic-placement-family.ts';
import type {PlacementSet,PlacementRange,PlacementCondition} from './quadratic-placement-family.ts';
import type {Polynomial,ExplanationGraph} from '../ui/explanation-graph.ts';
import type {DynamicBoundary} from '../ui/dynamic-quadratic.ts';
export interface QuadraticExpression {A:1|-1;B:Polynomial;C:Polynomial}
export const add=(p:Polynomial,q:Polynomial):Polynomial=>p.map((v,i)=>v+q[i]) as Polynomial;
export const times=(p:Polynomial,s:number):Polynomial=>p.map(v=>v*s) as Polynomial;
export const constant=(v:number):Polynomial=>[0,0,v];
export function compose(p:Polynomial,s:number,t:number):Polynomial{return [p[0]*s*s,2*p[0]*s*t+p[1]*s,p[0]*t*t+p[1]*t+p[2]];}
export function integerPolynomial(p:Polynomial):Polynomial{for(let n=1;n<=1024;n++)if(p.every(v=>Math.abs(v*n-Math.round(v*n))<1e-10))return p.map(v=>Math.round(v*n)) as Polynomial;throw new Error('Unsupported coefficient denominator');}
export const solve=(cs:PlacementCondition[],union=false)=>solveConditions(cs.map(c=>({...c,polynomial:integerPolynomial(c.polynomial)})),union);
export const boundary=(v:number):DynamicBoundary=>({value:v,label:fraction(v)});
export const relation=(id:string,p:Polynomial,inclusive:boolean):PlacementCondition=>({id,polynomial:p,inclusive,label:`${polynomialText(p)}${inclusive?'≧':'>'}0`,reason:id});
export function rangeConditions(r:PlacementRange){return [...(r.lo?[relation('lower',[0,1,-r.lo.value],r.loClosed)]:[]),...(r.hi?[relation('upper',[0,-1,r.hi.value],r.hiClosed)]:[])];}
// Missing glue between existing interval results; polynomial solving stays in family 4.
export function unionSets(sets:PlacementSet[]):PlacementSet{
 const sorted=sets.flat().map(r=>({...r})).sort((a,b)=>(a.lo?.value??-Infinity)-(b.lo?.value??-Infinity)||Number(b.loClosed)-Number(a.loClosed));const out:PlacementSet=[];
 for(const r of sorted){const last=out.at(-1);if(last&&(!last.hi||!r.lo||last.hi.value>r.lo.value+1e-9||(Math.abs(last.hi.value-r.lo.value)<1e-9&&(last.hiClosed||r.loClosed)))){if(!r.hi||last.hi&&r.hi.value>last.hi.value+1e-9){last.hi=r.hi;last.hiClosed=r.hiClosed;}else if(last.hi&&r.hi&&Math.abs(last.hi.value-r.hi.value)<1e-9)last.hiClosed=last.hiClosed||r.hiClosed;}else out.push(r);}return out;
}
export function intersectSets(sets:PlacementSet[]):PlacementSet{
 let out:PlacementSet=[{lo:null,hi:null,loClosed:false,hiClosed:false}];
 for(const set of sets){const next:PlacementSet=[];for(const a of out)for(const b of set){const lo=!a.lo?b.lo:!b.lo?a.lo:a.lo.value>b.lo.value?a.lo:b.lo,hi=!a.hi?b.hi:!b.hi?a.hi:a.hi.value<b.hi.value?a.hi:b.hi;
 const loClosed=(!a.lo||lo!.value>a.lo.value+1e-9||a.loClosed)&&(!b.lo||lo!.value>b.lo.value+1e-9||b.loClosed),hiClosed=(!a.hi||hi!.value<a.hi.value-1e-9||a.hiClosed)&&(!b.hi||hi!.value<b.hi.value-1e-9||b.hiClosed);
 if(!lo||!hi||lo.value<hi.value-1e-9||Math.abs(lo.value-hi.value)<1e-9&&loClosed&&hiClosed)next.push({lo,hi,loClosed,hiClosed});}out=unionSets([next]);}return out;
}
export function expressionText(e:QuadraticExpression){const signed=(s:string)=>s==='0'?'':s.startsWith('−')?s:'+'+s;const B=e.B[0]===0&&e.B[1]===0?polynomialText([0,e.B[2],0],'x'):e.B[0]===0&&e.B[2]===0?polynomialText(e.B)+'x':`(${polynomialText(e.B)})x`;return `${e.A===1?'':'−'}x²${signed(B)}${signed(polynomialText(e.C))}`;}
export function expressionAt(e:QuadraticExpression,k:number):Polynomial{return [e.A,evaluate(e.B,k),evaluate(e.C,k)];}
export function extremaComponent(expression:QuadraticExpression,L:number,R:number){
 if(expression.B[0]!==0)throw new Error('Affine axis required');
 const axis=times(expression.B,-1/(2*expression.A)),s=axis[1],t=axis[2],vertical=add(expression.C,times([s*s,2*s*t,t*t],-expression.A));
 const base=axisModel({sign:expression.A,c:0,L,R,target:'both',level:'高め'});
 const lift=(rows:AxisCase[]):AxisCase[]=>rows.flatMap(row=>{
  if(s===0){const inside=(row.lo===null||(row.loClosed?t>=row.lo:t>row.lo))&&(row.hi===null||(row.hiClosed?t<=row.hi:t<row.hi));return inside?[{...row,lo:null,hi:null,loClosed:false,hiClosed:false,polynomial:add(compose(row.polynomial,0,t),vertical)}]:[];}
  const low=row.lo===null?null:(row.lo-t)/s,high=row.hi===null?null:(row.hi-t)/s;
  return [{...row,lo:s>0?low:high,hi:s>0?high:low,loClosed:s>0?row.loClosed:row.hiClosed,hiClosed:s>0?row.hiClosed:row.loClosed,polynomial:add(compose(row.polynomial,s,t),vertical)}];
 });
 const liftAnswer=(a:AxisAnswer):AxisAnswer=>Object.fromEntries(Object.entries(a).map(([key,rows])=>[key,lift(rows)]));
 const answer=liftAnswer(base.answer),boundaries=s===0?[]:base.boundaries.map(v=>boundary((v-t)/s)).sort((a,b)=>a.value-b.value);
 const axisText=polynomialText(axis),square=axisText==='0'?'x²':axisText==='k'?'(x−k)²':s===0?`(x${t<0?'+':'−'}${fraction(Math.abs(t))})²`:`(x−(${axisText}))²`,vText=polynomialText(vertical);
 return {kind:'extrema' as const,expression,L,R,axis,vertical,left:add(compose(base.left,s,t),vertical),right:add(compose(base.right,s,t),vertical),base,answer,liftAnswer,boundaries,completedSquare:`${expression.A===1?'':'−'}${square}${vText==='0'?'':vText.startsWith('−')?vText:'+'+vText}`};
}
export type ExtremaComponent=ReturnType<typeof extremaComponent>;
export type ExtremaConstraint={key:'min'|'max';op:'ge'|'le'|'eq';value:number};
export function constrainExtrema(c:ExtremaComponent,condition:ExtremaConstraint,answer=c.answer):PlacementSet{
 return unionSets((answer[condition.key]??[]).map(row=>{
  const range:PlacementRange={lo:row.lo===null?null:boundary(row.lo),hi:row.hi===null?null:boundary(row.hi),loClosed:row.loClosed,hiClosed:row.hiClosed},diff=add(row.polynomial,constant(-condition.value));
  const tests=condition.op==='eq'?[relation('value_ge',diff,true),relation('value_le',times(diff,-1),true)]:[relation('value_bound',times(diff,condition.op==='ge'?1:-1),true)];
  return solve([...rangeConditions(range),...tests]);
 }));
}
export function evaluateCases(answer:AxisAnswer,k:number){const read=(key:'min'|'max')=>(answer[key]??[]).filter(r=>(r.lo===null||(r.loClosed?k>=r.lo-1e-9:k>r.lo+1e-9))&&(r.hi===null||(r.hiClosed?k<=r.hi+1e-9:k<r.hi-1e-9))).map(r=>evaluate(r.polynomial,k));return {min:read('min'),max:read('max')};}
export function extremaOracle(c:ExtremaComponent,k:number){
 const q=expressionAt(c.expression,k),h=-q[1]/(2*q[0]);
 // Reuse family 2's independent candidate-point path, then evaluate the original expression.
 const state=axisState(c.base.parameters,h),points=state.minCandidates.map(p=>({x:p.x,value:evaluate(q,p.x)}));
 return {axis:h,vertex:evaluate(q,h),points,min:Math.min(...points.map(p=>p.value)),max:Math.max(...points.map(p=>p.value))};
}
export function extremaGraph(c:ExtremaComponent,k:number):ExplanationGraph{const state=extremaOracle(c,k),q=expressionAt(c.expression,k),span=Math.max(2,state.max-state.min),lo=c.L-1,hi=c.R+1;return {title:'軸・頂点・端点と指定区間',curves:[{formula:`y=${polynomialText(q,'x',v=>String(Math.round(v*1000)/1000))}`,coefficients:q}],view:[lo,hi,Math.min(0,state.min)-span*.3,Math.max(0,state.max)+span*.3],domain:[c.L,c.R],caption:`指定区間での最小値は約${Math.round(state.min*1000)/1000}、最大値は約${Math.round(state.max*1000)/1000}です。頂点は区間内にある場合だけ候補にします。図は現在のパラメータの例であり、全範囲と境界は式で確かめます。`};}
export function casesText(a:AxisAnswer){return (['max','min'] as const).filter(key=>a[key]).map(key=>`${key==='max'?'最大値':'最小値'}：\n${a[key]!.map(row=>`${setText([{lo:row.lo===null?null:boundary(row.lo),hi:row.hi===null?null:boundary(row.hi),loClosed:row.loClosed,hiClosed:row.hiClosed}])} のとき ${polynomialText(row.polynomial)}`).join('\n')}`).join('\n');}
export type IntegratedAnswer={kind:'set';set:PlacementSet}|{kind:'values';min:number;max:number}|{kind:'cases';cases:AxisAnswer}|{kind:'tangent';points:{k:DynamicBoundary;x:number;xLabel:string;y:number}[]};
export function answerText(a:IntegratedAnswer){switch(a.kind){case 'set':return setText(a.set);case 'values':return `最大値 ${Number.isFinite(a.max)?fraction(a.max):'なし（上に限りがない）'}\n最小値 ${Number.isFinite(a.min)?fraction(a.min):'なし（下に限りがない）'}`;case 'cases':return casesText(a.cases);case 'tangent':return a.points.length?a.points.map(p=>`k=${p.k.label}、接点 (${p.xLabel}, ${fraction(p.y)})`).join('\n'):'該当するkはない';}}
export function equivalentAnswers(a:IntegratedAnswer,b:IntegratedAnswer){if(a.kind!==b.kind)return false;switch(a.kind){case 'set':return b.kind==='set'&&equivalentSets(a.set,b.set);case 'values':return b.kind==='values'&&a.min===b.min&&a.max===b.max;case 'cases':return b.kind==='cases'&&equivalentAxisAnswers(a.cases,b.cases);case 'tangent':return b.kind==='tangent'&&a.points.length===b.points.length&&a.points.every((p,i)=>Math.abs(p.k.value-b.points[i].k.value)<1e-9&&Math.abs(p.x-b.points[i].x)<1e-9&&Math.abs(p.y-b.points[i].y)<1e-9);}}
export function setBoundaries(set:PlacementSet){return set.flatMap(r=>[r.lo,r.hi].filter((b):b is DynamicBoundary=>b!==null));}
export function allBoundaries(...groups:DynamicBoundary[][]){return groups.flat().sort((a,b)=>a.value-b.value).filter((b,i,a)=>!i||Math.abs(b.value-a[i-1].value)>1e-9);}
export {contains,placementBoundaries};
