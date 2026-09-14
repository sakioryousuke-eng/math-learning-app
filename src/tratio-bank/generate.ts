// Build/test only. Production imports the frozen JSON, never this module.
import {generateRightVariant,validateRightVariant,scalePool} from '../prototype/tratio-right.ts';
import {rightSceneFigure} from '../prototype/tratio-right-view.ts';
import {generateGeneralVariant,validateGeneral,generalScales,enumerateSSA,inspectTriangle,generalOracle} from '../prototype/tratio-general.ts';
import {generalFigures} from '../prototype/tratio-general-view.ts';
import {generateIntegratedTratio,validateIntegrated,integratedScales,areaCandidateCoordinates} from '../prototype/tratio-integrated.ts';
import {integratedTratioFigure} from '../prototype/tratio-integrated-view.ts';
import type {TratioBankRecord,TratioBankArtifact,TratioBankHypothesis} from './types.ts';
import {maxExact,buildTratioMax} from './max-source.ts';
export const tratioGeneratorVersion='tratio-static-v1';
export const stableCompare=(a:string,b:string)=>a<b?-1:a>b?1:0;
export const sameValues=(a:number[],b:number[])=>a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<1e-8*Math.max(1,Math.abs(x),Math.abs(b[i])));
type Candidate={id:string;text:string;values:number[];score:number;reason:string;hypothesis:TratioBankHypothesis;model:unknown};
const hypothesis=(type:string,description:string,crossSkills:readonly string[],skill:string):TratioBankHypothesis=>({type,description,crossSkills:[...crossSkills],stage:/method|selection|subtriangle|pythagoras_scope/.test(type)?'routeSelection':'execution',hypothesisOnly:true,repairSkillId:/opposite_pair|sine_ratio/.test(type)&&['TR-SINE','TR-AREA','TR-INTEGRATE'].includes(skill)?'TR-SINE':skill});
function choose(candidates:Candidate[],expected:number[],id:string,text:string){
 const chosen:Candidate[]=[],audit=[];
 for(const c of [...candidates].sort((a,b)=>b.score-a.score||stableCompare(a.id,b.id))){let exclusion:string|null=null;
  if(c.values.some(v=>!Number.isFinite(v)))exclusion='非有限値';else if(sameValues(c.values,expected))exclusion='正答と同値';else if(chosen.some(x=>sameValues(x.values,c.values)))exclusion='上位候補と同値';else if(chosen.length===3)exclusion='文脈スコア上位3つを優先';else chosen.push(c);
  audit.push({...c,selected:exclusion===null,exclusion});
 }
 if(chosen.length!==3)throw new Error(`${id}: meaningful distractors missing`);
 return {audit,choices:[{choiceId:id+':correct',text,values:expected,correct:true,hypothesis:null},...chosen.map(c=>({choiceId:id+':'+c.id,text:c.text,values:c.values,correct:false,hypothesis:c.hypothesis}))]};
}
export function buildTratioBank():TratioBankArtifact{
 const records:TratioBankRecord[]=[];
 for(const family of [1,2,3]){
  const extras=family===1?[3,8]:family===2?[4,5,6,7]:[2,3,7,8,9,10];
  const specs=[...Array.from({length:12},(_,index)=>({index,scale:1,diagram:false})),...extras.map(index=>({index,scale:2,diagram:true}))];
  for(const [position,spec] of specs.entries()){
   const {index,scale,diagram}=spec,skill=family===1?'TR-RIGHT':family===3?'TR-INTEGRATE':([0,3,9,10,11].includes(index)?'TR-SINE':[1,2,6].includes(index)?'TR-COSINE':'TR-AREA');
   let familyId='',sourceVariant='',signature='',prompt='',answer='',thinking='',working:string[]=[],expected:number[]=[],before='',after='',model:unknown,trace:unknown=null,oracle:unknown,requirements:TratioBankRecord['problemRequirements']=[],candidates:Candidate[]=[],tier:TratioBankRecord['difficultyTier']='STANDARD';
   if(family===1){const v=generateRightVariant(index,scale);oracle=validateRightVariant(v);familyId=v.familyId;sourceVariant=v.variantId;signature=v.structureSignature;prompt=v.prompt;answer=v.answer;thinking=v.thinking;working=v.working;expected=v.values;model=v.scene;tier=v.difficulty;requirements=v.problemRequirements.map(r=>({...r,crossSkills:[...r.crossSkills]}));
    if(diagram){prompt=index===3?'はしごABが壁に掛かり、CはBの真下にある。図の長さから、はしごと地面のなす鋭角∠BACを求めよ。':`水平な一直線上にA、B、塔の根元Cがこの順にある。A、Bから塔頂Tを仰ぐ角はそれぞれ30°、60°で、目の高さは無視する。図に示したABの長さから、塔の高さCTと距離BCを求めよ。`;}
    before=rightSceneFigure({...v,prompt});after=rightSceneFigure({...v,prompt},true);
    candidates=v.candidates.map((c,n)=>({id:`${c.type}-${n}`,text:c.text,values:c.values,score:c.diagnosticScore,reason:c.relevance,hypothesis:hypothesis(c.mistakeHypotheses.type,c.mistakeHypotheses.description,c.mistakeHypotheses.crossSkills,skill),model:c.formula}));
   }else if(family===2){const v=generateGeneralVariant(index,scale);oracle=validateGeneral(v);familyId=v.familyId;sourceVariant=v.variantId;signature=v.structureSignature;prompt=v.prompt;answer=v.answer.label;thinking=v.thinking;working=v.working;expected=v.answer.values;model=v.scene;tier=v.difficulty;requirements=v.problemRequirements.map(r=>({...r,crossSkills:[...r.crossSkills]}));
    if(diagram){prompt=index===5?`図の△ABCの面積は24 cm²である。辺b=CAの長さを求めよ。`:`図の△ABCについて、${index===6?'外接円の半径R':'面積S'}を求めよ。辺a=BC、b=CA、c=ABとし、長さの単位はcmとする。`;if(index>=6)tier='PRACTICAL';}
    if(diagram&&index===6){v.scene.target='R';expected=[v.answer.values[1]];answer=v.answer.label.split('、')[1];thinking='外接円の半径を求めるには、角Aに向かい合う辺aが必要です。図から読み取れる2辺と角Aを使うと、その辺まで進めます。';}
    if(diagram&&index===7){
     const g=inspectTriangle(v.scene.coordinates[0]),product=g.a*g.b*g.c;
     expected=[product/(4*v.answer.values[0])];answer=`R=${maxExact(expected[0])} cm`;
     prompt='図の二等辺三角形ABCの外接円の半径Rを求めよ。辺a=BC、b=CA、c=ABとし、長さの単位はcmとする。';
     thinking='半径を求めるには、辺だけでなく角か面積の情報が必要です。二等辺三角形を分けると高さが分かり、面積を経由して半径へつなげられます。';
     working=[...working,`面積と3辺がそろったので、R=abc/(4S)=${maxExact(expected[0])}。これはa/sinA=2RとS=bc sinA/2を結んだ関係です。`,`元の三角形の各辺が直径2R以下であることを確認する。`];
     requirements.push({id:'circumradius_relation',description:'面積と3辺から外接円の半径へつなぐ',crossSkills:['X10','X12']});
     v.scene.circumcircle=true;v.scene.target='R';
    }
    const projected=generalOracle(v.scene);if(!sameValues(expected,projected.values))throw new Error('Production target oracle');oracle={source:oracle,projected:projected.values,pass:true};
    before=generalFigures({...v,prompt,scene:{...v.scene,circumcircle:false}});after=generalFigures({...v,prompt},true);
    candidates=v.candidates.map(c=>({id:c.id,text:diagram&&index===6?c.answer.label.split('、')[1]:c.answer.label,values:diagram&&index===6?[c.answer.values[1]]:c.answer.values,score:c.diagnosticScore,reason:c.reason,hypothesis:hypothesis(c.mistakeHypotheses.type,c.mistakeHypotheses.description,c.mistakeHypotheses.crossSkills,skill),model:c.model}));
    if(diagram&&index===7){const g=inspectTriangle(v.scene.coordinates[0]),product=g.a*g.b*g.c;
     candidates=candidates.map(c=>({...c,values:[product/(4*c.values[0])],text:`R=${maxExact(product/(4*c.values[0]))} cm`,model:{precedingError:c.model,propagation:'R=abc/(4·wrongArea)'}}));
     if(!sameValues(expected,[g.R]))throw new Error('SSS area to R oracle');
     oracle={source:oracle,projected:[g.R],pass:true};
    }
   }else{const v=generateIntegratedTratio(index,scale);oracle=validateIntegrated(v);if(!oracle||!validateIntegrated(v).pass)throw new Error(v.variantId);familyId=v.familyId;sourceVariant=v.variantId;signature=v.structureSignature;prompt=v.prompt;answer=v.answer.label+' '+v.unit;thinking=v.thinking;working=v.working;expected=[v.answer.value];model={scene:v.scene,target:v.target,originalPredicate:v.originalPredicate,components:v.components,candidateConfigurations:v.candidateConfigurations};trace=v.solutionTrace;tier=v.difficulty;requirements=v.problemRequirements.map(r=>({...r,crossSkills:[...r.crossSkills]}));
    if(diagram){
     const omitted=v.scene.knownLengths[0],pair=omitted.ends.join('');
     const re=new RegExp(`${pair}=[^、。]+`);if(!re.test(prompt))throw new Error('No safe diagram transfer');
     prompt=prompt.replace(re,`${pair}の長さは図のとおり`);
    }
    before=integratedTratioFigure({...v,prompt});after=integratedTratioFigure({...v,prompt},true);
    candidates=v.candidates.map(c=>({id:c.id,text:c.answer.label+' '+v.unit,values:[c.answer.value],score:c.diagnosticScore,reason:c.reason,hypothesis:{...hypothesis(c.hypothesis.type,c.hypothesis.description,c.hypothesis.crossSkills,skill),stage:c.hypothesis.stage},model:c.coherentWrongModel}));
   }
   if(diagram&&!requirements.some(r=>r.crossSkills.includes('X09')))requirements.push({id:'read_given_diagram',description:'図から与条件の長さ・角を読み取る',crossSkills:['X09']});
   const id=`TR-BANK-F${family}-${String(position+1).padStart(3,'0')}`,selection=choose(candidates,expected,id,answer),step=family+1;
   if(family===3&&selection.choices.some(c=>c.text.startsWith('約'))){for(const c of selection.choices)c.text=`約${Number(c.values[0].toFixed(6))} ${answer.split(' ').at(-1)}`;}
   records.push({id,unitId:'TRATIO',skillId:skill,topic:'三角比の練習',purpose:'practice',difficulty:tier==='STANDARD'?2:tier==='APPLIED'?3:4,prompt,answer,examAnswer:working.join('\n')+'\n'+answer,solution:working.join('\n'),point:thinking,transfer:'元の図形条件と求める量を照合する',repairSkillId:null,independenceKey:`TRATIO:${signature}`,reviewStatus:'verified-generated',verificationStatus:'verified-generated',familyId,variantId:`${familyId}-bank-v${String(position+1).padStart(2,'0')}`,structureSignature:signature,step,difficultyTier:tier,problemRequirements:requirements,crossSkills:[...new Set(requirements.flatMap(r=>r.crossSkills))],choices:selection.choices,expected,problemFigure:before,solutionFigure:after,explanation:{thinking,steps:working,answer},parameters:{scale,diagramReading:diagram,sourceIndex:index,model},solutionTrace:trace,candidateAudit:selection.audit,validation:{oracle:true,mathematics:true,uniqueChoices:true,diagram:true,rules:['approved-family','safe-parameters','coordinate-oracle','unique-choices','given-diagram','deterministic-ranking','structure-audit']},oracle,generatorVersion:tratioGeneratorVersion,diagramReading:diagram,sourceVariant});
  }
 }
 const signatures:Record<string,number>={},counts:Record<string,number>={};for(const p of records){signatures[p.structureSignature]=(signatures[p.structureSignature]??0)+1;for(const key of [p.familyId,p.difficultyTier,`STEP${p.step}`,p.skillId])counts[key]=(counts[key]??0)+1;}
 const duplicates=records.length-new Set(records.map(p=>p.prompt)).size;
 // One deliberate exception: the already-approved SSA circle/ray structure is
 // represented by its three different existence outcomes, never three coefficients.
 const ssaSignature=generateGeneralVariant(9,1).structureSignature;
 const signatureExceptions={[ssaSignature]:'SSAの0解・1解・2解を1題ずつ。存在判断と採用する角の個数が異なる。係数違いを独立証拠には数えない。'};
 for(const [sig,count] of Object.entries(signatures))if(count>2&&!(sig===ssaSignature&&count===3))throw new Error('Excessive structure repetition: '+sig);
 if(duplicates||records.length!==48||counts.STANDARD!==8||counts.APPLIED!==20||counts.PRACTICAL!==20)throw new Error(JSON.stringify({counts,duplicates,duplicatePrompts:records.filter((p,i)=>records.findIndex(q=>q.prompt===p.prompt)!==i).map(p=>[p.id,p.prompt])}));
 let mathematicalCases=0;for(let i=0;i<12;i++){for(const s of scalePool){validateRightVariant(generateRightVariant(i,s));mathematicalCases++;}for(const s of generalScales){validateGeneral(generateGeneralVariant(i,s));mathematicalCases++;}for(const s of integratedScales){if(!validateIntegrated(generateIntegratedTratio(i,s)).pass)throw new Error('Integrated oracle');mathematicalCases++;}}
 let boundaryCases=0;for(const s of integratedScales){for(const [factor,count] of [[1-1e-6,0],[1,1],[1+1e-6,2]]){if(enumerateSSA(Math.acos(.8)*180/Math.PI,3*s*factor,5*s).length!==count)throw new Error('SSA boundary');boundaryCases++;}for(const [factor,count] of [[1-1e-6,2],[1,1],[1+1e-6,0]]){const ts=areaCandidateCoordinates(4*s,6*s,12*s*s*factor);if(ts.length!==count||ts.some(t=>inspectTriangle(t).area<=0))throw new Error('Area boundary');boundaryCases++;}}
 return {version:tratioGeneratorVersion,records,max:buildTratioMax(),audit:{counts,signatures,signatureExceptions,promptDuplicates:duplicates,mathematicalCases,boundaryCases}};
}
