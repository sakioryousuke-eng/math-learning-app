import type {Learner} from '../math-master/types.ts';
import {unitStatus} from '../math-master/unlock.ts';
import type {Curriculum} from './types.ts';
export function routeMap(c:Curriculum,p:Learner){
 const rows=c.units.map(g=>{const u=c.master.units.find(u=>u.id===g.unitId)!,status=unitStatus(c.master,p,u.id);return {unitId:u.id,name:u.name,world:g.world,lane:g.lane,status,requiredMax:u.prerequisites.map(id=>({unitId:id,name:c.master.units.find(u=>u.id===id)!.name,acquired:p.maxUnits.includes(id)})),visible:g.lane==='MAIN'||status!=='LOCKED',canStart:p.diagnosticCompleted&&!p.activeUnit&&status==='OPEN'};}).filter(r=>r.visible);
 return [...new Set(rows.map(r=>r.world))].map(world=>({world,expanded:rows.some(r=>r.world===world&&r.status==='ACTIVE')||!p.activeUnit&&rows.some(r=>r.world===world&&r.status==='OPEN'),rows:rows.filter(r=>r.world===world)}));
}
