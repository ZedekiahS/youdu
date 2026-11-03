import React,{useState} from 'react';
import {ArrowLeft,Plus,Sparkle,BookOpen} from '@phosphor-icons/react';
import {foodById,recipeById,totals,round} from './model';
import {Btn,Section,Empty,Note,Nutri,fmt,LinkOut} from './ui';

export function FoodDetail({state,go,route,open,update}) {
  const f=foodById[route[1]],recipeAt=route.indexOf('recipe'),chatAt=route.indexOf('chat');
  const recipe=recipeAt>=0?recipeById[route[recipeAt+1]]:null;
  const chatKey=chatAt>=0?decodeURIComponent(route[chatAt+1]):null;
  const draft=recipe?(state.recipeDrafts?.[recipe.id]||{servings:recipe.servings,ingredients:recipe.ingredients}):null;
  const current=draft?.ingredients.find(i=>i.foodId===f?.id);
  const currentGrams=current?round(current.grams*draft.servings/recipe.servings,2):null;
  const viewKey=route[1]+'/'+(recipe?.id||'standard'),saved=state.foodViews?.[viewKey];
  const [mode,setMode]=useState(saved?.mode||(currentGrams!=null?'recipe':'standard')),[manual,setManual]=useState(saved?.manual||100);
  const selectView=(nextMode,nextManual)=>{setMode(nextMode);setManual(nextManual);update(s=>{s.foodViews||={};s.foodViews[viewKey]={mode:nextMode,manual:nextManual}})};
  if(!f)return <Empty title="未找到食品"/>;
  const grams=mode==='recipe'?currentGrams:manual,n=totals([{foodId:f.id,grams}]);
  const chatRoute='assistant'+(chatKey&&chatKey!=='general'?'/'+chatKey:'');
  return <>
  <div className="workflow-actions">{chatKey&&<button className="back-link" onClick={()=>go(chatRoute)}><ArrowLeft/>返回 AI 对话</button>}{recipe?<button className="back-link" onClick={()=>go('recipe/'+recipe.id+(chatKey?'/chat/'+encodeURIComponent(chatKey):''))}><ArrowLeft/>返回：{recipe.name}</button>:<button className="back-link" onClick={()=>go('food/foods')}><ArrowLeft/>食品库</button>}</div>
  <div className="page-heading"><div><div className="eyebrow">FOOD DETAILS</div><h1>{f.name}</h1><p>{f.state}</p></div><span className="source-pill"><BookOpen size={17}/>USDA 原始数据</span></div>
  {recipe&&<div className="recipe-context"><strong>来自「{recipe.name}」</strong><span>当前 {draft.servings} 人份配方使用 {currentGrams} 克{f.name}。以下数值随你选择的查看基准变化。</span></div>}
  <div className="detail-columns"><Section title={mode==='recipe'?'这份食材在菜谱中的营养贡献':'食品营养成分'} sub={`原始基准：${f.basis} · 当前按 ${grams} 克换算`}>
    <div className="chips">{currentGrams!=null&&<button className={mode==='recipe'?'selected':''} onClick={()=>selectView('recipe',manual)}>菜谱实际用量 {currentGrams} 克</button>}<button className={mode==='standard'&&manual===100?'selected':''} onClick={()=>selectView('standard',100)}>标准 100 克</button></div>
    <label className="food-weight">查看份量<input aria-label="食品份量" type="number" min="1" max="10000" value={grams} onChange={e=>selectView('standard',Math.max(1,Math.min(10000,Number(e.target.value))))}/>克</label><Nutri value={n}/>
    <div className="facts-row"><span>膳食纤维</span><strong>{fmt(n.fiber,1)} 克</strong></div><div className="facts-row"><span>钠</span><strong>{fmt(n.sodium,1)} 毫克</strong></div>
    <div className="workflow-actions"><Btn onClick={()=>open('meal',{name:f.name,items:[{foodId:f.id,grams}],servings:1})}><Plus size={18}/>单独记入一餐</Btn><Btn kind="secondary" onClick={()=>go(chatKey?chatRoute:'assistant/food/'+f.id+(recipe?'/recipe/'+recipe.id:''))}><Sparkle size={18}/>{chatKey?'继续原对话':'带着这条食品问 AI'}</Btn></div>
    {recipe&&<Note>此处只记录这项食材。整道菜请回到菜谱记录个人份量，避免重复计入。</Note>}
  </Section><Section title="这条数据从哪里来"><dl className="source-dl"><dt>机构</dt><dd>USDA FoodData Central</dd><dt>数据集</dt><dd>SR Legacy · 2018-04</dd><dt>原始编号</dt><dd>{f.fdcId}</dd><dt>原始名称</dt><dd>{f.originalName}</dd><dt>发布日期</dt><dd>{f.publicationDate}</dd><dt>本次提取</dt><dd>2026-11-02</dd><dt>使用许可</dt><dd>CC0 1.0</dd></dl><LinkOut href={f.sourceUrl}>查看官方条目</LinkOut><Note>中文名为原型人工映射。不同生熟状态、品种与品牌不可直接互换。</Note></Section></div></>;
}
