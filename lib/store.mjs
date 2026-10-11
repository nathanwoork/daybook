import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { localDay, STATUSES, TASK_STATUSES, taskHorizon } from './model.mjs';
import { createSeed } from '../sample/seed.mjs';
export async function readJSON(file,fallback) { try{return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));}catch(e){if(e.code==='ENOENT'&&fallback!==undefined)return fallback;throw e;} }
export async function atomicJSON(file,data) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temp=file+'.'+randomUUID()+'.tmp';
  try {await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n','utf8');await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true}).catch(()=>{});}
}
export async function initialize(dataDir, personal=false) {
  const file=path.join(dataDir,'state.json');
  const existing=await readJSON(file,null);if(existing)return existing;
  const state=createSeed(new Date(),personal);
  await atomicJSON(file,state);return state;
}
function fail(text){const e=new Error(text);e.status=422;throw e;}
const string=(v,max=3000)=>typeof v==='string'&&v.length<=max;
function date(v){return v==='' || v===null || (typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v+'T12:00:00Z')) && new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);}
export function mutate(input, action, now = new Date()) {
  const s=structuredClone(input),day=localDay(now);
  const project = id=>s.projects.find(p=>p.id===id);
  let detail='';
  if(action.type==='project-create') {
    const p=action.project||{};
    if(!string(p.name,200)||!p.name.trim()||!string(p.summary||'',6000)||!string(p.folderPath||'',1000)||!string(p.nextAction||'',6000))fail('A project name and valid details are required.');
    if(p.folderPath&&(!path.isAbsolute(p.folderPath)||path.parse(p.folderPath).root===p.folderPath))fail('Choose an absolute project folder, not a drive root.');
    const id=randomUUID();s.projects.push({id,name:p.name.trim(),summary:p.summary||'',status:'planning',priority:'med',nextAction:p.nextAction||'',milestones:[],readFirst:[],skip:[],connections:[],lastTouched:day});
    if(p.folderPath)s.paths[id]=path.normalize(p.folderPath);
    detail='Added project: '+p.name;
  } else if(action.type==='task-create') {
    const t=action.task||{};
    if(!string(t.title,500)||!t.title.trim()||!project(t.project)||!date(t.due||'')||!['high','med','low'].includes(t.priority||'med'))fail('A title, valid project, priority and date are required.');
    const task={id:randomUUID(),project:t.project,title:t.title.trim(),notes:'',status:'todo',priority:t.priority||'med',due:t.due||null,needsMe:!!t.needsMe,horizon:'next',createdAt:now.toISOString(),source:'daybook'};
    s.tasks.push(task);detail='Added: '+task.title;
  } else if(action.type==='task-update') {
    const t=s.tasks.find(t=>t.id===action.id);if(!t)fail('Task not found');
    const fields=action.patch||{};
    for(const [key,value] of Object.entries(fields)) {
      if(!['title','notes','status','priority','due','needsMe','horizon','focusOn','snoozeUntil'].includes(key))fail('Unsupported task field');
      if(['title','notes'].includes(key)&&(!string(value,key==='title'?500:5000)||(key==='title'&&!value.trim())))fail('Invalid text');
      if(key==='status'&&!TASK_STATUSES.includes(value))fail('Invalid task status');
      if(key==='priority'&&!['high','med','low'].includes(value))fail('Invalid priority');
      if(key==='horizon'&&!['next','backlog'].includes(value))fail('Invalid horizon');
      if(['due','focusOn','snoozeUntil'].includes(key)&&!date(value))fail('Invalid date');
      if(key==='needsMe'&&typeof value!=='boolean')fail('Invalid decision flag');
      t[key]=value;
    }
    if('status' in fields)t.doneAt=t.status==='done'?day:null;
    detail='Updated task: '+t.title;
  } else if(action.type==='project-update') {
    const p=project(action.id);if(!p)fail('Project not found');
    for(const [key,value] of Object.entries(action.patch||{})) {
      if(['nextAction','handover','summary'].includes(key)){if(!string(value,6000))fail('Text too long');}
      else if(key==='status'){if(!STATUSES.includes(value))fail('Invalid lifecycle');}
      else if(key==='priority'){if(!['high','med','low'].includes(value))fail('Invalid priority');}
      else if(key==='folderPath') {if(!string(value,1000)||(value&&(!path.isAbsolute(value)||path.parse(value).root===value)))fail('Choose an absolute project folder, not a drive root.');if(value)s.paths[p.id]=path.normalize(value);else delete s.paths[p.id];continue;}
      else if(key==='waitingOn') {if(value!==null&&(!value||!string(value.who,200)||!string(value.about,1000)||!date(value.followUp||'')))fail('Invalid follow-up');}
      else fail('Unsupported project field');
      p[key]=value;
    }
    p.lastTouched=day;detail='Updated project: '+p.name;
  } else if(action.type==='milestone') {
    const p=project(action.id);if(!p?.milestones?.[action.index]||typeof action.done!=='boolean')fail('Invalid milestone');
    p.milestones[action.index].done=action.done;detail='Updated milestone in '+p.name;
  } else if(action.type==='alert-snooze') {
    if(!string(action.id,300)||!action.id||!date(action.until))fail('Invalid snooze');
    s.alerts[action.id]={snoozeUntil:action.until};detail=action.until?'Snoozed alert until '+action.until:'Restored alert';
  } else if(action.type==='note') {
    if(!string(action.text,10000))fail('Note is too long');s.notes[day]=action.text;detail='Saved daily note';
  } else if(action.type==='profile') {
    if(!string(action.summary,6000)||!string(action.headline,400))fail('Invalid profile');
    if(action.name!==undefined){if(!string(action.name,100)||!action.name.trim())fail('Invalid name');s.profile.name=action.name.trim();}
    s.profile.summary=action.summary;s.profile.headline=action.headline;s.profile.updated=day;
    s.profile.history=[...(s.profile.history||[]),{date:day,change:'Summary edited in Daybook',reason:'Owner edit'}];detail='Updated profile summary';
  } else if(action.type==='settings') {
    const p=action.patch||{};
    for(const [key,value] of Object.entries(p)) {
      if(!['scanMinutes','staleDays','scanDepth'].includes(key)||!Number.isInteger(value))fail('Invalid setting');
      if(key==='scanMinutes'&&(value<2||value>60))fail('Scan interval must be 2–60 minutes');
      if(key==='staleDays'&&(value<1||value>90))fail('Check-in age must be 1–90 days');
      if(key==='scanDepth'&&(value<1||value>8))fail('Depth must be 1–8');
      s.settings[key]=value;
    }
    detail='Updated settings';
  } else fail('Unknown action');
  s.revision++;s.updatedAt=now.toISOString();s.history=[{at:s.updatedAt,detail},...s.history].slice(0,150);return s;
}
