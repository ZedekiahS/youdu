import test from 'node:test';
import assert from 'node:assert/strict';
import {cookingProgress,finishCooking,shoppingItems,checkShopping,checkIngredient,resetPreparationChecks} from '../src/preparation-state.js';
import {sessionElapsed,pauseSession,resumeSession,restSeconds} from '../src/follow-clock.js';
import {migrateState,profileSnapshot,switchProfile,backupSnapshot,asNewProfile,validateBackup} from '../src/storage-core.js';
const fresh=id=>migrateState({version:2,profileId:id,profile:{name:id},meals:[]});
const recipes={a:{servings:2,ingredients:[{foodId:'egg',grams:200}]},b:{servings:1,ingredients:[{foodId:'egg',grams:50},{foodId:'rice',grams:100}]}};
const pack=s=>({format:'youdu-backup',version:2,state:backupSnapshot(s),files:[]});

test('cooking step and elapsed time survive reload and profile switching; finishing creates one preparation, no intake',()=>{
 let s=fresh('a');s.cookingDrafts.a=cookingProgress(s,'a','batch',1000);
 resumeSession(s.cookingDrafts.a,2000);s.cookingDrafts.a.step=2;
 s=migrateState(JSON.parse(JSON.stringify(s)));assert.equal(sessionElapsed(s.cookingDrafts.a,7000),5000);
 s.otherProfiles.b=profileSnapshot(fresh('b'));s=switchProfile(s,'b');assert.deepEqual(s.cookingDrafts,{});
 s=switchProfile(s,'a');assert.equal(s.cookingDrafts.a.step,2);assert.equal(sessionElapsed(s.cookingDrafts.a,9000),7000);
 pauseSession(s.cookingDrafts.a,9000);resumeSession(s.cookingDrafts.a,11000);assert.equal(sessionElapsed(s.cookingDrafts.a,13000),9000);
 const batch={id:'batch',date:'2026-11-15',servings:2,items:[{foodId:'egg',grams:200,snapshot:{id:'egg',nutrients:{kcal:143}}}]};
 finishCooking(s,'a',batch);finishCooking(s,'a',structuredClone(batch));assert.equal(s.batches.length,1);assert.equal(s.cookingDrafts.a,undefined);assert.equal(s.meals.length,0);
 assert.deepEqual(s.batches[0].items,batch.items);
});

test('shopping checks persist by profile and quantity; edited quantities require a new check',()=>{
 let s=fresh('a');s.shopping=['a','b'];s.recipeDrafts={a:{servings:4,ingredients:recipes.a.ingredients}};
 assert.deepEqual(shoppingItems(s,recipes),[{foodId:'egg',grams:450},{foodId:'rice',grams:100}]);checkShopping(s,'egg',true,recipes);
 s=migrateState(JSON.parse(JSON.stringify(s)));assert.equal(s.shoppingChecked.egg,450);
 s.otherProfiles.b=profileSnapshot(fresh('b'));s=switchProfile(s,'b');assert.deepEqual(s.shoppingChecked,{});
 s=switchProfile(s,'a');assert.equal(s.shoppingChecked.egg,450);
 s.recipeDrafts.a.servings=2;assert.notEqual(s.shoppingChecked.egg,shoppingItems(s,recipes)[0].grams);
 checkShopping(s,'egg',true,recipes);assert.equal(s.shoppingChecked.egg,250);checkShopping(s,'egg',false,recipes);assert.equal(s.shoppingChecked.egg,undefined);
 assert.throws(()=>checkShopping(s,'unknown',true,recipes));
});

