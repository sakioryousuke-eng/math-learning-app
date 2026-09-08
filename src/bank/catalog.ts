import artifact from '../../data/qfn-bank.json' with {type:'json'};
import type {BankArtifact} from './types.ts';
import type {Curriculum,ReviewedLesson} from '../curriculum/types.ts';
import {paperCurriculum} from '../grading/paper-choices.ts';
import {validateCurriculum} from '../curriculum/validate.ts';
// This static artifact is regenerated and independently checked by build-qfn-bank.ts.
// No question generators run to construct the production bank in the browser.
export const bankArtifact=artifact as BankArtifact;
export const bankRecords=bankArtifact.records;
export const bankById=new Map(bankRecords.map(p=>[p.id,p]));
const metadata:ReviewedLesson[]=bankRecords.map(problem=>({problem,step:problem.step,situation:problem.situation,roles:[problem.step===5?'integration':'basic'],review:{status:'verified-generated',method:problem.generatorVersion,checks:problem.validation.rules}}));
// Keep the additive catalog version: all previously saved IDs remain available.
export const bankCurriculum:Curriculum={...paperCurriculum,generatedBank:bankRecords,problems:[...paperCurriculum.problems,...bankRecords],lessonMetadata:[...paperCurriculum.lessonMetadata??[],...metadata],problemGuides:[...paperCurriculum.problemGuides,...bankRecords.map(p=>({problemId:p.id,roles:metadata.find(m=>m.problem.id===p.id)!.roles,hideMethodLabel:p.step===5||p.difficultyTier==='PRACTICAL',reviewStatus:p.reviewStatus}))]};
validateCurriculum(bankCurriculum);
