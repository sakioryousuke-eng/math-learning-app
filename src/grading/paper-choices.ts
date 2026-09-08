import {reviewedCurriculum} from '../curriculum/quadratic.ts';
import {answerCopy} from '../ui/quadratic-copy.ts';
import type {ErrorTag,Assessment} from '../math-master/types.ts';
declare module '../math-master/types.ts' {
 interface Assessment {choice?:{choiceId:string;correct:boolean;mistakeType:ErrorTag|null;repairSkillId:string|null;confirmed:string[];missing:string[];source:'paper-self-report'}}
}
export const paperCurriculum={...reviewedCurriculum,paperChoiceGrading:true};
export interface PaperChoice {choiceId:string;text:string;correct:boolean;mistakeType:ErrorTag|null;repairSkillId?:string}
export interface PaperCheck {id:string;label:string;dimension:'method'|'conditions'|'calculation'|'expression'}
export interface PaperSpec {problemId:string;choices:PaperChoice[];checks:PaperCheck[];insufficient:string[]}
export const ordinaryChecks:PaperCheck[]=[{id:'method',label:'方針と根拠を紙に書き、解説と照合できる',dimension:'method'},{id:'conditions',label:'必要な条件・範囲・場合分けを確認した',dimension:'conditions'},{id:'calculation',label:'途中の式変形・計算を確認した',dimension:'calculation'}];
export const paperSpecs:Record<string,PaperSpec>={};
type Wrong=[string,ErrorTag,string?];
function add(skill:string,n:number,wrong:Wrong[]){const id=`${skill}-V1-${n}`,p=reviewedCurriculum.problems.find(p=>p.id===id)!;const answer=answerCopy[id]?.answer??p.answer;paperSpecs[id]={problemId:id,choices:[{choiceId:`${id}:correct`,text:answer,correct:true,mistakeType:null},...wrong.map(([text,mistakeType,repairSkillId],i)=>({choiceId:`${id}:error-${i+1}`,text,correct:false,mistakeType,...(repairSkillId?{repairSkillId}:{})}))],checks:[...ordinaryChecks],insufficient:[]};}
add('QF-GRAPH',1,[['上に開く。軸x=−2、頂点(−2,−1)。左2、下1。','sign'],['上に開く。軸x=2、頂点(2,1)。右2、上1。','sign'],['下に開く。軸x=2、頂点(2,−1)。右2、下1。','concept']]);
add('QF-GRAPH',2,[['下に開く。軸x=1、頂点(1,3)。右1、上3。','sign'],['上に開く。軸x=−1、頂点(−1,3)。左1、上3。','concept'],['下に開く。軸x=−1、頂点(−1,−3)。左1、下3。','sign']]);
add('QF-GRAPH',3,[['y=2(x+3)²−2','sign'],['y=(x−3)²−2','concept'],['y=2(x−3)²+2','sign']]);
add('QF-FORM',1,[['y=(x−3)²+14。軸x=3、頂点(3,14)。x軸との共有点なし。','calculation'],['y=(x+3)²−4。軸x=−3、頂点(−3,−4)。共有点(−5,0),(−1,0)。','sign'],['y=(x−3)²−4。軸x=3、頂点(3,−4)。x軸との共有点は(5,0)だけ。','conclusion']]);
add('QF-FORM',2,[['y=−2(x+2)²−1。軸x=−2、頂点(−2,−1)。下に開く。','calculation'],['y=−2(x−2)²+3。軸x=2、頂点(2,3)。下に開く。','sign'],['y=−2(x+2)²+3。軸x=−2、頂点(−2,3)。上に開く。','concept']]);
add('QF-FORM',3,[['最小値7/4（x=1/2）。頂点(1/2,7/4)、上に開く。','fraction'],['最小値5/4（x=−1/2）。頂点(−1/2,5/4)、上に開く。','sign'],['最大値5/4（x=1/2）。頂点(1/2,5/4)、下に開く。','concept']]);
add('QF-FORM',4,[['最大値−13/2（x=3）。頂点(3,−13/2)。','calculation'],['最大値5/2（x=−3）。頂点(−3,5/2)。','sign'],['最小値5/2（x=3）。頂点(3,5/2)。','concept']]);
add('QF-RANGE',1,[['最大値−3（x=2）、最小値1（x=0）。','concept'],['最大値なし、最小値−3（x=2）。値域f(x)≧−3。','domain_omission'],['最大値1（x=0）、最小値−2（x=3）。値域−2≦f(x)≦1。','method_selection']]);
add('QF-RANGE',2,[['最大値17（x=0）、最小値1（x=4）。値域1≦f(x)≦17。','domain_omission'],['最大値5（x=2）、最小値17（x=0）。','concept'],['最大値なし、最小値1（x=4）。値域f(x)≧1。','domain_omission']]);
add('QF-RANGE',3,[['最大値4（x=1）、最小値0（x=−1だけ）。値域0≦f(x)≦4。','condition_omission'],['最大値0（x=−1,3）、最小値4（x=1）。','concept'],['最大値4（x=1）、最小値なし。値域f(x)≦4。','domain_omission']]);
add('QF-RANGE',4,[['最大値15（x=2）、最小値0（x=0）。値域0≦f(x)≦15。','calculation','QF-FORM'],['最大値なし、最小値−3（x=−1）。値域f(x)≧−3。','domain_omission'],['最大値−3（x=−1）、最小値15（x=2）。','concept']]);
add('QF-DIFFERENCE',1,[['共有点のx座標は−1,3（y座標の記述なし）。','writing'],['共有点：(−1,0),(3,0)。','concept'],['共有点：(3,9)だけ。','factorization','HSX2']]);
add('QF-DIFFERENCE',2,[['共有点：(√2,3)だけ。','conclusion'],['共有点：(−√2,0),(√2,0)。','concept'],['共有点：(−2,5),(2,5)。','calculation']]);
add('QF-DIFFERENCE',3,[['共有点：(−2,2)。','sign'],['共有点：(2,0)。','concept'],['二次項が消えるので共有点はない。','method_selection']]);
add('QF-COUNT',1,[['共有点は0点。','sign'],['共有点は1点。','conclusion'],['共有点は3点。','concept']]);
add('QF-COUNT',2,[['共有点は2点。接点は(1,1)。','concept'],['共有点は1点。接点は(1,0)。','conclusion'],['共有点は0点。接点なし。','sign']]);
add('QF-COUNT',3,[['x軸との共有点は2点。','sign'],['x軸との共有点は1点。','concept'],['頂点(−1,2)がx軸との共有点。','concept']]);
add('QF-COUNT',4,[['共有点は0点。','sign'],['共有点は1点。','conclusion'],['共有点は3点。','concept']]);
add('QF-PARAM',1,[['すべてのaで最小値0（x=a）。','domain_omission'],['a<0：最小(2−a)²（x=2）。0≦a≦2：最小0（x=a）。a>2：最小a²（x=0）。','method_selection'],['a<0：最小a²（x=0）。0<a<2：最小0（x=a）。a>2：最小(2−a)²（x=2）。a=0,2は除く。','case_split']]);
add('QF-PARAM',2,[['a<0：最大(2−a)²（x=2）。a=0：最大4（x=0,2）。a>0：最大a²（x=0）。','case_split'],['a<1：最大(2−a)²（x=2）。a=1：最大1（x=2だけ）。a>1：最大a²（x=0）。','condition_omission'],['a<1：最大a²（x=0）。a=1：最大1（x=0,2）。a>1：最大(2−a)²（x=2）。','sign']]);
add('QF-PARAM',3,[['a<0またはa>1：0点。a=0,1：1点。0<a<1：2点。接点(0,0),(1,1)。','sign'],['a≦0またはa≧1：2点。0<a<1：0点。接点なし。','condition_omission'],['a<0またはa>1：2点。a=0,1：1点。0<a<1：0点。接点は両方(0,0)。','calculation']]);
add('QF-PARAM',4,[['すべてのaで最大値2（x=a）。','domain_omission'],['a<−1：最大2−(a−1)²（x=1）。−1≦a≦1：最大2（x=a）。a>1：最大2−(a+1)²（x=−1）。','method_selection'],['a<−1：最大2−(a+1)²（x=−1）。−1<a<1：最大2（x=a）。a>1：最大2−(a−1)²（x=1）。a=±1は除く。','case_split']]);
add('QF-SIGN',1,[['x≦−1 または x≧2','domain_omission'],['−1≦x≦2','sign','HSX2'],['−2≦x≦−1 または 2≦x≦3','condition_omission']]);
add('QF-SIGN',2,[['1≦a≦3','logic'],['2≦a≦3','condition_omission'],['該当するaはない。','condition_omission']]);
add('QF-SIGN',3,[['k>−1','domain_omission'],['−1≦k≦3','condition_omission'],['−1<k<3','condition_omission']]);
add('QF-INTEGRATE',1,[['(1)S=x(12−x),1≦x≦4。(2)最大32m²（x=4）。(3)6−2√5≦x≦4。','modeling'],['(1)S=x(12−2x),1≦x≦4。(2)最大18m²（x=3）。(3)x≦2 または x≧4。','sign'],['(1)S=x(12−2x),1≦x≦4。(2)最大16m²（x=4）。(3)2≦x≦4。','method_selection','QF-RANGE']]);
add('QF-INTEGRATE',2,[['(1)最高5m（t=2）。(2)1≦t≦3。(3)k<5。','domain_omission'],['(1)最高5m（t=2）。(2)1≦t≦3。(3)1≦k≦5。','condition_omission'],['(1)最高5m（t=2）。(2)t≦1 または t≧3。(3)1≦k<5。','sign']]);
add('QF-INTEGRATE',3,[['(1)すべてのaで最小−1。(2)−1≦a≦1。','domain_omission'],['(1)a<−1：(a+1)²−1。−1≦a≦1：−1。a>1：(a−1)²−1。(2)−3≦a≦3。','logic'],['(1)a<−1：(a+1)²−1。−1≦a≦1：−1。a>1：(a−1)²−1。(2)−1<a<1。','condition_omission']]);
add('HSX2',1,[['(x+2)(x+3)','sign'],['(x−1)(x−6)','factorization'],['(x−2)(x+3)','sign']]);
add('HSX2',2,[['2(x−4)(x+4)','factorization'],['(2x−2)(2x+2)','expansion'],['2(x−2)²','factorization']]);
// Each MAX distractor retains the full multi-part conclusion, with one characteristic error.
const maxWrong:[string,string,ErrorTag][][]=[
 [['a<1で(2−a)²−1、a=1で0、a>1でa²−1','a<0で(2−a)²−1、a=0で3、a>0でa²−1','case_split'],['a=1で2個','a=1で1個','conclusion'],['a≦−1 または a≧3','a<−1 または a>3','condition_omission'],['0≦a≦2で−1','0<a<2で−1（a=0,2は除く）','case_split'],['a≦−1 または a≧3','−1≦a≦3','sign']],
 [['(1) k>−1','(1) k≧−1','condition_omission'],['(2) −1<k≦3','(2) k>−1','domain_omission'],['−3/4≦k≦3','−1<k≦3','logic'],['1+√(k+1)','2+√(k+1)','condition_omission'],['−3/4≦k≦3','−3/4<k≦3','condition_omission']],
 [['0<p≦12：最大利益p²/4−4（x=p/2）\np>12：最大利益6p−40（x=6）','すべてのp>0で最大利益p²/4−4（x=p/2）','domain_omission'],['4<p≦20/3','4≦p≦20/3','condition_omission'],['4<p≦20/3','p>4','domain_omission'],['4<p≦20/3','4<p<20/3','condition_omission'],['(p−√(p²−16))/2≦x≦(p+√(p²−16))/2','x≦(p−√(p²−16))/2 または x≧(p+√(p²−16))/2','sign']]
];
for(let n=1;n<=3;n++){const id=`QF-MAX-V1-${n}`,text=answerCopy[id].answer;add('QF-MAX',n,maxWrong[n-1].map(([from,to,tag])=>{if(!text.includes(from))throw new Error('Invalid MAX distractor');return [text.replace(from,to),tag];}));}
const check=(id:string,label:string,dimension:PaperCheck['dimension']):PaperCheck=>({id,label,dimension});
paperSpecs['QF-MAX-V1-1'].checks=[check('cases','最小・最大・根の個数について、全場合と境界の等号を書いた','conditions'),check('roots','a±1が区間内に入る条件と、a=1の2根を確認した','conditions'),check('reason','軸・両端の比較と、最小値から全非負を判断する根拠を書いた','method'),check('calculation','必要な式変形・計算を残した','calculation'),check('complete','(1)〜(3)の結論をすべて明記した','expression'),check('readable','答案全体が読み取れるように書いた','expression')];
paperSpecs['QF-MAX-V1-2'].checks=[check('distinct','異なる2根の存在条件と区間端の等号を確認した','conditions'),check('interval','区間全体の包含条件と、aが存在する条件を書いた','conditions'),check('reason','2±√(k+1)から条件を導く根拠を書いた','method'),check('calculation','必要な式変形・計算を残した','calculation'),check('complete','(1)〜(3)の条件範囲をすべて明記した','expression'),check('readable','答案全体が読み取れるように書いた','expression')];
paperSpecs['QF-MAX-V1-3'].checks=[check('axis','p=12の境界を示し、最大利益とそのときのxを書いた','conditions'),check('roots','2根が正で[0,6]内にある条件と、重解の除外を確認した','conditions'),check('reason','利益の式と、二乗前に右辺が非負である根拠を書いた','method'),check('calculation','根の式・式変形・計算を残した','calculation'),check('complete','(1)〜(3)の結論と元の生産範囲の確認を書いた','expression'),check('readable','答案全体が読み取れるように書いた','expression')];
for(const id of ['QF-MAX-V1-1','QF-MAX-V1-2','QF-MAX-V1-3'])paperSpecs[id].insufficient=['結論だけで途中の根拠がない答案は不足です。','境界・等号や設問の一部を省いた答案は完全合格にしません。'];
export function shuffledChoices(spec:PaperSpec){const list=[...spec.choices];for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
export function choiceAssessment(spec:PaperSpec,choiceId:string,confirmed:string[],base:Assessment):Assessment{
 const choice=spec.choices.find(c=>c.choiceId===choiceId);if(!choice)throw new Error('選択した答案が見つかりません。');
 if(new Set(confirmed).size!==confirmed.length||confirmed.some(id=>!spec.checks.some(c=>c.id===id)))throw new Error('答案チェックが不正です。');
 const missing=spec.checks.filter(c=>!confirmed.includes(c.id)).map(c=>c.id),max=base.context==='max';
 const a:Assessment={...base,solved:choice.correct&&(!max||missing.length===0),readable:true,tags:choice.mistakeType?[choice.mistakeType]:[],dimensions:{understanding:'unobserved',modeling:'unobserved',method:'unobserved',conditions:'unobserved',calculation:'unobserved',expression:'unobserved',conclusion:choice.correct?'success':'failure'},crossSkills:{},choice:{choiceId,correct:choice.correct,mistakeType:choice.mistakeType,repairSkillId:choice.repairSkillId??null,confirmed:[...confirmed],missing,source:'paper-self-report'}};
 for(const d of ['method','conditions','calculation','expression'] as const){const checks=spec.checks.filter(c=>c.dimension===d);if(checks.length&&checks.every(c=>confirmed.includes(c.id)))a.dimensions[d]='success';}
 return a;
}
