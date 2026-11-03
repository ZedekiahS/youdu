import {revisionOf,nutrientLabels} from './nutrition-core.js';
import React,{useState} from 'react';
import {ArrowLeft,Plus,Sparkle,BookOpen} from '@phosphor-icons/react';
import {foodById,recipeById,totals,round} from './model';
import {Btn,Section,Empty,Note,Nutri,fmt,LinkOut} from './ui';

export function FoodDetail({state,go,route,open,update}) {
  const recordAt=route.indexOf('record'),revisionAt=route.indexOf('revision');
  const record=recordAt>=0?state.meals.find(m=>m.id===route[recordAt+1]):null;
  const stored=record?.items[Number(route[route.indexOf('item')+1])]?.snapshot;
  const f=recordAt>=0?stored:foodById[route[1]],recipeAt=route.indexOf('recipe'),chatAt=route.indexOf('chat');
  const recipe=recipeAt>=0?recipeById[route[recipeAt+1]]:null;
  const chatKey=chatAt>=0?decodeURIComponent(route[chatAt+1]):null;
  const draft=recipe?(state.recipeDrafts?.[recipe.id]||{servings:recipe.servings,ingredients:recipe.ingredients}):null;
  const current=draft?.ingredients.find(i=>i.foodId===f?.id);
  const currentGrams=current?round(current.grams*draft.servings/recipe.servings,2):null;
  const viewKey=route[1]+'/'+(recipe?.id||'standard'),saved=state.foodViews?.[viewKey];
  const [mode,setMode]=useState(saved?.mode||(currentGrams!=null?'recipe':'standard')),[manual,setManual]=useState(saved?.manual||100);
  const selectView=(nextMode,nextManual)=>{setMode(nextMode);setManual(nextManual);update(s=>{s.foodViews||={};s.foodViews[viewKey]={mode:nextMode,manual:nextManual}})};
  if(!f||(revisionAt>=0&&revisionOf(f)!==route[revisionAt+1]))return <Empty title="当前档案没有这条食品版本" text="没有自动换成其他版本；请返回原记录核对。"/>;
  const grams=mode==='recipe'?currentGrams:manual,n=totals([{foodId:f.id,grams,snapshot:f}]);
  const chatRoute='assistant'+(chatKey&&chatKey!=='general'?'/'+chatKey:'');
  return <>
  {record&&<button className="back-link" onClick={()=>go('meal/'+record.id)}>返回这次摄入：{record.date} {record.meal}</button>}<div className="workflow-actions">{chatKey&&<button className="back-link" onClick={()=>go(chatRoute)}><ArrowLeft/>返回 AI 对话</button>}{recipe?<button className="back-link" onClick={()=>go('recipe/'+recipe.id+(chatKey?'/chat/'+encodeURIComponent(chatKey):''))}><ArrowLeft/>返回：{recipe.name}</button>:<button className="back-link" onClick={()=>go('food/foods')}><ArrowLeft/>食品库</button>}</div>
  <div className="page-heading"><div><div className="eyebrow">FOOD DETAILS</div><h1>{f.name}</h1><p>{f.state}</p></div><span className="source-pill"><BookOpen size={17}/>USDA 原始数据</span></div>
  {recipe&&<div className="recipe-context"><strong>来自「{recipe.name}」</strong><span>当前 {draft.servings} 人份配方使用 {currentGrams} 克{f.name}。以下数值随你选择的查看基准变化。</span></div>}
  <div className="detail-columns"><Section title={mode==='recipe'?'这份食材在菜谱中的营养贡献':'食品营养成分'} sub={`原始基准：${f.basis} · 当前按 ${grams} 克换算`}>
    <div className="chips">{currentGrams!=null&&<button className={mode==='recipe'?'selected':''} onClick={()=>selectView('recipe',manual)}>菜谱实际用量 {currentGrams} 克</button>}<button className={mode==='standard'&&manual===100?'selected':''} onClick={()=>selectView('standard',100)}>标准 100 克</button></div>
    <label className="food-weight">查看份量<input aria-label="食品份量" type="number" min="1" max="10000" value={grams} onChange={e=>selectView('standard',Math.max(1,Math.min(10000,Number(e.target.value))))}/>克</label><Nutri value={n}/>
    <div className="facts-row"><span>膳食纤维</span><strong>{fmt(n.fiber,1)} 克</strong></div><div className="facts-row"><span>钠</span><strong>{fmt(n.sodium,1)} 毫克</strong></div>
    <div className="workflow-actions"><Btn onClick={()=>open('meal',{name:f.name,items:[{foodId:f.id,grams,snapshot:f}],servings:1,date:state.recordContext?.date,meal:state.recordContext?.meal})}><Plus size={18}/>单独记入一餐</Btn><Btn kind="secondary" onClick={()=>go(chatKey?chatRoute:'assistant/food/'+f.id+(recipe?'/recipe/'+recipe.id:''))}><Sparkle size={18}/>{chatKey?'继续原对话':'带着这条食品问 AI'}</Btn></div>
    {recipe&&<Note>此处只记录这项食材。整道菜请回到菜谱记录个人份量，避免重复计入。</Note>}
  </Section><Section title="这条数据从哪里来"><p>{f.region||'美国历史数据；不代表中国同名食品'}</p><p>版本：{revisionOf(f)} · {f.verification||'历史记录快照'}</p><dl className="source-dl"><dt>机构</dt><dd>USDA FoodData Central</dd><dt>数据集</dt><dd>SR Legacy · 2018-04</dd><dt>原始编号</dt><dd>{f.fdcId}</dd><dt>原始名称</dt><dd>{f.originalName}</dd><dt>发布日期</dt><dd>{f.publicationDate}</dd><dt>本次提取</dt><dd>{f.verifiedAt||'历史快照未记录核对日期'}</dd><dt>使用许可</dt><dd>CC0 1.0</dd></dl><LinkOut href={f.sourceUrl}>查看官方条目</LinkOut><Note>中文名为人工映射。生熟、品种和品牌不可直接互换；数值相同也不代表来源相同。</Note><details><summary>逐项营养字段与原始依据</summary>{Object.entries(nutrientLabels).map(([k,label])=>{const field=f.fields?.[k];return <div className="facts-row" key={k}><span>{label}<small>{({missing:'缺失',estimated:'来源为估算/计算',reported:'来源报告值','reported-zero':'来源报告为零'})[field?.status]||'历史来源报告值'}</small></span><span>{fmt(f.nutrients[k],2)} {field?.unit|| (k==='kcal'?'KCAL':k==='sodium'?'MG':'G')}<small>CSV 行 {field?.sourceRowId||'见原始数据'} · {field?.derivation}</small></span></div>})}<a href="/data/food-evidence.json" target="_blank" rel="noreferrer">原始 CSV 摘录、字段定义与压缩包校验值</a></details></Section></div></>;
}
