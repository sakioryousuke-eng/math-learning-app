import type {LearningRepository} from './repository.ts';
import type {LearningDocument} from './model.ts';
import {PersistenceError} from './model.ts';
/** Future Firestore port: implementations must CAS within a server transaction.
 * No SDK, project ID, account, credentials or network access is configured here. */
export interface FirebasePersistencePort extends LearningRepository {}
export class FirebaseLearningRepository implements LearningRepository {
 private port:FirebasePersistencePort|null;
 constructor(port:FirebasePersistencePort|null=null){this.port=port;}
 private connected(){if(!this.port)throw new PersistenceError('FIREBASE_NOT_CONFIGURED','Firebase Consoleの新規プロジェクトと認証・ルール設定が必要です。現在はローカル保存を利用してください。');return this.port;}
 async load(key:string){return this.connected().load(key);}
 async save(d:LearningDocument,revision:number){return this.connected().save(d,revision);}
 async activeNamespace(){return this.connected().activeNamespace();}
 async selectNamespace(key:string){return this.connected().selectNamespace(key);}
}
