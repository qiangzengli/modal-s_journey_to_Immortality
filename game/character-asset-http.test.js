import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {mkdtemp,cp,symlink,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PROBE_ENTRY,characterGLBProbe} from './character-asset-test-fixture.js';

test('服务器只提供清单内的 GLB，缺失文件与逃出模型目录的链接返回 404',async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url)),directory=await mkdtemp(join(tmpdir(),'niminglu-assets-http-'));
  let child;
  try{
    await cp(join(root,'game'),join(directory,'game'),{recursive:true});
    for(const file of ['server.js','package.json','index.html'])await cp(join(root,file),join(directory,file));
    await symlink(join(root,'node_modules'),join(directory,'node_modules'),'dir');
    const assets=join(directory,'game/assets/characters/models'),buffer=Buffer.from(characterGLBProbe());
    await writeFile(join(assets,'probe.glb'),buffer);
    await writeFile(join(assets,'unlisted.glb'),buffer);
    await writeFile(join(directory,'outside.glb'),'not public');
    await symlink(join(directory,'outside.glb'),join(assets,'escape.glb'));
    const characters={player:PROBE_ENTRY,ji:{...PROBE_ENTRY,file:'missing.glb'},modafu:{...PROBE_ENTRY,file:'escape.glb'}};
    await writeFile(join(assets,'manifest.json'),JSON.stringify({version:1,characters}));
    const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;
    await new Promise(resolve=>reserve.close(resolve));
    child=spawn(process.execPath,['server.js'],{cwd:directory,env:{...process.env,PORT:String(port),SAVE_PATH:join(directory,'save.json'),NODE_ENV:'test',LLM_API_KEY:''},stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('startup timeout')),5000);
      child.once('error',error=>{clearTimeout(timeout);reject(error);});child.once('exit',code=>{clearTimeout(timeout);reject(new Error('server exit '+code));});
      child.stdout.on('data',data=>{if(data.toString().includes('已启动')){clearTimeout(timeout);resolve();}});
    });
    const base=`http://127.0.0.1:${port}`;
    const response=await fetch(base+'/assets/characters/models/probe.glb');
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'model/gltf-binary');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),buffer);
    for(const path of ['/assets/characters/models/unlisted.glb','/assets/characters/models/missing.glb','/assets/characters/models/escape.glb','/outside.glb','/.env.local','/save.json','/game/server.js'])assert.equal((await fetch(base+path)).status,404,path);
    const cli=spawnSync(process.execPath,[join(root,'scripts/check-character-assets.mjs'),assets],{encoding:'utf8'});
    assert.equal(cli.status,1,'发布前校验应拒绝缺失资源');
    delete characters.ji;delete characters.modafu;
    await writeFile(join(assets,'manifest.json'),JSON.stringify({version:1,characters}));
    const valid=spawnSync(process.execPath,[join(root,'scripts/check-character-assets.mjs'),assets],{encoding:'utf8'});
    assert.equal(valid.status,0,valid.stderr);assert.match(valid.stdout,/角色资源检查通过/);
  }finally{
    if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}
    await rm(directory,{recursive:true,force:true});
  }
});
