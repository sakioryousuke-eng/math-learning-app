import {paperSpecs,ordinaryChecks} from '../grading/paper-choices.ts';
import type {PaperSpec} from '../grading/paper-choices.ts';
import type {BankRecord,GeneratedEvidence} from './types.ts';
import {bankRecords} from './catalog.ts';
export const allPaperSpecs:Record<string,PaperSpec>={...paperSpecs,...Object.fromEntries(bankRecords.map(p=>[p.id,{problemId:p.id,choices:p.choices.map(c=>({choiceId:c.choiceId,text:c.text,correct:c.correct,mistakeType:null})),checks:[...ordinaryChecks],insufficient:[]} satisfies PaperSpec]))};
export function generatedEvidence(p:BankRecord,choiceId:string):GeneratedEvidence{
 const choice=p.choices.find(c=>c.choiceId===choiceId);if(!choice)throw new Error('Unknown bank choice');
 return {familyId:p.familyId,variantId:p.variantId,structureSignature:p.structureSignature,structureTags:[...p.structureTags],difficultyTier:p.difficultyTier,generatorVersion:p.generatorVersion,independenceGroup:p.independenceKey,mistakeType:choice.mistakeType,mistakeHypotheses:structuredClone(choice.mistakeHypotheses),hypothesisOnly:true};
}
