import {decodeDocument,PersistenceError} from '../persistence/model.ts';
import {legacyCatalog} from '../services/catalog.ts';
import {curriculum as previous} from './master.ts';
import type {LearningCatalog} from './types.ts';
import {bankCurriculum} from '../bank/catalog.ts';
import type {LearningDocument} from '../persistence/model.ts';
export function migrateDocument(raw:unknown,namespace:string,target:LearningCatalog,at:string):LearningDocument{
 if(typeof raw!=='object'||raw===null||!('curriculumVersion'in raw))return decodeDocument(raw,namespace,target);
 if(raw.curriculumVersion===target.version)return decodeDocument(raw,namespace,target);
 if(target.version==='math-v0.7-tratio-reviewed'){
  const old=migrateDocument(raw,namespace,bankCurriculum,at),next=structuredClone(old);
  next.migration={from:old.curriculumVersion,to:target.version,at,previousCheckpoint:structuredClone(old.checkpoint)};
  const retired=new Set(bankCurriculum.master.skills.filter(s=>s.unitId==='TRATIO').map(s=>s.id)),c=next.checkpoint;
  for(const s of target.master.skills)if(!(s.id in c.learner.skills))c.learner.skills[s.id]='unseen';
  // Keep original evidence in the migration snapshot; untrusted old TRATIO is not proof of new mastery.
  c.learner.maxUnits=c.learner.maxUnits.filter(id=>id!=='TRATIO');
  if(c.current&&retired.has(bankCurriculum.problems.find(p=>p.id===c.current?.problemId)?.skillId??'')){c.current=null;c.result=null;c.screen='home';}
  if(c.practiceFocus&&retired.has(c.practiceFocus))c.practiceFocus=null;
  if(c.learner.lastSkillId&&retired.has(c.learner.lastSkillId)){c.learner.lastSkillId=null;c.learner.warmupRemaining=0;}
  if(c.learner.repair&&retired.has(c.learner.repair.sourceSkillId))c.learner.repair=null;
  if(c.learner.resume&&retired.has(c.learner.resume.skillId))c.learner.resume=null;
  c.learner.diagnosticPending=c.learner.diagnosticPending.map(id=>retired.has(id)?'TR-UNIT':id);
  next.curriculumVersion=target.version;c.notice='三角比の新教材を追加しました。旧TRATIOの履歴は保持していますが、新教材の習熟証拠には使いません。';
  return decodeDocument(next,namespace,target);
 }
 if(target.version==='math-v0.6-qf-reviewed'&&(raw.curriculumVersion===previous.version||raw.curriculumVersion===legacyCatalog.version)){
  const old=decodeDocument(raw,namespace,raw.curriculumVersion===previous.version?previous:legacyCatalog),next=structuredClone(old);
  next.migration={from:old.curriculumVersion,to:target.version,at,previousCheckpoint:structuredClone(old.checkpoint)};
  for(const s of target.master.skills)if(!(s.id in next.checkpoint.learner.skills))next.checkpoint.learner.skills[s.id]='unseen';
  next.curriculumVersion=target.version;
  next.checkpoint.notice='教材を更新しました。新技能は個別に確認します。旧教材の履歴とMAXは保持しています。未検証の中断問題は再出題を保留します。';
  if(next.checkpoint.current&&target.problems.find(p=>p.id===next.checkpoint.current?.problemId)?.reviewStatus!=='reviewed')next.checkpoint.screen='home';
  return decodeDocument(next,namespace,target);
 }
 if(raw.curriculumVersion!==legacyCatalog.version||target.version!=='math-v0.5-full')throw new PersistenceError('CURRICULUM','未対応の教材移行です。保存データを保持して停止します。');
 const old=decodeDocument(raw,namespace,legacyCatalog),next=structuredClone(old);
 next.migration={from:old.curriculumVersion,to:target.version,at,previousCheckpoint:structuredClone(old.checkpoint)};
 for(const s of target.master.skills)if(!(s.id in next.checkpoint.learner.skills))next.checkpoint.learner.skills[s.id]='unseen';
 next.curriculumVersion=target.version;
 // IDs, attempts, repair return point, sessions and EXP remain intact. The caller saves once with revision CAS.
 return decodeDocument(next,namespace,target);
}
