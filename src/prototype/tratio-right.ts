// A bounded, verification-only family. Geometry is built from exact-ratio
// coordinate templates; solution routes use trigonometry independently.
export const rightFamilyId = 'TR-RIGHT-MEASURE';
export const scalePool = [1, 2, 3, 4, 6] as const;
type XY = [number, number];
type Triple = [string, string, string];
export type Target = {kind:'distance'|'vertical'|'horizontal'; from:string; to:string}
  | {kind:'angle'; points:Triple} | {kind:'perimeter'; points:string[]};
export interface RightTriangleScene {
  points: Record<string, XY>;
  segments: {ends:[string,string]; auxiliary?:boolean}[];
  angles: {points:Triple; degrees:number; given:boolean}[];
  rightAngles: {points:Triple; auxiliary?:boolean}[];
  knownLengths: {ends:[string,string]; value:number; label:string}[];
  target: Target[];
  auxiliaryConstruction: {point:string; explanation:string}[];
  referenceTriangle: Triple[];
  solutionRoute: {angle:number; hypotenuse:[string,string]; opposite:[string,string]; adjacent:[string,string]; formula:string}[];
  structureSignature: string;
  circle?: {center:string; radius:number};
}
export type RequirementId = 'reference_angle'|'identify_hypotenuse'|'side_correspondence'|'select_ratio'|'find_hidden_right_triangle'|'auxiliary_perpendicular'|'combine_with_pythagoras'|'preserve_offset'|'common_height'|'verify_geometry'|'read_given_diagram';
const requirements:Record<RequirementId,{description:string;crossSkills:string[]}> = {
  reference_angle:{description:'どの角を基準にするか判断する',crossSkills:['X04']},
  identify_hypotenuse:{description:'直角の向かいの辺を見つける',crossSkills:['X08']},
  side_correspondence:{description:'基準角に対する辺の対応を読む',crossSkills:['X08']},
  select_ratio:{description:'既知量と未知量を結ぶ比を選ぶ',crossSkills:['X10','X11']},
  find_hidden_right_triangle:{description:'図形の中の直角三角形を見つける',crossSkills:['X11']},
  auxiliary_perpendicular:{description:'垂線を考えて計量できる形にする',crossSkills:['X08','X12']},
  combine_with_pythagoras:{description:'三平方とつないで残りの長さを求める',crossSkills:['X12']},
  preserve_offset:{description:'求めた高さを元の基準へ戻す',crossSkills:['X01','X04']},
  common_height:{description:'同じ高さを表す二つの関係をつなぐ',crossSkills:['X01','X12']},
  verify_geometry:{description:'得られた量を元の図形で確かめる',crossSkills:['X13']},
  read_given_diagram:{description:'問題図に与えられた辺と角を読み取る',crossSkills:['X09']},
};
const hypotheses = {
  sin_cos_swap:['基準角に対するsinとcosの辺対応を取り違えた可能性','X08'],
  tan_reciprocal:['高さと水平距離の比を逆にした可能性','X08'],
  hypotenuse_identification:['斜辺と直角辺を取り違えた可能性','X08'],
  reference_angle_confusion:['基準の角と別の角を取り違えた可能性','X04'],
  height_offset:['高さの基準を戻す際にオフセットを誤った可能性','X04'],
  triangle_selection:['別の三角形の辺を使った可能性','X11'],
  auxiliary_line:['垂線で分かれた長さの対応を誤った可能性','X08'],
  pythagoras_scope:['三平方を使う三角形や斜辺を誤った可能性','X12'],
  common_height:['同じ高さを表す二式で距離の関係を誤った可能性','X12'],
} as const;
type MistakeType = keyof typeof hypotheses;
export interface Candidate {
  type:MistakeType; values:number[]; text:string; formula:string;
  diagnosticScore:number; relevance:string; selected:boolean; exclusionReason:string|null;
  mistakeHypotheses:{type:MistakeType;description:string;crossSkills:string[];hypothesisOnly:true};
}
export interface RightVariant {
  familyId:typeof rightFamilyId; variantId:string; structureSignature:string;
  difficulty:'STANDARD'|'APPLIED'|'PRACTICAL'; scale:number; prompt:string;
  scene:RightTriangleScene; answer:string; values:number[]; units:string[];
  thinking:string; working:string[];
  problemRequirements:({id:RequirementId}&typeof requirements[RequirementId])[];
  candidates:Candidate[];
  choices:{choiceId:string;text:string;values:number[];correct:boolean;mistakeHypotheses:Candidate['mistakeHypotheses']|null}[];
}
const r3=Math.sqrt(3), r2=Math.sqrt(2), sn=(a:number)=>Math.sin(a*Math.PI/180), cs=(a:number)=>Math.cos(a*Math.PI/180), tn=(a:number)=>Math.tan(a*Math.PI/180);
const n=(x:number)=>String(Number(x.toFixed(6)));
const root=(factor:number,r:number)=>{const denominator=[1,2,3,6].find(d=>Math.abs(factor*d-Math.round(factor*d))<1e-8)??1;const numerator=Math.round(factor*denominator);return `${numerator===1?'':numerator}√${r}${denominator===1?'':'/'+denominator}`;};
const eq=(a:number[],b:number[])=>a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<1e-8*Math.max(1,Math.abs(x),Math.abs(b[i])));
export const equivalentRightAnswers=eq;
const length=(from:string,to:string):Target=>({kind:'distance',from,to});
const baseReq:RequirementId[]=['reference_angle','side_correspondence','select_ratio','verify_geometry'];

