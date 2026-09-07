import {lessons} from '../curriculum/quadratic.ts';
import type {Problem} from '../services/catalog.ts';
import {explanationGraph} from './explanation-graph.ts';
import type {ExplanationGraph,Polynomial} from './explanation-graph.ts';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const formula=([a,b,c]:Polynomial)=>[a?`${a===1?'':a===-1?'−':a}x²`:'',b?`${b>=0?'+':'−'}${Math.abs(b)===1?'':Math.abs(b)}x`:'',c?`${c>=0?'+':'−'}${Math.abs(c)}`:''].join('').replace(/^\+/,'')||'0';
function graph(title:string,polynomials:Polynomial[],view:ExplanationGraph['view'],caption:string,domain?:[number,number]):ExplanationGraph{return {title,curves:polynomials.map(p=>({formula:`y=${formula(p)}`,coefficients:p})),view,caption,...(domain?{domain}:{})};}
const thinking:Record<string,string>={
 'QF-GRAPH':'平方の中が0になるxに注目すると、頂点と軸が分かります。係数の符号と大きさから、開く向きと形を確かめましょう。',
 'QF-FORM':'グラフの位置を読み取れる形に直しましょう。平方完成した式から軸と頂点を読み、元の式に戻ることも確かめます。',
 'QF-RANGE':'まず、使えるxの範囲を確認します。その範囲にある頂点と両端の値を比べると、最大・最小が決まります。',
 'QF-DIFFERENCE':'共有点では、同じxに対する二つの高さが等しくなります。f(x)=g(x)をf(x)−g(x)=0に直し、求めたxを元の式に戻して高さを調べます。',
 'QF-COUNT':'二つの高さの差が0になるxはいくつあるでしょうか。差の式を平方の形で見るか、二次方程式なら判別式で実数解の個数を調べます。',
 'QF-PARAM':'文字の値が変わると、軸や端点の位置関係も変わります。答え方が変わる境界を見つけ、境界そのものも含めて考えましょう。',
 'QF-SIGN':'グラフが基準の線より上か下かを、求められた範囲と合わせて見ます。「解がある」と「すべてのxで成り立つ」を区別しましょう。',
 'QF-INTEGRATE':'何を求めるのか、どの条件を満たす必要があるのかを整理します。式やグラフで調べた結果が、元の条件にも合うことを確かめましょう。'
};
export const answerGraphs:Record<string,ExplanationGraph[]>={};
for(const l of lessons.filter(l=>l.step>0&&l.graph)){
 const g=l.graph!;answerGraphs[l.problem.id]=[graph('式とグラフを対応させる',g.curves,g.view,thinking[l.problem.skillId],g.restricted?g.domain:undefined)];
}
const set=(skill:string,n:number,...graphs:ExplanationGraph[])=>{answerGraphs[`${skill}-V1-${n}`]=graphs;};
set('QF-RANGE',1,graph('頂点と両端を比べる',[[1,-4,1]],[-.5,3.5,-4,2],'青い帯は0≦x≦3。頂点(2,−3)と両端(0,1),(3,−2)を比べると、最小−3、最大1です。',[0,3]));
set('QF-FORM',4,graph('頂点は最も高い位置',[[-.5,3,-2]],[-1,7,-6,4],'軸はx=3、頂点は(3,5/2)。平方の係数が負なので、頂点で最大になります。'));
set('QF-DIFFERENCE',3,graph('二次項が消える場合',[[1,1,0],[1,-1,4],[0,2,-4]],[-2,4,-6,20],'差は2x−4という一次式。差が0になるx=2で、二つの曲線の高さはともに6です。'));
set('QF-COUNT',1,graph('共有点は2つ',[[1,-2,0],[0,0,2],[1,-2,-2]],[-2,4,-4,7],'差のグラフはx軸を2回横切ります。差の頂点がx軸より下にあり、上に開くことに注目します。'));
set('QF-COUNT',2,graph('接するときは差が0に触れる',[[2,-4,3],[0,0,1],[2,-4,2]],[-1,3,-1,8],'接点は(1,1)。差のグラフは(1,0)でx軸に接し、前後で符号が変わりません。'));
set('QF-COUNT',3,graph('共有点がない場合',[[1,2,3]],[-4,2,-1,8],'最も低い頂点でも高さは2。グラフ全体がx軸より上にあるため、実数解はありません。'));
set('QF-COUNT',4,graph('下に開いても交点数を調べられる',[[-1,2,2],[0,0,1],[-1,2,1]],[-2,4,-5,5],'差は2−(x−1)²。平方が2になる左右2か所で、二つの高さが一致します。'));
for(const n of [1,2,4]){
 const down=n===4,domain:[number,number]=down?[-1,1]:[0,2];
 const samples=down?[-2,-1,0,1,2]:[-1,0,1,2,3];
 set('QF-PARAM',n,...samples.map(a=>graph(`a=${a}${domain.includes(a)?'（軸が端点に一致）':a===1&&n===2?'（両端の高さが一致）':''}`,[down?[-1,2*a,2-a*a]:[1,-2*a,a*a]],[-3,5,down?-16:-1,down?4:18],n===2?'最大は軸から遠い端点です。端点の高さが一致する境界a=1を、軸が端点に来るa=0,2と区別します。':'軸に最も近い区間内の点を探します。図は代表値の例です。境界を含む全場合は、上の答え・解説で確認してください。',domain)));
}
set('QF-PARAM',3,...[-1,0,.5,1,2].map(a=>graph(`a=${a}`,[[1,0,0],[0,2*a,-a]],[-3,5,-5,14],'a=0,1が接する境界。0<a<1では共有点がなく、その外側では2点です。図は代表値の比較であり、全範囲の判定はD=4a(a−1)の符号で行います。')));
set('QF-SIGN',1,{...graph('符号の範囲と指定区間の共通部分',[[1,-1,-2]],[-3,4,-4,8],'根−1,2の外側で0以上になります。指定区間の右端3は含まないので白丸で示します。',[-2,3]),openRight:true});
set('QF-SIGN',2,graph('区間全体が入るには',[[1,-5,6]],[-1,5,-1,8],'0以下になる範囲は[2,3]。長さ1の[a,a+1]全体が入るのは、両端が一致するa=2だけです。',[2,3]));
set('QF-SIGN',3,...[-1,0,3,4].map(k=>graph(`k=${k}`,[[1,-4,3],[0,0,k]],[-1,5,-2,7],'k=−1は接して1点。k=3では両端0,4で交わり、k>3では共有点が指定区間の外に出ます。',[0,4])));
set('QF-INTEGRATE',1,graph('面積と幅の関係',[[-2,12,0],[0,0,16]],[-.5,6.5,-2,21],'太線は1≦x≦4で使える面積。頂点で18m²となり、高さ16以上の部分は2≦x≦4です。',[1,4]));
set('QF-INTEGRATE',2,graph('観測できる時間と高さ',[[-1,4,1],[0,0,4]],[-1,5,-2,7],'観測区間[0,4]内で頂点と両端を見ます。高さ4との共有点はt=1,3。横軸xは、この問題では時間tを表します。',[0,4]));
set('QF-INTEGRATE',3,...[-2,-1,0,1,2].map(a=>graph(`a=${a}：区間[${a},${a+2}]`,[[1,-2,0],[0,0,3]],[-3,5,-2,9],'軸x=1を区間が含む境界はa=−1,1。区間全体の太線がy=3以下になるかも確認しましょう。',[a,a+2])));
set('QF-MAX',1,...[-1,0,1,2,3].map(a=>graph(`a=${a}` ,[[1,-2*a,a*a-1]],[-2,4,-2,12],'最小は軸に近い点、最大は遠い端点。a=1ではx軸との共有点0,2が両方とも指定区間に入ります。図以外の範囲は場合分けの式で確認します。',[0,2])));
set('QF-MAX',2,...[-1,-.75,0,3].map(k=>graph(`k=${k}`,[[1,-4,3],[0,0,k]],[-1,5,-2,7],'共有点の間で放物線が直線以下になります。k=−3/4では共有点のx座標が3/2と5/2で、長さ1の区間がちょうど入ります。',[0,4])));
set('QF-MAX',3,...[4,5,20/3,12,14].map(p=>graph(`p=${Math.round(p*100)/100}${p===20/3?'（20/3）':''}`,[[-1,p,-4]],[-1,7,-6,55],'利益を縦軸に示します。p=4では0に接し、p=20/3では右の根が上限6に達します。p=12で頂点が右端に一致し、それより大きいと最大は右端です。',[0,6])));
export function quadraticExplanation(problem:Problem){
 if(!problem.skillId.startsWith('QF-'))return '';
 const graphs=answerGraphs[problem.id]??[];
 const paragraphs=problem.solution.split(/(?<=。)/).filter(Boolean);
 return `<section class="explanation quadratic-answer"><h2>答え</h2><p class="answer-example">${esc(problem.answer)}</p><h2>考え方</h2><p>${esc(thinking[problem.skillId]??'条件を整理し、得た結果を元の問題で確かめましょう。')}</p><h2>解説</h2>${paragraphs.map(p=>`<p class="math-text">${esc(p)}</p>`).join('')}${graphs.length?`<h2>グラフ</h2>${graphs.length>1?'<p>値ごとの図を開いて、位置関係が変わる境界を比べましょう。</p>':''}${graphs.map((g,i)=>graphs.length===1?explanationGraph(g):`<details class="graph-case" ${i===0?'open':''}><summary>${esc(g.title)}</summary>${explanationGraph(g)}</details>`).join('')}`:''}</section>`;
}
