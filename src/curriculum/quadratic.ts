import {curriculum as previous} from './master.ts';
import type {Curriculum,StablePolicy,GraphSpec,ReviewedLesson} from './types.ts';
export type {StablePolicy,GraphSpec,ReviewedLesson} from './types.ts';
import type {Problem} from '../services/catalog.ts';
import {validateCurriculum} from './validate.ts';

export const steps=[
 {number:1,title:'平方完成 → グラフ',skills:['QF-GRAPH','QF-FORM']},
 {number:2,title:'最大・最小 ＋ 定義域',skills:['QF-RANGE']},
 {number:3,title:'共有点 → 方程式 → 判別式',skills:['QF-DIFFERENCE','QF-COUNT']},
 {number:4,title:'パラメータ ＋ 場合分け',skills:['QF-PARAM','QF-SIGN']},
 {number:5,title:'総合・方法指定なし',skills:['QF-INTEGRATE']}
];
const seeds:[string,string,string[],number,number][]=[
 ['QF-GRAPH','形と平行移動',['QEQ2'],2,2],
 ['QF-FORM','位置が読める形への変換',['QF-GRAPH'],3,3],
 ['QF-RANGE','区間の候補点と値域',['QF-FORM'],3,3],
 ['QF-DIFFERENCE','共有点を差へ変換',['QF-RANGE'],2,2],
 ['QF-COUNT','実数解の個数と接触',['QF-DIFFERENCE'],3,3],
 ['QF-PARAM','変化する軸と境界',['QF-COUNT'],3,3],
 ['QF-SIGN','符号と解の配置',['QF-PARAM','HSX2'],3,3],
 ['QF-INTEGRATE','条件を数学にして検証',['QF-SIGN'],3,3]
];
export const stablePolicies:Record<string,StablePolicy>=Object.fromEntries(seeds.map(([id,,,minimum,situations])=>[id,{minimum,situations,dimensions:['method','conditions','calculation','conclusion']}]));
stablePolicies['QF-FORM'].requiredSituationGroups=[['positive','fraction'],['negative','negative-fraction']];
stablePolicies['QF-RANGE'].requiredSituationGroups=[['vertex-inside','vertex-boundary','down-tied'],['vertex-outside'],['down-tied']];
stablePolicies['QF-COUNT'].requiredSituationGroups=[['two','two-independent'],['touch'],['none']];
const checklist=['一意性','正答','途中式','定義域','絶対値','±','境界値','等号','網羅','重複','不適解','前提','測定技能','難易度（暫定）','根拠の説明'];
export const lessons:ReviewedLesson[]=[];
function add(skill:string,n:number,situation:string,prompt:string,answer:string,solution:string,graph?:GraphSpec){
 const step=steps.find(s=>s.skills.includes(skill))?.number??0;
 const prior=seeds.find(s=>s[0]===skill)?.[2][0]??null;
 const id=`${skill}-V1-${n}`;
 lessons.push({problem:{id,skillId:skill,topic:step===5?'総合':seeds.find(s=>s[0]===skill)?.[1]??'前提の修復',purpose:'practice',difficulty:step>=4?3:2,prompt,answer,solution,examAnswer:solution+"\n結論："+answer,point:'条件を保持して表現を変え、得た結論を元の問題で確かめる。',transfer:'式・グラフ・方程式・不等式を往復して既知の問題へ変換する。',repairSkillId:prior,independenceKey:id},step,situation,roles:step===5?['integration','repair']:['basic','repair'],...(graph?{graph}:{}),review:{status:'reviewed',method:'問題文から独立導出し、展開・代入・端点・境界と別表現で照合。docs/education-design/quadratic-audit.md参照。',checks:[...checklist]}});
}
const graph=(a:number,b:number,c:number,l=-4,r=4):GraphSpec=>({curves:[[a,b,c]],domain:[l,r],view:[l-1,r+1,-10,12],features:['軸','頂点','定義域','端点','上下関係']});
add('QF-GRAPH',1,'up-wide','y=(x−2)²/2−1 の開く向き、軸、頂点を示し、y=x²/2からの移動を説明せよ。','上に開く。軸x=2、頂点(2,−1)。右2、下1。','平方は0以上なので最小はx=2のとき−1。y=x²/2の入力をx−2に変え、出力を1下げた。係数1/2なのでy=x²より開きが広い。',graph(.5,-2,1));
add('QF-GRAPH',2,'down-narrow','y=−2(x+1)²+3 の開く向き、軸、頂点を示し、y=−2x²からの移動を説明せよ。','下に開く。軸x=−1、頂点(−1,3)。左1、上3。','−2(x+1)²は0以下。最大はx=−1で3。入力x+1は左1への移動、+3は上3。絶対値2なのでy=−x²より狭い。',graph(-2,-4,1));
add('QF-GRAPH',3,'reverse','軸がx=3、頂点の高さが−2で、y=2x²と同じ開き方の放物線の式を求めよ。','y=2(x−3)²−2','軸からの横のずれをx−3で表す。基本形の係数2を保ち、最小値を−2にする。x=3で−2となり左右の同距離で同じ高さ。',graph(2,-12,16,0,6));
add('QF-FORM',1,'positive','y=x²−6x+5 のグラフの位置が分かる形に直し、軸・頂点とx軸との共有点を示せ。','y=(x−3)²−4。軸x=3、頂点(3,−4)、共有点(1,0),(5,0)。','x²−6x=(x−3)²−9だから定数を合わせて−4。高さ0では(x−3)²=4、x=3±2。展開し元式を再現する。',graph(1,-6,5,0,6));
add('QF-FORM',2,'negative','y=−2x²−8x−5 の概形を説明するために軸と頂点を求めよ。','y=−2(x+2)²+3、軸x=−2、頂点(−2,3)、下に開く。','−2(x²+4x)−5=−2{(x+2)²−4}−5=−2(x+2)²+3。括弧内の−4にも−2を掛ける。x=−2で最大3。',graph(-2,-8,-5,-5,1));
add('QF-FORM',3,'fraction','y=3x²−3x+2 の最も低い位置と、そのときのxを求め、概形を説明せよ。','y=3(x−1/2)²+5/4。頂点(1/2,5/4)、上に開く。','3{(x−1/2)²−1/4}+2=3(x−1/2)²+5/4。平方が0以上なので最小5/4。展開時の定数3/4+5/4=2を検算する。',graph(3,-3,2,-2,3));
add('QF-FORM',4,'negative-fraction','y=−x²/2+3x−2の最も高い位置と、そのときのxを求めよ。','y=−(x−3)²/2+5/2。頂点(3,5/2)、下に開く。','−(x²−6x)/2−2=−{(x−3)²−9}/2−2=−(x−3)²/2+5/2。定数−9/2+5/2=−2を展開で検算。');
add('QF-RANGE',1,'vertex-inside','f(x)=x²−4x+1、0≦x≦3。値域と最大・最小をとるxを、候補点を示して求めよ。','−3≦f(x)≦1。最小−3(x=2)、最大1(x=0)。','f=(x−2)²−3。頂点2は区間内。端点f(0)=1,f(3)=−2と頂点−3を比較する。頂点だけでは最大は決まらない。',graph(1,-4,1,0,3));
add('QF-RANGE',2,'vertex-outside','f(x)=(x−4)²+1、0≦x≦2。値域と最大・最小をとるxを求めよ。','5≦f(x)≦17。最小5(x=2)、最大17(x=0)。','軸4は区間外。区間内では軸へ近づくにつれて平方が減る。端点で17と5。頂点の高さ1を値域に含めない。',graph(1,-8,17,0,2));
add('QF-RANGE',3,'down-tied','f(x)=−(x−1)²+4、−1≦x≦3。値域と最大・最小をとるすべてのxを求めよ。','0≦f(x)≦4。最大4(x=1)、最小0(x=−1,3)。','下に開き、頂点1は区間内。両端は軸から距離2でともに0。両方の等号成立点を記す。',graph(-1,2,3,-1,3));
add('QF-RANGE',4,'vertex-boundary','f(x)=2(x+1)²−3、−1≦x≦2の値域と最大・最小をとるxを求めよ。','−3≦f(x)≦15。最小−3(x=−1)、最大15(x=2)。','軸は左端−1と一致。区間では軸から遠ざかり増加。f(−1)=−3、f(2)=15。頂点を端点と二重に数えても値比較は同じだが等号成立点は一度だけ記す。',graph(2,4,-1,-1,2));
add('QF-DIFFERENCE',1,'line','y=x²とy=2x+3の共有点を求めよ。2つの高さの差とx軸の関係も説明せよ。','(−1,1),(3,9)','同じxで高さが等しいのでx²−2x−3=0。(x−3)(x+1)=0でx=−1,3。元の式に戻しy=1,9。差のグラフの零点は共有点のx座標であり、差のy=0は元の共有点の高さではない。',{curves:[[1,0,0],[0,2,3],[1,-2,-3]],domain:[-2,4],view:[-3,5,-5,18],features:['共有点','差のグラフ','x軸']});
add('QF-DIFFERENCE',2,'two-parabolas','y=x²+1とy=−x²+5の共有点を求めよ。差の式と、求めた点の確認を記せ。','(−√2,3),(√2,3)','差2x²−4=0からx²=2、x=±√2。どちらもy=3。両式への代入で3を得る。二つの放物線でも差を使える。',{curves:[[1,0,1],[-1,0,5],[2,0,-4]],domain:[-3,3],view:[-4,4,-6,10],features:['共有点','差のグラフ']});
add('QF-DIFFERENCE',3,'linear-difference','y=x²+xとy=x²−x+4の共有点を求めよ。差の次数に注意せよ。','(2,6)','差は2x−4。二次項が消えるため二次方程式ではない。2x−4=0からx=2、両式の高さ6。次数を確認せず判別式を使わない。');
add('QF-COUNT',1,'two','y=x²−2xとy=2は何点で共有するか。実際の座標を求めず理由を示せ。','2点','差x²−2x−2=(x−1)²−3。0になるには平方が3になればよく、正負2通り。D=4+8=12>0とも照合できる。');
add('QF-COUNT',2,'touch','y=2x²−4x+3とy=1の共有点の個数と接点を求めよ。','1点で接する。(1,1)','差2(x−1)²=0なのでx=1の重解。差の符号は前後で非負のまま。D=16−16=0。元の高さは1。');
add('QF-COUNT',3,'none','y=x²+2x+3とx軸の共有点の個数を根拠付きで示せ。','0点','(x+1)²+2は実数xで正なので0にならない。D=4−12=−8<0。平方を負にできないことと同じ条件である。');
add('QF-COUNT',4,'two-independent','y=−x²+2x+2とy=1の共有点の個数を根拠付きで示せ。','2点','差−x²+2x+1=2−(x−1)²は0となるには平方が2。x=1±√2の2つがある。二次係数が負でもD=4+4=8>0は2根を意味する。');
add('QF-PARAM',1,'moving-min','aは実数。f(x)=(x−a)²、0≦x≦2の最小値と、それをとるxをaで表せ。','a<0:最小a²(x=0)。0≦a≦2:最小0(x=a)。a>2:最小(2−a)²(x=2)。','軸aが左、区間内、右で最も近い点が変わる。境界0,2を中の区分にだけ含め、漏れ重複をなくす。境界で隣式も0となり連続。');
add('QF-PARAM',2,'moving-max','aは実数。f(x)=(x−a)²、0≦x≦2の最大値と、それをとるすべてのxを求めよ。','a<1:(2−a)²(x=2)。a=1:1(x=0,2)。a>1:a²(x=0)。','最大は遠い端点。f(2)−f(0)=4−4aの符号で比較する。境界は軸が区間端に来る0,2ではなく中点1。等しいとき両端を記す。');
add('QF-PARAM',3,'moving-intersections','aは実数。y=x²とy=2ax−aの共有点の個数をaで表し、接するときの点も求めよ。','a<0またはa>1:2点。a=0,1:1点。0<a<1:0点。接点はa=0で(0,0)、a=1で(1,1)。','差x²−2ax+a。D=4a(a−1)。零となる0,1を境界に符号を調べる。接するときx=aを元式へ代入する。根数と座標を区別する。');
add('QF-PARAM',4,'down-moving','aは実数。f(x)=−(x−a)²+2、−1≦x≦1の最大値と、それをとるxを求めよ。','a<−1:2−(a+1)²(x=−1)。−1≦a≦1:2(x=a)。a>1:2−(a−1)²(x=1)。','下に開くので最大は軸に最も近い点。左、区間内、右で分け、境界−1,1は内部の区分に一度だけ含める。');
add('QF-SIGN',1,'bounded-inequality','−2≦x<3の範囲で、x²−x−2≧0を解け。','−2≦x≦−1、または2≦x<3','(x−2)(x+1)は根−1,2の外側で非負。全実数での解と指定区間の共通部分をとる。根は含み、3は含まない。',graph(1,-1,-2,-2,3));
add('QF-SIGN',2,'all-interval','aは実数。区間a≦x≦a+1のすべてのxでx²−5x+6≦0となるaを求めよ。','a=2','(x−2)(x−3)≦0は[2,3]。区間全体が含まれる条件はa≧2かつa+1≦3。両方を満たすのは2だけ。端点を含むので等号は可。');
add('QF-SIGN',3,'two-roots-location','y=x²−4x+3とy=kが異なる2点で交わり、そのx座標がともに0≦x≦4となるkを求めよ。','−1<k≦3','(x−2)²=k+1。異なる2実根にはk+1>0。両根2±√(k+1)が[0,4]内には√(k+1)≦2。合わせて−1<k≦3。D>0だけでは区間条件が足りない。');
add('QF-INTEGRATE',1,'area','長さ12mの柵で長方形の三辺を囲み、残る一辺は壁を利用する。壁に垂直な辺をx mとする。幅は1m以上4m以下に制限する。(1)面積をxで表せ。(2)面積の最大値。(3)面積16m²以上となるxを求めよ。','S=x(12−2x),1≦x≦4。最大18m²(x=3)。2≦x≦4。','残る辺12−2xは区間全体で正。S=−2(x−3)²+18。頂点3が区間内なので最大18。S≧16は(x−3)²≦1、2≦x≦4。元の長さ条件と照合する。');
add('QF-INTEGRATE',2,'height','球の高さをh(t)=−t²+4t+1 mとする。観測は0≦t≦4秒。(1)最高の高さと時刻。(2)高さ4m以上の時刻。(3)高さk mになる時刻が異なる2つ観測されるkの範囲を求めよ。','最高5m(t=2)。1≦t≦3。1≦k<5。','h=5−(t−2)²。高さ4以上は平方≦1。h=kの2時刻は2±√(5−k)。異なるにはk<5、両方[0,4]内には√(5−k)≦2、k≧1。k=1の両端は可、k=5の重複は不可。');
add('QF-INTEGRATE',3,'moving-window','aは実数。f(x)=x²−2xについて、(1)a≦x≦a+2での最小値をaで表せ。(2)同区間のすべてのxでf(x)≦3となるaを求めよ。','a<−1:(a+1)²−1。−1≦a≦1:−1。a>1:(a−1)²−1。(2)−1≦a≦1。','f=(x−1)²−1。軸1が区間の右、内部、左になる境界はa=−1,1。(2)f≦3は−1≦x≦3だから[a,a+2]⊂[−1,3]、a≧−1かつa+2≦3。存在条件との混同に注意。');
// A small reviewed prerequisite repair pool; this does not review the rest of HSX.
add('HSX2',1,'factor-product','x²−5x+6を因数分解し、展開して検算せよ。','(x−2)(x−3)','積が6、和が−5となる−2,−3を選ぶ。展開はx²−(2+3)x+6。');
add('HSX2',2,'factor-difference','2x²−8を因数分解し、展開して検算せよ。','2(x−2)(x+2)','共通因数2を取り、x²−4=(x−2)(x+2)。展開して2x²−8。');
for(const lesson of lessons.filter(l=>l.step===0))lesson.roles=['repair'];
const introductions:Record<number,[string,string,string]>={
 1:['y=x²/2の図から、横と縦の移動を自分で説明してみよう。試行は約2分でよい。','座標を一つずつ計算せず、形を保つ移動として位置を読みたい。','y=ax²はa>0で上、a<0で下に開き、|a|が大きいと狭い。y=a(x−p)²+qは基本形を右p、上qに移した形。'],
 2:['頂点だけで最大値も決まるか。指定区間だけを図に残して約2分試そう。','使えるxが限られるので頂点が使えないことがある。','区間内の頂点と端点を候補にし、向きと距離から値を比較する。'],
 3:['2つの高さが一致する場所を、既知の方程式にできないか約2分考えよう。','図だけでは正確な交点が決まらない。','f=g⇔f−g=0。2つのグラフの共有点を、差のグラフとx軸の共有点へ変換する。差の零点xを元の関数へ戻して高さを求める。'],
 4:['aを−1,1,3として試し、答え方が変わる理由を約2分考えよう。','軸が動くと最も近い点、遠い点が変わり一つに決められない。','答えが変わる境界を方程式で決め、全範囲を漏れ・重複なく並べる。等号と存在条件も確認する。']
};
for(const s of steps.filter(s=>s.number<5)){
 const l=lessons.find(l=>l.problem.skillId===s.skills[0])!;
 const [trial,need,tool]=introductions[s.number];
 l.roles.push('introduction');l.introduction={trial,need,tool,returnToProblem:'元の問題で、図と式を対応させて答案を完成しよう。'};
}
const countIntro=lessons.find(l=>l.problem.id==='QF-COUNT-V1-1')!;
countIntro.roles.push('introduction');
countIntro.introduction={trial:'個数だけ知りたいとき、毎回解を全て求める必要があるか約2分考えよう。',need:'差を0とする方程式は分かった。次は根の個数だけを効率よく知りたい。',tool:'Ax²+Bx+C=0（A≠0）を平方完成し4A倍すると(2Ax+B)²=B²−4AC。D=B²−4ACの正/零/負が平方の2/1/0通りに対応する。次数が落ちる場合は先に別扱いする。',returnToProblem:'元の共有点の問いに戻り、差の実数解の個数を説明しよう。'};
const formIntro=lessons.find(l=>l.problem.id==='QF-FORM-V1-1')!;
formIntro.roles.push('introduction');formIntro.introduction={trial:'一般形のままグラフの位置を読む方法を、既知の式や図で約2分試そう。',need:'この形では軸と頂点が読みづらい。移動した基本形へ変えたい。',tool:'x²−6xに9を補えば(x−3)²。加えた9を引いて等しさを保つ。平方完成はグラフが読める形へ変換する道具である。',returnToProblem:'元の式を頂点形式に変え、位置とx軸との共有点を説明しよう。'};
lessons.find(l=>l.problem.id==='QF-COUNT-V1-2')!.graph={curves:[[2,-4,3],[0,0,1],[2,-4,2]],domain:[-1,3],view:[-2,4,-2,10],features:['接する','重解','上下関係']};
lessons.find(l=>l.problem.id==='QF-PARAM-V1-1')!.graph={...graph(1,-2,1,0,2),restricted:true,note:'a=1の例だけを示す図です。a<0、a>2など他の位置も自分で描き、全場合を検討してください。'};
for(const l of lessons)if(l.graph){if(l.problem.skillId==='QF-RANGE'||l.problem.skillId==='QF-SIGN')l.graph.restricted=true;if(!l.graph.restricted)l.graph.features=l.graph.features.filter(f=>!['定義域','端点'].includes(f));}
const maxRows:[string,string,string][]=[
 ['aは実数、f(x)=(x−a)²−1、0≦x≦2。(1)最小値と最大値をaで表せ。(2)f(x)=0の区間内の異なる解の個数をaで表せ。(3)区間のすべてのxでf(x)≧0となるaを求めよ。',
 '最小:a<0でa²−1、0≦a≦2で−1、a>2で(2−a)²−1。最大:a<1で(2−a)²−1、a=1で0、a>1でa²−1。解数:a<−1またはa>3で0、−1≦a<1または1<a≦3で1、a=1で2。全非負:a≦−1またはa≧3。',
 '軸aから最も近い点で最小、最も遠い端点で最大。端点差は4−4a。根a−1は1≦a≦3で入り、根a+1は−1≦a≦1で入る。a=1では別々の根0,2がともに入る。全非負は最小値≧0から、左側a≦−1、右側a≧3。'],
 ['放物線y=x²−4x+3と直線y=k。(1)異なる2共有点の存在条件。(2)両共有点のx座標が0≦x≦4となる条件。(3)−1<k≦3のもとで、a≦x≦a+1のすべてのxについてx²−4x+3≦kとなる(a,k)の条件を求めよ。',
 '(1)k>−1。(2)−1<k≦3。(3)−3/4≦k≦3、2−√(k+1)≦a≦1+√(k+1)。',
 '(x−2)²=k+1から根2±√(k+1)。重解除外と端点条件を別々に確認。(3)r=√(k+1)>0とすると不等式の解は[2−r,2+r]。長さ1の区間が入るにはa≧2−r、a+1≦2+r。aが存在するには2r≧1なのでk≧−3/4。等号ではa=3/2のみ。'],
 ['工場の生産数xを連続量として0≦x≦6で扱う。費用はC(x)=x²+4、売上はR(x)=px、pは正の実数。(1)利益の最大値と生産数をpで表せ。(2)損益が0になる生産数が異なる2つ許容範囲内にあるpを求めよ。(3)そのpのもとで、利益が0以上となる全生産数を求めよ。',
 '(1)0<p≦12:最大p²/4−4(x=p/2)、p>12:最大6p−40(x=6)。(2)4<p≦20/3。(3)(p−√(p²−16))/2≦x≦(p+√(p²−16))/2。',
 '利益−x²+px−4=−(x−p/2)²+p²/4−4。軸が6を超える境界p=12。(2)x²−px+4=0はp>4で正の異なる2根。大きい根≦6は√(p²−16)≦12−p。右辺非負を確認して二乗するとp≦20/3。小さい根も正。p=4は重解のため除外。(3)上に開く費用−売上の符号から2根の間。元の[0,6]に含まれることは(2)で保証。']
];
maxRows.forEach(([prompt,answer,solution],i)=>{
 const id=`QF-MAX-V1-${i+1}`;
 lessons.push({problem:{id,skillId:'QF-INTEGRATE',topic:'実戦問題',purpose:'max',difficulty:4,prompt,answer,solution,examAnswer:solution+"\n結論："+answer,point:'方法を自分で選び、境界・存在条件・結論まで記述する。',transfer:'未知→既知→元の条件の検証。',repairSkillId:'QF-SIGN',independenceKey:`qf-v1-max-family-${i+1}`},step:5,situation:`max-${i+1}`,roles:['max','integration'],review:{status:'reviewed',method:'独立導出、平方完成と根公式/区間包含による別表現照合。監査書参照。',checks:[...checklist]}});
});

