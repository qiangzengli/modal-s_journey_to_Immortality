import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer,request as httpRequest} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStateLoader} from './state-loader.js';
import {gameRequest} from './api-client.js';
import {cultivatorArt} from './equipment-art.js';

test('子目录反向代理：全部资源、立绘和真实读写请求留在应用路径内',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'niminglu-subpath-')),savePath=join(directory,'save.json');
  const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');
  const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
  const upstream=`http://127.0.0.1:${port}`,nativeFetch=globalThis.fetch;
  const child=spawn(process.execPath,['server.js'],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    env:{...process.env,PORT:String(port),SAVE_PATH:savePath,NODE_ENV:'test',LLM_API_KEY:'',TEST_LLM_BASE_URL:''},
    stdio:['ignore','pipe','pipe']
  });
  // Match a prefix-stripping proxy. Anything requested from the host root fails.
  const proxy=createServer((req,res)=>{
    if(!req.url.startsWith('/niminglu/')){res.writeHead(404);res.end();return;}
    const forwarded=httpRequest(new URL(req.url.slice('/niminglu'.length),upstream),{
      method:req.method,headers:{...req.headers,host:`127.0.0.1:${port}`}
    },response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
    forwarded.on('error',()=>{res.writeHead(502);res.end();});req.pipe(forwarded);
  });
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('startup timeout')),5000);
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.once('exit',code=>{clearTimeout(timer);reject(new Error('server exit '+code));});
      child.stdout.on('data',chunk=>{if(chunk.toString().includes('已启动')){clearTimeout(timer);resolve();}});
    });
    proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
    const entry=`http://127.0.0.1:${proxy.address().port}/niminglu/`;
    const home=await(await nativeFetch(entry)).text();
    assert.equal(JSON.parse(home.match(/<script type="importmap">([^<]+)<\/script>/)[1]).imports.three,'./vendor/three.module.js');
    assert.equal((await nativeFetch(entry+'assets/characters/models/manifest.json')).status,200);
    const queued=[...home.matchAll(/(?:href|src)="([^" ]+\.(?:js|css))"/g)].map(match=>new URL(match[1],entry).href),seen=new Set();
    queued.push(entry+'vendor/addons/loaders/GLTFLoader.js',entry+'vendor/addons/utils/SkeletonUtils.js');
    while(queued.length){
      const url=queued.shift();if(seen.has(url))continue;seen.add(url);
      assert.ok(url.startsWith(entry),`resource escaped the application: ${url}`);
      const response=await nativeFetch(url);assert.equal(response.status,200,url);
      const source=await response.text();
      if(url.endsWith('.js'))for(const match of source.matchAll(/(?:import|export)\s+(?:[^;'"\n]*?\s+from\s+)?['"]([^'"]+)['"]/g)){
        if(match[1].startsWith('.')||match[1].startsWith('/'))queued.push(new URL(match[1],url).href);
      }
    }
    assert.ok(seen.has(entry+'game/app.js'));assert.ok(seen.has(entry+'game/api-client.js'));
    assert.ok(seen.has(entry+'vendor/three.core.js'));
    assert.ok(seen.has(entry+'vendor/addons/utils/BufferGeometryUtils.js'));
    for(const match of cultivatorArt({bottle:true}).matchAll(/<image[^>]+href="([^"]+)"/g)){
      const url=new URL(match[1],entry);assert.ok(url.href.startsWith(entry));
      const response=await nativeFetch(url);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);
    }
    // Native fetch in a browser resolves relative URLs against the document URL.
    // Use the same resolution with the real HTTP service, including index.html.
    for(const documentURL of [entry,entry+'index.html']){
      t.mock.method(globalThis,'fetch',(path,options)=>{
        const url=new URL(path,documentURL);assert.ok(url.href.startsWith(entry),`API escaped the application: ${url}`);
        return nativeFetch(url,options);
      });
      let loaded;
      const load=createStateLoader({onStatus:()=>{},onLoad:data=>{loaded=data;}});
      assert.equal(await load(),true);assert.ok(loaded.view.player);
      const pulse=await gameRequest('/api/world/pulse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({engaged:true})});
      assert.equal(pulse.status,200);
    }
    const response=await gameRequest('/api/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'qixuan_exam',expectedRevision:0})});
    assert.equal(response.status,200);
    assert.ok(JSON.parse(await readFile(savePath,'utf8')).volume.flags.qixuan_exam);
    assert.equal((await nativeFetch(new URL('/api/state',entry))).status,404);
    assert.equal((await nativeFetch(entry+'.env.local')).status,404);
  }finally{
    proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));
    if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}
    await rm(directory,{recursive:true,force:true});
  }
});