test('backup freezes cooking timer, restores a separate draft, and rejects malformed preparation data without changing source',()=>{
 const s=fresh('a');s.cookingDrafts.a=cookingProgress(s,'a','batch',Date.now()-2000);resumeSession(s.cookingDrafts.a,Date.now()-1000);
 s.shopping=['a'];checkShopping(s,'egg',true,recipes);const before=structuredClone(s),backup=pack(s);
 assert.equal(s.cookingDrafts.a.pausedAt,undefined);assert.ok(backup.state.cookingDrafts.a.pausedAt);
 const restored=asNewProfile(backup,'b',()=> 'restored-batch').state;
 assert.equal(restored.cookingDrafts.a.id,'restored-batch');assert.equal(restored.shoppingChecked.egg,200);
 assert.equal(sessionElapsed(restored.cookingDrafts.a,Date.now()+60000),sessionElapsed(backup.state.cookingDrafts.a));
 for(const corrupt of [b=>b.state.cookingDrafts.a.step=-1,b=>b.state.cookingDrafts.a.startedAt='bad',b=>b.state.shoppingChecked.egg=-1]){const bad=structuredClone(backup);corrupt(bad);assert.throws(()=>validateBackup(bad));}
 assert.deepEqual(s,before);
 const legacy=pack(fresh('old'));delete legacy.state.cookingDrafts;delete legacy.state.shoppingChecked;
 assert.deepEqual(validateBackup(legacy).state.cookingDrafts,{});
});

import {toggleTrainingSet} from '../src/workflows.js';
test('ingredient checks survive reload, backup and profile switch; recipe changes and finished cooking reset only that recipe',()=>{
 let s=fresh('a');checkIngredient(s,'a','egg',200,true);checkIngredient(s,'b','egg',50,true);
 s=migrateState(JSON.parse(JSON.stringify(s)));assert.equal(s.ingredientChecks.a.egg,200);
 s.otherProfiles.b=profileSnapshot(fresh('b'));s=switchProfile(s,'b');assert.deepEqual(s.ingredientChecks,{});s=switchProfile(s,'a');
 const restored=asNewProfile(pack(s),'new',()=> 'new-id').state;assert.equal(restored.ingredientChecks.a.egg,200);
 resetPreparationChecks(s,'a');assert.equal(s.ingredientChecks.a,undefined);assert.equal(s.ingredientChecks.b.egg,50);
 checkIngredient(s,'a','egg',300,true);checkIngredient(s,'a','egg',300,false);assert.equal(s.ingredientChecks.a.egg,undefined);
 checkIngredient(s,'a','egg',300,true);finishCooking(s,'a',{id:'batch'});assert.equal(s.ingredientChecks.a,undefined);assert.equal(s.ingredientChecks.b.egg,50);
 const bad=pack(fresh('bad'));bad.state.ingredientChecks={a:{egg:-1}};assert.throws(()=>validateBackup(bad));
});

test('manual rest survives refresh, pause, profile switch and backup without counting offline time or creating completion',()=>{
 let s=fresh('a');s.activeWorkout={id:'w',startedAt:1000,pausedMs:0,checked:[],prescription:[{exerciseId:'chair',sets:2,reps:5}]};
 toggleTrainingSet(s.activeWorkout,'chair-0',6000);assert.equal(restSeconds(s.activeWorkout,6000),45);assert.equal(restSeconds(s.activeWorkout,16000),35);
 pauseSession(s.activeWorkout,16000);s=migrateState(JSON.parse(JSON.stringify(s)));assert.equal(restSeconds(s.activeWorkout,76000),35);
 s.otherProfiles.b=profileSnapshot(fresh('b'));s=switchProfile(s,'b');assert.equal(s.activeWorkout,undefined);s=switchProfile(s,'a');
 const restored=asNewProfile(pack(s),'new',()=> 'new-id').state;assert.equal(restSeconds(restored.activeWorkout,76000),35);
 resumeSession(s.activeWorkout,76000);assert.equal(restSeconds(s.activeWorkout,81000),30);assert.equal(restSeconds(s.activeWorkout,111000),0);assert.deepEqual(s.activeWorkout.checked,['chair-0']);assert.equal(s.workouts.length,0);
 toggleTrainingSet(s.activeWorkout,'chair-0',112000);assert.equal(restSeconds(s.activeWorkout,112000),0);assert.deepEqual(s.activeWorkout.checked,[]);
 toggleTrainingSet(s.activeWorkout,'chair-1',113000);assert.equal(restSeconds(s.activeWorkout,113000),45);
 const bad=pack(s);bad.state.activeWorkout.manualRest.key='chair-0';assert.throws(()=>validateBackup(bad));
});
