import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,contributions,mealFingerprint} from '../src/nutrition-core.js';
import {migrateState,profileSnapshot,switchProfile,asNewProfile,validateBackup} from '../src/storage-core.js';
import {followPhase} from '../src/follow-clock.js';
import {proposeAdjustment} from '../src/workflows.js';
const food={id:'fixture',revision:'test-r1',basisUnit:'g',nutrients:{kcal:100,protein:10,fat:0,carbs:15,fiber:null,sodium:0}};
const meal={id:'meal-test',date:'2026-11-03',meal:'早餐',items:[{foodId:food.id,grams:150,snapshot:structuredClone(food)}]};
test('one nutrition calculation powers edited totals and provenance; absent fields and old versions remain intact',()=>{
 const meals=[structuredClone(meal)],before=mealFingerprint(meals),lookup={fixture:{...food,revision:'test-r2',nutrients:{...food.nutrients,protein:99}}};
 assert.equal(calculate(meals.flatMap(m=>m.items),lookup).protein,15);
 assert.equal(calculate(meals[0].items).fiber,null);assert.equal(calculate(meals[0].items).sodium,0);
 meals[0].items[0].grams=75;
 assert.equal(calculate(meals.flatMap(m=>m.items),lookup).protein,7.5);
 const trace=contributions(meals,'protein',lookup)[0];assert.equal(trace.value,7.5);assert.equal(trace.revision,'test-r1');assert.equal(trace.mealId,'meal-test');assert.notEqual(mealFingerprint(meals),before);
 assert.throws(()=>calculate([{foodId:'missing',grams:1}]));assert.throws(()=>calculate([{snapshot:{...food,basisUnit:'ml'},grams:100}]));
});
test('follow-along advances, freezes on pause, resumes and ends without inventing completed sets',()=>{
 const run={startedAt:1000,work:5,rest:5,queue:[{exerciseId:'march'},{exerciseId:'calf'}],pausedMs:0};
 assert.equal(followPhase(run,1000).kind,'ready');assert.equal(followPhase(run,6000).kind,'work');assert.equal(followPhase(run,11000).kind,'rest');assert.equal(followPhase(run,16000).index,1);
 const paused={...run,pausedAt:8000};assert.deepEqual(followPhase(paused,99000),{kind:'work',remaining:3,index:0});
 const resumed={...run,pausedMs:9000};assert.deepEqual(followPhase(resumed,17000),{kind:'work',remaining:3,index:0});
 assert.equal(followPhase(run,21000).kind,'done');assert.equal('checked' in run,false);
});
test('migration and backup round trip retain snapshots, draft and report links without overwriting other profiles',()=>{
 const old={version:1,profile:{name:'测试档案'},meals:[structuredClone(meal)],reports:[{id:'report-test',name:'测试.png'}],indicators:[{id:'indicator-test',reportId:'report-test'}],chats:{draft:'未发送的测试草稿'}};
 const s=migrateState(old,'test-a');assert.equal(old.version,1);assert.equal(s.version,2);
 const pack={format:'youdu-backup',version:2,state:profileSnapshot(s),files:[{id:'report-test',type:'image/png',base64:'dGVzdA=='}]};
 const restored=asNewProfile(JSON.parse(JSON.stringify(pack)),'test-b',()=> 'restored-report');assert.equal(restored.state.meals[0].items[0].grams,150);assert.equal(restored.state.meals[0].items[0].snapshot.revision,'test-r1');assert.equal(restored.state.chats.draft,old.chats.draft);assert.equal(restored.state.indicators[0].reportId,'restored-report');assert.equal(restored.files[0].id,'restored-report');assert.equal(restored.files[0].base64,pack.files[0].base64);
 s.otherProfiles={'test-b':restored.state};const switched=switchProfile(s,'test-b');assert.equal(switched.otherProfiles['test-a'].reports[0].id,'report-test');assert.equal(s.profileId,'test-a');
 assert.throws(()=>validateBackup({...pack,version:999}));assert.throws(()=>validateBackup({...pack,state:{...s,meals:[{...meal,items:[{grams:-1}]}]}}));assert.equal(s.meals[0].items[0].grams,150);
});
test('personal records do not activate fixed demonstration adjustments',()=>{
 const s={demo:false,profile:{},settings:{ai:true,autoAdjust:true},plans:[{id:'p',templateId:'home-basic',minutes:20}],workouts:[],changes:[]};
 const change=proposeAdjustment(s,{id:'c',planId:'p',minutes:10,reason:'仅记录早餐'});assert.equal(change.status,'paused');assert.equal(s.plans[0].minutes,20);
});
