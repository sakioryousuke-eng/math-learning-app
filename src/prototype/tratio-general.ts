export const generalFamilyId='TR-GENERAL-MEASURE';
export const generalScales=[1,2,3,4] as const;
export interface ExactValue {value:number;label:string}
export type Point=[number,number];
export interface Triangle {A:Point;B:Point;C:Point}
type Given='a'|'b'|'c'|'A'|'B'|'C'|'area';
export interface GeneralTriangleScene {
  vertices:['A','B','C'];coordinates:Triangle[];
  knownValues:Partial<Record<Given,ExactValue>>;
  target:'b'|'a'|'cosA'|'area'|'R'|'aR'|'A'|'ssa';
  circumcircle:boolean;altitudes:boolean;solutionRoute:string[];
  validityConditions:string[];solutionCount:number;structureSignature:string;
  ssa?:{A:number;a:number;b:number};
}
export interface GeneralAnswer {values:number[];label:string;count?:number;unordered?:true}
const requirementMap={
  opposite_pair:['向かい合う辺と角を対応させる',['X04','X08']],
  sine_relation:['既知の対辺・対角から別の組へつなぐ',['X10']],
  cosine_relation:['2辺とその間の角から残りの辺へつなぐ',['X10']],
  included_angle:['使う2辺の間の角を確認する',['X04']],
  three_side_angle:['3辺から角の情報を求める',['X08','X10']],
  area_height_conversion:['底辺と高さの関係から面積を扱う',['X08','X12']],
  circumradius_relation:['辺・対角と外接円の直径をつなぐ',['X10']],
  triangle_existence:['三角形が成立する条件を確かめる',['X03']],
  ambiguous_ssa:['SSAの複数候補を分けて調べる',['X06','X07']],
  supplementary_angle:['同じsinを持つ補角も調べる',['X07']],
  preserve_angle_sum:['内角和と角の範囲を保つ',['X04']],
  method_selection:['与条件と未知量を直接結ぶ関係を選ぶ',['X11']],
  verify_original_triangle:['答えを元の三角形で確認する',['X13']],
} as const;
type Requirement=keyof typeof requirementMap;
const hypothesisMap={
  opposite_pair_mismatch:['対辺と対角の対応をずらした可能性','X04'],
  sine_ratio_reversal:['正弦の比の配置を逆にした可能性','X08'],
  circumradius_factor:['外接円の半径と直径を混同した可能性','X04'],
  cosine_correction_sign:['余弦定理の補正項の符号を逆にした可能性','X08'],
  cosine_correction_factor:['余弦定理の補正項の係数2を落とした可能性','X08'],
  area_half_factor:['面積の1/2を落とした、または重ねた可能性','X08'],
  area_height_confusion:['高さを表すsinとcosを取り違えた可能性','X08'],
  ssa_second_solution_missing:['補角の候補を一つ落とした可能性','X07'],
  ssa_invalid_second_solution:['内角和を満たさない補角を採用した可能性','X04'],
  triangle_existence:['元の条件での三角形成立を確認していない可能性','X03'],
  pythagoras_scope:['直角でない三角形へ三平方を使った可能性','X11'],
} as const;
type HypothesisId=keyof typeof hypothesisMap;
export interface GeneralCandidate {id:string;answer:GeneralAnswer;model:string;reason:string;diagnosticScore:number;selected:boolean;exclusionReason:string|null;mistakeHypotheses:{type:HypothesisId;description:string;crossSkills:string[];hypothesisOnly:true}}
export interface GeneralVariant {
  familyId:typeof generalFamilyId;variantId:string;structureSignature:string;scale:number;
  difficulty:'STANDARD'|'APPLIED'|'PRACTICAL';prompt:string;thinking:string;working:string[];
  scene:GeneralTriangleScene;answer:GeneralAnswer;problemRequirements:{id:Requirement;description:string;crossSkills:readonly string[]}[];
  candidates:GeneralCandidate[];choices:{choiceId:string;answer:GeneralAnswer;correct:boolean;mistakeHypotheses:GeneralCandidate['mistakeHypotheses']|null}[];
}
const sin=(x:number)=>Math.sin(x*Math.PI/180),cos=(x:number)=>Math.cos(x*Math.PI/180),deg=(x:number)=>x*180/Math.PI;
const r2=Math.sqrt(2),r3=Math.sqrt(3),r6=Math.sqrt(6);
const exact=(value:number,label:string):ExactValue=>({value,label});
const root=(k:number,r:number)=>{const d=[1,2,3,6].find(d=>Math.abs(k*d-Math.round(k*d))<1e-9)??1,n=Math.round(k*d);return `${n===1?'':n}√${r}${d===1?'':'/'+d}`;};
const scalar=(x:number,label:string):GeneralAnswer=>({values:[x],label});
const ssaAnswer=(angles:number[],label?:string):GeneralAnswer=>({values:angles,count:angles.length,label:label??(angles.length?`${angles.length}個。B=${angles.join('°、')}°`:'三角形は存在しない（0個）')});
const near=(a:number,b:number)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
export function sameGeneralAnswer(a:GeneralAnswer,b:GeneralAnswer){const x=[...a.values],y=[...b.values];if(a.count!==undefined||a.unordered||b.unordered){x.sort((a,b)=>a-b);y.sort((a,b)=>a-b);}return a.count===b.count&&x.length===y.length&&x.every((v,i)=>near(v,y[i]));}

