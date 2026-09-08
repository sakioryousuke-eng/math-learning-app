import {rightVariants,rightAudit,validateRightVariant} from './tratio-right.ts';
import type {RightVariant} from './tratio-right.ts';
import {esc} from '../tratio/figures.ts';

export const rightVerifyStorageKey='math:verify:tratio-right:last-submission:v1';
const json=(data:unknown)=>`<pre class="bank-json">${esc(JSON.stringify(data,null,2))}</pre>`;
export function rightSceneFigure(v:RightVariant,solution=false){
  const s=v.scene,entries=Object.entries(s.points),hidden=new Set(s.auxiliaryConstruction.map(a=>a.point));
  const xs=entries.map(([,p])=>p[0]),ys=entries.map(([,p])=>p[1]);
  if(s.circle){const [x,y]=s.points[s.circle.center];xs.push(x-s.circle.radius,x+s.circle.radius);ys.push(y-s.circle.radius,y+s.circle.radius);}
  const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  const scale=Math.min(246/Math.max(1,xmax-xmin),175/Math.max(1,ymax-ymin));
  const X=(x:number)=>55+(x-xmin)*scale,Y=(y:number)=>230-(y-ymin)*scale;
  const p=(id:string)=>[X(s.points[id][0]),Y(s.points[id][1])];
  const text=(x:number,y:number,label:string)=>`<text x="${x}" y="${y}" text-anchor="middle" style="font-size:17px" paint-order="stroke" stroke="white" stroke-width="3" fill="#263d4e">${esc(label)}</text>`;
  const segments=s.segments.filter(e=>solution||!e.auxiliary).map(e=>{const a=p(e.ends[0]),b=p(e.ends[1]);return `<path data-segment="${e.ends.join('-')}" ${e.auxiliary?'data-auxiliary="true" stroke-dasharray="5 4"':''} d="M${a}L${b}" fill="none" stroke="${e.auxiliary?'#b96534':'#176b91'}" stroke-width="2"/>`;}).join('');
  const labels=s.knownLengths.map(k=>{const a=p(k.ends[0]),b=p(k.ends[1]);const vertical=Math.abs(a[0]-b[0])<1e-8;return text((a[0]+b[0])/2+(vertical?24:0),(a[1]+b[1])/2+(vertical?0:18),k.label);}).join('');
  const angles=s.angles.filter(a=>a.given).map(a=>{
    const [u,o,w]=a.points.map(p),start=Math.atan2(u[1]-o[1],u[0]-o[0]),end=Math.atan2(w[1]-o[1],w[0]-o[0]);
    let delta=end-start;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;
    const r=22,x1=o[0]+r*Math.cos(start),y1=o[1]+r*Math.sin(start),x2=o[0]+r*Math.cos(start+delta),y2=o[1]+r*Math.sin(start+delta),mid=start+delta/2;
    return `<path d="M${x1} ${y1}A${r} ${r} 0 0 ${delta>0?1:0} ${x2} ${y2}" fill="none" stroke="#b96534"/>`+text(o[0]+42*Math.cos(mid),o[1]+42*Math.sin(mid)+4,`${a.degrees}°`);
  }).join('');
  const rights=s.rightAngles.filter(r=>solution||!r.auxiliary).map(r=>{const [a,o,b]=r.points.map(p),du=Math.hypot(a[0]-o[0],a[1]-o[1]),dv=Math.hypot(b[0]-o[0],b[1]-o[1]);const u=[(a[0]-o[0])*9/du,(a[1]-o[1])*9/du],w=[(b[0]-o[0])*9/dv,(b[1]-o[1])*9/dv];return `<path d="M${o[0]+u[0]} ${o[1]+u[1]}l${w}l${-u[0]} ${-u[1]}" fill="none" stroke="#607484"/>`;}).join('');
  const vertices=entries.filter(([id])=>solution||!hidden.has(id)).map(([id])=>{const [x,y]=p(id);return `<g data-point="${id}"><circle cx="${x}" cy="${y}" r="2.5" fill="#176b91"/>${text(x-11,y-9,id)}</g>`;}).join('');
  const circle=s.circle?`<circle cx="${p(s.circle.center)[0]}" cy="${p(s.circle.center)[1]}" r="${s.circle.radius*scale}" fill="none" stroke="#91aabd"/>`:'';
  const caption=solution?(s.auxiliaryConstruction.map(a=>a.explanation).join('。')||'解き方で使った角と辺を、元の図で確かめてください。'):'図に記した長さと角が与条件です。必要な補助線は自分で考えてください。';
  return `<figure class="tratio-figure"><svg viewBox="0 0 360 290" role="img" aria-label="${solution?'解説図':'問題図'}：${esc(v.prompt)}" style="font-size:12px">${circle}${segments}${rights}${labels}${angles}${vertices}</svg><figcaption>${esc(caption)}</figcaption></figure>`;
}

