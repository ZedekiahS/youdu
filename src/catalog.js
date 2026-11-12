import {useEffect,useState} from 'react';
import {foods,foodById} from './model';
import {expandFood,nameFor,nameStatus} from './catalog-core.js';
import {expandTfdaFood,tfdaEnglishFor} from './tfda-core.js';
const curated=new Map(foods.map(f=>[f.fdcId,f]));
let cache,pending;const shards=new Map();
async function json(url){const res=await fetch(url);if(!res.ok)throw Error('资料库暂时无法读取，请重试');return res.json()}
export function loadCatalog(){
 if(cache)return Promise.resolve(cache);
 return pending||=(Promise.all([json('/data/sr-legacy/manifest.json'),json('/data/sr-legacy/index.json'),json('/data/sr-legacy/names-zh.json'),json('/data/tfda/manifest.json'),json('/data/tfda/index.json'),json('/data/tfda/names-en.json')]).then(([manifest,rows,names,tfdaManifest,tfdaEntries,tfdaEnglish])=>{
  if(names.sourceIndexSha256!==manifest.indexSha256||names.count!==rows.length)throw Error('中文名称版本与食品库不匹配，请重新核对资料');
  if(tfdaEntries.length!==tfdaManifest.count)throw Error('食药署索引与来源版本不匹配');
  if(tfdaEnglish.sourceIndexSha256!==tfdaManifest.indexSha256||tfdaEnglish.count!==tfdaEntries.length)throw Error('英文补译版本与食品库不匹配');
  const englishEntries=tfdaEntries.map(e=>({...e,aliases:[...e.aliases,tfdaEnglishFor(e,tfdaEnglish).name]}));
  return cache={manifest,rows,names,tfdaManifest,tfdaEntries,tfdaEnglish,entries:rows.map(row=>{const f=curated.get(row[0]),translation=nameFor(row,names);return {id:f?.id||'usda-'+row[0],revision:f?.revision||`sr2018-${row[0]}-r1`,fdcId:row[0],name:f?.name||translation.name,originalName:row[1],category:manifest.groups[row[2]]?.name||'其他',state:f?.state||nameStatus(translation),kcal:row[3],aliases:f?.aliases||[],curated:!!f,needsReview:translation.status==='needs-review',identityNote:translation.notes?.[0]||''}}).concat(englishEntries).sort((a,b)=>Number(!!b.curated)-Number(!!a.curated))};
 }).catch(e=>{pending=null;throw e}));
}
export async function loadFood(id){
 if(foodById[id])return foodById[id];
 const {rows,manifest,names,tfdaEntries,tfdaManifest,tfdaEnglish}=await loadCatalog();
 if(id.startsWith('tfda-')){
  const entry=tfdaEntries.find(e=>e.id===id);if(!entry)throw Error('没有找到这条食品');
  const key='tfda-'+entry.shard;
  if(!shards.has(key))shards.set(key,json('/data/tfda/'+entry.shard+'.json').catch(e=>{shards.delete(key);throw e}));
  return foodById[id]=expandTfdaFood(entry,(await shards.get(key))[entry.sourceCode],tfdaManifest,tfdaEnglishFor(entry,tfdaEnglish));
 }
 const row=rows.find(r=>'usda-'+r[0]===id);if(!row)throw Error('没有找到这条食品');
 const shard=String(Math.floor(Number(row[0])/1000));
 if(!shards.has(shard))shards.set(shard,json('/data/sr-legacy/'+shard+'.json').catch(e=>{shards.delete(shard);throw e}));
 const raw=(await shards.get(shard))[row[0]];if(!Array.isArray(raw))throw Error('食品来源摘录不完整');
 return foodById[id]=expandFood(row,raw,manifest,nameFor(row,names));
}
export function useCatalog(){const [data,setData]=useState(cache),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);useEffect(()=>{let active=true;loadCatalog().then(d=>{if(active){setData(d);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[attempt]);return {data,error,retry:()=>{setError('');setAttempt(n=>n+1)}}}