export function generateRightVariant(index:number, s:number=scalePool[index%scalePool.length]):RightVariant {
  if(!Number.isInteger(index)||index<0||index>=12||!scalePool.includes(s as typeof scalePool[number]))throw new Error('安全な12構造・指定scale poolに限定します');
  const scene:RightTriangleScene={points:{},segments:[],angles:[],rightAngles:[],knownLengths:[],target:[],auxiliaryConstruction:[],referenceTriangle:[],solutionRoute:[],structureSignature:''};
  let prompt='',answer='',thinking='',values:number[]=[],working:string[]=[],units=['m'];
  let req:RequirementId[]=[...baseReq];
  const candidates:Candidate[]=[];
  const wrong=(type:MistakeType,v:number[],text:string,formula:string,relevance:string,score=80)=>{
    const [description,crossSkill]=hypotheses[type];
    candidates.push({type,values:v,text,formula,relevance,diagnosticScore:score,selected:false,exclusionReason:null,mistakeHypotheses:{type,description,crossSkills:[crossSkill],hypothesisOnly:true}});
  };
  const points=(p:Record<string,XY>)=>{scene.points=p;};
  const edges=(...pairs:[string,string][])=>{scene.segments.push(...pairs.map(ends=>({ends})));};
  const known=(a:string,b:string,value:number,label:string)=>{scene.knownLengths.push({ends:[a,b],value,label});};
  const angle=(a:string,b:string,c:string,degrees:number,given=true)=>{scene.angles.push({points:[a,b,c],degrees,given});};
  const right=(a:string,b:string,c:string,auxiliary=false)=>{scene.rightAngles.push({points:[a,b,c],auxiliary});};
  const aux=(point:string,from:string,to:string,explanation:string)=>{scene.auxiliaryConstruction.push({point,explanation});scene.segments.push({ends:[from,to],auxiliary:true});};
  // vertex order: angle vertex, right-angle vertex, opposite vertex.
  const route=(a:string,h:string,b:string,theta:number,formula:string)=>{
    scene.referenceTriangle.push([a,h,b]);scene.solutionRoute.push({angle:theta,hypotenuse:[a,b],opposite:[h,b],adjacent:[a,h],formula});
  };
  if(index===0){
    scene.structureSignature='DIRECT_HYPOTENUSE_TO_COMPONENTS';
    points({A:[0,0],B:[r3*s,s],C:[r3*s,0]});edges(['A','B'],['B','C'],['C','A']);right('A','C','B');angle('C','A','B',30);known('A','B',2*s,n(2*s)+' m');
    scene.target=[length('B','C'),length('A','C')];units=['m','m'];
    prompt=`坂道ABの長さは${2*s} m、水平面との角は30°。Bから水平面に下ろした垂線の足をCとする。高さBCと水平距離ACを求めよ。`;
    values=[2*s*sn(30),2*s*cs(30)];answer=`BC=${s} m、AC=${root(s,3)} m`;
    thinking='坂道の長さが斜辺です。30°から見た高さと横の長さを、それぞれ斜辺に結びます。';
    route('A','C','B',30,'BC=AB sin30°, AC=AB cos30°');
    working=[`単位円の三角形を斜辺${2*s} mまで相似拡大すると、縦は${2*s}sin30°、横は${2*s}cos30°です。`,`BC=${s}、AC=${root(s,3)}。どちらも斜辺より短く、BC²+AC²=${(2*s)**2}になります。`];
    req.push('identify_hypotenuse');
    wrong('sin_cos_swap',[r3*s,s],`BC=${root(s,3)} m、AC=${s} m`,'BC=AB cos30°, AC=AB sin30°','高さと横の長さを両方求めるため、対応の逆転を検出できる',95);
    wrong('hypotenuse_identification',[2*s*tn(30),2*s],`BC=${root(2*s/3,3)} m、AC=${2*s} m`,'AC=AB, BC=AB tan30°','坂道を水平距離とみなした結果',90);
    wrong('hypotenuse_identification',[4*s,2*s/cs(30)],`BC=${4*s} m、AC=${root(4*s/3,3)} m`,'BC=AB/sin30°, AC=AB/cos30°','斜辺からの相似拡大を逆にした結果');
  }else if(index===1){
    scene.structureSignature='DIRECT_ADJACENT_TO_HEIGHT';
    points({A:[0,0],B:[r3*s,s],C:[r3*s,0]});edges(['A','B'],['B','C'],['C','A']);right('A','C','B');angle('C','A','B',30);known('A','C',r3*s,root(s,3)+' m');scene.target=[length('B','C')];
    prompt=`水平な地面上で塔の根元Cから${root(s,3)} m離れたAから、頂点Bを仰ぐ角は30°である。観測点の高さを0 mとして、塔の高さBCを求めよ。`;
    values=[r3*s*tn(30)];answer=`BC=${s} m`;thinking='高さと水平距離を結びたいので、同じ角から見た対辺と隣辺に注目します。';route('A','C','B',30,'BC=AC tan30°');
    working=[`単位円の三角形と相似なので、BC/AC=sin30°/cos30°=tan30°です。`,`BC=${root(s,3)}×(√3/3)=${s}。30°では高さは水平距離より短くなります。`];
    wrong('tan_reciprocal',[3*s],`BC=${3*s} m`,'BC=AC/tan30°','対辺と隣辺の比の逆転',95);
    wrong('hypotenuse_identification',[r3*s*sn(30)],`BC=${root(s/2,3)} m`,'BC=AC sin30°','地面の長さを斜辺とみなす',90);
    wrong('sin_cos_swap',[r3*s*cs(30)],`BC=${1.5*s} m`,'BC=AC cos30°','隣辺の長さにcosを掛けて高さとする');
  }else if(index===2){
    scene.structureSignature='FIND_HYPOTENUSE';
    points({A:[0,0],B:[r3*s,s],C:[r3*s,0]});edges(['A','B'],['B','C'],['C','A']);right('A','C','B');angle('C','A','B',30);known('B','C',s,n(s)+' m');scene.target=[length('A','B')];
    prompt=`はしごABを水平な地面と30°になるように立てた。先端Bの地面からの高さBCは${s} mである。はしごの長さABを求めよ。`;
    values=[s/sn(30)];answer=`AB=${2*s} m`;thinking='既知の高さは30°の向かい側にあり、求めるはしごが斜辺です。高さを斜辺に戻す関係を使います。';route('A','C','B',30,'AB=BC/sin30°');
    working=[`相似な単位円の三角形では縦の座標がsin30°です。BC=AB sin30°となるので、AB=${s}/sin30°。`,`AB=${2*s}。高さ${s} mより長く、元の高さもAB sin30°=${s} mと確認できます。`];req.push('identify_hypotenuse');
    wrong('sin_cos_swap',[s/cs(30)],`AB=${root(2*s/3,3)} m`,'AB=BC/cos30°','対辺を隣辺として扱う',95);
    wrong('hypotenuse_identification',[s*sn(30)],`AB=${s/2} m`,'AB=BC sin30°','高さを斜辺だとみなす',90);
    wrong('tan_reciprocal',[s/tn(30)],`AB=${root(s,3)} m`,'AB=BC/tan30°','水平距離を求めたところで斜辺と取り違える');
  }else if(index===3){
    scene.structureSignature='INVERSE_SIDE_TO_ANGLE';
    points({A:[0,0],B:[r3*s,s],C:[r3*s,0]});edges(['A','B'],['B','C'],['C','A']);right('A','C','B');known('A','B',2*s,n(2*s)+' m');known('B','C',s,n(s)+' m');scene.target=[{kind:'angle',points:['C','A','B']}];units=['°'];
    prompt=`はしごABの長さは${2*s} m、先端の高さBCは${s} m。CはBの真下にある。はしごと地面のなす鋭角∠BACを求めよ。`;
    values=[30];answer='∠BAC=30°';thinking='長さの比を単位円の座標に戻すと、どの角に対応するか判断できます。';route('A','C','B',30,'sinθ=BC/AB=1/2, 0<θ<90°');
    working=[`BC/AB=${s}/${2*s}=1/2。この三角形と相似な単位円の点は、縦の座標が1/2です。`,`0°<∠BAC<90°なので30°です。150°もsinが1/2ですが、直角三角形の鋭角にはなりません。`];req.push('identify_hypotenuse');
    wrong('reference_angle_confusion',[60],'∠BAC=60°','θ=90°−30°','上端の角と地面側の角を取り違える',95);
    wrong('reference_angle_confusion',[150],'∠BAC=150°','sinθ=1/2のもう一方の角を採用','鋭角という元条件を失う',90);
    wrong('triangle_selection',[45],'∠BAC=45°','AB−BC=BCから二つの直角辺が等しいと誤認','斜辺から高さを引いた長さを水平距離だと思う');
  }else if(index===4){
    scene.structureSignature='HIDDEN_ISOSCELES_ALTITUDE';
    points({B:[0,0],C:[2*r3*s,0],A:[r3*s,s],H:[r3*s,0]});edges(['A','B'],['A','C'],['B','C']);known('A','B',2*s,n(2*s)+' m');known('A','C',2*s,n(2*s)+' m');known('B','C',2*r3*s,root(2*s,3)+' m');angle('A','B','C',30);right('A','H','B',true);aux('H','A','H','AからBCへ垂線AHを下ろす');scene.target=[length('A','H')];
    prompt=`左右対称の屋根を表す二等辺三角形ABCで、AB=AC=${2*s} m、BC=${root(2*s,3)} m、∠ABC=30°。底辺BCから頂点Aまでの高さを求めよ。`;
    values=[2*s*sn(30)];answer=`高さ ${s} m`;thinking='頂点から底辺へ垂線を下ろすと、二つの合同な直角三角形ができます。底辺全体と半分を区別します。';route('B','H','A',30,'AH=AB sin30°');
    working=[`垂線の足をHとすると、BH=BC/2=${root(s,3)}。相似によりAH/AB=sin30°です。`,`AH=${2*s}×1/2=${s}。BH²+AH²=AB²も成立します。`];req.push('auxiliary_perpendicular','find_hidden_right_triangle');
    wrong('sin_cos_swap',[r3*s],`高さ ${root(s,3)} m`,'AH=AB cos30°','高さではなく底辺の半分を求める',90);
    wrong('auxiliary_line',[2*s],`高さ ${2*s} m`,'AH=BC tan30°','底辺全体を一つの直角三角形の隣辺にする',98);
    wrong('hypotenuse_identification',[2*s*tn(30)],`高さ ${root(2*s/3,3)} m`,'AH=AB tan30°','屋根の斜辺を水平距離とみなす');
    wrong('triangle_selection',[2*s],`高さ ${2*s} m`,'AH=AB','斜面の長さを高さとして答える',60);
  }else if(index===5){
    scene.structureSignature='EYE_HEIGHT_OFFSET';
    points({A:[0,0],E:[0,s/2],C:[r3*s,0],T:[r3*s,1.5*s],H:[r3*s,s/2]});edges(['A','C'],['C','T'],['A','E'],['E','T']);known('A','E',s/2,n(s/2)+' m');known('A','C',r3*s,root(s,3)+' m');angle('H','E','T',30);right('E','H','T',true);aux('H','E','H','目Eと同じ高さの水平線EHを引く');scene.target=[length('C','T')];
    prompt=`水平な地面で塔から${root(s,3)} m離れた位置に立ち、地上${s/2} mの目Eから頂点Tを仰ぐ角は30°だった。塔全体の高さCTを求めよ。`;
    values=[r3*s*tn(30)+s/2];answer=`CT=${1.5*s} m`;thinking='見上げる角から求められるのは、目より上の部分です。最後に地面から目までの高さを戻します。';route('E','H','T',30,'HT=EH tan30°, CT=HT+AE');
    working=[`Eから水平線EHを引くと、EH=${root(s,3)}。単位円の三角形との相似からHT=EH tan30°=${s}。`,`塔全体はCT=HT+CH=${s}+${s/2}=${1.5*s}。求めたのが目からの差ではなく地面からの高さであることを確認します。`];req.push('preserve_offset','auxiliary_perpendicular');
    wrong('height_offset',[s],`CT=${s} m`,'CT=EH tan30°','目の高さが0ではないため、加え忘れが答えを変える',100);
    wrong('height_offset',[2*s],`CT=${2*s} m`,'CT=EH tan30°+2AE','目の高さを二重に足す',95);
    wrong('tan_reciprocal',[3.5*s],`CT=${3.5*s} m`,'CT=EH/tan30°+AE','オフセットは戻すが、対辺と隣辺を逆にする',85);
    wrong('hypotenuse_identification',[r3*s*sn(30)+s/2],`CT=${s/2}+${root(s/2,3)} m`,'CT=EH sin30°+AE','水平距離を斜辺とみなす');
  }else if(index===6){
    scene.structureSignature='COMPLEMENTARY_REFERENCE_ANGLE';
    points({A:[0,0],B:[s,0],C:[s,r3*s],D:[0,r3*s]});edges(['A','B'],['B','C'],['C','D'],['D','A'],['A','C']);right('A','B','C');known('A','C',2*s,n(2*s)+' m');angle('D','A','C',30);scene.target=[length('A','B'),length('A','D')];units=['m','m'];
    prompt='図の長方形ABCDについて、横の長さABと縦の長さADを求めよ。対角線の長さと角は図に示してある。';
    values=[2*s*sn(30),2*s*cs(30)];answer=`AB=${s} m、AD=${root(s,3)} m`;thinking='示された30°は縦の辺と対角線の間です。横の辺との角に読み替えると60°になります。';route('C','B','A',30,'AB=AC sin30°, AD=AC cos30°');
    working=[`平行なADとBCを使うと、∠BCA=30°。この角ではABが対辺、BCが隣辺、ACが斜辺です。`,`相似よりAB=${2*s}sin30°=${s}、BC=${2*s}cos30°=${root(s,3)}。AD=BCで、縦の方が長い図とも一致します。`];req.push('read_given_diagram','find_hidden_right_triangle');
    wrong('reference_angle_confusion',[r3*s,s],`AB=${root(s,3)} m、AD=${s} m`,'∠BAC=30°としてAB=AC cos30°, AD=AC sin30°','表示された角が縦側にあるため基準角の違いが核心',100);
    wrong('hypotenuse_identification',[2*s*tn(30),2*s],`AB=${root(2*s/3,3)} m、AD=${2*s} m`,'AD=AC, AB=AD tan30°','対角線を縦の辺と取り違える',90);
    wrong('hypotenuse_identification',[4*s,2*s/cs(30)],`AB=${4*s} m、AD=${root(4*s/3,3)} m`,'AB=AC/sin30°, AD=AC/cos30°','対角線を既知の直角辺として拡大する');
    wrong('sin_cos_swap',[r3*s,s],`AB=${root(s,3)} m、AD=${s} m`,'AB=AC cos30°, AD=AC sin30°','基準角混同と同じ結論になる',90);
  }else if(index===7){
    scene.structureSignature='RAISED_PLATFORM_RAMP';
    points({O:[0,0],A:[0,s/2],B:[r3*s,1.5*s],C:[r3*s,0],H:[r3*s,s/2]});edges(['O','A'],['A','B'],['B','C'],['C','O']);known('O','A',s/2,n(s/2)+' m');known('A','B',2*s,n(2*s)+' m');angle('H','A','B',30);right('A','H','B',true);aux('H','A','H','Aを通る水平線AHを引く');scene.target=[length('O','C'),length('B','C')];units=['m','m'];
    prompt=`水平な地面から${s/2} m高い台の端Aから、長さ${2*s} mの坂道ABが水平面と30°で上がる。Bの真下をC、Aの真下をOとする。OCとBの地面からの高さBCを求めよ。`;
    values=[2*s*cs(30),2*s*sn(30)+s/2];answer=`OC=${root(s,3)} m、BC=${1.5*s} m`;thinking='坂道を横の長さと上昇分に分けます。台の高さは上昇分にだけ足し、横の長さには足しません。';route('A','H','B',30,'OC=AB cos30°, BC=AB sin30°+OA');
    working=[`Aを通る水平線とBCの交点をHとします。相似よりAH=${2*s}cos30°=${root(s,3)}、BH=${2*s}sin30°=${s}。`,`OC=AH、BC=BH+HCなので、横は${root(s,3)} m、高さは${1.5*s} m。台がなければ高さは${s} mとなることも確かめられます。`];req.push('preserve_offset','auxiliary_perpendicular','identify_hypotenuse');
    wrong('height_offset',[r3*s,s],`OC=${root(s,3)} m、BC=${s} m`,'OC=AB cos30°, BC=AB sin30°','台の高さを加え忘れる',100);
    wrong('sin_cos_swap',[s,r3*s+s/2],`OC=${s} m、BC=${root(s,3)}+${s/2} m`,'OC=AB sin30°, BC=AB cos30°+OA','水平成分と鉛直成分を交換する',95);
    wrong('height_offset',[r3*s,2*s],`OC=${root(s,3)} m、BC=${2*s} m`,'BC=AB sin30°+2OA','台の高さを二重に加える',90);
    wrong('hypotenuse_identification',[2*s,2*s*tn(30)+s/2],`OC=${2*s} m、BC=${root(2*s/3,3)}+${s/2} m`,'OC=AB, BC=AB tan30°+OA','坂道の長さを水平距離に置き換える');
  }else if(index===8){
    scene.structureSignature='TWO_OBSERVATION_COMMON_HEIGHT';
    points({A:[0,0],B:[2*r3*s,0],C:[3*r3*s,0],T:[3*r3*s,3*s]});edges(['A','C'],['C','T'],['A','T'],['B','T']);known('A','B',2*r3*s,root(2*s,3)+' m');angle('C','A','T',30);angle('C','B','T',60);right('B','C','T');scene.target=[length('C','T'),length('B','C')];units=['m','m'];
    prompt=`水平な一直線上にA、B、塔の根元Cがこの順にあり、AB=${root(2*s,3)} m。高さ0 mのA、Bから塔頂Tを仰ぐ角はそれぞれ30°、60°である。塔の高さCTと距離BCを求めよ。`;
    const gap=2*r3*s,x=gap*tn(30)/(tn(60)-tn(30)),h=x*tn(60);values=[h,x];answer=`CT=${3*s} m、BC=${root(s,3)} m`;
    thinking='二つの直角三角形は同じ塔の高さを共有しています。近い方の距離を未知数にすると、遠い方の距離も表せます。';route('B','C','T',60,'CT=BC tan60°');route('A','C','T',30,'CT=(AB+BC)tan30°');
    working=[`BC=xとおくとAC=x+${root(2*s,3)}。相似による二つの比から、x tan60°=(x+${root(2*s,3)})tan30°。`,`√3x=(x+${root(2*s,3)})/√3を解いてx=${root(s,3)}。CT=√3x=${3*s}。A側でもAC tan30°=${3*s}となります。`];req.push('common_height','find_hidden_right_triangle');
    const sumX=gap*tn(30)/(tn(60)+tn(30));
    wrong('common_height',[sumX*tn(60),sumX],`CT=${1.5*s} m、BC=${root(s/2,3)} m`,'x tan60°=(AB−x)tan30°','同じ側からの観測なのに、塔を二地点の間に置く',100);
    wrong('triangle_selection',[gap*tn(60),gap],`CT=${6*s} m、BC=${root(2*s,3)} m`,'BC=AB, CT=AB tan60°','地点間距離を塔までの距離とみなす',95);
    wrong('triangle_selection',[gap*tn(30),gap],`CT=${2*s} m、BC=${root(2*s,3)} m`,'BC=AB, CT=AB tan30°','地点間距離に遠い方の角を直接使う',90);
  }else if(index===9){
    scene.structureSignature='TRAPEZOID_ALTITUDE_PLUS_PYTHAGORAS';
    points({A:[0,0],B:[6*s,0],C:[4*s,2*r3*s],D:[2*s,2*r3*s],H:[2*s,0],K:[4*s,0]});edges(['A','B'],['B','C'],['C','D'],['D','A'],['A','C']);known('A','B',6*s,n(6*s)+' m');known('C','D',2*s,n(2*s)+' m');angle('B','A','D',60);right('A','H','D',true);right('A','K','C',true);aux('H','D','H','DからABへ垂線DHを下ろす');aux('K','C','K','CからABへ垂線CKを下ろす');scene.target=[length('A','C')];
    prompt=`AB∥DC、AD=BCの等脚台形ABCDで、AB=${6*s} m、DC=${2*s} m、∠DAB=60°。対角線ACの長さを求めよ。`;
    const inset=(6*s-2*s)/2,height=inset*tn(60);values=[Math.hypot(4*s,height)];answer=`AC=${root(2*s,7)} m`;thinking='左右の張り出しが等しいことから高さを求め、次に対角線を含む別の直角三角形を考えます。';route('A','H','D',60,'DH=((AB−DC)/2)tan60°, AC²=(AH+DC)²+DH²');
    working=[`DH⊥ABとするとAH=(AB−DC)/2=${2*s}。相似よりDH=AH tan60°=${root(2*s,3)}。`,`AからCの真下までの距離はAH+DC=${4*s}。三平方よりAC²=${4*s}²+(${root(2*s,3)})²=${28*s*s}、AC=${root(2*s,7)}。ACはこの二つの直角辺より長くなります。`];req.push('auxiliary_perpendicular','combine_with_pythagoras','find_hidden_right_triangle');
    wrong('auxiliary_line',[Math.hypot(4*s,4*s*tn(60))],`AC=${8*s} m`,'AH=AB−DC, DH=AH tan60°, AC²=((AB+DC)/2)²+DH²','左右へ分かれる底辺の差を半分にしない',100);
    wrong('triangle_selection',[Math.hypot(6*s,height)],`AC=${root(4*s,3)} m`,'AC²=AB²+DH²','対角線の水平成分に底辺全体を使う',95);
    wrong('pythagoras_scope',[Math.sqrt((4*s)**2-height**2)],`AC=${2*s} m`,'AC²=((AB+DC)/2)²−DH²','水平成分を斜辺とみなして引き算する',90);
  }else if(index===10){
    scene.structureSignature='CIRCLE_CHORD_AND_SAGITTA';
    points({O:[0,0],A:[-r3*s,s],B:[r3*s,s],H:[0,s],T:[0,2*s]});edges(['O','A'],['O','B'],['A','B']);scene.circle={center:'O',radius:2*s};known('O','A',2*s,n(2*s)+' m');angle('A','O','B',120);right('O','H','B',true);aux('H','O','T','Oから弦ABへ垂線を引き、円との交点をTとする');scene.target=[length('A','B'),length('H','T')];units=['m','m'];
    prompt=`半径${2*s} m、中心Oの円で∠AOB=120°。短い弧ABの中点をTとする。弦ABの長さと、Tから弦ABまでの最短距離を求めよ。`;
    values=[2*(2*s)*sn(60),2*s-2*s*cs(60)];answer=`AB=${root(2*s,3)} m、最短距離=${s} m`;thinking='中心から弦へ垂線を下ろすと、弦も中心角も半分になります。最短距離は半径から中心と弦の距離を引いた長さです。';route('O','H','B',60,'HB=OB sin60°, OH=OB cos60°, AB=2HB, HT=OT−OH');
    working=[`垂線の足をHとすると、∠HOB=60°。相似よりHB=${2*s}sin60°=${root(s,3)}、OH=${2*s}cos60°=${s}。`,`AB=2HB=${root(2*s,3)}、HT=OT−OH=${2*s}−${s}=${s}。Hが弦の中点で、HTが弦に垂直なことから最短距離になっています。`];req.push('auxiliary_perpendicular','find_hidden_right_triangle');
    wrong('reference_angle_confusion',[4*s*sn(120),2*s-2*s*cs(120)],`AB=${root(2*s,3)} m、最短距離=${3*s} m`,'HB=OB sin120°, OH=OB cos120°, HT=OT−OH','垂線後も元の中心角120°を使う',100);
    wrong('auxiliary_line',[r3*s,s],`AB=${root(s,3)} m、最短距離=${s} m`,'AB=HB, HT=OT−OH','半弦を弦全体として答える',95);
    wrong('sin_cos_swap',[2*s,2*s-r3*s],`AB=${2*s} m、最短距離=${2*s}−${root(s,3)} m`,'HB=OB cos60°, OH=OB sin60°','直角三角形の辺対応を逆にする',90);
  }else{
    scene.structureSignature='UNEQUAL_ROOF_COMMON_HEIGHT_AND_PERIMETER';
    points({B:[0,0],C:[(1+r3)*s,0],A:[s,r3*s],H:[s,0]});edges(['A','B'],['A','C'],['B','C']);known('B','C',(1+r3)*s,`${s}+${root(s,3)} m`);angle('A','B','C',60);angle('B','C','A',45);right('A','H','B',true);aux('H','A','H','AからBCへ垂線AHを下ろす');scene.target=[length('A','H'),{kind:'perimeter',points:['A','B','C']}];units=['m','m'];
    prompt=`三角形ABCでBC=${s}+${root(s,3)} m、∠ABC=60°、∠ACB=45°。BCを底辺とした高さと、三角形の周の長さを求めよ。`;
    const base=(1+r3)*s,h=base/(1/tn(60)+1/tn(45)),ab=h/sn(60),ac=h/sn(45);values=[h,base+ab+ac];answer=`高さ ${root(s,3)} m、周 ${3*s}+${root(s,3)}+${root(s,6)} m`;
    thinking='垂線の左右にできる二つの直角三角形は高さが同じです。底辺の二つの部分を高さで表して足し合わせます。';route('B','H','A',60,'BH=h/tan60°, AB=h/sin60°');route('C','H','A',45,'CH=h/tan45°, AC=h/sin45°, BH+CH=BC');
    working=[`高さをhとすると、相似よりBH=h/√3、CH=h。h/√3+h=${s}+${root(s,3)}からh=${root(s,3)}です。`,`AB=h/sin60°=${2*s}、AC=h/sin45°=${root(s,6)}。周はAB+AC+BC=${3*s}+${root(s,3)}+${root(s,6)}。BH+CHが元の底辺の長さに戻ることも確かめます。`];req.push('auxiliary_perpendicular','common_height','find_hidden_right_triangle');
    const badH=base/2*tn(60);
    wrong('auxiliary_line',[badH,base+badH/sn(60)+badH/sn(45)],`高さ ${1.5*s}+${root(s/2,3)} m、周 ${2*s}+${root(2*s,3)}+${root(1.5*s,2)}+${root(s/2,6)} m`,'BH=BC/2, h=BH tan60°, perimeter=BC+h/sin60°+h/sin45°','底角が異なるのに二等辺のように底辺を半分にする',100);
    wrong('triangle_selection',[base*tn(60),base+base*tn(60)/sn(60)+base*tn(60)/sn(45)],`高さ ${3*s}+${root(s,3)} m、周 ${3*s}+${root(3*s,3)}+${root(3*s,2)}+${root(s,6)} m`,'h=BC tan60°, perimeter=BC+h/sin60°+h/sin45°','底辺全体を左の直角三角形の隣辺とする',95);
    wrong('hypotenuse_identification',[h,base+h*sn(60)+h*sn(45)],`高さ ${root(s,3)} m、周 ${2.5*s}+${root(s,3)}+${root(s/2,6)} m`,'AB=h sin60°, AC=h sin45°, perimeter=BC+AB+AC','高さから斜辺を求めるとき、割らずに掛ける',90);
  }
  // Scores depend on the scene's actual features, never variant index/parity.
  for(const c of candidates){
    if(c.type==='height_offset'&&req.includes('preserve_offset'))c.diagnosticScore+=10;
    if(c.type==='auxiliary_line'&&scene.auxiliaryConstruction.length)c.diagnosticScore+=5;
    if(c.type==='common_height'&&scene.referenceTriangle.length>1)c.diagnosticScore+=10;
    if(c.type==='reference_angle_confusion'&&scene.angles.some(a=>a.degrees>90))c.diagnosticScore+=5;
  }
  const accepted:Candidate[]=[];
  for(const c of [...candidates].sort((a,b)=>b.diagnosticScore-a.diagnosticScore||a.type.localeCompare(b.type,'en'))){
    if(!c.values.every(Number.isFinite))c.exclusionReason='誤答モデルが有限の値を持たない';
    else if(eq(c.values,values))c.exclusionReason='正答と数学的に同値';
    else if(accepted.some(a=>eq(a.values,c.values)))c.exclusionReason='より優先度の高い誤答と数学的に同値';
    else if(accepted.length===3)c.exclusionReason='同値ではないが、この図形での上位3候補を優先';
    else {c.selected=true;accepted.push(c);}
  }
  if(accepted.length!==3)throw new Error('意味のある誤答3つを確保できず、候補として不適格');
  const variantId=`${rightFamilyId}-v${String(index+1).padStart(2,'0')}`;
  return {familyId:rightFamilyId,variantId,structureSignature:scene.structureSignature,difficulty:index<3?'STANDARD':index<8?'APPLIED':'PRACTICAL',scale:s,prompt,scene,answer,values,units,thinking,working,
    problemRequirements:[...new Set(req)].map(id=>({id,...requirements[id]})),candidates,
    choices:[{choiceId:`${variantId}:correct`,text:answer,values,correct:true,mistakeHypotheses:null},...accepted.map((c,i)=>({choiceId:`${variantId}:mistake:${c.type}:${i}`,text:c.text,values:c.values,correct:false,mistakeHypotheses:c.mistakeHypotheses}))]};
}

