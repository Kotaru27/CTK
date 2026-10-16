import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const p=spawn(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
p.on('close',code=>{
 if(code!==0)process.exit(code||1);
 const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
 const port=Number(process.env.PORT||4173);
 createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+pathname.replace(/\/$/,'/index.html'));
  if(!target.startsWith(root+path.sep)||!existsSync(target)||!statSync(target).isFile()){res.writeHead(404).end('Not found');return;}
  res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(readFileSync(target));
 }).listen(port,()=>console.log(`Creative Tools: http://localhost:${port}`));
});
