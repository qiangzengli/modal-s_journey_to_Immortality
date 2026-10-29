import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

test('根入口提供同一游戏：首页、旧地址、所有前端模块、存档与服务端私有文件边界',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'niminglu-main-api-')),savePath=join(directory,'save.json');
 const root=fileURLToPath(new URL('../',import.meta.url));
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',LLM_API_KEY:'',TEST_LLM_BASE_URL:''},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout')),5000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exit '+code));});child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});});
  const home=await(await fetch(origin+'/')).text();assert.equal(home,await readFile(join(root,'index.html'),'utf8'));
  assert.match(home,/src="\.\/game\/app.js"/);assert.doesNotMatch(home,/main\.js|MVP|试玩版/);
  assert.equal(await(await fetch(origin+'/index.html')).text(),home);
  for(const path of ['/mvp','/mvp/','/mvp/index.html','/game/']){const res=await fetch(origin+path,{redirect:'manual'});assert.equal(res.status,308,path);assert.equal(res.headers.get('location'),'/');}
  const queued=[...home.matchAll(/(?:href|src)="(\.\/(?:game|vendor)\/[^" ]+\.(?:js|css))"/g)].map(m=>new URL(m[1],origin).href),seen=new Set();
  while(queued.length){
   const url=queued.shift();if(seen.has(url))continue;seen.add(url);
   const res=await fetch(url);assert.equal(res.status,200,url);const source=await res.text();
   assert.match(res.headers.get('content-type'),url.endsWith('.css')?/text\/css/:/javascript/);
   if(url.endsWith('.js'))for(const m of source.matchAll(/(?:import|export)\s+(?:[^;'"\n]*?\s+from\s+)?['"]([^'"]+)['"]/g)){
    if(m[1].startsWith('.')||m[1].startsWith('/'))queued.push(new URL(m[1],url).href);
   }
  }
  assert.ok(seen.has(origin+'/game/volume-data.js'));assert.ok(seen.has(origin+'/vendor/three.core.js'));
  // The compatibility resource alias serves the same code, not another application.
  assert.equal(await(await fetch(origin+'/app.js')).text(),await(await fetch(origin+'/game/app.js')).text());
  for(const path of ['/.env.local','/mvp/.env.local','/.data/save.json','/game/server.js','/game/runtime-paths.js','/game/engine.js','/game/application-server.test.js'])assert.equal((await fetch(origin+path)).status,404,path);
  let view=(await(await fetch(origin+'/api/state')).json()).view;assert.equal(view.story.next.type,'qixuan_exam');
  const result=await fetch(origin+'/api/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'qixuan_exam',expectedRevision:view.revision})});assert.equal(result.status,200);
  view=(await result.json()).view;assert.equal(view.story.completed,1);assert.equal(JSON.parse(await readFile(savePath,'utf8')).revision,view.revision);
  assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,view);
 }finally{if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}await rm(directory,{recursive:true,force:true});}
});

test('升级后的根服务继续写原存档，不创建第二份进度或重新开始',async()=>{
 const {cp,mkdir,writeFile,symlink,access}=await import('node:fs/promises');
 const {createGame}=await import('./engine.js');
 const root=await mkdtemp(join(tmpdir(),'niminglu-upgrade-')),source=fileURLToPath(new URL('../',import.meta.url));
 const old=createGame();old.revision=41;old.player.stones=177;old.flags.partnerDebt=120;
 const legacy=join(root,'mvp/.data/save.json');
 await mkdir(join(root,'mvp/.data'),{recursive:true});await writeFile(legacy,JSON.stringify(old));
 await cp(join(source,'game'),join(root,'game'),{recursive:true,filter:path=>!basename(path).startsWith('.')&&!path.endsWith('.test.js')});await cp(join(source,'server.js'),join(root,'server.js'));await cp(join(source,'package.json'),join(root,'package.json'));
 await symlink(join(source,'node_modules'),join(root,'node_modules'),'dir');
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),SAVE_PATH:'',NODE_ENV:'test',LLM_API_KEY:''},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout')),5000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exit '+code));});child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});});
  const before=(await(await fetch(origin+'/api/state')).json()).view;
  assert.equal(before.revision,41);assert.equal(before.player.stones,177);assert.equal(before.pill.partnerDebt,120);assert.equal(before.story,null);
  const response=await fetch(origin+'/api/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'buy_talisman',expectedRevision:41})});assert.equal(response.status,200);
  const saved=JSON.parse(await readFile(legacy,'utf8'));assert.equal(saved.revision,42);assert.equal(saved.player.stones,142);assert.equal(saved.flags.partnerDebt,120);
  await assert.rejects(access(join(root,'.data/save.json')),error=>error.code==='ENOENT');
 }finally{if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}await rm(root,{recursive:true,force:true});}
});
