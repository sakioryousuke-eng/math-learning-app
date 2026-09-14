import {inspectTriangle, enumerateSSA, type ExactValue, type Point} from './tratio-general.ts';
import {coordinateOracle, type RightTriangleScene} from './tratio-right.ts';

export const integratedTratioFamilyId='TR-INTEGRATED-JUDGMENT';
export const integratedScales=[0.5,1,2,3] as const;
type Triple=[string,string,string];
type Expr={op:'constant';value:number}|{op:'ref';id:string}|{op:'add'|'sub'|'mul'|'div'|'sqrt'|'sin'|'cos'|'acos';args:Expr[]};
const C=(value:number):Expr=>({op:'constant',value}),R=(id:string):Expr=>({op:'ref',id});
const op=(operation:Exclude<Expr['op'],'constant'|'ref'>,...args:Expr[]):Expr=>({op:operation,args});
const add=(a:Expr,b:Expr)=>op('add',a,b),sub=(a:Expr,b:Expr)=>op('sub',a,b),mul=(a:Expr,b:Expr)=>op('mul',a,b),div=(a:Expr,b:Expr)=>op('div',a,b),sqrt=(a:Expr)=>op('sqrt',a),sq=(a:Expr)=>mul(a,a),sin=(a:Expr)=>op('sin',a),cos=(a:Expr)=>op('cos',a);
const near=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b));
export function evaluateExpression(e:Expr,values:Record<string,number>):number{
  if(e.op==='constant')return e.value;
  if(e.op==='ref'){if(!(e.id in values))throw new Error(`未計算の中間量 ${e.id}`);return values[e.id];}
  const [a,b]=e.args.map(x=>evaluateExpression(x,values));
  switch(e.op){case 'add':return a+b;case 'sub':return a-b;case 'mul':return a*b;case 'div':return a/b;case 'sqrt':return Math.sqrt(a);case 'sin':return Math.sin(a*Math.PI/180);case 'cos':return Math.cos(a*Math.PI/180);case 'acos':return Math.acos(a)*180/Math.PI;}
}
// The label never feeds the calculation. Rational and radical answers remain exact.
export function integratedExact(value:number):ExactValue{
  for(const d of [1,2,3,4,6,8,12,24,48])if(near(value*d,Math.round(value*d)))return {value,label:d===1?String(Math.round(value)): `${Math.round(value*d)}/${d}`};
  for(const d of [1,2,3,4,6,8,12,13,18,19,26,36,38,52,57,72]){
    const n=Math.round(value*value*d*d);if(n<=0||n>100000||!near(value,Math.sqrt(n)/d))continue;
    let factor=1,rad=n;for(let k=2;k*k<=rad;k++)while(rad%(k*k)===0){factor*=k;rad/=k*k;}
    const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a,g=gcd(factor,d),den=d/g,num=factor/g;
    return {value,label:`${num===1?'':num}√${rad}${den===1?'':`/${den}`}`};
  }
  return {value,label:`約${Number(value.toFixed(6))}`};
}
type Step={id:string;region:string;purpose:string;formula:string;expression:Expr;transferTo?:string};
type Hypothesis={type:string;description:string;crossSkills:string[];hypothesisOnly:true;stage:'routeSelection'|'execution'};
type WrongSpec={id:string;node:string;replacement:Expr;reason:string;hypothesis:Hypothesis;diagnosticScore:number};
export interface IntegratedCandidate extends WrongSpec {answer:ExactValue;selected:boolean;exclusionReason:string|null;coherentWrongModel:{changedNode:string;originalExpression:Expr;replacement:Expr;propagatedValues:Record<string,number>;finalTarget:string}}
type GeometricTarget={kind:'distance';ends:[string,string]}|{kind:'area';triangle:Triple}|{kind:'circumradius';triangle:Triple}|{kind:'areaSum';triangles:Triple[]};
type Constraint={kind:'oppositeSide';line:[string,string];points:[string,string]}|{kind:'onCircle';point:string;center:string;radius:number}|{kind:'angle';points:Triple;value:number}|{kind:'area';triangle:Triple;value:number}|{kind:'cos';points:Triple;value:number}|{kind:'acute';points:Triple}|{kind:'obtuse';points:Triple}|{kind:'parallel';edges:[[string,string],[string,string]]}|{kind:'onSegment';point:string;ends:[string,string]};
const requirements={
  select_subtriangle:['目的量を含む三角形を選ぶ',['X10']],find_intermediate_target:['先に必要な中間量を見つける',['X10']],
  shared_side_transfer:['求めた共有辺を別の三角形へ渡す',['X12']],auxiliary_line:['必要な垂線・対角線を選ぶ',['X10']],
  opposite_pair:['対辺と対角を対応させる',['X04']],included_angle:['2辺の間の角を確認する',['X04']],
  select_ratio:['目的の辺に合う三角比を選ぶ',['X08']],sine_relation:['辺と対角の比を結ぶ',['X08']],cosine_relation:['2辺と挟角を残りの辺へ結ぶ',['X08']],
  area_height_conversion:['底辺・高さと面積をつなぐ',['X12']],circumradius_relation:['辺・対角と外接円をつなぐ',['X08']],
  similarity_correspondence:['相似な三角形の対応を保つ',['X04']],pythagoras_scope:['直角三角形を確認して辺を求める',['X04']],
  multiple_solution:['候補を列挙して元条件で絞る',['X06','X07']],condition_preservation:['元の図形条件を保つ',['X04']],
  method_selection:['複数の合理的な解法から見通しを選ぶ',['X11']],verify_original:['最終結果を元の図形で確かめる',['X13']],
  reasoning_chain:['中間量を次の関係へつなぐ',['X12']],read_given_diagram:['図に記された与条件を読み取る',['X09']],
} as const;
type Requirement=keyof typeof requirements;
export interface IntegratedTratioProblem {
  familyId:typeof integratedTratioFamilyId;variantId:string;structureSignature:string;difficulty:'STANDARD'|'APPLIED'|'PRACTICAL';scale:number;
  title:string;prompt:string;targetDescription:string;unit:string;thinking:string;working:string[];
  scene:RightTriangleScene;components:{id:string;vertices:Triple}[];knownInformation:{lengths:RightTriangleScene['knownLengths'];constraints:Constraint[]};
  target:GeometricTarget;intermediateTargets:string[];candidateRoutes:string[];selectedMathematicalRoute:Step[];
  solutionTrace:{phase:string;region?:string;node?:string;text:string;value?:ExactValue;transferTo?:string}[];
  validityConditions:string[];originalPredicate:{description:string;constraints:Constraint[];target:GeometricTarget};
  candidateConfigurations:{label:string;scene:RightTriangleScene;accepted:boolean;reason:string;finalValue:number}[];
  problemRequirements:{id:Requirement;description:string;crossSkills:readonly string[]}[];
  answer:ExactValue;candidates:IntegratedCandidate[];choices:{choiceId:string;answer:ExactValue;correct:boolean;mistakeHypotheses:Hypothesis|null}[];
}
export function runIntegratedRoute(steps:Step[],change?:Pick<WrongSpec,'node'|'replacement'>){const values:Record<string,number>={};for(const step of steps)values[step.id]=evaluateExpression(change?.node===step.id?change.replacement:step.expression,values);return values;}
function triangle(scene:RightTriangleScene,t:Triple){return {A:scene.points[t[0]],B:scene.points[t[1]],C:scene.points[t[2]]};}
export function integratedOracle(scene:RightTriangleScene,target:GeometricTarget):number{
  if(target.kind==='distance')return coordinateOracle({...scene,target:[{kind:'distance',from:target.ends[0],to:target.ends[1]}]})[0];
  if(target.kind==='areaSum')return target.triangles.reduce((a,t)=>a+inspectTriangle(triangle(scene,t)).area,0);
  const g=inspectTriangle(triangle(scene,target.triangle));return target.kind==='area'?g.area:g.R;
}
function constraintHolds(scene:RightTriangleScene,c:Constraint){
  const p=scene.points,dist=(a:string,b:string)=>Math.hypot(p[a][0]-p[b][0],p[a][1]-p[b][1]);
  if(c.kind==='oppositeSide'){const [a,b]=c.line,cross=(id:string)=>(p[b][0]-p[a][0])*(p[id][1]-p[a][1])-(p[b][1]-p[a][1])*(p[id][0]-p[a][0]);return cross(c.points[0])*cross(c.points[1])<0;}
  if(c.kind==='onCircle')return near(dist(c.point,c.center),c.radius);
  if(c.kind==='onSegment')return near(dist(c.ends[0],c.point)+dist(c.point,c.ends[1]),dist(...c.ends));
  if(c.kind==='parallel'){const [[a,b],[d,e]]=c.edges,u=[p[b][0]-p[a][0],p[b][1]-p[a][1]],v=[p[e][0]-p[d][0],p[e][1]-p[d][1]];return near(u[0]*v[1]-u[1]*v[0],0);}
  if(c.kind==='area')return near(inspectTriangle(triangle(scene,c.triangle)).area,c.value);
  const [a,o,b]=c.points,g=inspectTriangle({A:p[o],B:p[a],C:p[b]});
  if(c.kind==='acute')return g.A<90-1e-8;if(c.kind==='obtuse')return g.A>90+1e-8;
  return near(c.kind==='cos'?g.cosA:g.A,c.value);
}
export function originalIntegratedPredicate(v:IntegratedTratioProblem,value:number,scene=v.scene){
  try{return v.knownInformation.lengths.every(g=>near(coordinateOracle({...scene,target:[{kind:'distance',from:g.ends[0],to:g.ends[1]}]})[0],g.value))&&v.components.every(c=>inspectTriangle(triangle(scene,c.vertices)).area>0)&&v.originalPredicate.constraints.every(c=>constraintHolds(scene,c))&&near(integratedOracle(scene,v.target),value);}catch{return false;}
}
const rotateFrom=(o:Point,p:Point,length:number,degrees:number):Point=>{const x=p[0]-o[0],y=p[1]-o[1],d=Math.hypot(x,y),r=degrees*Math.PI/180;return [o[0]+length*(x*Math.cos(r)-y*Math.sin(r))/d,o[1]+length*(x*Math.sin(r)+y*Math.cos(r))/d];};

