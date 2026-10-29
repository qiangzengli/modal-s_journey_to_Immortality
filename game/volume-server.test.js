import {STORY_BEATS} from './story-beats.js';
import {openingMove} from './canon-test-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {VOLUME_ACTIONS} from './volume-data.js';

test('第一卷 API：新档、全主线落盘、过期请求拒绝、重启恢复与确认重开',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'niminglu-opening-api-')),savePath=join(directory,'save.json');
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const origin=`http://127.0.0.1:${port}`;let child;
 async function start(){
  child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',LLM_API_KEY:'',TEST_LLM_BASE_URL:''},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),5000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exit '+code));});child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});});
 }
 async function stop(){if(child&&child.exitCode===null){const exit=once(child,'exit');child.kill();await exit;}}
 async function post(path,input){const res=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});return {status:res.status,...await res.json()};}
 try{
  await start();let view=(await(await fetch(origin+'/api/state')).json()).view;
  assert.equal(view.player.place,'qixuan');assert.equal(view.story.next.type,'qixuan_exam');
  for(const path of ['/experience.css','/experience-ui.js','/volume-ui.js','/volume-data.js','/volume-world.js','/state-loader.js'])assert.equal((await fetch(origin+path)).status,200,path);
  assert.equal((await post('/api/action',{type:'travel_region',place:'market',expectedRevision:view.revision})).status,400);
  for(const action of VOLUME_ACTIONS.filter(a=>!a.optional&&!a.repeatable)){
   if(view.player.place!==action.place){const r=await post('/api/action',{type:'travel_region',place:action.place,expectedRevision:view.revision});assert.equal(r.status,200,r.error);view=r.view;}
   if(STORY_BEATS[action.type]){
    const original=await readFile(savePath,'utf8');
    assert.equal((await post('/api/action',{type:action.type,expectedRevision:view.revision})).status,400);
    assert.equal((await post('/api/command',{text:action.title,expectedRevision:view.revision})).status,400);
    assert.equal(await readFile(savePath,'utf8'),original);
   }
   const result=await post('/api/action',{type:action.type,...(STORY_BEATS[action.type]?{approach:STORY_BEATS[action.type].choices[0].id}:{}),expectedRevision:view.revision});assert.equal(result.status,200,result.error);view=result.view;
   if(view.battle){
    for(let round=0;view.battle.status==='active'&&round<50;round++){
     const turn=await post('/api/combat',{...openingMove(view),expectedRevision:view.revision});assert.equal(turn.status,200,turn.error);view=turn.view;
     if(round===1){await stop();await start();assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,view);}
    }
    assert.equal(view.battle.status,'won');
    const claim=await post('/api/combat',{type:'claim',enemyId:view.battle.enemyId,expectedRevision:view.revision});assert.equal(claim.status,200,claim.error);view=claim.view;
   }

  }
  assert.equal(view.story.complete,true);const stale=await post('/api/action',{type:'enter_xianmen',expectedRevision:0});assert.equal(stale.status,409);assert.equal(stale.view.player.stones,180);
  const saved=JSON.parse(await readFile(savePath,'utf8'));assert.ok(saved.volume.flags.enter_xianmen);
  await stop();await start();assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,view);
  const reset=await post('/api/reset',{expectedRevision:view.revision});assert.equal(reset.status,200);assert.equal(reset.view.player.place,'qixuan');assert.equal(reset.view.story.completed,0);assert.equal(reset.view.revision,view.revision+1);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
