export interface Clock {now():number}
export class SystemClock implements Clock {now(){return Date.now();}}
export class ManualClock implements Clock {private value:number;constructor(at:string){this.value=Date.parse(at);}now(){return this.value;}advanceDays(days:number){this.value+=days*86400000;}}
export const japanDay=(at:string)=>new Date(Date.parse(at)+9*3600000).toISOString().slice(0,10);
export const evidenceDeadline=(at:string,days:number)=>new Date(Date.parse(at)+days*86400000).toISOString();
