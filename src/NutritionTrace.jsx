import React,{useState} from 'react';
import {foods,foodById,totals,TODAY,dateOffset} from './model';
import {contributions,nutrientLabels,revisionOf} from './nutrition-core.js';
import {Btn,Section,Empty,Note,Nutri,fmt} from './ui';
export function MealPage({state,route,go,open,update,notify}){
 const meal=state.meals.find(m=>m.id===route[1]);if(!meal)return <Empty title="当前档案没有这条饮食记录"/>;
 return <><button className="back-link" onClick={()=>go('food/diary/'+meal.date)}>返回当日日记</button><div className="page-heading"><div><h1>{meal.title}</h1><p>{meal.date} · {meal.meal} · {meal.quantityMethod||'旧记录未注明称量方式'}</p></div><Btn onClick={()=>open('editMeal',{entry:meal})}>更正份量或餐次</Btn></div><Section title="这一餐的计算结果" sub="食品数值 × 实际克数 ÷ 100；采用保存时的版本"><Nutri value={totals(meal.items)}/></Section><Section title="每项食品的贡献与依据">{meal.items.map((i,index)=><button className="source-row" key={index} onClick={()=>go(`food-detail/${i.foodId}/record/${meal.id}/item/${index}`)}><div><strong>{i.snapshot?.name||foodById[i.foodId]?.name}</strong><p>{i.grams} 克 · {i.snapshot?.state}<br/>版本 {revisionOf(i.snapshot)} · {fmt(totals([i]).kcal)} 千卡</p></div><span>查看依据 →</span></button>)}</Section><Btn kind="secondary" onClick={()=>{update(s=>{s.combos||=[];if(!s.combos.some(c=>c.originMealId===meal.id))s.combos.push({id:meal.id,originMealId:meal.id,title:meal.title,items:structuredClone(meal.items)})});notify('已保存为常吃组合')}}>保存为常吃组合</Btn><Note>食品库以后更新不会静默改写这条记录。更正只作用于这次摄入，汇总立即重算。</Note></>;
}
export function NutrientTrace({state,route,go}){
 const key=route[1] in nutrientLabels?route[1]:'kcal',from=route[2]||dateOffset(-6),to=route[3]||TODAY;
 const meals=state.meals.filter(m=>m.date>=from&&m.date<=to),rows=contributions(meals,key,foodById),n=totals(meals.flatMap(m=>m.items));
 return <><button className="back-link" onClick={()=>go('progress')}>返回复盘</button><h1>{nutrientLabels[key]}：从总量回到原始记录</h1><p>{from} — {to} · {state.profile.name}</p><Section title={`已记录合计：${fmt(n[key],1)} ${key==='kcal'?'千卡':key==='sodium'?'毫克':'克'}`} sub="缺失字段不按零补齐；此处不是全天摄入或目标建议">{rows.map((r,i)=><button className="source-row" key={i} onClick={()=>go('meal/'+r.mealId)}><div><strong>{r.date} · {r.meal} · {r.snapshot.name}</strong><p>{r.grams} 克 × 每100克 {fmt(r.snapshot.nutrients[key],2)} ÷ 100<br/>{r.revision}</p></div><strong>{fmt(r.value,2)} →</strong></button>)}</Section></>;
}
export function CommonMeals({state,open}){return state.combos?.length?<Section title="常吃组合">{state.combos.map(c=><button className="source-row" key={c.id} onClick={()=>open('meal',{name:c.title,items:c.items,servings:1})}><strong>{c.title}</strong><span>核对份量后记录 →</span></button>)}</Section>:null}
