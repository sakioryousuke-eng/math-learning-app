import {mkdirSync,writeFileSync} from 'node:fs';
import {curriculum as c} from '../src/curriculum/master.ts';
mkdirSync('docs',{recursive:true});
writeFileSync('docs/curriculum-v0.5.json',JSON.stringify(c,null,2)+'\n');
const rows=c.units.map(g=>{const u=c.master.units.find(u=>u.id===g.unitId)!;const ss=c.master.skills.filter(s=>s.unitId===u.id);return `| ${u.id} | ${u.name} | ${g.world} | ${g.lane} | ${u.prerequisites.join(', ')||'なし'} | ${ss.map(s=>s.id+' '+s.name).join(' / ')} |`;});
writeFileSync('docs/CURRICULUM-MANIFEST.md',`# 第5段階マスター一覧\n\n実行時の型付きデータから出力。${c.master.units.length} Unit / ${c.master.skills.length} Skill / ${c.problems.length}固定問題。版 ${c.version}。\n\n| ID | 単元 | 領域 | ルート | 必須MAX | 内部Skill（前提stableで順次解放） |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\n詳細な導入方法・履修内容・問題の役割・MAX定義は curriculum-v0.5.json を参照。教材量・入試水準を保証する一覧ではない。\n`);
console.log(JSON.stringify({units:c.master.units.length,skills:c.master.skills.length,problems:c.problems.length,maxProblems:c.problems.filter(p=>p.purpose==='max').length,main:c.mainUnitIds.length,extra:c.units.filter(u=>u.lane==='EXTRA').length,another:c.units.filter(u=>u.lane==='ANOTHER').length}));