export const reviewedCurriculum:Curriculum=structuredClone(previous);
reviewedCurriculum.version='math-v0.6-qf-reviewed';
reviewedCurriculum.reviewedOnly=true;
reviewedCurriculum.retiredSkillIds=['QFN1','QFN2','QFN3'];
reviewedCurriculum.stablePolicies=stablePolicies;
reviewedCurriculum.lessonMetadata=lessons;
for(const p of reviewedCurriculum.problems)p.reviewStatus='unreviewed';
for(const g of reviewedCurriculum.problemGuides)g.reviewStatus='unreviewed';
for(const [id,name,prerequisites] of seeds){
 const cross=previous.master.crossSkills.map(s=>s.id);
 reviewedCurriculum.master.skills.push({id,unitId:'QFN',name,prerequisites,crossSkillIds:cross});
 reviewedCurriculum.skills.push({skillId:id,introduction:'need_driven',coverage:[name],phase:id==='QF-INTEGRATE'?'integration':'selection',crossSkillIds:cross});
}
for(const l of lessons){l.problem.reviewStatus='reviewed';reviewedCurriculum.problems.push(l.problem);reviewedCurriculum.problemGuides.push({problemId:l.problem.id,roles:l.roles,hideMethodLabel:l.step===5,reviewStatus:'reviewed'});}
reviewedCurriculum.units.find(u=>u.unitId==='QFN')!.coverage=steps.map(s=>`STEP ${s.number} ${s.title}`);
validateCurriculum(reviewedCurriculum);
