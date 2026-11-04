import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {removeRecord,restoreRecord,reviseRecord,undoRecordCorrection} from '../src/record-history.js';
import {migrateState,profileSnapshot,asNewProfile,validateBackup,switchProfile} from '../src/storage-core.js';
import {pauseSession,resumeSession,sessionElapsed,followPhase} from '../src/follow-clock.js';
import {finishTraining,remainingServings} from '../src/workflows.js';
import {calculate} from '../src/nutrition-core.js';
const food={id:'fixture',revision:'old-version',basisUnit:'g',nutrients:{kcal:100,protein:10,fat:0,carbs:15,fiber:null,sodium:0}};
const meal=id=>({id,title:'测试食品',date:'2026-11-04',meal:'午餐',items:[{foodId:'fixture',grams:100,snapshot:structuredClone(food)}]});
const fresh=()=>migrateState({version:2,profileId:'a',profile:{name:'测试档案'},meals:[meal('m1'),meal('m2')]});
const pack=s=>({format:'youdu-backup',version:2,state:profileSnapshot(s),files:[]});

test('multiple removals and corrections survive backup and profile switching without replacing food versions',()=>{
 const s=fresh();reviseRecord(s,'meals','m1',{items:[{...s.meals[0].items[0],grams:50}]});
 removeRecord(s,'meals','m1');removeRecord(s,'meals','m2');assert.equal(s.meals.length,0);
 const restored=asNewProfile(JSON.parse(JSON.stringify(pack(s))),'b',()=> 'report-id').state;
 assert.equal(restored.deletedRecords.length,2);assert.equal(restored.deletedRecords[0].record.ownerId,'b');
 restoreRecord(restored,'meals','m1');assert.equal(calculate(restored.meals[0].items).kcal,50);
 undoRecordCorrection(restored,'meals','m1');assert.equal(calculate(restored.meals[0].items).kcal,100);assert.equal(restored.meals[0].items[0].snapshot.revision,'old-version');
 restoreRecord(restored,'meals','m2');restoreRecord(restored,'meals','m2');assert.equal(restored.meals.length,2);
 s.otherProfiles={b:restored};const switched=switchProfile(s,'b');assert.equal(switched.otherProfiles.a.meals.length,0);assert.equal(switched.meals.length,2);
});

test('recovery refuses portion/date conflicts and deletion updates linked training progress',()=>{
 const s=fresh();s.batches=[{id:'b',date:'2026-11-04',servings:1,items:meal('x').items}];Object.assign(s.meals[0],{batchId:'b',batchPortions:1});
 removeRecord(s,'meals','m1');assert.equal(remainingServings(s,'b'),1);Object.assign(s.meals[0],{batchId:'b',batchPortions:1});
 const before=structuredClone(s);assert.throws(()=>restoreRecord(s,'meals','m1'));assert.deepEqual(s,before);
 s.weights=[{id:'w',date:'2026-11-04',value:70},{id:'w2',date:'2026-11-03',value:71}];assert.throws(()=>reviseRecord(s,'weights','w',{date:'2026-11-03'}));assert.equal(s.weights[0].value,70);
 s.plans=[{id:'p',done:true}];s.workouts=[{id:'run',planId:'p',date:'2026-11-04',duration:2,sets:1,prescription:[{exerciseId:'march',sets:2,reps:5}]}];
 removeRecord(s,'workouts','run');assert.equal(s.plans[0].done,false);assert.equal(s.plans[0].progress,'pending');restoreRecord(s,'workouts','run');assert.equal(s.plans[0].progress,'partial');
});

test('session and follow clock pause together, reload unchanged, save only actual sets and exclude paused time',()=>{
 let s=fresh();s.activeWorkout={id:'run',startedAt:1000,prescription:[{exerciseId:'march',sets:2,reps:5}],checked:['march-0'],follow:{startedAt:1000,work:30,rest:20,pausedMs:0,queue:[{exerciseId:'march',key:'march-1'}]}};
 pauseSession(s.activeWorkout,11000);s=JSON.parse(JSON.stringify(s));pauseSession(s.activeWorkout,20000);
 assert.equal(sessionElapsed(s.activeWorkout,999999),10000);assert.equal(followPhase(s.activeWorkout.follow,999999).remaining,25);
 resumeSession(s.activeWorkout,61000);assert.equal(sessionElapsed(s.activeWorkout,71000),20000);assert.equal(followPhase(s.activeWorkout.follow,71000).remaining,15);
 pauseSession(s.activeWorkout,71000);finishTraining(s,'2026-11-04');assert.equal(s.workouts[0].duration,1);assert.equal(s.workouts[0].sets,1);assert.equal(s.activeWorkout,null);
});

test('invalid backup dates, units, source fields and training states are refused without changing source',()=>{
 const s=fresh();for(const mutate of [p=>p.state.meals[0].date='2026-02-30',p=>p.state.meals[0].items[0].snapshot.basisUnit='ml',p=>p.state.meals[0].items[0].snapshot.fields={kcal:{value:999}},p=>p.state.activeWorkout={id:'run',startedAt:1000,prescription:[{exerciseId:'march',sets:2,reps:5}],checked:['march-9']},p=>p.state.deletedRecords=[{kind:'meals',record:meal('m1')}],p=>{p.state.reports=[{id:'r'}];p.files=[{id:'r',type:'image/png',base64:'A'}]}]){
  const p=pack(s);mutate(p);const before=structuredClone(p);assert.throws(()=>validateBackup(p));assert.deepEqual(p,before);
 }assert.equal(s.meals.length,2);assert.equal(s.meals[0].items[0].snapshot.nutrients.kcal,100);
});

test('all catalog nutrition fields match pinned raw source rows, food identities and units',()=>{
 const foods=JSON.parse(fs.readFileSync(new URL('../src/foods.json',import.meta.url),'utf8'));
 const e=JSON.parse(fs.readFileSync(new URL('../public/data/food-evidence.json',import.meta.url),'utf8'));
 const rows=new Map(e.nutrientRows.map(r=>[r.id,r])),defs=new Map(e.nutrientDefinitions.map(d=>[d.id,d]));let count=0;
 assert.equal(foods.length,80);assert.equal(e.sha256,'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0');
 for(const f of foods){assert.equal(f.basisUnit,'g');assert.equal(f.originalName,e.foodRows.find(r=>r.fdc_id===f.fdcId).description);for(const [k,v] of Object.entries(f.fields)){const row=rows.get(v.sourceRowId);assert.equal(row.fdc_id,f.fdcId);assert.equal(row.nutrient_id,v.nutrientId);assert.equal(Number(row.amount),v.value);assert.equal(f.nutrients[k],v.value);assert.equal(defs.get(v.nutrientId).unit_name,v.unit);assert.equal(v.sourceId,e.id);count++;}}
 assert.equal(count,480);
});
