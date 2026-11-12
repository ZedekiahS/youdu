import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {expandTfdaFood,tfdaEnglishFor} from '../src/tfda-core.js';
import {searchCatalog,assistantFoodMatches} from '../src/catalog-core.js';
import {calculate} from '../src/nutrition-core.js';
import {migrateState,profileSnapshot,asNewProfile} from '../src/storage-core.js';
const base=new URL('../public/data/tfda/',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,base)));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(new URL(p,base))).digest('hex');
const manifest=read('manifest.json'),entries=read('index.json'),raw={};
for(const shard of Object.keys(manifest.shards))Object.assign(raw,read(shard+'.json'));
const food=code=>expandTfdaFood(entries.find(e=>e.sourceCode===code),raw[code],manifest);

test('93 qualifier reviews apply only to bound source identities and keep unresolved names and source conflicts explicit',()=>{
 const review=JSON.parse(fs.readFileSync(new URL('../scripts/tfda-english-review-2026-11-13.json',import.meta.url))),names=read('names-en.json');
 assert.equal(Object.keys(review.entries).length,93);
 let mapped=0,retained=0;
 for(const [id,r] of Object.entries(review.entries)){
  const n=names.entries[id];assert.equal(r.originalName,n.originalName);assert.equal(r.originalEnglishName,n.originalEnglishName);assert.equal(r.originalDescription,n.originalDescription);
  for(const q of r.mappings)assert.ok(n.qualifiers.some(t=>t.zh===q.zh&&t.en===q.en),id+' '+q.zh);
  assert.deepEqual(n.unresolved,r.retained,id);
  if(r.retained.length){retained++;assert.equal(n.status,'needs-review');for(const token of r.retained)assert.ok(n.name.includes(token));for(const note of r.notes)assert.ok(n.notes.includes(note));}
  else mapped++;
 }
 assert.equal(mapped,55);assert.equal(retained,38);
 assert.equal(names.counts.unresolvedQualifierEntries,38);
 assert.match(names.entries.A0500401.identityWarning,/品种/);
 assert.ok(names.entries.A0500401.notes.some(n=>n.includes('冲突')));
 assert.match(names.entries.A0501103.name,/台稉71號/);assert.doesNotMatch(names.entries.A0501103.name,/Tainung 71/);
 assert.ok(names.entries.L0217301.qualifiers.some(q=>q.en==='calcium and vitamins C and E fortified'));
 assert.ok(names.entries.J0600701.unresolved.includes('旗魚'));
});

test('English supplements retain exact source names and all nutrition, reject mismatched bindings and distinguish missing English from draft translations',()=>{
 const names=read('names-en.json');assert.equal(names.count,2213);assert.equal(names.sourceIndexSha256,manifest.indexSha256);
 let sourceEnglish=0,supplements=0;
 for(const entry of entries){
  const en=tfdaEnglishFor(entry,names),r=raw[entry.sourceCode][0].data;
  assert.equal(en.originalName,r['樣品名稱']);assert.equal(en.originalEnglishName,r['樣品英文名稱']);assert.equal(en.originalDescription,r['內容物描述']||'');
  assert.ok(en.name.trim());assert.match(en.name,/[a-zA-Z]/);assert.ok(['draft','needs-review'].includes(en.status));
  if((r['樣品英文名稱']||'').trim()){sourceEnglish++;assert.equal(en.origin,'source-with-project-qualifiers');assert.ok(en.name.startsWith(r['樣品英文名稱']));}
  else{supplements++;assert.equal(en.origin,'project-supplement');assert.ok(en.originalEnglishName==null||en.originalEnglishName.trim()==='');}
  for(const unresolved of en.unresolved){assert.ok(en.name.includes(unresolved));assert.equal(en.status,'needs-review');}
  const before=food(entry.sourceCode),after=expandTfdaFood(entry,raw[entry.sourceCode],manifest,en);
  assert.deepEqual(after.nutrients,before.nutrients);assert.deepEqual(after.fields,before.fields);assert.equal(after.revision,before.revision);assert.equal(after.originalName,before.originalName);
  const stored=structuredClone(after);en.name='future edited translation';assert.notEqual(stored.englishTranslation.name,en.name);
 }
 assert.equal(sourceEnglish,1772);assert.equal(supplements,441);
 const entry=entries.find(e=>e.sourceCode==='H1150201'),en=tfdaEnglishFor(entry,names);
 assert.throws(()=>tfdaEnglishFor({...entry,originalName:'different'},names),/身份/);
 assert.throws(()=>expandTfdaFood(entry,raw[entry.sourceCode],manifest,{...en,originalEnglishName:'invented official English'}),/原始资料/);
 const q=id=>names.entries[id];
 assert.match(q('H1150201').name,/Soy milk, unsweetened/);
 assert.match(q('I0404403').name,/Chicken leg.*2021.*raw/);assert.doesNotMatch(q('I0404403').name,/fried/i);
 assert.match(q('R4700301').name,/Dark-coloured firm tofu/);assert.doesNotMatch(q('R4700301').name,/black.soybean/i);
 assert.match(q('J0405201').name,/skin removed/);assert.match(q('J0405301').name,/skin on/);
 assert.match(q('E7500202').name,/20205/);assert.ok(q('E7500202').notes.some(n=>n.includes('年份位数异常')));
 assert.equal(q('E9900601').status,'needs-review');assert.match(q('E9900601').name,/龍延草/);assert.doesNotMatch(q('E9900601').name,/tarragon/i);
 assert.ok(q('O0702001').qualifiers.some(q=>q.origin==='samplePreparation'&&q.en==='only the upper clarified liquid analysed'));
 const searchable=entries.map(e=>({...e,aliases:[...e.aliases,tfdaEnglishFor(e,names).name]}));
 assert.ok(searchCatalog(searchable,'soy milk, unsweetened').some(e=>e.sourceCode==='H1150201'));
});

