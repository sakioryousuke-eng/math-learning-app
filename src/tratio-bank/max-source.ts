// Fixed final candidates, individually reviewed in docs/tratio-max-final-review.md.
import {generateIntegratedTratio} from '../prototype/tratio-integrated.ts';
import {integratedTratioFigure} from '../prototype/tratio-integrated-view.ts';
import {rightSceneFigure} from '../prototype/tratio-right-view.ts';
import {rightVariants} from '../prototype/tratio-right.ts';
import {enumerateSSA,inspectTriangle,generateGeneralVariant} from '../prototype/tratio-general.ts';
import {generalFigures} from '../prototype/tratio-general-view.ts';
import type {TratioBankRecord,TratioBankHypothesis} from './types.ts';
const root=Math.sqrt,sin=(a:number)=>Math.sin(a*Math.PI/180);
export function maxExact(x:number):string{
 for(let d=1;d<=100;d++){const n=Math.round(x*d);if(Math.abs(x-n/d)<1e-9)return d===1?String(n):`${n}/${d}`;}
 for(let d=1;d<=100;d++){let n=Math.round(x*x*d*d);if(n<=0||Math.abs(x-root(n)/d)>1e-9)continue;let f=1;for(let k=2;k*k<=n;k++)while(n%(k*k)===0){f*=k;n/=k*k;}return `${f===1?'':f}√${n}${d===1?'':`/${d}`}`;}
 throw new Error('Explicit exact label required');
}
const hyp=(type:string,description:string):TratioBankHypothesis=>({type,description,crossSkills:[type==='invalid_candidate_kept'?'X04':type==='method_selection'?'X11':'X08'],stage:type==='invalid_candidate_kept'||type==='method_selection'?'routeSelection':'execution',hypothesisOnly:true,repairSkillId:'TR-INTEGRATE'});
export function buildTratioMax():TratioBankRecord[]{
 const result:TratioBankRecord[]=[];
 for(let index=0;index<3;index++){
  const id=`TR-MAX-FINAL-${index+1}`,wrong:{values:number[];text:string;type:string;reason:string;model:string}[]=[];
  let prompt='',thinking='',working:string[]=[],values:number[]=[],text='',before='',after='',oracle:number[]=[],model:unknown,structure='';
  const add=(v:number[],t:string,type:string,reason:string,formula:string)=>wrong.push({values:v,text:t,type,reason,model:formula});
  if(index===0){
   const base=generateIntegratedTratio(7),p=base.scene.points;
   prompt='△ABCでAB=8、AC=6、∠BAC=60°である。辺AB上の点DはAD=2を満たし、Dを通りBCに平行な直線と辺ACとの交点をEとする。△BDEの面積Sと外接円の半径Rを求めよ。長さはcm、面積はcm²とする。';
   const compute=(ae:number,sign=-1,areaFactor=.5,rFactor=.5,bd=6)=>{const be=root(64+ae*ae+sign*8*ae),sinD=3*root(3)/root(52);return [areaFactor*bd*ae*sin(60),rFactor*be/sinD];};
   values=compute(1.5);const label=(v:number[])=>`S=${maxExact(v[0])} cm²、R=${maxExact(v[1])} cm`;text=label(values);
   const g=inspectTriangle({A:p.B,B:p.D,C:p.E});oracle=[g.area,g.R];
   thinking='面積と半径の両方を求めるには、△BDEの形を確かめる必要があります。平行線からAEとDEの情報を得ると、まだ分からない辺BEや角Dにつながります。';
   working=['△ADE∽△ABCよりAE=6×2/8=3/2、BD=6。EからABへの高さはAE sin60°=3√3/4なので、S=6×(3√3/4)/2=9√3/4。','△ABEでBE²=8²+(3/2)²−2×8×(3/2)cos60°=217/4。△ABCでBC²=8²+6²−2×8×6cos60°=52。','DE∥BCより∠BDEと∠ABCは補角。sin∠BDE=sinB=6sin60°/BC=3√3/(2√13)。したがってR=BE/(2sin∠BDE)=√8463/18。','D、Eはそれぞれ辺AB、ACの内部にあり、相似比は1/4。△BDEの辺とその対角の対応を確認した。別解では3辺と面積からR=BD・DE・BE/(4S)を使っても同じ値になる。'];
   add(compute(24),label(compute(24)),'similarity_correspondence','相似比を逆にし、AE=24から面積とBEを計算した','AE=AC·AB/AD → height, BE → S,R');
   add(compute(1.5,1),label(compute(1.5,1)),'cosine_correction_sign','BEの補正項の符号を逆にし、半径へ伝播した','BE²=AB²+AE²+AB·AE → R');
   add(compute(1.5,-1,1),label(compute(1.5,-1,1)),'area_conversion','面積の1/2を落とした','S=BD·AE sin60°');
   add(compute(1.5,-1,.5,1),label(compute(1.5,-1,.5,1)),'circumradius_factor','直径を半径として答えた','R=BE/sinD');
   add(compute(1.5,-1,.5,.5,2),label(compute(1.5,-1,.5,.5,2)),'shared_side_transfer','BDへADの長さを渡して面積を求めた','BD:=AD → S');
   before=integratedTratioFigure({...base,prompt});after=integratedTratioFigure({...base,prompt},true);model=base.scene;structure='MAX-parallel-similarity-area-circumradius';
  }else if(index===1){
   const base=generateIntegratedTratio(8),scene=structuredClone(base.scene);
   scene.points.B=[8,0];scene.points.C=[6,3];scene.points.F=[6,0];scene.knownLengths.find(k=>k.ends.join('')==='AB')!.value=8;scene.knownLengths.find(k=>k.ends.join('')==='AB')!.label='8';scene.knownLengths.find(k=>k.ends.join('')==='CD')!.value=4;scene.knownLengths.find(k=>k.ends.join('')==='CD')!.label='4';
   prompt='AB∥DCの二等辺台形ABCDで、AB=8、CD=4、AD=BC=√13である。△ABCの面積Sと外接円の半径Rを求めよ。長さはcm、面積はcm²とする。';
   const compute=(h=3,offset=2,areaFactor=.5,rFactor=.5,reciprocal=false)=>{const ac=root((8-offset)**2+h*h),sinB=reciprocal?root(13)/h:h/root(13);return [areaFactor*8*h,rFactor*ac/sinB];};
   values=compute();const label=(v:number[])=>`S=${maxExact(v[0])} cm²、R=${maxExact(v[1])} cm`;text=label(values);
   const p=scene.points,g=inspectTriangle({A:p.A,B:p.B,C:p.C});oracle=[g.area,g.R];
   thinking='△ABCの面積には台形の高さが必要です。半径には、角Bの情報と対角線ACを組み合わせられます。左右のずれが等しいことを使うと、それらを順につなげられます。';
   working=['D、CからABへ下ろした垂線の足をE、Fとする。AE=BF=(8−4)/2=2。CF²=BC²−BF²=13−4=9より高さは3。','面積S=8×3/2=12。AF=8−2=6なので、AC²=6²+3²=45、AC=3√5。','sinB=CF/BC=3/√13。ACは角Bの対辺だからR=AC/(2sinB)=√65/2。','高さと水平のずれからBC²=3²+2²=13が戻る。面積も正で、AC<2Rを満たす。別解として座標A=(0,0)、B=(8,0)、C=(6,3)から面積と外心を求めても一致する。'];
   add(compute(root(13)),label(compute(root(13))),'height_transfer','斜辺を高さとし、面積・対角線・半径へ伝播した','h:=BC → S,AC,sinB,R');
   add(compute(root(17)),label(compute(root(17))),'pythagoras_scope','高さの平方を差でなく和とした','h²=BC²+BF² → S,AC,sinB,R');
   add(compute(3,2,1),label(compute(3,2,1)),'area_conversion','面積の1/2を落とした','S=AB·h');
   add(compute(3,2,.5,1),label(compute(3,2,.5,1)),'circumradius_factor','直径を半径として答えた','R=AC/sinB');
   add(compute(3,2,.5,.5,true),label(compute(3,2,.5,.5,true)),'sine_ratio_reversal','sinBの比を逆にして半径を求めた','sinB=BC/h → R');
   before=rightSceneFigure({...rightVariants[0],prompt,scene});const solution=structuredClone(scene);solution.points.O=g.center;solution.circle={center:'O',radius:g.R};after=rightSceneFigure({...rightVariants[0],prompt,scene:solution},true);model=scene;structure='MAX-isosceles-trapezoid-area-circle';
  }else{
   const b=5*root(2),h=b/2,ah=b*root(3)/2,delta=root(25-h*h),bases=[ah+delta,ah-delta];
   const value=(bs:number[],areaFactor=.5,radius=5)=>bs.flatMap(x=>[x,areaFactor*x*h]).concat(radius);
   const basesLabel=['5(√6+√2)/2','5(√6−√2)/2'],areaLabel=['25(√3+1)/4','25(√3−1)/4'];
   prompt='△ABCで∠A=30°、BC=5、CA=5√2である。条件を満たす三角形について、辺ABの長さと面積の組をすべて求め、それぞれの外接円の半径も答えよ。長さはcm、面積はcm²とする。';
   const label=(indices:number[],factor=1,radius=5)=>indices.map(i=>`AB=${basesLabel[i]}、S=${factor===1?'':factor+'×'}${areaLabel[i]}、R=${radius}`).join('；');
   values=value(bases);text=label([0,1]);
   const ts=enumerateSSA(30,5,b).sort((a,b)=>b.B[0]-a.B[0]);oracle=ts.flatMap(t=>{const g=inspectTriangle(t);return [g.c,g.area];}).concat(inspectTriangle(ts[0]).R);
   thinking='面積にはABとその高さが必要ですが、与えられた条件だけでBの位置が1つに決まるとは限りません。角や配置の候補をすべて調べ、それぞれを元の条件へ戻します。';
   working=['正弦定理からsinB=(5√2)sin30°/5=√2/2。B=45°または135°であり、A+B<180°をどちらも満たす。','Cから直線ABへ垂線CHを下ろすとAH=5√6/2、CH=5√2/2。BH²=25−CH²=25/2だからBH=5√2/2。BがHの左右にある場合から、AB=5(√6±√2)/2。','面積はAB・CH/2=25(√3±1)/4。半径はR=BC/(2sinA)=5で共通。符号はABと面積で対応させる。','2つのABはともに正で、BC²=BH²+CH²=25が戻る。角Cも105°または15°で正となる。別解はAB=10sinCを用いてもよいが、15°・105°の値を既習の図形から導く根拠が必要になる。'];
   add(value([bases[0]]),label([0]),'second_solution_missing','小さい配置を除外した','B=45° only → AB,S,R');
   add(value([bases[1]]),label([1]),'second_solution_missing','大きい配置を除外した','B=135° only → AB,S,R');
   add(value(bases,1),label([0,1],2),'area_conversion','面積の1/2を落とした','S=AB·CH for both candidates');
   add(value(bases,.5,10),label([0,1],1,10),'circumradius_factor','直径を半径として答えた','R=BC/sinA');
   const bad=[ah+5,ah-5];add(value(bad),`AB=5√6/2+5、S=25√3/4+25√2/4、R=5；AB=5√6/2−5、S=25√3/4−25√2/4、R=5`,'height_transfer','BCをBHへ誤転送して両候補を計算した','BH:=BC → AB=AH±BH → S=AB·CH/2');
   // Correct the explicit expanded labels: AH·CH/2=25√3/4.
   const v=generateGeneralVariant(11,1);v.prompt=prompt;v.scene.ssa={A:30,a:5,b};v.scene.knownValues={A:{value:30,label:'30'},a:{value:5,label:'5'},b:{value:b,label:'5√2'}};v.scene.coordinates=ts;before=generalFigures(v);after=generalFigures(v,true);model=v.scene;structure='MAX-SSA-two-configurations-area-circle';
  }
  if(values.length!==oracle.length||values.some((x,i)=>Math.abs(x-oracle[i])>1e-7))throw new Error(`MAX oracle ${index+1}`);
  const choices=[{choiceId:id+':correct',text,values,correct:true,hypothesis:null},...wrong.map((w,i)=>({choiceId:`${id}:wrong-${i+1}`,text:w.text,values:w.values,correct:false,hypothesis:hyp(w.type,w.reason+'可能性')}))];
  if(choices.length!==6||choices.some((a,i)=>choices.some((b,j)=>i!==j&&a.values.length===b.values.length&&a.values.every((x,k)=>Math.abs(x-b.values[k])<1e-8))))throw new Error('MAX equivalent choices');
  result.push({id,unitId:'TRATIO',skillId:'TR-INTEGRATE',topic:'総合・方法指定なし',purpose:'max',difficulty:4,prompt,answer:text,examAnswer:working.join('\n')+'\n'+text,solution:working.join('\n'),point:thinking,transfer:'元の配置・辺・角・候補の存在を検証する',repairSkillId:null,independenceKey:id,reviewStatus:'reviewed',verificationStatus:'reviewed',familyId:'TRATIO-FIXED-MAX',variantId:id,structureSignature:structure,step:4,difficultyTier:'PRACTICAL',problemRequirements:[{id:'method_selection',description:'中間量と解法を選び、最後までつなぐ',crossSkills:['X10','X11','X12']},{id:'verify_original',description:'元の図形条件へ戻して確認する',crossSkills:['X04','X13']}],crossSkills:['X04','X10','X11','X12','X13'],choices,expected:values,problemFigure:before,solutionFigure:after,explanation:{thinking,steps:working,answer:text},parameters:model,solutionTrace:working,candidateAudit:wrong,validation:{oracle:true,mathematics:true,uniqueChoices:true,diagram:true,rules:['individual-mathematical-review','six-choices','independent-coordinate-oracle','no-method-hint','strict-self-confirmation','given-lengths','angle-range','non-degenerate','all-configurations','exact-answer-labels','alternative-route','wrong-model-propagation','diagram-before-givens-only','diagram-after-auxiliary','original-condition-check','multistage-difficulty-calibration','exam-readable-conclusion']},oracle:{values:oracle,pass:true},generatorVersion:'tratio-fixed-max-v1',diagramReading:false,sourceVariant:`TR-INTEGRATE-MAX1-${index+1}`});
 }
 return result;
}
