import {decodeDocument,PersistenceError} from '../persistence/model.ts';
import {legacyCatalog} from '../services/catalog.ts';
import type {LearningCatalog} from './types.ts';
export function migrateDocument(raw:unknown,namespace:string,target:LearningCatalog,at:string){
 if(typeof raw!=='object'||raw===null||!('curriculumVersion'in raw))return decodeDocument(raw,namespace,target);
 if(raw.curriculumVersion===target.version)return decodeDocument(raw,namespace,target);
 if(raw.curriculumVersion!==legacyCatalog.version||target.version!=='math-v0.5-full')throw new PersistenceError('CURRICULUM','未対応の教材移行です。保存データを保持して停止します。');
 const old=decodeDocument(raw,namespace,legacyCatalog),next=structuredClone(old);
 next.migration={from:old.curriculumVersion,to:target.version,at,previousCheckpoint:structuredClone(old.checkpoint)};
 for(const s of target.master.skills)if(!(s.id in next.checkpoint.learner.skills))next.checkpoint.learner.skills[s.id]='unseen';
 next.curriculumVersion=target.version;
 // IDs, attempts, repair return point, sessions and EXP remain intact. The caller saves once with revision CAS.
 return decodeDocument(next,namespace,target);
}
