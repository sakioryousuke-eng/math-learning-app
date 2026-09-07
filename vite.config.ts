import {defineConfig} from 'vite';
import {createGradingHandler} from './src/server/grading-handler.ts';
const disconnected=()=>({apiKey:'',model:'stage4-disconnected'});
export default defineConfig({plugins:[{
 name:'local-answer-grading',
 configureServer(server){const handler=createGradingHandler(disconnected);server.middlewares.use((req,res,next)=>{void handler.handle(req,res,next);});},
 configurePreviewServer(server){const handler=createGradingHandler(disconnected);server.middlewares.use((req,res,next)=>{void handler.handle(req,res,next);});}
}],optimizeDeps:{noDiscovery:true,include:[]},server:{fs:{deny:['.env','.env.*','**/.git/**','**/learner-data/**','**/uploads/**']}}});
