import test from 'node:test';
import assert from 'node:assert/strict';
import {writeReportFiles,pendingReportWrites,retryReportWrites} from '../src/report-write.js';

function fixture(){
 const values=new Map(),blobs=new Map([['existing','original'],['other','private']]);
 const state={reports:[{id:'existing'}],otherProfiles:{other:{reports:[{id:'other'}]}}};
 const storage={get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const args={storage,key:'isolated-qa',getState:()=>state,operationId:'test',files:[{id:'new',blob:'synthetic'}],persist:()=>{state.reports.push({id:'new'});return true},store:async(mode,id,files)=>{if(mode==='putMany')for(const f of files)blobs.set(f.id,f.blob);else if(mode==='delete')blobs.delete(id)}};
 return {args,values,blobs,state};
}
test('upload and multi-file restore only succeed after metadata commits; original profiles remain intact',async()=>{
 for(const multiple of [false,true]){
  const f=fixture();if(multiple)f.args.files.push({id:'second',blob:'synthetic 2'});
  f.args.persist=()=>{f.state.reports.push(...f.args.files.map(({id})=>({id})));return true};
  assert.equal(await writeReportFiles(f.args),'');assert.equal(f.values.size,0);
  for(const {id,blob} of f.args.files)assert.equal(f.blobs.get(id),blob);
  assert.equal(f.blobs.get('existing'),'original');assert.equal(f.blobs.get('other'),'private');
  assert.deepEqual(f.state.otherProfiles,{other:{reports:[{id:'other'}]}});
 }
});
test('metadata rejection rolls back only new files and never reports success, including empty backups',async()=>{
 for(const files of [[],[{id:'new',blob:'synthetic'}],[{id:'new',blob:'synthetic'},{id:'second',blob:'synthetic 2'}]]){
  const f=fixture(),before=structuredClone(f.state);f.args.files=files;f.args.persist=()=>false;
  await assert.rejects(writeReportFiles(f.args),/档案未保存/);
  assert.deepEqual([...f.blobs],[['existing','original'],['other','private']]);assert.deepEqual(f.state,before);assert.equal(f.values.size,0);
 }
});
test('failed rollback survives retry; cleanup preserves references across all profiles and QA namespaces',async()=>{
 const f=fixture(),store=f.args.store;f.args.persist=()=>false;f.args.store=async(mode,...args)=>{if(mode==='delete')throw Error('injected delete failure');return store(mode,...args)};
 await assert.rejects(writeReportFiles(f.args),/重试清理/);assert.equal(f.blobs.get('new'),'synthetic');assert.equal(pendingReportWrites(f.args.storage,f.args.key).length,1);
 f.values.set('another-store-report-write-test',JSON.stringify(['other']));
 // Retry uses fresh state, including references that became valid meanwhile.
 f.state.otherProfiles.other.reports.push({id:'new'});f.args.store=store;
 await retryReportWrites(f.args);assert.equal(f.blobs.get('new'),'synthetic');assert.equal(f.values.size,1);
 const g=fixture(),original=g.args.store;g.args.persist=()=>false;g.args.store=async(mode,...args)=>{if(mode==='delete')throw Error('injected');return original(mode,...args)};
 await assert.rejects(writeReportFiles(g.args));g.args.store=original;
 await retryReportWrites(g.args);assert.equal(g.blobs.has('new'),false);assert.equal(g.values.size,0);
});
test('journal or file failure never commits metadata; a committed file survives journal cleanup failure',async()=>{
 const f=fixture();let commits=0;f.args.persist=()=>{commits++;return true};f.args.storage.setItem=()=>{throw Error('injected journal quota')};
 await assert.rejects(writeReportFiles(f.args),/quota/);assert.equal(commits,0);assert.equal(f.blobs.size,2);
 const g=fixture();g.args.persist=()=>{commits++;return true};g.args.store=async()=>{throw Error('injected file quota')};
 await assert.rejects(writeReportFiles(g.args),/quota/);assert.equal(commits,0);
 const h=fixture(),remove=h.args.storage.removeItem;h.args.storage.removeItem=()=>{throw Error('injected journal cleanup')};
 assert.match(await writeReportFiles(h.args),/资料已保存/);assert.equal(h.blobs.get('new'),'synthetic');
 h.args.storage.removeItem=remove;await retryReportWrites(h.args);assert.equal(h.blobs.get('new'),'synthetic');assert.equal(h.values.size,0);
});
