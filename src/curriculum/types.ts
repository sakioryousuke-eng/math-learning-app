import type {Master} from '../math-master/types.ts';
import type {Problem} from '../services/catalog.ts';
export type Lane='MAIN'|'EXTRA'|'ANOTHER';
export type IntroductionType='need_driven'|'direct'|'usable_rule'|'theory_recovery';
export type ProblemRole='introduction'|'basic'|'repair'|'integration'|'max';
export interface UnitGuide {unitId:string;world:string;lane:Lane;requiredMax:string[];introduction:IntroductionType;entry:string;coverage:string[];theoryRecoveredIn:string|null;max:{meaning:string;minutes:number;writing:boolean;noHint:boolean;noMethodLabel:boolean;template:string;reviewStatus:'representative_unvalidated'};}
export interface SkillGuide {skillId:string;introduction:IntroductionType;coverage:string[];phase:'knowledge'|'selection'|'integration';crossSkillIds:string[];}
export interface ProblemGuide {problemId:string;roles:ProblemRole[];hideMethodLabel:boolean;reviewStatus:'legacy'|'representative_unvalidated';}
export interface LearningCatalog {master:Master;problems:Problem[];version:string;mainUnitIds:string[];}
export interface Curriculum extends LearningCatalog {units:UnitGuide[];skills:SkillGuide[];problemGuides:ProblemGuide[];}
