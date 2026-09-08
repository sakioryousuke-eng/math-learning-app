import {renderCountPrototype,bindCountPrototype} from './count-family-prototype.ts';
import {renderAxisPrototype,bindAxisPrototype} from './axis-family-prototype.ts';
import {renderFamilyPrototype,bindFamilyPrototype} from './family-prototype.ts';
import {paperSubmission,toPaperChecks,backPaperChoices,paperInput} from './paper-submission.ts';
import {paperCurriculum as curriculum,paperSpecs} from '../grading/paper-choices.ts';
import {bindDynamicQuadratic} from './dynamic-quadratic.ts';
import {profileLabels} from '../services/learning-service.ts';
import {quadraticExplanation} from './quadratic-explanation.ts';
import {previewControls,bindPreview,previewSelection} from './preview-controls.ts';
import {verificationStates} from '../application/verification.ts';
import type {VerificationState} from '../application/verification.ts';
import type {Profile} from '../services/learning-service.ts';
import {steps} from '../curriculum/quadratic.ts';
import {lessonPanel} from './quadratic-view.ts';
const master=curriculum.master;
import {routeMap} from '../curriculum/route-map.ts';
import {outcomeLabels} from '../services/mock-grader.ts';
import type {MockOutcome} from '../services/mock-grader.ts';
import type {Dimension,Rating} from '../math-master/types.ts';
import './styles.css';
import {gradingSpecs} from '../grading/problems.ts';
import {fileToImage} from '../grading/image-input.ts';
import {LearningApplication} from '../application/learning-application.ts';
import {IndexedDbLearningRepository} from '../persistence/indexeddb-repository.ts';
import {evidenceDeadline} from '../application/clock.ts';
import {GradingError} from '../grading/schema.ts';
const verifyQuery=new URLSearchParams(location.search).get('verify');
let verifyEnabled=false;
try{if(verifyQuery==='on'||verifyQuery==='off')localStorage.setItem('math-learning-verify',verifyQuery);verifyEnabled=localStorage.getItem('math-learning-verify')==='on';}catch{verifyEnabled=verifyQuery==='on';}
const devMode=verifyQuery!=='off'&&(verifyEnabled||((import.meta.env.DEV||import.meta.env.MODE==='demo')&&new URLSearchParams(location.search).get('demo')!=='off'));
const learning=new LearningApplication(new IndexedDbLearningRepository(),undefined,devMode,curriculum);
const service=learning.service;
let ready=false,saving=false;
const root=document.querySelector<HTMLDivElement>('#app');if(!root)throw new Error('Application root missing');
const app=root;
const esc=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const unitName=(id:string|null)=>master.units.find(u=>u.id===id)?.name??'すべてのルートを攻略';
const skillName=(id:string|null)=>master.skills.find(s=>s.id===id)?.name??'次の数学へ';
const button=(label:string,action:string,secondary=false,disabled=false)=>`<button class="${secondary?'secondary':'primary'}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const symbols:Record<Rating,string>={success:'○',partial:'△',failure:'×',unobserved:'—'};
const dimensions:Record<Dimension,string>={understanding:'問題理解',modeling:'数学化',method:'着眼・方針',conditions:'条件・場合分け',calculation:'変形・計算',expression:'答案表現',conclusion:'結論・検証'};
let error='',detailsUnit:string|null=null,devOpen=verifyQuery==='on',familyOpen=false,axisFamilyOpen=false,countFamilyOpen=false;
const openWorlds=new Map<string,boolean>();
let realMode=false,realBusy=false,selectedImage:Awaited<ReturnType<typeof fileToImage>>|null=null;
let generation=0,controller:AbortController|null=null;
function clearImage(){generation++;controller?.abort();controller=null;realBusy=false;if(selectedImage)URL.revokeObjectURL(selectedImage.previewUrl);selectedImage=null;}
async function technical(e:unknown){const issue=e instanceof GradingError?e:new GradingError('PROVIDER_ERROR','採点を完了できませんでした。再提出できます。');await act(()=>service.recordTechnicalError(issue.code));error='技術エラー（'+issue.code+'）：'+issue.message+' 学習カルテ・MAX回数は変更していません。';}
async function chooseImage(file:File){
 clearImage();const epoch=generation;error='';realBusy=true;render();
 try{const image=await fileToImage(file);if(epoch!==generation){URL.revokeObjectURL(image.previewUrl);return;}selectedImage=image;}
 catch(e){if(epoch===generation)await technical(e);}finally{if(epoch===generation){realBusy=false;render();}}
}
async function submitImage(){
 await act(()=>service.recordTechnicalError('CONFIG_MISSING'));
 error='画像AI採点は未接続です。画像は送信していません。仮答案で学習を続けられます。';render();
}

function render(){
 for(const detail of app.querySelectorAll<HTMLDetailsElement>('details[data-world]'))openWorlds.set(detail.dataset.world!,detail.open);
 if(!ready){app.innerHTML=`<main><h1>学習データを読み込み中</h1><p role="alert">${esc(error||'保存状態を確認しています。')}</p>${error?'<button data-action="reload">再読み込み</button>':''}</main>`;return;}
 const s=service.snapshot,p=s.learner,h=learning.snapshot;
 const hideMethod=s.current?.context==='max'||curriculum.problemGuides.find(g=>g.problemId===s.problem?.id)?.hideMethodLabel===true;
 const active=p.activeUnit?unitName(p.activeUnit):p.maxUnits.length===master.units.length?'すべての実装単元がMAX':`次は${unitName(s.unitId)}`,skillId='skillId'in s.task?s.task.skillId:s.practiceFocus;
 const stableCount=master.skills.filter(x=>!curriculum.retiredSkillIds?.includes(x.id)&&x.unitId===p.activeUnit&&p.skills[x.id]==='stable').length;
 const unitSkills=master.skills.filter(x=>!curriculum.retiredSkillIds?.includes(x.id)&&x.unitId===p.activeUnit).length;
 const profileOptions=Object.entries(profileLabels).map(([id,label])=>`<option value="${id}" ${learning.namespace==='demo:'+id?'selected':''}>${label}</option>`).join('');
 const dev=devMode?`<details class="dev" ${devOpen?'open':''}><summary>開発確認 <span>仮答案・デモユーザー</span></summary><div class="dev-content">${verifyEnabled?button('生成問題ファミリー試作','family-open',true)+button('生成問題ファミリー試作2 軸が動く最大・最小','axis-family-open',true)+button('生成問題ファミリー試作3 共有点の個数と判別式','count-family-open',true):''}${previewControls(curriculum)}<label for="verify-state">検証する状態</label><select id="verify-state">${Object.entries(verificationStates).map(([id,label])=>`<option value="${id}" ${learning.namespace===`demo:verify:${id}`?'selected':''}>${label}</option>`).join('')}</select>${button('この状態を開く','verify-state',true)}<p>選択した検証デモを開始状態から開きます。</p>${button('検証モードをOFF','verify-off',true)}<label for="profile">確認する状態</label><select id="profile"><option value="student" ${learning.namespace==='student:local'?'selected':''}>通常学習（保存して再開）</option>${profileOptions}</select><div class="dev-date"><span>開発時計 <b>${esc(s.now.slice(0,10))}</b></span><button data-action="day" class="small" ${s.current&&!s.result||learning.namespace==='student:local'?'disabled':''}>翌日へ</button><button data-action="week" class="small" ${s.current&&!s.result||learning.namespace==='student:local'?'disabled':''}>8日後へ</button></div><p>通常学習とデモは別々に保存します。再読み込み後も続きから再開します。画像AI採点は未接続です。</p>${button('次回起動を確認','session',true,!p.diagnosticCompleted)}${button('このデモを初期化','reset-demo',true,!learning.namespace.startsWith('demo:'))}<label for="grading-problem">実答案の実証問題（専用デモ）</label><select id="grading-problem">${gradingSpecs.map(g=>`<option value="${esc(g.problemId)}">${esc(g.problemId)}</option>`).join('')}</select>${button('実証問題を開く','grading-demo',true)}</div></details>`:'';
 const label=s.current?.context==='max'?'MAX挑戦':s.current?.context==='repair'?'武器を整備中':s.current?.context==='warmup'?'前回確認':s.current?.context==='diagnostic'?'初回診断':'今日の課題';
 const ancestorIds=(id:string):string[]=>master.skills.find(x=>x.id===id)!.prerequisites.flatMap(pre=>[pre,...ancestorIds(pre)]);
 const repairChoices=s.problem?[...new Set(ancestorIds(s.problem.skillId))].filter(id=>curriculum.problems.some(p=>p.skillId===id&&p.reviewStatus==='reviewed')):[];
 let content='';
 if(s.screen==='home'){
  const quest=s.task.kind==='warmup'?'前回確認':s.task.kind==='repair'?'必要な技能を整備':s.task.kind==='max'?'実戦で力を確かめる':s.task.kind==='complete'?'すべての実装ルートがMAX':'現在の攻略技能';
  content=`<div class="eyebrow">LEARNING / 今日の学習</div><h1>学習を、つなげよう。</h1><div class="metrics"><div><span>人間力</span><strong>Lv.${h.humanExp.level}</strong><small>${p.humanExp} EXP · 行動の記録</small></div><div><span>数学力</span><strong>Rank ${h.rank.value}</strong><small>仮表示 · MAX ${p.maxUnits.length} 単元</small></div></div>${s.ended?'<div class="notice success"><b>今日の一区切りを達成</b><p>ここで終えても、続けても大丈夫です。</p></div>':''}<section class="quest"><div class="eyebrow light">今日のクエスト</div><h2>${esc(quest)}</h2><p class="quest-skill">${esc(skillName(skillId??null))}</p>${p.activeUnit?`<div class="quest-route"><span>${esc(active)}を攻略中</span><span>${stableCount} / ${unitSkills} 安定</span></div><progress max="${unitSkills}" value="${stableCount}" aria-label="単元内の安定技能数"></progress>`:''}${button(s.current&&!s.result?'表示中の問題に戻る':'学習を続ける','continue',false,s.task.kind==='complete')}</section><section class="max-link"><div><span class="star">☆</span><h2>MAXに挑戦</h2><p>進度に関係なく、実戦で確かめる。</p></div>${button('挑戦を確認 →','max',true,!s.unitId)}</section>${p.repair?`<div class="notice"><b>${esc(active)}を攻略中</b><p>${esc(skillName(p.repair.repairSkillId))}を修復中 → 完了後に元問題へ復帰</p></div>`:''}<p class="muted">固定の問題数や制限時間ではなく、数学的な一区切りを大切にします。</p>`;
 }else if(s.screen==='diagnostic'){
  content=s.diagnosisFinished?`<div class="eyebrow">DIAGNOSIS / 診断完了</div><h1>ここから始めよう。</h1><section class="panel"><span class="pill">開始する単元</span><h2>${esc(active)}</h2><p>${s.task.kind==='max'?'内部技能は安定しています。再授業せず、MAXに挑戦できます。':`${esc(skillName('skillId'in s.task?s.task.skillId??null:null))}から、必要なところを進めます。`}</p><p class="muted">必要な統合課題で合格した範囲は安定した技能として記録します。MAXは独立した実戦成功の証拠で判定します。</p>${button('ホームへ','accept-diagnosis')}</section>`:`<div class="eyebrow">DIAGNOSIS / 初回のみ</div><h1>今の力から、始める。</h1><p class="lead">知っている内容を繰り返さないために、統合問題で出発点を確かめます。</p><section class="panel"><span class="pill">${esc(unitName(curriculum.mainUnitIds[Math.min(s.diagUnit,curriculum.mainUnitIds.length-1)]))}</span><h2>紙とペンを用意してください</h2><ol class="steps"><li>問題を見て、紙に解く</li><li>仮答案を選んで提出する</li><li>必要な技能だけ、追加で確認する</li></ol><p class="muted">確認済みの統合課題で診断します。二次関数は3題。できないときは関係する枝だけ確認します。</p>${button(s.current&&!s.result?'診断の問題に戻る':'診断を始める','continue')}</section>`;
 }else if(s.screen==='problem'&&s.problem&&s.problem.reviewStatus!=='reviewed'){
  content='<h1>教材の確認待ちです</h1><p>この問題の履歴と復帰先は保持しています。数学的な検証が終わるまで再出題を保留します。</p>';
 }else if(s.screen==='problem'&&s.problem){
  content=`<div class="eyebrow">${esc(label)}${hideMethod?'':' / '+esc(unitName(p.activeUnit??master.skills.find(x=>x.id===s.problem?.skillId)?.unitId??null))}</div><div class="problem-heading"><h1>${hideMethod?'実戦・統合問題':esc(skillName(s.problem.skillId))}</h1><span class="pill">${hideMethod?'方法指定なし':esc(s.problem.topic)}</span></div>${p.repair?`<div class="notice"><b>${esc(active)}を攻略中</b><p>${esc(skillName(p.repair.repairSkillId))}だけを整備しています。</p></div>`:''}<section class="problem-paper"><div class="paper-caption">問題 <span>${s.current?.context==='max'?'ノーヒント・根拠を含む答案':s.current?.context==='warmup'?'習熟判定には使いません':'途中式と根拠も残しましょう'}</span></div><p class="math-text">${esc(s.problem.prompt)}</p></section>${lessonPanel(curriculum.lessonMetadata?.find(l=>l.problem.id===s.problem!.id),service.exportCheckpoint().hintedProblems.includes(s.problem.id))}<p class="paper-hint">✎ 紙に解いてください</p>${button('仮答案を提出する','submission')}${gradingSpecs.some(g=>g.problemId===s.problem!.id)?button('実答案を撮影／選択','real-submission',true):''}<p class="muted">紙の答案と解説を照合して仮採点を選びます。AIによる実答案評価は未接続です。</p>`;
 }else if(s.screen==='submission'&&realMode){
  content=`<div class="eyebrow">SUBMISSION / 実答案提出</div><h1>紙の答案を、取り込む。</h1><p class="lead">問題：${esc(s.current?.problemId)}</p><p>答案全体が明るく写るように撮影してください。判読できない答案は未解決として扱います。</p>
  ${selectedImage?`<img class="answer-preview" src="${esc(selectedImage.previewUrl)}" alt="提出前の答案プレビュー"/>`:''}
  <div class="image-inputs"><label class="image-picker">カメラで撮影<input id="camera-image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" ${realBusy?'disabled':''}/></label><label class="image-picker">画像ファイルを選択<input id="file-image" type="file" accept="image/jpeg,image/png,image/webp" ${realBusy?'disabled':''}/></label></div>
  <p class="muted">JPEG・PNG・WebP、10MB以下。カメラの起動は端末とブラウザーによります。HEICはJPEGへ変換してください。</p>
  ${realBusy?'<p role="status">処理中です…</p>':''}${selectedImage?button('画像AI採点は未接続','real-submit',false,true)+button('撮り直す／選び直す','retake',true,realBusy):''}
  <p class="muted">画像AI採点は未接続です。画像を外部に送信しません。問題に戻り、開発用仮採点で学習を続けられます。</p>
  ${button(realBusy?'処理を中止して問題に戻る':'問題に戻る','back-problem',true)}`;
 }else if(s.screen==='submission'){
  content=`<div class="eyebrow">SUBMISSION / 仮答案提出</div><h1>答案を提出する</h1><p class="lead">紙に解いたら、開発用仮採点の結果を選んでください。画像AI採点は未接続です。</p>${true?`<fieldset class="answer-options"><legend>仮採点の結果</legend>${Object.entries(outcomeLabels).map(([id,label],i)=>`<label><input type="radio" name="outcome" value="${id}" ${i===0?'checked':''}/><span>${esc(id==="correct"?"完全正解（条件・途中の根拠・結論を読みやすく記述）":label)}</span></label>`).join('')}</fieldset>${repairChoices.length?`<label>前提不足の場合に答案から確認した技能<select id="implicated-skill"><option value="">問題の標準修復先</option>${repairChoices.map(id=>`<option value="${esc(id)}">${esc(skillName(id))}</option>`).join('')}</select></label>`:''}${button('この仮答案を提出','submit')}`:'<div class="notice">このビルドでは開発用の仮採点を無効にしています。実答案の採点は次段階です。</div>'}${button('問題に戻る','back-problem',true)}<p class="muted">本番ではこの選択肢を表示しません。判読不能は再確認せず、未解決として扱います。</p>`;
 }else if(s.screen==='result'&&s.result){
  const r=s.result;
  content=`<div class="eyebrow">RESULT / 採点結果</div><h1 class="${r.assessment.solved?'correct':'unresolved'}">${r.assessment.solved?'✓ 正解':'未解決'}</h1><p class="lead">${r.assessment.solved?'今回確認できたこと':'ここまで、できていました。'}</p><dl class="ratings">${Object.entries(dimensions).map(([id,label])=>`<div><dt>${label}</dt><dd class="rating-${r.assessment.dimensions[id as Dimension]}">${symbols[r.assessment.dimensions[id as Dimension]]}</dd></div>`).join('')}</dl><section class="panel compact"><h2>${r.assessment.solved?'確認できた力':'主な原因'}</h2><p>${esc(r.cause)}</p></section>${r.notice?`<div class="notice ${r.acquired?'gold':r.stable?'success':''}">${r.acquired?'<strong class="max-celebration">★ MAX · 実戦投入可能</strong>':''}<p>${esc(r.notice)}</p>${r.acquired?`<p>${esc(master.units.filter(u=>!p.maxUnits.includes(u.id)&&u.prerequisites.every(id=>p.maxUnits.includes(id))).map(u=>u.name+' OPEN').join(' / ')||'第1版の全ルートを攻略しました。')}</p>`:''}</div>`:''}${button(r.repaired?'元の問題へ復帰':p.repair?(s.current?.context==='repair'?'修復の別問題へ':'必要な技能を修復する'):r.stable?'一区切り・ホームへ':r.acquired?'解放したルートを確認':'次へ','next')}${button('解説を見る','explanation',true)}`;
 }else if(s.screen==='explanation'&&s.problem&&s.result){
  const prerequisite=s.result.outcome==='prerequisite';
  content=`<div class="eyebrow">EXPLANATION / 解説</div><h1>${prerequisite?'前提の道具を整える':esc(s.problem.topic)+'のポイント'}</h1><section class="explanation"><h2>何が問題だったか</h2><p>${esc(s.result.cause)}</p><h2>今回のポイント</h2><p>${prerequisite?'元問題を解き切る前に、必要な前提技能の使い方を確認します。':esc(s.problem.point)}</p><h2>解法</h2><p class="math-text">${prerequisite?'前提技能の別問題で、変形と条件を確かめます。元問題の答えは復帰後に考えます。':esc(s.problem.solution)}</p><h2>入試答案例</h2><p class="answer-example">${prerequisite?'条件 → 変形の根拠 → 計算 → 結論の順で記述します。修復問題で具体的な答案を確認しましょう。':esc(s.problem.examAnswer)}</p><h2>今後使える場面</h2><p>${esc(s.problem.transfer)}</p></section>${button(p.repair?'必要な技能へ':s.result.repaired?'元問題へ復帰':s.current?.context==='max'?'結果を確定して次へ':s.current?.context==='warmup'?'今日の課題へ':s.current?.context==='diagnostic'?'診断の次へ':'同技能の別問題へ','next')}`;
 }else if(s.screen==='map'){
  content=`<div class="eyebrow">ROUTE / 攻略マップ</div><h1>次の数学が、開く。</h1><p class="lead">現在：${esc(active)}。上位単元への鍵は、必要な前提単元すべてのMAX。</p>${routeMap(curriculum,p).map(group=>`<details class="panel" data-world="${esc(group.world)}" ${(openWorlds.get(group.world)??group.expanded)?'open':''}><summary>${esc(group.world)} · ${group.rows.filter(r=>r.status==='MAX').length}/${group.rows.length} MAX</summary><ol class="route curriculum-route">${group.rows.map(r=>`<li class="route-${r.status==='MAX'?'max':r.status==='ACTIVE'?'active':r.status==='OPEN'?'open':'locked'}"><button class="route-button" data-unit="${r.unitId}"><span>${esc(r.name)}</span><strong>${r.status==='ACTIVE'?'▶ 攻略中':r.status==='MAX'?'★ MAX':r.status==='OPEN'?'○ OPEN':'🔒 LOCKED'}</strong></button>${detailsUnit===r.unitId?`<div class="unlock-detail"><b>必要なMAX</b><p>${r.requiredMax.map(x=>esc(x.name)+' MAX '+(x.acquired?'✓':'未取得')).join('<br>')||'最初からOPEN'}</p>${r.canStart?button('このルートを始める','choose:'+r.unitId,true,!!s.current&&!s.result)+button('この単元のMAXへ','choose-max:'+r.unitId,true,!!s.current&&!s.result):''}${r.status==='ACTIVE'?button('攻略を続ける','continue',true):''}</div>`:''}</li>`).join('')}</ol></details>`).join('')}<p class="muted">stableは単元内の進行に使います。別ルートは前提MAX後に現れ、攻略中の単元がある間は移動できません。</p>`;

 }else if(s.screen==='records'){
  content=`<div class="eyebrow">RECORD / 学習の記録</div><h1>できることを、残す。</h1><div class="metrics"><div><span>人間力</span><strong>Lv.${h.humanExp.level}</strong><small>${p.humanExp} EXP</small></div><div><span>数学力</span><strong>Rank ${h.rank.value}</strong><small>MAX数に基づく仮表示</small></div></div><section class="panel"><h2>現在の攻略</h2><p>${esc(active)}</p>${p.repair?`<p>${esc(skillName(p.repair.repairSkillId))}を整備中</p>`:''}<h2>MAXを取得した単元</h2><p>${p.maxUnits.length?p.maxUnits.map(id=>`<span class="pill achieved">★ ${esc(unitName(id))}</span>`).join(' '):'まだありません。診断合格とは別に、成功の証拠を集めます。'}</p></section><section class="panel"><h2>最近の答案</h2>${p.assessments.length?`<ul class="history">${p.assessments.slice(-8).reverse().map(a=>`<li><span>${esc(skillName(a.skillId))}<small>${a.context==='warmup'?'前回確認':a.context==='repair'?'修復':a.context==='max'?'MAX':'学習・診断'}</small></span><b class="${a.solved?'correct':'unresolved'}">${a.solved?'正解':'未解決'}</b></li>`).join('')}</ul>`:'<p class="muted">答案の記録はこれからです。</p>'}</section><section class="panel"><h2>MAX履歴</h2><ul class="history">${h.maxHistory.map(m=>`<li>${esc(unitName(m.unitId))} · ${esc(m.challengeDate.slice(0,10))}<br>${m.success?'成功':'未解決'} · 独立成功 ${m.independentSuccessCount}/3 ${m.acquiredAt?'MAX取得':''}</li>`).join('')||'<li>まだありません</li>'}</ul></section><section class="panel"><h2>修復履歴</h2><ul class="history">${h.repairs.map(r=>`<li>${esc(skillName(r.sourceSkill))} → ${esc(skillName(r.repairedSkill))}<br>${r.completedAt?'完了':'修復中'} · 復帰先 ${esc(skillName(r.returnToSkill))}</li>`).join('')||'<li>まだありません</li>'}</ul></section><section class="panel"><h2>セッション履歴</h2><ul class="history">${h.sessions.slice(-8).reverse().map(x=>`<li>${esc(x.start.slice(0,16))} · ${x.completedTasks.length}件提出 · ${x.end?'終了':'継続中'}</li>`).join('')}</ul><h2>EXP獲得履歴</h2><ul class="history">${h.humanExp.events.slice(-8).reverse().map(x=>`<li>${esc(x.at.slice(0,16))} · ${esc(x.id.split(':')[0])} +1 EXP</li>`).join('')}</ul></section><p class="muted">人間力は学習行動の累積記録です。数学力や単元解放には加算しません。</p>`;
 }else if(s.screen==='max'){
  const count=s.evidence.length,expired=s.evidence[0]?new Date(evidenceDeadline(s.evidence[0].at,s.policy!.validityDays)).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'最初の成功から7日間';
  content=`<div class="eyebrow">MAX CHALLENGE / 実戦確認</div><h1>${esc(unitName(s.unitId))}</h1><section class="max-card"><span class="max-mark">☆ MAX</span><h2>方法を選び、最後まで。</h2><p class="muted">二次関数の検証済みMAX問題を使用します。目安25分。模試相当の難易度・時間の実測校正は未完了です。</p><div class="evidence-circles" aria-label="独立成功 ${count} 回">${[1,2,3].map(i=>`<span class="${i<=count?'filled':''}">${i<=count?'✓':i}</span>`).join('')}</div><p><strong>独立成功 ${count} / 3</strong></p><p class="muted">証拠の期限：${esc(expired)}</p></section><ul class="conditions"><li>ノーヒント・方法指定なし</li><li>根拠と最終結論を含む答案</li><li>独立した問題で3回の成功</li><li>原則1日1回。失敗してもstableは保持</li></ul>${s.usedToday?'<div class="notice">本日の挑戦は提出済みです。次の挑戦は翌日です。</div>':''}${!s.availableMax&&s.unitId?'<div class="notice">この単元の固定MAX代表問題は使用済みです。独立した別問題の追加が必要です。</div>':''}${button('MAX問題に挑戦','start-max',false,!s.unitId||!!s.usedToday||!s.availableMax||!!s.current&&!s.result)}<p class="muted">${devMode?'開発用の仮採点で確認します。時計は上部の「開発確認」から進められます。':'実答案の採点は次段階で接続します。'}</p>`;
 }
 if(s.problem&&paperSpecs[s.problem.id]&&s.current?.context!=='diagnostic'){
  if(s.screen==='problem')content=content.replace('仮答案を提出する','紙答案の最終結果を提出する').replace('紙の答案と解説を照合して仮採点を選びます。AIによる実答案評価は未接続です。','紙に自由記述で解いてから、最終結論を選択して提出します。');
  if(s.screen==='submission'&&!realMode)content=paperSubmission(s.problem.id,s.realToken,s.current?.context==='max');
  if(s.screen==='result'&&s.result?.assessment.choice){const record=s.result.assessment.choice;content=content.replace('✓ 正解',s.current?.context==='max'?'✓ 完全合格':'✓ 最終結論は正しい');content+=`<p class="notice">最終結論は選択内容から判定しました。根拠・条件などは本人の自己申告であり、アプリが紙答案を読んだ判定ではありません。</p>${record.missing.length?`<p>未確認：${record.missing.map(id=>esc(paperSpecs[s.problem!.id].checks.find(c=>c.id===id)?.label??id)).join('／')}</p>`:''}`;}
 }
 if(s.screen==='max'&&s.unitId==='QFN')content=`<h1>二次関数 MAX</h1><section class="max-card"><h2>1題を紙に解き切る</h2><p>6択で最終結論を提出し、紙答案の必須要素を確認します。</p><p>最終結論が正しく、必須答案要素がすべて揃った1回の成功でMAXを取得します。</p><p>3回成功・7日以内・1日1回の制限はありません。失敗後も別の候補問題へ再挑戦できます。</p></section>${button('MAX問題に挑戦','start-max',false,!!s.current&&!s.result)}<p>紙の根拠・条件・可読性は自己申告で確認します。3題は独立した候補問題です。</p>`;
 if(s.screen==='explanation'&&s.problem?.skillId.startsWith('QF-')&&s.result&&s.result.outcome!=='prerequisite')content=`<h1>答えと解説</h1>${quadraticExplanation(s.problem)}${button(p.repair?'必要な技能へ':s.result.repaired?'元問題へ復帰':'次へ','next')}`;
 if(s.problem&&s.problem.reviewStatus!=='reviewed'&&['problem','submission','result','explanation'].includes(s.screen))content='<h1>教材確認待ち</h1><p>旧問題の履歴と復帰先は保持しています。数学的検証が終わるまで出題と解説表示を保留します。</p>';
 if(s.screen==='diagnostic'&&!s.diagnosisFinished)content='<div class="notice">二次関数と必要な因数分解教材を検証しています。他単元は教材確認待ちのため、通常の初回診断は保留します。開発デモでは二次関数を確認できます。</div>'+content;
 if(p.activeUnit==='QFN'&&s.screen==='home')content+=`<section class="panel"><h2>二次関数の道順</h2><ol>${steps.map(step=>`<li>STEP ${step.number} ${esc(step.title)} (${step.skills.filter(id=>p.skills[id]==='stable').length}/${step.skills.length})</li>`).join('')}</ol></section>`;
 if(verifyEnabled&&familyOpen)content=renderFamilyPrototype();
 if(verifyEnabled&&axisFamilyOpen)content=renderAxisPrototype();
 if(verifyEnabled&&countFamilyOpen)content=renderCountPrototype();
 app.innerHTML=`<header class="site-header"><div class="brand"><span class="brand-icon">∑</span><span>数学の道<small>二次関数 · 教材検証版</small></span></div><span class="header-badge">${learning.namespace.startsWith('demo:')?'DEMO':'LOCAL'}</span></header><div class="shell">${dev}<p class="status-message" role="status">${saving?'保存中…':'端末に保存済み'} · ${learning.namespace.startsWith('demo:')?'開発デモ':'通常学習'}</p><main id="main" tabindex="-1">${error?`<div class="error" role="alert">${esc(error)}</div>`:''}${s.notice?`<p class="status-message" role="status">${esc(s.notice)}</p>`:''}${content}</main></div><nav class="bottom-nav" aria-label="メインナビ"><button data-action="home" ${s.screen==='home'||s.screen==='diagnostic'?'aria-current="page"':''}><span>⌂</span>ホーム</button><button data-action="map" ${s.screen==='map'?'aria-current="page"':''}><span>⋮</span>攻略マップ</button><button data-action="records" ${s.screen==='records'?'aria-current="page"':''}><span>▤</span>記録</button></nav>`;
 for(const input of app.querySelectorAll<HTMLInputElement>('.image-inputs input'))input.addEventListener('change',()=>{const file=input.files?.[0];if(file)void chooseImage(file);});
 app.querySelector('details.dev')?.addEventListener('toggle',e=>{devOpen=(e.target as HTMLDetailsElement).open;});
 app.querySelector<HTMLSelectElement>('#profile')?.addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;void act(()=>{},()=>value==='student'?learning.useStudent():learning.useDemo(value as Profile));});
 if(verifyEnabled&&countFamilyOpen)bindCountPrototype(app,render,()=>{countFamilyOpen=false;render();});
 if(verifyEnabled&&axisFamilyOpen)bindAxisPrototype(app,render,()=>{axisFamilyOpen=false;render();});
 if(verifyEnabled&&familyOpen)bindFamilyPrototype(app,render,()=>{familyOpen=false;render();});
 bindPreview(app,render); bindDynamicQuadratic(app);
 if(saving)for(const element of app.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLSelectElement>('button,input,select'))element.disabled=true;
}
async function act(run:()=>void,operation?:()=>Promise<void>){
 if(saving)return;saving=true;
 try{const pending=operation?operation():learning.execute(run);render();await pending;if(service.snapshot.screen!=='submission'){clearImage();realMode=false;}error='';}
 catch(e){error=(e instanceof Error?e.message:'保存に失敗しました。')+' 数学的な不正解には数えません。';}
 finally{saving=false;render();document.querySelector<HTMLElement>('#main')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
app.addEventListener('click',e=>{
 const target=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!target||target.disabled)return;
 if(target.dataset.boundary!==undefined||target.dataset.familyAction!==undefined||target.dataset.axisAction!==undefined||target.dataset.countAction!==undefined)return;
 if(target.dataset.unit){detailsUnit=detailsUnit===target.dataset.unit?null:target.dataset.unit;render();return;}
 const action=target.dataset.action;
 if(action==='reload'){location.reload();return;}
 if(!ready||saving)return;
 if(action==='count-family-open'){if(verifyEnabled){countFamilyOpen=true;axisFamilyOpen=false;familyOpen=false;render();}return;}
 if(countFamilyOpen)countFamilyOpen=false;
 if(action==='axis-family-open'){if(verifyEnabled){axisFamilyOpen=true;familyOpen=false;render();}return;}
 if(axisFamilyOpen)axisFamilyOpen=false;
 if(action==='family-open'){if(verifyEnabled){familyOpen=true;render();}return;}
 if(familyOpen){familyOpen=false;}
 if(action==='paper-check'){try{toPaperChecks(app);error='';}catch(e){error=String(e);}render();return;}
 if(action==='paper-back'){backPaperChoices();render();return;}
 if(action==='preview-problem'){const selection=previewSelection();void act(()=>{},()=>learning.useReviewedPreview(selection.id,selection.stable));return;}
 if(action==='verify-off'){const url=new URL(location.href);url.searchParams.set('verify','off');location.assign(url);return;}
 if(action==='verify-state'){const state=app.querySelector<HTMLSelectElement>('#verify-state')!.value as VerificationState;void act(()=>{},()=>learning.useVerification(state));return;}
 if(action==='reset-demo'){void act(()=>{},()=>learning.resetDemo());return;}
 if(action==='session'){location.reload();return;}
 if(action==='grading-demo'){const id=app.querySelector<HTMLSelectElement>('#grading-problem')!.value;void act(()=>{},()=>learning.useGradingDemo(id));return;}
 if(action==='real-submit'){void submitImage();return;}
 act(()=>{
  if(action?.startsWith('choose-max:')){service.chooseUnit(action.slice(11),'max');return;}
  if(action?.startsWith('choose:')){service.chooseUnit(action.slice(7));return;}
 switch(action){
   case'introduction':service.showIntroduction();break;
   case'home':case'map':case'records':case'max':service.navigate(action);break;
   case'continue':service.continueLearning();break;
   case'accept-diagnosis':service.acceptDiagnosis();break;
   case'submission':clearImage();realMode=false;service.submission();break;
   case'real-submission':clearImage();realMode=true;service.submission();break;
   case'retake':clearImage();break;

   case'back-problem':service.backToProblem();break;
   case'paper-submit':{const input=paperInput(app);service.submitChoice(input.choiceId,input.confirmed);break;}
   case'submit':{const value=app.querySelector<HTMLInputElement>('input[name="outcome"]:checked')?.value;if(!value)throw new Error('結果を選んでください。');const pre=app.querySelector<HTMLSelectElement>('#implicated-skill')?.value;service.submit(value as MockOutcome,value==='prerequisite'&&pre?pre:undefined);break;}
   case'explanation':service.explanation();break;
   case'next':{const acquired=service.snapshot.result?.acquired;service.next();if(acquired)service.navigate('map');break;}
   case'start-max':service.startMax();break;
   case'day':if(!devMode||!learning.namespace.startsWith('demo:'))throw new Error('開発デモ専用です。');service.advanceDay();break;
   case'week':if(!devMode||!learning.namespace.startsWith('demo:'))throw new Error('開発デモ専用です。');service.advanceDay(8);break;
   case'session':service.newSession();break;
  }
 });
});
render();
void learning.boot().then(()=>{ready=true;render();}).catch(e=>{error=e instanceof Error?e.message:'保存状態を読み込めません。';render();});
