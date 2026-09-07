import {loadMaster} from './math-master/load.ts';
import {createLearner} from './math-master/learner.ts';
import {completeDiagnostic} from './math-master/diagnosis.ts';
import {startUnit,unitStatus} from './math-master/unlock.ts';
import {submitMax} from './math-master/max.ts';
import {selectTask} from './learning/task-selector.ts';
const m=loadMaster(),p=createLearner(m);
console.log('初回:',selectTask(m,p));
completeDiagnostic(m,p,[]);startUnit(m,p,'CAL');
console.log('診断後:',selectTask(m,p));
for(const day of [7,8,9]) {
 const acquired=submitMax(m,p,'CAL',{problemId:`cal-integration-${day}`,independenceKey:`independent-${day}`,at:`2026-09-${String(day).padStart(2,'0')}T01:00:00Z`,noHint:true,noMethodSpecified:true,independent:true,examQuality:true,practicalTime:true,correctConclusion:true,readable:true,sufficientWriting:true});
 console.log(`独立成功 ${day-6} 回:`,acquired?'実戦投入可能・MAX':'証拠を蓄積');
}
console.log('式変形基礎:',unitStatus(m,p,'EXP'));
console.log('次の課題:',selectTask(m,p));
console.log('数学力:',p.maxUnits,'人間力EXP:',p.humanExp);
