// Raw source identities stay separate from Chinese search hints.
export function nameFor(row,names){
 const entry=names?.entries?.[row[0]];
 if(!entry||entry.originalName!==row[1]||!/[\u3400-\u9fff]/.test(entry.name))throw Error('中文名称与原始食品不匹配，请重新核对资料库');
 return {...entry,version:names.version,method:names.method};
}
export const nameStatus=entry=>entry?.status==='curated'?'原有中文映射':entry?.status==='needs-review'?'中文译名 · 有待核对项':'中文直译 · 未逐条审核';
export function expandFood(row,raw,manifest,translation){
 const [fdcId,originalName,categoryId,kcal,publicationDate]=row;
 const fields={},nutrients={};
 for(const [nid,key] of Object.entries(manifest.keys)){
  const r=raw.find(r=>r.nutrient_id===nid),d=manifest.derivations[r?.derivation_id],value=r?.amount?Number(r.amount):null;
  nutrients[key]=value;fields[key]={value,unit:manifest.definitions[nid].unit_name,status:value==null?'missing':['2','5'].includes(d?.source_id)||/calculat|estimat|imput|assum/i.test(d?.description||'')?'estimated':value===0?'reported-zero':'reported',sourceId:manifest.sourceId,sourceRowId:r?.id||null,nutrientId:nid,derivation:d?.description||'未提供',derivationCode:d?.code||null,dataPoints:r?.data_points??null};
 }
 return {id:'usda-'+fdcId,fdcId,name:translation?.name||originalName,originalName,...(translation?{translation}:{}),group:manifest.groups[categoryId]?.name||'其他',state:translation?'品种、部位与加工状态见中英文名称；实际食品对应关系需核对':'原始英文名称包含品种、部位与加工状态；中文名尚未核对',basis:'每 100 克可食部分',basisUnit:'g',sourceId:manifest.sourceId,source:'USDA FoodData Central · SR Legacy',version:'2018-04',revision:`sr2018-${fdcId}-r1`,publicationDate,region:'美国历史资料；不代表中国同名食品或当前品牌配方',license:manifest.license,verifiedAt:manifest.checked,verification:'数值直接来自固定原始 CSV；中文为本项目译名，不改变来源或食品身份',sourceUrl:`https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`,evidenceUrl:`/data/sr-legacy/${Math.floor(Number(fdcId)/1000)}.json`,nutrients,fields};
}
const hints={鸡:'chicken',鸡肉:'chicken',鸡蛋:'egg',鸭:'duck',猪:'pork',牛肉:'beef',羊:'lamb',鱼:'fish',虾:'shrimp',米饭:'rice',大米:'rice',燕麦:'oats',面条:'noodles',面包:'bread',豆腐:'tofu',豆奶:'soymilk',牛奶:'milk',酸奶:'yogurt',苹果:'apple',香蕉:'banana',橙:'orange',番茄:'tomato',西红柿:'tomato',土豆:'potato',红薯:'sweet potato',菠菜:'spinach',西兰花:'broccoli',蘑菇:'mushroom',花生:'peanut',核桃:'walnut',杏仁:'almond',芝麻:'sesame',酱油:'soy sauce',生:'raw',熟:'cooked'};
export function searchCatalog(entries,query,category='全部',energy='all'){
 const q=query.trim().toLowerCase(),translated=hints[q];
 return entries.filter(f=>(category==='全部'||f.category===category)&&(energy==='all'||Number.isFinite(f.kcal)&&(energy==='0-100'?f.kcal>=0&&f.kcal<=100:energy==='100-300'?f.kcal>100&&f.kcal<=300:energy==='300+'?f.kcal>300:false))&&(!q||`${f.name} ${f.originalName} ${f.fdcId} ${(f.aliases||[]).join(' ')}`.toLowerCase().includes(q)||translated&&f.originalName.toLowerCase().includes(translated)));
}

// This is literal catalog lookup, not semantic matching or a nutrition recommendation.
export function assistantFoodQuery(text){
 return text.trim().replace(/^(?:请)?(?:帮我)?(?:查询|查找|搜索|查一下|查|找一下|找)[：:\s]*/, '').replace(/[？?]$/, '').replace(/(?:的)?(?:营养成分|营养|热量)(?:是多少|多少)?$/, '').trim();
}
export function assistantFoodMatches(entries,text){const query=assistantFoodQuery(text);return query?searchCatalog(entries,query).slice(0,8):[];}