export function rightSubmission(v:RightVariant,choiceId:string){
  const choice=v.choices.find(c=>c.choiceId===choiceId);if(!choice)throw new Error('選択肢IDが不正');
  return {familyId:v.familyId,variantId:v.variantId,structureSignature:v.structureSignature,choiceId,correct:choice.correct,
    mistakeHypotheses:choice.mistakeHypotheses,context:'verify-only' as const,independent:false,
    independenceGroup:`${v.familyId}/${v.structureSignature}`,recordedAt:new Date().toISOString()};
}
export function shuffleRightChoices(v:RightVariant,random:()=>number=Math.random){
  const choices=[...v.choices];for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}return choices;
}
export function rightResult(v:RightVariant,choiceId:string){
  const evidence=rightSubmission(v,choiceId);
  return `<h2>${evidence.correct?'最終結論は正しいです':'最終結論は未解決です'}</h2><p>紙の途中式は未評価です。1回の誤答で弱点を確定しません。</p><section class="explanation"><h2>考え方</h2><p>${esc(v.thinking)}</p><h2>解き方</h2>${v.working.map(w=>`<p>${esc(w)}</p>`).join('')}<h2>図で確かめる</h2>${rightSceneFigure(v,true)}<h2>答え</h2><p class="answer-example">${esc(v.answer)}</p></section><details class="panel"><summary>生成問題の検証情報</summary><h3>familyId / variantId / structureSignature</h3>${json({familyId:v.familyId,variantId:v.variantId,structureSignature:v.structureSignature,difficulty:v.difficulty,scale:v.scale})}<h3>この問題で必要な能力・CrossSkill</h3>${json(v.problemRequirements)}<h3>選択した誤答から得られる弱点仮説</h3>${json(evidence)}<p>検証専用記録です。同じ構造の係数違いや再提出を独立した習熟証拠として数えず、通常学習の修復・stable・MAXへは反映しません。</p><h3>採用／除外した誤答・diagnosticScore</h3>${json(v.candidates)}<h3>数学モデル・解法</h3>${json(v.scene)}<h3>独立coordinate oracle</h3>${json(rightAudit.find(a=>a.variantId===v.variantId)??validateRightVariant(v))}</details>`;
}
let selected=rightVariants[0].variantId,chosen='',phase:'problem'|'choices'|'result'='problem',storageNotice='';
let ordered:RightVariant['choices']=[];
export function renderRightPrototype(){
  const v=rightVariants.find(v=>v.variantId===selected)!;
  return `<section class="bank-review"><h1>生成問題ファミリー試作1<br>直角三角形・図形計量</h1><label>問題（12題）<select id="tr-right-problem">${rightVariants.map(v=>`<option value="${v.variantId}" ${v.variantId===selected?'selected':''}>${v.variantId.slice(-3)} · ${v.difficulty}</option>`).join('')}</select></label><section class="problem-paper"><p class="math-text">${esc(v.prompt)}</p></section>${phase!=='result'?rightSceneFigure(v):''}${phase==='problem'?'<p>紙に途中式と根拠を書いてから、最終結果を選んでください。</p><button class="primary" data-tr-right-action="choices">紙に解いたので4択へ</button>':phase==='choices'?`<fieldset class="answer-options"><legend>紙答案の最終結果</legend>${ordered.map(c=>`<label><input type="radio" name="tr-right-choice" value="${esc(c.choiceId)}"/><span>${esc(c.text)}</span></label>`).join('')}</fieldset><button class="primary" data-tr-right-action="submit">この結論を提出する</button>`:rightResult(v,chosen)+'<button class="secondary" data-tr-right-action="restart">同じ問題を最初から確認</button>'}<p role="status">${esc(storageNotice)}</p><p>検証専用です。通常学習のデータは変更しません。</p><button class="secondary" data-tr-right-action="close">学習画面に戻る</button></section>`;
}
export function bindRightPrototype(root:HTMLElement,render:()=>void,close:()=>void){
  root.querySelector<HTMLSelectElement>('#tr-right-problem')?.addEventListener('change',e=>{selected=(e.target as HTMLSelectElement).value;phase='problem';chosen='';storageNotice='';render();});
  for(const b of root.querySelectorAll<HTMLButtonElement>('[data-tr-right-action]'))b.addEventListener('click',()=>{
    const v=rightVariants.find(v=>v.variantId===selected)!;
    if(b.dataset.trRightAction==='close'){close();return;}
    if(b.dataset.trRightAction==='choices'){ordered=shuffleRightChoices(v);phase='choices';}
    if(b.dataset.trRightAction==='restart'){phase='problem';chosen='';storageNotice='';}
    if(b.dataset.trRightAction==='submit'){
      const input=root.querySelector<HTMLInputElement>('input[name="tr-right-choice"]:checked');if(!input){storageNotice='紙答案に近い結論を1つ選んでください。';render();return;}
      chosen=input.value;const evidence=rightSubmission(v,chosen);phase='result';
      try{localStorage.setItem(rightVerifyStorageKey,JSON.stringify(evidence));storageNotice='この試作の直近の検証結果を保存しました。';}catch{storageNotice='検証記録を保存できませんでした。表示中の採点結果は変わりません。';}
    }
    render();
  });
}
