import { sendModelReply } from './model-test-helpers.js';
import {throughCampaign} from './canon-test-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGame, applyAction } from './engine.js';
import { regionPath } from './regions.js';

test('禁地自主援助经接口原子保存，拒绝过期决策，重启后不重复扣款',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'niminglu-aftermath-'));
  const savePath=join(directory,'save.json');
  let game=throughCampaign('enter_forbidden');game.people.song.trust=10;
  await writeFile(savePath,JSON.stringify(game));
  let child,invalid=false;
  const model=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    const context=JSON.parse(JSON.parse(body).input[1].content[0].text);
    const decisions=context.actors.map(actor=>({actorId:actor.id,actionId:actor.id==='song'&&(invalid||actor.candidates.some(c=>c.id==='share_trial_notes'))?'share_trial_notes':'observe',goal:'为同门整理禁地见闻',speech:'我会按手头的钱财来安排。'}));
    sendModelReply(res, JSON.stringify({decisions}));
  });
  model.listen(0,'127.0.0.1');await once(model,'listening');
  const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  async function start(){
    child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',TEST_LLM_BASE_URL:`http://127.0.0.1:${model.address().port}/v1`,LLM_API_KEY:'test-key',LLM_TIMEOUT_MS:'2000'},stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('测试服务启动超时')),5000);
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.once('exit',()=>{clearTimeout(timer);reject(new Error('测试服务退出'));});
      child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});
    });
  }
  async function stop(){if(child?.exitCode===null){const done=once(child,'exit');child.kill();await done;}}
  const origin=`http://127.0.0.1:${port}`;
  const post=async(path,input)=>{const response=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});return {status:response.status,...await response.json()};};
  try{
    await start();
    const step=await post('/api/world/step',{expectedRevision:0});
    assert.equal(step.status,200);assert.equal(step.advanced,true);
    assert.equal(step.view.campaign.title,'卷二 · 黄枫仙途');
    assert.equal(Boolean(step.view.campaign.flags.scout_help),true);
    const saved=JSON.parse(await readFile(savePath,'utf8'));
    assert.equal(saved.people.song.stones,game.people.song.stones-20);
    assert.equal(saved.campaign.endingEvent,game.campaign.endingEvent);
    assert.ok(saved.society.minds.song.memories.some(memory=>memory.text.includes('禁地')));
    assert.equal((await post('/api/world/step',{expectedRevision:0})).status,409);
    await stop();await start();
    const restored=(await (await fetch(origin+'/api/state')).json()).view;
    assert.equal(Boolean(restored.campaign.flags.scout_help),true);
    invalid=true;
    const before=await readFile(savePath,'utf8');
    assert.equal((await post('/api/world/step',{expectedRevision:restored.revision})).advanced,false);
    assert.equal(await readFile(savePath,'utf8'),before);
    invalid=false;
    const observing=await post('/api/world/step',{expectedRevision:restored.revision});
    assert.equal(observing.advanced,true);
    const after=JSON.parse(await readFile(savePath,'utf8'));
    assert.equal(after.people.song.stones,saved.people.song.stones);
    assert.equal(after.campaign.storyFlags.scout_help,saved.campaign.storyFlags.scout_help);
  }finally{
    await stop();model.closeAllConnections();await new Promise(resolve=>model.close(resolve));
    await rm(directory,{recursive:true,force:true});
  }
});
