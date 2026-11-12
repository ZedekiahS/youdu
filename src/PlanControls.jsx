import {togglePlanSkipped} from './plan-state.js';
import React from 'react';
import {TODAY} from './model';
import {Btn,Section} from './ui';
export function PlanActions({plan,state,update,notify}){
 const locked=state.activeWorkout?.planId===plan.id||state.workouts.some(w=>w.planId===plan.id);
 return <details className="plan-controls"><summary>改期 / 跳过</summary><label>安排日期<input aria-label={'改期'+plan.title} type="date" disabled={locked||plan.done} value={plan.date} onChange={e=>{const date=e.target.value;if(date)update(s=>{const p=s.plans.find(p=>p.id===plan.id);p.date=date;p.revision=(p.revision||0)+1})}}/></label><Btn kind="secondary" disabled={(locked||plan.done)&&!plan.skipped} onClick={()=>update(s=>{const p=s.plans.find(p=>p.id===plan.id);togglePlanSkipped(p)})}>{plan.skipped?'恢复安排':'跳过这次安排'}</Btn>{locked&&<p>已有执行，保留原始日期和关联。</p>}</details>;
}
export function ReminderControls({state,update}){const cfg=state.settings;return <div className="form"><div className="form-grid"><label>静默开始<input type="time" value={cfg.quietStart||'22:00'} onChange={e=>update(s=>{s.settings.quietStart=e.target.value})}/></label><label>静默结束<input type="time" value={cfg.quietEnd||'08:00'} onChange={e=>update(s=>{s.settings.quietEnd=e.target.value})}/></label><label>暂停至（含当天）<input type="date" value={cfg.pauseUntil||''} onChange={e=>update(s=>{s.settings.pauseUntil=e.target.value})}/></label><label>提醒强度<select value={cfg.reminderStrength||'轻提醒'} onChange={e=>update(s=>{s.settings.reminderStrength=e.target.value})}><option>轻提醒</option><option>醒目提示</option></select></label></div><p className="muted">仅应用内显示，不支持锁屏或后台系统通知。</p></div>}
export function reminderDue(settings,now=new Date()){
 if(!settings.reminders||settings.pauseUntil>=TODAY)return false;
 const time=now.toTimeString().slice(0,5),start=settings.quietStart||'22:00',end=settings.quietEnd||'08:00';
 if(start<end?time>=start&&time<end:time>=start||time<end)return false;
 if(settings.reminderFrequency==='工作日'&&[0,6].includes(now.getDay()))return false;
 if(settings.reminderFrequency==='每周一次'&&now.getDay()!==1)return false;
 return time>=(settings.reminderTime||'19:00');
}
export function TodayReminder({state,go}){return reminderDue(state.settings)?<Section title="应用内提醒" sub="按你设置的时段显示"><p>核对今天的安排和记录，未记录不代表没有执行。</p><Btn onClick={()=>go('plan')}>查看今天安排</Btn></Section>:null}