export function coordinateOracle(scene:RightTriangleScene):number[]{
  const p=(id:string)=>{const xy=scene.points[id];if(!xy)throw new Error(`存在しない点 ${id}`);return xy;};
  const dist=(a:string,b:string)=>Math.hypot(p(a)[0]-p(b)[0],p(a)[1]-p(b)[1]);
  return scene.target.map(t=>{
    if(t.kind==='angle'){const [a,b,c]=t.points,u=[p(a)[0]-p(b)[0],p(a)[1]-p(b)[1]],v=[p(c)[0]-p(b)[0],p(c)[1]-p(b)[1]];return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(dist(a,b)*dist(c,b)))))*180/Math.PI;}
    if(t.kind==='perimeter')return t.points.reduce((sum,a,i)=>sum+dist(a,t.points[(i+1)%t.points.length]),0);
    if(t.kind==='distance')return dist(t.from,t.to);
    return Math.abs(p(t.from)[t.kind==='vertical'?1:0]-p(t.to)[t.kind==='vertical'?1:0]);
  });
}
export function validateRightVariant(v:RightVariant){
  const s=v.scene, oracle=coordinateOracle(s);
  if(!eq(oracle,v.values))throw new Error(`${v.variantId}: 正答と独立座標oracleが不一致`);
  if(v.choices.length!==4||v.choices.filter(c=>c.correct).length!==1)throw new Error('4択構成が不正');
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(eq(v.choices[i].values,v.choices[j].values))throw new Error('4択が同値');
  if(!eq(v.choices.find(c=>c.correct)!.values,oracle))throw new Error('正答選択肢が不一致');
  if(v.units.length!==oracle.length||v.units.some(u=>!['m','°'].includes(u)))throw new Error('単位が不正');
  if(!Object.values(s.points).every(p=>p.every(Number.isFinite)))throw new Error('座標が不正');
  const distance=(a:string,b:string)=>coordinateOracle({...s,target:[length(a,b)]})[0];
  for(const seg of s.segments)if(distance(...seg.ends)<=0)throw new Error('線分が退化');
  for(const k of s.knownLengths)if(!eq([distance(...k.ends)],[k.value]))throw new Error('図の長さラベルが不一致');
  for(const a of [...s.angles,...s.rightAngles.map(r=>({...r,degrees:90}))])if(!eq(coordinateOracle({...s,target:[{kind:'angle',points:a.points}]}),[a.degrees]))throw new Error('図の角度・直角が不一致');
  for(const r of s.solutionRoute){
    const common=r.adjacent.find(id=>r.opposite.includes(id));
    const vertex=r.hypotenuse.find(id=>r.adjacent.includes(id));
    const tip=r.hypotenuse.find(id=>r.opposite.includes(id));
    if(!common||!vertex||!tip||!eq(coordinateOracle({...s,target:[{kind:'angle',points:[common,vertex,tip]}]}),[r.angle]))throw new Error('辺対応・基準角が不一致');
    if(!eq(coordinateOracle({...s,target:[{kind:'angle',points:[vertex,common,tip]}]}),[90]))throw new Error('参照三角形が直角でない');
  }
  if(s.circle)for(const id of ['A','B','T'])if(!eq([distance(s.circle.center,id)],[s.circle.radius]))throw new Error('円周上の点が不正');
  for(const c of v.candidates)if(!c.formula||!c.relevance||!c.mistakeHypotheses.description||(!c.selected&&!c.exclusionReason))throw new Error('誤答の根拠不足');
  return {variantId:v.variantId,oracle,matched:true,checks:['coordinates','lengths','angles','rightAngles','side-correspondence','answer','choices','circle','units']};
}
export const rightVariants=Array.from({length:12},(_,i)=>generateRightVariant(i));
export const rightAudit=rightVariants.map(validateRightVariant);
