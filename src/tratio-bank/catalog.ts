import artifact from '../../data/tratio-bank.json' with {type:'json'};
import type {TratioBankArtifact} from './types.ts';
import {tratioCurriculum,appPaperSpecs} from '../tratio/catalog.ts';
import type {Curriculum,ReviewedLesson} from '../curriculum/types.ts';
import type {PaperSpec,PaperCheck} from '../grading/paper-choices.ts';
import {ordinaryChecks} from '../grading/paper-choices.ts';
import {validateCurriculum} from '../curriculum/validate.ts';
export const tratioBankArtifact=artifact as TratioBankArtifact;
export const tratioBankRecords=tratioBankArtifact.records;
export const tratioMaxRecords=tratioBankArtifact.max;
export const tratioBankById=new Map([...tratioBankRecords,...tratioMaxRecords].map(p=>[p.id,p]));
const strictChecks:PaperCheck[]=[...ordinaryChecks,
 {id:'no-hint',label:'ヒントや方法の助言を使わずに解いた',dimension:'method'},
 {id:'no-answer',label:'解答・解説を見る前に、紙の答案を完成させた',dimension:'method'},
 {id:'not-guess',label:'選択肢から偶然選んだのではなく、自分の答案と一致する',dimension:'method'},
 {id:'complete',label:'必要な中間量・根拠・すべての候補と結論を紙に書いた',dimension:'expression'},
 {id:'original',label:'元の図形の条件、候補の存在、辺と角の対応を確認した',dimension:'conditions'},
 {id:'readable',label:'答案全体を他の人が読み取れるように書いた',dimension:'expression'}];
export const productionTratioPaperSpecs:Record<string,PaperSpec>={...appPaperSpecs,...Object.fromEntries([...tratioBankRecords,...tratioMaxRecords].map(p=>[p.id,{
 problemId:p.id,choices:p.choices.map(c=>({choiceId:c.choiceId,text:c.text,correct:c.correct,mistakeType:c.correct?null:'condition_omission'})),
 checks:p.purpose==='max'?strictChecks:[...ordinaryChecks],insufficient:p.purpose==='max'?['答えだけの一致や偶然の選択はMAX成功にしません。必要な根拠と候補を紙に残してください。']:[]
} satisfies PaperSpec]))};
const metadata:ReviewedLesson[]=[...tratioBankRecords,...tratioMaxRecords].map(problem=>({problem,step:problem.step,situation:problem.structureSignature,roles:problem.purpose==='max'?['max']:problem.step===4?['integration']:['basic'],review:{status:problem.reviewStatus,method:problem.generatorVersion,checks:problem.validation.rules}}));
export const productionTratioCurriculum:Curriculum={...tratioCurriculum,version:'math-v0.8-tratio-bank',tratioSingleMax:true,tratioBank:[...tratioBankRecords,...tratioMaxRecords],choiceSpecs:productionTratioPaperSpecs,
 problems:[...tratioCurriculum.problems,...tratioBankRecords,...tratioMaxRecords],lessonMetadata:[...tratioCurriculum.lessonMetadata??[],...metadata],
 problemGuides:[...tratioCurriculum.problemGuides,...metadata.map(m=>({problemId:m.problem.id,roles:m.roles,hideMethodLabel:true,reviewStatus:m.review.status}))]};
validateCurriculum(productionTratioCurriculum);
