import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ACTIVE } from './model.mjs';
const exec = promisify(execFile);
export const EXCLUDED = new Set(['node_modules','.git','.agents','.claude','.codex','.beads','.vscode','.venv','venv','__pycache__','.pytest_cache','.next','.expo','.gradle','dist','build','coverage','archive','_archive','data','data.template','verification','screenshots','outputs']);
const secret = name => /^\.env(?:\.|$)/i.test(name)||/^(credentials|secrets|tokens?)(\.|$)/i.test(name)||/\.(pem|key|pfx)$/i.test(name);
const kind = name => /\.(md|txt|pdf|docx)$/i.test(name)?'Document':/\.(js|mjs|ts|tsx|jsx|py|html|css|ps1)$/i.test(name)?'Code':/\.(json|csv|xlsx|xlsm|toml|ya?ml)$/i.test(name)?'Data':/\.(png|jpe?g|svg|webp)$/i.test(name)?'Image':'File';
export async function scanFolder(root, options={}) {
  const {maxDepth=5,maxFiles=6000,maxMs=4000,excludePaths=[]} = options;
  const started = Date.now(), files=[], warnings=[];
  let visited=0, truncated=false;
  const base = path.resolve(root);
  const excluded = excludePaths.map(p=>path.resolve(p).toLowerCase());
  async function walk(dir,depth) {
    if(Date.now()-started>maxMs || visited>=maxFiles) {truncated=true;return;}
    let entries;
    try {entries=await fs.readdir(dir,{withFileTypes:true});} catch(e) {warnings.push(`${path.relative(base,dir)||'.'}: ${e.code}`);return;}
    entries.sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries) {
      if(Date.now()-started>maxMs || visited>=maxFiles) {truncated=true;break;}
      const full=path.join(dir,entry.name);
      if(secret(entry.name)||entry.name.startsWith('.chart-data')||EXCLUDED.has(entry.name.toLowerCase())||excluded.some(p=>full.toLowerCase()===p||full.toLowerCase().startsWith(p+path.sep))) continue;
      // lstat catches Windows junctions as well as symbolic links. Never traverse either.
      let stat;
      try{stat=await fs.lstat(full);}catch{continue;}
      if(stat.isSymbolicLink()) continue;
      visited++;
      if(stat.isDirectory()) {if(depth<maxDepth) await walk(full,depth+1);else truncated=true;}
      else if(stat.isFile()) files.push({path:path.relative(base,full).replaceAll('\\','/'),name:entry.name,size:stat.size,modified:stat.mtime.toISOString(),kind:kind(entry.name)});
    }
  }
  try {const s=await fs.lstat(base);if(!s.isDirectory()||s.isSymbolicLink())throw new Error('Folder is missing or is a link');}catch(e){return {files:[],error:e.code==='ENOENT'?'Folder not found':e.message,scannedAt:new Date().toISOString()};}
  await walk(base,0);
  return {files,newest:files.reduce((v,f)=>f.modified>v?f.modified:v,'')||null,count:files.length,truncated,warnings,durationMs:Date.now()-started,scannedAt:new Date().toISOString()};
}
async function gitStatus(root) {
  // Only actual repository roots; never accidentally report an ancestor's repo.
  try{await fs.access(path.join(root,'.git'));}catch{return {available:false};}
  try {
    const run = async args=>(await exec('git',['-C',root,...args],{timeout:5000,windowsHide:true,maxBuffer:1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}})).stdout.trim();
    const branch=await run(['branch','--show-current']);
    const changes=await run(['status','--porcelain','--untracked-files=no']);
    return {available:true,branch:branch||'detached',changedTracked:changes?changes.split('\n').length:0};
  }catch{return {available:false,error:'Git status unavailable'};}
}
export async function scanProjects(state, previous={}, excludePaths=[]) {
  const start=Date.now(), projects={},changes=[];
  for(const p of state.projects) {
    if(!ACTIVE.has(p.status)||!state.paths[p.id]) continue;
    const result=await scanFolder(state.paths[p.id],{excludePaths,maxDepth:state.settings.scanDepth});
    result.git=await gitStatus(state.paths[p.id]);
    const old=previous.projects?.[p.id];
    if(old && !old.error && !result.error && !old.truncated && !result.truncated && !old.warnings?.length && !result.warnings?.length) {
      const before=new Map((old.files||[]).map(f=>[f.path,f]));
      for(const f of result.files) {
        const last=before.get(f.path);
        if(!last || last.modified!==f.modified || last.size!==f.size) changes.push({project:p.id,path:f.path,kind:last?'changed':'added',at:result.scannedAt});
        before.delete(f.path);
      }
      for(const f of before.values()) changes.push({project:p.id,path:f.path,kind:'removed',at:result.scannedAt});
    }
    projects[p.id]=result;
  }
  return {generated:new Date().toISOString(),durationMs:Date.now()-start,projects,changes:[...changes,...(previous.changes||[])].slice(0,100),limits:{depth:state.settings.scanDepth,entriesPerProject:6000,millisecondsPerProject:4000},baseline:!previous.generated};
}
