import {master as legacyMaster,problems as legacyProblems} from '../services/catalog.ts';
import type {Master} from '../math-master/types.ts';
import type {Problem} from '../services/catalog.ts';
import type {Curriculum,LearningCatalog,UnitGuide,SkillGuide,ProblemGuide} from './types.ts';
import {unitSeeds} from './units.ts';
import {examples} from './examples.ts';
import {maxExamples} from './max-examples.ts';
import {validateCurriculum} from './validate.ts';
export const legacyCatalog:LearningCatalog={master:legacyMaster,problems:legacyProblems,version:'math-v0.1-100',mainUnitIds:legacyMaster.units.map(u=>u.id)};
export const curriculumVersion='math-v0.5-full';
const master:Master=structuredClone(legacyMaster);
const problems:Problem[]=structuredClone(legacyProblems);
const worlds:Record<string,string>={CAL:'中学｜数・計算',EXP:'中学｜式・方程式',EQU:'中学｜式・方程式',FUN:'中学｜関数・数量関係',HSX:'高校｜式・論理',QEQ:'高校｜式・論理',QFN:'高校｜関数'};
const meaning='進研模試等の該当大問の最後の小問まで自力で実戦対応可能。数学的完全理解とは区別する。';
const maxGuide=(name:string):UnitGuide['max']=>({meaning,minutes:25,writing:true,noHint:true,noMethodLabel:true,template:`${name}の条件を自分で整理し、複数技能を選択・統合して結論まで記述する。数値条件・逆問題・モデル検証の異なる課題群を教材審査後に追加する。`,reviewStatus:'representative_unvalidated'});
const units:UnitGuide[]=master.units.map(u=>({unitId:u.id,world:worlds[u.id],lane:'MAIN',requiredMax:[...u.prerequisites],introduction:'need_driven',entry:'日本語・現実から条件を式へ変換し、解を元の状況で検証する。',coverage:master.skills.filter(s=>s.unitId===u.id).map(s=>s.name),theoryRecoveredIn:null,max:maxGuide(u.name)}));
const skills:SkillGuide[]=master.skills.map((s,i)=>({skillId:s.id,introduction:'need_driven',coverage:[s.name],phase:i%3===2?'integration':i%3===1?'selection':'knowledge',crossSkillIds:[...s.crossSkillIds]}));
const problemGuides:ProblemGuide[]=problems.map(p=>({problemId:p.id,roles:p.purpose==='max'?['max']:['introduction','basic','repair'],hideMethodLabel:p.purpose==='max',reviewStatus:'legacy'}));
for(const seed of unitSeeds){
 master.units.push({id:seed.id,name:seed.name,prerequisites:[...seed.pre],skillFile:'curriculum/units.ts'});
 master.maxDefinitions.push({unitId:seed.id,requiredSuccesses:3,validityDays:7,dailyLimit:1,standard:meaning});
 units.push({unitId:seed.id,world:seed.world,lane:seed.lane??'MAIN',requiredMax:[...seed.pre],introduction:seed.intro??'need_driven',entry:seed.entry,coverage:seed.coverage.split('|'),theoryRecoveredIn:seed.recover??null,max:maxGuide(seed.name)});
 const sample=examples[seed.id];if(!sample)throw new Error(`Missing examples: ${seed.id}`);
 seed.skills.forEach((name,i)=>{
  const id=seed.id+(i+1),cross=i===0?['X01','X02','X03','X04']:i===1?['X04','X05','X06','X08','X10']:['X02','X03','X06','X07','X09','X11','X12','X13'];
  master.skills.push({id,unitId:seed.id,name,prerequisites:i?[seed.id+i]:[],crossSkillIds:cross});
  skills.push({skillId:id,introduction:seed.intro??'need_driven',coverage:[name,...seed.coverage.split('|').filter((_,index)=>Math.min(2,Math.floor(index/(seed.coverage.split('|').length/3)))===i)],phase:i===2?'integration':i===1?'selection':'knowledge',crossSkillIds:cross});
  for(let j=0;j<2;j++){
   const e=sample[i*2+j],pid=`${id}-R${j+1}`;
   problems.push({id:pid,skillId:id,topic:name,purpose:'practice',difficulty:2,prompt:e[0],solution:e[1],answer:e[1],point:'操作する前に存在条件を確認し、変形が条件を保つか検証する。',examAnswer:e[1],transfer:seed.entry,repairSkillId:i?seed.id+i:null,independenceKey:pid});
   problemGuides.push({problemId:pid,roles:i===2?['basic','repair','integration']:['introduction','basic','repair'],hideMethodLabel:i===2,reviewStatus:'representative_unvalidated'});
  }
 });
 const e=sample[6],pid=`${seed.id}-MAX-R1`;
 problems.push({id:pid,skillId:seed.id+'3',topic:seed.name,purpose:'max',difficulty:4,prompt:e[0],solution:e[1],answer:e[1],point:'条件・根拠・結論を独立して記述する。',examAnswer:e[1],transfer:'異なる問題群で実戦対応を再確認する。',repairSkillId:seed.id+'2',independenceKey:`${seed.id}:representative:1`});
 problemGuides.push({problemId:pid,roles:['max','integration'],hideMethodLabel:true,reviewStatus:'representative_unvalidated'});
 const additional=maxExamples[seed.id];if(!additional)throw new Error(`Missing independent MAX families: ${seed.id}`);
 additional.forEach((task,i)=>{
  const id=`${seed.id}-MAX-R${i+2}`;
  problems.push({...problems.find(p=>p.id===pid)!,id,prompt:task[0],solution:task[1],answer:task[1],examAnswer:task[1],independenceKey:`${seed.id}:representative:${i+2}`});
  problemGuides.push({problemId:id,roles:['max','integration'],hideMethodLabel:true,reviewStatus:'representative_unvalidated'});
 });
}
// Supplement legacy coverage without mutating any frozen educational-core files or IDs.
units.find(u=>u.unitId==='HSX')!.coverage.push('絶対値・場合分け','変数で割る前の0確認','根号・実数・一次不等式');
units.find(u=>u.unitId==='QEQ')!.coverage.push('解と係数への接続');
units.find(u=>u.unitId==='QFN')!.coverage.push('二次不等式','定義域・場合分け','交点・判別式・解の配置');
units.find(u=>u.unitId==='CAL')!.coverage.push('素因数分解','誤差・近似値・有効数字');
units.find(u=>u.unitId==='EQU')!.coverage.push('連立二元一次方程式');
units.find(u=>u.unitId==='FUN')!.coverage.push('比例・反比例','表・式・グラフの相互変換');
const supplements:[string,string,string,string][]=[
 ['EQU-SYSTEM-1','EQU3','x+y=7、2x−y=2を連立して解き、両式で検算せよ。','両式を足して3x=9、x=3,y=4。3+4=7、6−4=2。'],
 ['EQU-SYSTEM-2','EQU3','大人券500円、子供券300円を合わせて8枚買い、合計3000円。各枚数を求めよ。','大人x、子供yとしてx+y=8,500x+300y=3000。差200x=600から大人3枚、子供5枚。非負整数条件を満たす。'],
 ['FUN-INVERSE-1','FUN3','yがxに反比例し、x=2のときy=6。式を求め、x=−3のときのyを求めよ。','xy=12なのでy=12/x（x≠0）。x=−3でy=−4。'],
 ['FUN-INVERSE-2','FUN3','面積24の長方形の縦xと横yの関係を式と定義域で示し、xが2倍になるとyはどう変わるか説明せよ。','y=24/x、x>0。xを2倍にするとyは1/2。面積を保つ反比例。']
];
for(const [id,skillId,prompt,solution] of supplements){
 const base=problems.find(p=>p.skillId===skillId&&p.purpose==='practice')!;
 problems.push({...base,id,prompt,solution,answer:solution,examAnswer:solution,topic:'数量関係の統合',independenceKey:id});
 problemGuides.push({problemId:id,roles:['basic','repair','integration'],hideMethodLabel:true,reviewStatus:'representative_unvalidated'});
}
for(const [id,coverage] of [['EQU3','連立二元一次方程式'],['FUN3','比例・反比例'],['HSX1','誤差・近似値・有効数字']] as const)skills.find(s=>s.skillId===id)!.coverage.push(coverage);
export const curriculum:Curriculum={master,problems,version:curriculumVersion,mainUnitIds:units.filter(u=>u.lane==='MAIN').map(u=>u.unitId),units,skills,problemGuides};
validateCurriculum(curriculum);
export {master,problems};
