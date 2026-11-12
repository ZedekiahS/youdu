import React from 'react';
import {ArrowLeft,ArrowRight,Plus} from '@phosphor-icons/react';
import {foodById,totals} from './model';
import {remainingServings,batchEntries} from './workflows';
import {Btn,Section,Help,Empty,Note,Nutri,fmt} from './ui';

export function PreparedList({state,go}) {
  return <Section title="已做好的菜" sub="吃过后再记录份量">{state.batches?.length?state.batches.slice().reverse().map(b=><button className="source-row" key={b.id} onClick={()=>go('batch/'+b.id)}><div><strong>{b.title}</strong><p>{b.date} 制作 · 共 {b.servings} 份 · 尚可记录 {remainingServings(state,b.id)} 份</p></div><ArrowRight size={19}/></button>):<Empty title="还没有制作记录" text="菜谱 → 开始做菜 → 完成制作。可先保存，吃的时候再记。" action={<Btn onClick={()=>go('food/recipes')}>选择菜谱</Btn>}/>}</Section>;
}
export function BatchPage({state,route,go,open}) {
  const batch=state.batches?.find(b=>b.id===route[1]);
  if(!batch)return <Empty title="未找到这次制作" action={<Btn onClick={()=>go('food/prepared')}>返回已做好的菜</Btn>}/>;
  const remaining=remainingServings(state,batch.id),entries=batchEntries(state,batch.id);
  const per={...totals(batch.items)};for(const k of ['kcal','protein','fat','carbs','fiber','sodium'])per[k]=per[k]==null?null:per[k]/batch.servings;
  return <><button className="back-link" onClick={()=>go('food/prepared')}><ArrowLeft/>已做好的菜</button><div className="page-heading"><div><h1>{batch.title}</h1><p>{batch.date} 制作 · 共 {batch.servings} 份 · 按配方等分</p></div></div>
    <div className="detail-columns"><Section title="做好了，不急着记录吃了"><p className="batch-total">{remaining}<small> 份尚可记录</small></p><Nutri value={per}/><p className="muted">每份营养估算</p><Help title="本次制作如何计算营养">按这次制作的原料和食品来源估算；之后修改菜谱不会改动这次制作。</Help><div className="workflow-actions"><Btn disabled={remaining<0.01} onClick={()=>open('meal',{name:batch.title,items:batch.items,recipeId:batch.recipeId,batchId:batch.id,servings:batch.servings})}><Plus size={18}/>记录这次吃了多少</Btn><Btn kind="secondary" disabled={remaining<0.01} onClick={()=>go('family/'+batch.id)}>为家人记录</Btn><Btn kind="secondary" onClick={()=>go('food/prepared')}>先留着，以后再记</Btn></div><p className="muted">未记录份量不代表剩余库存。</p>{batch.reservedPortions>0&&<Note>备份时其他成员已记录 {batch.reservedPortions} 份，已从可记录份量扣除。恢复后的制作记录独立保存。</Note>}</Section>
    <Section title="本次使用的原料">{batch.items.map(i=><div className="facts-row" key={i.foodId}><span>{(i.snapshot||foodById[i.foodId]).name}<small>{(i.snapshot||foodById[i.foodId]).state}</small></span><strong>{fmt(i.grams,1)} 克</strong></div>)}<button className="text-link block-link" onClick={()=>go('recipe/'+batch.recipeId)}>查看原菜谱<ArrowRight size={16}/></button></Section></div>
    <Section title="这次制作对应的饮食记录" sub="可以更正日期、餐次和实际份量">{entries.length?entries.map(m=><button className="source-row" key={m.profileId+':'+m.id} onClick={()=>m.profileId===state.profileId?open('editMeal',{entry:m}):go('settings')}><strong>{m.profileName} · {m.date} · {m.meal}</strong><span>{m.batchPortions} 份 · {fmt(totals(m.items).kcal)} 千卡{m.profileId!==state.profileId?' · 切换档案更正':''}</span></button>):<Empty title="尚未记录吃过" text="不会因为完成制作而增加今日摄入。"/>}</Section>
  </>;
}