// Independent coordinate geometry: side distances, dot products, determinant,
// and the intersection of perpendicular bisectors (not a/(2sinA) or abc/(4S)).
export function inspectTriangle(t:Triangle){
  const dist=(p:Point,q:Point)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
  const a=dist(t.B,t.C),b=dist(t.C,t.A),c=dist(t.A,t.B);
  const u:Point=[t.B[0]-t.A[0],t.B[1]-t.A[1]],v:Point=[t.C[0]-t.A[0],t.C[1]-t.A[1]];
  const det=u[0]*v[1]-u[1]*v[0],size=Math.max(a,b,c);
  if(!Number.isFinite(size)||Math.min(a,b,c)<=0||Math.abs(det)<=1e-12*size*size)throw new Error('退化三角形を除外');
  const angle=(o:Point,p:Point,q:Point)=>deg(Math.acos(Math.max(-1,Math.min(1,((p[0]-o[0])*(q[0]-o[0])+(p[1]-o[1])*(q[1]-o[1]))/(dist(o,p)*dist(o,q))))));
  const uu=u[0]*u[0]+u[1]*u[1],vv=v[0]*v[0]+v[1]*v[1];
  const offset:Point=[(uu*v[1]-vv*u[1])/(2*det),(u[0]*vv-v[0]*uu)/(2*det)];
  const center:Point=[t.A[0]+offset[0],t.A[1]+offset[1]];
  return {a,b,c,A:angle(t.A,t.B,t.C),B:angle(t.B,t.A,t.C),C:angle(t.C,t.A,t.B),cosA:(u[0]*v[0]+u[1]*v[1])/(b*c),area:Math.abs(det)/2,R:Math.hypot(...offset),center};
}
// C is fixed by b and A. B lies on the positive x-axis and on the circle
// centered at C with radius a. Positive, distinct intersections enumerate SSA.
export function enumerateSSA(A:number,a:number,b:number):Triangle[]{
  if(!(A>0&&A<180&&a>0&&b>0)||![A,a,b].every(Number.isFinite))return [];
  const C:Point=[b*cos(A),b*sin(A)],discriminant=a*a-C[1]*C[1],tolerance=1e-12*Math.max(a*a,b*b);
  if(discriminant< -tolerance)return [];
  const delta=Math.sqrt(Math.max(0,Math.abs(discriminant)<=tolerance?0:discriminant));
  const roots=[C[0]-delta,C[0]+delta].filter((x,i,all)=>x>1e-11*Math.max(a,b)&&all.findIndex(y=>Math.abs(y-x)<=1e-11*Math.max(a,b))===i);
  return roots.map(x=>({A:[0,0] as Point,B:[x,0] as Point,C})).filter(t=>{try{inspectTriangle(t);return true;}catch{return false;}});
}
export function solveSSA(A:number,a:number,b:number){
  if(!(A>0&&A<180&&a>0&&b>0)||![A,a,b].every(Number.isFinite))return [];
  const ratio=b*sin(A)/a;if(ratio>1+1e-12||ratio<=0)return [];
  const B=deg(Math.asin(Math.min(1,ratio)));
  return [B,180-B].filter((x,i,all)=>A+x<180-1e-9&&all.findIndex(y=>Math.abs(y-x)<1e-9)===i).sort((a,b)=>a-b);
}
export function generalOracle(scene:GeneralTriangleScene):GeneralAnswer {
  const triangles=scene.ssa?enumerateSSA(scene.ssa.A,scene.ssa.a,scene.ssa.b):scene.coordinates;
  const geometry=triangles.map(inspectTriangle);
  if(scene.target==='ssa')return {count:triangles.length,values:geometry.map(g=>g.B).sort((a,b)=>a-b),label:''};
  if(scene.target==='A')return {values:geometry.map(g=>g.A).sort((a,b)=>a-b),label:'',unordered:true};
  if(geometry.length!==1)throw new Error('一意の三角形が必要');
  const g=geometry[0];return {values:scene.target==='aR'?[g.a,g.R]:[g[scene.target]],label:''};
}

