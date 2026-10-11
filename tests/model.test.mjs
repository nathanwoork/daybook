import test from 'node:test';
import assert from 'node:assert/strict';
import { derive,handover,localDay,plusDays,taskHorizon } from '../lib/model.mjs';
import { mutate } from '../lib/store.mjs';
const now=new Date('2026-10-08T12:00:00');
const base=()=>({revision:1,projects:[{id:'active',name:'Active',status:'building',priority:'high',milestones:[]},{id:'held',name:'Held',status:'on-hold'}],tasks:[],settings:{staleDays:14},alerts:{},history:[],notes:{},paths:{}});
const task=(id,patch={})=>({id,project:'active',title:id,status:'todo',priority:'med',...patch});
test('inactive projects never contribute focus, deadlines, alerts or open counts',()=>{
  const s=base();s.tasks=[task('old',{project:'held',due:'2020-01-01',needsMe:true,focusOn:'2026-10-08'}),task('live')];
  const m=derive(s,{},now);assert.equal(m.stats.open,1);assert.equal(m.alerts.length,0);assert.equal(m.agenda.length,0);assert.deepEqual(m.focus.map(x=>x.id),['live']);
});
test('future due dates and backlog stay out of suggested focus; explicit pin wins',()=>{
  const s=base();s.tasks=[task('future',{due:'2026-10-12',priority:'high'}),task('backlog',{horizon:'backlog',priority:'high'}),task('ready'),task('pinned',{horizon:'backlog',focusOn:'2026-10-08'})];
  assert.deepEqual(derive(s,{},now).focus.map(t=>t.id),['pinned','ready']);
});
test('focus respects snooze and blockers; caps at three',()=>{
  const s=base();s.tasks=[task('sleep',{snoozeUntil:'2026-10-09'}),task('block',{status:'blocked'}),...Array.from({length:5},(_,i)=>task('ready'+i))];
  const m=derive(s,{},now);assert.equal(m.focus.length,3);assert(m.focus.every(t=>t.id.startsWith('ready')));
});
test('task and registry follow-up deduplicate without hiding distant dates',()=>{
  const s=base();s.projects[0].waitingOn={who:'Person',about:'A decision',followUp:'2026-10-12'};s.tasks=[task('follow',{title:'Follow up with Person',due:'2026-10-12'}),task('later',{due:'2026-12-28'})];
  const m=derive(s,{},now);assert.equal(m.alerts.length,1);assert.equal(m.agenda.length,2);
});
test('snoozed alerts return on their chosen date',()=>{
  const s=base();s.tasks=[task('late',{due:'2026-10-07'})];s.alerts['due:late:2026-10-07']={snoozeUntil:'2026-10-09'};
  assert.equal(derive(s,{},now).alerts.length,0);assert.equal(derive(s,{},new Date('2026-10-09T12:00:00')).alerts.length,1);
});
test('completing a task removes its due alert; immutable mutation retains previous value',()=>{
  const s=base();s.tasks=[task('late',{due:'2026-10-07'})];const next=mutate(s,{type:'task-update',id:'late',patch:{status:'done'}},now);
  assert.equal(derive(next,{},now).alerts.length,0);assert.equal(s.tasks[0].status,'todo');assert.equal(next.tasks[0].doneAt,'2026-10-08');assert.equal(next.revision,2);
});
test('malformed dates, fields, status and priority rejected',()=>{
  const s=base();s.tasks=[task('a')];for(const patch of [{due:'2026-02-31'},{status:'banana'},{priority:'critical'},{project:'held'},{title:''}])assert.throws(()=>mutate(s,{type:'task-update',id:'a',patch},now));
});
test('observed activity never completes a milestone or task',()=>{
  const s=base();s.projects[0].milestones=[{title:'Build',done:false}];s.tasks=[task('build')];const m=derive(s,{projects:{active:{newest:now.toISOString(),scannedAt:now.toISOString()}}},now);
  assert.equal(m.projects[0].progress,0);assert.equal(m.stats.open,1);
});
test('missing folder becomes visible scan-health alert',()=>{const m=derive(base(),{projects:{active:{error:'Folder not found'}}},now);assert.equal(m.alerts[0].kind,'Scan health');});
test('handover excludes inactive projects by default and bounds tasks',()=>{const s=base();s.tasks=Array.from({length:20},(_,i)=>task('step'+i));const text=handover(s,derive(s,{},now));assert(!text.includes('## Held'));assert(text.includes('step4'));assert(!text.includes('step5'));});
test('local calendar arithmetic crosses month boundaries',()=>{assert.equal(plusDays('2026-10-31',1),'2026-11-01');assert.equal(localDay(now),'2026-10-08');});
test('import preserves later plan weeks as backlog',()=>{assert.equal(taskHorizon({notes:'Trello: planned · week 4'}),'backlog');assert.equal(taskHorizon({notes:'Trello: planned · week 1'}),'next');});
