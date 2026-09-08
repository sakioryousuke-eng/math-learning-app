import type {Problem} from '../services/catalog.ts';
import type {Point} from './math.ts';
export interface TratioFigure {kind:'unit'|'polygon';theta?:number;points?:{name:string;xy:Point}[];edges?:[string,string,string?][];auxiliary?:[string,string][];labels?:{at:Point;text:string}[];circle?:{center:Point;radius:number};caption:string;essential?:boolean}
export interface TratioRequirement {id:string;description:string;crossSkills:string[]}
export interface TratioMistake {type:string;description:string;crossSkills:string[];repairSkillId:string|null}
export interface TratioChoice {choiceId:string;text:string;correct:boolean;values:(number|null)[];hypothesis:TratioMistake|null}
export interface TratioLesson {problem:Problem;step:number;kind:'normal'|'repair'|'max-prototype';thinking:string;working:string[];figure?:TratioFigure;introduction?:string;requirements:TratioRequirement[];choices:TratioChoice[];expected:(number|null)[];compute:()=> (number|null)[];model:string;review:{status:'reviewed';checks:string[]}}
export interface TratioEvidence {choiceId:string;mistakeType:string|null;description:string|null;crossSkills:string[];repairSkillId:string|null;hypothesisOnly:true}
declare module '../math-master/types.ts' {interface Assessment {tratioEvidence?:TratioEvidence}}
