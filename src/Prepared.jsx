import React from 'react';
import {ArrowLeft,ArrowRight,Plus} from '@phosphor-icons/react';
import {foodById,totals} from './model';
import {remainingServings} from './workflows';
import {Btn,Section,Empty,Note,Nutri,fmt} from './ui';

export function PreparedList({state,go}) {
  return <Section title="已做好的菜" sub="制作记录与饮食记录分开；做好不代表已经吃了">{state.batches?.length?state.batches.slice().reverse().map(b=><button className="source-row" key={b.id} onClick={()=>go('batch/'+b.id)}><div><strong>{b.title}</strong><p>{b.date} 制作 · 共 {b.servings} 份 · 未记入个人摄入 {remainingServings(state,b.id)} 份</p></div><ArrowRight size={19}/></button>):<Empty title="还没有制作记录" text="菜谱 → 开始做菜 → 完成制作。可先保存，吃的时候再记。" action={<Btn onClick={()=>go('food/recipes')}>选择菜谱</Btn>}/>}</Section>;
}
export function BatchPage({state,route,go,open}) {
  const batch=state.batches?.find(b=>b.id===route[1]);
  if(!batch)return <Empty title="未找到这次制作" action={<Btn onClick={()=>go('food/prepared')}>返回已做好的菜</Btn>}/>;
  const remaining=remainingServings(state,batch.id),entries=state.meals.filter(m=>m.batchId===batch.id);
  const per={...totals(batch.items)};for(const k of ['kcal','protein','fat','carbs','fiber','sodium'])per[k]/=batch.servings;
  return <><button className="back-link" onClick={()=>go('food/prepared')}><ArrowLeft/>已做好的菜</button><div className="page-heading"><div><div className="eyebrow">这次实际制作 · 独立保存</div><h1>{batch.title}</h1><p>{batch.date} 制作 · 共 {batch.servings} 份 · 按配方等分</p></div></div>
    <div className="detail-columns"><Section title="做好了，不急着记录吃了"><p className="batch-total">{remaining}<small> 份尚未记入个人摄入</small></p><Nutri value={per}/><p className="muted">上方为每份营养估算。保存时的原料与食品来源已固定，之后修改菜谱不会改动这次制作。</p><div className="workflow-actions"><Btn disabled={remaining<0.01} onClick={()=>open('meal',{name:batch.title,items:batch.items,recipeId:batch.recipeId,batchId:batch.id,servings:batch.servings})}><Plus size={18}/>记录这次吃了多少</Btn><Btn kind="secondary" onClick={()=>go('food/prepared')}>先留着，以后再记</Btn></div><Note>这里表示未计入当前个人档案的份量，不是实际库存；分给家人、丢弃和储存状态尚未记录。</Note></Section>
    <Section title="本次原料快照">{batch.items.map(i=><div className="facts-row" key={i.foodId}><span>{(i.snapshot||foodById[i.foodId]).name}<small>{(i.snapshot||foodById[i.foodId]).state}</small></span><strong>{fmt(i.grams,1)} 克</strong></div>)}<button className="text-link block-link" onClick={()=>go('recipe/'+batch.recipeId)}>查看原菜谱<ArrowRight size={16}/></button></Section></div>
    <Section title="这次制作对应的饮食记录" sub="可以更正日期、餐次和实际份量">{entries.length?entries.map(m=><button className="source-row" key={m.id} onClick={()=>open('editMeal',{entry:m})}><strong>{m.date} · {m.meal}</strong><span>{m.batchPortions} 份 · {fmt(totals(m.items).kcal)} 千卡</span></button>):<Empty title="尚未记录吃过" text="不会因为完成制作而增加今日摄入。"/>}</Section>
  </>;
}
