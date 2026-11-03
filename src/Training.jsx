import React,{useState,useEffect} from 'react';
import {Plus,ArrowRight,ArrowLeft,Clock,Play,Check,Barbell,ArrowsClockwise,MagnifyingGlass} from '@phosphor-icons/react';
import {TODAY,exercises,exerciseById,uid} from './model';
import {Btn,Section,Empty,Note} from './ui';
import {planTraining,trainingFor,trainingSummary,isStructuredPlan,beginTraining,sessionPrescription,finishTraining} from './workflows';

export function WorkoutPage({state,go,open}) {
  const [tab,setTab]=useState('今日训练'),[q,setQ]=useState('');
  const plans=state.plans.filter(p=>p.date===TODAY&&p.type==='workout');
  return <><div className="page-heading"><div><div className="eyebrow">MOVE AT YOUR OWN PACE</div><h1>动起来，按自己的节奏</h1><p>从具体安排出发，记录真正完成的内容。</p></div><Btn kind="secondary" onClick={()=>open('activity')}><Plus size={18}/>记录活动</Btn></div>
  <div className="tabs">{['今日训练','动作库','训练历史'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
  {tab==='今日训练'?<>{state.activeWorkout&&<Section title="你有一次进行中的训练" sub="开始时的动作安排已保留，不被后续计划覆盖"><Btn onClick={()=>go('session')}>继续本次训练<ArrowRight size={18}/></Btn></Section>}
  {plans.map(p=><Section key={p.id} title={p.title} sub={`${p.time} · ${p.done?'已完成':p.progress==='partial'?'部分完成':'待执行'}`}><p className="readable">{isStructuredPlan(p)?trainingSummary(planTraining(p)):'自由活动 · 手动记录实际时长'}</p><Btn onClick={()=>go('workout-plan/'+p.id)}>查看这次安排<ArrowRight size={18}/></Btn></Section>)}
  {!plans.length&&<Empty title="今天还没有运动安排" action={<Btn onClick={()=>open('plan')}>添加安排</Btn>}/>}
  <Section title="居家基础练习模板" sub="示例模板 · 3 个动作 · 2 组 × 5 次"><p>用于体验训练流程。今日安排可以另行缩短或延长，模板保持不变。</p><Btn kind="secondary" onClick={()=>go('workout-plan/template')}>查看示例模板</Btn></Section></>:
  tab==='动作库'?<><div className="search-field"><MagnifyingGlass/><input aria-label="搜索动作" placeholder="搜索动作、部位或器械" value={q} onChange={e=>setQ(e.target.value)}/></div><div className="exercise-grid">{exercises.filter(e=>(e.name+e.group+e.equipment).includes(q)).map(e=><button className="exercise-card" key={e.id} onClick={()=>go('exercise/'+e.id)}><span className="icon-tile sage"><Barbell size={30}/></span><h2>{e.name}</h2><p>{e.equipment} · {e.group}</p><span className="text-link">查看示范与来源<ArrowRight size={17}/></span></button>)}</div></>:
  <Section title="实际完成的活动">{state.workouts.length?state.workouts.slice().reverse().map(w=><div className="training-history" key={w.id}><strong>{w.title}</strong><p>{w.date} · 实际 {w.duration} 分钟 · {w.sets} 组</p>{w.completedSets?.length?<p>{w.completedSets.map(m=>`${exerciseById[m.exerciseId].name} 第${m.set}组 ${m.reps}次`).join('；')}</p>:w.moves&&<p>{w.moves.map(id=>exerciseById[id].name).join('、')}</p>}{w.targetMinutes&&<small>开始时安排：{w.targetMinutes} 分钟 · 执行快照已保留</small>}{w.planId&&<button className="text-link block-link" onClick={()=>go('workout-plan/'+w.planId)}>查看关联安排</button>}</div>):<Empty title="从第一次记录开始" text="完成训练或手动记录活动后，会在这里留下记录。"/>}</Section>}</>;
}

export function WorkoutPlanPage({state,go,route,update,open,notify}) {
  const template=route[1]==='template',plan=state.plans.find(p=>p.id===route[1]);
  if(!template&&!plan)return <Empty title="没有找到这项安排" action={<Btn onClick={()=>go('plan')}>返回计划</Btn>}/>;
  const structured=template||isStructuredPlan(plan),training=template?trainingFor(20):structured?planTraining(plan):null;
  const records=state.workouts.filter(w=>w.planId===plan?.id);
  const start=()=>{if(state.activeWorkout){notify('先继续或结束当前训练，未覆盖它的进度');go('session');return}update(s=>{beginTraining(s,plan,uid())});go('session')};
  return <><button className="back-link" onClick={()=>go('plan')}><ArrowLeft/>目标与计划</button><div className="page-heading"><div><div className="eyebrow">{template?'可复用示例模板':'这一次的训练安排'}</div><h1>{plan?.title||'居家基础练习'}</h1><p>{template?'独立体验，不关联某天的计划':`${plan.date} ${plan.time} · ${plan.done?'已完成':plan.progress==='partial'?'部分完成':'待执行'}`}</p></div></div>
  <Section title={structured?trainingSummary(training):'自由活动'} sub={structured?'下方就是开始训练后执行的内容；时长仅为预留，不是必须练满的计时目标':'完成后填写实际活动时长'}>
    {structured?training.moves.map((m,i)=><button key={m.exerciseId} className="exercise-row" onClick={()=>go('exercise/'+m.exerciseId+'/plan/'+(plan?.id||'template'))}><span className="exercise-number">0{i+1}</span><div><strong>{exerciseById[m.exerciseId].name}</strong><p>{m.sets} 组 × {m.reps} 次 · {exerciseById[m.exerciseId].equipment}</p></div><ArrowRight size={18}/></button>):<p>这项安排没有绑定动作模板，不会擅自替换成居家训练。</p>}
    <div className="workflow-actions">{structured?<Btn disabled={!!plan&&(plan.date!==TODAY||plan.done||records.length>0)} onClick={start}><Play size={18}/>{state.activeWorkout?.planId===plan?.id&&state.activeWorkout?'继续本次训练':'开始这次训练'}</Btn>:<Btn disabled={plan.date>TODAY||plan.done} onClick={()=>open('activity',{planId:plan.id,name:plan.title,date:plan.date})}>记录实际活动</Btn>}{plan&&<Btn kind="secondary" onClick={()=>go('assistant/plan/'+plan.id)}>讨论这次训练</Btn>}</div>
    {records.length>0&&<p className="muted">这项安排已有 {records.length} 次执行记录。需要再练一次时，请新建安排。</p>}
  </Section><Note>动作与组数为原型流程示例；10 分钟版为 2 个动作各 1 组，20 分钟版为 3 个动作各 2 组，30 分钟版为 3 个动作各 3 组。没有进行个体化运动评估。</Note>
  {plan&&<Section title="这项安排的调整记录">{state.changes.filter(c=>c.planId===plan.id).slice().reverse().map(c=><div className="change-row" key={c.id}><strong>{c.reason}</strong><p>{c.status==='restored'||c.restored?'已恢复':c.status==='applied'?'已应用':c.status==='pending'?'等待确认':c.status==='paused'?'暂停调整':'历史调整'}</p>{c.before&&c.after&&<p>{trainingSummary(c.before)} → {trainingSummary(c.after)}</p>}</div>)}</Section>}</>;
}

export function SessionPage({state,go,update,notify}) {
  const session=state.activeWorkout;
  const [seconds,setSeconds]=useState(()=>session?Math.floor((Date.now()-session.startedAt)/1000):0),[rest,setRest]=useState(0);
  useEffect(()=>{const id=setInterval(()=>{setSeconds(session?Math.floor((Date.now()-session.startedAt)/1000):0);setRest(v=>Math.max(0,v-1))},1000);return()=>clearInterval(id)},[]);
  if(!session)return <Empty title="没有进行中的训练" action={<Btn onClick={()=>go('workout')}>运动与训练</Btn>}/>;
  const prescription=sessionPrescription(session),total=prescription.reduce((n,m)=>n+m.sets,0);
  const finish=()=>{if(!session.checked.length){notify('请先记录至少一组');return}update(s=>{finishTraining(s,TODAY)});notify('已保存实际训练及对应安排的进度');go('workout')};
  return <><button className="back-link" onClick={()=>go('workout')}><ArrowLeft/>暂时离开，保留进度</button><div className="page-heading"><div><div className="eyebrow">{session.title||'居家基础练习'} · 开始时的安排</div><h1>专注这一组</h1><p>预留 {session.targetMinutes||20} 分钟 · {prescription.length} 个动作 · 已完成 {session.checked.length} / {total} 组</p></div><div className="session-clock"><Clock/>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div></div><div className="progress-track"><div style={{width:session.checked.length/total*100+'%'}}/></div>
  {prescription.map((m,idx)=><Section key={m.exerciseId} title={exerciseById[m.exerciseId].name} sub={exerciseById[m.exerciseId].equipment} action={<button className="text-link" onClick={()=>go('exercise/'+m.exerciseId)}>查看动作<ArrowRight size={16}/></button>}>
    {Array.from({length:m.sets},(_,i)=><div className="set-row" key={i}><span>第 {i+1} 组</span><strong>{m.reps} 次</strong><button className={`set-check ${session.checked.includes(m.exerciseId+'-'+i)?'done':''}`} onClick={()=>{update(s=>{const key=m.exerciseId+'-'+i;const active=s.activeWorkout;active.checked=active.checked.includes(key)?active.checked.filter(x=>x!==key):[...active.checked,key]});setRest(45)}}>{session.checked.includes(m.exerciseId+'-'+i)?'已完成':'完成这一组'}<Check size={18}/></button></div>)}
    {!session.checked.some(k=>k.startsWith(m.exerciseId+'-'))&&<button className="text-link" onClick={()=>{const other=exercises.find(e=>!prescription.some(p=>p.exerciseId===e.id));if(other)update(s=>{s.activeWorkout.prescription=structuredClone(prescription);s.activeWorkout.prescription[idx].exerciseId=other.id;s.activeWorkout.moves=s.activeWorkout.prescription.map(p=>p.exerciseId)});notify('仅替换本次动作，安排和模板保持不变')}}><ArrowsClockwise size={17}/>换一个动作</button>}
  </Section>)}<div className="session-bottom"><span><Clock size={18}/>{rest?`休息计时 ${rest} 秒`:'按自己的节奏休息'}</span><Btn onClick={finish}>结束并保存训练<Check size={19}/></Btn></div></>;
}
