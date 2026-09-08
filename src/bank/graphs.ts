import type {BankGraphSpec} from './types.ts';
import {axisGraph} from '../prototype/quadratic-axis-family.ts';
import {countGraphState} from '../prototype/quadratic-count-family.ts';
import {placementGraphState} from '../prototype/quadratic-placement-family.ts';
import {extremaComponent,extremaGraph} from '../prototype/integrated-quadratic-math.ts';
export function bankGraphs(spec:BankGraphSpec,value:number){const m=spec.model;switch(m.kind){case 'static':return m.graphs;case 'axis':return [axisGraph(m.parameters,value)];case 'count':{const s=countGraphState(m.parameters,value);return [s.original,s.difference];}case 'placement':return [placementGraphState(m.parameters,value).graph];case 'extrema':return [extremaGraph(extremaComponent(m.expression,m.L,m.R),value)];case 'horizontal':{const g=placementGraphState(m.parameters,value).graph;return [{...g,title:'放物線と水平線の共有点',curves:[{formula:'y=x²−4x+3',coefficients:[1,-4,3] as [number,number,number]},{formula:'y=k',coefficients:[0,0,value] as [number,number,number]}],view:[-1,5,-3,8] as [number,number,number,number]},g];}}}
