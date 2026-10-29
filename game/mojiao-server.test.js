import { sendModelReply } from './model-test-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {throughCampaign,openingMove} from './canon-test-helpers.js';

test('墨蛟 API 使用 ChatGPT 战术；回合落盘、并发版本校验、重启续战和收果幂等',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'niminglu-mojiao-api-')),savePath=join(directory,'save.json');
 await writeFile(savePath,JSON.stringify(throughCampaign('meet_nangong')));
 const requests=[];
 const model=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;requests.push(JSON.parse(body));sendModelReply(res, JSON.stringify({intent:'attack',speech:'墨蛟探爪扑向前方。'}));});
 model.listen(0,'127.0.0.1');await once(model,'listening');
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const origin=`http://127.0.0.1:${port}`;let child;
 async function start(){
  child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',LLM_API_KEY:'test-key',TEST_LLM_BASE_URL:`http://127.0.0.1:${model.address().port}/v1`,LLM_TIMEOUT_MS:'2000'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),5000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exit '+code));});child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});});
 }
 async function stop(){if(child&&child.exitCode===null){const exit=once(child,'exit');child.kill();await exit;}}
 async function post(path,input){const res=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});return {status:res.status,...await res.json()};}
 try{
  await start();let view=(await(await fetch(origin+'/api/state')).json()).view;
  assert.equal((await fetch(origin+'/mojiao-model.js')).status,200);
  const started=await post('/api/action',{type:'fight_mojiao',expectedRevision:view.revision});assert.equal(started.status,200,started.error);view=started.view;
  assert.equal(view.battle.enemyId,'story_mojiao');assert.equal(view.battle.intentSource,'model');assert.ok(!view.campaign.questHerbs.includes('天灵果'));
  assert.equal(requests.length,1);assert.equal(requests[0].model,'gpt-5.6-sol');assert.match(requests[0].instructions,/墨蛟/);
  for(let round=0;view.battle.status==='active'&&round<50;round++){
   const revision=view.revision,r=await post('/api/combat',{...openingMove(view),expectedRevision:revision});assert.equal(r.status,200,r.error);view=r.view;
   const saved=JSON.parse(await readFile(savePath,'utf8'));assert.equal(saved.exploration.battle.enemyHp,view.battle.enemyHp);assert.equal(saved.revision,view.revision);
   if(round===1){
    const bytes=await readFile(savePath,'utf8'),count=requests.length;
    assert.equal((await post('/api/combat',{type:'turn',move:'attack',expectedRevision:revision})).status,409);assert.equal(requests.length,count);assert.equal(await readFile(savePath,'utf8'),bytes);
    await stop();await start();assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,view);
   }
  }
  assert.equal(view.battle.status,'won');assert.ok(!view.campaign.flags.fight_mojiao);
  const claimed=await post('/api/combat',{type:'claim',enemyId:'story_mojiao',expectedRevision:view.revision});assert.equal(claimed.status,200,claimed.error);view=claimed.view;assert.equal(view.battle,null);assert.ok(view.campaign.flags.fight_mojiao);assert.equal(view.campaign.questHerbs.filter(h=>h==='天灵果').length,1);
  const bytes=await readFile(savePath,'utf8');assert.equal((await post('/api/combat',{type:'claim',enemyId:'story_mojiao',expectedRevision:view.revision})).status,400);assert.equal(await readFile(savePath,'utf8'),bytes);
  await stop();await start();assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,view);
 }finally{await stop();model.closeAllConnections();await new Promise(r=>model.close(r));await rm(directory,{recursive:true,force:true});}
});
