import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialize,readJSON,atomicJSON,mutate } from './lib/store.mjs';
import { derive,handover } from './lib/model.mjs';
import { scanProjects } from './lib/scanner.mjs';
import { sampleScan } from './sample/seed.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const personal=process.argv.includes('--personal');
const mode=personal?'personal':'demo';
const dataDir=process.env.DAYBOOK_DATA_DIR||path.join(root,'data',mode);
const port=Number(process.env.DAYBOOK_PORT||(personal?8146:8145)), host='127.0.0.1';
let state=await initialize(dataDir,personal),scan=personal?await readJSON(path.join(dataDir,'scan.json'),{}):sampleScan(state),scanning=false,scanError=null,queue=Promise.resolve(),nextScan=Date.now();
const identity='daybook-portfolio-v1';
const publicFiles={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/icon.svg':'icon.svg'};
async function sourceStatus() {
  return {changed:[],importedAt:state.importedAt};
}
async function artifacts() {
  const m=derive(state,scan);
  await fs.mkdir(path.join(dataDir,'briefs'),{recursive:true});
  await atomicJSON(path.join(dataDir,'briefs',m.day+'.json'),{date:m.day,generated:new Date().toISOString(),method:'Local rules. No AI.',brief:m.brief,focus:m.focus.map(t=>({title:t.title,project:t.project})),alerts:m.alerts});
  await fs.writeFile(path.join(dataDir,'HANDOVER.md'),handover(state,m),'utf8');
}
function serial(fn){const result=queue.then(fn);queue=result.catch(()=>{});return result;}
async function runScan() {
  if(scanning)return false;
  scanning=true;scanError=null;
  try {
    const result=personal?await scanProjects(structuredClone(state),scan,[root]):sampleScan(state);
    await serial(async()=>{scan=result;await atomicJSON(path.join(dataDir,'scan.json'),scan);await artifacts();});
  }catch(e){scanError=e.message;}
  finally{scanning=false;nextScan=Date.now()+state.settings.scanMinutes*60000;}
  return true;
}
function reply(res,status,payload,type='application/json; charset=utf-8') {
  const body=typeof payload==='string'?payload:JSON.stringify(payload);
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});res.end(body);
}
async function body(req) {
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>65536){const e=new Error('Request too large');e.status=413;throw e;}chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{const e=new Error('Invalid JSON');e.status=400;throw e;}
}
const server=http.createServer(async(req,res)=>{
  try {
    const allowed=new Set([`${host}:${port}`,`localhost:${port}`]);
    if(!allowed.has(req.headers.host)|| (req.headers.origin&&!['http://'+host+':'+port,'http://localhost:'+port].includes(req.headers.origin)))return reply(res,403,{error:'Local origin required'});
    const url=new URL(req.url,`http://${host}:${port}`),route=url.pathname;
    if(req.method==='GET') {
      if(route==='/api/health')return reply(res,200,{app:identity,ok:true,pid:process.pid,port});
      if(route==='/api/state')return reply(res,200,{...state,model:derive(state,scan),scan,system:{mode,scanning,scanError,nextScan:new Date(nextScan).toISOString(),source:await sourceStatus()}});
      if(route==='/api/handover')return reply(res,200,handover(state,derive(state,scan),url.searchParams.get('project')),'text/markdown; charset=utf-8');
      if(route==='/api/export'){res.setHeader('Content-Disposition','attachment; filename="daybook-backup.json"');return reply(res,200,state);}
      if(route==='/api/briefs') {const names=(await fs.readdir(path.join(dataDir,'briefs')).catch(()=>[])).filter(n=>/^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().reverse().slice(0,30);return reply(res,200,await Promise.all(names.map(n=>readJSON(path.join(dataDir,'briefs',n)))));}
      if(publicFiles[route]) {
        const ext=path.extname(publicFiles[route]),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
        return reply(res,200,await fs.readFile(path.join(root,'public',publicFiles[route]),'utf8'),types[ext]);
      }
      return reply(res,404,{error:'Not found'});
    }
    if(req.method==='POST') {
      if(req.headers['x-daybook']!=='1'||!req.headers['content-type']?.startsWith('application/json'))return reply(res,403,{error:'Daybook request required'});
      const input=await body(req);
      if(route==='/api/scan') {if(scanning)return reply(res,409,{error:'A scan is already running'});void runScan();return reply(res,202,{ok:true});}
      if(route==='/api/stop'){reply(res,200,{ok:true});setTimeout(()=>{server.close();process.exit(0);},100);return;}
      if(route!=='/api/action')return reply(res,404,{error:'Not found'});
      if(!personal && (input.action?.project?.folderPath || input.action?.patch?.folderPath))return reply(res,422,{error:'Demo mode does not accept local folder paths. Start with --personal to use your own folders.'});
      await serial(async()=>{
        if(input.revision!==state.revision){const e=new Error('Another window changed these records. Refreshed the page; please try again.');e.status=409;throw e;}
        const updated=mutate(state,input.action);
        await fs.mkdir(path.join(dataDir,'backups'),{recursive:true});
        const backup=path.join(dataDir,'backups',`state-${state.revision}.json`);
        await atomicJSON(backup,state);await atomicJSON(path.join(dataDir,'state.json'),updated);state=updated;
        const backups=(await fs.readdir(path.join(dataDir,'backups'))).filter(x=>/^state-\d+\.json$/.test(x)).sort((a,b)=>Number(b.match(/\d+/)[0])-Number(a.match(/\d+/)[0]));
        for(const file of backups.slice(20))await fs.rm(path.join(dataDir,'backups',file),{force:true});
        nextScan=Math.min(nextScan,Date.now()+state.settings.scanMinutes*60000);
        await artifacts();
      });
      return reply(res,200,{ok:true,revision:state.revision});
    }
    reply(res,405,{error:'Method not allowed'});
  }catch(e){reply(res,e.status||500,{error:e.status?e.message:'Local operation failed; check disk space and data permissions.'});console.error(e.message);}
});
server.requestTimeout=10000;server.headersTimeout=10000;
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Use Start Daybook to reuse the existing app.`:e.message);process.exit(1);});
server.listen(port,host,()=>{console.log(`Daybook ${mode} running at http://${host}:${port}`);void runScan();});
setInterval(()=>{if(Date.now()>=nextScan)void runScan();void serial(artifacts).catch(e=>console.error(e.message));},60000).unref();
