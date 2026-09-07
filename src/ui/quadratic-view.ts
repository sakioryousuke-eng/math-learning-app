import type {ReviewedLesson,GraphSpec} from '../curriculum/quadratic.ts';
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function graphSvg(g:GraphSpec){
 const [l,r,b,t]=g.view,W=420,H=260;
 const X=(x:number)=>30+(x-l)/(r-l)*(W-45),Y=(y:number)=>H-25-(y-b)/(t-b)*(H-45);
 const paths=g.curves.map(([a,b,c],i)=>{
  const pts=Array.from({length:241},(_,n)=>{const x=l+(r-l)*n/240;return `${n?'L':'M'}${X(x).toFixed(2)},${Y(a*x*x+b*x+c).toFixed(2)}`;}).join(' ');
  return `<path d="${pts}" fill="none" stroke="${['#126bb5','#b24e24','#63813d'][i%3]}" stroke-width="2"/>`;
 }).join('');
 const [a,bb,c]=g.curves[0];const vertex=a!==0?-bb/(2*a):null;
 const marks=[...(g.restricted?g.domain:[]),...(vertex===null?[]:[vertex])].map(x=>`<circle cx="${X(x)}" cy="${Y(a*x*x+bb*x+c)}" r="4" fill="#123c58"/>`).join('');
 return `<figure><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.features.join('・'))}。青が第一関数、橙が第二関数、緑が差。"><defs><clipPath id="graph-box"><rect x="30" y="20" width="375" height="215"/></clipPath></defs>${g.restricted?`<rect x="${X(g.domain[0])}" y="20" width="${X(g.domain[1])-X(g.domain[0])}" height="215" fill="#edf5fc"/>`:""}<g clip-path="url(#graph-box)"><path d="M30,${Y(0)}H405 M${X(0)},20V235" stroke="#8999a4"/>${paths}${marks}${vertex===null?'':`<path d="M${X(vertex)},20V235" stroke="#777" stroke-dasharray="4 4"/>`}</g><text x="30" y="255">x: ${l} … ${r} ／ y: ${b} … ${t}</text></svg><figcaption>青：第一関数／橙：第二関数／緑：差。${g.restricted?"帯は指定区間、点は端点と頂点。":"図の枠は表示範囲で、定義域の制限ではありません。点は頂点。"}破線は軸。概形の補助図です。数値・開閉端点は問題文で確認してください。</figcaption></figure>`;
}
export function lessonPanel(l:ReviewedLesson|undefined,shown:boolean){
 if(!l||l.step===0||l.step===5||l.problem.purpose==='max')return '';
 const intro=l.introduction;
 return `<section class="panel"><p>STEP ${l.step} · 図と式を対応させる</p>${intro?`<p>${esc(intro.trial)}</p>${shown?`<p>${esc(intro.need)}</p><p>${esc(intro.tool)}</p><p>${esc(intro.returnToProblem)}</p><p>説明を見た問題は、独立した成功の回数に含めません。</p>`:'<button class="secondary" data-action="introduction">道具の説明を読む</button>'}`:''}${l.graph?`<details><summary>グラフを作業台にする</summary>${l.graph.note?`<p>${esc(l.graph.note)}</p>`:''}${graphSvg(l.graph)}</details>`:''}</section>`;
}
