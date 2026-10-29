import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { throughCampaign, openingMove } from './canon-test-helpers.js';

test('燕堡 API：终战中途重启、拒绝过期请求，通关和凭证原子落盘且不可重复结算', async () => {
  const dir=await mkdtemp(join(tmpdir(),'niminglu-yanbao-')),savePath=join(dir,'save.json');
  await writeFile(savePath,JSON.stringify(throughCampaign('leave_forbidden')));
  const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  const origin=`http://127.0.0.1:${port}`;let child,view;
  async function start(){
    child=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,NODE_ENV:'test',PORT:String(port),SAVE_PATH:savePath,LLM_API_KEY:''},stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout')),5000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exit '+code));});child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});});
    view=(await(await fetch(origin+'/api/state')).json()).view;
  }
  async function stop(){if(child?.exitCode===null){const done=once(child,'exit');child.kill();await done;}}
  async function post(path,input){const response=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedRevision:view.revision,...input})});const data=await response.json();if(response.ok)view=data.view;return {status:response.status,...data};}
  try{
    await start();assert.equal(view.campaign.next.type,'enter_yanbao');
    assert.equal((await fetch(origin+'/game/character-model.js')).status,200);
    assert.equal((await post('/api/action',{type:'travel_region',place:'yanbao'})).status,200);
    while(view.player.hp<100)assert.equal((await post('/api/action',{type:'frontier_rest'})).status,200);
    for(const type of ['enter_yanbao','investigate_yanbao','fight_wangchan'])assert.equal((await post('/api/action',{type})).status,200);
    assert.equal(view.battle.boss,true);assert.equal(view.battle.enemyName,'王蝉');
    assert.equal((await post('/api/combat',openingMove(view))).status,200);
    const saved=await readFile(savePath,'utf8'),before=structuredClone(view);await stop();await start();assert.deepEqual(view,before);
    assert.equal((await post('/api/combat',{...openingMove(view),expectedRevision:view.revision-1})).status,409);assert.equal(await readFile(savePath,'utf8'),saved);
    for(let i=0;i<50&&view.battle.status==='active';i++)assert.equal((await post('/api/combat',openingMove(view))).status,200);
    assert.equal(view.battle.status,'won');assert.equal(view.campaign.complete,false);
    const claimed=await post('/api/combat',{type:'claim',enemyId:'wen'});assert.equal(claimed.status,200);assert.equal(view.campaign.complete,true);
    assert.equal(view.inventory.find(item=>item.id==='yanbao_token').quantity,1);
    const complete=await readFile(savePath,'utf8');await stop();await start();assert.equal(view.campaign.complete,true);
    assert.equal((await post('/api/combat',{type:'claim',enemyId:'wen'})).status,400);assert.equal(await readFile(savePath,'utf8'),complete);
    assert.equal(view.campaign.next.type,'sort_trial_gains','通关后仍可继续原有修行');
  }finally{await stop();await rm(dir,{recursive:true,force:true});}
});
