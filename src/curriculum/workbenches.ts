// Optional offline workbench; no access to learner, EXP or MAX evidence.
export const workbenchPresets={DATA:{kind:'binomial_simulation',trials:10,probability:0.5,repetitions:1000},INFER:{kind:'binomial_simulation',trials:100,probability:0.5,repetitions:1000}} as const;
export function simulateBinomial(options:{trials:number;probability:number;repetitions:number;seed:number}){
 const {trials,probability,repetitions,seed}=options;
 if(!Number.isInteger(trials)||trials<1||!Number.isInteger(repetitions)||repetitions<1||trials*repetitions>1000000||!Number.isFinite(probability)||probability<0||probability>1||!Number.isInteger(seed))throw new Error('Invalid simulation parameters');
 let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 const counts:number[]=[];for(let i=0;i<repetitions;i++){let count=0;for(let j=0;j<trials;j++)if(random()<probability)count++;counts.push(count);}
 const mean=counts.reduce((a,b)=>a+b,0)/repetitions,variance=counts.reduce((a,b)=>a+(b-mean)**2,0)/repetitions;
 return {counts,mean,variance,sampleProportionMean:mean/trials,empiricalStandardError:Math.sqrt(variance)/trials,theoreticalStandardError:Math.sqrt(probability*(1-probability)/trials),seed};
}
