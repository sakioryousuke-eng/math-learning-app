import type {LearningCatalog} from '../curriculum/types.ts';
import type {Assessment,Learner} from '../math-master/types.ts';
import type {Problem} from '../services/catalog.ts';
export function canUse(c:LearningCatalog,p:Problem,context:Assessment['context']){
 if(!c.reviewedOnly)return true;
 if(p.reviewStatus!=='reviewed')return false;
 const roles=c.lessonMetadata?.find(l=>l.problem.id===p.id)?.roles??[];
 return context==='repair'?roles.includes('repair'):context==='max'?roles.includes('max'):context==='diagnostic'?roles.includes('integration')||roles.includes('basic'):roles.includes('basic')||roles.includes('integration');
}
export function stableReady(c:LearningCatalog,skillId:string,assessments:Assessment[]){
 const history=assessments.filter(a=>a.skillId===skillId&&a.context!=='warmup');
 const recent=history.slice(history.findLastIndex(a=>!a.solved)+1);
 const policy=c.stablePolicies?.[skillId];
 const success=recent.filter(a=>a.solved&&a.readable&&a.independent&&(!policy||policy.dimensions.every(d=>a.dimensions[d]==='success'))&&(!c.reviewedOnly||c.problems.some(p=>p.id===a.problemId&&p.reviewStatus==='reviewed')));
 const unique=new Map(success.map(a=>[c.problems.find(p=>p.id===a.problemId)?.independenceKey??a.problemId,a]));
 if(unique.size<(policy?.minimum??2))return false;
 const situations=new Set([...unique.values()].map(a=>c.lessonMetadata?.find(l=>l.problem.id===a.problemId)?.situation).filter(Boolean));
 return !policy||(situations.size>=policy.situations&&(policy.requiredSituationGroups??[]).every(group=>group.some(s=>situations.has(s))));
}
// Keep timestamps and all attempts for daily limits. Retired material is not new MAX evidence.
export function eligibleEvidenceLearner(c:LearningCatalog,p:Learner):Learner{
 if(!c.reviewedOnly)return p;
 const view=structuredClone(p);
 for(const a of [...Object.values(view.maxAttempts).flat(),...Object.values(view.diagnosticMaxEvidence).flat()]){
  if(!c.problems.some(problem=>problem.id===a.problemId&&problem.reviewStatus==='reviewed'))a.examQuality=false;
 }
 return view;
}
