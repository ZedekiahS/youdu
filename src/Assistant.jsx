import {foods} from './model';
import {revisionOf,mealFingerprint} from './nutrition-core.js';
import React,{useEffect,useRef} from 'react';
import {Sparkle,ArrowRight,ArrowUpRight,PaperPlaneTilt,ArrowCounterClockwise,ForkKnife} from '@phosphor-icons/react';
import {TODAY,recipeById,foodById,totals,uid} from './model';
import {Btn,Section,Note,fmt} from './ui';
import {proposeAdjustment,applyAdjustment,restoreAdjustment,trainingSummary,isStructuredPlan} from './workflows';

export function AssistantPage({state,go,update,route,notify}) {
  const key=route.slice(1).join('/')||'general';
  const context=route[1]==='recipe'?{type:'recipe',id:route[2]}:route[1]==='food'?{type:'food',id:route[2],recipeId:route[3]==='recipe'?route[4]:null}:route[1]==='plan'?{type:'plan',id:route[2]}:null;
  const chat=state.chats?.[key]||{messages:[],draft:'',context};
  const messages=chat.messages, scroll=useRef();
  const recipe=context?.type==='recipe'?recipeById[context.id]:recipeById[context?.recipeId];
  const food=context?.type==='food'?foodById[context.id]:null;
  const ensure=s=>{s.chats||={};s.chats[key]||={messages:[],draft:'',context};return s.chats[key];};
  useEffect(()=>{if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[messages.length]);
  const target=context?.type==='plan'?state.plans.find(p=>p.id===context.id):state.plans.find(p=>p.date===TODAY&&p.type==='workout'&&!p.done&&isStructuredPlan(p));
  function ask(text) {
    if(!text.trim())return;
    const messageId=uid(),changeId=uid();
    update(s=>{
      const c=ensure(s);let answer,kind='links',foodRefs=[];const matches=foods.filter(f=>(f.aliases||[f.name]).some(a=>text.includes(a)));
      if(/训练|调整|忙|分钟|不舒服/.test(text)) {
        const minutes=/30|三十|延长/.test(text)?30:10;
        const paused=/不舒服|疼痛|受伤|暂停/.test(text)?'你反馈身体不适，演示暂停调整，不生成新的训练安排。':'';
        proposeAdjustment(s,{id:changeId,planId:target?.id,minutes,reason:text,pauseReason:paused,date:TODAY});
        answer='以下是本地演示规则的处理结果。训练内容会与计划、执行页面同步；不会改动已记录的活动。';kind='adjust';
      } else if(matches.length){kind='food-search';foodRefs=matches.map(f=>({id:f.id,revision:revisionOf(f)}));answer='找到以下真实资料条目，请核对生熟、品种和地区后选择。只是查看，不会计入摄入。';
      } else if(/来源|食材|营养|这道|菜谱/.test(text)) {
        answer=food?`${food.name}采用 ${food.state} 条目，每 100 克可食部分的原始数据来自 USDA。点击下方回到具体食品核对。`:`${recipe?.name||'番茄炒蛋'}按原料用量与 USDA 条目计算。你可以查看食材，并返回这段对话继续。`;kind='recipe';
      } else if(/今天|记录|复盘|体重/.test(text)) {
        const ms=s.meals.filter(m=>m.date===TODAY);
        answer=`今天有 ${ms.length} 条饮食记录，已记录约 ${fmt(totals(ms.flatMap(m=>m.items)).kcal)} 千卡；有 ${s.workouts.filter(w=>w.date===TODAY).length} 次活动。记录完整度未确认，不判断吃多或吃少。`;kind='review';
      } else answer='这版尚未连接语言模型。你可以体验查询来源、返回原始记录、自动调整或确认调整的流程。';
      c.messages.push({id:uid(),role:'user',text},{id:messageId,role:'assistant',text:answer,kind,foodRefs,recordFingerprint:kind==='review'?mealFingerprint(s.meals):null,changeId:kind==='adjust'?changeId:null});c.draft='';
    });
  }
  const linkFood=id=>go('food-detail/'+id+'/revision/'+revisionOf(foodById[id])+(recipe?'/recipe/'+recipe.id:'')+'/chat/'+encodeURIComponent(key));
  return <>
    <div className="page-heading"><div><div className="eyebrow">YOUR CONTEXT STAYS WITH YOU</div><h1>把生活里的问题，连起来</h1><p>查看资料后回来，对话与输入草稿都还在。</p></div><span className="source-pill"><Sparkle size={18}/>本地规则演示</span></div>
    <div className="assistant-layout"><section className="chat-panel">
      <div className="chat-top"><span className="ai-avatar"><Sparkle size={24}/></span><div><strong>有度助手</strong><p>未接入语言模型 · 对话保存在本机</p></div><label className="ai-enable"><span>启用演示</span><input role="switch" aria-label="开启 AI 流程演示" type="checkbox" checked={state.settings.ai} onChange={e=>update(s=>{s.settings.ai=e.target.checked})}/></label></div>
      {(recipe||food)&&<button className="context-chip" onClick={()=>food?linkFood(food.id):go('recipe/'+recipe.id+'/chat/'+encodeURIComponent(key))}><ForkKnife size={17}/>正在讨论：{food?.name||recipe?.name}<ArrowUpRight size={16}/></button>}
      {context?.type==='plan'&&<button className="context-chip" onClick={()=>go('workout-plan/'+context.id)}>正在讨论：{target?.title||'原训练安排'}<ArrowUpRight size={16}/></button>}
      <div ref={scroll} className="chat-messages">
        {!messages.length&&<div className="chat-welcome"><span className="ai-avatar large"><Sparkle size={32}/></span><h2>从今天的小事聊起</h2><p>先开启演示，再选择一个场景。<br/>离开页面不会清空这次对话。</p></div>}
        {messages.map(m=>{const change=state.changes.find(c=>c.id===m.changeId);return <div key={m.id} className={`chat-message ${m.role}`}><span className="message-label">{m.role==='user'?'你':'有度 · 演示回答'}</span><p>{m.text}</p>
          {change&&<div className="adjustment-card"><span className={'workflow-status '+change.status}>{({pending:'等待确认',applied:change.mode==='automatic'?'已自动调整':'已确认调整',paused:'暂停调整',restored:'已恢复'})[change.status]}</span><p>{change.status==='restored'?'已恢复调整前的安排；这张卡保留当时的修改记录。':change.explanation}</p>{change.before&&<div className="adjustment-diff"><span>原安排：{trainingSummary(change.before)}</span><strong>{change.status==='pending'?'拟调整':change.status==='restored'?'已撤销的修改':'调整后'}：{trainingSummary(change.after)}</strong></div>}
            {change.status==='pending'&&<Btn disabled={!state.settings.ai} onClick={()=>update(s=>{applyAdjustment(s,change.id)})}>确认这次调整</Btn>}
            {change.status==='applied'&&<Btn kind="secondary" onClick={()=>{const copy=structuredClone(state),msg=restoreAdjustment(copy,change.id);if(copy.changes.find(c=>c.id===change.id).status==='restored')update(s=>{restoreAdjustment(s,change.id)});notify(msg)}}><ArrowCounterClockwise size={17}/>恢复这次调整</Btn>}
            {change.planId&&<button className="text-link block-link" onClick={()=>go('workout-plan/'+change.planId)}>查看对应训练安排<ArrowRight size={16}/></button>}
          </div>}
          {m.recordFingerprint&&m.recordFingerprint!==mealFingerprint(state.meals)&&<Note>记录已更正，这段旧汇总已过时。请重新询问；今日与复盘已按新记录重算。</Note>}{m.kind==='food-search'&&<div className="chat-links">{m.foodRefs.map(ref=><button key={ref.id} onClick={()=>go('food-detail/'+ref.id+'/revision/'+ref.revision+'/chat/'+encodeURIComponent(key))}>{foodById[ref.id].name} · {foodById[ref.id].state} · {ref.revision}</button>)}</div>}{m.kind==='recipe'&&<div className="chat-links">{!food&&<button onClick={()=>go('recipe/'+(recipe?.id||'tomato-eggs')+'/chat/'+encodeURIComponent(key))}>打开菜谱<ArrowRight size={16}/></button>}{(food?[food.id]:(recipe||recipeById['tomato-eggs']).ingredients.slice(0,2).map(i=>i.foodId)).map(id=><button key={id} onClick={()=>linkFood(id)}>{foodById[id].name} · 食品详情<ArrowUpRight size={16}/></button>)}</div>}
          {m.kind==='review'&&<div className="chat-links"><button onClick={()=>go('food/diary')}>核对饮食记录</button><button onClick={()=>go('progress')}>打开进度复盘</button></div>}
        </div>})}
      </div>
      <div className="scenario-strip">{['看看今天的记录','这道菜的营养从哪来','今天只有10分钟训练','今天想练30分钟','今天不舒服，暂停调整'].map(t=><button disabled={!state.settings.ai} key={t} onClick={()=>ask(t)}>{t}</button>)}</div>
      <form className="chat-compose" onSubmit={e=>{e.preventDefault();if(state.settings.ai)ask(chat.draft)}}><input aria-label="给 AI 助手的消息" disabled={!state.settings.ai} placeholder={state.settings.ai?'输入问题，或选择演示场景…':'开启演示后可以提问'} value={chat.draft} onChange={e=>update(s=>{ensure(s).draft=e.target.value})} maxLength="1000"/><button className="send-btn" aria-label="发送消息" disabled={!state.settings.ai||!chat.draft.trim()}><PaperPlaneTilt size={21}/></button></form>
    </section><div>
      <Section title="你允许 AI 做什么" sub="用场景按钮触发演示，不在后台改计划">{!state.demo&&<Note>个人档案不启用固定时长演示规则。当前可查资料和汇总记录，训练由你自行安排；真实模型与个体自动调整尚未接入。</Note>}{state.settings.adjustmentHold&&<div className="adjustment-card"><span className="workflow-status paused">调整已暂停</span><p>{state.settings.adjustmentHold}</p><Btn kind="secondary" onClick={()=>update(s=>{delete s.settings.adjustmentHold})}>结束暂停演示</Btn></div>}<label className="toggle-row"><span><strong>允许自动微调本次训练</strong><small>仅今天、尚未开始的居家示例训练</small></span><input type="checkbox" role="switch" aria-label="允许自动微调本次训练" disabled={!state.settings.ai||!state.demo} checked={state.settings.autoAdjust} onChange={e=>update(s=>{s.settings.autoAdjust=e.target.checked})}/></label><p className="readable">允许范围：10–20 分钟。范围内自动更新动作与组数；30 分钟示例须确认。有身体限制、已开始或已有执行记录时暂停。</p><Note>这些是原型场景规则，不是根据身体情况生成的训练处方。长期目标和实际记录不随之修改。</Note></Section>
      <Section title="当前对话的资料"><p>{context?.type==='plan'?'训练安排：'+(target?.title||'已不存在'):food?'食品：'+food.name:recipe?'菜谱：'+recipe.name:'今天的饮食、活动与安排'}</p>{food&&recipe&&<p>来自菜谱：{recipe.name}</p>}<p>身高 {state.profile.height} 厘米 · 目标 {state.profile.goal}</p><p>报告原件不用于回答。</p><button className="text-link block-link" onClick={()=>go('settings')}>隐私与本机数据<ArrowRight size={16}/></button></Section>
      <Section title="继续上次对话">{Object.entries(state.chats||{}).filter(([k,c])=>c.messages.length&&k!==key).slice(-4).map(([k,c])=><button className="source-row" key={k} onClick={()=>go('assistant'+(k==='general'?'':'/'+k))}><strong>{c.context?.type==='recipe'?recipeById[c.context.id]?.name:c.context?.type==='food'?foodById[c.context.id]?.name:c.context?.type==='plan'?(state.plans.find(p=>p.id===c.context.id)?.title||'训练对话'):'日常对话'}</strong><ArrowRight size={17}/></button>)}<button className="text-link block-link" onClick={()=>go('plan')}>查看计划与调整历史<ArrowRight size={16}/></button></Section>
    </div></div>
  </>;
}
