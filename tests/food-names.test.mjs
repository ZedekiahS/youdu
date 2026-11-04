import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {nameFor,expandFood,searchCatalog} from '../src/catalog-core.js';
import {calculate} from '../src/nutrition-core.js';
const read=path=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url)));
const names=read('public/data/sr-legacy/names-zh.json'),rows=read('public/data/sr-legacy/index.json'),manifest=read('public/data/sr-legacy/manifest.json');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
test('Chinese name coverage is bound to exact source identity and cannot change food facts or historical snapshots',()=>{
 assert.equal(names.count,rows.length);assert.equal(Object.keys(names.entries).length,rows.length);
 assert.equal(names.sourceIndexSha256,hash('public/data/sr-legacy/index.json'));
 assert.equal(names.glossarySha256,hash('scripts/food-name-terms.tsv'));
 const raw={};for(const shard of Object.keys(manifest.shards))Object.assign(raw,read('public/data/sr-legacy/'+shard+'.json'));
 for(const row of rows){const entry=nameFor(row,names);assert.match(entry.name,/[\u3400-\u9fff]/);assert.equal(entry.originalName,row[1]);
  const original=expandFood(row,raw[row[0]],manifest),before=structuredClone(original),translated=expandFood(row,raw[row[0]],manifest,entry);
  assert.equal(translated.originalName,original.originalName);assert.equal(translated.fdcId,original.fdcId);assert.equal(translated.revision,original.revision);assert.equal(translated.sourceUrl,original.sourceUrl);
  assert.deepEqual(translated.fields,original.fields);assert.deepEqual(translated.nutrients,original.nutrients);assert.deepEqual(calculate([{snapshot:translated,grams:75}]),calculate([{snapshot:original,grams:75}]));assert.deepEqual(original,before);
  if(entry.unresolved.length){assert.equal(entry.status,'needs-review');for(const term of entry.unresolved)assert.ok(entry.notes.some(n=>n.includes(term)));}
 }
 for(const food of read('src/foods.json')){assert.equal(names.entries[food.fdcId].name,food.name);assert.equal(names.entries[food.fdcId].status,'curated');}
 assert.throws(()=>nameFor([rows[0][0],'different food'],names),/不匹配/);assert.throws(()=>nameFor(['unknown','x'],names),/不匹配/);
});
test('ambiguous meanings keep distinctions, uncertainty and original English searchable',()=>{
 const named=id=>names.entries[id];
 assert.match(named('172189').name,/鸭蛋/);assert.doesNotMatch(named('172189').name,/鸡蛋|鸭肉/);
 assert.match(named('171279').name,/人乳/);assert.doesNotMatch(named('171279').name,/牛奶/);
 assert.match(named('171278').name,/山羊乳/);assert.doesNotMatch(named('171278').name,/山羊肉|牛奶/);
 assert.match(named('172197').name,/山羊乳/);assert.doesNotMatch(named('172197').name,/山羊肉/);
 assert.match(named('172033').name,/英式麦芬面包/);assert.doesNotMatch(named('172033').name,/麦芬蛋糕/);
 assert.match(named('167514').name,/Shake N Bake Original Recipe/);assert.doesNotMatch(named('167514').name,/奶昔/);
 assert.match(named('167671').name,/盘装/);assert.doesNotMatch(named('167671').name,/胸腹部/);
 assert.match(named('175138').name,/粉鲑/);assert.doesNotMatch(named('175138').name,/粉红色/);
 assert.match(named('172474').name,/水解植物蛋白/);assert.doesNotMatch(named('172474').name,/蔬菜蛋白/);assert.ok(named('172474').notes.some(n=>n.includes('酿造酱油')));
 assert.ok(named('174278').notes.some(n=>/不直接等同.*生抽/.test(n)));assert.equal(named('167782').status,'needs-review');assert.ok(named('167782').name.includes('Abiyuch'));
 const beef=rows.find(r=>r[1].includes('Beef,')&&r[1].includes('sirloin')&&r[1].includes('raw'));
 const b=named(beef[0]);assert.match(b.name,/生/);assert.ok(b.notes.some(n=>/分割|西冷/.test(n)));assert.ok(!b.name.includes('已烤熟'));
 const entries=rows.map(r=>({fdcId:r[0],name:named(r[0]).name,originalName:r[1],category:manifest.groups[r[2]].name}));
 assert.ok(searchCatalog(entries,'酱油').some(f=>f.fdcId==='174278'));assert.equal(searchCatalog(entries,'174278')[0].fdcId,'174278');assert.ok(searchCatalog(entries,'tamari').some(f=>f.fdcId==='174278'));
});

test('food filters combine category and search, keep calorie boundaries exclusive, and never treat missing energy as zero',()=>{
 const entries=[0,100,101,300,301,null].map((kcal,i)=>({fdcId:String(i),name:'苹果',originalName:'apple',category:'水果',kcal}));
 entries.push({fdcId:'other',name:'苹果',originalName:'apple',category:'甜食',kcal:80});
 const ids=range=>searchCatalog(entries,'苹果','水果',range).map(f=>f.fdcId);
 assert.deepEqual(ids('0-100'),['0','1']);assert.deepEqual(ids('100-300'),['2','3']);assert.deepEqual(ids('300+'),['4']);assert.equal(ids('all').length,6);
 assert.equal(searchCatalog(entries,'不存在','水果','all').length,0);
});
