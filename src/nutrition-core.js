export const nutrientKeys=['kcal','protein','fat','carbs','fiber','sodium'];
export const nutrientLabels={kcal:'热量',protein:'蛋白质',fat:'脂肪',carbs:'碳水化合物',fiber:'膳食纤维',sodium:'钠'};
export const revisionOf=f=>f?.revision||`sr2018-${f?.fdcId}-r1`;
export function calculate(items=[],lookup={}){
 const out=Object.fromEntries(nutrientKeys.map(k=>[k,0]));out.missing=[];
 for(const item of items){const f=item.snapshot||lookup[item.foodId];
  if(!f||!Number.isFinite(item.grams)||item.grams<0)throw new Error('食品或份量无效，请核对原始记录');
  if(f.basisUnit&&f.basisUnit!=='g')throw new Error('此食品不是克基准，不能直接换算');
  for(const k of nutrientKeys){const v=f.nutrients?.[k];if(v==null){out.missing.push(k);out[k]=null}else if(out[k]!=null)out[k]+=v*item.grams/100;}
 }
 out.missing=[...new Set(out.missing)];return out;
}
export function mealFingerprint(meals){return JSON.stringify(meals.map(m=>[m.id,m.date,m.meal,m.items.map(i=>[i.foodId,revisionOf(i.snapshot),i.grams])]))}
export function contributions(meals,key,lookup={}){
 return meals.flatMap(m=>m.items.map((i,index)=>({mealId:m.id,date:m.date,meal:m.meal,title:m.title,index,foodId:i.foodId,revision:revisionOf(i.snapshot||lookup[i.foodId]),grams:i.grams,snapshot:i.snapshot||lookup[i.foodId],value:calculate([i],lookup)[key]})));
}
