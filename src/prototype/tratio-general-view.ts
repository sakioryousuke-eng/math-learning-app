import {generalVariants,generalAudit,inspectTriangle,enumerateSSA} from './tratio-general.ts';
import type {GeneralVariant,Triangle,Point} from './tratio-general.ts';
import {esc} from '../tratio/figures.ts';
const json=(x:unknown)=>`<pre class="bank-json">${esc(JSON.stringify(x,null,2))}</pre>`;
export const generalStorageKey='math:verify:tratio-general:last-submission:v1';

// Same coordinates in both phases; only construction visibility changes.
function triangleSVG(v:GeneralVariant,t:Triangle,solution:boolean,index:number){
  const g=inspectTriangle(t),circle=v.scene.circumcircle,alt=solution&&v.scene.altitudes;
  const H:Point=[t.C[0],0]; // all templates have AB on the x-axis
  const all=[...Object.values(t),...(alt?[H]:[])];
  if(circle)all.push([g.center[0]-g.R,g.center[1]-g.R],[g.center[0]+g.R,g.center[1]+g.R]);
  const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),xmin=Math.min(...xs),ymin=Math.min(...ys),w=Math.max(...xs)-xmin,h=Math.max(...ys)-ymin,k=Math.min(240/Math.max(w,1),170/Math.max(h,1));
  const P=(p:Point):Point=>[55+(p[0]-xmin)*k,225-(p[1]-ymin)*k];
  const text=(p:Point,s:string)=>`<text x="${p[0]}" y="${p[1]}" text-anchor="middle" style="font-size:16px" paint-order="stroke" stroke="white" stroke-width="3">${esc(s)}</text>`;
  const line=(p:Point,q:Point,aux=false)=>`<path d="M${P(p)}L${P(q)}" fill="none" stroke="${aux?'#b96534':'#176b91'}" stroke-width="2" ${aux?'data-general-auxiliary="true" stroke-dasharray="5 4"':''}/>`;
  const sides=([['a','B','C'],['b','C','A'],['c','A','B']] as const).map(([id,u,w])=>{
    const a=P(t[u]),b=P(t[w]),mid:Point=[(a[0]+b[0])/2,(a[1]+b[1])/2+17];
    const given=v.scene.knownValues[id];return line(t[u],t[w])+text(mid,given?`${id}=${given.label}`:id);
  }).join('');
  const angleLabels=([['A','B','C'],['B','C','A'],['C','A','B']] as const).map(([id,u,w])=>{
    const known=v.scene.knownValues[id]??(solution&&((v.scene.target==='A'&&id==='A')||(v.scene.ssa&&id==='B'))?{value:g[id],label:String(Number(g[id].toFixed(3)))}:undefined);if(!known)return '';
    const o=P(t[id]),a=P(t[u]),b=P(t[w]),start=Math.atan2(a[1]-o[1],a[0]-o[0]);let d=Math.atan2(b[1]-o[1],b[0]-o[0])-start;
    while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;
    const point=(angle:number,r:number):Point=>[o[0]+r*Math.cos(angle),o[1]+r*Math.sin(angle)];
    return `<path d="M${point(start,20)}A20 20 0 0 ${d>0?1:0} ${point(start+d,20)}" fill="none" stroke="#b96534"/>`+text([point(start+d/2,40)[0],point(start+d/2,40)[1]+4],`${known.label}°`);
  }).join('');
  const vertices=Object.entries(t).map(([id,p])=>{const xy=P(p);return text([xy[0]-12,xy[1]-8],id);}).join('');
  const circum=circle?`<circle cx="${P(g.center)[0]}" cy="${P(g.center)[1]}" r="${g.R*k}" fill="none" stroke="#99acbd"/>${solution?line(g.center,t.A,true)+text([P(g.center)[0]+10,P(g.center)[1]-5],'O'):''}`:'';
  const height=alt?line(t.C,H,true)+(H[0]<0?line(H,t.A,true):H[0]>t.B[0]?line(t.B,H,true):'')+text([P(H)[0]+10,P(H)[1]+17],'H')+`<path data-general-auxiliary="true" d="M${P(H)[0]} ${P(H)[1]-9}h${H[0]>t.B[0]?-9:9}v9" fill="none" stroke="#b96534"/>`:'';
  return `<figure class="tratio-figure"><svg viewBox="0 0 360 290" role="img" aria-label="${solution?'解説図':'問題図'} ${index+1}：${esc(v.prompt)}">${circum}${sides}${angleLabels}${height}${vertices}</svg><figcaption>${solution?(alt?'CHは底辺AB（必要なら延長）へ下ろした高さです。':'対辺と対角の対応を式と照合してください。'):'図は条件を満たす配置の一例です。未記載の角度や解の個数は図から決めません。'}</figcaption></figure>`;
}
function ssaSVG(v:GeneralVariant,solution:boolean){
  const spec=v.scene.ssa!,rad=spec.A*Math.PI/180,C:Point=[spec.b*Math.cos(rad),spec.b*Math.sin(rad)];
  const roots=solution?enumerateSSA(spec.A,spec.a,spec.b):[];
  // Use the same view range before/after; a possible circle's radius is already
  // a given length, but the solution construction itself stays hidden.
  const xmin=Math.min(0,C[0]-spec.a),xmax=Math.max(spec.b,C[0]+spec.a),ymin=Math.min(0,C[1]-spec.a),ymax=C[1]+spec.a;
  const k=Math.min(240/(xmax-xmin),170/(ymax-ymin)),P=(p:Point):Point=>[55+(p[0]-xmin)*k,225-(p[1]-ymin)*k];
  const a=P([0,0]),c=P(C),end=P([xmax,0]),label=(p:Point,x:string)=>`<text x="${p[0]}" y="${p[1]}" style="font-size:16px" text-anchor="middle" paint-order="stroke" stroke="white" stroke-width="3">${esc(x)}</text>`;
  const path=(p:Point,q:Point,aux=false)=>`<path d="M${P(p)}L${P(q)}" stroke="${aux?'#b96534':'#176b91'}" stroke-width="2" ${aux?'data-general-auxiliary="true" stroke-dasharray="5 4"':''}/>`;
  return `<figure class="tratio-figure"><svg viewBox="0 0 360 290" role="img" aria-label="${solution?'円と半直線による解説図':'SSAの与条件図'}">${path([0,0],[xmax,0])}<path d="M${end[0]-8} ${end[1]-4}l8 4l-8 4" fill="none" stroke="#176b91"/>${path([0,0],C)}${label([a[0]-12,a[1]+17],'A')}${label([c[0],c[1]-10],'C')}${label([(a[0]+c[0])/2-22,(a[1]+c[1])/2],`b=${v.scene.knownValues.b!.label}`)}<path d="M${a[0]+24} ${a[1]}A24 24 0 0 0 ${a[0]+24*Math.cos(rad)} ${a[1]-24*Math.sin(rad)}" fill="none" stroke="#b96534"/>${label([a[0]+42*Math.cos(rad/2),a[1]-42*Math.sin(rad/2)],`${spec.A}°`)}${solution?`<circle data-general-auxiliary="true" cx="${c[0]}" cy="${c[1]}" r="${spec.a*k}" fill="none" stroke="#b96534"/>`+roots.map((t,i)=>path(t.B,t.C,true)+label([P(t.B)[0],P(t.B)[1]+17],`B${i+1}`)).join(''):''}</svg><figcaption>${solution?`Cを中心とする半径aの円と、Aから右への半直線の交点を調べます。Aそのものは除外し、重なる交点は1個と数えます。`:`BはAから右へ伸びる半直線上にあり、BC=${v.scene.knownValues.a!.label} cmです。位置はまだ決めていません。`}</figcaption></figure>`;
}
export function generalFigures(v:GeneralVariant,solution=false){
  if(v.scene.ssa)return ssaSVG(v,solution)+(solution?enumerateSSA(v.scene.ssa.A,v.scene.ssa.a,v.scene.ssa.b).map((t,i)=>triangleSVG(v,t,true,i)).join(''):'');
  return (solution?v.scene.coordinates:v.scene.coordinates.slice(0,1)).map((t,i)=>triangleSVG(v,t,solution,i)).join('');
}
export function generalSubmission(v:GeneralVariant,choiceId:string){const c=v.choices.find(c=>c.choiceId===choiceId);if(!c)throw new Error('選択肢IDが不正');return {familyId:v.familyId,variantId:v.variantId,structureSignature:v.structureSignature,choiceId,correct:c.correct,mistakeHypotheses:c.mistakeHypotheses,independent:false,independenceGroup:`${v.familyId}/${v.structureSignature}`,context:'verify-only',recordedAt:new Date().toISOString()};}
export function generalResult(v:GeneralVariant,id:string){const evidence=generalSubmission(v,id);return `<h2>${evidence.correct?'最終結論は正しいです':'最終結論は未解決です'}</h2><p>紙の途中式は未評価です。1回の誤答で弱点を確定しません。</p><section class="explanation"><h2>考え方</h2><p>${esc(v.thinking)}</p><h2>解き方</h2>${v.working.map(w=>`<p>${esc(w)}</p>`).join('')}<h2>図で確かめる</h2>${generalFigures(v,true)}<h2>答え</h2><p class="answer-example">${esc(v.answer.label)}</p></section><details class="panel"><summary>一般三角形の検証情報</summary><h3>問題属性</h3>${json({familyId:v.familyId,variantId:v.variantId,structureSignature:v.structureSignature,difficulty:v.difficulty,scale:v.scale})}<h3>必要能力・CrossSkill</h3>${json(v.problemRequirements)}<h3>今回の弱点仮説</h3>${json(evidence)}<p>同じ構造の係数違いを独立証拠として数えません。通常学習の修復・stable・MAXには反映しません。</p><h3>採用／除外誤答・diagnosticScore</h3>${json(v.candidates)}<h3>数学モデル・解法</h3>${json(v.scene)}<h3>独立oracle・候補三角形一覧</h3>${json(generalAudit.find(a=>a.variantId===v.variantId))}</details>`;}
let selected=generalVariants[0].variantId,phase:'problem'|'choices'|'result'='problem',chosen='',notice='';
let ordered:GeneralVariant['choices']=[];
export function shuffleGeneral(v:GeneralVariant,random:()=>number=Math.random){const a=[...v.choices];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function renderGeneralPrototype(){const v=generalVariants.find(v=>v.variantId===selected)!;return `<section class="bank-review"><h1>生成問題ファミリー試作2<br>一般三角形の計量</h1><label>問題（12題）<select id="tr-general-problem">${generalVariants.map(v=>`<option value="${v.variantId}" ${selected===v.variantId?'selected':''}>${v.variantId.slice(-3)} · ${v.difficulty}</option>`).join('')}</select></label><section class="problem-paper"><p class="math-text">${esc(v.prompt)}</p></section>${phase!=='result'?generalFigures(v):''}${phase==='problem'?'<p>紙に途中式と根拠を書いてから、結論を選んでください。</p><button class="primary" data-tr-general-action="choices">紙に解いたので4択へ</button>':phase==='choices'?`<fieldset class="answer-options"><legend>紙答案の最終結果</legend>${ordered.map(c=>`<label><input type="radio" name="tr-general-choice" value="${esc(c.choiceId)}"/><span>${esc(c.answer.label)}</span></label>`).join('')}</fieldset><button class="primary" data-tr-general-action="submit">この結論を提出する</button>`:generalResult(v,chosen)+'<button class="secondary" data-tr-general-action="restart">同じ問題を最初から確認</button>'}<p role="status">${esc(notice)}</p><p>検証専用です。通常学習のデータは変更しません。</p><button class="secondary" data-tr-general-action="close">学習画面に戻る</button></section>`;}
export function bindGeneralPrototype(root:HTMLElement,render:()=>void,close:()=>void){
  root.querySelector<HTMLSelectElement>('#tr-general-problem')?.addEventListener('change',e=>{selected=(e.target as HTMLSelectElement).value;phase='problem';chosen='';notice='';render();});
  for(const b of root.querySelectorAll<HTMLButtonElement>('[data-tr-general-action]'))b.addEventListener('click',()=>{const v=generalVariants.find(v=>v.variantId===selected)!;
    if(b.dataset.trGeneralAction==='close'){close();return;}
    if(b.dataset.trGeneralAction==='choices'){ordered=shuffleGeneral(v);phase='choices';}
    if(b.dataset.trGeneralAction==='restart'){phase='problem';chosen='';notice='';}
    if(b.dataset.trGeneralAction==='submit'){const input=root.querySelector<HTMLInputElement>('input[name="tr-general-choice"]:checked');if(!input){notice='結論を1つ選んでください。';render();return;}chosen=input.value;phase='result';try{localStorage.setItem(generalStorageKey,JSON.stringify(generalSubmission(v,chosen)));notice='この試作の直近の検証結果を保存しました。';}catch{notice='検証記録を保存できませんでした。表示中の採点結果は変わりません。';}}
    render();
  });
}
