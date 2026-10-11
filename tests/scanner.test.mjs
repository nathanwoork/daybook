import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanFolder,scanProjects } from '../lib/scanner.mjs';
const tempRoot=path.resolve('tests/.tmp');
await fs.mkdir(tempRoot,{recursive:true});
async function fixture(t){const folder=await fs.mkdtemp(path.join(tempRoot,'scan-'));t.after(async()=>{if(!path.resolve(folder).startsWith(tempRoot+path.sep))throw new Error('Unsafe cleanup');await fs.rm(folder,{recursive:true,force:true});});return folder;}
async function file(base,rel,text='test'){await fs.mkdir(path.dirname(path.join(base,rel)),{recursive:true});await fs.writeFile(path.join(base,rel),text);}
test('prunes dependencies, tool files, archives and secrets before descent',async t=>{
  const root=await fixture(t);for(const name of ['README.md','src/app.js','node_modules/deep/no.js','.git/config','archive/old.md','data/customer.json','.env','secrets.json','.codex/config.json'])await file(root,name);
  const result=await scanFolder(root);assert.deepEqual(result.files.map(f=>f.path).sort(),['README.md','src/app.js']);
});
test('depth is a traversal limit, not just a display limit',async t=>{const root=await fixture(t);await file(root,'a/okay.md');await file(root,'a/b/c/no.md');const s=await scanFolder(root,{maxDepth:1});assert.deepEqual(s.files.map(f=>f.path),['a/okay.md']);assert(s.truncated);});
test('entry budget stops traversal and exposes partial coverage',async t=>{const root=await fixture(t);for(let i=0;i<10;i++)await file(root,i+'.md');const s=await scanFolder(root,{maxFiles:3});assert.equal(s.files.length,3);assert(s.truncated);});
test('missing root reports a useful error',async t=>{const root=await fixture(t);assert.equal((await scanFolder(path.join(root,'missing'))).error,'Folder not found');});
test('inactive mapped folders are never scanned; self path is excluded',async t=>{const root=await fixture(t);await file(root,'app/a.md');await file(root,'work/b.md');const state={projects:[{id:'active',status:'building'},{id:'paused',status:'on-hold'}],paths:{active:root,paused:root},settings:{scanDepth:4}};const s=await scanProjects(state,{},[path.join(root,'app')]);assert.deepEqual(Object.keys(s.projects),['active']);assert.deepEqual(s.projects.active.files.map(f=>f.path),['work/b.md']);});
test('scan differences distinguish additions changes and deletions',async t=>{const root=await fixture(t);await file(root,'old.md');await file(root,'same.md');const state={projects:[{id:'a',status:'building'}],paths:{a:root},settings:{scanDepth:4}};const first=await scanProjects(state);await fs.unlink(path.join(root,'old.md'));await file(root,'new.md');await file(root,'same.md','changed and longer');const next=await scanProjects(state,first);assert.deepEqual(next.changes.map(c=>c.kind).sort(),['added','changed','removed']);});
