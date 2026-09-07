import type {LearningRepository} from './repository.ts';
import {revision} from './repository.ts';
import type {LearningDocument} from './model.ts';
import {PersistenceError} from './model.ts';
export class IndexedDbLearningRepository implements LearningRepository {
 private database:Promise<IDBDatabase>;
 constructor(factory:IDBFactory=indexedDB,name='math-learning-stage4'){
  this.database=new Promise((resolve,reject)=>{const r=factory.open(name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('learning');r.result.createObjectStore('settings');};r.onerror=()=>reject(new PersistenceError('STORAGE','保存領域を開けません。'));r.onblocked=()=>reject(new PersistenceError('STORAGE','別タブを閉じて再読み込みしてください。'));r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};});
 }
 private async read(store:string,key:string):Promise<unknown|null>{const db=await this.database;return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),r=tx.objectStore(store).get(key);let value:unknown=null;r.onsuccess=()=>{value=r.result??null;};tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(new PersistenceError('LOAD','保存データを読み込めません。'));});}
 load(namespace:string){return this.read('learning',namespace);}
 async save(d:LearningDocument,expected:number){const db=await this.database;return new Promise<void>((resolve,reject)=>{const tx=db.transaction('learning','readwrite'),store=tx.objectStore('learning'),r=store.get(d.namespace);let problem:Error|null=null;r.onsuccess=()=>{try{if(revision(r.result)!==expected)throw new PersistenceError('CONFLICT','別タブで学習が更新されました。再読み込みしてください。');store.put(structuredClone(d),d.namespace);}catch(e){problem=e instanceof Error?e:new Error('Save error');tx.abort();}};tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(problem??new PersistenceError('SAVE','保存に失敗しました。更新を取り消しました。空き容量などを確認して再試行してください。'));});}
 async activeNamespace(){const value=await this.read('settings','active');if(value!==null&&typeof value!=='string')throw new PersistenceError('CORRUPT','保存先の設定が不正です。');return value;}
 async selectNamespace(key:string){const db=await this.database;return new Promise<void>((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(key,'active');tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(new PersistenceError('SAVE','保存先の切替に失敗しました。'));});}
 async close(){(await this.database).close();}
}
