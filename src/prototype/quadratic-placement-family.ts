import type {Polynomial,ExplanationGraph} from '../ui/explanation-graph.ts';
import {realRoots} from '../ui/explanation-graph.ts';
import type {DynamicBoundary} from '../ui/dynamic-quadratic.ts';

export type PlacementTarget = {[K in 'right'|'left'|'straddle']:{kind:K;r:number}}['right'|'left'|'straddle']|{[K in 'inside'|'outside']:{kind:K;L:number;R:number;leftClosed:boolean;rightClosed:boolean}}['inside'|'outside'];
export interface PlacementParameters {A:number;b1:number;b0:number;c1:number;c0:number;target:PlacementTarget;level:'標準'|'応用'|'高め'}
export interface PlacementRange {lo:DynamicBoundary|null;hi:DynamicBoundary|null;loClosed:boolean;hiClosed:boolean}
export type PlacementSet=PlacementRange[];
export interface PlacementCondition {id:string;polynomial:Polynomial;inclusive:boolean;label:string;reason:string}
const EPS=1e-9;
export const evaluate=(p:Polynomial,k:number)=>p[0]*k*k+p[1]*k+p[2];
const scale=(p:Polynomial,s:number):Polynomial=>p.map(v=>v*s) as Polynomial;
const shift=(p:Polynomial,c:number):Polynomial=>[p[0],p[1],p[2]+c];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
export function fraction(v:number){for(let d=1;d<=1024;d++)if(Math.abs(v*d-Math.round(v*d))<1e-10){const a=Math.round(v*d),g=gcd(a,d);return d/g===1?String(a/g):`${a/g}/${d/g}`;}return String(v);}
export function polynomialText(p:Polynomial,variable='k',format=fraction){return p.map((v,i)=>v===0?'':`${v<0?'−':'+'}${i<2&&Math.abs(v)===1?'':format(Math.abs(v))}${i<2?variable+(i===0?'²':''):''}`).join('').replace(/^\+/,'')||'0';}
export function placementBoundaries(p:Polynomial):DynamicBoundary[]{
 const [a,b,c]=p;if(!a)return b?[{value:-c/b,label:fraction(-c/b)}]:[];
 const d=b*b-4*a*c;if(d<0)return [];const s=Math.sqrt(d),signs=d===0?[0]:[-1,1];
 return signs.map(sign=>{const value=(-b+sign*s)/(2*a);if(Number.isInteger(s))return {value,label:fraction(value)};
  let factor=1,radicand=d;if(Number.isInteger(d))for(let f=2;f*f<=d;f++)if(d%(f*f)===0){factor=f;radicand=d/(f*f);}
  let numerator=-b,radical=sign*factor,denominator=2*a;if(denominator<0){numerator=-numerator;radical=-radical;denominator=-denominator;}
  const g=gcd(gcd(numerator,radical),denominator);numerator/=g;radical/=g;denominator/=g;
  const top=`${numerator||''}${radical<0?'−':numerator?'+':''}${Math.abs(radical)===1?'':Math.abs(radical)}√${radicand}`;
  return {value,label:denominator===1?top:`${numerator?'('+top+')':top}/${denominator}`};
 }).sort((a,b)=>a.value-b.value);
}
export function contains(set:PlacementSet,k:number){return set.some(r=>(!r.lo||(r.loClosed?k>=r.lo.value-EPS:k>r.lo.value+EPS))&&(!r.hi||(r.hiClosed?k<=r.hi.value+EPS:k<r.hi.value-EPS)));}
function passes(c:PlacementCondition,k:number){const v=evaluate(c.polynomial,k);return c.inclusive?v>=-EPS:v>EPS;}
export function solveConditions(conditions:PlacementCondition[],union=false):PlacementSet{
 const cuts=conditions.flatMap(c=>placementBoundaries(c.polynomial)).sort((a,b)=>a.value-b.value).filter((b,i,a)=>i===0||Math.abs(b.value-a[i-1].value)>EPS);
 const pieces:PlacementSet=[];
 for(let i=0;i<=cuts.length;i++){pieces.push({lo:cuts[i-1]??null,hi:cuts[i]??null,loClosed:false,hiClosed:false});if(cuts[i])pieces.push({lo:cuts[i],hi:cuts[i],loClosed:true,hiClosed:true});}
 const accepted=pieces.filter(r=>{const k=r.lo===null?(r.hi?.value??0)-1:r.hi===null?r.lo.value+1:(r.lo.value+r.hi.value)/2;return union?conditions.some(c=>passes(c,k)):conditions.every(c=>passes(c,k));});
 const out:PlacementSet=[];for(const r of accepted){const last=out.at(-1);if(last?.hi&&r.lo&&Math.abs(last.hi.value-r.lo.value)<EPS&&(last.hiClosed||r.loClosed)){last.hi=r.hi;last.hiClosed=r.hiClosed;}else out.push({...r});}return out;
}
export function setText(set:PlacementSet){return set.length?set.map(r=>!r.lo&&!r.hi?'すべての実数k':r.lo&&r.hi&&r.lo.value===r.hi.value?`k=${r.lo.label}`:`${r.lo?r.lo.label+(r.loClosed?'≦':'<'):''}k${r.hi?(r.hiClosed?'≦':'<')+r.hi.label:''}`).join(' または '):'該当するkはない';}
export function equivalentSets(a:PlacementSet,b:PlacementSet){const cuts=[...new Set([...a,...b].flatMap(r=>[r.lo?.value,r.hi?.value].filter((v):v is number=>v!==undefined)))].sort((x,y)=>x-y);const extended=[(cuts[0]??0)-2,...cuts,(cuts.at(-1)??0)+2];return [...cuts,...extended.slice(1).map((v,i)=>(v+extended[i])/2)].every(k=>contains(a,k)===contains(b,k));}
export function targetText(t:PlacementTarget){if(t.kind==='right')return `r=${t.r}より右（${t.r}<α<β）`;if(t.kind==='left')return `r=${t.r}より左（α<β<${t.r}）`;if(t.kind==='straddle')return `α<${t.r}<β`;if(t.kind==='outside')return `α<${t.L}<${t.R}<β`;return `${t.L}${t.leftClosed?'≦':'<'}α<β${t.rightClosed?'≦':'<'}${t.R}`;}
export function placementModel(p:PlacementParameters){
 if(![p.A,p.b1,p.b0,p.c1,p.c0].every(Number.isInteger)||p.A===0)throw new Error('Nonzero integer A and integer affine coefficients required');
 const t=p.target;if('L'in t&&t.L>=t.R)throw new Error('Ordered interval required');
 const B:Polynomial=[0,p.b1,p.b0],C:Polynomial=[0,p.c1,p.c0],D:Polynomial=[p.b1*p.b1,2*p.b1*p.b0-4*p.A*p.c1,p.b0*p.b0-4*p.A*p.c0],axis=scale(B,-1/(2*p.A));
 const endpoint=(x:number):Polynomial=>[0,p.b1*x+p.c1,p.A*x*x+p.b0*x+p.c0];
 const conditions:PlacementCondition[]=[];
 const add=(id:string,polynomial:Polynomial,inclusive:boolean,label:string,reason:string)=>conditions.push({id,polynomial,inclusive,label,reason});
 if(t.kind==='straddle'||t.kind==='outside'){
  const points=t.kind==='straddle'?[['point',t.r] as const]:[['left',t.L] as const,['right',t.R] as const];
  for(const [id,x] of points)add(id,scale(endpoint(x),-p.A),false,`Aq(${x})<0`,`x=${x}が2根の間にあるには、そこでの二次式の符号が開き方向と逆になる必要があります。この符号なら異なる2根の存在も分かるので、D>0を別に重ねる必要はありません。`);
 }else{
  add('distinct',D,false,'D>0','異なる2実根をもつことを確認します。D=0では二つの根が重なるため、境界は含めません。');
  const point=(id:string,x:number,inclusive:boolean)=>add(id,scale(endpoint(x),p.A),inclusive,`Aq(${x})${inclusive?'≧':'>'}0`,`x=${x}を2根の外側に置くため、二次式の符号を開き方向とそろえます。${inclusive?'この端点は含まれるので、根が端点に一致するq=0も認めます。':'この端点は含まれないので、根が端点に一致するq=0は除きます。'}`);
  if(t.kind==='right'||t.kind==='left'){
   add('axis',scale(shift(axis,-t.r),t.kind==='right'?1:-1),false,`h${t.kind==='right'?'>':'<'}${t.r}`,'軸は2根の平均です。指定点が2根の外側にあるだけでは左右を区別できないので、平均の位置も確認します。');point('point',t.r,false);
  }else{add('axis_left',shift(axis,-t.L),false,`${t.L}<h`,'2根の平均である軸は、区間の左端より右にあります。異なる2根がともに区間内なら、平均が端点に重なることはありません。');add('axis_right',scale(shift(axis,-t.R),-1),false,`h<${t.R}`,'軸は右端より左にあります。この条件で、2根が区間の片側にまとまって外れている場合を除きます。');point('left',t.L,t.leftClosed);point('right',t.R,t.rightClosed);}
 }
 const answer=solveConditions(conditions),boundaries=conditions.flatMap(c=>placementBoundaries(c.polynomial)).sort((a,b)=>a.value-b.value).filter((v,i,a)=>!i||Math.abs(v.value-a[i-1].value)>EPS);
 const pointValues=('r'in t?[t.r]:[t.L,t.R]).map(x=>({x,polynomial:endpoint(x)}));
 return {parameters:{...p},A:p.A,B,C,D,axis,pointValues,conditions:conditions.map(c=>({...c,set:solveConditions([c])})),answer,boundaries,rootFormula:{alpha:`(−B−sgn(A)√D)/(2A)`,beta:`(−B+sgn(A)√D)/(2A)`},equation:`${p.A===1?'':p.A===-1?'−':p.A}x²+(${polynomialText(B)})x+(${polynomialText(C)})=0`,equalityReasons:conditions.filter(c=>!c.id.startsWith('axis')).map(c=>c.reason)};
}

