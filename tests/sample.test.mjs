import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createSeed, sampleScan } from '../sample/seed.mjs';
import { initialize } from '../lib/store.mjs';
test('fictional sample has no personal paths and first-run dates are relative',()=>{
  const state=createSeed(new Date('2030-05-06T12:00:00'));
  assert.deepEqual(state.paths,{});assert.equal(state.dataset,'fictional-sample');
  assert.equal(state.tasks.find(t=>t.id==='studio-followup').due,'2030-05-08');
});
test('personal setup starts empty without importing anything',()=>{
  const state=createSeed(new Date(),true);assert.deepEqual(state.projects,[]);assert.deepEqual(state.tasks,[]);assert.deepEqual(state.paths,{});
});
test('sample scan ignores arbitrary path mappings and returns only fixture references',()=>{
  const state=createSeed();state.paths={northstar:'/this/path/must/not/be/read'};
  const scan=sampleScan(state);assert(scan.simulated);assert.equal(scan.projects.northstar.files[0].path,'launch-brief.md');assert.equal(scan.durationMs,0);
});
test('clean checkout initializes without private import files',async t=>{
  const root=path.resolve('tests/.tmp');await fs.mkdir(root,{recursive:true});const dir=await fs.mkdtemp(path.join(root,'sample-'));
  t.after(async()=>{if(!dir.startsWith(root+path.sep))throw Error('Invalid cleanup');await fs.rm(dir,{recursive:true,force:true});});
  const first=await initialize(dir);assert.equal(first.profile.name,'Alex');assert.equal((await fs.readdir(dir)).length,1);
  first.notes.custom='Persistent edit';await fs.writeFile(path.join(dir,'state.json'),JSON.stringify(first));
  assert.equal((await initialize(dir)).notes.custom,'Persistent edit');
});
