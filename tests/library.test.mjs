import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {expandFood,searchCatalog} from '../src/catalog-core.js';
import {calculate} from '../src/nutrition-core.js';
import {resolvePending,pendingInRange} from '../src/pending-food.js';
import {migrateState,profileSnapshot,asNewProfile} from '../src/storage-core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url)));
const manifest=read('public/data/sr-legacy/manifest.json'),rows=read('public/data/sr-legacy/index.json');
test('full library preserves source row identities, missing values and archive integrity; recipes use known ingredients',()=>{
 const sha=path=>crypto.createHash('sha256').update(fs.readFileSync(new URL('../public/data/sr-legacy/'+path,import.meta.url))).digest('hex');
 assert.equal(rows.length,7793);assert.equal(new Set(rows.map(r=>r[0])).size,7793);assert.equal(sha('index.json'),manifest.indexSha256);
 const all={};for(const [id,hash] of Object.entries(manifest.shards)){assert.equal(sha(id+'.json'),hash);Object.assign(all,read('public/data/sr-legacy/'+id+'.json'));}
 let available=0,missing=0;
 for(const row of rows){const raw=all[row[0]],f=expandFood(row,raw,manifest);assert.equal(f.originalName,row[1]);
  for(const [nid,key] of Object.entries(manifest.keys)){const source=raw.find(r=>r.nutrient_id===nid),value=source?.amount?Number(source.amount):null;
   assert.equal(f.nutrients[key],value);assert.equal(f.fields[key].sourceRowId,source?.id||null);
   if(value===null){missing++;assert.equal(calculate([{grams:100,snapshot:f}])[key],null);}else{available++;assert.equal(f.fields[key].unit,manifest.definitions[nid].unit_name);}
   if(source&&['2','5'].includes(manifest.derivations[source.derivation_id]?.source_id))assert.equal(f.fields[key].status,'estimated');
  }
 }
 assert.equal(available,46112);assert.equal(missing,646);
 const curated=read('src/foods.json'),lookup=Object.fromEntries(curated.map(f=>[f.id,f]));
 for(const f of curated){assert.deepEqual(expandFood(rows.find(r=>r[0]===f.fdcId),all[f.fdcId],manifest).nutrients,f.nutrients);}
 for(const r of read('src/recipes-extra.json')){assert.ok(calculate(r.ingredients,lookup).kcal>0);assert.ok(r.note.includes('自编'));}
 assert.equal(searchCatalog([{name:'Soy sauce',originalName:'Soy sauce',category:'调料',fdcId:'1'}],'酱油').length,1);
});
test('pending intake survives backup without invented nutrition and resolves exactly once with its original evidence',()=>{
 const s=migrateState({version:2,profileId:'a',profile:{name:'资料库测试'},meals:[],pendingMeals:[{id:'p',title:'待核对测试食品',amountText:'一碗',note:'包装原文',date:'2026-11-04',meal:'午餐'}]});
 const restored=asNewProfile({format:'youdu-backup',version:2,state:profileSnapshot(s),files:[]},'b',()=> 'new-id').state;
 assert.equal(pendingInRange(restored,'2026-11-04').length,1);assert.equal(restored.meals.length,0);assert.equal(restored.pendingMeals[0].nutrients,undefined);
 const row=rows.find(r=>r[0]==='174263')||rows[0],raw=read('public/data/sr-legacy/'+Math.floor(Number(row[0])/1000)+'.json')[row[0]],food=expandFood(row,raw,manifest);
 const meal={id:'m',date:'2026-11-04',meal:'午餐',title:food.name,items:[{foodId:food.id,grams:50,snapshot:food}]};
 resolvePending(restored,'p',meal);assert.equal(restored.pendingMeals.length,0);assert.equal(restored.meals[0].pendingOriginal.note,'包装原文');assert.throws(()=>resolvePending(restored,'p',structuredClone(meal)));
 const again=asNewProfile({format:'youdu-backup',version:2,state:profileSnapshot(restored),files:[]},'c',()=> 'new-id').state;
 assert.deepEqual(again.meals[0].items[0].snapshot,food);assert.equal(again.meals[0].pendingOriginal.title,'待核对测试食品');assert.equal(again.meals.length,1);
});
