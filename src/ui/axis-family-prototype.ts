import {axisProblems,axisGraph,axisState,axisValues,caseText,includesAxis} from '../prototype/quadratic-axis-family.ts';
import type {AxisProblem} from '../prototype/quadratic-axis-family.ts';
import {dynamicQuadratic,bindDynamicQuadratic} from './dynamic-quadratic.ts';
import type {DynamicSpec} from './dynamic-quadratic.ts';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const lines=(s:string)=>esc(s).replace(/\n/g,'<br>');
export function axisDynamicSpec(p:AxisProblem):DynamicSpec{
 const m=p.model,{L,R}=m.parameters,w=R-L,values=m.boundaries,boundaries=values.map(value=>({value,label:String(value)}));
 const regions=[`a＜${values[0]}`,...values.flatMap((v,i)=>[`a=${v}`,...(i<values.length-1?[`${v}＜a＜${values[i+1]}`]:[])]),`a＞${values.at(-1)}`];
 return {parameter:'a',min:L-w/2,max:R+w/2,initial:m.midpoint,boundaries,regions,
 region:a=>{for(let i=0;i<values.length;i++){if(a<values[i])return i*2;if(Math.abs(a-values[i])<1e-10)return i*2+1;}return values.length*2;},graph:a=>axisGraph(m.parameters,a),
 reason:a=>{
  const state=axisState(m.parameters,a),position=state.vertexInside?'区間内':a<L?'区間の左側':'区間の右側';
  const now=(['max','min'] as const).filter(k=>m.answer[k]).map(k=>{const r=m.answer[k]!.find(r=>includesAxis(r,a))!;const point=r.point==='both'?'左右両端':r.point==='vertex'?'頂点':r.point==='left'?'左端':'右端';return `${k==='max'?'最大値':'最小値'}は約${Math.round(axisValues(m.answer,k,a)[0]*100)/100}（${point}）。現在は ${caseText(r).replaceAll('<','＜')} の場合です。`;}).join(' ');
  return `軸は${position}にあります。${now}`;
 }};
}
let selectedProblem=0,phase:'problem'|'choices'|'result'='problem',selectedChoice='',notice='';
let ordered:AxisProblem['choices']=[];
export function resetAxisProblem(id:string){const i=axisProblems.findIndex(p=>p.id===id);if(i<0)return;selectedProblem=i;phase='problem';selectedChoice='';notice='';}
export function renderAxisResult(p:AxisProblem,choiceId:string){
 const selected=p.choices.find(c=>c.choiceId===choiceId);
 return `<h2>${selected?.correct?'最終結論は正しいです':'最終結論は未解決です'}</h2><p>紙の途中式は評価していません。1回の選択だけで弱点は確定しません。</p><section class="explanation quadratic-answer"><h2>考え方</h2><p>${esc(p.explanation.thinking)}</p><h2>解き方</h2>${p.explanation.steps.map(s=>`<p>${esc(s)}</p>`).join('')}<h2>動かして確かめる</h2>${dynamicQuadratic(p.id,axisDynamicSpec(p))}<h2>答え</h2><p class="answer-example">${lines(p.explanation.answer)}</p></section><details class="panel"><summary>検証情報：必要能力・弱点仮説・誤答選定</summary><h3>この問題で必要な能力</h3><ul>${p.problemRequirements.map(r=>`<li>${esc(r.description)}（${r.crossSkills.join('、')}）</li>`).join('')}</ul><h3>今回選択した誤答の弱点仮説</h3>${selected?.mistakeHypotheses.map(h=>`<p>${esc(h.description)}。タグ：${h.weaknessTags.join('、')}／CrossSkill：${h.crossSkills.join('、')}</p>`).join('')||'<p>なし</p>'}<h3>場合分け境界</h3><p>${p.model.boundaries.map(v=>`a=${v}`).join('、')}</p><h3>4択と誤答候補</h3><p>正答：${lines(p.explanation.answer)}</p>${p.decisions.map(c=>`<section><h4>${c.selected?'採用':'除外'}：${c.type}${c.choice.choiceId===choiceId?'（今回選択）':''}</h4><p>${lines(c.choice.text)}</p><p>diagnosticScore：${c.diagnosticScore}</p><p>診断価値：${esc(c.reason)}</p><p>理由：${esc(c.selectionReason)}</p></section>`).join('')}</details><details class="panel"><summary>教材レビューの確認ポイント</summary><p>なぜ場合分けするか、境界がどこから導かれるか、漏れ・重複がないかを確認してください。誤答が自然か、動かした図と式が一致するか、第1ファミリーと異なる判断が必要か、12題の判断量に違いがあるかも確認できます。</p></details>`;
}
export function renderAxisPrototype(){const p=axisProblems[selectedProblem];
 const paper=`<section class="problem-paper"><p class="paper-caption">問題 ${p.index} / 12 ・ ${p.model.parameters.level}</p><p class="math-text">${esc(p.prompt)}</p></section>`;
 const body=phase==='problem'?'<p>紙に場合分け・途中式・結論を書いてから進んでください。</p><button class="primary" data-axis-action="choices">紙に解いたので4択へ</button>':phase==='choices'?`<fieldset class="answer-options"><legend>紙答案の最終結果を選ぶ</legend>${ordered.map(c=>`<label><input type="radio" name="axis-choice" value="${c.choiceId}"/><span>${lines(c.text)}</span></label>`).join('')}</fieldset><button class="primary" data-axis-action="submit">最終結論を提出する</button>`:renderAxisResult(p,selectedChoice);
 return `<div class="family-prototype"><h1>生成問題ファミリー試作2 軸が動く最大・最小</h1><p class="notice">検証専用の12題です。通常学習・stable・MAXには反映しません。まだreviewed教材ではありません。</p><label for="axis-number">確認する問題</label><select id="axis-number">${axisProblems.map(q=>`<option value="${q.id}" ${p.id===q.id?'selected':''}>${q.index}. ${q.model.parameters.level}／${q.model.opening}に開く／${q.model.parameters.target==='both'?'最大・最小':q.model.parameters.target==='min'?'最小':'最大'}／[${q.model.interval.join(', ')}]</option>`).join('')}</select>${paper}<p role="status">${esc(notice)}</p>${body}<button class="secondary" data-axis-action="restart">この問題を最初から見る</button><button class="secondary" data-axis-action="next">次の問題へ</button><button class="secondary" data-axis-action="close">通常の検証画面へ戻る</button></div>`;
}
export function axisAttempt(p:AxisProblem,choiceId:string,at:string){const c=p.choices.find(c=>c.choiceId===choiceId);if(!c)throw new Error('Unknown axis choice');return {problemId:p.id,parameters:p.model.parameters,choiceId,correct:c.correct,problemRequirements:p.problemRequirements,mistakeHypotheses:c.mistakeHypotheses,hypothesisOnly:true,at,generatorVersion:1};}
export function bindAxisPrototype(root:HTMLElement,render:()=>void,close:()=>void){
 const p=axisProblems[selectedProblem];bindDynamicQuadratic(root,{[p.id]:axisDynamicSpec(p)});
 root.querySelector<HTMLSelectElement>('#axis-number')?.addEventListener('change',e=>{resetAxisProblem((e.target as HTMLSelectElement).value);render();});
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-axis-action]'))button.addEventListener('click',()=>{
  const action=button.dataset.axisAction;if(action==='close'){close();return;}
  if(action==='restart')resetAxisProblem(p.id);
  if(action==='next')resetAxisProblem(axisProblems[(selectedProblem+1)%axisProblems.length].id);
  if(action==='choices'){ordered=[...p.choices];for(let i=ordered.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ordered[i],ordered[j]]=[ordered[j],ordered[i]];}phase='choices';}
  if(action==='submit'){
   const id=root.querySelector<HTMLInputElement>('input[name="axis-choice"]:checked')?.value;
   if(!id){notice='紙答案に当てはまる結論を選んでください。';render();return;}
   const record=axisAttempt(p,id,new Date().toISOString());selectedChoice=id;phase='result';
   try{const key='math-axis-family-prototype:attempts:v1',saved=JSON.parse(localStorage.getItem(key)??'[]');if(!Array.isArray(saved))throw new Error('Invalid history');saved.push(record);localStorage.setItem(key,JSON.stringify(saved));notice='第2ファミリー専用の履歴に記録しました。通常学習の記録は変更していません。';}catch{notice='試作履歴を保存できませんでした。結果はこの画面で確認できます。';}
  }
  render();root.querySelector('.family-prototype')?.scrollIntoView({block:'start'});
 });
}
