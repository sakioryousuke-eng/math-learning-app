export const rad=(d:number)=>d*Math.PI/180;
export const deg=(r:number)=>r*180/Math.PI;
export const sin=(d:number)=>Math.sin(rad(d));
export const cos=(d:number)=>Math.cos(rad(d));
export const tan=(d:number)=>Math.abs(cos(d))<1e-12?null:sin(d)/cos(d);
export function unit(theta:number){if(theta<0||theta>180||!Number.isFinite(theta))throw new Error('0〜180°で指定してください。');return {x:Math.abs(cos(theta))<1e-12?0:cos(theta),y:Math.abs(sin(theta))<1e-12?0:sin(theta),tan:tan(theta)};}
export type Point=[number,number];
export const distance=(p:Point,q:Point)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
export function geometry(A:Point,B:Point,C:Point){const a=distance(B,C),b=distance(C,A),c=distance(A,B);if(Math.min(a,b,c)<=0||a+b<=c+1e-10||a+c<=b+1e-10||b+c<=a+1e-10)throw new Error('三角形が成立しません。');const area=Math.abs((B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]))/2;const angle=(p:Point,q:Point,r:Point)=>deg(Math.acos(Math.max(-1,Math.min(1,((q[0]-p[0])*(r[0]-p[0])+(q[1]-p[1])*(r[1]-p[1]))/(distance(p,q)*distance(p,r))))));return {a,b,c,A:angle(A,B,C),B:angle(B,A,C),C:angle(C,A,B),area,R:a*b*c/(4*area),heightA:2*area/a,heightB:2*area/b,heightC:2*area/c};}
export function sas(b:number,c:number,A:number){return geometry([0,0],[c,0],[b*cos(A),b*sin(A)]);}
export function sss(a:number,b:number,c:number){const x=(b*b+c*c-a*a)/(2*c),yy=b*b-x*x;if(yy<=0)throw new Error('三角形が成立しません。');return geometry([0,0],[c,0],[x,Math.sqrt(yy)]);}
export function asa(A:number,B:number,a:number){const C=180-A-B;if(C<=0)throw new Error('角の和が不正です。');const b=a*sin(B)/sin(A),c=a*sin(C)/sin(A);return sss(a,b,c);}
export function ssa(A:number,a:number,b:number){const v=b*sin(A)/a;if(v<=0||v>1)return [];const B=deg(Math.asin(v));return [...new Set([B,180-B])].filter(B=>A+B<180-1e-9).map(B=>asa(A,B,a));}
export function survey(gap:number,far:number,near:number){const t1=Math.tan(rad(far)),t2=Math.tan(rad(near)),distance=gap*t1/(t2-t1);return {distance,height:distance*t2};}