// Independent path: original coefficients -> actual roots -> original placement inequalities.
// No generated conditions, interval solver, or answer set are used here.
export function rootPlacementOracle(p:PlacementParameters,k:number){
 const B=p.b1*k+p.b0,C=p.c1*k+p.c0,D=B*B-4*p.A*C;
 if(D<=EPS)return {A:p.A,B,C,D,roots:[] as number[],satisfied:false};
 const roots=[(-B-Math.sqrt(D))/(2*p.A),(-B+Math.sqrt(D))/(2*p.A)].sort((a,b)=>a-b),[alpha,beta]=roots,t=p.target;
 const lt=(a:number,b:number)=>a<b-EPS,le=(a:number,b:number)=>a<=b+EPS;
 let satisfied:boolean;
 if(t.kind==='right')satisfied=lt(t.r,alpha);else if(t.kind==='left')satisfied=lt(beta,t.r);else if(t.kind==='straddle')satisfied=lt(alpha,t.r)&&lt(t.r,beta);else if(t.kind==='outside')satisfied=lt(alpha,t.L)&&lt(t.R,beta);else satisfied=(t.leftClosed?le(t.L,alpha):lt(t.L,alpha))&&(t.rightClosed?le(beta,t.R):lt(beta,t.R));
 return {A:p.A,B,C,D,roots,satisfied};
}
export type PlacementMistake='real_roots_only'|'axis_condition_missing'|'left_boundary_ignored'|'right_boundary_ignored'|'opening_sign_confusion'|'double_root_included'|'endpoint_equality'|'intersection_vs_union'|'interval_sign_reversed'|'inside_outside_confusion';
const hypotheses:Record<PlacementMistake,{description:string;crossSkills:string[]}>= {
 real_roots_only:{description:'実数解の存在だけで止まり、根の位置条件を落としている可能性',crossSkills:['X04']},
 axis_condition_missing:{description:'軸を2根の平均として利用できていない可能性',crossSkills:['X12']},
 left_boundary_ignored:{description:'左端側の配置条件を確認していない可能性',crossSkills:['X07']},
 right_boundary_ignored:{description:'右端側の配置条件を確認していない可能性',crossSkills:['X07']},
 opening_sign_confusion:{description:'開き方向と指定点での符号の対応が不安定な可能性',crossSkills:['X12']},
 double_root_included:{description:'異なる2解という条件を保てていない可能性',crossSkills:['X03']},
 endpoint_equality:{description:'端点を含むかどうかと等号の扱いが対応していない可能性',crossSkills:['X13']},
 intersection_vs_union:{description:'複数条件を同時に満たす共通部分の扱いが不安定な可能性',crossSkills:['X04']},
 interval_sign_reversed:{description:'パラメータの二次不等式で内側と外側の符号を取り違えている可能性',crossSkills:['X06']},
 inside_outside_confusion:{description:'2根の間と外側での二次式の符号を取り違えている可能性',crossSkills:['X12']}
};
export interface PlacementHypothesis {choiceId:string;mistakeType:PlacementMistake;description:string;crossSkills:string[];weaknessTags:PlacementMistake[];hypothesisOnly:true}
export interface PlacementChoice {choiceId:string;answer:PlacementSet;text:string;correct:boolean;mistakeType:PlacementMistake|null;mistakeHypotheses:PlacementHypothesis[]}
export function generatePlacementProblem(p:PlacementParameters,index:number){
 const model=placementModel(p),cs=model.conditions,id=`QF-FAMILY-PLACEMENT-${String(index).padStart(2,'0')}`,isEnd=(c:PlacementCondition)=>['left','right','point'].includes(c.id);
 const candidate=(type:PlacementMistake,conditions:PlacementCondition[],score:number,reason:string,union=false,applicable=true)=>{
  const answer=solveConditions(conditions,union),choiceId=`${id}:${type}`;
  const choice:PlacementChoice={choiceId,answer,text:setText(answer),correct:false,mistakeType:type,mistakeHypotheses:[{choiceId,mistakeType:type,...hypotheses[type],weaknessTags:[type],hypothesisOnly:true}]};
  return {type,choice,diagnosticScore:score,reason,errorModel:{conditions,operation:union?'union':'intersection'},applicable};
 };
 const d:PlacementCondition={id:'distinct',polynomial:model.D,inclusive:false,label:'D>0',reason:'存在条件だけで答える'};
 const endActive=cs.some(c=>isEnd(c)&&!equivalentSets(solveConditions(cs.filter(x=>x.id!==c.id)),model.answer));
 const axisActive=cs.some(c=>c.id.startsWith('axis'))&&!equivalentSets(solveConditions(cs.filter(c=>!c.id.startsWith('axis'))),model.answer);
 const candidates=[
  candidate('real_roots_only',[d],endActive?100:85,'D>0だけを解き、根の位置条件をすべて落とした答案'),
  candidate('axis_condition_missing',cs.filter(c=>!c.id.startsWith('axis')),axisActive?108:40,axisActive?'軸の条件が左右の配置を区別するため、この省略を優先して確認する':'軸を省略しても残りの条件で補われるかを判定する',false,cs.some(c=>c.id.startsWith('axis'))),
  ...(['left','right'] as const).map(side=>candidate(side==='left'?'left_boundary_ignored':'right_boundary_ignored',cs.filter(c=>c.id!==side),!equivalentSets(solveConditions(cs.filter(c=>c.id!==side)),model.answer)?103:35,`${side==='left'?'左':'右'}端の符号条件だけを省き、残った条件をすべて解く`,false,cs.some(c=>c.id===side))),
  candidate('opening_sign_confusion',cs.map(c=>isEnd(c)?{...c,polynomial:scale(c.polynomial,1/p.A),label:c.label.replace('Aq','q')}:c),p.A<0?112:20,'Aを掛けず、常に上に開くときの端点の符号を使って条件を解く'),
  candidate('double_root_included',cs.map(c=>c.id==='distinct'?{...c,inclusive:true,label:'D≧0'}:c),placementBoundaries(model.D).some(b=>contains(solveConditions(cs.filter(c=>c.id!=='distinct')),b.value))?106:45,'D>0をD≧0と誤解し、他の位置条件は保ったまま解く',false,cs.some(c=>c.id==='distinct')),
  candidate('endpoint_equality',cs.map(c=>isEnd(c)?{...c,inclusive:!c.inclusive,label:c.label.replace(c.inclusive?'≧':'>',c.inclusive?'>':'≧').replace('<0','≦0')}:c),p.target.kind==='inside'?110:90,'指定端点の開閉を逆に読んだ区間条件から解き直す'),
  candidate('intersection_vs_union',cs,cs.length>2?96:70,'必要条件の共通部分を取らず、どれか一つでよいとして和集合を取る',true,cs.length>1),
  candidate('interval_sign_reversed',cs.map(c=>c.polynomial[0]!==0?{...c,polynomial:scale(c.polynomial,-1),label:`−(${polynomialText(c.polynomial)})${c.inclusive?'≧':'>'}0`}:c),model.D[0]!==0&&placementBoundaries(model.D).length===2?104:30,'kの二次不等式で境界の内側・外側を逆に読んだ条件を解く',false,cs.some(c=>c.polynomial[0]!==0)),
  candidate('inside_outside_confusion',cs.map(c=>isEnd(c)?{...c,polynomial:scale(c.polynomial,-1),label:`−(${polynomialText(c.polynomial)})${c.inclusive?'≧':'>'}0`}:c),p.target.kind==='straddle'||p.target.kind==='outside'?111:80,'指定点が2根の間か外側かを逆に捉え、符号条件から解き直す')
 ];
 const chosen:typeof candidates=[];
 const decisions=[...candidates].sort((a,b)=>b.diagnosticScore-a.diagnosticScore||a.type.localeCompare(b.type)).map(c=>{const duplicate=chosen.find(x=>equivalentSets(x.choice.answer,c.choice.answer));const exclusion=!c.applicable?'この配置では該当する条件を使わない':equivalentSets(c.choice.answer,model.answer)?'正答と数学的に同値':duplicate?`採用候補 ${duplicate.type} と数学的に同値`:chosen.length>=3?'診断価値の高い3候補を優先':'';if(!exclusion)chosen.push(c);return {...c,selected:!exclusion,selectionReason:exclusion||c.reason};});
 const choices:PlacementChoice[]=[{choiceId:`${id}:correct`,answer:model.answer,text:setText(model.answer),correct:true,mistakeType:null,mistakeHypotheses:[]},...chosen.map(c=>c.choice)];
 if(choices.length!==4)throw new Error(`Insufficient distinct diagnostic choices: ${id}`);
 const requirement=(id:string,description:string,crossSkills:string[])=>({id,description,crossSkills});
 const problemRequirements=[requirement('distinct','異なる2実根が存在することを確認する',['X03']),...(cs.some(c=>c.id.startsWith('axis'))?[requirement('axis','軸を2根の平均として位置を判断する',['X12'])]:[]),requirement('sign','指定点の符号を開き方向と対応させる',['X12']),...('L'in p.target?[requirement('both_sides','左右両端の配置条件を確認する',['X07'])]:[]),...(cs.length>1?[requirement('intersection','複数条件を同時に満たす範囲を求める',['X04'])]:[]),requirement('equality','端点一致と等号、重解の除外を確かめる',['X13']),...(cs.some(c=>c.polynomial[0]!==0&&placementBoundaries(c.polynomial).length===2)?[requirement('cases','二次不等式の境界の内外を漏れなく調べる',['X06'])]:[]),requirement('verify','元の根の配置へ戻って確認する',['X13'])];
 const explanation={thinking:'異なる2実根をもつだけならD>0で分かります。今回はさらに、その2根が指定された位置にある必要があります。'+(cs.some(c=>c.id.startsWith('axis'))?'軸は2根のちょうど真ん中です。軸の位置と指定点でのグラフの高さを合わせて調べると、2根がどちら側にあるかを判断できます。':'指定点が2根の間にあるかを調べます。そこでのグラフの高さが開き方向と逆の符号なら、左右でx軸を横切ることが分かります。'),steps:[
  `左辺をqₖ(x)とおきます。A=${p.A}、B=${polynomialText(model.B)}、C=${polynomialText(model.C)}なので、D=B²−4AC=${polynomialText(model.D)}、軸はh=−B/(2A)=${polynomialText(model.axis)}です。`,
  `Aqₖ(x)=A²(x−α)(x−β)と書けるため、2根の外側では正、間では負です。${p.A<0?'A<0なのでqₖ(x)自体の符号は逆になりますが、Aを掛ければ同じ見方が使えます。':'この問題ではA>0なので、qₖ(x)自体も同じ符号になります。'}`,
  ...model.conditions.map(c=>`${c.reason} ${c.label}を整理すると、${polynomialText(c.polynomial)}${c.inclusive?'≧':'>'}0。これを満たすのは${setText(c.set)}です。`),
  `${cs.length>1?'すべての条件を同時に満たす必要があるので、上の範囲の共通部分を取ります。':'この符号条件が、求める配置を表しています。'}したがって、${setText(model.answer)}。`,
  `元の条件「${targetText(p.target)}」へ戻って確認します。${p.target.kind==='straddle'||p.target.kind==='outside'?'指定点でAqₖ(x)<0となるため、その左右に異なる根があり、指定した配置になります。':'D>0で二つの根は異なり、軸と端点の符号を合わせることで、片方だけでなく両方が指定位置にあると分かります。'}${p.target.kind==='inside'?`左端は${p.target.leftClosed?'含む':'含まない'}、右端は${p.target.rightClosed?'含む':'含まない'}ので、根が端点に一致する境界もこの開閉に従って扱います。`:'指定点で等号になる場合は、問題の厳しい不等号を満たさないため含めません。'}`
 ],answer:setText(model.answer)};
 return {id,index,status:'prototype-unreviewed' as const,model,choices,decisions,problemRequirements,explanation,prompt:`kを実数とする。二次方程式 ${model.equation} が異なる2実根α<βをもち、${targetText(p.target)}を満たすようなkの範囲を求めよ。`};
}
export function placementGraphState(p:PlacementParameters,k:number){
 const o=rootPlacementOracle(p,k),h=-o.B/(2*p.A),q:Polynomial=[p.A,o.B,o.C],roots=realRoots(q),t=p.target,points='r'in t?[t.r]:[t.L,t.R],left=Math.min(h,...roots,...points)-1,right=Math.max(h,...roots,...points)+1;
 const heights=[left,right,h,...points].map(x=>evaluate(q,x)),low=Math.min(0,...heights)-1,high=Math.max(0,...heights)+1;
 const decimal=(v:number)=>String(Math.round(v*10000)/10000);
 const endpointValues=points.map(x=>({x,value:evaluate(q,x)}));
 const graph:ExplanationGraph={title:'二次式と2根の位置',curves:[{formula:`qₖ(x)=${polynomialText(q,'x',decimal)}`,coefficients:q}],view:[left,right,low,high],...('L'in t?{domain:[t.L,t.R] as [number,number],openLeft:!t.leftClosed,openRight:!t.rightClosed}:{referencePoints:[t.r]}),caption:`${o.roots.length?`α≈${decimal(o.roots[0])}、β≈${decimal(o.roots[1])}`:roots.length===1?'重解が1つあり、異なる2実根ではありません':'実数解はありません'}。目標「${targetText(t)}」を${o.satisfied?'満たします':'満たしません'}。図は現在のkでの例です。全範囲と境界は式で確かめます。`};
 return {...o,h,q,graph,endpointValues,graphRoots:roots};
}
const inside=(L:number,R:number,leftClosed=false,rightClosed=false):PlacementTarget=>({kind:'inside',L,R,leftClosed,rightClosed});
export const placementSeeds:PlacementParameters[]=[
 {A:1,b1:-2,b0:0,c1:0,c0:1,target:{kind:'right',r:0},level:'標準'},
 {A:1,b1:0,b0:2,c1:1,c0:0,target:{kind:'left',r:0},level:'標準'},
 {A:1,b1:1,b0:0,c1:1,c0:0,target:{kind:'straddle',r:0},level:'標準'},
 {A:1,b1:1,b0:0,c1:0,c0:1,target:inside(-2,2),level:'応用'},
 {A:-1,b1:1,b0:0,c1:0,c0:1,target:inside(-2,2,true,true),level:'応用'},
 {A:1,b1:-2,b0:0,c1:1,c0:2,target:inside(0,4,true,false),level:'応用'},
 {A:-1,b1:2,b0:0,c1:-1,c0:0,target:inside(-1,3,false,true),level:'応用'},
 {A:1,b1:1,b0:0,c1:0,c0:-3,target:{kind:'outside',L:-1,R:2,leftClosed:false,rightClosed:false},level:'応用'},
 {A:-1,b1:2,b0:0,c1:0,c0:-2,target:{kind:'right',r:1},level:'高め'},
 {A:1,b1:-2,b0:0,c1:1,c0:2,target:{kind:'left',r:1},level:'高め'},
 {A:1,b1:-2,b0:0,c1:2,c0:0,target:inside(0,4,true,true),level:'高め'},
 {A:-1,b1:2,b0:-2,c1:2,c0:0,target:inside(-3,1),level:'高め'}
];
export const placementProblems=placementSeeds.map((p,i)=>generatePlacementProblem(p,i+1));
export type PlacementProblem=ReturnType<typeof generatePlacementProblem>;
