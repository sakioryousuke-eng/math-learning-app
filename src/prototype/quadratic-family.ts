import type {ExplanationGraph} from '../ui/explanation-graph.ts';
export interface FamilyParameters {h:number;c:number;L:number;R:number;leftClosed:boolean;rightClosed:boolean}
export interface KRange {lower:number;lowerClosed:boolean;upper:number|null;upperClosed:boolean}
export type MistakeType='real_root_only'|'double_root_included'|'boundary_equality'|'one_root_only';
export type FamilyCrossSkill='X03'|'X04'|'X07'|'X08'|'X13';
export interface ProblemRequirement {id:string;description:string;crossSkills:FamilyCrossSkill[]}
export interface MistakeHypothesis {choiceId:string;mistakeType:MistakeType;description:string;weaknessTags:MistakeType[];crossSkills:FamilyCrossSkill[];hypothesisOnly:true}
export interface FamilyChoice {choiceId:string;range:KRange;text:string;correct:boolean;mistakeType:MistakeType|null;mistakeHypotheses:MistakeHypothesis[]}
const requirements:ProblemRequirement[]=[
 {id:'intersection_equation',description:'共有点の条件を、高さが等しい方程式に変換する',crossSkills:['X08']},
 {id:'distinct_roots',description:'「異なる2点」の条件を保ち、重解を除く',crossSkills:['X04']},
 {id:'both_roots',description:'二つの根を漏れなく両方確認する',crossSkills:['X07']},
 {id:'preserve_interval',description:'指定区間の条件を、両根の条件へ引き継ぐ',crossSkills:['X04']},
 {id:'endpoint_inclusion',description:'区間の端点を含むかどうかと、不等号の等号を対応させる',crossSkills:['X03']},
 {id:'verify_original',description:'得た範囲を、異なる2点・両根の区間という元の条件で検証する',crossSkills:['X13']}
];
// A choice suggests a specific hypothesis; required abilities are never failure evidence.
const hypotheses:Record<MistakeType,{description:string;crossSkills:FamilyCrossSkill[]}>= {
 real_root_only:{description:'実数解の条件だけで止まり、指定区間の条件を引き継いでいない可能性',crossSkills:['X04']},
 double_root_included:{description:'「異なる2点」の条件を保てず、重解を含めている可能性',crossSkills:['X04']},
 boundary_equality:{description:'端点を含むかどうかと、境界値の等号が対応していない可能性',crossSkills:['X03']},
 one_root_only:{description:'二つの根のうち、一方だけを確認している可能性',crossSkills:['X07']}
};
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
  boundaries:{doubleRoot:p.c,leftEndpoint:leftValue,rightEndpoint:rightValue}
 };
}