test('TFDA full distribution retains exact six-field evidence, units, zeros and missing values',()=>{
 assert.equal(entries.length,2213);assert.equal(new Set(entries.map(e=>e.id)).size,2213);
 assert.equal(sha('index.json'),manifest.indexSha256);
 for(const [shard,hash] of Object.entries(manifest.shards))assert.equal(sha(shard+'.json'),hash);
 let missing=0;
 for(const entry of entries){const f=food(entry.sourceCode);assert.equal(f.id,'tfda-'+entry.sourceCode);assert.equal(f.fdcId,undefined);
  assert.equal(f.originalName,raw[entry.sourceCode][0].data['樣品名稱']);assert.match(f.name,/[\u3400-\u9fff]/);
  for(const evidence of raw[entry.sourceCode]){const r=evidence.data,definition=manifest.definitions[r['分析項']],key=definition.key;
   const n=r['每100克含量']==null||!r['每100克含量'].trim()?null:Number(r['每100克含量']);
   assert.equal(f.nutrients[key],n);assert.equal(f.fields[key].unit,r['含量單位']);assert.equal(f.fields[key].sourceRowId,evidence.rowNumber);
   if(n===null){missing++;assert.equal(calculate([{snapshot:f,grams:50}])[key],null);}else assert.equal(calculate([{snapshot:f,grams:50}])[key],n/2);
   if(n===0)assert.equal(f.fields[key].status,'reported-zero');
  }
  assert.equal(f.portions,undefined); // Do not generate portions from upstream 0.0 g fields.
 }
 assert.equal(missing,916);assert.equal(manifest.missingFields,916);
});

test('Chinese search preserves regional food identities, dry state, sampling year and literal source ID',()=>{
 assert.ok(searchCatalog(entries,'豆浆').some(e=>e.sourceCode==='R5000101'));
 assert.ok(searchCatalog(entries,'豆漿').some(e=>e.sourceCode==='R5000101'));
 assert.ok(searchCatalog(entries,'酱油').some(e=>e.sourceCode==='P0700201'));
 assert.equal(searchCatalog(entries,'R2000201')[0].sourceCode,'R2000201');
 assert.ok(assistantFoodMatches(entries,'查豆浆').some(e=>e.sourceCode==='R5000101'));
 const dry=food('R2000201');assert.match(dry.name,/乾麵條/);assert.equal(dry.nutrients.kcal,361);assert.match(dry.state,/乾麵條/);
 assert.match(food('R5000101').state,/糖/);assert.match(food('R4700902').name,/2022/);
 const soy=food('P0700201');assert.equal(soy.nutrients.fat,null);assert.equal(soy.nutrients.fiber,null);assert.equal(soy.nutrients.sodium,4774);
 assert.equal(calculate([{snapshot:soy,grams:10}]).sodium,477.4);
 const broken=structuredClone(raw.R2000201);broken[0].data['含量單位']='mg';assert.throws(()=>expandTfdaFood(entries.find(e=>e.sourceCode==='R2000201'),broken,manifest),/单位/);
 const wrong=structuredClone(raw.R2000201);wrong[0].data['整合編號']='R5000101';assert.throws(()=>expandTfdaFood(entries.find(e=>e.sourceCode==='R2000201'),wrong,manifest),/身份/);
});

test('TFDA and USDA snapshots survive backup together without catalog updates changing historical nutrition',()=>{
 const tfda=food('P0700201'),usda=JSON.parse(fs.readFileSync(new URL('../src/foods.json',import.meta.url)))[0];
 const s=migrateState({version:2,profileId:'test-a',profile:{name:'来源回归测试'},meals:[{id:'meal',date:'2026-11-12',meal:'午餐',title:'双来源',items:[{foodId:tfda.id,grams:10,snapshot:structuredClone(tfda)},{foodId:usda.id,grams:100,snapshot:structuredClone(usda)}]}]});
 const before=structuredClone(s.meals[0]),n=calculate(before.items);
 tfda.nutrients.sodium=1;usda.nutrients.kcal=1;
 const restored=asNewProfile({format:'youdu-backup',version:2,state:profileSnapshot(s),files:[]},'test-b',()=> 'new-id').state;
 assert.deepEqual(restored.meals[0].items,before.items);assert.deepEqual(calculate(restored.meals[0].items),n);
 assert.equal(restored.meals[0].items[0].snapshot.nutrients.sodium,4774);
 assert.equal(restored.meals[0].items[0].snapshot.sourceCode,'P0700201');
});
