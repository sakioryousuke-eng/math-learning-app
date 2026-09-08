import type {Polynomial,ExplanationGraph} from '../ui/explanation-graph.ts';
import {numberText as n} from './quadratic-family.ts';
export type Target='min'|'max'|'both';
export interface AxisParameters {sign:1|-1;c:number;L:number;R:number;target:Target;level:'標準'|'応用'|'高め'}
export interface AxisCase {lo:number|null;hi:number|null;loClosed:boolean;hiClosed:boolean;polynomial:Polynomial;point:'left'|'right'|'vertex'|'both'}
export type AxisAnswer=Partial<Record<'min'|'max',AxisCase[]>>;
export type AxisMistake='vertex_always_used'|'left_endpoint_only'|'right_endpoint_only'|'case_boundary_missing'|'case_missing'|'boundary_equality'|'opening_direction_confusion';
export interface AxisHypothesis {choiceId:string;mistakeType:AxisMistake;description:string;weaknessTags:AxisMistake[];crossSkills:string[];hypothesisOnly:true}
export interface AxisChoice {choiceId:string;answer:AxisAnswer;text:string;correct:boolean;mistakeType:AxisMistake|null;mistakeHypotheses:AxisHypothesis[]}
const hypothesis:Record<AxisMistake,{description:string;crossSkills:string[]}>= {
 vertex_always_used:{description:'頂点が定義域に入るかどうか、また求める最大・最小の候補になるかを確認していない可能性',crossSkills:['X03']},
 left_endpoint_only:{description:'左端だけで判断し、右端や区間内の頂点との比較が不足している可能性',crossSkills:['X07']},
 right_endpoint_only:{description:'右端だけで判断し、左端や区間内の頂点との比較が不足している可能性',crossSkills:['X07']},
 case_boundary_missing:{description:'値を決める点が入れ替わる境界を見つけられていない可能性',crossSkills:['X06']},
 case_missing:{description:'場合分けに必要な範囲を一つ落としている可能性',crossSkills:['X07']},
 boundary_equality:{description:'境界値をどちらの場合に含めるかの確認が不足している可能性',crossSkills:['X04']},
 opening_direction_confusion:{description:'開き方向によって最大・最小の判断が変わることを取り違えている可能性',crossSkills:['X11']}
};
export const evaluatePolynomial=(p:Polynomial,a:number)=>p[0]*a*a+p[1]*a+p[2];
export const includesAxis=(r:AxisCase,a:number)=>(r.lo===null||(r.loClosed?a>=r.lo:a>r.lo))&&(r.hi===null||(r.hiClosed?a<=r.hi:a<r.hi));
export function axisValues(answer:AxisAnswer,key:'min'|'max',a:number){return (answer[key]??[]).filter(r=>includesAxis(r,a)).map(r=>evaluatePolynomial(r.polynomial,a));}
export function caseText(r:AxisCase){if(r.lo===null&&r.hi===null)return "すべての実数a";if(r.lo!==null&&r.lo===r.hi)return `a=${n(r.lo)}`;return `${r.lo===null?'':`${n(r.lo)}${r.loClosed?'≦':'<'} `}a${r.hi===null?'':` ${r.hiClosed?'≦':'<'}${n(r.hi)}`}`;}
export function polynomialText(p:Polynomial){
 if(p[0]===0)return n(p[2]);
 const h=-p[1]/(2*p[0]),c=p[2]-p[0]*h*h;
 const square=h===0?'a²':`(a${h<0?'+':'−'}${n(Math.abs(h))})²`;
 return `${p[0]<0?'−':''}${square}${c===0?'':`${c<0?'−':'+'}${n(Math.abs(c))}`}`;
}
export function axisAnswerText(answer:AxisAnswer){return (['max','min'] as const).filter(k=>answer[k]).map(k=>`${k==='max'?'最大値':'最小値'}\n${answer[k]!.map(r=>`${caseText(r)} のとき ${polynomialText(r.polynomial)}`).join('\n')}`).join('\n\n');}
export function axisModel(p:AxisParameters){
 if(![p.c,p.L,p.R].every(v=>Number.isInteger(v*2)&&Math.abs(v)<=8)||p.R-p.L<2||p.R-p.L>6||![1,-1].includes(p.sign))throw new Error('Safe axis parameters required');
 const m=(p.L+p.R)/2,left:Polynomial=[p.sign,-2*p.sign*p.L,p.sign*p.L*p.L+p.c],right:Polynomial=[p.sign,-2*p.sign*p.R,p.sign*p.R*p.R+p.c],vertex:Polynomial=[0,0,p.c];
 const near:AxisCase[]=[{lo:null,hi:p.L,loClosed:false,hiClosed:false,polynomial:left,point:'left'},{lo:p.L,hi:p.R,loClosed:true,hiClosed:true,polynomial:vertex,point:'vertex'},{lo:p.R,hi:null,loClosed:false,hiClosed:false,polynomial:right,point:'right'}];
 const far:AxisCase[]=[{lo:null,hi:m,loClosed:false,hiClosed:false,polynomial:right,point:'right'},{lo:m,hi:m,loClosed:true,hiClosed:true,polynomial:right,point:'both'},{lo:m,hi:null,loClosed:false,hiClosed:false,polynomial:left,point:'left'}];
 const min=p.sign===1?near:far,max=p.sign===1?far:near;
 const answer:AxisAnswer=p.target==='both'?{max,min}:p.target==='min'?{min}:{max};
 const nearNeeded=p.target==='both'||(p.target==='min')===(p.sign===1),farNeeded=p.target==='both'||!nearNeeded;
 const boundaries=[...(nearNeeded?[p.L,p.R]:[]),...(farNeeded?[m]:[])].sort((a,b)=>a-b);
 return {parameters:{...p},opening:p.sign===1?'上':'下',axis:'x=a',vertex:{x:'a',y:p.c},interval:[p.L,p.R] as [number,number],left,right,vertexValue:vertex,min,max,answer,nearNeeded,farNeeded,midpoint:m,boundaries};
}
// Three interior samples on each common interval determine a quadratic; boundary points
// also detect missing/duplicated equality cases, unlike answer-string comparison.
export function equivalentAxisAnswers(a:AxisAnswer,b:AxisAnswer){
 for(const key of ['min','max'] as const){
  if(Boolean(a[key])!==Boolean(b[key]))return false;if(!a[key])continue;
  const cuts=[...new Set([...a[key]!,...b[key]!].flatMap(r=>[r.lo,r.hi].filter((v):v is number=>v!==null)))].sort((x,y)=>x-y);
  const extended=[(cuts[0]??0)-4,...cuts,(cuts.at(-1)??0)+4];const samples=[...cuts];
  for(let i=0;i<extended.length-1;i++)for(const t of [.2,.5,.8])samples.push(extended[i]+t*(extended[i+1]-extended[i]));
  for(const value of samples){const x=axisValues(a,key,value),y=axisValues(b,key,value);if(x.length!==y.length||x.some((v,i)=>Math.abs(v-y[i])>1e-8))return false;}
 }return true;
}
export function generateAxisProblem(parameters:AxisParameters,index:number){
 const model=axisModel(parameters),p=parameters,id=`QF-FAMILY-AXIS-${String(index).padStart(2,'0')}`;
 const constant=(poly:Polynomial,point:AxisCase['point']):AxisAnswer=>Object.fromEntries(Object.keys(model.answer).map(k=>[k,[{lo:null,hi:null,loClosed:false,hiClosed:false,polynomial:poly,point}]]));
 const modify=(fn:(rows:AxisCase[])=>AxisCase[]):AxisAnswer=>Object.fromEntries(Object.entries(model.answer).map(([k,v])=>[k,fn(v.map(r=>({...r,polynomial:[...r.polynomial]})))]));
 const candidate=(type:AxisMistake,answer:AxisAnswer,diagnosticScore:number,reason:string)=>{
  const choiceId=`${id}:${type}`;
  const choice:AxisChoice={choiceId,answer,text:axisAnswerText(answer),correct:false,mistakeType:type,mistakeHypotheses:[{choiceId,mistakeType:type,...hypothesis[type],weaknessTags:[type],hypothesisOnly:true}]};
  return {type,choice,diagnosticScore,reason};
 };
 const candidates=[
  candidate('vertex_always_used',constant(model.vertexValue,'vertex'),model.nearNeeded?94:70,'頂点が区間外にある場合も頂点の値で答える誤りを調べる'),
  candidate('left_endpoint_only',constant(model.left,'left'),model.farNeeded?91:75,'軸の移動によって右端のほうが適切になる場合を落とす'),
  candidate('right_endpoint_only',constant(model.right,'right'),model.farNeeded?91:75,'軸の移動によって左端のほうが適切になる場合を落とす'),
  candidate('case_boundary_missing',modify(rows=>rows.length? [{...rows[0],lo:null,hi:null,loClosed:false,hiClosed:false}]:rows),model.farNeeded?98:88,model.farNeeded?'左右端点が入れ替わる中点の境界を無視して同じ式を使い続ける':'軸が端点を通る境界を無視して同じ式を使い続ける'),
  candidate('case_missing',modify(rows=>rows.filter((_,i)=>i!==rows.length-1)),p.target==='both'?103:87,'右側のaの範囲を落とし、すべての実数aを覆えていない'),
  candidate('boundary_equality',modify(rows=>rows.map(r=>({...r,loClosed:false,hiClosed:false})).filter(r=>r.lo===null||r.hi===null||r.lo!==r.hi)),p.target==='both'?102:89,'境界をどのケースにも含めず、境界での答えを落とす'),
  candidate('opening_direction_confusion',modify(rows=>rows.map(r=>({...r,polynomial:[-r.polynomial[0],-r.polynomial[1],2*p.c-r.polynomial[2]]}))),p.sign===-1?96:84,'二乗部分の符号を逆にして、開き方向と最大・最小の判断を取り違える')
 ];
 const chosen:typeof candidates=[];
 const decisions=[...candidates].sort((a,b)=>b.diagnosticScore-a.diagnosticScore||a.type.localeCompare(b.type)).map(c=>{
  const duplicate=chosen.find(other=>equivalentAxisAnswers(c.choice.answer,other.choice.answer));
  const exclusion=equivalentAxisAnswers(c.choice.answer,model.answer)?'正答と同値':duplicate?`採用候補 ${duplicate.type} と同値`:chosen.length>=3?'この数学的状況で優先する3候補を採用したため除外':'';
  if(!exclusion)chosen.push(c);return {...c,selected:!exclusion,selectionReason:exclusion||c.reason};
 });
 const choices:AxisChoice[]=[{choiceId:`${id}:correct`,answer:model.answer,text:axisAnswerText(model.answer),correct:true,mistakeType:null,mistakeHypotheses:[]},...chosen.map(c=>c.choice)];
 if(choices.length!==4)throw new Error('Axis family requires three distinct diagnostic errors');
 const problemRequirements=[
  {id:'axis_position',description:'動く軸と固定された区間の位置関係を読む',crossSkills:['X09']},
  {id:'candidate_points',description:'開き方向に応じて頂点と端点を候補にする',crossSkills:['X11']},
  ...(model.farNeeded?[{id:'compare_endpoints',description:'左右端点の値を比較する',crossSkills:['X11']}]:[]),
  {id:'find_boundaries',description:'答えを決める点が変わる境界を求める',crossSkills:['X06']},
  {id:'case_split',description:'aの全範囲を場合分けする',crossSkills:['X06']},
  {id:'boundary_equality',description:'境界値を含めるケースを決める',crossSkills:['X04']},
  {id:'coverage',description:'場合分けの漏れと重複を確かめる',crossSkills:['X07']},
  {id:'verify_domain',description:'選んだ点が元の定義域に入るか検証する',crossSkills:['X03','X13']}
 ];
 const formula=`${p.sign===-1?'−':''}(x−a)²${p.c===0?'':`${p.c<0?'−':'+'}${n(Math.abs(p.c))}`}`;
 const target=p.target==='both'?'最大値と最小値':p.target==='min'?'最小値':'最大値';
 const explanation={thinking:`aが変わると軸x=aが動きます。定義域は固定されているので、頂点が区間に入るかどうかや、軸からどちらの端点が遠いかが変わります。${target}をとる場所も変わるため、一つに決めず、aの範囲に分けて考えます。`,steps:[
  `この放物線は${model.opening}に開き、頂点は(a, ${n(p.c)})です。軸に近いほど値は${p.sign===1?'小さく':'大きく'}、遠いほど${p.sign===1?'大きく':'小さく'}なります。比較するのは両端と、区間内にあるときの頂点です。`,
  ...(model.nearNeeded?[`軸が左端より左、つまりa<${n(p.L)}なら、区間内で軸に最も近い点は左端です。${n(p.L)}≦a≦${n(p.R)}では頂点を使え、a>${n(p.R)}では右端が最も近くなります。したがって、この値を決める境界はa=${n(p.L)}, ${n(p.R)}です。`]:[]),
  ...(model.farNeeded?[`軸から最も遠い点は必ず端点です。左端の値は${polynomialText(model.left)}、右端の値は${polynomialText(model.right)}。両端までの距離が等しいのは軸が区間の中点にあるときなので、境界はa=(${n(p.L)}+(${n(p.R)}))/2=${n(model.midpoint)}となります。aがこれより小さければ右端、大きければ左端が遠く、境界では両端の値が等しくなります。`]:[]),
  `各場合で選んだ点を元の式に代入すると、下の答えが得られます。${model.nearNeeded?'軸が端点と一致するときは、端点の式と頂点の値が一致するため、等号を頂点を使うケースにまとめます。':''}${model.farNeeded?'中点の境界は独立したケースにし、左右の端点が同じ値をとることを示します。':''}`,
  `場合分けは${model.boundaries.map(v=>`a=${n(v)}`).join('、')}を境に整理しています。境界も一度ずつ含めて、すべての実数aを漏れなく覆います。元の定義域に戻っても、端点は常に区間内にあり、頂点は区間内にある場合だけ使っていることが確認できます。`
 ],answer:axisAnswerText(model.answer)};
 return {id,index,status:'prototype-unreviewed' as const,model,formula,prompt:`aを実数とする。関数 f(x)=${formula} について、${n(p.L)}≦x≦${n(p.R)}における${target}を、aの値によって場合分けして求めよ。`,choices,problemRequirements,mistakeHypotheses:choices.flatMap(c=>c.mistakeHypotheses),decisions,explanation};
}
export function axisState(p:AxisParameters,a:number){
 const vertexInside=a>=p.L&&a<=p.R;
 const candidates=[{x:p.L,value:p.sign*(p.L-a)**2+p.c},{x:p.R,value:p.sign*(p.R-a)**2+p.c},...(vertexInside?[{x:a,value:p.c}]:[])];
 return {axis:a,vertex:{x:a,y:p.c},vertexInside,minCandidates:candidates,maxCandidates:candidates};
}
export function axisGraph(p:AxisParameters,a:number):ExplanationGraph{
 const w=p.R-p.L,span=Math.max((p.L-a)**2,(p.R-a)**2,1),low=p.c-(p.sign===-1?1.15*span:.15*span),high=p.c+(p.sign===1?1.15*span:.15*span);
 return {title:`軸 x=${Math.round(a*100)/100} と固定された定義域`,curves:[{formula:`y=${p.sign===1?'':'−'}(x${a<0?'+':'−'}${Math.round(Math.abs(a)*100)/100})²${p.c<0?'':'+'}${p.c}`,coefficients:[p.sign,-2*p.sign*a,p.sign*a*a+p.c]}],view:[p.L-w/2-1,p.R+w/2+1,low,high],domain:[p.L,p.R],caption:'青い帯は固定された定義域です。頂点と両端を比べ、値を決める点が境界で変わる様子を確認してください。縦軸の表示範囲はaに合わせて調整しています。グラフは理解の補助で、場合分けの根拠は上の式で確かめます。'};
}
const seeds:AxisParameters[]=[
 {sign:1,c:0,L:0,R:2,target:'min',level:'標準'}, {sign:-1,c:2,L:-1,R:1,target:'max',level:'標準'}, {sign:1,c:-1,L:1,R:4,target:'min',level:'標準'},
 {sign:1,c:1,L:0,R:4,target:'max',level:'応用'}, {sign:-1,c:3,L:-2,R:2,target:'min',level:'応用'}, {sign:1,c:-2,L:-3,R:1,target:'max',level:'応用'}, {sign:-1,c:0,L:1,R:3,target:'min',level:'応用'}, {sign:-1,c:.5,L:-1.5,R:2.5,target:'max',level:'応用'},
 {sign:1,c:0,L:-2,R:2,target:'both',level:'高め'}, {sign:-1,c:2,L:0,R:3,target:'both',level:'高め'}, {sign:1,c:-1,L:-1,R:4,target:'both',level:'高め'}, {sign:-1,c:1,L:-2.5,R:.5,target:'both',level:'高め'}
];
export const axisProblems=seeds.map((p,i)=>generateAxisProblem(p,i+1));
export type AxisProblem=ReturnType<typeof generateAxisProblem>;
