import type {LearningService} from '../services/learning-service.ts';
import type {LearningCatalog} from '../curriculum/types.ts';

export const verificationStates={
 fresh:'初回起動', 'diagnostic-before':'初回診断開始前', 'diagnostic-during':'初回診断途中',
 'diagnostic-after':'診断完了後', learning:'通常学習', quadratic:'二次関数開始',
 'step-1':'二次関数 STEP 1', 'step-2':'二次関数 STEP 2', 'step-3':'二次関数 STEP 3',
 'step-4':'二次関数 STEP 4', 'step-5':'二次関数 STEP 5', stable:'一部Skill stable',
 repair:'修復中', returned:'修復後の元問題復帰', 'max-before':'MAX挑戦前',
 'max-during':'MAX挑戦中', 'max-achieved':'MAX達成', 'qfn-after':'二次関数MAX後', trig:'三角関数解放後'
} as const;
export type VerificationState=keyof typeof verificationStates;
export function seedVerification(service:LearningService,catalog:LearningCatalog,state:VerificationState){
 if(!Object.hasOwn(verificationStates,state))throw new Error('確認状態が見つかりません。');
 const solve=()=>{service.submission();service.submit('correct');};
 if(state==='fresh'){service.switchProfile('new');return;}
 if(state==='repair'||state==='returned'){
  service.switchProfile('repair');service.continueLearning();
  if(state==='returned'){solve();service.next();solve();service.next();}
  return;
 }
 if(['max-before','max-during','max-achieved','qfn-after','trig'].includes(state)){
  service.switchProfile('qfn-ready');service.navigate('max');
  if(state==='max-before')return;
  service.startMax();if(state==='max-during')return;
  solve();if(state==='max-achieved')return;
  service.next();
  if(state==='trig'){
   const cp=service.exportCheckpoint();
   const seedPrerequisites=(id:string)=>{for(const pre of catalog.master.units.find(u=>u.id===id)!.prerequisites){seedPrerequisites(pre);if(!cp.learner.maxUnits.includes(pre))cp.learner.maxUnits.push(pre);for(const skill of catalog.master.skills.filter(s=>s.unitId===pre))cp.learner.skills[skill.id]='stable';}};
   seedPrerequisites('TRIG');cp.learner.activeUnit=null;service.restoreCheckpoint(cp);
  }
  service.navigate(state==='trig'?'map':'home');return;
 }
 service.switchProfile('quadratic');
 const cp=service.exportCheckpoint();
 if(state.startsWith('diagnostic-')){
  cp.screen='diagnostic';cp.diagUnit=catalog.mainUnitIds.indexOf('QFN');
  cp.diagnosisFinished=state==='diagnostic-after';
  cp.learner.diagnosticCompleted=state==='diagnostic-after';
  cp.learner.diagnosticPending=state==='diagnostic-after'?[]:['QF-INTEGRATE'];
  service.restoreCheckpoint(cp);
  if(state==='diagnostic-during')service.startDiagnostic();
  return;
 }
 const stepSkills=['QF-GRAPH','QF-RANGE','QF-DIFFERENCE','QF-PARAM','QF-INTEGRATE'];
 const live=catalog.master.skills.filter(s=>s.unitId==='QFN'&&!catalog.retiredSkillIds?.includes(s.id));
 const target=state==='stable'?'QF-RANGE':state.startsWith('step-')?stepSkills[Number(state.slice(5))-1]:'QF-GRAPH';
 for(const skill of live){if(skill.id===target)break;cp.learner.skills[skill.id]='stable';}
 service.restoreCheckpoint(cp);
 if(state.startsWith('step-')||state==='learning')service.continueLearning();
}
