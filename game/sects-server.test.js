import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGame } from './engine.js';

test('门派接口校验修为与版本，模型邀请后玩家确认，存档重启保留身份且不重复入门', async () => {
  const directory=await mkdtemp(join(tmpdir(),'niminglu-sects-api-')),savePath=join(directory,'save.json');
  const initial=createGame();delete initial.sects;await writeFile(savePath,JSON.stringify(initial));
  let requests=0, billingFailure=true;
  const model=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    const messages=JSON.parse(body).messages;
    assert.match(messages[0].content,/接引人/);requests++;
    res.setHeader('content-type','application/json');
    if(billingFailure){res.statusCode=402;res.end('{}');return;}
    res.end(JSON.stringify({choices:[{message:{content:'{"decision":"invite","message":"你所言与门规相合，我愿接引，等你自己决定。"}'}}]}));
  });
  model.listen(0,'127.0.0.1');await once(model,'listening');
  const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');
  const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  const origin=`http://127.0.0.1:${port}`;let child;
  async function start(){
    child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',LLM_API_KEY:'test-key',TEST_LLM_BASE_URL:`http://127.0.0.1:${model.address().port}/v1`},stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('测试服务启动超时')),5000);
      child.once('error',err=>{clearTimeout(timer);reject(err);});
      child.once('exit',()=>{clearTimeout(timer);reject(new Error('服务退出'));});
      child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});
    });
  }
  async function stop(){if(child?.exitCode===null){const done=once(child,'exit');child.kill();await done;}}
  const state=async()=>(await(await fetch(origin+'/api/state')).json()).view;
  const post=async(path,input)=>{const response=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});return {status:response.status,...await response.json()};};
  try {
    await start();let view=await state();
    assert.equal(view.sects.player.sectId,null);
    for(const asset of ['/sect-data.js','/sect-world.js','/sect-ui.js','/sect.css','/building-world.js','/building-layout.js'])assert.equal((await fetch(origin+asset)).status,200);
    assert.equal((await post('/api/sects',{type:'apply',sectId:'qinglan',reason:'研习剑术'})).status,400);
    assert.equal((await post('/api/action',{type:'travel_region',place:'jinhuo',expectedRevision:0,playerBreakthrough:true})).status,400);
    assert.equal((await post('/api/sects',{type:'apply',sectId:'qinglan',reason:'研习剑术',expectedRevision:0})).status,400);
    const arrived=await post('/api/action',{type:'travel_region',place:'qinglan',expectedRevision:0});view=arrived.view;
    assert.equal(arrived.status,200);assert.deepEqual(view.campaign.regions.filter(r=>r.visited).map(r=>r.id).sort(),['market','qinglan','woods']);
    const failed=await post('/api/sects',{type:'apply',sectId:'qinglan',reason:'愿重信守诺，研习剑术。',expectedRevision:view.revision});
    assert.equal(failed.status,200);assert.equal(failed.view.sects.application.failureReason,'billing');
    assert.equal(failed.view.sects.application.status,'pending');assert.equal(failed.view.sects.player.sectId,null);
    await stop();await start();assert.equal((await state()).sects.application.failureReason,'billing');
    billingFailure=false;
    const invited=await post('/api/sects',{type:'review',sectId:'qinglan',expectedRevision:failed.view.revision});
    assert.equal(invited.status,200);assert.equal(requests,2);assert.equal(invited.view.sects.player.sectId,null);assert.equal(invited.view.sects.application.status,'invited');
    assert.equal(invited.view.sects.application.failureReason,undefined);
    assert.equal((await post('/api/sects',{type:'join',sectId:'qinglan',expectedRevision:view.revision})).status,409);
    const joined=await post('/api/sects',{type:'join',sectId:'qinglan',expectedRevision:invited.view.revision});
    assert.equal(joined.status,200);assert.equal(joined.view.sects.player.alignment,'righteous');assert.equal(joined.view.player.stones,initial.player.stones);
    await stop();await start();view=await state();assert.deepEqual(view,joined.view);
    const saved=await readFile(savePath,'utf8');
    assert.equal((await post('/api/sects',{type:'join',sectId:'qinglan',expectedRevision:view.revision})).status,400);
    assert.equal(await readFile(savePath,'utf8'),saved);
    assert.equal((await post('/api/sects',{type:'leave',sectId:'qinglan',expectedRevision:view.revision})).view.sects.player.sectId,null);
  } finally {
    await stop();model.closeAllConnections();await new Promise(resolve=>model.close(resolve));await rm(directory,{recursive:true,force:true});
  }
});
