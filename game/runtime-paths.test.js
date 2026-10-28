import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {runtimePaths,loadGameEnvironment} from './runtime-paths.js';

test('统一存档：显式路径优先，否则沿用旧档；已有根目录存档时不退回旧档',()=>{
 const root=resolve('/example/game'),primary=join(root,'.data/save.json'),previous=join(root,'mvp/.data/save.json');
 const present=new Set();const get=env=>runtimePaths(root,{env,exists:path=>present.has(path)});
 assert.equal(get({}).savePath,primary);present.add(previous);assert.equal(get({}).savePath,previous);
 present.add(primary);assert.equal(get({}).savePath,primary);
 assert.equal(get({SAVE_PATH:'my-save.json'}).savePath,resolve('my-save.json'));
});
test('配置兼容：根配置优先、旧配置兜底，进程变量不被文件覆盖',()=>{
 const root=mkdtempSync(join(tmpdir(),'niminglu-env-')),key='NIMINGLU_TEST_CONFIG',before=process.env[key];
 try{
  mkdirSync(join(root,'mvp'));writeFileSync(join(root,'mvp/.env.local'),`${key}=previous\n`);
  delete process.env[key];loadGameEnvironment(root);assert.equal(process.env[key],'previous');
  writeFileSync(join(root,'.env.local'),`${key}=primary\n`);
  delete process.env[key];loadGameEnvironment(root);assert.equal(process.env[key],'primary');
  process.env[key]='explicit';loadGameEnvironment(root);assert.equal(process.env[key],'explicit');
 }finally{if(before===undefined)delete process.env[key];else process.env[key]=before;rmSync(root,{recursive:true,force:true});}
});
