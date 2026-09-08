import {familyProblems} from '../src/prototype/quadratic-family.ts';
import {axisProblems} from '../src/prototype/quadratic-axis-family.ts';
import {countProblems} from '../src/prototype/quadratic-count-family.ts';
import {placementSeeds} from '../src/prototype/quadratic-placement-family.ts';
import {integratedProblems,makeExtrema} from '../src/prototype/quadratic-integrated-family.ts';
import type {ExtSeed} from '../src/prototype/quadratic-integrated-family.ts';
import type {FamilyParameters} from '../src/prototype/quadratic-family.ts';
import type {AxisParameters} from '../src/prototype/quadratic-axis-family.ts';
import type {CountParameters} from '../src/prototype/quadratic-count-family.ts';
import type {PlacementParameters} from '../src/prototype/quadratic-placement-family.ts';
import {expressionText} from '../src/prototype/integrated-quadratic-math.ts';
import {targetText} from '../src/prototype/quadratic-placement-family.ts';
export const familyPool:FamilyParameters[]=familyProblems.map(p=>p.model.parameters);
export const axisPool:AxisParameters[]=[...axisProblems.map(p=>p.model.parameters),{sign:1,c:2,L:-1,R:3,target:'min',level:'応用'},{sign:-1,c:-1,L:0,R:4,target:'both',level:'高め'},{sign:1,c:0,L:-2,R:3,target:'max',level:'高め'}];
export const countPool:CountParameters[]=[...countProblems.map(p=>p.model.parameters),{A:-1,p:0,q:2,kind:'slope',slope:2,intercept:1,pivotX:0,target:'all',level:'高め'},{A:1,p:0,q:2,kind:'intercept',slope:1,intercept:0,pivotX:0,target:2,level:'標準'},{A:-1,p:2,q:1,kind:'pivot',slope:2,intercept:0,pivotX:1,target:2,level:'高め'},{A:1,p:1,q:1,kind:'slope',slope:2,intercept:0,pivotX:0,target:'all',level:'高め'},{A:-1,p:-1,q:1,kind:'intercept',slope:2,intercept:0,pivotX:0,target:'all',level:'応用'}];
export const placementPool:PlacementParameters[]=[...placementSeeds,
 {...placementSeeds[0],target:{kind:'left',r:0}},
 {...placementSeeds[3],target:{kind:'inside',L:-2,R:2,leftClosed:true,rightClosed:false}},
 {...placementSeeds[3],target:{kind:'inside',L:-2,R:2,leftClosed:true,rightClosed:true}},
 {...placementSeeds[5],target:{kind:'inside',L:0,R:4,leftClosed:false,rightClosed:true}},
 {...placementSeeds[7],A:-1,b1:-1,c0:3},
 {...placementSeeds[6],target:{kind:'inside',L:-1,R:3,leftClosed:true,rightClosed:true}},
 {...placementSeeds[2],A:-1,b1:-1,c1:-1},
 {...placementSeeds[8],target:{kind:'right',r:0}},
 {...placementSeeds[11],target:{kind:'inside',L:-3,R:1,leftClosed:false,rightClosed:true}},
];
const extra:Omit<ExtSeed,'index'|'prompt'|'signature'>[]=[
 {level:'標準',expression:{A:1,B:[0,0,4],C:[0,0,1]},L:-2,R:1,mode:'fixed'},
 {level:'標準',expression:{A:-1,B:[0,0,0],C:[0,0,3]},L:-2,R:2,mode:'fixed'},
 {level:'応用',expression:{A:-1,B:[0,2,0],C:[-1,0,1]},L:-2,R:2,mode:'cases'},
 {level:'応用',expression:{A:1,B:[0,-2,-2],C:[0,1,1]},L:-1,R:3,mode:'cases'},
 {level:'応用',expression:{A:1,B:[0,-2,0],C:[1,0,1]},L:-1,R:2,mode:'inverse',constraints:[{key:'min',op:'eq',value:2}]},
 {level:'応用',expression:{A:-1,B:[0,2,0],C:[-1,0,3]},L:0,R:2,mode:'inverse',constraints:[{key:'max',op:'ge',value:2}]},
 {level:'実戦',expression:{A:1,B:[0,-2,0],C:[0,1,0]},L:-1,R:2,mode:'inverse',constraints:[{key:'min',op:'ge',value:-2},{key:'max',op:'le',value:5}]},
 {level:'実戦',expression:{A:-1,B:[0,2,0],C:[0,0,-1]},L:0,R:3,mode:'inverse',constraints:[{key:'max',op:'ge',value:1}],placement:{A:-1,b1:2,b0:0,c1:0,c0:-1,target:{kind:'inside',L:0,R:3,leftClosed:true,rightClosed:false},level:'高め'}},
 {level:'実戦',expression:{A:1,B:[0,-2,0],C:[1,0,0]},L:-1,R:1,mode:'inverse',constraints:[{key:'min',op:'eq',value:0},{key:'max',op:'eq',value:4}]},
 {level:'実戦',expression:{A:-1,B:[0,2,0],C:[-1,0,4]},L:0,R:2,mode:'inverse',constraints:[{key:'max',op:'eq',value:4},{key:'min',op:'eq',value:0}]},
 {level:'実戦',expression:{A:1,B:[0,-2,0],C:[0,1,0]},L:-2,R:1,mode:'inverse',constraints:[{key:'min',op:'ge',value:-3}],placement:{A:1,b1:-2,b0:0,c1:1,c0:0,target:{kind:'straddle',r:0},level:'高め'}},
 {level:'実戦',expression:{A:1,B:[0,-2,0],C:[0,2,0]},L:-1,R:2,mode:'inverse',constraints:[{key:'min',op:'ge',value:-2},{key:'max',op:'le',value:6}]},
 {level:'実戦',expression:{A:-1,B:[0,1,0],C:[0,0,-1]},L:0,R:3,mode:'inverse',constraints:[{key:'max',op:'ge',value:1}],placement:{A:-1,b1:1,b0:0,c1:0,c0:-1,target:{kind:'inside',L:0,R:3,leftClosed:true,rightClosed:true},level:'高め'}},
];
export function integratedPool(){return [...integratedProblems,...extra.map((s,i)=>{
 const criteria=(s.constraints??[]).map(c=>`${c.key==='min'?'最小値':'最大値'}が${c.value}${c.op==='eq'?'':c.op==='ge'?'以上':'以下'}`).join('、');
 const goal=s.mode==='inverse'?`${criteria}となるkの範囲を求めよ。${s.placement?`ただし、f(x)=0の異なる2根α<βは${targetText(s.placement.target)}を満たすものとする。`:''}`:s.mode==='cases'?'最大値と最小値をkで表せ。':'最大値と最小値を求めよ。';
 const prompt=`${s.mode==='fixed'?'':'kを実数とする。'}f(x)=${expressionText(s.expression)}について、${s.L}≦x≦${s.R}における${goal}`;
 const signature=['REP_CHANGE',s.mode.toUpperCase(),...(s.constraints??[]).map(c=>`${c.key}_${c.op}`),...(s.placement?['ROOT_'+s.placement.target.kind]:[])];
 return makeExtrema({...s,index:13+i,prompt,signature});
 })];}
