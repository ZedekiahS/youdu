// A source adapter only: reuse the existing gram-based calculation and snapshots.
export function tfdaStateSummary(description){
 const state=description?.match(/樣品狀態:([^;]+)/)?.[1]?.trim();
 // Keep the whole source state, including parenthetical sugar/processing limits.
 // Do not mix laboratory preparation into the food's state or guess missing states.
 return state||'来源未注明样品状态，请核对生熟与加工方式。';
}
export function tfdaCatalogEntry(entry,names){
 const en=tfdaEnglishFor(entry,names);
 return {...entry,stateSummary:tfdaStateSummary(en.originalDescription),identityWarning:en.identityWarning||'',
  needsReview:!!en.identityWarning,aliases:[...entry.aliases,en.name]};
}
export function tfdaEnglishFor(entry,names){
 const translation=names.entries?.[entry.sourceCode];
 if(!translation||translation.originalName!==entry.originalName)throw Error('英文补译与食品身份不匹配，请重新核对资料库');
 return {...translation,version:names.version,method:names.method};
}
export function expandTfdaFood(entry,raw,manifest,englishTranslation){
 if(!Array.isArray(raw)||raw.length!==6)throw Error('食品来源摘录不完整');
 const nutrients={},fields={};
 for(const [name,definition] of Object.entries(manifest.definitions)){
  const matches=raw.filter(e=>e.data['分析項']===name),e=matches[0],r=e?.data;
  if(matches.length!==1||r['整合編號']!==entry.sourceCode||r['樣品名稱']!==entry.originalName||r['含量單位']!==definition.unit)throw Error('食品身份或营养单位与来源不一致');
  const text=r['每100克含量'],value=text==null||String(text).trim()===''?null:Number(text);
  if(value!==null&&(!Number.isFinite(value)||value<0))throw Error('营养数值无效，请核对原始来源');
  nutrients[definition.key]=value;
  fields[definition.key]={value,unit:definition.unit,status:value===null?'missing':value===0?'reported-zero':'reported',sourceId:manifest.sourceId,sourceRowId:e.rowNumber,nutrientId:name,dataPoints:r['樣本數'],derivation:'来源未逐项注明测定或计算方式',standardDeviation:r['標準差']};
 }
 const r=raw[0].data,description=r['內容物描述']||'',sampleState=description.match(/樣品狀態:([^;]+)/)?.[1];
 if(englishTranslation&&(englishTranslation.originalName!==r['樣品名稱']||englishTranslation.originalEnglishName!==r['樣品英文名稱']||englishTranslation.originalDescription!==description))throw Error('英文补译绑定的原始资料不一致');
 return {...entry,sourceId:manifest.sourceId,sourceCode:entry.sourceCode,source:manifest.organization,organization:manifest.organization,dataset:manifest.dataset,
  ...(englishTranslation?{englishTranslation}:{}),
  originalName:r['樣品名稱'],originalEnglishName:r['樣品英文名稱'],group:entry.category,
  state:sampleState||'来源未单独注明生熟状态，请核对实际食品。',originalDescription:description,basis:'每 100 克（按原始样品及前处理状态）',basisUnit:'g',
  region:'台湾地区样品；不代表大陆同名食品或当前品牌配方',version:manifest.version,publicationDate:'来源未提供逐条发布日期；取样年份如有，见原名',
  verifiedAt:manifest.checked,verification:'六项数值来自固定官方 JSON；未补齐空值、未换算生熟、未使用来源中的零克份量。结构核验不等于专业营养审校。',
  license:manifest.license,licenseUrl:manifest.licenseUrl,attribution:manifest.attribution,
  identityNote:'保留官方中文原名。简繁检索提示不代表食材、品种或加工状态可以互换。',
  sourceUrl:manifest.sourceUrl,evidenceUrl:`/data/tfda/${entry.shard}.json`,manifestUrl:'/data/tfda/manifest.json',
  nutrients,fields};
}
