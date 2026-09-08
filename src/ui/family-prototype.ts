import {familyProblems,numberText} from '../prototype/quadratic-family.ts';
import type {FamilyProblem} from '../prototype/quadratic-family.ts';
import {explanationGraph} from './explanation-graph.ts';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let current=0,phase:'problem'|'choice'|'result'='problem',choices:FamilyProblem['choices']=[],selected='',storageNotice='',inputError='';
export function selectFamily(id:string){const index=familyProblems.findIndex(p=>p.id===id);if(index<0)return;current=index;phase='problem';selected='';inputError='';storageNotice='';}
export function renderFamilyAttributes(p:FamilyProblem,selectedChoiceId:string){
 const selected=p.choices.find(c=>c.choiceId===selectedChoiceId);
 return `<h3>この問題で必要な能力</h3><ul>${p.problemRequirements.map(r=>`<li>${esc(r.description)}（${r.crossSkills.join('、')}）</li>`).join('')}</ul><h3>今回選択した誤答から得られる弱点仮説</h3>${selected?.mistakeHypotheses.length?selected.mistakeHypotheses.map(h=>`<p>${esc(h.description)}。弱点確定ではありません。</p><p>タグ：${h.weaknessTags.join('、')}／CrossSkill：${h.crossSkills.join('、')}</p>`).join(''):'<p>なし。正答または未選択のため、弱点仮説は付与しません。</p>'}`;
}
export function renderDistractorSelection(p:FamilyProblem){
 return `<h3>誤答候補の採用・除外</h3>${p.distractorSelection.map(c=>`<section><h4>${c.selected?'採用':'除外'}：${esc(c.key)}</h4><p>${esc(c.choice.text)}／diagnosticScore：${c.diagnosticScore}</p><p>診断価値：${esc(c.relevanceReason)}</p><p>理由：${esc(c.selectionReason)}</p></section>`).join('')}`;
}
export function renderFamilyPrototype(){
 const p=familyProblems[current],choice=p.choices.find(c=>c.choiceId===selected);
 const selector=`<h1>生成問題ファミリー試作</h1><p class="notice">検証専用の20題です。通常学習・stable・MAXには反映しません。まだreviewed教材ではありません。</p><label for="family-number">確認する問題</label><select id="family-number">${familyProblems.map(p=>`<option value="${p.id}" ${p.index===current+1?'selected':''}>${p.index}. 頂点(${numberText(p.model.parameters.h)}, ${numberText(p.model.parameters.c)})／${esc(p.model.interval)}</option>`).join('')}</select>`;
 const problem=`<section class="problem-paper"><p class="paper-caption">問題 ${p.index} / 20</p><p class="math-text">${esc(p.prompt)}</p></section>`;
 const body=phase==='problem'?`${problem}<p>紙に途中式・根拠・最終結論を書いてから進んでください。</p><button class="primary" data-family-action="choices">紙に解いたので4択へ</button>`:phase==='choice'?`${problem}<fieldset class="answer-options"><legend>紙答案の最終結果に当てはまるものを選ぶ</legend>${choices.map(c=>`<label><input type="radio" name="family-choice" value="${c.choiceId}"/><span>${esc(c.text)}</span></label>`).join('')}</fieldset>${inputError?`<p role="alert">${esc(inputError)}</p>`:''}<button class="primary" data-family-action="submit">最終結論を提出する</button>`:`${problem}<h2>${choice?.correct?'最終結論は正しいです':'最終結論は未解決です'}</h2><p>これは試作内の結論判定です。途中の紙答案は評価していません。</p><p role="status">${esc(storageNotice)}</p><section class="explanation quadratic-answer"><h2>考え方</h2><p>${esc(p.explanation.thinking)}</p><h2>解き方</h2>${p.explanation.steps.map(s=>`<p class="math-text">${esc(s)}</p>`).join('')}<h2>グラフ</h2>${explanationGraph(p.graph)}<h2>答え</h2><p class="answer-example">${esc(p.answer)}</p></section><details class="panel"><summary>検証情報：数学モデル・誤答・弱点仮説</summary><p>1回の誤答は弱点確定ではありません。下記はその選択と整合する仮説です。</p><p>状況：${p.model.limiting==='both'?'両端':p.model.limiting==='left'?'左端':'右端'}が上限を決定／上限の等号${p.model.finalRange.upperClosed?'あり':'なし'}</p>${renderFamilyAttributes(p,selected)}${renderDistractorSelection(p)}<p>実数解条件：${esc(p.model.realCondition)}／異なる2点：${esc(p.model.distinctCondition)}</p><p>左の根：${esc(p.model.leftRootCondition)}／右の根：${esc(p.model.rightRootCondition)}</p><p>境界：重解 ${numberText(p.model.boundaries.doubleRoot)}、左端 ${numberText(p.model.boundaries.leftEndpoint)}、右端 ${numberText(p.model.boundaries.rightEndpoint)}</p>${p.choices.map(c=>`<section><h3>${esc(c.text)} ${c.correct?'（正答）':''}${c.choiceId===selected?'（今回選択）':''}</h3><p>mistakeType：${c.mistakeType??'なし'}</p>${c.mistakeHypotheses.map(h=>`<p>弱点仮説：${esc(h.description)}</p><p>タグ：${h.weaknessTags.join('、')}／CrossSkill：${h.crossSkills.join('、')}</p>`).join('')||'<p>弱点仮説：なし</p>'}</section>`).join('')}</details><details class="panel"><summary>教材レビューの確認ポイント</summary><ul><li>A 数学：重解の除外・両根の範囲・上限の等号は正しいか。</li><li>B 多様性：上限を決める端点や、開いた端点を見直す必要があるか。</li><li>C 4択：誤答は自然か。正答だけが見た目で浮いていないか。</li><li>D 解説：なぜ両根の条件を見るか、元の区間に戻って分かるか。</li><li>E グラフ：指定区間・共有点・端点の開閉が説明と一致するか。</li><li>F 価値：判別式だけでは足りないことを学べるか。</li></ul></details><button class="primary" data-family-action="next">次の生成問題へ</button>`;
 return `<div class="family-prototype">${selector}${body}<button class="secondary" data-family-action="problem">この問題を最初から見る</button><button class="secondary" data-family-action="close">通常の検証画面へ戻る</button></div>`;
}
export function bindFamilyPrototype(root:HTMLElement,render:()=>void,close:()=>void){
 root.querySelector<HTMLSelectElement>('#family-number')?.addEventListener('change',event=>{selectFamily((event.target as HTMLSelectElement).value);render();});
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-family-action]'))button.addEventListener('click',()=>{
  const p=familyProblems[current],action=button.dataset.familyAction;
  if(action==='close'){close();return;}
  if(action==='choices'){choices=[...p.choices];for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}phase='choice';}
  if(action==='problem')selectFamily(p.id);
  if(action==='next')selectFamily(familyProblems[(current+1)%familyProblems.length].id);
  if(action==='submit'){
   const id=root.querySelector<HTMLInputElement>('input[name="family-choice"]:checked')?.value,choice=p.choices.find(c=>c.choiceId===id);
   if(!choice){inputError='紙答案に当てはまる最終結論を選んでください。';render();return;}
   selected=choice.choiceId;phase='result';
   const record={problemId:p.id,parameters:p.model.parameters,choiceId:selected,correct:choice.correct,mistakeType:choice.mistakeType,problemRequirements:p.problemRequirements,mistakeHypotheses:choice.mistakeHypotheses,attributeVersion:2,hypothesisOnly:true,at:new Date().toISOString(),generatorVersion:1};
   try{const key='math-family-prototype:attempts:v1',saved=JSON.parse(localStorage.getItem(key)??'[]');if(!Array.isArray(saved))throw new Error('Invalid prototype history');saved.push(record);localStorage.setItem(key,JSON.stringify(saved));storageNotice='試作専用の履歴に記録しました。通常の学習記録は変更していません。';}catch{storageNotice='この端末では試作履歴を保存できませんでした。今回の判定は画面で確認できます。';}
  }
  render();root.querySelector<HTMLElement>('.family-prototype')?.scrollIntoView({block:'start'});
 });
}
