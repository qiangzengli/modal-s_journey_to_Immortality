import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {throughCampaign,openingMove} from './canon-test-helpers.js';

test('禁地 API：银页战斗中途重启、重复请求拒绝、墨蛟协战和任务药囊落盘',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'niminglu-trial-api-')),savePath=join(directory,'save.json');
 await writeFile(savePath,JSON.stringify(throughCampaign('meet_nangong')));
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const origin=`http://127.0.0.1:${port}`;let child;
 async function start(){
  child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',LLM_API_KEY:'',TEST_LLM_BASE_URL:''},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),5000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exit '+code));});child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});});
 }
 async function stop(){if(child&&child.exitCode===null){const exit=once(child,'exit');child.kill();await exit;}}
 let view;
 async function post(path,input,expected=200){
  const response=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedRevision:view.revision,...input})});
  const result=await response.json();assert.equal(response.status,expected,result.error);if(response.ok)view=result.view;return result;
 }
 async function fight(){
  for(let round=0;view.battle.status==='active'&&round<60;round++)await post('/api/combat',openingMove(view));
  assert.equal(view.battle.status,'won');
 }
 try{
  await start();view=(await(await fetch(origin+'/api/state')).json()).view;
  assert.equal((await fetch(origin+'/mojiao-model.js')).status,200);
  await post('/api/action',{type:'sword_trace'});await post('/api/action',{type:'fight_swordsman'});
  await post('/api/combat',openingMove(view));const persisted=structuredClone(view);
  await stop();await start();assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,persisted);
  await post('/api/combat',{...openingMove(view),expectedRevision:view.revision-1},409);
  await fight();assert.ok(!view.inventory.some(i=>i.id==='silver_page'));
  await post('/api/combat',{type:'claim',enemyId:'trial_swordsman'});assert.equal(view.inventory.find(i=>i.id==='silver_page').quantity,1);
  await post('/api/combat',{type:'claim',enemyId:'trial_swordsman'},400);
  while(view.player.hp<90)await post('/api/action',{type:'frontier_rest'});
  await post('/api/action',{type:'fight_mojiao'});assert.equal(view.battle.ally.name,'南宫婉');
  await fight();assert.ok(!view.campaign.questHerbs.includes('天灵果'));await post('/api/combat',{type:'claim',enemyId:'story_mojiao'});
  assert.ok(view.campaign.questHerbs.includes('天灵果'));await post('/api/action',{type:'leave_forbidden'});
  await stop();await start();assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,view);
  const saved=JSON.parse(await readFile(savePath,'utf8'));assert.equal(saved.exploration.inventory.silver_page,1);assert.ok(saved.campaign.storyFlags.fight_mojiao);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
