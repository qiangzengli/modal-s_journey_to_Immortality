// Isolated visual QA: no game server, model credentials or player save are loaded.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||4196);
createServer(async(req,res)=>{
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  const path=new URL(req.url,'http://localhost').pathname;
  let file=path==='/'?'scripts/character-preview.html':path==='/character-preview.js'?'scripts/character-preview.js':path.startsWith('/vendor/addons/')?'node_modules/three/examples/jsm/'+path.slice(15):path.startsWith('/vendor/')?'node_modules/three/build/'+path.slice(8):path.startsWith('/assets/')?'game'+path:path.startsWith('/game/')?path.slice(1):null;
  if(!file){res.writeHead(404);res.end();return;}
  const absolute=resolve(root,file);if(!absolute.startsWith(root.replace(/\/$/,'')+sep)){res.writeHead(404);res.end();return;}
  try{const content=await readFile(absolute);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.html':'text/html','.jpg':'image/jpeg','.json':'application/json','.glb':'model/gltf-binary'}[extname(file)]||'application/octet-stream'),'Cache-Control':'no-store'});res.end(content);}catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Character studio: http://127.0.0.1:${port}/`));
