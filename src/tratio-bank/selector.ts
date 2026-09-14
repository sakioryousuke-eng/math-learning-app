import type {LearningCatalog} from '../curriculum/types.ts';
import type {Learner} from '../math-master/types.ts';
import type {Problem} from '../services/catalog.ts';
// Structure evidence is correlated across families when the requirements and
// mathematical structure coincide. Coefficient changes never add independence.
export function tratioMaxReady(c:LearningCatalog,p:Learner){
 const skills=c.master.skills.filter(s=>s.unitId==='TRATIO'&&!c.retiredSkillIds?.includes(s.id));
 return c.tratioSingleMax===true&&skills.length===7&&skills.every(s=>p.skills[s.id]==='stable')&&!p.repair&&!p.resume;
}
export function selectTratioPractice(c:LearningCatalog,p:Learner,skill:string,pool:Problem[],used:string[],preMax=false):Problem|undefined{
 const bank=c.tratioBank?.filter(b=>b.purpose==='practice'&&b.skillId===skill);if(!bank?.length)return;
 const history=p.assessments.filter(a=>a.skillId===skill&&a.context==='practice');
 const reviewed=pool.filter(q=>q.reviewStatus==='reviewed');
 // Introduction must be completed independently before generated repetition.
 const intro=history.some(a=>a.solved&&a.independent&&a.dimensions.method==='success'&&reviewed.some(q=>q.id===a.problemId));
 if(!intro&&p.skills[skill]!=='stable')return reviewed.find(q=>!used.includes(q.id))??reviewed.find(q=>q.id!==used.at(-1))??reviewed[0];
 const afterFailure=history.slice(history.findLastIndex(a=>!a.solved)+1).filter(a=>a.solved&&a.independent);
 const structures=new Set(afterFailure.map(a=>c.problems.find(q=>q.id===a.problemId)?.independenceKey));
 const recent=history.slice(-5),weak=new Set(recent.filter(a=>!a.solved).flatMap(a=>a.tratioEvidence?.crossSkills??[]));
 const target=weak.size?0:preMax||p.skills[skill]==='stable'?2:structures.size>=2?1:0;
 const tiers=['STANDARD','APPLIED','PRACTICAL'],byId=new Map(bank.map(q=>[q.id,q])),last=byId.get(used.at(-1)??'');
 const encountered=new Set(history.map(a=>byId.get(a.problemId)?.structureSignature)),recentStructures=new Set(used.slice(-4).map(id=>byId.get(id)?.structureSignature));
 const score=(q:Problem)=>{const b=byId.get(q.id);return (q.id===used.at(-1)?-1000:0)+(used.slice(-4).includes(q.id)?-200:0)+(used.includes(q.id)?-15:0)+(b?15:0)-Math.abs((b?tiers.indexOf(b.difficultyTier):0)-target)*35+(b?.familyId===last?.familyId&&b?-10:0)+(b&&recentStructures.has(b.structureSignature)?-70:0)+(b&&!encountered.has(b.structureSignature)?25:0)+(b?b.crossSkills.filter(x=>weak.has(x)).length*15:0);};
 return [...pool].sort((a,b)=>score(b)-score(a)||(a.id<b.id?-1:a.id>b.id?1:0))[0];
}

export function tratioStrictEvidence(c:LearningCatalog,p:Learner,at:string){
 const ids=new Set(c.tratioBank?.filter(q=>q.purpose==='max'&&q.reviewStatus==='reviewed').map(q=>q.id));
 return (p.maxAttempts.TRATIO??[]).filter(a=>ids.has(a.problemId)&&a.at<=at&&a.noHint&&a.noMethodSpecified&&a.independent&&a.examQuality&&a.practicalTime&&a.correctConclusion&&a.readable&&a.sufficientWriting);
}
