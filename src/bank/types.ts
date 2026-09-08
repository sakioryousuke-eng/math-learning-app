import type {Problem} from '../services/catalog.ts';
import type {FamilyParameters} from '../prototype/quadratic-family.ts';
import type {AxisParameters} from '../prototype/quadratic-axis-family.ts';
import type {CountParameters} from '../prototype/quadratic-count-family.ts';
import type {PlacementParameters} from '../prototype/quadratic-placement-family.ts';
import type {QuadraticExpression} from '../prototype/integrated-quadratic-math.ts';
import type {ExplanationGraph} from '../ui/explanation-graph.ts';
import type {DynamicBoundary} from '../ui/dynamic-quadratic.ts';
export type DifficultyTier='FOUNDATION'|'STANDARD'|'APPLIED'|'PRACTICAL';
export interface BankHypothesis {mistakeType:string;description:string;crossSkills:string[];weaknessTags:string[];hypothesisOnly:true}
export interface BankChoice {choiceId:string;text:string;correct:boolean;mistakeType:string|null;mistakeHypotheses:BankHypothesis[]}
export type BankGraphModel={kind:'static';graphs:ExplanationGraph[]}|{kind:'axis';parameters:AxisParameters}|{kind:'count';parameters:CountParameters}|{kind:'placement';parameters:PlacementParameters}|{kind:'extrema';expression:QuadraticExpression;L:number;R:number}|{kind:'horizontal';parameters:PlacementParameters};
export interface BankGraphSpec {model:BankGraphModel;initial:number;parameter:'a'|'k';dynamic:boolean;boundaries:DynamicBoundary[]}
export interface BankRecord extends Problem {
 reviewStatus:'verified-generated';verificationStatus:'verified-generated';problemId:string;familyId:string;variantId:string;unitId:'QFN';step:number;difficultyTier:DifficultyTier;
 structureSignature:string;structureTags:string[];problemRequirements:{id:string;description:string;crossSkills:string[]}[];crossSkills:string[];
 choices:BankChoice[];mistakeHypotheses:BankHypothesis[];graphSpec:BankGraphSpec|null;generatorVersion:string;
 explanation:{thinking:string;steps:string[];answer:string};situation:string;parameters:unknown;solutionTrace?:unknown;
 validation:{safeParameters:true;mathematics:true;oracle:true;uniqueChoices:true;explanation:true;sampleCount:number;rules:string[]};
}
export interface BankArtifact {version:string;records:BankRecord[];rejected:{familyId:string;variantId:string;reason:string}[];audit:{promptDuplicates:number;signatureMaximum:number;answerGroups:{answer:string;ids:string[]}[]}}
export interface GeneratedEvidence {familyId:string;variantId:string;structureSignature:string;structureTags:string[];difficultyTier:DifficultyTier;generatorVersion:string;independenceGroup:string;mistakeType:string|null;mistakeHypotheses:BankHypothesis[];hypothesisOnly:true}
declare module '../math-master/types.ts' {interface Assessment {generatedEvidence?:GeneratedEvidence}}
