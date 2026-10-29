import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {throughOpening} from './canon-test-helpers.js';
import {sendModelReply,combatPlan} from './model-test-helpers.js';
import {DEFAULT_AUTO_PLAN} from './auto-combat.js';

test('真实HTTP：模型未返回时开战和连续回合立即落盘，预告不突变且重启续战',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'niminglu-combat-flow-')),savePath=join(dir,'save.json');
 await writeFile(savePath,JSON.stringify(throughOpening('scout_jinguang')));
 const pending=[],autoPending=[];
 const model=createServer(async(req,res)=>{let data='';for await(const part of req)data+=part;(data.includes('节约型自动斗法参谋')?autoPending:pending).push(res);});
 model.listen(0,'127.0.0.1');await once(model,'listening');
 const reserved=createServer();reserved.listen(0,'127.0.0.1');await once(reserved,'listening');const port=reserved.address().port;await new Promise(r=>reserved.close(r));
 const origin=`http://127.0.0.1:${port}`;let child,view;
 async function start(){
  child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',LLM_API_KEY:'test-key',TEST_LLM_BASE_URL:`http://127.0.0.1:${model.address().port}`,LLM_TIMEOUT_MS:'30000'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout')),5000);child.once('error',reject);child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});});
  view=(await(await fetch(origin+'/api/state')).json()).view;
 }
 async function stop(){if(child?.exitCode===null){const end=once(child,'exit');child.kill();await end;}}
 async function post(path,input){const res=await fetch(origin+path,{method:'POST',signal:AbortSignal.timeout(1500),headers:{'content-type':'application/json'},body:JSON.stringify({expectedRevision:view.revision,...input})});const data=await res.json();if(res.ok&&data.view)view=data.view;return {status:res.status,...data};}
 try{
  await start();
  assert.equal((await post('/api/action',{type:'defend_qixuan'})).status,200);
  assert.equal(view.battle.intentSource,'preparing');
  const autoRequest=fetch(origin+'/api/combat/auto-plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedRevision:view.revision,enemyId:view.battle.enemyId,policy:'economy'})});
  for(let i=0;i<3;i++)assert.equal((await post('/api/combat',{type:'turn',move:'guard'})).status,200);
  assert.equal(view.battle.round,4);assert.equal(pending.length,1,'one model call despite repeated turns');
  const bytes=await readFile(savePath,'utf8'),advertised=structuredClone(view),revision=view.revision;
  assert.equal(autoPending.length,1);sendModelReply(autoPending[0],JSON.stringify(DEFAULT_AUTO_PLAN));
  const autoResponse=await autoRequest;assert.equal(autoResponse.status,200);assert.equal((await autoResponse.json()).source,'model');
  assert.equal(await readFile(savePath,'utf8'),bytes,'自动战术建议不能写存档或阻塞普通回合');
  assert.equal((await post('/api/combat/auto-plan',{enemyId:view.battle.enemyId,policy:'spend_everything'})).status,400);
  sendModelReply(pending[0],JSON.stringify(combatPlan('heavy','对方凝气准备重击。')));
  await delay(30);
  assert.equal(await readFile(savePath,'utf8'),bytes,'background completion cannot write the save');
  assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,advertised);
  let response=await post('/api/combat',{type:'turn',move:'guard',agentIntent:'heal',damage:99999});assert.equal(response.status,200);
  assert.match(view.battle.log.at(-1).text,/出手反击/,'current counter still uses the advertised attack');
  assert.equal(view.battle.intentSource,'model');assert.equal(view.battle.intent,'heavy');
  assert.equal((await post('/api/combat',{type:'turn',move:'attack',expectedRevision:revision})).status,409);
  const savedView=structuredClone(view);await stop();await start();assert.deepEqual(view,savedView);
  const currentRevision=view.revision;
  const concurrent=await Promise.all([post('/api/combat',{type:'turn',move:'guard',expectedRevision:currentRevision}),post('/api/combat',{type:'turn',move:'guard',expectedRevision:currentRevision})]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  assert.match(view.battle.log.at(-1).text,/蓄力重击/);
  assert.equal((await post('/api/reset',{})).status,200);assert.equal(view.battle,null);
  const resetBytes=await readFile(savePath,'utf8');
  for(const res of pending)if(!res.destroyed&&!res.writableEnded)sendModelReply(res,JSON.stringify(combatPlan('guard')));
  await delay(20);assert.equal(await readFile(savePath,'utf8'),resetBytes);
 }finally{await stop();model.closeAllConnections();await new Promise(r=>model.close(r));await rm(dir,{recursive:true,force:true});}
});
