import type {LearningCatalog} from '../curriculum/types.ts';
import type {Learner} from '../math-master/types.ts';
import type {Problem} from '../services/catalog.ts';
const tiers=['FOUNDATION','STANDARD','APPLIED','PRACTICAL'];
export function selectQfnPractice(c:LearningCatalog,learner:Learner,skillId:string,pool:Problem[],used:string[],preMax=false):Problem|undefined{
 const rows=c.generatedBank?.filter(p=>p.skillId===skillId);if(!rows?.length)return;
 const history=learner.assessments.filter(a=>a.skillId===skillId&&a.context==='practice');
 const recentSuccess=history.slice(history.findLastIndex(a=>!a.solved)+1).filter(a=>a.solved).length;
 const target=preMax?3:learner.skills[skillId]==='stable'?2:recentSuccess>=1?1:0;
 const recent=used.slice(-5),last=recent.at(-1),byId=new Map(c.generatedBank!.map(p=>[p.id,p]));
 const lastBank=last?byId.get(last):undefined;
 const required=c.stablePolicies?.[skillId]?.requiredSituationGroups??[];
 const observed=new Set(history.filter(a=>a.solved).map(a=>c.lessonMetadata?.find(l=>l.problem.id===a.problemId)?.situation));
 const missing=required.filter(g=>!g.some(s=>observed.has(s))).flat();
 const score=(p:Problem)=>{const b=byId.get(p.id),t=b?tiers.indexOf(b.difficultyTier):Math.min(1,p.difficulty-1),situation=c.lessonMetadata?.find(l=>l.problem.id===p.id)?.situation;
  return (p.id===last?-1000:0)+(recent.includes(p.id)?-180:0)+(used.includes(p.id)?-12:0)-Math.abs(t-target)*25+(b?8:0)+(b?.familyId===lastBank?.familyId&&b?-15:0)+(b?.structureSignature===lastBank?.structureSignature&&b?-55:0)+(situation&&missing.includes(situation)?35:0);
 };
 return [...pool].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0];
}