export interface DiagnosticCandidate {key:string;choice:FamilyChoice;diagnosticScore:number;relevanceReason:string}
export interface CandidateDecision extends DiagnosticCandidate {selected:boolean;selectionReason:string}
export const equivalentRange=(a:KRange,b:KRange)=>a.lower===b.lower&&a.lowerClosed===b.lowerClosed&&a.upper===b.upper&&(a.upper===null||a.upperClosed===b.upperClosed);
// Score ties use semantic keys, never a problem number or candidate array position.
export function selectDiagnosticCandidates(correct:KRange,primary:DiagnosticCandidate[],supplement:()=>DiagnosticCandidate[]){
 const selected:DiagnosticCandidate[]=[],decisions:CandidateDecision[]=[];
 const consider=(candidates:DiagnosticCandidate[])=>{
  for(const c of [...candidates].sort((a,b)=>b.diagnosticScore-a.diagnosticScore||(a.key<b.key?-1:a.key>b.key?1:0))){
   const duplicate=selected.find(other=>equivalentRange(other.choice.range,c.choice.range));
   const excluded=equivalentRange(correct,c.choice.range)?'正答と数学的に同値':duplicate?`採用候補「${duplicate.key}」と数学的に同値`:c.diagnosticScore<=0?'左右対称で片側だけを見る独立した誤答としての診断価値が低い':selected.length>=3?'有効な候補だが、数学的状況により上位3候補を優先':'';
   if(!excluded)selected.push(c);
   decisions.push({...c,selected:!excluded,selectionReason:excluded||`採用：${c.relevanceReason}`});
  }
 };
 consider(primary);
 if(selected.length<3)consider(supplement());
 return {choices:selected.map(c=>c.choice),decisions};
}
export function generateFamilyProblem(p:FamilyParameters,index:number){
 const model=familyModel(p),{finalRange:r}=model,id=`QF-FAMILY-HORIZONTAL-${String(index).padStart(2,'0')}`;
 const candidate=(mistakeType:MistakeType,range:KRange):FamilyChoice=>({choiceId:`${id}:${mistakeType}`,range,text:rangeText(range),correct:false,mistakeType,mistakeHypotheses:[{choiceId:`${id}:${mistakeType}`,mistakeType,description:hypotheses[mistakeType].description,weaknessTags:[mistakeType],crossSkills:[...hypotheses[mistakeType].crossSkills],hypothesisOnly:true}]});
 const ignore=candidate('real_root_only',{...r,upper:null,upperClosed:false});
 const double=candidate('double_root_included',{...r,lowerClosed:true});
 const equality=candidate('boundary_equality',{...r,upperClosed:!r.upperClosed});
 const farClosed=model.leftDistance>model.rightDistance?p.leftClosed:p.rightClosed;
 const one=candidate('one_root_only',{...r,upper:Math.max(model.leftValue,model.rightValue),upperClosed:farClosed});
 const asymmetric=model.limiting!=='both',mixed=p.leftClosed!==p.rightClosed;
 const boundaryScore=mixed?105:!r.upperClosed?100:85;
 const oneScore=asymmetric?95+Math.min(4,Math.abs(model.leftDistance-model.rightDistance)/Math.min(model.leftDistance,model.rightDistance)):0;
 const rated=(key:string,choice:FamilyChoice,diagnosticScore:number,relevanceReason:string):DiagnosticCandidate=>({key,choice,diagnosticScore,relevanceReason});
 const primary=[
  rated('real_root_only',ignore,90,'有限区間が指定されているため、kの下限だけで止まると両根の区間条件を落とす'),
  rated('double_root_included',double,80,`k=${numberText(p.c)}では共有点が頂点の1点になる。「異なる2点」による重解除外を確かめる`),
  rated('boundary_equality',equality,boundaryScore,mixed?'左右の端点の開閉が異なるため、上限を決める端点の等号を見分ける必要がある':!r.upperClosed?'開いた端点が上限を決めるため、境界値の等号を除く判断が核心になる':'上限を決める端点を含むため、上限の等号を残す判断を確かめる'),
  rated('one_root_only',one,oneScore,asymmetric?`左右の距離が${numberText(model.leftDistance)}と${numberText(model.rightDistance)}で異なる。遠い端の条件だけでは上限が${numberText(Math.max(model.leftValue,model.rightValue))}まで広がる`:'左右の距離が等しく、片側だけの確認では独立した誤答を作りにくい')
 ];
 // Meaningful reserve errors combine existing misconceptions, without inventing numeric offsets.
 const supplement=()=>{
  const combine=(key:string,range:KRange,types:MistakeType[],score:number,reason:string)=>{
   const choice=candidate(types[0],range);choice.choiceId=`${id}:${key}`;
   choice.mistakeHypotheses=types.map(type=>({...candidate(type,range).mistakeHypotheses[0],choiceId:choice.choiceId}));
   return rated(key,choice,score,reason);
  };
  return [
   combine('double_and_boundary',{...r,lowerClosed:true,upperClosed:!r.upperClosed},['double_root_included','boundary_equality'],60,'重解除外と端点の等号の両方を誤る補助候補'),
   combine('real_and_double',{...r,lowerClosed:true,upper:null,upperClosed:false},['real_root_only','double_root_included'],55,'実数解条件だけで止まり、区間条件と重解除外を落とす補助候補'),
   // These model-derived reserves also cover future primary candidate deduplication.
   rated('reserve_boundary',equality,50,'端点の等号だけを誤る補助候補'),
   rated('reserve_double',double,45,'重解だけを含める補助候補'),
   rated('reserve_interval',ignore,40,'区間条件だけを落とす補助候補')
  ];
 };
 const selection=selectDiagnosticCandidates(r,primary,supplement);
 const choices:FamilyChoice[]=[{choiceId:`${id}:correct`,range:{...r},text:rangeText(r),correct:true,mistakeType:null,mistakeHypotheses:[]},...selection.choices];
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
 return {id,index,status:'prototype-unreviewed' as const,problemRequirements:requirements.map(r=>({...r,crossSkills:[...r.crossSkills]})),mistakeHypotheses:choices.flatMap(c=>c.mistakeHypotheses),model,distractorSelection:selection.decisions,prompt:`放物線${model.curve}と水平線y=kが異なる2点で交わり、その2つの共有点のx座標がともに${model.interval}を満たすような、実数kの範囲を求めよ。`,answer,choices,explanation,graph,sampleK,variation:`${model.limiting}:${r.upperClosed?'inclusive':'strict'}`};
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
