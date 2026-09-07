import type {Assessment,Dimension,Rating,ErrorTag} from '../math-master/types.ts';
import type {Problem} from './catalog.ts';
export type MockOutcome='correct'|'calculation'|'case_split'|'prerequisite'|'unreadable';
export const outcomeLabels:Record<MockOutcome,string>={correct:'完全正解',calculation:'方法正しい＋計算ミス',case_split:'場合分け不足',prerequisite:'前提技能不足',unreadable:'判読不能'};
export const causes:Record<MockOutcome,string>={correct:'条件と根拠を保ち、最後の結論まで到達できました。',calculation:'方針は正しいですが、符号や計算に誤りがあります。',case_split:'境界の値を含め、すべての場合を調べる必要があります。',prerequisite:'前提技能の使い方を確認します。1回の誤答だけで修復にはしません。',unreadable:'数字・符号・式の意味が確定できないため、未解決です。読み取れる配置と記述も答案の一部です。'};
export function gradeMock(problem:Problem,outcome:MockOutcome,id:string,at:string,context:Assessment['context']):Assessment {
  const prerequisiteTag:ErrorTag=problem.repairSkillId==='HSX2'?'factorization':problem.repairSkillId==='CAL2'?'fraction':problem.repairSkillId==='CAL1'?'sign':problem.repairSkillId==='EXP2'?'expansion':problem.repairSkillId==='QEQ3'?'condition_omission':'concept';
  const dimensions:Record<Dimension,Rating>={understanding:'success',modeling:'success',method:'success',conditions:'success',calculation:'success',expression:'success',conclusion:'success'};
  if(outcome==='calculation'){dimensions.calculation='partial';dimensions.conclusion='failure';}
  if(outcome==='case_split'){dimensions.conditions='failure';dimensions.conclusion='failure';}
  if(outcome==='prerequisite'){dimensions.calculation='failure';dimensions.conclusion='failure';}
  if(outcome==='unreadable')for(const key of Object.keys(dimensions) as Dimension[])dimensions[key]='unobserved';
  return {id,problemId:problem.id,skillId:problem.skillId,at,context,solved:outcome==='correct',readable:outcome!=='unreadable',independent:true,integration:context==='diagnostic'||context==='max',tags:outcome==='correct'?[]:outcome==='calculation'?['sign']:outcome==='case_split'?['case_split']:outcome==='prerequisite'?[prerequisiteTag]:['handwriting_unreadable'],dimensions,crossSkills:outcome==='unreadable'?{}:{X11:dimensions.method,X06:dimensions.conditions,X13:dimensions.conclusion}};
}
