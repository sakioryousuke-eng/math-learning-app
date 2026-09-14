import type {Problem} from '../services/catalog.ts';
import type {GeneratedEvidence} from '../bank/types.ts';
export interface TratioBankHypothesis {type:string;description:string;crossSkills:string[];stage:'routeSelection'|'execution';hypothesisOnly:true;repairSkillId:string|null}
export interface TratioBankChoice {choiceId:string;text:string;values:number[];correct:boolean;hypothesis:TratioBankHypothesis|null}
export interface TratioBankRecord extends Problem {
 unitId:'TRATIO';reviewStatus:'verified-generated'|'reviewed';verificationStatus:'verified-generated'|'reviewed';
 familyId:string;variantId:string;structureSignature:string;step:number;difficultyTier:'STANDARD'|'APPLIED'|'PRACTICAL';
 problemRequirements:{id:string;description:string;crossSkills:string[]}[];crossSkills:string[];
 choices:TratioBankChoice[];expected:number[];problemFigure:string;solutionFigure:string;
 explanation:{thinking:string;steps:string[];answer:string};parameters:unknown;solutionTrace:unknown;candidateAudit:unknown;
 validation:{oracle:true;mathematics:true;uniqueChoices:true;diagram:true;rules:string[]};oracle:unknown;
 generatorVersion:string;diagramReading:boolean;sourceVariant:string;
}
export interface TratioBankArtifact {version:string;records:TratioBankRecord[];max:TratioBankRecord[];audit:{counts:Record<string,number>;signatures:Record<string,number>;signatureExceptions:Record<string,string>;promptDuplicates:number;mathematicalCases:number;boundaryCases:number}}
export function tratioGeneratedEvidence(p:TratioBankRecord,id:string):GeneratedEvidence{
 const c=p.choices.find(c=>c.choiceId===id);if(!c)throw new Error('Unknown TRATIO choice');
 return {familyId:p.familyId,variantId:p.variantId,structureSignature:p.structureSignature,structureTags:p.problemRequirements.map(r=>r.id),difficultyTier:p.difficultyTier,generatorVersion:p.generatorVersion,independenceGroup:p.independenceKey,mistakeType:c.hypothesis?.type??null,mistakeHypotheses:c.hypothesis?[{mistakeType:c.hypothesis.type,description:c.hypothesis.description,crossSkills:[...c.hypothesis.crossSkills],weaknessTags:[c.hypothesis.type],hypothesisOnly:true}]:[],hypothesisOnly:true};
}
