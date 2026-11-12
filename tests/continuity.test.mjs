import test from 'node:test';
import assert from 'node:assert/strict';
import {reviseRecord,restoreRecord,undoRecordCorrection,removeRecord} from '../src/record-history.js';
import {migrateState} from '../src/storage-core.js';
const day='2026-11-12',old='2026-11-11';
test('meal changes invalidate confirmation on both dates, including undo and recovery',()=>{
 const s=migrateState({version:2,profile:{name:'test'},meals:[{id:'m',date:day,meal:'午餐',items:[]}],completeness:{[day]:'complete',[old]:'complete'}});
 reviseRecord(s,'meals','m',{date:old});assert.notEqual(s.completeness[day],'complete');assert.notEqual(s.completeness[old],'complete');
 s.completeness[day]=s.completeness[old]='complete';undoRecordCorrection(s,'meals','m');assert.notEqual(s.completeness[day],'complete');assert.notEqual(s.completeness[old],'complete');
 removeRecord(s,'meals','m');s.completeness[day]='complete';restoreRecord(s,'meals','m');assert.notEqual(s.completeness[day],'complete');
});
import {refreshToday,TODAY,localDate} from '../src/day-clock.js';
import {beginTraining,finishTraining} from '../src/workflows.js';
import {planStatus,togglePlanDone,togglePlanSkipped} from '../src/plan-state.js';
import {stageReportDeletion,finishReportDeletion} from '../src/report-management.js';
import {profileSnapshot,asNewProfile} from '../src/storage-core.js';
import {addMeal} from '../src/record-history.js';
test('day rollover updates today without moving a started workout; record context is consumed once',()=>{
 const actual=new Date();try{
  refreshToday(new Date(2026,10,11,23,59));assert.equal(TODAY,old);
  const s=migrateState({version:2,profile:{name:'test'},meals:[],recordContext:{date:old,meal:'早餐'}});
  assert.equal(s.recordContext,undefined);beginTraining(s,null,'session');s.activeWorkout.date=old;s.activeWorkout.checked=['chair-0'];
  refreshToday(new Date(2026,10,12,0,1));assert.equal(TODAY,day);assert.equal(s.activeWorkout.date,old);
  finishTraining(s,day);assert.equal(s.workouts[0].date,old);
  s.recordContext={date:old,meal:'早餐'};s.completeness[old]='complete';addMeal(s,{id:'m',date:old,meal:'早餐'});
  assert.equal(s.recordContext,undefined);assert.equal(s.completeness[old],'review');assert.equal(addMeal(s,{id:'m',date:day}),false);assert.equal(s.meals.length,1);
 }finally{refreshToday(actual);assert.equal(TODAY,localDate(actual))}
});
test('plan status distinguishes intake and prevents simultaneous skipped/done',()=>{
 const p={type:'meal',done:false};togglePlanSkipped(p);assert.equal(planStatus(p),'已跳过');assert.throws(()=>togglePlanDone(p));togglePlanSkipped(p);togglePlanDone(p);assert.match(planStatus(p),/摄入请在日记核对/);assert.throws(()=>togglePlanSkipped(p));p.skipped=true;togglePlanSkipped(p);assert.equal(p.done,true);assert.equal(p.skipped,false);
});
test('indicator edits and recovery preserve report references in backups; deletion can resume without orphan histories',()=>{
 const s=migrateState({version:2,profileId:'a',profile:{name:'test'},meals:[],reports:[{id:'r',name:'测试.png'},{id:'r2',name:'另一份.png'}],indicators:[{id:'i',reportId:'r',date:day,name:'测试',value:1,comparator:'=',unit:'mmol/L'}]});
 reviseRecord(s,'indicators','i',{value:2});removeRecord(s,'indicators','i');
 let n=0;const pack={format:'youdu-backup',version:2,state:profileSnapshot(s),files:s.reports.map(r=>({id:r.id,type:'image/png',base64:'dGVzdA=='}))};
 const restored=asNewProfile(pack,'b',()=>`new-${++n}`).state;restoreRecord(restored,'indicators','i');undoRecordCorrection(restored,'indicators','i');assert.equal(restored.indicators[0].value,1);assert.equal(restored.indicators[0].reportId,restored.reports[0].id);
 restoreRecord(s,'indicators','i');reviseRecord(s,'indicators','i',{reportId:'r2'});stageReportDeletion(s,'a','r');
 assert.deepEqual(s.reportDeletions,[{id:'r',name:'测试.png'}]);assert.equal(s.reports.length,1);assert.equal(s.indicators[0].corrections.length,0);
 const resumed=migrateState(JSON.parse(JSON.stringify(s)));assert.equal(resumed.reportDeletions.length,1);finishReportDeletion(resumed,'a','r');assert.equal(resumed.reportDeletions.length,0);
 stageReportDeletion(s,'a','r2');assert.equal(s.indicators.length,0);assert.equal(s.deletedRecords.length,0);
});
import fs from 'node:fs';
import {assistantFoodMatches,nameFor,searchCatalog} from '../src/catalog-core.js';
import {recordFamilyPortion} from '../src/family-batches.js';
import {remainingServings,portionItems} from '../src/workflows.js';
import {backupSnapshot,switchProfile,validateBackup} from '../src/storage-core.js';
test('assistant queries the same full catalog and retains uncertain food identity',()=>{
 const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
 const rows=read('public/data/sr-legacy/index.json'),names=read('public/data/sr-legacy/names-zh.json'),curated=new Set(read('src/foods.json').map(f=>f.fdcId));
 const entries=rows.map(r=>({id:'usda-'+r[0],fdcId:r[0],originalName:r[1],name:nameFor(r,names).name,needsReview:nameFor(r,names).status==='needs-review'}));
 const f=entries.find(f=>!curated.has(f.fdcId)&&f.needsReview);
 assert.ok(f);assert.deepEqual(assistantFoodMatches(entries,'查询 '+f.fdcId),searchCatalog(entries,f.fdcId).slice(0,8));assert.equal(assistantFoodMatches(entries,'查询 '+f.fdcId)[0].needsReview,true);
 assert.deepEqual(assistantFoodMatches(entries,'查询 '+f.name),searchCatalog(entries,f.name).slice(0,8));assert.deepEqual(assistantFoodMatches(entries,'查询 不存在的XYZ食品'),[]);
});
test('one cooking batch shares real frozen portions across profiles, edits, recovery and independent backup',()=>{
 const snapshot={id:'f',revision:'old',basisUnit:'g',nutrients:{kcal:100,protein:10,fat:0,carbs:15,fiber:null,sodium:0}};
 const fresh=id=>migrateState({version:2,profileId:id,profile:{name:id},meals:[],demo:false});
 let s=fresh('a');s.otherProfiles.b=fresh('b');s.otherProfiles.c=fresh('c');
 const batch={id:'batch',date:day,title:'实际制作',servings:4,items:[{foodId:'f',grams:400,snapshot}]};s.batches.push(batch);
 addMeal(s,{id:'self',date:day,meal:'午餐',batchId:'batch',batchPortions:1,items:portionItems(batch,1)});
 const allocate=(member,portion,id)=>recordFamilyPortion(s,{member,portion,id,batchId:'batch',date:day,meal:'午餐'});
 allocate('b',1.5,'b-meal');allocate('c',1,'c-meal');assert.equal(remainingServings(s,'batch'),0.5);assert.equal(s.otherProfiles.b.meals[0].items[0].grams,150);assert.deepEqual(s.otherProfiles.b.meals[0].items[0].snapshot,snapshot);
 const before=structuredClone(s);assert.throws(()=>allocate('b',1,'over'));assert.deepEqual(s,before);assert.equal(allocate('b',1.5,'b-meal'),false);
 s=switchProfile(s,'b');reviseRecord(s,'meals','b-meal',{batchPortions:1,items:portionItems(s.batches[0],1)});assert.equal(remainingServings(s,'batch'),1);undoRecordCorrection(s,'meals','b-meal');assert.equal(remainingServings(s,'batch'),0.5);
 removeRecord(s,'meals','b-meal');assert.equal(remainingServings(s,'batch'),2);restoreRecord(s,'meals','b-meal');assert.equal(remainingServings(s,'batch'),0.5);
 const backup={format:'youdu-backup',version:2,state:backupSnapshot(s),files:[]};assert.equal(backup.state.batches[0].reservedPortions,2);assert.equal(backup.state.otherProfiles,undefined);
 let n=0;const restored=asNewProfile(backup,'restored',()=>`restored-${++n}`).state;assert.notEqual(restored.batches[0].id,'batch');assert.equal(remainingServings(restored,restored.batches[0].id),0.5);assert.equal(restored.meals[0].batchId,restored.batches[0].id);
 s.otherProfiles.restored=restored;assert.equal(remainingServings(s,'batch'),0.5);assert.equal(remainingServings(s,restored.batches[0].id),0.5);
 const invalid=structuredClone(backup);invalid.state.batches[0].reservedPortions=3;assert.throws(()=>validateBackup(invalid));
});

import {resolvePending} from '../src/pending-food.js';
test('resolving a pending meal on another date invalidates both days without losing duplicate conflicts',()=>{
 const s=migrateState({version:2,profileId:'a',profile:{name:'test'},meals:[],pendingMeals:[{id:'pending',date:old,title:'待核对',meal:'午餐'}],completeness:{[old]:'complete',[day]:'complete'}});
 resolvePending(s,'pending',{id:'matched',date:day,meal:'午餐',items:[]});assert.equal(s.completeness[old],'review');assert.equal(s.completeness[day],'review');assert.equal(s.pendingMeals.length,0);
 s.pendingMeals.push({id:'second',date:day});assert.throws(()=>resolvePending(s,'second',{id:'matched',date:day}));assert.equal(s.pendingMeals.length,1);
});
