import type {LearningDocument} from './model.ts';
import {PersistenceError} from './model.ts';
export interface LearningRepository {
 load(namespace:string):Promise<unknown|null>;
 /** Atomic compare-and-swap of the whole learning aggregate. */
 save(document:LearningDocument,expectedRevision:number):Promise<void>;
 activeNamespace():Promise<string|null>;
 selectNamespace(namespace:string):Promise<void>;
}
export class MemoryLearningRepository implements LearningRepository {
 readonly records=new Map<string,unknown>();private active:string|null=null;
 failNext=false;
 async load(key:string){return structuredClone(this.records.get(key)??null);}
 async save(d:LearningDocument,expected:number){if(this.failNext){this.failNext=false;throw new PersistenceError('SAVE','保存できませんでした。');}const old=this.records.get(d.namespace);if(revision(old)!==expected)throw new PersistenceError('CONFLICT','別タブで更新されています。再読み込みしてください。');this.records.set(d.namespace,structuredClone(d));}
 async activeNamespace(){return this.active;}async selectNamespace(key:string){this.active=key;}
}
export function revision(raw:unknown):number{if(raw===null||raw===undefined)return 0;if(typeof raw==='object'&&'revision'in raw&&typeof raw.revision==='number')return raw.revision;throw new PersistenceError('CORRUPT','保存データを上書きできません。');}
