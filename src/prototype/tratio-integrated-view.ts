import {integratedTratioVariants,validateIntegrated,runIntegratedRoute,type IntegratedTratioProblem} from './tratio-integrated.ts';
import {rightSceneFigure} from './tratio-right-view.ts';
import {rightVariants} from './tratio-right.ts';
import {inspectTriangle} from './tratio-general.ts';
import {esc} from '../tratio/figures.ts';
export const integratedTratioStorageKey='math:verify:tratio-integrated:last-submission:v1';
const json=(data:unknown)=>`<pre class="bank-json">${esc(JSON.stringify(data,null,2))}</pre>`;

export function integratedTratioFigure(v:IntegratedTratioProblem,solution=false){
  const scene=structuredClone(v.scene);
  if(solution){
    const values=runIntegratedRoute(v.selectedMathematicalRoute);
    for(const step of v.selectedMathematicalRoute){
      if(step.id.length!==2||!scene.points[step.id[0]]||!scene.points[step.id[1]]||scene.knownLengths.some(k=>k.ends.join('')===step.id))continue;
      scene.knownLengths.push({ends:[step.id[0],step.id[1]],value:values[step.id],label:v.solutionTrace.find(t=>t.phase==='CALCULATE'&&t.node===step.id)!.value!.label});
    }
    if(v.target.kind==='circumradius'){
      const [a,b,c]=v.target.triangle,g=inspectTriangle({A:scene.points[a],B:scene.points[b],C:scene.points[c]});
      scene.points.O=g.center;scene.circle={center:'O',radius:g.R};
    }
  }
  // Rendering adapter only: the shared SVG reads scene and prompt. It does not
  // submit or grade this Family #1 object, nor save it as learning evidence.
  return rightSceneFigure({...rightVariants[0],scene,prompt:v.prompt},solution);
}
export function integratedTratioSubmission(v:IntegratedTratioProblem,id:string){
  const choice=v.choices.find(c=>c.choiceId===id);if(!choice)throw new Error('選択肢IDが不正');
  const hypothesis=choice.mistakeHypotheses;
  return {familyId:v.familyId,variantId:v.variantId,structureSignature:v.structureSignature,requirements:v.problemRequirements.map(r=>r.id),choiceId:id,correct:choice.correct,mistakeHypotheses:hypothesis,routeSelection:hypothesis?.stage==='routeSelection'?hypothesis:null,execution:hypothesis?.stage==='execution'?hypothesis:null,context:'verify-only',independent:false,independenceGroup:v.structureSignature,evidencePolicy:'別familyであってもstructureSignatureとrequirementsの重なりを確認する。通常カルテには反映しない。',recordedAt:new Date().toISOString()};
}
export function shuffleIntegratedTratio(v:IntegratedTratioProblem,random:()=>number=Math.random){const choices=[...v.choices];for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}return choices;}
export function integratedTratioResult(v:IntegratedTratioProblem,id:string){
  const evidence=integratedTratioSubmission(v,id);
  return `<h2>${evidence.correct?'最終結論は正しいです':'最終結論は未解決です'}</h2><p>紙の途中式は未評価です。別の正しい解法も使えます。1回の誤答で弱点を確定しません。</p><section class="explanation"><h2>考え方</h2><p>${esc(v.thinking)}</p><h2>解き方</h2>${v.working.map(t=>`<p>${esc(t)}</p>`).join('')}<h2>図で確かめる</h2>${integratedTratioFigure(v,true)}${v.candidateConfigurations.length?`<p>${v.candidateConfigurations.map(c=>`${esc(c.label)}：${c.accepted?'採用':'除外'}。${esc(c.reason)}`).join('<br>')}</p>`:''}<h2>答え</h2><p class="answer-example">${esc(v.targetDescription)}：${esc(v.answer.label)} ${esc(v.unit)}</p></section><details class="panel"><summary>総合判断の検証情報</summary><h3>問題属性</h3>${json({familyId:v.familyId,variantId:v.variantId,structureSignature:v.structureSignature,difficulty:v.difficulty,scale:v.scale})}<h3>必要能力・CrossSkill</h3>${json(v.problemRequirements)}<h3>今回の弱点仮説／routeSelection・execution</h3>${json(evidence)}<h3>solutionTrace・中間量の受け渡し</h3>${json(v.solutionTrace)}<h3>採用／除外誤答・diagnosticScore・coherent wrong model</h3>${json(v.candidates)}<h3>composition model</h3>${json({scene:v.scene,components:v.components,knownInformation:v.knownInformation,target:v.target,intermediateTargets:v.intermediateTargets,candidateRoutes:v.candidateRoutes,selectedMathematicalRoute:v.selectedMathematicalRoute,validityConditions:v.validityConditions})}<h3>originalPredicate</h3>${json(v.originalPredicate)}<h3>独立coordinate oracle・候補の採否</h3>${json(validateIntegrated(v))}<p>同じ構造や能力の重なりを、別familyだからという理由で独立証拠に数えません。</p></details>`;
}
let selected=integratedTratioVariants[0].variantId,phase:'problem'|'choices'|'result'='problem',chosen='',notice='';
let ordered:IntegratedTratioProblem['choices']=[];
export function renderIntegratedTratioPrototype(){
  const v=integratedTratioVariants.find(v=>v.variantId===selected)!;
  // When a distractor requires a long nested radical, show all four choices in
  // the same approximation format so typography cannot identify the answer.
  const approximate=v.choices.some(c=>c.answer.label.startsWith('約'));
  return `<section class="bank-review" style="min-width:0;max-width:100%;overflow-wrap:anywhere"><h1>生成問題ファミリー試作3<br>三角比・総合判断</h1><label>問題（12題）<select id="tr-integrated-problem">${integratedTratioVariants.map(v=>`<option value="${v.variantId}" ${selected===v.variantId?'selected':''}>${v.variantId.slice(-3)} · ${v.difficulty} · ${esc(v.title)}</option>`).join('')}</select></label><h2>${esc(v.title)}</h2><section class="problem-paper"><p class="math-text">${esc(v.prompt)}</p></section>${phase!=='result'?integratedTratioFigure(v):''}${phase==='problem'?'<p>紙に途中式と根拠を書いてから、結論を選んでください。</p><button class="primary" data-tr-integrated-action="choices">紙に解いたので4択へ</button>':phase==='choices'?`<fieldset class="answer-options"><legend>紙答案の最終結果</legend>${approximate?'<p>4つとも近似値で表示しています。</p>':''}${ordered.map(c=>`<label><input type="radio" name="tr-integrated-choice" value="${esc(c.choiceId)}"/><span>${esc(approximate?`約${Number(c.answer.value.toFixed(6))}`:c.answer.label)} ${esc(v.unit)}</span></label>`).join('')}</fieldset><button class="primary" data-tr-integrated-action="submit">この結論を提出する</button>`:integratedTratioResult(v,chosen)+'<button class="secondary" data-tr-integrated-action="restart">同じ問題を最初から確認</button>'}<p role="status">${esc(notice)}</p><p>検証専用です。通常学習のデータは変更しません。</p><button class="secondary" data-tr-integrated-action="close">学習画面に戻る</button></section>`;
}
export function bindIntegratedTratioPrototype(root:HTMLElement,render:()=>void,close:()=>void){
  root.querySelector<HTMLSelectElement>('#tr-integrated-problem')?.addEventListener('change',e=>{selected=(e.target as HTMLSelectElement).value;phase='problem';chosen='';notice='';render();});
  for(const b of root.querySelectorAll<HTMLButtonElement>('[data-tr-integrated-action]'))b.addEventListener('click',()=>{
    const v=integratedTratioVariants.find(v=>v.variantId===selected)!;
    if(b.dataset.trIntegratedAction==='close'){close();return;}
    if(b.dataset.trIntegratedAction==='choices'){ordered=shuffleIntegratedTratio(v);phase='choices';}
    if(b.dataset.trIntegratedAction==='restart'){phase='problem';chosen='';notice='';}
    if(b.dataset.trIntegratedAction==='submit'){
      const input=root.querySelector<HTMLInputElement>('input[name="tr-integrated-choice"]:checked');if(!input){notice='結論を1つ選んでください。';render();return;}
      chosen=input.value;phase='result';try{localStorage.setItem(integratedTratioStorageKey,JSON.stringify(integratedTratioSubmission(v,chosen)));notice='この試作の検証結果を保存しました。';}catch{notice='検証記録を保存できませんでした。表示中の結果は変わりません。';}
    }
    render();
  });
}
