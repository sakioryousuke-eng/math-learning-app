import type {ExplanationGraph} from '../ui/explanation-graph.ts';
export interface FamilyParameters {h:number;c:number;L:number;R:number;leftClosed:boolean;rightClosed:boolean}
export interface KRange {lower:number;lowerClosed:boolean;upper:number|null;upperClosed:boolean}
export type MistakeType='real_root_only'|'double_root_included'|'boundary_equality'|'one_root_only';
export interface FamilyChoice {choiceId:string;range:KRange;text:string;correct:boolean;mistakeType:MistakeType|null;weaknessTags:string[];crossSkills:string[]}
export const numberText=(v:number)=>{let numerator=Math.round(v*16),denominator=16;while(denominator>1&&numerator%2===0){numerator/=2;denominator/=2;}return denominator===1?String(numerator):`${numerator}/${denominator}`;};
const signed=(v:number)=>v===0?'':`${v<0?'−':'+'}${numberText(Math.abs(v))}`;
export const rangeText=(r:KRange)=>`${numberText(r.lower)}${r.lowerClosed?'≦':'<'}k${r.upper===null?'':`${r.upperClosed?'≦':'<'}${numberText(r.upper)}`}`;
export const accepts=(r:KRange,k:number)=>(r.lowerClosed?k>=r.lower:k>r.lower)&&(r.upper===null||(r.upperClosed?k<=r.upper:k<r.upper));
export function familyModel(p:FamilyParameters){
 if(![p.h,p.c,p.L,p.R].every(v=>Number.isFinite(v)&&Math.abs(v)<=20&&Number.isInteger(v*2))||!(p.L<p.h&&p.h<p.R))throw new Error('Use safe half-integers with L<h<R');
 const leftDistance=p.h-p.L,rightDistance=p.R-p.h;
 const leftValue=leftDistance**2+p.c,rightValue=rightDistance**2+p.c;
 const limiting=leftDistance===rightDistance?'both':leftDistance<rightDistance?'left':'right';
 const upperClosed=limiting==='both'?p.leftClosed&&p.rightClosed:limiting==='left'?p.leftClosed:p.rightClosed;
 const finalRange:KRange={lower:p.c,lowerClosed:false,upper:Math.min(leftValue,rightValue),upperClosed};
 const radicand=`k${signed(-p.c)}`,center=numberText(p.h),square=p.h===0?'x²':`(x${signed(-p.h)})²`;
 return {parameters:{...p},vertex:[p.h,p.c] as [number,number],axis:p.h,leftDistance,rightDistance,leftValue,rightValue,limiting,finalRange,
  curve:`y=${square}${signed(p.c)}`,equation:`${square}=${radicand}`,realCondition:`k≧${numberText(p.c)}`,distinctCondition:`k>${numberText(p.c)}`,
  roots:[`${center}−√(${radicand})`,`${center}+√(${radicand})`] as [string,string],
  leftRootCondition:`√(${radicand})${p.leftClosed?'≦':'<'}${numberText(leftDistance)}`,
  rightRootCondition:`√(${radicand})${p.rightClosed?'≦':'<'}${numberText(rightDistance)}`,
  interval:`${numberText(p.L)}${p.leftClosed?'≦':'<'}x${p.rightClosed?'≦':'<'}${numberText(p.R)}`,
  boundaries:{doubleRoot:p.c,leftEndpoint:leftValue,rightEndpoint:rightValue},
  crossSkills:['X03','X04','X06','X07','X08','X10','X13']
 };
}
export function generateFamilyProblem(p:FamilyParameters,index:number){
 const model=familyModel(p),{finalRange:r}=model,id=`QF-FAMILY-HORIZONTAL-${String(index).padStart(2,'0')}`;
 const candidate=(mistakeType:MistakeType,range:KRange,weaknessTags:string[],crossSkills:string[]):FamilyChoice=>({choiceId:`${id}:${mistakeType}`,range,text:rangeText(range),correct:false,mistakeType,weaknessTags,crossSkills});
 const ignore=candidate('real_root_only',{...r,upper:null,upperClosed:false},['real_root_only','interval_ignored','domain_interval'],['X03','X08','X10']);
 const double=candidate('double_root_included',{...r,lowerClosed:true},['double_root_included','condition_preservation'],['X04','X13']);
 const equality=candidate('boundary_equality',{...r,upperClosed:!r.upperClosed},['boundary_equality','condition_preservation','verification_missing'],['X04','X06','X13']);
 const farClosed=model.leftDistance>model.rightDistance?p.leftClosed:p.rightClosed;
 const one=candidate('one_root_only',{...r,upper:Math.max(model.leftValue,model.rightValue),upperClosed:farClosed},['one_root_only','domain_interval','verification_missing'],['X03','X07','X13']);
 const candidates=model.limiting!=='both'&&index%2===0?[one,double,ignore,equality]:[ignore,double,equality,one];
 const choices:FamilyChoice[]=[{choiceId:`${id}:correct`,range:{...r},text:rangeText(r),correct:true,mistakeType:null,weaknessTags:[],crossSkills:[]}];
 for(const candidate of candidates)if(choices.length<4&&!choices.some(c=>c.text===candidate.text))choices.push(candidate);
 if(choices.length!==4)throw new Error('Four distinct choices required');
 const d=Math.min(model.leftDistance,model.rightDistance),sampleK=p.c+(d/2)**2;
 const graph:ExplanationGraph={title:`水平線 y=k の例（k=${numberText(sampleK)}）`,curves:[{formula:model.curve,coefficients:[1,-2*p.h,p.h*p.h+p.c]},{formula:`y=${numberText(sampleK)}`,coefficients:[0,0,sampleK]}],view:[p.L-1,p.R+1,p.c-1,Math.max(model.leftValue,model.rightValue)+2],domain:[p.L,p.R],openLeft:!p.leftClosed,openRight:!p.rightClosed,caption:`指定区間は${model.interval}。この図は範囲内のk=${numberText(sampleK)}の例です。共有点は(${numberText(p.h-d/2)}, ${numberText(sampleK)})と(${numberText(p.h+d/2)}, ${numberText(sampleK)})。kの全範囲は以下の条件から判断します。`};
 const boundarySource=model.limiting==='both'?'左右の端点で同じ高さになるため、両端の条件':model.limiting==='left'?'左端のほうが軸に近いため、左端の条件':'右端のほうが軸に近いため、右端の条件';
 const answer=rangeText(r);
 const explanation={thinking:'異なる2点で交わるには、水平線が頂点より上にある必要があります。それだけでなく、二つの共有点がどちらも指定区間に入ることを確かめます。軸から左右の端までの距離を比べましょう。',steps:[
  `共有点では二つの高さが等しいので、${model.equation}です。実数解がある条件は${model.realCondition}ですが、等号では頂点で接する1点だけになります。異なる2点には${model.distinctCondition}が必要です。`,
  `このとき共有点のx座標は${model.roots[0]}と${model.roots[1]}です。軸x=${numberText(p.h)}は指定区間の内側にあるので、左の根は左端、右の根は右端との関係を調べれば十分です。`,
  `左の根が区間内に入るには${model.leftRootCondition}、右の根が入るには${model.rightRootCondition}が必要です。左右どちらか一方だけでなく、両方の条件を満たさなければなりません。`,
  `端点の高さはf(${numberText(p.L)})=${numberText(model.leftValue)}、f(${numberText(p.R)})=${numberText(model.rightValue)}です。${boundarySource}が上限を決めます。したがって、上限の境界はk=${numberText(r.upper!)}です。`,
  `k=${numberText(r.upper!)}では根は${numberText(p.h-d)}と${numberText(p.h+d)}になります。${r.upperClosed?'境界に来る根を含めて、両方とも指定区間内にあります。よって上限の等号を含めます。':'少なくとも一方の根が、含まない端点に来ます。よって上限の等号は含めません。'}一方、下限k=${numberText(p.c)}は重解になるため含めません。`,
  `以上を合わせると、求める範囲は${answer}です。この範囲では平方根が正で、二つの根がそれぞれ元の区間条件を満たします。`
 ],answer,finalRange:{...r}};
 return {id,index,status:'prototype-unreviewed' as const,model,prompt:`放物線${model.curve}と水平線y=kが異なる2点で交わり、その2つの共有点のx座標がともに${model.interval}を満たすような、実数kの範囲を求めよ。`,answer,choices,explanation,graph,sampleK,variation:`${model.limiting}:${r.upperClosed?'inclusive':'strict'}`};
}
// Curated cases include symmetric/asymmetric intervals, open/closed limiting and non-limiting ends.
const seeds:[number,number,number,number,boolean,boolean][]=[
 [0,0,-2,2,true,true],[1,-2,0,4,true,true],[-1,1,-4,1,true,true],[2,0,0,4,false,true],
 [-2,-1,-3,1,false,true],[1,2,-2,3,true,false],[0,-3,-1,1,true,false],[2,1,0,5,true,false],
 [-1,0,-4,0,false,true],[.5,-.5,-1,2,true,true],[1.5,1,0,4,true,true],[-.5,-2,-3,1,true,true],
 [0,2,-1.5,1.5,false,false],[2.5,-1,1,5,false,true],[-1.5,.5,-4,0,true,false],[1,0,-1,3,false,true],
 [0,-1,-2,3,true,true],[1,1,-2,3,true,true],[-2,2,-3.5,0,true,true],[2,-.5,-1,3,false,false]
];
export const familyProblems=seeds.map(([h,c,L,R,leftClosed,rightClosed],i)=>generateFamilyProblem({h,c,L,R,leftClosed,rightClosed},i+1));
export type FamilyProblem=ReturnType<typeof generateFamilyProblem>;
