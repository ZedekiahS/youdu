import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingFor,planTraining,proposeAdjustment,applyAdjustment,restoreAdjustment,beginTraining,finishTraining,remainingServings,portionItems} from '../src/workflows.js';
const fresh=()=>({settings:{ai:true,autoAdjust:true},profile:{constraints:''},plans:[{id:'p',templateId:'home-basic',minutes:20,title:'示例训练'}],changes:[],workouts:[],activeWorkout:null,meals:[],batches:[]});

test('discomfort pause persists across subsequent requests until explicitly released',()=>{
  const s=fresh();proposeAdjustment(s,{id:'pause',planId:'p',minutes:10,pauseReason:'暂停演示'});
  proposeAdjustment(s,{id:'still',planId:'p',minutes:10});
  assert.equal(s.changes[1].status,'paused');assert.equal(s.plans[0].minutes,20);
  delete s.settings.adjustmentHold;proposeAdjustment(s,{id:'resume',planId:'p',minutes:10});
  assert.equal(s.changes[2].status,'applied');assert.equal(s.plans[0].minutes,10);
});
test('specific-plan context does not authorize adjustment of another date',()=>{
  const s=fresh();s.plans[0].date='2026-11-03';
  proposeAdjustment(s,{id:'future',planId:'p',minutes:10,date:'2026-11-02'});
  assert.equal(s.changes[0].status,'paused');assert.equal(s.plans[0].minutes,20);
});

test('automatic adjustment changes the execution prescription and only its associated plan',()=>{
  const s=fresh();s.plans.push({id:'other',templateId:'home-basic',minutes:20});
  proposeAdjustment(s,{id:'c',planId:'p',minutes:10,reason:'时间有限'});
  assert.equal(s.changes[0].status,'applied');assert.equal(s.plans[1].minutes,20);
  beginTraining(s,s.plans[0],'session');assert.equal(s.activeWorkout.targetMinutes,10);
  assert.equal(s.activeWorkout.prescription.reduce((n,m)=>n+m.sets,0),2);
  s.activeWorkout.checked=['chair-0','wall-0'];finishTraining(s,'2026-11-02');
  assert.equal(s.plans[0].done,true);assert.equal(s.plans[1].done,undefined);
  assert.deepEqual(s.workouts[0].completedSets.map(x=>x.exerciseId),['chair','wall']);
  const original=structuredClone(s.workouts);restoreAdjustment(s,'c');
  assert.equal(s.plans[0].minutes,20);assert.deepEqual(s.workouts,original);assert.equal(s.plans[0].done,true);
});
test('outside-range request waits; disabling AI before confirmation prevents mutation',()=>{
  const s=fresh();proposeAdjustment(s,{id:'c',planId:'p',minutes:30,reason:'延长'});
  assert.equal(s.changes[0].status,'pending');assert.equal(s.plans[0].minutes,20);
  s.settings.ai=false;assert.equal(applyAdjustment(s,'c'),false);assert.equal(s.plans[0].minutes,20);assert.equal(s.changes[0].status,'paused');
});
test('stale approval cannot overwrite a newer automatic adjustment',()=>{
  const s=fresh();proposeAdjustment(s,{id:'long',planId:'p',minutes:30,reason:'延长'});
  proposeAdjustment(s,{id:'short',planId:'p',minutes:10,reason:'缩短'});
  assert.equal(applyAdjustment(s,'long'),false);assert.equal(s.plans[0].minutes,10);
});
test('active session, existing execution and constraints pause changes',()=>{
  for(const scenario of ['active','record','constraint']){
    const s=fresh();if(scenario==='active')beginTraining(s,s.plans[0],'started');
    if(scenario==='record')s.workouts.push({id:'w',planId:'p'});
    if(scenario==='constraint')s.profile.constraints='已有运动限制';
    const before=structuredClone(s.plans);proposeAdjustment(s,{id:'c',planId:'p',minutes:10,reason:'缩短'});
    assert.equal(s.changes[0].status,'paused');assert.deepEqual(s.plans,before);
  }
});
test('confirmed longer plan reaches execution and partial completion stays partial',()=>{
  const s=fresh();proposeAdjustment(s,{id:'c',planId:'p',minutes:30,reason:'延长'});applyAdjustment(s,'c');
  beginTraining(s,s.plans[0],'session');assert.equal(s.activeWorkout.prescription.reduce((n,m)=>n+m.sets,0),9);
  s.activeWorkout.checked=['chair-0'];finishTraining(s,'2026-11-02');
  assert.equal(s.plans[0].progress,'partial');assert.equal(s.plans[0].done,false);
});
test('saving preparation does not create intake; portion accounting survives corrections and uses frozen ingredients',()=>{
  const s=fresh();const batch={id:'b',servings:3,items:[{foodId:'egg',grams:300,snapshot:{name:'鸡蛋',nutrients:{kcal:143}}}]};
  s.batches.push(structuredClone(batch));assert.equal(s.meals.length,0);assert.equal(remainingServings(s,'b'),3);
  s.meals.push({id:'m',batchId:'b',batchPortions:0.5,items:portionItems(s.batches[0],0.5)});
  assert.equal(s.meals[0].items[0].grams,50);assert.equal(remainingServings(s,'b'),2.5);
  assert.equal(remainingServings(s,'b','m'),3);
  batch.items[0].grams=900;assert.equal(s.batches[0].items[0].grams,300);
  assert.equal(s.meals[0].items[0].snapshot.nutrients.kcal,143);
});
