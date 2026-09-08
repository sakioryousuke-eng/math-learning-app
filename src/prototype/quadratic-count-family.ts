import type {Polynomial,ExplanationGraph} from '../ui/explanation-graph.ts';
import {numberText as n} from './quadratic-family.ts';
export interface CountParameters {A:1|-1;p:number;q:number;kind:'intercept'|'slope'|'pivot';slope:number;intercept:number;pivotX:number;target:0|1|2|'all';level:'標準'|'応用'|'高め'}
export interface CountRange {lo:number|null;hi:number|null;loClosed:boolean;hiClosed:boolean;loText:string;hiText:string}
export type CountAnswer=Partial<Record<0|1|2,CountRange[]>>;
export type CountMistake='discriminant_sign_confusion'|'tangent_included'|'boundary_missing'|'discriminant_calculation_sign'|'move_sign_error'|'parameter_inequality_reversed'|'intersection_root_mismatch';
export interface CountHypothesis {choiceId:string;mistakeType:CountMistake;description:string;weaknessTags:CountMistake[];crossSkills:string[];hypothesisOnly:true}
export interface CountChoice {choiceId:string;answer:CountAnswer;text:string;correct:boolean;mistakeType:CountMistake|null;mistakeHypotheses:CountHypothesis[]}
export const evalCountPolynomial=(p:Polynomial,k:number)=>p[0]*k*k+p[1]*k+p[2];
export function countPolynomialText(p:Polynomial,variable:string,format:(v:number)=>string=n){return p.map((v,i)=>{if(v===0)return '';const power=2-i;return `${v<0?'−':'+'}${power&&Math.abs(v)===1?'':format(Math.abs(v))}${power?variable+(power===2?'²':''):''}`;}).join('').replace(/^\+/,'')||'0';}
export function countRoots(p:Polynomial){
 const [a,b,c]=p;if(a===0)return b===0?[]:[{value:-c/b,text:n(-c/b)}];
 const d=b*b-4*a*c;if(d<0)return [];const root=Math.sqrt(d);
 const signs=d===0?[0]:[-1,1];return signs.map(sign=>({value:(-b+sign*root)/(2*a),text:Number.isInteger(root)?n((-b+sign*root)/(2*a)):`(${n(-b)}${sign<0?'−':'+'}√${n(d)})/${n(2*a)}`})).sort((x,y)=>x.value-y.value);
}
export const inCountRange=(r:CountRange,k:number)=>(r.lo===null||(r.loClosed?k>=r.lo-1e-9:k>r.lo+1e-9))&&(r.hi===null||(r.hiClosed?k<=r.hi+1e-9:k<r.hi-1e-9));
function normalize(ranges:CountRange[]){const out:CountRange[]=[];for(const r of ranges){const prev=out.at(-1);if(prev&&prev.hi!==null&&r.lo!==null&&Math.abs(prev.hi-r.lo)<1e-9&&(prev.hiClosed||r.loClosed)){prev.hi=r.hi;prev.hiClosed=r.hiClosed;prev.hiText=r.hiText;}else out.push({...r});}return out;}
export function classifyDiscriminant(D:Polynomial,mapping:[0|1|2|null,0|1|2|null,0|1|2|null]=[0,1,2]):Record<0|1|2,CountRange[]>{
 const roots=countRoots(D),pieces:CountRange[]=[];
 for(let i=0;i<=roots.length;i++){const l=roots[i-1],r=roots[i];pieces.push({lo:l?.value??null,hi:r?.value??null,loClosed:false,hiClosed:false,loText:l?.text??'',hiText:r?.text??''});if(r)pieces.push({lo:r.value,hi:r.value,loClosed:true,hiClosed:true,loText:r.text,hiText:r.text});}
 const result:Record<0|1|2,CountRange[]>={0:[],1:[],2:[]};
 for(const r of pieces){const sample=r.lo===null?(r.hi??0)-1:r.hi===null?r.lo+1:(r.lo+r.hi)/2;const d=evalCountPolynomial(D,sample),sign=Math.abs(d)<1e-8?1:d<0?0:2;const count=mapping[sign];if(count!==null)result[count].push(r);}
 return {0:normalize(result[0]),1:normalize(result[1]),2:normalize(result[2])};
}
export function countRangeText(r:CountRange){if(r.lo===null&&r.hi===null)return 'すべての実数k';if(r.lo!==null&&r.lo===r.hi)return `k=${r.loText}`;return `${r.lo===null?'':`${r.loText}${r.loClosed?'≦':'<'} `}k${r.hi===null?'':` ${r.hiClosed?'≦':'<'}${r.hiText}`}`;}
export function countAnswerText(a:CountAnswer){return ([0,1,2] as const).filter(k=>a[k]).map(k=>`共有点${k}個：${a[k]!.length?a[k]!.map(countRangeText).join(' または '):'該当するkはない'}`).join('\n');}
const selectTarget=(all:Record<0|1|2,CountRange[]>,target:CountParameters['target']):CountAnswer=>target==='all'?all:{[target]:all[target]};
export function countModel(p:CountParameters){
 if(![p.p,p.q,p.slope,p.intercept,p.pivotX].every(v=>Number.isInteger(v)&&Math.abs(v)<=8)||![1,-1].includes(p.A)||(p.kind==='intercept'&&p.slope===0))throw new Error('Safe count parameters required');
 const lineSlope:Polynomial=p.kind==='intercept'?[0,0,p.slope]:[0,1,0];
 const lineIntercept:Polynomial=p.kind==='intercept'?[0,1,p.intercept]:p.kind==='pivot'?[0,-p.pivotX,p.intercept]:[0,0,p.intercept];
 const A=p.A,B:Polynomial=[0,-lineSlope[1],p.p-lineSlope[2]],C:Polynomial=[0,-lineIntercept[1],p.q-lineIntercept[2]];
 const D:Polynomial=[B[1]**2,2*B[1]*B[2]-4*A*C[1],B[2]**2-4*A*C[2]];
 const classification=classifyDiscriminant(D),answer=selectTarget(classification,p.target),f:Polynomial=[A,p.p,p.q];
 const tail=p.intercept===0?'':`${p.intercept<0?'−':'+'}${n(Math.abs(p.intercept))}`;
 const fText=countPolynomialText(f,'x'),gText=p.kind==='intercept'?`${countPolynomialText([0,p.slope,0],'x')}+${countPolynomialText(lineIntercept,'k')}`:p.kind==='pivot'?`k(x${p.pivotX<0?'+':'−'}${n(Math.abs(p.pivotX))})${tail}`:`kx${tail}`;
 const difference=`${A===1?'':'−'}x²+(${countPolynomialText(B,'k')})x+(${countPolynomialText(C,'k')})`;
 return {parameters:{...p},f,lineSlope,lineIntercept,A,B,C,D,fText,gText,equation:`${fText}=${gText}`,difference,zeroEquation:`${difference}=0`,discriminantText:countPolynomialText(D,'k'),boundaries:countRoots(D),classification,answer,conditions:{positive:classification[2],zero:classification[1],negative:classification[0]}};
}
export function equivalentCountAnswers(a:CountAnswer,b:CountAnswer){
 for(const count of [0,1,2] as const){if(Boolean(a[count])!==Boolean(b[count]))return false;if(!a[count])continue;
 const cuts=[...new Set([...a[count]!,...b[count]!].flatMap(r=>[r.lo,r.hi].filter((v):v is number=>v!==null)))].sort((x,y)=>x-y),extended=[(cuts[0]??0)-2,...cuts,(cuts.at(-1)??0)+2],samples=[...cuts];for(let i=0;i<extended.length-1;i++)samples.push((extended[i]+extended[i+1])/2);
 for(const k of samples)if(a[count]!.some(r=>inCountRange(r,k))!==b[count]!.some(r=>inCountRange(r,k)))return false;
 }return true;
}
const hypotheses:Record<CountMistake,{description:string;crossSkills:string[]}>= {
 discriminant_sign_confusion:{description:'判別式の正負と実数解の個数を逆に捉えている可能性',crossSkills:['X12']},
 tangent_included:{description:'接する1点と異なる2点の条件を区別できていない可能性',crossSkills:['X13']},
 boundary_missing:{description:'D=0となる境界の扱いが抜けている可能性',crossSkills:['X13']},
 discriminant_calculation_sign:{description:'判別式の−4ACの符号処理が不安定な可能性',crossSkills:['X12']},
 move_sign_error:{description:'f−g=0への移項で直線の項の符号を変えていない可能性',crossSkills:['X05']},
 parameter_inequality_reversed:{description:'パラメータの二次不等式で内側と外側の符号を取り違えている可能性',crossSkills:['X06']},
 intersection_root_mismatch:{description:'重解1つを共有点なしと読み違えている可能性',crossSkills:['X12']}
};
export function generateCountProblem(parameters:CountParameters,index:number){
 const model=countModel(parameters),p=parameters,id=`QF-FAMILY-COUNT-${String(index).padStart(2,'0')}`;
 const wrongB:Polynomial=[0,model.lineSlope[1],p.p+model.lineSlope[2]],wrongC:Polynomial=[0,model.lineIntercept[1],p.q+model.lineIntercept[2]];
 const wrongMoveD:Polynomial=[wrongB[1]**2,2*wrongB[1]*wrongB[2]-4*p.A*wrongC[1],wrongB[2]**2-4*p.A*wrongC[2]];
 const wrongCalcD:Polynomial=[model.B[1]**2,2*model.B[1]*model.B[2]+4*p.A*model.C[1],model.B[2]**2+4*p.A*model.C[2]];
 const candidate=(type:CountMistake,D:Polynomial,mapping:[0|1|2|null,0|1|2|null,0|1|2|null],diagnosticScore:number,reason:string,coefficients={A:model.A,B:model.B,C:model.C})=>{
  const answer=selectTarget(classifyDiscriminant(D,mapping),p.target),choiceId=`${id}:${type}`;
  const choice:CountChoice={choiceId,answer,text:countAnswerText(answer),correct:false,mistakeType:type,mistakeHypotheses:[{choiceId,mistakeType:type,...hypotheses[type],weaknessTags:[type],hypothesisOnly:true}]};
  return {type,choice,diagnosticScore,reason,errorModel:{...coefficients,D,mapping}};
 };
 const candidates=[
  candidate('discriminant_sign_confusion',model.D,[2,1,0],p.target==='all'?99:89,'Dの正負と共有点0個・2個の対応を逆にして最後まで分類する'),
  candidate('tangent_included',model.D,p.target===1?[0,1,1]:[0,2,2],p.target===2?102:85,'D≧0を使い、接する場合と異なる2共有点を区別せず条件を解く'),
  candidate('boundary_missing',model.D,[0,null,2],p.target==='all'?98:82,'D=0となるkをどの結論にも含めない'),
  candidate('discriminant_calculation_sign',wrongCalcD,[0,1,2],model.C[1]!==0?96:90,'誤ってB²+4ACを計算し、その式の符号から条件を解き直す'),
  candidate('move_sign_error',wrongMoveD,[0,1,2],p.kind==='pivot'?103:95,'差を取るときに誤ってf+gを作り、その方程式の判別式から条件を解く',{A:p.A,B:wrongB,C:wrongC}),
  candidate('parameter_inequality_reversed',model.D,[2,1,0],model.D[0]!==0&&model.boundaries.length===2?101:60,'二つの境界の内側と外側でDの符号を逆に読んで条件を解く'),
  candidate('intersection_root_mismatch',model.D,[0,0,2],p.target===0?97:81,'D=0で重解が1つある場合を、共有点なしとして分類する')
 ];
 const chosen:typeof candidates=[];
 const decisions=[...candidates].sort((a,b)=>b.diagnosticScore-a.diagnosticScore||a.type.localeCompare(b.type)).map(c=>{
  const duplicate=chosen.find(other=>equivalentCountAnswers(c.choice.answer,other.choice.answer));
  const excluded=equivalentCountAnswers(c.choice.answer,model.answer)?'正答と数学的に同値':duplicate?`採用候補 ${duplicate.type} と数学的に同値`:chosen.length>=3?'この問題で優先する3候補を採用したため除外':'';if(!excluded)chosen.push(c);return {...c,selected:!excluded,selectionReason:excluded||c.reason};
 });
 const choices:CountChoice[]=[{choiceId:`${id}:correct`,answer:model.answer,text:countAnswerText(model.answer),correct:true,mistakeType:null,mistakeHypotheses:[]},...chosen.map(c=>c.choice)];
 if(choices.length!==4)throw new Error(`Three diagnostic errors required: ${id}`);
 const problemRequirements=[
  {id:'equal_height',description:'共有点では二つのy座標が等しいと判断する',crossSkills:['X12']},
  {id:'form_equation',description:'二つの式を一つの方程式にする',crossSkills:['X08']},
  {id:'difference_equivalence',description:'f−g=0へ同値変形し、既知の二次方程式へ結び付ける',crossSkills:['X05','X10']},
  {id:'root_count',description:'実数解の個数と共有点の個数を対応させる',crossSkills:['X12']},
  {id:'choose_discriminant',description:'個数を調べる道具として判別式を選ぶ',crossSkills:['X11']},
  {id:'parameter_condition',description:'判別式の符号からパラメータの等式・不等式を解く',crossSkills:['X05']},
  ...(p.target==='all'||(model.D[0]!==0&&model.boundaries.length===2&&p.target!==1)?[{id:'case_split',description:'境界で区切った範囲ごとに符号を調べる',crossSkills:['X06']}]:[]),
  {id:'verify_boundary',description:'D=0を接する1点として扱い、元の共有点条件へ戻って確かめる',crossSkills:['X13']}
 ];
 const prompt=`kを実数とする。放物線 y=${model.fText} と直線 y=${model.gText}${p.kind==='pivot'?`（固定点(${n(p.pivotX)}, ${n(p.intercept)})を通る）`:''}について、${p.target==='all'?'共有点の個数をkの値によって分類せよ。':`共有点が${p.target===2?'異なる2個':`${p.target}個`}となるkの条件を求めよ。`}`;
 const explanation={thinking:'共有点では、二つの式のy座標が等しくなります。まず二つの式を等しいとおき、整理してできる方程式を調べます。その実数解一つにつき共有点が一つ決まるので、解の個数が分かれば共有点の個数も分かります。',steps:[
  `放物線の式をf(x)=${model.fText}、直線の式をg(x)=${model.gText}とおきます。共有点ではf(x)=g(x)なので、${model.equation}となります。`,
  `右辺を左辺へ移すと、f(x)−g(x)=0、つまり${model.zeroEquation}です。差をq(x)=${model.difference}とおけば、求めたい個数はq(x)=0の実数解の個数に言い換えられます。差のグラフとx軸との共有点を調べることと同じです。`,
  `ここで、実数解の個数を毎回解かずに調べる道具として判別式を使います。xの二次方程式の係数はA=${model.A}、B=${countPolynomialText(model.B,'k')}、C=${countPolynomialText(model.C,'k')}です。D=B²−4ACを計算すると、D=${model.discriminantText}となります。`,
  '二次方程式の解の公式では√Dが現れます。D>0なら異なる実数解が2つ、D=0なら二つの解が一致する重解が1つ、D<0なら実数解はありません。したがって、共有点も順に2個・1個・0個です。',
  `D=0となる境界は${model.boundaries.length?model.boundaries.map(b=>`k=${b.text}`).join('、'):'ありません'}。${model.D[0]!==0?`Dはkの二次式なので、${model.boundaries.length===2?'二つの境界の内側と外側で符号を調べます。':'境界の左右で符号が変わるかも確認します。重なる根では符号が変わらないことに注意します。'}`:'Dはkの一次式なので、境界の左右で正負が入れ替わります。'}境界そのものはD=0として分けると、${countAnswerText(model.classification).replaceAll('\n','。')}となります。`,
  `元の二つのグラフへ戻ると、D=0は接する1点を表します。D>0の異なる2点にこの境界を含めてはいけません。q(x)=0の実数解をf(x)へ代入すれば各共有点のy座標が一つに決まるため、上の分類は元の共有点の個数と一致します。`
 ],answer:countAnswerText(model.answer)};
 return {id,index,status:'prototype-unreviewed' as const,model,prompt,choices,decisions,problemRequirements,mistakeHypotheses:choices.flatMap(c=>c.mistakeHypotheses),explanation};
}
export function countGraphState(p:CountParameters,k:number){
 const m=countModel(p),slope=evalCountPolynomial(m.lineSlope,k),intercept=evalCountPolynomial(m.lineIntercept,k),B=evalCountPolynomial(m.B,k),C=evalCountPolynomial(m.C,k),D=evalCountPolynomial(m.D,k),q:Polynomial=[m.A,B,C];
 const roots=countRoots(q).map(r=>r.value),vertex=-B/(2*m.A),fVertex=-p.p/(2*p.A),xMin=Math.min(vertex,fVertex,...roots)-2,xMax=Math.max(vertex,fVertex,...roots)+2;
 const points=[xMin,xMax,vertex,fVertex,...roots],heights=points.flatMap(x=>[evalCountPolynomial(m.f,x),slope*x+intercept,evalCountPolynomial(q,x),0]),low=Math.min(...heights)-2,high=Math.max(...heights)+2;
 const count=Math.abs(D)<1e-8?1:D>0?2:0;
 const decimal=(v:number)=>String(Math.round(v*10000)/10000);
 const original:ExplanationGraph={title:`元の放物線と直線（k=${Math.round(k*100)/100}）`,curves:[{formula:`f(x)=${m.fText}`,coefficients:m.f},{formula:`g(x)=${countPolynomialText([0,slope,intercept],'x',decimal)}`,coefficients:[0,slope,intercept]}],view:[xMin,xMax,low,high],caption:`共有点は${count}個です。同じxで二つの高さが等しい位置を確認します。`};
 const difference:ExplanationGraph={title:'差のグラフ y=f(x)−g(x) とx軸',curves:[{formula:`q(x)=${countPolynomialText(q,'x',decimal)}`,coefficients:q},{formula:'y=0',coefficients:[0,0,0]}],view:[xMin,xMax,low,high],caption:`x軸との共有点は${count}個で、元の共有点とx座標が一致します。図は理解の補助です。kの全範囲と境界は上の式で確認してください。`};
 return {D,count,roots,q,slope,intercept,original,difference};
}
const base={A:1 as const,p:0,q:0,kind:'intercept' as const,slope:2,intercept:0,pivotX:0};
const seeds:CountParameters[]=[
 {...base,target:2,level:'標準'}, {...base,p:2,q:1,slope:-2,target:1,level:'標準'}, {...base,A:-1,q:2,slope:1,target:0,level:'標準'},
 {...base,q:1,kind:'slope',target:'all',level:'応用'}, {...base,q:-1,kind:'slope',intercept:-2,target:2,level:'応用'}, {...base,p:2,q:2,kind:'slope',intercept:1,target:1,level:'応用'},
 {...base,kind:'pivot',pivotX:1,target:0,level:'応用'}, {...base,p:-2,q:1,kind:'pivot',pivotX:1,intercept:-1,target:'all',level:'応用'},
 {...base,kind:'pivot',pivotX:1,target:'all',level:'高め'}, {...base,kind:'pivot',pivotX:1,intercept:1,target:'all',level:'高め'},
 {...base,A:-1,p:2,kind:'pivot',pivotX:1,intercept:2,target:'all',level:'高め'}, {...base,p:-2,q:3,slope:-1,target:'all',level:'高め'}
];
export const countProblems=seeds.map((p,i)=>generateCountProblem(p,i+1));
export type CountProblem=ReturnType<typeof generateCountProblem>;
