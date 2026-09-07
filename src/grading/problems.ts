import {problems,master} from '../services/catalog.ts';
export interface GradingSpec {problemId:string;requiresReasoning:boolean;maxSeconds:number;rubric:string}
export const gradingSpecs:GradingSpec[]=[
 {problemId:'EXP2-展開-1',requiresReasoning:false,maxSeconds:180,rubric:'全項に分配し同類項を整理する。短い計算問題なので正しい最終式のみでも通常学習では可。'},
 {problemId:'HSX2-因数分解-1',requiresReasoning:false,maxSeconds:180,rubric:'展開して元の式と一致する因数分解を認める。因数の順番を問わない。'},
 {problemId:'QEQ1-因数分解解法-1',requiresReasoning:true,maxSeconds:300,rubric:'2根を漏れなく求め、積ゼロ・公式・平方完成等の根拠を示す。'},
 {problemId:'QEQ2-平方完成-1',requiresReasoning:true,maxSeconds:300,rubric:'平方完成でも解の公式でも可。±の両方を含める。'},
 {problemId:'QFN1-グラフ-1',requiresReasoning:true,maxSeconds:300,rubric:'頂点と軸の両方。平方完成または同値な推論の根拠が必要。'},
 {problemId:'QFN2-最大最小-1',requiresReasoning:true,maxSeconds:600,rubric:'頂点が定義域内か確認し、両端も比較。最大・最小とそのxを含める。'},
 {problemId:'QFN3-場合分け-1',requiresReasoning:true,maxSeconds:900,rubric:'a<0、0<=a<=2、a>2を網羅。境界の割当は同じ値になり漏れ重複がなければ可。'},
 {problemId:'QFN3-判別式・交点-2',requiresReasoning:true,maxSeconds:600,rubric:'接する条件とk、接点(x,y)の両座標を示す。判別式以外に平方完成等を認める。'},
 {problemId:'QFN3-二次不等式-2',requiresReasoning:true,maxSeconds:600,rubric:'厳密不等号なので根は含まない。外側の両区間を示す。'},
 {problemId:'QFN3-統合-3',requiresReasoning:true,maxSeconds:900,rubric:'最大値5を取る両端と、定義域[-4,2]と不等式解の共通部分を示す。'},
 {problemId:'QEQ-MAX-3',requiresReasoning:true,maxSeconds:1200,rubric:'全3小問に根拠が必要。x=-3,2、x=1,5、k=9かつx=3。最終答のみはMAX不可。'},
 {problemId:'QFN-MAX-3',requiresReasoning:true,maxSeconds:1200,rubric:'最小値-1/4、2<=x<=3、区間包含からa=2。全小問の条件を根拠として記述する。'}
];
export function gradingSpec(id:string):GradingSpec{
 const spec=gradingSpecs.find(s=>s.problemId===id);if(!spec)throw new Error('UNSUPPORTED_PROBLEM');return spec;
}
export function gradingProblem(id:string){gradingSpec(id);const problem=problems.find(p=>p.id===id);if(!problem)throw new Error('UNSUPPORTED_PROBLEM');return problem;}
export function prerequisiteIds(skillId:string):string[]{return [...new Set(master.skills.find(s=>s.id===skillId)!.prerequisites.flatMap(id=>[id,...prerequisiteIds(id)]))];}
