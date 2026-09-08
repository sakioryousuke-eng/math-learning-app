import {legacyCatalog} from './catalog.ts';
import {paperSpecs,choiceAssessment} from '../grading/paper-choices.ts';
import type {LearningCatalog} from '../curriculum/types.ts';
import type {Problem} from './catalog.ts';
import {gradeMock,causes} from './mock-grader.ts';
import type {MockOutcome} from './mock-grader.ts';
import type {Learner,Assessment,MaxAttempt} from '../math-master/types.ts';
import {createLearner,recordBehavior,beginSession} from '../math-master/learner.ts';
import {recordAssessment,confirmStable,completeDiagnostic,planDiagnosticFollowup,repairCandidates} from '../math-master/diagnosis.ts';
import {beginRepair,finishRepair} from '../math-master/repair.ts';
import {unitStatus,startUnit} from '../math-master/unlock.ts';
import {maxEvidence,submitMax} from '../math-master/max.ts';
import {selectTask} from '../learning/task-selector.ts';
import {validateReceipt,GradingError} from '../grading/schema.ts';
import type {GradingReceipt,TechnicalCode} from '../grading/schema.ts';
import {toAssessment,toMaxAttempt} from '../grading/adapter.ts';
import {gradingProblem} from '../grading/problems.ts';
import {japanDay} from '../application/clock.ts';
import {canUse,stableReady,eligibleEvidenceLearner} from '../learning/material-policy.ts';
export type Screen='diagnostic'|'home'|'problem'|'submission'|'result'|'explanation'|'map'|'records'|'max';
export type Profile='new'|'quadratic'|'repair'|'max-two'|'qfn-ready'|'complete';
export const profileLabels:Record<Profile,string>={new:'A 初回利用者',quadratic:'B 二次関数 攻略途中',repair:'C 因数分解 修復中','max-two':'D 二次方程式 MAX 2/3','qfn-ready':'E 二次関数 MAX直前',complete:'F 二次関数 MAX済み'};
interface Current {problemId:string;context:Assessment['context'];probe:boolean}
interface Result {assessment:Assessment;outcome:MockOutcome;cause:string;notice:string;acquired:boolean;repaired:boolean;stable:boolean}
const dateKey=japanDay;
export class LearningService {
  private learner:Learner;
  private catalog:LearningCatalog;
  private get master(){return this.catalog.master;}
  private paperMax(unitId:string){return this.catalog.paperChoiceGrading===true&&unitId==='QFN';}
  private get problems(){return this.catalog.problems;}
  private get routeMaster(){return {...this.master,skills:this.master.skills.filter(s=>!this.catalog.retiredSkillIds?.includes(s.id)),units:this.master.units.filter(u=>this.catalog.mainUnitIds.includes(u.id)||u.id===this.learner.activeUnit)};}
  private get diagnosticUnits(){return this.master.units.filter(u=>this.catalog.mainUnitIds.includes(u.id));}
  private screen:Screen='diagnostic';
  private current:Current|null=null;
  private result:Result|null=null;
  private profile:Profile='new';
  private clock=Date.parse('2026-09-07T03:00:00Z');
  private serial=0;
  private used:string[]=[];
  private diagUnit=0;
  private passed:{unitId:string;assessmentIds:string[]}[]=[];
  private diagIds:string[]=[];
  private diagnosisFinished=false;
  private diagPlacement:string|null=null;
  private practiceFocus:string|null=null;
  private ended=false;
  private notice='';
  private devMode:boolean;
  private realToken='';
  private realStartedAt=0;
  private realSubmittedAt:number|null=null;
  private realEvaluations:GradingReceipt[]=[];
  private technicalErrors:{at:string;code:TechnicalCode}[]=[];
  private hintedProblems:string[]=[];
  showIntroduction(){if(!this.current||this.current.context==='max')throw new Error('導入説明はこの問題では利用できません。');if(!this.hintedProblems.includes(this.current.problemId))this.hintedProblems.push(this.current.problemId);}
  constructor(devMode=true,catalog:LearningCatalog=legacyCatalog){this.devMode=devMode;this.catalog=catalog;this.learner=createLearner(catalog.master);}
  chooseUnit(unitId:string,mode:'learn'|'max'='learn'){if(!this.learner.diagnosticCompleted||this.current&&!this.result)throw new Error("現在の問題を完了してください。");startUnit(this.master,this.learner,unitId);this.current=null;this.result=null;this.practiceFocus=null;if(mode==='max')this.screen='max';else this.continueLearning();}
  exportCheckpoint(){return structuredClone({learner:this.learner,screen:this.screen,current:this.current,result:this.result,profile:this.profile,clock:this.clock,serial:this.serial,used:this.used,diagUnit:this.diagUnit,passed:this.passed,diagIds:this.diagIds,diagnosisFinished:this.diagnosisFinished,diagPlacement:this.diagPlacement,practiceFocus:this.practiceFocus,ended:this.ended,notice:this.notice,realToken:this.realToken,realStartedAt:this.realStartedAt,realSubmittedAt:this.realSubmittedAt,realEvaluations:this.realEvaluations,technicalErrors:this.technicalErrors,hintedProblems:this.hintedProblems});}
  restoreCheckpoint(checkpoint:ReturnType<LearningService['exportCheckpoint']>){Object.assign(this,structuredClone(checkpoint));}
  synchronizeClock(at:number){if(!Number.isFinite(at))throw new Error('Invalid clock');this.clock=Math.max(this.clock,at);}
  setInitialClock(at:number,learnerId:string){this.clock=at;this.learner.id=learnerId;}
  recordLearningStart(eventId:string){recordBehavior(this.learner,`start:${eventId}`);}
  beginPersistedSession(){
    // Interrupted diagnosis/problem/repair has priority over a new warmup.
    if(this.current||this.learner.repair||this.learner.resume||!this.learner.diagnosticCompleted)return;
    if(this.learner.lastSkillId)beginSession(this.learner);
  }
  get snapshot(){
    const p=this.learner,task=selectTask(this.routeMaster,p);
    const unitId=p.activeUnit??this.routeMaster.units.find(u=>unitStatus(this.master,p,u.id)==='OPEN')?.id??null;
    const policy=unitId?this.master.maxDefinitions.find(d=>d.unitId===unitId)!:null;
    const evidence=unitId?maxEvidence(this.master,eligibleEvidenceLearner(this.catalog,p),unitId,this.now):[];
    const attempts=unitId?[...(p.maxAttempts[unitId]??[]),...(p.diagnosticMaxEvidence[unitId]??[])]:[];
    const usedToday=attempts.filter(a=>dateKey(a.at)===dateKey(this.now)).length;
    const availableMax=unitId?this.nextMax(unitId):null;
    return structuredClone({learner:p,screen:this.screen,current:this.current,result:this.result,profile:this.profile,devMode:this.devMode,now:this.now,task,unitId,policy,evidence,usedToday,availableMax:availableMax?.id??null,problem:this.current?this.problem(this.current.problemId):null,notice:this.notice,ended:this.ended,diagnosisFinished:this.diagnosisFinished,diagUnit:this.diagUnit,diagPlacement:this.diagPlacement,practiceFocus:this.practiceFocus,realToken:this.realToken,realEvaluations:this.realEvaluations,technicalErrors:this.technicalErrors,hintedProblems:this.hintedProblems});
  }
  private get now(){return new Date(this.clock).toISOString();}
  private id(){return `event-${++this.serial}`;}
  private problem(id:string):Problem{const p=this.problems.find(p=>p.id===id);if(!p)throw new Error('問題が見つかりません。');return p;}
  private practice(skillId:string,context:Assessment['context']='practice'):Problem {
    const pool=this.problems.filter(p=>p.skillId===skillId&&p.purpose==='practice'&&canUse(this.catalog,p,context));
    const previous=this.current?.problemId??this.used.at(-1);
    const next=pool.find(p=>!this.used.includes(p.id))??pool.find(p=>p.id!==previous);
    if(!next)throw new Error('この技能は教材の数学的確認待ちです。検証済みの別問題がそろうまで学習を保留します。');return next;
  }
  private nextMax(unitId:string):Problem|undefined {
    const seen=this.learner.maxAttempts[unitId]??[];
    const pool=this.problems.filter(p=>p.purpose==='max'&&canUse(this.catalog,p,'max')&&this.master.skills.find(s=>s.id===p.skillId)?.unitId===unitId);
    return pool.find(p=>!seen.some(a=>a.problemId===p.id))??(this.paperMax(unitId)?pool.find(p=>p.id!==seen.at(-1)?.problemId):undefined);
  }
  navigate(screen:'home'|'map'|'records'|'max'){
    if(screen==='home'&&!this.learner.diagnosticCompleted){this.screen='diagnostic';return;}
    this.screen=screen;
  }
  private open(problem:Problem,context:Assessment['context'],probe=false){
    if(!canUse(this.catalog,problem,context))throw new Error('この問題は教材確認待ちです。保存された履歴と復帰先は保持しています。');
    this.realToken=crypto.randomUUID();this.realStartedAt=Date.now();this.realSubmittedAt=null;
    this.current={problemId:problem.id,context,probe};this.used.push(problem.id);this.result=null;this.screen='problem';this.ended=false;
  }
  continueLearning(){
    if(this.current&&!this.result){if(!canUse(this.catalog,this.problem(this.current.problemId),this.current.context))throw new Error('中断中の教材は確認待ちです。履歴を保持して停止します。');this.screen='problem';return;}
    if(!this.learner.diagnosticCompleted){this.startDiagnostic();return;}
    let task=selectTask(this.routeMaster,this.learner);
    if(task.kind==='start'){startUnit(this.master,this.learner,task.unitId);task=selectTask(this.routeMaster,this.learner);}
    if(task.kind==='warmup'){this.open(this.practice(task.skillId),'warmup');return;}
    if(task.kind==='repair'){this.open(this.practice(task.skillId,'repair'),'repair');return;}
    if(task.kind==='resume'){
      const problem=this.problem(task.problemId);
      this.open(problem,'practice');this.learner.resume=null;this.notice='修復完了 → 元の問題へ復帰しました。';return;
    }
    if(this.practiceFocus){this.open(this.practice(this.practiceFocus),'practice');return;}
    if(task.kind==='learn'){this.open(this.practice(task.skillId),'practice');return;}
    if(task.kind==='max'){this.screen='max';return;}
    if(task.kind==='blocked')throw new Error(task.reason);
    this.screen='home';this.ended=true;
  }
  startDiagnostic(){
    if(this.learner.diagnosticCompleted)throw new Error('初回診断は完了しています。');
    if(this.diagnosisFinished){this.screen='diagnostic';return;}
    const task=selectTask(this.routeMaster,this.learner);
    const skillId=task.kind==='diagnostic'&&task.skillId?task.skillId:this.routeMaster.skills.filter(s=>s.unitId===this.diagnosticUnits[this.diagUnit].id).at(-1)!.id;
    this.open(this.practice(skillId,'diagnostic'),'diagnostic',this.learner.diagnosticPending.length>0);
  }
  private finishDiagnosis(){
    // End the assessment queue at the observed starting skill, without demotion.
    this.learner.diagnosticPending=[];
    completeDiagnostic(this.master,this.learner,this.passed);
    const task=selectTask(this.routeMaster,this.learner);
    if(task.kind==='start')startUnit(this.master,this.learner,task.unitId);
    this.diagnosisFinished=true;
  }
  acceptDiagnosis(){if(!this.diagnosisFinished)throw new Error('診断がまだ完了していません。');this.current=null;this.result=null;this.screen='home';beginSession(this.learner);}
  submission(){if(!this.current||this.result)throw new Error('提出する問題がありません。');this.screen='submission';}
  backToProblem(){if(this.current&&!this.result)this.screen='problem';}
  startMax(){
    if(!this.learner.diagnosticCompleted)throw new Error('初回診断を完了してください。');
    if(this.current&&!this.result)throw new Error('表示中の問題を提出してから挑戦してください。');
    const {unitId,usedToday,policy}=this.snapshot;
    if(!unitId||!policy)throw new Error('すべての実装単元がMAXです。');
    if(!this.paperMax(unitId)&&usedToday>=policy.dailyLimit)throw new Error('本日のMAX挑戦は提出済みです。');
    const next=this.nextMax(unitId);if(!next)throw new Error('固定MAX問題をすべて使用しました。開発用ユーザーを切り替えて確認してください。');
    if(!this.learner.activeUnit)startUnit(this.master,this.learner,unitId);
    this.open(next,'max');
  }
  submit(outcome:MockOutcome,implicatedSkill?:string){
    if(!this.devMode)throw new Error('仮採点は開発確認モードだけで利用できます。');
    if(!this.current||this.result||this.screen!=='submission')throw new Error('この答案は提出できません。');
    const c=this.current,p=this.problem(c.problemId);
    if(!canUse(this.catalog,p,c.context))throw new Error('未検証の教材は採点へ進めません。');
    if(implicatedSkill){
      const ancestors=(id:string):string[]=>this.master.skills.find(s=>s.id===id)!.prerequisites.flatMap(pre=>[pre,...ancestors(pre)]);
      if(outcome!=='prerequisite'||!ancestors(p.skillId).includes(implicatedSkill))throw new Error('この答案の前提技能として扱えません。');
    }
    const a=gradeMock(implicatedSkill?{...p,repairSkillId:implicatedSkill}:p,outcome,this.id(),this.now,c.context);
    if(this.catalog.reviewedOnly&&this.hintedProblems.includes(p.id))a.independent=false;
    this.applyGrading(outcome,a,undefined,implicatedSkill?[{...structuredClone(a),id:this.id(),skillId:implicatedSkill}]:undefined);
  }
  submitChoice(choiceId:string,confirmed:string[]){
    if(!this.catalog.paperChoiceGrading||!this.current||this.result||this.screen!=='submission'||this.current.context==='diagnostic')throw new Error('この答案は選択式で提出できません。');
    const p=this.problem(this.current.problemId),spec=paperSpecs[p.id];
    if(!spec||!canUse(this.catalog,p,this.current.context))throw new Error('対象の検証済み教材ではありません。');
    const base=gradeMock(p,'correct',`event-${this.serial+1}`,this.now,this.current.context);
    base.independent=!this.hintedProblems.includes(p.id);
    const a=choiceAssessment(spec,choiceId,confirmed,base);
    if(this.current.context==='max'&&(!this.paperMax(this.master.skills.find(s=>s.id===p.skillId)!.unitId)||!['OPEN','ACTIVE'].includes(unitStatus(this.master,this.learner,'QFN'))||this.learner.activeUnit&&this.learner.activeUnit!=='QFN'))throw new Error('MAXに挑戦できる単元ではありません。');
    this.serial++;
    this.applyGrading(a.solved?'correct':a.tags.includes('case_split')?'case_split':'calculation',a,undefined,[]);
    this.result!.cause=a.choice!.correct?'最終結論は正しいです。紙答案の確認項目は本人の申告として記録しました。':'選んだ最終結論は正答と一致していません。紙答案と解説を照合してください。';
    if(this.current.context==='max'){
      this.practiceFocus=null;
      if(!this.result!.acquired)this.result!.notice=a.choice!.missing.length?'必須答案要素が不足しています。解説で確認し、別のMAX問題へ再挑戦できます。':'今回の最終結論は未解決です。解説で確認し、別のMAX問題へ再挑戦できます。';
    }else if(!this.result!.stable&&a.choice!.correct)this.result!.notice='最終結論の成功を記録しました。未確認の途中式・根拠を完全だったとは判定していません。';
  }
  private applyGrading(outcome:MockOutcome,a:Assessment,maxOverride?:MaxAttempt,observations?:Assessment[]){
    const c=this.current!,p=this.problem(c.problemId);
    const repairTarget=observations===undefined?p.repairSkillId:observations[0]?.skillId??null;
    let acquired=false,repaired=false,stable=false,notice='';
    if(c.context==='max'){
      const max:MaxAttempt=maxOverride??{problemId:p.id,independenceKey:p.independenceKey,at:this.now,noHint:true,noMethodSpecified:true,independent:true,examQuality:outcome==='correct',practicalTime:true,correctConclusion:a.solved,readable:a.readable,sufficientWriting:outcome==='correct'};
      if(this.catalog.reviewedOnly&&!maxOverride&&!a.choice){
        max.noHint=!this.hintedProblems.includes(p.id);
        max.independent=a.independent;
        max.practicalTime=Date.now()-this.realStartedAt<=25*60*1000;
        if(!max.practicalTime)notice='25分の目安を超えたため、答案の記録は残し、今回のMAX成功証拠には含めません。';
      }
      const unit=this.master.skills.find(s=>s.id===p.skillId)!.unitId;
      if(this.paperMax(unit)&&a.choice){
        (this.learner.maxAttempts[unit]??=[]).push({...max,practicalTime:true,correctConclusion:a.choice.correct,readable:a.choice.confirmed.includes('readable'),examQuality:a.solved,sufficientWriting:a.choice.missing.length===0});
        if(a.solved){this.learner.maxUnits.push(unit);for(const skill of this.master.skills.filter(s=>s.unitId===unit))this.learner.skills[skill.id]='stable';this.learner.activeUnit=null;this.learner.repair=null;this.learner.resume=null;acquired=true;}
      }else if(this.catalog.reviewedOnly){
        const projected=eligibleEvidenceLearner(this.catalog,this.learner);
        acquired=submitMax(this.master,projected,unit,max);
        const originalAttempts=this.learner.maxAttempts,originalDiagnostic=this.learner.diagnosticMaxEvidence;
        (originalAttempts[unit]??=[]).push(structuredClone(max));
        this.learner={...projected,maxAttempts:originalAttempts,diagnosticMaxEvidence:originalDiagnostic};
      }else acquired=submitMax(this.master,this.learner,unit,max);
      recordBehavior(this.learner,`max:${a.id}`);
    }
    recordAssessment(this.master,this.learner,a);
    if(c.context==='diagnostic'){
      if(a.solved&&!c.probe){
        this.diagIds.push(a.id);
        const required=this.catalog.stablePolicies?.[p.skillId]?.minimum??2;
        if(this.diagIds.length===required){
          this.passed.push({unitId:this.diagnosticUnits[this.diagUnit].id,assessmentIds:[...this.diagIds]});this.diagIds=[];this.diagUnit++;
          const nextUnit=this.diagnosticUnits[this.diagUnit];
          if(!nextUnit||this.catalog.reviewedOnly&&!this.problems.some(problem=>this.master.skills.find(s=>s.id===problem.skillId)?.unitId===nextUnit.id&&canUse(this.catalog,problem,'diagnostic')))this.finishDiagnosis();
        }
      }else if(c.probe){
        if(a.solved){this.diagPlacement=p.skillId;this.finishDiagnosis();}
        else {
          const pre=this.master.skills.find(s=>s.id===p.skillId)!.prerequisites[0];
          if(pre){planDiagnosticFollowup(this.master,this.learner,a.id,[pre]);notice='必要な前提の枝だけを、もう一段確認します。';}
          else{this.diagPlacement=p.skillId;this.finishDiagnosis();}
        }
      }else {
        const target=outcome==='prerequisite'&&repairTarget?repairTarget:this.master.skills.find(s=>s.id===p.skillId)!.prerequisites[0]??p.skillId;
        planDiagnosticFollowup(this.master,this.learner,a.id,[target]);notice='この誤答に関係する技能だけ、追加で確認します。';
      }
    }else if(c.context!=='warmup'){
      if(outcome==='prerequisite'&&repairTarget&&c.context!=='repair'){
        // A component observation from this same mock answer; never a fictitious retry.
        const components=observations??[{...structuredClone(a),id:this.id(),skillId:repairTarget}];
        for(const component of components)recordAssessment(this.master,this.learner,component);
        if(repairCandidates(this.learner,repairTarget).length){
          beginRepair(this.master,this.learner,{sourceSkillId:p.skillId,repairSkillId:repairTarget,returnToSkillId:p.skillId,returnToProblemId:p.id});
          notice='前提不足の証拠がそろいました。必要な技能だけ整備します。';this.practiceFocus=null;
        }else {notice='今回は証拠を記録しました。別問題で確認し、修復の必要性を判断します。';this.practiceFocus=p.skillId;}
      }else if(!a.solved&&c.context!=='repair'){this.practiceFocus=p.skillId;}
      if(a.solved&&c.context!=='max'){
        if(stableReady(this.catalog,p.skillId,this.learner.assessments)){
          confirmStable(this.learner,p.skillId);stable=true;this.practiceFocus=null;
          if(c.context==='repair'){finishRepair(this.learner);repaired=true;recordBehavior(this.learner,`repair:${a.id}`);notice='修復完了 → 攻略へ復帰。元の問題をもう一度考えます。';}
          else{this.ended=true;recordBehavior(this.learner,`section:${a.id}`);notice='この技能が前提として安定しました。今日の数学的な一区切りです。';}
        }
      }
    }
    if(acquired){this.practiceFocus=null;notice='実戦投入可能。MAXを取得しました。次のルートを確認しましょう。';this.ended=true;}
    this.result={assessment:structuredClone(this.learner.assessments.find(e=>e.id===a.id)!),outcome,cause:causes[outcome],notice,acquired,repaired,stable};
    this.screen='result';
  }
  recordTechnicalError(code:TechnicalCode){this.technicalErrors.push({at:new Date().toISOString(),code});if(this.technicalErrors.length>100)this.technicalErrors.shift();}
  renewRealSubmission(){
    if(!this.devMode||!this.current||this.result||this.screen!=='submission')throw new GradingError('STALE_ATTEMPT','提出中の問題がありません。');
    this.realToken=crypto.randomUUID();this.realSubmittedAt=null;
  }
  markRealSubmitted(){
    if(!this.devMode||!this.current||this.result||this.screen!=='submission')throw new GradingError('STALE_ATTEMPT','提出中の問題がありません。');
    this.realSubmittedAt??=Date.now();
  }
  openGradingDemo(problemId:string){
    if(!this.devMode)throw new Error('開発モードのみ利用できます。');
    const problem=gradingProblem(problemId),unit=this.master.skills.find(s=>s.id===problem.skillId)!.unitId;
    this.switchProfile(problem.purpose==='max'?(unit==='QEQ'?'max-two':'qfn-ready'):'new');
    this.clock=Date.now();
    if(problem.purpose==='max'){
      // Seed two distinct prior days relative to the real grading clock.
      for(const [i,attempt] of (this.learner.maxAttempts[unit]??[]).entries())attempt.at=new Date(this.clock-(2-i)*86400000).toISOString();
    }else{
      this.learner.diagnosticCompleted=true;
      this.learner.maxUnits=this.master.units.slice(0,this.master.units.findIndex(u=>u.id===unit)).map(u=>u.id);
      for(const skill of this.master.skills)if(this.learner.maxUnits.includes(skill.unitId)||skill.unitId===unit&&skill.id!==problem.skillId)this.learner.skills[skill.id]='stable';
      startUnit(this.master,this.learner,unit);
    }
    this.notice='実証専用の仮カルテです。問題切替で初期化します。';
    this.open(problem,problem.purpose==='max'?'max':'practice');
  }
  openReviewedPreview(problemId:string,stable=false){
    if(!this.devMode)throw new Error('開発モードのみ利用できます。');
    const problem=this.problem(problemId);
    if(problem.reviewStatus!=='reviewed')throw new Error('検証済みの教材だけを選択してください。');
    this.switchProfile('new');
    const p=this.learner,skill=this.master.skills.find(s=>s.id===problem.skillId)!;
    const seedUnit=(id:string)=>{for(const pre of this.master.units.find(u=>u.id===id)!.prerequisites){seedUnit(pre);if(!p.maxUnits.includes(pre))p.maxUnits.push(pre);for(const s of this.master.skills.filter(s=>s.unitId===pre))p.skills[s.id]='stable';}};
    const seedSkill=(id:string)=>{for(const pre of this.master.skills.find(s=>s.id===id)!.prerequisites){seedSkill(pre);p.skills[pre]='stable';}};
    seedUnit(skill.unitId);seedSkill(skill.id);p.skills[skill.id]=stable?'stable':'learning';
    p.diagnosticCompleted=true;startUnit(this.master,p,skill.unitId);
    this.practiceFocus=problem.purpose==='max'?null:skill.id;
    this.notice='教材確認専用の仮カルテです。通常学習の進度には反映しません。';
    const repairOnly=this.catalog.lessonMetadata?.find(l=>l.problem.id===problemId)?.roles.every(r=>r==='repair');
    this.open(problem,problem.purpose==='max'?'max':repairOnly?'repair':'practice');
  }
  submitReal(raw:unknown,token:string){
    if(!this.devMode)throw new GradingError('INVALID_REQUEST','実答案の実証機能は開発モードで利用してください。');
    if(!this.current||this.result||this.screen!=='submission'||token!==this.realToken)throw new GradingError('STALE_ATTEMPT','表示中の問題が変わったため採点結果を反映しません。');
    const receipt=validateReceipt(raw,this.current.problemId);
    if(receipt.submissionId!==token||receipt.context!==this.current.context||this.realEvaluations.some(r=>r.submissionId===receipt.submissionId))throw new GradingError('STALE_ATTEMPT','提出IDまたは学習コンテキストが一致しません。');
    const backup=structuredClone({learner:this.learner,serial:this.serial,screen:this.screen,result:this.result,clock:this.clock,practiceFocus:this.practiceFocus,diagUnit:this.diagUnit,diagIds:this.diagIds,passed:this.passed,diagnosisFinished:this.diagnosisFinished,diagPlacement:this.diagPlacement,ended:this.ended,notice:this.notice});
    try{
      const e=receipt.evaluation,context=this.current.context;
      const independent=this.used.filter(id=>id===this.current!.problemId).length===1;
      this.clock=Date.parse(receipt.gradedAt);
      const a=toAssessment(e,this.id(),this.now,context,independent);
      const observations=e.prerequisiteObservations.map(o=>({...a,id:this.id(),skillId:o.skillId,solved:false,tags:[...o.errorTags],dimensions:{...o.dimensions},crossSkills:{}}));
      const outcome:MockOutcome=e.overall==='correct'?'correct':observations.length?'prerequisite':e.legibility==='unreadable'?'unreadable':e.errorTags.includes('case_split')?'case_split':'calculation';
      const max=toMaxAttempt(receipt,this.now,independent,Math.max(1,((this.realSubmittedAt??Date.now())-this.realStartedAt)/1000));
      this.applyGrading(outcome,a,max,observations);
      this.result!.cause=e.explanation;this.realEvaluations.push(structuredClone(receipt));
    }catch(error){Object.assign(this,backup);throw error;}
  }
  explanation(){if(!this.result)throw new Error('採点結果がありません。');if(this.catalog.reviewedOnly&&this.current&&!this.hintedProblems.includes(this.current.problemId))this.hintedProblems.push(this.current.problemId);this.screen='explanation';}
  next(){
    if(!this.result||!this.current)throw new Error('採点結果がありません。');
    const wasExplanation=this.screen==='explanation',context=this.current.context;
    const oldSkill=this.problem(this.current.problemId).skillId;
    const done=this.result.acquired||this.result.stable&&!this.result.repaired;
    if(wasExplanation)recordBehavior(this.learner,`retry:${this.result.assessment.id}`);
    if(context==='diagnostic'){
      this.result=null;this.current=null;
      if(this.diagnosisFinished)this.screen='diagnostic';else this.startDiagnostic();return;
    }
    if(context==='max'){
      if(this.catalog.paperChoiceGrading&&this.result.assessment.choice){this.result=null;this.current=null;this.practiceFocus=null;this.screen=done?'home':'max';this.notice=done?'MAXを取得しました。次のルートを確認しましょう。':'待ち時間なく、別のMAX候補問題に再挑戦できます。';return;}
      this.result=null;this.current=null;
      if(this.learner.repair||this.practiceFocus)this.continueLearning();else{this.screen='home';this.notice=done?'MAX取得・上位ルートを解放しました。':'独立成功を保存しました。次のMAX挑戦は翌日です。';}return;
    }
    this.result=null;
    // Keep previous problem ID until the next selection to guarantee another task.
    if(context==='warmup'){this.current=null;this.continueLearning();return;}
    if(done&&!wasExplanation){this.current=null;this.screen='home';return;}
    if(this.learner.repair||this.learner.resume){this.current=null;this.continueLearning();return;}
    const next=this.practice(oldSkill,context);this.open(next,context);
  }
  newSession(){if(!this.learner.diagnosticCompleted)throw new Error('初回診断を完了してください。');this.current=null;this.result=null;this.ended=false;beginSession(this.learner);this.screen='home';this.notice='前回確認から始めます。';}
  advanceDay(days=1){if(!this.devMode)throw new Error('開発モードのみ利用できます。');if(days<1||!Number.isInteger(days))throw new Error('正の日数が必要です。');if(this.current&&!this.result)throw new Error('提出後に日付を進めてください。');this.clock+=days*86400000;this.notice=`開発時計を${days}日進めました。`;}
  switchProfile(profile:Profile){
    if(!this.devMode)throw new Error('開発モードのみ利用できます。');
    this.realToken='';this.realEvaluations=[];this.technicalErrors=[];this.hintedProblems=[];
    this.learner=createLearner(this.master,`demo-${profile}`);this.profile=profile;this.screen=profile==='new'?'diagnostic':'home';this.current=null;this.result=null;this.clock=Date.parse('2026-09-07T03:00:00Z');this.serial=0;this.used=[];this.diagUnit=0;this.passed=[];this.diagIds=[];this.diagnosisFinished=false;this.diagPlacement=null;this.practiceFocus=null;this.ended=false;this.notice='';
    if(profile==='new')return;
    const p=this.learner;p.diagnosticCompleted=true;
    const upto=profile==='max-two'?5:profile==='complete'?7:6;
    p.maxUnits=this.master.units.slice(0,upto).map(u=>u.id);
    for(const s of this.master.skills)if(p.maxUnits.includes(s.unitId))p.skills[s.id]='stable';
    if(profile==='complete')return;
    startUnit(this.master,p,profile==='max-two'?'QEQ':'QFN');
    if(profile==='quadratic'){if(this.catalog.reviewedOnly){p.lastSkillId=null;p.warmupRemaining=0;}else{p.skills.QFN1='stable';p.lastSkillId='QFN1';beginSession(p);}}
    if(profile==='max-two'||profile==='qfn-ready'){
      const unit=p.activeUnit!;for(const s of this.master.skills.filter(s=>s.unitId===unit))p.skills[s.id]='stable';
      for(const [i,problem] of this.problems.filter(s=>s.purpose==='max'&&canUse(this.catalog,s,'max')&&this.master.skills.find(k=>k.id===s.skillId)?.unitId===unit).slice(0,2).entries())submitMax(this.master,p,unit,{problemId:problem.id,independenceKey:problem.independenceKey,at:new Date(this.clock-(2-i)*86400000).toISOString(),noHint:true,noMethodSpecified:true,independent:true,examQuality:true,practicalTime:true,correctConclusion:true,readable:true,sufficientWriting:true});
    }
    if(profile==='repair'){
      p.skills.QFN1='stable';p.skills.QFN2='stable';
      const original=this.problems.find(p=>p.skillId===(this.catalog.reviewedOnly?'QF-SIGN':'QFN3')&&canUse(this.catalog,p,'practice'))!;
      const repairProblems=this.problems.filter(p=>p.skillId==='HSX2'&&canUse(this.catalog,p,'repair'));
      for(const problem of repairProblems.slice(0,2))recordAssessment(this.master,p,gradeMock(problem,'prerequisite',this.id(),this.now,'practice'));
      beginRepair(this.master,p,{sourceSkillId:original.skillId,repairSkillId:'HSX2',returnToSkillId:original.skillId,returnToProblemId:original.id});
    }
  }
}
