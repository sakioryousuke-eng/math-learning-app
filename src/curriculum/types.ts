import type {Master} from '../math-master/types.ts';
import type {Problem} from '../services/catalog.ts';
export interface StablePolicy {minimum:number; situations:number; requiredSituationGroups?:string[][]; dimensions:('method'|'conditions'|'calculation'|'conclusion')[]}
export interface GraphSpec {curves:[number,number,number][];domain:[number,number];view:[number,number,number,number];features:string[];note?:string;restricted?:boolean}
export interface ReviewedLesson {
 problem:Problem; step:number; situation:string; roles:('introduction'|'basic'|'repair'|'integration'|'max')[];
 graph?:GraphSpec; introduction?:{trial:string;need:string;tool:string;returnToProblem:string};
 review:{status:'reviewed';method:string;checks:string[]};
}
export type Lane='MAIN'|'EXTRA'|'ANOTHER';
export type IntroductionType='need_driven'|'direct'|'usable_rule'|'theory_recovery';
export type ProblemRole='introduction'|'basic'|'repair'|'integration'|'max';
export interface UnitGuide {unitId:string;world:string;lane:Lane;requiredMax:string[];introduction:IntroductionType;entry:string;coverage:string[];theoryRecoveredIn:string|null;max:{meaning:string;minutes:number;writing:boolean;noHint:boolean;noMethodLabel:boolean;template:string;reviewStatus:'representative_unvalidated'};}
export interface SkillGuide {skillId:string;introduction:IntroductionType;coverage:string[];phase:'knowledge'|'selection'|'integration';crossSkillIds:string[];}
export interface ProblemGuide {problemId:string;roles:ProblemRole[];hideMethodLabel:boolean;reviewStatus:'legacy'|'representative_unvalidated'|'unreviewed'|'reviewed';}
export interface LearningCatalog {master:Master;problems:Problem[];version:string;mainUnitIds:string[];reviewedOnly?:boolean;retiredSkillIds?:string[];stablePolicies?:Record<string,StablePolicy>;lessonMetadata?:ReviewedLesson[];}
export interface Curriculum extends LearningCatalog {units:UnitGuide[];skills:SkillGuide[];problemGuides:ProblemGuide[];}