export function areaCandidateCoordinates(ab:number,ac:number,area:number){
  if(!(ab>0&&ac>0&&area>0))return [];
  const y=2*area/ab,d=ac*ac-y*y,tolerance=1e-12*ac*ac;if(d< -tolerance)return [];
  const x=Math.sqrt(Math.max(0,Math.abs(d)<=tolerance?0:d));
  return [...new Set([x,-x])].map(x=>({A:[0,0] as Point,B:[ab,0] as Point,C:[x,y] as Point}));
}
export function generateIntegratedTratio(index:number,scale:number=1):IntegratedTratioProblem{
  if(!Number.isInteger(index)||index<0||index>11||!integratedScales.includes(scale as typeof integratedScales[number]))throw new Error('12構造と安全な倍率のみ');
  const s=scale,r3=Math.sqrt(3),g=(x:number)=>C(x*s);
  const scene:RightTriangleScene={points:{},segments:[],angles:[],rightAngles:[],knownLengths:[],target:[],auxiliaryConstruction:[],referenceTriangle:[],solutionRoute:[],structureSignature:''};
  const steps:Step[]=[],wrong:WrongSpec[]=[],constraints:Constraint[]=[],req:Requirement[]=['find_intermediate_target','reasoning_chain','verify_original'];
  let signature='',title='',prompt='',thinking='',targetDescription='',unit='cm',target:GeometricTarget={kind:'distance',ends:['A','B']},routes:string[]=[],finalLabel:string|undefined;
  let alternatives:{label:string;points:Record<string,Point>;reason:string}[]=[];
  const points=(p:Record<string,Point>)=>{scene.points=Object.fromEntries(Object.entries(p).map(([id,[x,y]])=>[id,[x*s,y*s]]));};
  const edges=(...pairs:string[])=>{scene.segments=pairs.map(pair=>({ends:[pair[0],pair[1]]}));};
  const component=(...triples:string[])=>{scene.referenceTriangle=triples.map(t=>[t[0],t[1],t[2]]);};
  const length=(pair:string,n:number)=>scene.knownLengths.push({ends:[pair[0],pair[1]],value:n*s,label:integratedExact(n*s).label});
  const angle=(triple:string,n:number)=>{const t:Triple=[triple[0],triple[1],triple[2]];scene.angles.push({points:t,degrees:n,given:true});constraints.push({kind:'angle',points:t,value:n});if(n===90)scene.rightAngles.push({points:t});};
  const auxiliary=(pair:string,point?:string,explanation='破線を使って、解き方の中間量を確かめます。')=>{scene.segments.push({ends:[pair[0],pair[1]],auxiliary:true});if(point)scene.auxiliaryConstruction.push({point,explanation});};
  const step=(id:string,region:string,purpose:string,formula:string,expression:Expr,transferTo?:string)=>steps.push({id,region,purpose,formula,expression,transferTo});
  const mistake=(id:string,node:string,replacement:Expr,reason:string,stage:Hypothesis['stage']='execution',score=85,cross='X08')=>wrong.push({id,node,replacement,reason,diagnosticScore:score,hypothesis:{type:id,description:reason+'可能性',stage,crossSkills:[cross],hypothesisOnly:true}});
  const cosineSide=(a:Expr,b:Expr,A:Expr)=>sqrt(sub(add(sq(a),sq(b)),mul(mul(C(2),mul(a,b)),cos(A))));
  if(index===0){
    signature='right-shared-diagonal-oblique-side';title='2つの三角形の距離';
    points({A:[0,0],B:[3,0],C:[3,4],D:rotateFrom([0,0],[3,4],2,60)});edges('AB','BC','CD','DA');component('ABC','ACD');auxiliary('AC');length('AB',3);length('BC',4);length('AD',2);angle('ABC',90);angle('CAD',60);
    prompt=`四角形ABCDで、AB=${3*s}、BC=${4*s}、AD=${2*s}、∠ABC=90°、∠CAD=60°である。BとDは直線ACの反対側にある。CDの長さを求めよ。`;
    thinking='CDを含む△ACDでは、まだACが分かりません。ACは、与えられた2辺を持つ△ABCから求められます。';
    step('AC','ABC','共通に使うACを求める','AC²=AB²+BC²',sqrt(add(sq(g(3)),sq(g(4)))),'ACD');
    step('CD','ACD','ACとAD、その間の角からCDを求める','CD²=AC²+AD²−2AC・AD cos60°',cosineSide(R('AC'),g(2),C(60)));
    mistake('shared_side_transfer','AC',g(4),'共有辺ACにBCの長さを渡した','execution',92,'X12');
    mistake('pythagoras_scope','CD',sqrt(add(sq(R('AC')),sq(g(2)))),'直角でない△ACDにも三平方を使った','routeSelection',95,'X11');
    mistake('cosine_correction_sign','CD',sqrt(add(add(sq(R('AC')),sq(g(2))),mul(R('AC'),g(2)))),'余弦定理の補正項を加えた');
    target={kind:'distance',ends:['C','D']};targetDescription='CD';req.push('shared_side_transfer','pythagoras_scope','cosine_relation','included_angle');
  }else if(index===1){
    signature='oblique-height-transfer-extended-base';title='延長した辺と面積';
    points({A:[0,0],B:[6,0],C:[2,2*r3],D:[10,0],H:[2,0]});edges('AB','BC','CA','BD','CD');component('ABC','BCD');length('AB',6);length('BD',4);length('AC',4);angle('CAB',60);auxiliary('CH','H','CHは直線ADへの高さです');scene.rightAngles.push({points:['C','H','D'],auxiliary:true});constraints.push({kind:'onSegment',point:'B',ends:['A','D']});
    prompt='A、B、Dはこの順に一直線上にある。図に示した条件から、△BCDの面積を求めよ。長さの単位はcmとする。';
    thinking='△BCDの底辺BDは分かっています。Cから直線ADまでの高さは△ABCを見れば求められ、△BCDでも同じ高さを使えます。';
    step('height','ABC','CからADまでの高さを求める','CH=AC sin60°',mul(g(4),sin(C(60))),'BCD');step('area','BCD','同じ高さとBDを組み合わせる','面積=BD・CH/2',div(mul(g(4),R('height')),C(2)));
    mistake('height_transfer','height',mul(g(4),cos(C(60))),'高さにAC cos60°を使った');mistake('area_conversion','area',mul(g(4),R('height')),'面積の1/2を落とした');mistake('wrong_subtriangle','area',div(mul(g(10),R('height')),C(2)),'△BCDではなく△ACDの面積を求めた','routeSelection',95,'X11');
    target={kind:'area',triangle:['B','C','D']};targetDescription='△BCDの面積';unit='cm²';req.push('select_ratio','area_height_conversion','read_given_diagram');
  }else if(index===2){
    signature='cosine-sine-altitude';title='頂点から辺までの距離';
    const a:Point=[0,0],b:Point=[5,0],c:Point=[1.5,1.5*r3],t=17.5/19;points({A:a,B:b,C:c,H:[5-3.5*t,1.5*r3*t]});edges('AB','BC','CA');component('ABC');length('AB',5);length('AC',3);angle('BAC',60);auxiliary('AH','H','HはAからBCへ下ろした垂線の足です');scene.rightAngles.push({points:['A','H','B'],auxiliary:true});
    prompt=`△ABCで、AB=${5*s}、AC=${3*s}、∠BAC=60°である。Aから辺BCまでの距離を求めよ。`;
    thinking='AからBCまでの距離は、BCを底辺とした高さです。BCと角Bを求める方法や、面積をBCで割る方法が考えられます。';
    step('BC','ABC','高さにつなぐためにBCを求める','BC²=AB²+AC²−2AB・AC cos60°',cosineSide(g(5),g(3),C(60)));
    step('sinB','ABC','対辺と対角を対応させる','sinB=AC sin60°/BC',div(mul(g(3),sin(C(60))),R('BC')),'ABH');step('height','ABH','ABを斜辺とする高さを求める','AH=AB sinB',mul(g(5),R('sinB')));
    mistake('cosine_correction_sign','BC',sqrt(add(add(sq(g(5)),sq(g(3))),mul(g(5),g(3)))),'BCを求める補正項の符号を逆にした');mistake('sine_ratio_reversal','sinB',div(mul(R('BC'),sin(C(60))),g(3)),'正弦の比を逆にした');mistake('opposite_pair_mismatch','sinB',div(mul(g(5),sin(C(60))),R('BC')),'角Bの対辺にABを対応させた');
    target={kind:'distance',ends:['A','H']};targetDescription='AからBCまでの距離';req.push('auxiliary_line','cosine_relation','sine_relation','opposite_pair','select_ratio');routes=['BC→sinB→高さ','面積→BC→高さ'];
  }else if(index===3){
    signature='sine-shared-side-cosine';title='共有辺の先にある辺';
    const a:Point=[0,0],b:Point=[4,0],c:Point=[3+r3,1+r3];points({A:a,B:b,C:c,D:rotateFrom(c,b,Math.sqrt(2),120)});edges('AB','BC','CA','CD','DB');component('ABC','BCD');length('AB',4);length('CD',Math.sqrt(2));angle('BAC',30);angle('ABC',105);angle('BCD',120);
    prompt=`△ABCと△BCDは辺BCを共有し、AとDは直線BCの反対側にある。AB=${4*s}、CD=${integratedExact(Math.sqrt(2)*s).label}、∠BAC=30°、∠ABC=105°、∠BCD=120°である。BDの長さを求めよ。`;
    thinking='BDを求める△BCDではBCが不足しています。△ABCの角の情報を整理すれば、そのBCが求められます。';
    step('Cangle','ABC','残りの内角を求める','∠ACB=180°−30°−105°',C(45));step('BC','ABC','辺と対角の組からBCを求める','BC=AB sin30°/sin45°',div(mul(g(4),sin(C(30))),sin(R('Cangle'))),'BCD');step('BD','BCD','2辺と挟角からBDを求める','BD²=BC²+CD²−2BC・CD cos120°',cosineSide(R('BC'),g(Math.sqrt(2)),C(120)));
    mistake('sine_ratio_reversal','BC',div(mul(g(4),sin(C(45))),sin(C(30))),'BCを求める正弦の比を逆にした');mistake('wrong_included_angle','BD',cosineSide(R('BC'),g(Math.sqrt(2)),C(60)),'120°の代わりにその補角を挟角にした');mistake('shared_side_transfer','BC',g(4),'共有辺BCにABを渡した','execution',93,'X12');mistake('cosine_correction_sign','BD',sqrt(add(add(sq(R('BC')),sq(g(Math.sqrt(2)))),mul(mul(C(2),mul(R('BC'),g(Math.sqrt(2)))),cos(C(120))))),'補正項の符号を逆にした', 'execution',80);
    target={kind:'distance',ends:['B','D']};targetDescription='BD';req.push('sine_relation','opposite_pair','shared_side_transfer','cosine_relation','included_angle');routes=['正弦の比→BC→BD','垂線によるBCの計量→BD'];
  }else if(index===4){
    signature='area-side-transfer-right-distance';title='面積から決まる距離';
    points({A:[0,0],B:[6,0],C:[2,2*r3],D:[-1.5*r3,1.5]});edges('AB','BC','CA','AD','CD');component('ABC','ACD');length('AB',6);length('AD',3);angle('BAC',60);angle('CAD',90);constraints.push({kind:'area',triangle:['A','B','C'],value:6*r3*s*s});
    prompt=`△ABCの面積は${integratedExact(6*r3*s*s).label}で、AB=${6*s}、∠BAC=60°である。AとCを共有する△ACDは、AD=${3*s}、∠CAD=90°を満たす。CDの長さを求めよ。面積の単位はcm²、長さの単位はcmとする。`;
    thinking='CDを含む△ACDで必要なのはACです。△ABCでは面積とAB、角Aが分かるので、ACまで情報を戻せます。';
    step('AC','ABC','面積から必要な辺を取り出す','AC=2S/(AB sin60°)',div(C(12*r3*s*s),mul(g(6),sin(C(60)))),'ACD');step('CD','ACD','直角を確認してCDを求める','CD²=AC²+AD²',sqrt(add(sq(R('AC')),sq(g(3)))));
    mistake('area_conversion','AC',div(C(6*r3*s*s),mul(g(6),sin(C(60)))),'面積から辺へ戻す係数2を落とした');mistake('height_transfer','AC',div(C(12*r3*s*s),mul(g(6),cos(C(60)))),'面積のsinをcosに取り違えた');mistake('pythagoras_scope','CD',sqrt(sub(sq(R('AC')),sq(g(3)))),'ACを斜辺として差を取った','execution',90,'X04');
    target={kind:'distance',ends:['C','D']};targetDescription='CD';req.push('area_height_conversion','shared_side_transfer','pythagoras_scope');routes=['面積→AC→CD','面積→高さ→AC→CD'];
  }else if(index===5){
    signature='quadrilateral-diagonal-area-addition';title='四角形の広さ';
    const c:Point=[4+r3,1];points({A:[0,0],B:[4,0],C:c,D:rotateFrom([0,0],c,3,90)});edges('AB','BC','CD','DA');component('ABC','ACD');auxiliary('AC');length('AB',4);length('BC',2);length('AD',3);angle('ABC',150);angle('CAD',90);
    prompt=`凸四角形ABCDで、AB=${4*s}、BC=${2*s}、AD=${3*s}、∠ABC=150°、∠CAD=90°である。四角形ABCDの面積を求めよ。`;
    thinking='対角線ACで分けると、△ABCは与条件から面積が求まり、△ACDはACが分かれば面積が求まります。';
    step('AC','ABC','もう一方の三角形にも使う対角線を求める','AC²=AB²+BC²−2AB・BC cos150°',cosineSide(g(4),g(2),C(150)),'ACD');step('S1','ABC','最初の三角形の面積を求める','S₁=AB・BC sin150°/2',div(mul(mul(g(4),g(2)),sin(C(150))),C(2)));step('S2','ACD','直角をはさむ2辺から面積を求める','S₂=AC・AD/2',div(mul(R('AC'),g(3)),C(2)));step('area','ABCD','重ならない2つの面積を合わせる','S=S₁+S₂',add(R('S1'),R('S2')));
    mistake('cosine_correction_sign','AC',sqrt(add(add(sq(g(4)),sq(g(2))),mul(mul(C(2),mul(g(4),g(2))),cos(C(150))))),'対角線の補正項を逆にした');mistake('area_conversion','S2',mul(R('AC'),g(3)),'2つ目の三角形だけ面積の1/2を落とした');mistake('wrong_subtriangle','area',R('S2'),'片方の三角形だけで四角形の面積とした','routeSelection',96,'X11');
    target={kind:'areaSum',triangles:[['A','B','C'],['A','C','D']]};targetDescription='四角形ABCDの面積';unit='cm²';req.push('auxiliary_line','select_subtriangle','shared_side_transfer','cosine_relation','area_height_conversion');routes=['対角線ACで面積を加える','ACに対する2つの高さを使う'];finalLabel=`${2*s*s}+${3*s*s}/2 × √(20+8√3)`;
  }else if(index===6){
    signature='circle-chord-exterior-triangle';title='円の外へ伸びる三角形';
    const a:Point=[-2,0],b:Point=[2,0],c:Point=[1,r3];points({A:a,B:b,C:c,D:rotateFrom(c,a,2,-120),O:[0,0]});edges('AB','BC','CA','CD','DA');component('ABC','ACD');scene.circle={center:'O',radius:2*s};length('OA',2);length('CD',2);angle('ABC',60);angle('ACD',120);
    prompt=`半径${2*s}の円上にA、B、Cがあり、∠ABC=60°である。直線ACに関してBと反対側にある点Dが、CD=${2*s}、∠ACD=120°を満たす。ADの長さを求めよ。`;
    thinking='ADを求めるにはACが必要です。ACは円の弦なので、半径とその弦を見込む角Bを結び付けられます。';
    step('AC','ABC','円の情報から弦の長さを求める','AC=2R sin60°',mul(g(4),sin(C(60))),'ACD');step('AD','ACD','弦を別の三角形の辺として使う','AD²=AC²+CD²−2AC・CD cos120°',cosineSide(R('AC'),g(2),C(120)));
    mistake('circumradius_factor','AC',mul(g(2),sin(C(60))),'直径2Rを半径Rとした');mistake('opposite_pair_mismatch','AC',mul(g(4),cos(C(60))),'弦を求めるsinをcosにした');mistake('cosine_correction_sign','AD',sqrt(add(add(sq(R('AC')),sq(g(2))),mul(mul(C(2),mul(R('AC'),g(2))),cos(C(120))))),'次の三角形の補正項の符号を逆にした');
    target={kind:'distance',ends:['A','D']};targetDescription='AD';req.push('circumradius_relation','opposite_pair','shared_side_transfer','cosine_relation');routes=['円の半径と対角→弦AC→AD','中心角と二等辺三角形→弦AC→AD'];finalLabel=`${s===1?'':`${s} × `}√(16+4√3)`;
  }else if(index===7){
    signature='parallel-similarity-diagonal-circumcircle';title='平行な線で区切った図形';
    points({A:[0,0],B:[8,0],C:[3,3*r3],D:[2,0],E:[0.75,0.75*r3]});edges('AB','BC','CA','DE');component('ABC','ADE','BDE');auxiliary('BE');length('AB',8);length('AC',6);length('AD',2);angle('BAC',60);constraints.push({kind:'parallel',edges:[['D','E'],['B','C']]},{kind:'onSegment',point:'D',ends:['A','B']},{kind:'onSegment',point:'E',ends:['A','C']});
    prompt=`△ABCで、AB=${8*s}、AC=${6*s}、∠BAC=60°である。辺AB上の点DはAD=${2*s}を満たし、Dを通りBCに平行な直線と辺ACとの交点をEとする。△BDEの外接円の半径を求めよ。`;
    thinking='△BDEの外接円には、辺BEとそれに向かい合う角Dを使えます。BEを調べる△ABEでは、まずAEを知る必要があります。';
    step('AE','ADE・ABC','平行線から対応する辺の比を使う','AE=AC・AD/AB',div(mul(g(6),g(2)),g(8)),'ABE');step('BE','ABE','対角線BEを求める','BE²=AB²+AE²−2AB・AE cos60°',cosineSide(g(8),R('AE'),C(60)),'BDE');step('BC','ABC','角Bを調べるためにBCを求める','BC²=AB²+AC²−2AB・AC cos60°',cosineSide(g(8),g(6),C(60)));step('sinD','BDE','角Dと角Bの関係を調べる','sin∠BDE=sin∠ABC=AC sin60°/BC',div(mul(g(6),sin(C(60))),R('BC')));step('radius','BDE','辺BEとその対角から半径へ進む','R=BE/(2 sin∠BDE)',div(R('BE'),mul(C(2),R('sinD'))));
    mistake('similarity_correspondence','AE',div(mul(g(6),g(8)),g(2)),'相似比AD/ABを逆にした','execution',96,'X04');mistake('cosine_correction_sign','BE',sqrt(add(add(sq(g(8)),sq(R('AE'))),mul(g(8),R('AE')))),'BEを求める補正項の符号を逆にした');mistake('circumradius_factor','radius',div(R('BE'),R('sinD')),'半径へ戻す係数2を落とした');
    target={kind:'circumradius',triangle:['B','D','E']};targetDescription='△BDEの外接円の半径';req.push('similarity_correspondence','cosine_relation','sine_relation','opposite_pair','circumradius_relation','condition_preservation');routes=['相似→AE→BE→対角→半径','相似→BD・DE・BE→面積→半径'];
  }else if(index===8){
    signature='isosceles-trapezoid-offset-height-circle';title='台形にできる円';
    points({A:[0,0],B:[10,0],C:[8,3],D:[2,3],E:[2,0],F:[8,0]});edges('AB','BC','CD','DA');component('ABC','ADE','BCF');auxiliary('DE','E','DEとCFは底辺ABへの高さです');auxiliary('CF','F');auxiliary('AC');length('AB',10);length('CD',6);length('AD',Math.sqrt(13));length('BC',Math.sqrt(13));constraints.push({kind:'parallel',edges:[['A','B'],['D','C']]});scene.rightAngles.push({points:['D','E','A'],auxiliary:true},{points:['C','F','B'],auxiliary:true});
    prompt=`AB∥DCの二等辺台形ABCDで、AB=${10*s}、CD=${6*s}、AD=BC=${integratedExact(Math.sqrt(13)*s).label}である。△ABCの外接円の半径を求めよ。`;
    thinking='△ABCではACと角Bを結び付けると半径が求まります。台形の左右のずれを調べると、高さからその両方へ進めます。';
    step('offset','ABCD','左右のずれが等しいことを使う','BF=(AB−CD)/2',div(sub(g(10),g(6)),C(2)),'BCF');step('height','BCF','斜めの辺と水平のずれから高さを求める','CF²=BC²−BF²',sqrt(sub(sq(g(Math.sqrt(13))),sq(R('offset')))),'ACF');step('AC','ACF','対角線ACを求める','AC²=(AB−BF)²+CF²',sqrt(add(sq(sub(g(10),R('offset'))),sq(R('height')))));step('sinB','BCF','半径に必要な角の情報を得る','sinB=CF/BC',div(R('height'),g(Math.sqrt(13))),'ABC');step('radius','ABC','対角線と対角をつなぐ','R=AC/(2 sinB)',div(R('AC'),mul(C(2),R('sinB'))));
    mistake('pythagoras_scope','height',sqrt(add(sq(g(Math.sqrt(13))),sq(R('offset')))),'斜辺から直角辺を求める際に和を取った','execution',87,'X04');mistake('height_transfer','height',g(Math.sqrt(13)),'斜辺BCをそのまま高さとした');mistake('shared_side_transfer','AC',sqrt(add(sq(g(10)),sq(R('height')))),'AFにAB全体を渡した','execution',94,'X12');mistake('circumradius_factor','radius',div(R('AC'),R('sinB')),'直径を半径として答えた');
    target={kind:'circumradius',triangle:['A','B','C']};targetDescription='△ABCの外接円の半径';req.push('auxiliary_line','pythagoras_scope','select_ratio','circumradius_relation','condition_preservation');routes=['垂線→高さと対角線→sinB→半径','座標を定めて対角線と面積→半径'];
  }else if(index===9){
    signature='area-supplementary-filter-circumcircle';title='面積と角の条件';
    points({A:[0,0],B:[4,0],C:[-3,3*r3]});edges('AB','BC','CA');component('ABC');length('AB',4);length('AC',6);constraints.push({kind:'area',triangle:['A','B','C'],value:6*r3*s*s},{kind:'obtuse',points:['B','A','C']});
    prompt=`△ABCで、AB=${4*s}、AC=${6*s}、面積は${integratedExact(6*r3*s*s).label}であり、∠BACは鈍角である。この三角形の外接円の半径を求めよ。面積の単位はcm²、長さの単位はcmとする。`;
    thinking='半径にはBCとその対角Aを使えます。面積から角Aの候補が出ますが、鈍角という条件で候補を絞る必要があります。';
    step('sinA','ABC','面積から角の情報を取り出す','sinA=2S/(AB・AC)',div(C(12*r3*s*s),mul(g(4),g(6))));step('angleA','ABC','60°と120°から鈍角を残す','A=120°（60°は鈍角でないため除外）',C(120));step('BC','ABC','採用した角で辺を求める','BC²=AB²+AC²−2AB・AC cosA',cosineSide(g(4),g(6),R('angleA')));step('radius','ABC','元の角と辺で半径を求める','R=BC/(2 sinA)',div(R('BC'),mul(C(2),R('sinA'))));
    mistake('invalid_candidate_kept','angleA',C(60),'鈍角条件を確認せず60°を採用した','routeSelection',99,'X04');mistake('opposite_pair_mismatch','radius',div(g(6),mul(C(2),R('sinA'))),'角Aの対辺をACとした');mistake('circumradius_factor','radius',div(R('BC'),R('sinA')),'半径と直径を混同した');mistake('cosine_correction_sign','BC',sqrt(add(add(sq(g(4)),sq(g(6))),mul(mul(C(2),mul(g(4),g(6))),cos(R('angleA'))))),'補正項の符号を逆にした','execution',80);
    alternatives=areaCandidateCoordinates(4,6,6*r3).map(t=>({label:`A=${Math.round(inspectTriangle(t).A)}°`,points:{...t},reason:inspectTriangle(t).A>90?'辺・面積・鈍角条件をすべて満たす。':'辺と面積は満たすが、角Aが鈍角ではない。'}));
    target={kind:'circumradius',triangle:['A','B','C']};targetDescription='外接円の半径';req.push('area_height_conversion','multiple_solution','condition_preservation','cosine_relation','circumradius_relation');routes=['面積→角の候補→BC→半径','面積から高さ→鈍角側の配置→BC→半径'];
  }else if(index===10){
    signature='circle-ray-two-positions-acute-filter-area';title='角の条件で決まる面積';
    points({A:[0,0],B:[5,0],C:[4,3],H:[4,0]});edges('AB','BC','CA');component('ABC');length('AC',5);length('BC',Math.sqrt(10));constraints.push({kind:'cos',points:['C','A','B'],value:4/5},{kind:'acute',points:['A','B','C']});auxiliary('CH','H','HはCからABへの垂線の足です');scene.rightAngles.push({points:['C','H','A'],auxiliary:true});
    prompt=`△ABCで、AC=${5*s}、BC=${integratedExact(Math.sqrt(10)*s).label}、cos∠CAB=4/5であり、∠ABCは鋭角である。△ABCの面積を求めよ。`;
    thinking='面積にはABと高さが必要です。高さを調べるとBの位置は2通り考えられるので、角Bが鋭角となる配置を残します。';
    step('height','ACH','与えられた角から高さを求める','CH=AC√(1−(4/5)²)',mul(g(5),sqrt(sub(C(1),sq(C(4/5))))),'BCH');step('AH','ACH','垂線の足までの距離を求める','AH=AC cosA',mul(g(5),C(4/5)));step('BH','BCH','Bと垂線の足の距離を求める','BH²=BC²−CH²',sqrt(sub(sq(g(Math.sqrt(10))),sq(R('height')))));step('AB','ABC','鋭角条件で位置を選ぶ','AB=AH+BH（AH−BHでは角Bが鈍角）',add(R('AH'),R('BH')));step('area','ABC','採用した配置の面積を求める','S=AB・CH/2',div(mul(R('AB'),R('height')),C(2)));
    mistake('invalid_candidate_kept','AB',sub(R('AH'),R('BH')),'角Bが鈍角となる配置を残した','routeSelection',99,'X04');mistake('shared_side_transfer','AB',R('BH'),'BHをABへそのまま渡した','execution',92,'X12');mistake('area_conversion','area',mul(R('AB'),R('height')),'面積の1/2を落とした');mistake('pythagoras_scope','BH',sqrt(add(sq(g(Math.sqrt(10))),sq(R('height')))),'BHを求めるときに平方の和を取った','execution',86,'X04');
    alternatives=enumerateSSA(Math.acos(4/5)*180/Math.PI,Math.sqrt(10),5).map(t=>({label:`AB=${integratedExact(t.B[0]*s).label}`,points:{...t,H:[4,0] as Point},reason:inspectTriangle(t).B<90?'辺・角A・角Bが鋭角という条件をすべて満たす。':'辺と角Aは満たすが、角Bが鈍角になる。'}));
    target={kind:'area',triangle:['A','B','C']};targetDescription='△ABCの面積';unit='cm²';req.push('auxiliary_line','select_ratio','pythagoras_scope','multiple_solution','condition_preservation','area_height_conversion');routes=['垂線→Bの2配置→面積','角Bの補角候補→角C→AB→面積'];
  }else{
    signature='diagram-parallel-heights-two-diagonals-circle';title='段差のある四角形';
    points({A:[0,0],B:[6,0],C:[6,4],D:[0,8],H:[0,4]});edges('AB','BC','CD','DA');component('ABD','DHC','BCD');length('AB',6);length('BC',4);length('AD',8);angle('DAB',90);angle('ABC',90);auxiliary('BD');auxiliary('CH','H','CHはBCに垂直で、ADに達する線です');scene.rightAngles.push({points:['C','H','D'],auxiliary:true});constraints.push({kind:'parallel',edges:[['A','D'],['B','C']]});
    prompt='図の四角形ABCDについて、△BCDの外接円の半径を求めよ。図中の長さの単位はcmとする。';
    thinking='△BCDの辺BDと対角Cを使う方法が考えられます。直角を持つ部分へ分けると、BDと角Cの情報を別々に求められます。';
    step('BD','ABD','対角線BDを求める','BD²=AB²+AD²',sqrt(add(sq(g(6)),sq(g(8)))),'BCD');step('DH','AD・BC','高さの差を取る','DH=AD−BC',sub(g(8),g(4)),'DHC');step('CD','DHC','もう一方の辺を求める','CD²=AB²+DH²',sqrt(add(sq(g(6)),sq(R('DH')))));step('sinC','BCD','角Cは∠DCHの90°との和である','sin∠BCD=cos∠DCH=CH/CD',div(g(6),R('CD')));step('radius','BCD','対辺と対角から半径を求める','R=BD/(2 sin∠BCD)',div(R('BD'),mul(C(2),R('sinC'))));
    mistake('pythagoras_scope','BD',sqrt(sub(sq(g(8)),sq(g(6)))),'ADを斜辺としてBDを求めた','execution',90,'X04');mistake('height_transfer','DH',g(8),'高さの差を取らずADを使った');mistake('opposite_pair_mismatch','sinC',div(R('CD'),g(6)),'角Cにつなぐ辺の比を逆にした');mistake('circumradius_factor','radius',div(R('BD'),R('sinC')),'半径と直径を混同した');
    target={kind:'circumradius',triangle:['B','C','D']};targetDescription='△BCDの外接円の半径';req.push('read_given_diagram','auxiliary_line','pythagoras_scope','select_ratio','circumradius_relation','condition_preservation');routes=['対角線BD→高低差→角C→半径','3辺と△BCDの面積→半径'];
  }
  if(routes.length>1)req.push('method_selection');else routes=[steps.map(x=>x.id).join(' → ')];
  if(index===0)constraints.push({kind:'oppositeSide',line:['A','C'],points:['B','D']});
  if(index===3)constraints.push({kind:'oppositeSide',line:['B','C'],points:['A','D']});
  if(index===5)constraints.push({kind:'oppositeSide',line:['A','C'],points:['B','D']});
  if(index===6){constraints.push({kind:'oppositeSide',line:['A','C'],points:['B','D']});for(const point of ['A','B','C'])constraints.push({kind:'onCircle',point,center:'O',radius:2*s});}
  if(index===2)constraints.push({kind:'onSegment',point:'H',ends:['B','C']},{kind:'angle',points:['A','H','B'],value:90});
  scene.structureSignature=signature;
  const values=runIntegratedRoute(steps),last=steps.at(-1)!,answer=integratedExact(values[last.id]);if(finalLabel)answer.label=finalLabel;
  const solutionTrace:IntegratedTratioProblem['solutionTrace']=[{phase:'INTERPRET',text:`求めるのは${targetDescription}です。`},{phase:'IDENTIFY_INTERMEDIATE',text:thinking}];
  steps.forEach((st,i)=>{solutionTrace.push({phase:'SELECT_REGION',region:st.region,text:`${st.region}に注目します。`},{phase:i===0?'CHOOSE_RELATION':'CHOOSE_NEXT_RELATION',region:st.region,node:st.id,text:st.purpose},{phase:'CALCULATE',node:st.id,text:st.formula,value:integratedExact(values[st.id])});if(st.transferTo)solutionTrace.push({phase:'TRANSFER_RESULT',node:st.id,text:`ここで求めた${st.id}を${st.transferTo}で使います。`,transferTo:st.transferTo});});
  const verifyText=`最後に、${targetDescription}を元の図形で確認します。${index===9?'角Aは120°で鈍角、面積も与えられた値になります。':index===10?'角Bが鋭角となる配置で、2辺と角Aの条件を満たしています。':'辺・角の与条件を保ち、途中で求めた量を対応する三角形で使っています。'}`;
  solutionTrace.push({phase:'VERIFY_CONDITION',text:verifyText},{phase:'CONCLUDE',text:`${targetDescription}は${answer.label} ${unit}です。`,value:answer});
  const candidates:IntegratedCandidate[]=wrong.map(w=>{const propagatedValues=runIntegratedRoute(steps,w),value=propagatedValues[last.id];return {...w,answer:integratedExact(value),selected:false,exclusionReason:null,coherentWrongModel:{changedNode:w.node,originalExpression:steps.find(x=>x.id===w.node)!.expression,replacement:w.replacement,propagatedValues,finalTarget:last.id}};});
  const chosen:IntegratedCandidate[]=[];for(const c of [...candidates].sort((a,b)=>b.diagnosticScore-a.diagnosticScore||a.id.localeCompare(b.id))){if(!Number.isFinite(c.answer.value)||c.answer.value<=0)c.exclusionReason='この誤判断では有限の正の最終量が得られない';else if(near(c.answer.value,answer.value))c.exclusionReason='正答と数学的に同値';else if(chosen.some(x=>near(x.answer.value,c.answer.value)))c.exclusionReason='より優先する誤答と数学的に同値';else if(chosen.length===3)c.exclusionReason='診断価値の高い3候補を優先';else{chosen.push(c);c.selected=true;}}
  if(chosen.length!==3)throw new Error(`${signature}:意味ある異なる3誤答を確保できないため不採用`);
  const variantId=`${integratedTratioFamilyId}-v${String(index+1).padStart(2,'0')}`;
  const v:IntegratedTratioProblem={familyId:integratedTratioFamilyId,variantId,structureSignature:signature,difficulty:index<2?'STANDARD':index<7?'APPLIED':'PRACTICAL',scale:s,title,prompt,targetDescription,unit,thinking,working:solutionTrace.filter(t=>['CHOOSE_RELATION','CHOOSE_NEXT_RELATION','CALCULATE','VERIFY_CONDITION'].includes(t.phase)).map(t=>t.text+(t.phase==='CALCULATE'?`。${({height:'高さ',area:'面積',radius:'半径',offset:'左右のずれ',Cangle:'角C',angleA:'角A',sinD:'sin∠BDE',S1:'S₁',S2:'S₂'} as Record<string,string>)[t.node!]??t.node}=${t.value!.label}`:'')),scene,components:scene.referenceTriangle.map(t=>({id:t.join(''),vertices:t})),knownInformation:{lengths:scene.knownLengths,constraints},target,intermediateTargets:steps.slice(0,-1).map(x=>x.id),candidateRoutes:routes,selectedMathematicalRoute:steps,solutionTrace,validityConditions:['各構成三角形が退化しない','与えられた辺・角・配置を満たす','候補は元の図形条件で採否を決める'],originalPredicate:{description:'与えられた辺・角・配置の成立と、座標から直接求めた最終量を確認する',constraints,target},candidateConfigurations:[],problemRequirements:[...new Set(req)].map(id=>({id,description:requirements[id][0],crossSkills:requirements[id][1]})),answer,candidates,choices:[{choiceId:`${variantId}:correct`,answer,correct:true,mistakeHypotheses:null},...chosen.map(c=>({choiceId:`${variantId}:${c.id}`,answer:c.answer,correct:false,mistakeHypotheses:c.hypothesis}))]};
  v.candidateConfigurations=alternatives.map(a=>{const candidateScene={...scene,points:Object.fromEntries(Object.entries(a.points).map(([id,[x,y]])=>[id,[x*s,y*s] as Point]))};const finalValue=integratedOracle(candidateScene,target);return {label:a.label,scene:candidateScene,accepted:originalIntegratedPredicate(v,finalValue,candidateScene),reason:a.reason,finalValue};});
  return v;
}
export function validateIntegrated(v:IntegratedTratioProblem){
  const oracle=integratedOracle(v.scene,v.target),givens=originalIntegratedPredicate(v,v.answer.value),triangles=v.components.map(c=>({id:c.id,...inspectTriangle(triangle(v.scene,c.vertices))}));
  const choices=v.choices.length===4&&v.choices.filter(c=>c.correct).length===1&&v.choices.every((c,i)=>v.choices.every((d,j)=>i===j||!near(c.answer.value,d.answer.value)));
  return {variantId:v.variantId,scale:v.scale,pass:givens&&choices&&near(oracle,v.answer.value),oracle,answer:v.answer,triangles,choices,givens,candidateConfigurations:v.candidateConfigurations.map(c=>({label:c.label,accepted:c.accepted,finalValue:c.finalValue,reason:c.reason}))};
}
export const integratedTratioVariants=Array.from({length:12},(_,i)=>generateIntegratedTratio(i));
export const integratedTratioAudit=integratedTratioVariants.map(validateIntegrated);
