import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCharacterManifest,inspectCharacterGLB} from '../game/character-asset-contract.js';

const directory=resolve(process.argv[2]||fileURLToPath(new URL('../game/assets/characters/models/',import.meta.url)));
try{
  const manifest=validateCharacterManifest(JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8')));
  const canonical=await realpath(directory);
  for(const [id,entry]of Object.entries(manifest.characters)){
    const path=await realpath(resolve(directory,entry.file));
    if(!path.startsWith(canonical+sep))throw new Error(`${id}: 资源必须位于模型目录内。`);
    const data=await readFile(path),buffer=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
    const result=inspectCharacterGLB(buffer,entry);
    console.log(`${id}: ${entry.file} · ${result.triangles} triangles · ${result.materials} materials · ${(result.bytes/1048576).toFixed(2)} MiB`);
  }
  console.log(Object.keys(manifest.characters).length?'角色资源检查通过。':'清单为空：继续使用现有程序模型，没有声称已接入高精度资产。');
}catch(error){console.error(`${error.code||'ASSET_CHECK_FAILED'}: ${error.message}`);process.exitCode=1;}
