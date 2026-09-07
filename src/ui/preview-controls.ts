import type {LearningCatalog} from '../curriculum/types.ts';
const selected={unit:'QFN',step:'all',skill:'all',problem:'',stable:'before'};
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function select(key:keyof typeof selected,label:string,options:[string,string][]){return `<label for="preview-${key}">${label}</label><select id="preview-${key}">${options.map(([id,text])=>`<option value="${esc(id)}" ${selected[key]===id?'selected':''}>${esc(text)}</option>`).join('')}</select>`;}
export function previewControls(c:LearningCatalog){
 const reviewed=(c.lessonMetadata??[]).filter(l=>l.problem.reviewStatus==='reviewed');
 const owner=(skill:string)=>c.master.skills.find(s=>s.id===skill)!.unitId;
 const units=c.master.units.filter(u=>reviewed.some(l=>owner(l.problem.skillId)===u.id));
 const unitPool=reviewed.filter(l=>owner(l.problem.skillId)===selected.unit);
 const stepPool=unitPool.filter(l=>selected.step==='all'||String(l.step)===selected.step);
 const skills=c.master.skills.filter(s=>stepPool.some(l=>l.problem.skillId===s.id));
 if(!skills.some(s=>s.id===selected.skill))selected.skill='all';
 const pool=stepPool.filter(l=>selected.skill==='all'||l.problem.skillId===selected.skill);
 if(!pool.some(l=>l.problem.id===selected.problem))selected.problem=pool[0]?.problem.id??'';
 return `<section class="preview-controls"><h2>教材を直接確認</h2><p>前提未達でも検証専用デモで開きます。</p>${select('unit','単元',units.map(u=>[u.id,u.name]))}${select('step','STEP',[['all','すべて'],...[...new Set(unitPool.map(l=>l.step))].sort().map(n=>[String(n),n===0?'前提修復':`STEP ${n}`] as [string,string])])}${select('skill','Skill',[['all','すべて'],...skills.map(s=>[s.id,s.name] as [string,string])])}${select('problem','reviewed問題',pool.map(l=>[l.problem.id,`${l.problem.purpose==='max'?'MAX · ':''}${l.problem.id} · ${l.problem.prompt}`]))}${select('stable','対象Skillの状態',[['before','stable前'],['after','stable後']])}<button class="secondary" data-action="preview-problem" ${pool.length?'':'disabled'}>この問題を直接開く</button></section>`;
}
export function bindPreview(root:HTMLElement,render:()=>void){
 for(const key of Object.keys(selected) as (keyof typeof selected)[])root.querySelector<HTMLSelectElement>(`#preview-${key}`)?.addEventListener('change',event=>{selected[key]=(event.target as HTMLSelectElement).value;if(key==='unit'){selected.step='all';selected.skill='all';}if(key==='step')selected.skill='all';render();});
}
export function previewSelection(){return {id:selected.problem,stable:selected.stable==='after'};}
