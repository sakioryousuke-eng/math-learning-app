import {mkdirSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';
import {gradingSpecs} from '../src/grading/problems.ts';
import type {AnswerCase} from '../src/grading/verification.ts';
// Implementation-authored expectations; human review is deliberately pending.
const examples:{a:string[];b:string[];c:string[];f:string[];d?:string[];e?:string[]}[]=[
 {a:['2x - 6 - 3x - 3','= -x - 9'],b:['2(x-3)-3(x+1) = 2x-3x -3(2+1)','= -x-9'],c:['2x - 6 - 3x - 3','= -x - 3'],f:['-x - 9']},
 {a:['x^2 - 5x + 6 = x^2 - 2x - 3x + 6','= x(x-2)-3(x-2)','= (x-2)(x-3)'],b:['x^2-5x+6 = (x-5/2)^2-1/4','= (x-5/2-1/2)(x-5/2+1/2)','= (x-3)(x-2)'],c:['(-2)+(-3)=-5, (-2)(-3)=6','x^2-5x+6 = (x-2)(x+3)'],f:['(x-2)(x-3)']},
 {a:['x^2-5x+6=0','(x-2)(x-3)=0','x=2 or x=3'],b:['x = (5 +/- sqrt(25-24))/2','x=2 or x=3'],c:['x=(5 +/- sqrt(25-24))/2','x=1 or x=3'],f:['x=2,3'],d:['(x-2)(x-3)=0','x=2']},
 {a:['x^2-4x+1=0','(x-2)^2=3','x=2 +/- sqrt(3)'],b:['x=(4 +/- sqrt(16-4))/2','=2 +/- sqrt(3)'],c:['(x-2)^2=3','x=2 +/- 3'],f:['x=2 +/- sqrt(3)'],d:['(x-2)^2=3','x=2+sqrt(3)']},
 {a:['y=x^2-4x+1=(x-2)^2-3','vertex (2,-3); axis x=2'],b:['y(2+t)=t^2-3=y(2-t)','t^2>=0, so vertex (2,-3); axis x=2'],c:['y=(x-2)^2-3','vertex (2,3); axis x=2'],f:['vertex (2,-3); axis x=2']},
 {a:['f(x)=(x-2)^2-3; 0<=x<=3','2 in [0,3]; f(2)=-3','f(0)=1, f(3)=-2','min -3 at x=2; max 1 at x=0'],b:['0<=x<=3 implies 0<=(x-2)^2<=4','both bounds attained at x=2 and x=0','f(x)=(x-2)^2-3','min -3 at x=2; max 1 at x=0'],c:['f(x)=(x-2)^2-3; x=2 in [0,3]','f(0)=1, f(3)=9-12+1=2','min -3 at x=2; max 2 at x=3'],f:['min -3 at x=2; max 1 at x=0'],d:['f(x)=(x-2)^2-3','min -3 at x=2; no maximum']},
 {a:['minimize (x-a)^2 on 0<=x<=2','a<0: nearest x=0, min a^2','0<=a<=2: nearest x=a, min 0','a>2: nearest x=2, min (2-a)^2'],b:['distance from a to interval [0,2]:','d=-a (a<0), 0 (0<=a<=2), a-2 (a>2)','minimum is d^2, hence','a^2 (a<0); 0 (0<=a<=2); (a-2)^2 (a>2)'],c:['a<0: nearest x=0, min a^2','0<=a<=2: nearest x=a, min 0','a>2: nearest x=2, min a^2-4a+2'],f:['a^2 (a<0); 0 (0<=a<=2); (a-2)^2 (a>2)'],e:['a<0: x=0 gives min a^2','0<=a<=2: x=a gives min 0']},
 {a:['x^2=4x+k -> x^2-4x-k=0','tangent iff D=16+4k=0 -> k=-4','x=2, y=4; contact (2,4)'],b:['x^2-4x-k=(x-2)^2-(k+4)','one intersection iff k+4=0','k=-4, x=2, y=4; contact (2,4)'],c:['D=16+4k=0 -> k=-4','x=2, y=2^2=2; contact (2,2)'],f:['k=-4; contact (2,4)']},
 {a:['(x-3)(x-4)>0','both factors same sign: x<3 or x>4'],b:['(x-7/2)^2>1/4','|x-7/2|>1/2','x<3 or x>4'],c:['roots=(7 +/- sqrt(49-48))/2','roots=2,4; upward parabola','x<2 or x>4'],f:['x<3 or x>4'],d:['(x-3)(x-4)>0','x<=3 or x>=4']},
 {a:['f(x)=(x+1)^2-4 on [-4,2]','f(-4)=f(2)=5, vertex is minimum','max 5 at x=-4 and x=2','(x+3)(x-1)>0 -> x<-3 or x>1','intersection with [-4,2]: [-4,-3) or (1,2]'],b:['-3<=x+1<=3 -> (x+1)^2<=9','equality at x=-4,2; max 9-4=5','f(x)>0 iff |x+1|>2','with -4<=x<=2: [-4,-3) or (1,2]'],c:['f(x)=(x+1)^2-4 on [-4,2]','f(-4)=f(2)=9-4=6; max 6 at x=-4,2','(x+3)(x-1)>0 -> x<-3 or x>1','intersect: [-4,-3) or (1,2]'],f:['max 5 at x=-4,2; [-4,-3) or (1,2]'],d:['f(x)=(x+1)^2-4','max 5 at endpoints -4,2','(x+3)(x-1)>0','x<-3 or x>1'],e:['f(x)=(x+1)^2-4; endpoints give max 5 at -4,2','(x+3)(x-1)>0: both positive','1<x<=2']},
 {a:['(1) (x+3)(x-2)=0 -> x=-3,2','(2) (x-3)^2=4 -> x=1,5','(3) D=36-4k=0 -> k=9','(x-3)^2=0 -> double root x=3'],b:['(1) x=(-1 +/- sqrt(1+24))/2=-3,2','(2) x^2-6x+5=(x-1)(x-5)=0 -> x=1,5','(3) x^2-6x+k=(x-3)^2+k-9','double root iff k=9; root x=3'],c:['(1) (x+3)(x-2)=0 -> x=-3,2','(2) (x-3)^2=4 -> x=1,5','(3) D=36-4k=0 -> k=8; root x=3'],f:['(1) x=-3,2; (2) x=1,5; (3) k=9, x=3']},
 {a:['f(x)=(x-5/2)^2-1/4; 1<=5/2<=4','min -1/4 at x=5/2','(x-2)(x-3)<=0 -> 2<=x<=3','[a,a+1] subset [2,3] iff a>=2 and a+1<=3','a=2'],b:['roots 2,3, axis is midpoint 5/2 in [1,4]','f(5/2)=25/4-25/2+6=-1/4 (minimum)','upward parabola: f<=0 iff x in [2,3]','an interval of length 1 inside [2,3] must equal [2,3]','[a,a+1]=[2,3] -> a=2'],c:['f(x)=(x-5/2)^2-1/4 -> min -1/4 at x=5/2','(x-2)(x-3)<=0 -> 2<=x<=3','a>=2 and a+1<=3 -> 2<=a<=3'],f:['min -1/4 at x=5/2; 2<=x<=3; a=2']}
];
const answers:AnswerCase[]=[];mkdirSync('verification/images',{recursive:true});
const xml=(t:string)=>t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
for(const [index,spec] of gradingSpecs.entries()){
 const example=examples[index];
 for(const variant of ['A','B','C','D','E','F','G','H','I']){
  if(variant==='D'&&!example.d||variant==='E'&&!example.e)continue;
  const lines=variant==='A'?example.a:variant==='B'?example.b:variant==='C'?example.c:variant==='D'?example.d!:variant==='E'?example.e!:variant==='F'?example.f:variant==='G'?['I replace every x^2 with x.',...example.f]:[];
  const correct=['A','B'].includes(variant)||variant==='F'&&!spec.requiresReasoning;
  const tags:AnswerCase['expected']['errorTags']=correct?[]:variant==='C'?['calculation']:variant==='D'?(index===5||index===9?['domain_omission']:['condition_omission']):variant==='E'?['case_split']:variant==='G'?['method_selection']:variant==='H'?['handwriting_unreadable']:variant==='I'?['writing','conclusion']:['writing'];
  const id=`P${String(index+1).padStart(2,'0')}-${variant}`,image=`verification/images/${id}.png`;
  const strokes=variant==='H'?Array.from({length:18},(_,j)=>`<path d="M ${80+j*23} 140 q 280 ${j%2?160:-60} 400 60 q -350 120 -300 25" fill="none" stroke="#272727" stroke-width="${4+j%4}"/>`).join(''):'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900"><rect width="1400" height="900" fill="white"/>${lines.map((line,j)=>`<text x="65" y="${100+j*85}" font-family="Arial" font-size="32" fill="#222">${xml(line)}</text>`).join('')}${strokes}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(image);
  answers.push({id,problemId:spec.problemId,variant,image,source:'synthetic-typeset',humanReviewed:false,expected:{overall:correct?'correct':'unresolved',errorTags:tags,legibility:variant==='H'?'unreadable':variant==='I'?'blank':'readable'},text:lines});
 }
}
writeFileSync('verification/answers.json',JSON.stringify(answers,null,2)+'\n');
console.log(`Prepared ${answers.length} synthetic images for ${gradingSpecs.length} problems. Human review and live grading pending.`);