export function generateGeneralVariant(index:number,scale:number=generalScales[index%generalScales.length]):GeneralVariant {
  if(!Number.isInteger(index)||index<0||index>=12||!generalScales.includes(scale as typeof generalScales[number]))throw new Error('安全な12構造とscale poolのみ');
  const s=scale,scene:GeneralTriangleScene={vertices:['A','B','C'],coordinates:[],knownValues:{},target:'a',circumcircle:false,altitudes:false,solutionRoute:[],validityConditions:['各辺が正','各内角が0°より大きく180°未満','内角和180°','退化しない'],solutionCount:1,structureSignature:''};
  let prompt='',thinking='',working:string[]=[],answer:GeneralAnswer={values:[],label:''};
  let req:Requirement[]=['method_selection','verify_original_triangle'];const candidates:GeneralCandidate[]=[];
  const known=(id:Given,value:number,label=String(value))=>{scene.knownValues[id]=exact(value,label);};
  const triangle=(base:number,x:number,y:number):Triangle=>({A:[0,0],B:[base,0],C:[x,y]});
  const wrong=(id:HypothesisId,a:GeneralAnswer,model:string,reason:string,score=80)=>{const [description,cross]=hypothesisMap[id];candidates.push({id:`${id}:${candidates.length}`,answer:a,model,reason,diagnosticScore:score,selected:false,exclusionReason:null,mistakeHypotheses:{type:id,description,crossSkills:[cross],hypothesisOnly:true}});};
  const prefix='△ABCで、辺a=BC、b=CA、c=ABとする。';
  if(index===0){
    scene.structureSignature='AAS_OPPOSITE_PAIR_TO_SIDE';scene.target='b';scene.coordinates=[triangle((r6+r2)*s,r6*s,r2*s)];
    known('A',30);known('B',45);known('a',2*s);req.push('opposite_pair','sine_relation');
    prompt=`${prefix}A=30°、B=45°、a=${2*s} cmのとき、bを求めよ。`;
    answer=scalar(2*s*sin(45)/sin(30),`b=${root(2*s,2)} cm`);thinking='aとAが一組で分かっています。求めるbの向かいにはBがあるので、この二組を直接つなぎます。';
    working=[`同じ高さを二つの辺から表すと、a/sinA=b/sinB。これが正弦定理です。b=${2*s}sin45°/sin30°=${root(2*s,2)}。`,`残りの角は105°で、内角和を満たします。B>Aに対応してb>aとなることも確かめられます。`];scene.solutionRoute=['b=a sinB/sinA'];
    wrong('sine_ratio_reversal',scalar(r2*s,`b=${root(s,2)} cm`),'b=a sinA/sinB','正弦の比を逆にする',95);
    wrong('opposite_pair_mismatch',scalar(s,`b=${s} cm`),'b=a sinA','bをaの対辺方向の成分だと扱う',85);
    wrong('opposite_pair_mismatch',scalar(2*s,`b=${2*s} cm`),'b=a','角が異なるのに対辺を同じ長さにする');
  }else if(index===1||index===6){
    scene.structureSignature=index===1?'SAS_THIRD_SIDE':'SAS_SIDE_THEN_CIRCUMRADIUS';scene.target=index===1?'a':'aR';scene.circumcircle=index===6;scene.coordinates=[triangle(4*s,1.5*s,1.5*r3*s)];known('b',3*s);known('c',4*s);known('A',60);req.push('included_angle','cosine_relation');
    const a=Math.sqrt((3*s)**2+(4*s)**2-2*3*s*4*s*cos(60)),R=a/(2*sin(60));
    prompt=`${prefix}b=${3*s} cm、c=${4*s} cm、A=60°。${index===1?'aを求めよ。':'aと外接円の半径Rを求めよ。'}`;
    answer=index===1?scalar(a,`a=${root(s,13)} cm`):{values:[a,R],label:`a=${root(s,13)} cm、R=${root(s/3,39)} cm`};
    thinking='分かっている二辺はAをはさんでいます。その二辺と挟角から、残りの辺を直接結べます。';
    working=[`余弦定理よりa²=b²+c²−2bc cosA=${9*s*s}+${16*s*s}−${24*s*s}×1/2=${13*s*s}。a=${root(s,13)}。`,index===1?'A=90°ならcosA=0となり、三平方の式になります。今回は60°なので補正項を残します。':`次にaと対角Aがそろったのでa/sinA=2R。R=${root(s,13)}/√3=${root(s/3,39)}。`,`二辺の差${s}より長く、和${7*s}より短いので三角形が成立します。`];scene.solutionRoute=['a²=b²+c²−2bc cosA',...(index===6?['R=a/(2sinA)']:[])];
    const wrongA=(rad:number)=>index===1?scalar(s*Math.sqrt(rad),`a=${root(s,rad)} cm`):{values:[s*Math.sqrt(rad),s*Math.sqrt(3*rad)/3],label:`a=${root(s,rad)} cm、R=${root(s/3,3*rad)} cm`};
    wrong('cosine_correction_sign',wrongA(37),'a²=b²+c²+2bc cosA'+(index===6?', R=a/(2sinA)':''),'挟角60°で補正項を足す',95);
    wrong('cosine_correction_factor',wrongA(19),'a²=b²+c²−bc cosA'+(index===6?', R=a/(2sinA)':''),'補正項の2を落とす',85);
    wrong('pythagoras_scope',index===1?scalar(5*s,`a=${5*s} cm`):{values:[5*s,5*s*r3/3],label:`a=${5*s} cm、R=${root(5*s/3,3)} cm`},'a²=b²+c²'+(index===6?', R=a/(2sinA)':''),'直角でないのに三平方だけで計算する',90);
    if(index===6){req.push('opposite_pair','circumradius_relation');wrong('circumradius_factor',{values:[a,2*R],label:`a=${root(s,13)} cm、R=${root(2*s/3,39)} cm`},'R=a/sinA','最後の直径から半径への換算を落とす',100);}
  }else if(index===2){
    scene.structureSignature='SSS_ANGLE_CLASSIFICATION';scene.target='cosA';scene.coordinates=[triangle(5*s,1.4*s,4.8*s)];known('a',6*s);known('b',5*s);known('c',5*s);req.push('three_side_angle');
    prompt=`${prefix}a=${6*s} cm、b=c=${5*s} cm。cosAを求め、Aが鋭角・直角・鈍角のどれか答えよ。`;
    answer=scalar(((5*s)**2+(5*s)**2-(6*s)**2)/(2*5*s*5*s),'cosA=7/25、Aは鋭角');thinking='三辺が分かっているので、Aをはさむ二辺と向かいの辺からcosAを取り出します。';
    working=['余弦定理をcosAについて整理すると、cosA=(b²+c²−a²)/(2bc)=7/25。','0<cosA<1なのでAは鋭角です。特殊角に丸める必要はありません。三辺は三角形の不等式も満たします。'];scene.solutionRoute=['cosA=(b²+c²−a²)/(2bc)'];
    wrong('cosine_correction_sign',scalar(-7/25,'cosA=−7/25、Aは鈍角'),'cosA=(a²−b²−c²)/(2bc)','分子の符号を逆転',95);
    wrong('cosine_correction_factor',scalar(14/25,'cosA=14/25、Aは鋭角'),'cosA=(b²+c²−a²)/(bc)','分母の2を落とす',90);
    wrong('opposite_pair_mismatch',scalar(3/5,'cosA=3/5、Aは鋭角'),'cosA=(a²+c²−b²)/(2ac)','Bを求める式でAを答える',85);
  }else if(index===3){
    scene.structureSignature='OPPOSITE_PAIR_TO_CIRCUMRADIUS';scene.target='R';scene.circumcircle=true;scene.coordinates=[triangle(2*r3*s,2*r3*s,2*s)];known('a',2*s);known('A',30);req.push('opposite_pair','circumradius_relation');
    prompt=`${prefix}a=${2*s} cm、A=30°。外接円の半径Rを求めよ。`;
    answer=scalar(2*s/(2*sin(30)),`R=${2*s} cm`);thinking='辺aと向かいの角Aは、外接円の直径につながる一組です。求めるのは直径ではなく半径です。';
    working=[`a/sinA=2Rより、2R=${2*s}/(1/2)=${4*s}。したがってR=${2*s}。`,`元の関係へ戻すと2R sin30°=${2*s}=a。図のほかの角度を推測する必要はありません。`];scene.solutionRoute=['R=a/(2sinA)'];
    wrong('circumradius_factor',scalar(4*s,`R=${4*s} cm`),'R=a/sinA','直径を半径として答える',100);
    wrong('sine_ratio_reversal',scalar(s/2,`R=${s/2} cm`),'R=a sinA/2','sinAで割るところを掛ける',90);
    wrong('circumradius_factor',scalar(s,`R=${s} cm`),'R=a/2','弦aを直径だとみなす',85);
  }else if(index===4){
    scene.structureSignature='OBTUSE_SAS_AREA_FROM_HEIGHT';scene.target='area';scene.altitudes=true;scene.coordinates=[triangle(6*s,-2*s,2*r3*s)];known('b',4*s);known('c',6*s);known('A',120);req.push('included_angle','area_height_conversion');
    prompt=`${prefix}b=${4*s} cm、c=${6*s} cm、A=120°。面積Sを求めよ。`;
    answer=scalar(.5*4*s*6*s*sin(120),`S=${root(6*s*s,3)} cm²`);thinking='底辺をABとすると、高さはCから直線ABまでの距離です。鈍角では垂線の足が辺の延長上に来ます。';
    working=[`高さh=b sin120°=${root(2*s,3)}。底辺×高さの半分なのでS=ch/2=${root(6*s*s,3)}。`,`このようにS=bc sinA/2は高さを置き換えた式です。sin120°=sin60°>0なので、面積も正になります。`];scene.solutionRoute=['h=b sinA','S=ch/2'];
    wrong('area_half_factor',scalar(12*r3*s*s,`S=${root(12*s*s,3)} cm²`),'S=bc sinA','三角形の面積の1/2を落とす',100);
    wrong('area_height_confusion',scalar(-6*s*s,`S=−${6*s*s} cm²`),'h=b cosA, S=ch/2','高さに横の成分を使い、負の面積も見直さない',95);
    wrong('area_half_factor',scalar(3*r3*s*s,`S=${root(3*s*s,3)} cm²`),'S=bc sinA/4','高さを求めた後に1/2を二重に掛ける',85);
  }else if(index===5){
    scene.structureSignature='AREA_SIDE_ANGLE_TO_SIDE';scene.target='b';scene.altitudes=true;scene.coordinates=[triangle(3*s,4*r3*s,4*s)];known('c',3*s);known('A',30);known('area',6*s*s);req.push('included_angle','area_height_conversion');
    prompt=`${prefix}面積S=${6*s*s} cm²、c=${3*s} cm、A=30°。bを求めよ。`;
    answer=scalar(2*6*s*s/(3*s*sin(30)),`b=${8*s} cm`);thinking='底辺と面積から高さが求まります。その高さを、角Aに対する辺bの成分として結びます。';
    working=[`h=2S/c=${4*s}。相似からh=b sin30°なので、b=h/sin30°=${8*s}。`,`面積へ戻すと(1/2)×${3*s}×${8*s}×(1/2)=${6*s*s}。垂線の足はABの延長上にあっても同じ高さを使えます。`];scene.solutionRoute=['h=2S/c','b=h/sinA'];
    wrong('area_half_factor',scalar(4*s,`b=${4*s} cm`),'b=S/(c sinA)','面積式の1/2を落として逆算する',95);
    wrong('sine_ratio_reversal',scalar(2*s,`b=${2*s} cm`),'b=(2S/c)sinA','高さからbへ戻す計算を逆にする',90);
    wrong('area_height_confusion',scalar(8*s*r3/3,`b=${root(8*s/3,3)} cm`),'b=(2S/c)/cosA','高さをb cosAと置く',85);
  }else if(index===7){
    scene.structureSignature='SSS_TO_HEIGHT_TO_AREA';scene.target='area';scene.altitudes=true;scene.coordinates=[triangle(6*s,3*s,4*s)];known('a',5*s);known('b',5*s);known('c',6*s);req.push('three_side_angle','area_height_conversion');
    prompt=`${prefix}a=b=${5*s} cm、c=${6*s} cm。面積Sを求めよ。`;
    answer=scalar(.5*6*s*5*s*Math.sqrt(1-((25+36-25)/60)**2),`S=${12*s*s} cm²`);thinking='三辺から角の情報を得れば高さが求まります。二等辺であることに気づけば、垂線と三平方でも同じ高さを確認できます。';
    working=[`cosA=(b²+c²−a²)/(2bc)=3/5。0°<A<180°でsinA>0なので、sinA=4/5。h=b sinA=${4*s}。`,`S=ch/2=${12*s*s}。別の確認として、底辺の半分${3*s}と斜辺${5*s}からh²=${25*s*s}−${9*s*s}=${16*s*s}となります。`];scene.solutionRoute=['cosA=(b²+c²−a²)/(2bc)','sinA=√(1−cos²A)>0','S=bc sinA/2'];
    wrong('area_height_confusion',scalar(9*s*s,`S=${9*s*s} cm²`),'S=bc cosA/2','横の成分を高さとして使う',95);
    wrong('area_half_factor',scalar(24*s*s,`S=${24*s*s} cm²`),'S=bc sinA','最後の1/2を落とす',90);
    wrong('pythagoras_scope',scalar(3*Math.sqrt(34)*s*s,`S=${root(3*s*s,34)} cm²`),'h²=b²+(c/2)², S=ch/2','高さを斜辺として平方を足す',85);
  }else if(index===8){
    scene.structureSignature='AREA_TWO_SIDES_TO_SUPPLEMENTARY_ANGLES';scene.target='A';scene.altitudes=true;scene.coordinates=[triangle(6*s,2*s,2*r3*s),triangle(6*s,-2*s,2*r3*s)];scene.solutionCount=2;known('b',4*s);known('c',6*s);known('area',6*r3*s*s,root(6*s*s,3));req.push('included_angle','area_height_conversion','supplementary_angle','triangle_existence','preserve_angle_sum');
    prompt=`${prefix}b=${4*s} cm、c=${6*s} cm、面積S=${root(6*s*s,3)} cm²。角Aをすべて求めよ。`;
    const theta=deg(Math.asin(2*6*r3*s*s/(4*s*6*s)));answer={values:[theta,180-theta],label:'A=60° または120°',unordered:true};thinking='面積から高さが決まっても、辺が底辺のどちら側へ傾くかは一つに決まりません。同じsinを持つ二つの角を調べます。';
    working=['S=bc sinA/2からsinA=√3/2。0°<A<180°ではA=60°、120°の二つです。','どちらも二辺が正で、その間の角が0°や180°ではないため三角形を作れます。二つとも元の面積になり、境界の退化形は含みません。'];scene.solutionRoute=['sinA=2S/(bc)','A=θ or 180°−θ; 0°<A<180°'];
    wrong('ssa_second_solution_missing',{values:[60],label:'A=60°のみ'},'sinA=√3/2から鋭角だけ採用','補角120°を落とす',100);
    wrong('ssa_second_solution_missing',{values:[120],label:'A=120°のみ'},'sinA=√3/2から鈍角だけ採用','鋭角60°を落とす',90);
    wrong('area_height_confusion',{values:[30],label:'A=30°のみ'},'S=bc cosA/2, cosA=√3/2','高さをcosで表した別の式を解く',95);
  }else{
    scene.structureSignature='SSA_RAY_CIRCLE_EXISTENCE';scene.target='ssa';
    const A=index===10?120:30,a=index===9?s:index===10?2*r3*s:r2*s,b=index===9?4*s:2*s;
    scene.ssa={A,a,b};scene.coordinates=enumerateSSA(A,a,b);scene.solutionCount=scene.coordinates.length;known('A',A);known('a',a,index===9?String(s):index===10?root(2*s,3):root(s,2));known('b',b);
    req.push('opposite_pair','sine_relation','triangle_existence');
    if(index!==9)req.push('ambiguous_ssa','supplementary_angle','preserve_angle_sum');
    prompt=`${prefix}A=${A}°、a=${scene.knownValues.a!.label} cm、b=${b} cm。この条件を満たす三角形の個数と、存在する場合の角Bをすべて求めよ。`;
    const angles=solveSSA(A,a,b);answer=ssaAnswer(angles,index===9?'三角形は存在しない（0個）':index===10?'1個。B=30°':'2個。B=45°、135°');
    thinking='aとAを基準にしてsinBを求めます。sinBの値だけで終わらず、補角の候補と内角和を確かめて三角形の個数を決めます。';scene.solutionRoute=['sinB=b sinA/a','B=β or 180°−β','0°<B and A+B<180°'];
    working=index===9?['sinB=b sinA/a=2となります。sinの値は1を超えないので、この条件の三角形は作れません。','幾何的にも、Cから半直線ABまでの最短距離はaより長く、BC=aを満たす点Bがありません。したがって0個です。']:index===10?['sinB=b sinA/a=1/2なのでB=30°または150°。','A=120°に対し、B=30°ならC=30°で成立します。B=150°では内角和が180°を超えるため除外します。残るのは1個です。']:['sinB=b sinA/a=√2/2なのでB=45°または135°。','A=30°より、残りの角Cは105°または15°です。どちらも正で元の二辺と角Aを満たすため、異なる三角形が2個あります。'];
    if(index===9){
      wrong('sine_ratio_reversal',ssaAnswer([30]),'sinB=a/(b sinA)=1/2; 内角和で150°を除外','比の逆転によって存在すると思う',90);
      wrong('ssa_invalid_second_solution',ssaAnswer([30,150]),'sinB=a/(b sinA)=1/2; A+B=180°も採用','比の逆転に加えて退化する補角も除外しない',80);
      wrong('triangle_existence',ssaAnswer([90]),'sinB=2を上限1に置き換え、B=90°とする','成立しない値を勝手に境界へ置き換える',100);
    }else if(index===10){
      wrong('ssa_invalid_second_solution',ssaAnswer([30,150]),'sinB=1/2の二候補を内角和の確認なしで採用','鈍角Aでは補角候補が成立しない',100);
      wrong('ssa_invalid_second_solution',ssaAnswer([150]),'B=180°−30°だけを採用','内角和を超える方だけを選ぶ',90);
      wrong('triangle_existence',ssaAnswer([]),'Aが鈍角なので三角形は作れないと判断','鈍角三角形の存在を否定する',80);
    }else{
      wrong('ssa_second_solution_missing',ssaAnswer([45]),'sinB=√2/2の鋭角解だけ採用','SSAの第2候補が実際に成立する',100);
      wrong('ssa_second_solution_missing',ssaAnswer([135]),'sinB=√2/2の鈍角解だけ採用','もう一つの成立候補を落とす',90);
      wrong('opposite_pair_mismatch',ssaAnswer([]),'sinB=b cosA/a=√(3/2)>1','sinAをcosAに置き換えて不成立と判断',85);
    }
  }
  const chosen:GeneralCandidate[]=[];
  for(const c of candidates){if(scene.target==='ssa'&&c.mistakeHypotheses.type.startsWith('ssa_'))c.diagnosticScore+=10;if(scene.circumcircle&&c.mistakeHypotheses.type==='circumradius_factor')c.diagnosticScore+=10;if(scene.knownValues.area&&c.mistakeHypotheses.type==='area_half_factor')c.diagnosticScore+=5;}
  for(const c of [...candidates].sort((a,b)=>b.diagnosticScore-a.diagnosticScore||a.id.localeCompare(b.id,'en'))){
    if(sameGeneralAnswer(c.answer,answer))c.exclusionReason='正答と同値';
    else if(chosen.some(x=>sameGeneralAnswer(x.answer,c.answer)))c.exclusionReason='より高得点の誤答と同値';
    else if(chosen.length===3)c.exclusionReason='この図形での診断価値が上位3候補より低い';
    else{c.selected=true;chosen.push(c);}
  }
  if(chosen.length!==3)throw new Error('意味ある誤答3つを確保できず不採用');
  const variantId=`${generalFamilyId}-v${String(index+1).padStart(2,'0')}`;
  return {familyId:generalFamilyId,variantId,structureSignature:scene.structureSignature,scale:s,difficulty:index<3?'STANDARD':index<8?'APPLIED':'PRACTICAL',prompt,thinking,working,scene,answer,
    problemRequirements:[...new Set(req)].map(id=>({id,description:requirementMap[id][0],crossSkills:requirementMap[id][1]})),candidates,
    choices:[{choiceId:`${variantId}:correct`,answer,correct:true,mistakeHypotheses:null},...chosen.map(c=>({choiceId:`${variantId}:${c.id}`,answer:c.answer,correct:false,mistakeHypotheses:c.mistakeHypotheses}))]};
}
export function validateGeneral(v:GeneralVariant){
  const oracle=generalOracle(v.scene);if(!sameGeneralAnswer(oracle,v.answer))throw new Error(`${v.variantId}: 正答と独立oracle不一致`);
  const coords=v.scene.ssa?enumerateSSA(v.scene.ssa.A,v.scene.ssa.a,v.scene.ssa.b):v.scene.coordinates;
  if(coords.length!==v.scene.solutionCount)throw new Error('解数不一致');
  for(const t of coords){const g=inspectTriangle(t);if(!near(g.A+g.B+g.C,180))throw new Error('内角和');
    for(const [name,x] of Object.entries(v.scene.knownValues) as [Given,ExactValue][])if(!near(g[name],x.value))throw new Error(`図・与条件不一致 ${name}`);
    for(const p of Object.values(t))if(!near(Math.hypot(p[0]-g.center[0],p[1]-g.center[1]),g.R))throw new Error('外接円');
  }
  if(v.choices.length!==4||v.choices.filter(c=>c.correct).length!==1)throw new Error('4択構成');
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(sameGeneralAnswer(v.choices[i].answer,v.choices[j].answer))throw new Error('4択同値');
  for(const c of v.candidates)if(!c.answer.values.every(Number.isFinite)||!c.model||!c.reason||(!c.selected&&!c.exclusionReason))throw new Error('誤答モデル不足');
  return {variantId:v.variantId,matched:true,oracle,triangles:coords.map(t=>({coordinates:t,...inspectTriangle(t)}))};
}
export const generalVariants=Array.from({length:12},(_,i)=>generateGeneralVariant(i));
export const generalAudit=generalVariants.map(validateGeneral);
