import {decodeDocument,PersistenceError} from '../persistence/model.ts';
import {legacyCatalog} from '../services/catalog.ts';
import {curriculum as previous} from './master.ts';
import type {LearningCatalog} from './types.ts';
export function migrateDocument(raw:unknown,namespace:string,target:LearningCatalog,at:string){
 if(typeof raw!=='object'||raw===null||!('curriculumVersion'in raw))return decodeDocument(raw,namespace,target);
 if(raw.curriculumVersion===target.version)return decodeDocument(raw,namespace,target);
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
