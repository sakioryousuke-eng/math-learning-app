import {shuffledChoices} from '../grading/paper-choices.ts';
import {allPaperSpecs as paperSpecs} from '../bank/paper.ts';
import type {PaperChoice} from '../grading/paper-choices.ts';
import type {PaperSpec} from '../grading/paper-choices.ts';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let draft:{token:string;id:string;choices:PaperChoice[];choice:string;checks:boolean}|null=null;
export function paperSubmission(id:string,token:string,max:boolean,specs:Record<string,PaperSpec>=paperSpecs){
 const spec=specs[id];if(!spec)return '';
 if(draft?.token!==token||draft.id!==id)draft={token,id,choices:shuffledChoices(spec),choice:'',checks:false};
 if(max&&draft.checks)return `<h1>紙答案を確認する</h1><p>実際に紙へ書いた要素だけ選んでください。選択した結論が正しく、必須項目がすべて揃うと、この1題でMAXになります。</p>${checks(spec)}<div class="notice">${spec.insufficient.map(s=>`<p>${esc(s)}</p>`).join('')}</div><button class="primary" data-action="paper-submit">答案チェックを提出する</button><button class="secondary" data-action="paper-back">結論の選択に戻る</button>`;
 return `<h1>紙答案の最終結果を選ぶ</h1><p>紙に書いた答えに最も近いものを選んでください。途中式・根拠は紙に残します。</p><fieldset class="answer-options"><legend>${max?'6択':'4択'}：最終結論</legend>${draft.choices.map(c=>`<label><input type="radio" name="paper-choice" value="${esc(c.choiceId)}" ${draft!.choice===c.choiceId?'checked':''}/><span class="paper-choice-text">${esc(c.text)}</span></label>`).join('')}</fieldset>${max?'':`<details class="panel"><summary>紙答案の確認（任意）</summary><p>最終結論だけでは、途中の根拠までは判定できません。確認できた項目だけ選んでください。</p>${checks(spec)}</details>`}<button class="primary" data-action="${max?'paper-check':'paper-submit'}">${max?'紙答案のチェックへ':'この結論を提出する'}</button><button class="secondary" data-action="back-problem">問題に戻る</button>`;
}
function checks(spec:PaperSpec){return `<div class="paper-checks">${spec.checks.map(c=>`<label><input type="checkbox" name="paper-check" value="${esc(c.id)}"/><span>${esc(c.label)}</span></label>`).join('')}</div>`;}
export function toPaperChecks(root:HTMLElement){const id=root.querySelector<HTMLInputElement>('input[name="paper-choice"]:checked')?.value;if(!id||!draft)throw new Error('紙答案の最終結論を選んでください。');draft.choice=id;draft.checks=true;}
export function backPaperChoices(){if(draft)draft.checks=false;}
export function paperInput(root:HTMLElement){const id=root.querySelector<HTMLInputElement>('input[name="paper-choice"]:checked')?.value??draft?.choice;if(!id)throw new Error('紙答案の最終結論を選んでください。');return {choiceId:id,confirmed:[...root.querySelectorAll<HTMLInputElement>('input[name="paper-check"]:checked')].map(x=>x.value)};}
