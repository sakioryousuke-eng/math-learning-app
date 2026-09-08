export type Polynomial=[number,number,number];
export interface ExplanationGraph {title:string;curves:{formula:string;coefficients:Polynomial}[];view:[number,number,number,number];domain?:[number,number];openLeft?:boolean;openRight?:boolean;referencePoints?:number[];caption:string;}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const value=([a,b,c]:Polynomial,x:number)=>a*x*x+b*x+c;
const fmt=(x:number)=>String(Math.abs(x)<1e-8?0:Math.round(x*100)/100);
export function realRoots([a,b,c]:Polynomial):number[]{if(Math.abs(a)<1e-10)return Math.abs(b)<1e-10?[]:[-c/b];const d=b*b-4*a*c;if(d< -1e-10)return [];if(Math.abs(d)<1e-10)return [-b/(2*a)];return [(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)].sort((x,y)=>x-y);}
export function explanationGraph(g:ExplanationGraph){
 const [left,right,bottom,top]=g.view,X=(x:number)=>42+286*(x-left)/(right-left),Y=(y:number)=>250-224*(y-bottom)/(top-bottom);
 const inside=(x:number,y:number)=>x>=left&&x<=right&&y>=bottom&&y<=top;
 const colours=['#1762a3','#b44921','#477536'];
 const points:{x:number;y:number;label:string;open?:boolean}[]=[];
 const lines:string[]=[];
 const add=(x:number,y:number,label:string,open=false)=>{if(!inside(x,y))return;const existing=points.find(p=>Math.abs(p.x-x)<1e-7&&Math.abs(p.y-y)<1e-7);if(existing){existing.label+='・'+label;existing.open=existing.open&&open;}else points.push({x,y,label,open});};
 g.curves.forEach((curve,i)=>{
  const [a,b]=curve.coefficients;
  if(a!==0){const x=-b/(2*a),y=value(curve.coefficients,x);add(x,y,`${i+1}の頂点`);if(x>=left&&x<=right)lines.push(`<path d="M${X(x)},26V250" stroke="${colours[i%3]}" stroke-dasharray="5 5" opacity=".65"/>`);}
  if(g.domain)g.domain.forEach((x,n)=>add(x,value(curve.coefficients,x),`${i+1}の${n?'右':'左'}端`,n===0?g.openLeft:g.openRight));
  g.referencePoints?.forEach(x=>{add(x,value(curve.coefficients,x),`指定点 x=${fmt(x)}での値`);add(x,0,`指定点 x=${fmt(x)}`);lines.push(`<path d="M${X(x)},26V250" stroke="#986725" stroke-dasharray="2 4"/>`);});
 });
 if(g.curves.length===1)for(const x of realRoots(g.curves[0].coefficients))add(x,0,'x軸との共有点');
 else {const f=g.curves[0].coefficients,h=g.curves[1].coefficients;const difference=f.map((v,i)=>v-h[i]) as Polynomial;const roots=realRoots(difference);for(const x of roots){add(x,value(f,x),roots.length===1&&difference[0]!==0?'接点':'共有点');lines.push(`<path d="M${X(x)},${Y(0)}V${Y(value(f,x))}" stroke="#677a87" stroke-dasharray="2 4"/>`);}}
 const paths=g.curves.map((curve,i)=>{
  const path=(l:number,r:number)=>Array.from({length:241},(_,n)=>{const x=l+(r-l)*n/240;return `${n?'L':'M'}${X(x).toFixed(2)},${Y(value(curve.coefficients,x)).toFixed(2)}`;}).join(' ');
  return `<path d="${path(left,right)}" fill="none" stroke="${colours[i%3]}" stroke-width="${g.domain?1.5:2.5}" opacity="${g.domain ? .45 : 1}"/>${g.domain?`<path d="${path(Math.max(left,g.domain[0]),Math.min(right,g.domain[1]))}" fill="none" stroke="${colours[i%3]}" stroke-width="3"/>`:''}`;
 }).join('');
 const ticks=Array.from({length:5},(_,i)=>{const x=left+(right-left)*i/4,y=bottom+(top-bottom)*i/4;return `<text x="${X(x)}" y="269" text-anchor="middle">${fmt(x)}</text><text x="37" y="${Y(y)+4}" text-anchor="end">${fmt(y)}</text>`;}).join('');
 return `<figure class="answer-graph"><h3>${esc(g.title)}</h3><svg viewBox="0 0 350 282" role="img" aria-label="${esc(g.title+'。'+g.caption)}"><svg x="42" y="26" width="286" height="224" viewBox="42 26 286 224" overflow="hidden">${g.domain?`<rect x="${X(g.domain[0])}" y="26" width="${X(g.domain[1])-X(g.domain[0])}" height="224" fill="#e8f2fd"/>`:''}<path d="M42,${Y(0)}H328 M${X(0)},26V250" stroke="#697c89"/>${lines.join('')}${paths}${points.map((p,i)=>`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4" fill="${p.open?'white':'#182e40'}" stroke="#182e40"/><text x="${X(p.x)+6}" y="${Y(p.y)-6}" font-weight="bold">${i+1}</text>`).join('')}</svg>${ticks}<text x="334" y="${Math.max(18,Math.min(245,Y(0)-6))}">x</text><text x="${Math.max(44,Math.min(316,X(0)+7))}" y="17">y</text></svg><ul class="graph-key">${g.curves.map((c,i)=>`<li><span style="color:${colours[i%3]}">━ ${i+1}</span> ${esc(c.formula)}</li>`).join('')}</ul><p>${esc(g.caption)}</p><ol class="graph-points">${points.map(p=>`<li>${esc(p.label)}：(${fmt(p.x)}, ${fmt(p.y)})${p.open?'（含まない）':''}</li>`).join('')}</ol><figcaption>${g.domain?'青い帯が指定されたxの範囲。太線がその範囲のグラフ。':'図の枠は表示範囲であり、定義域の制限ではありません。'}破線は放物線の軸。座標の小数は概数です。正確な値は答え・解説を参照してください。</figcaption></figure>`;
}
