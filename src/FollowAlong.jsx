import React,{useEffect,useRef,useState} from 'react';
import {MotionPlayer} from './MotionPlayer';
import {exerciseById} from './model';
import {Btn,Section,Note} from './ui';
import {followPhase} from './follow-clock.js';
export function FollowAlong({state,update,notify,prescription}){
 const [work,setWork]=useState(30),[rest,setRest]=useState(20),[voice,setVoice]=useState(false),[now,setNow]=useState(Date.now()),announced=useRef('');
 const run=state.activeWorkout?.follow;
 useEffect(()=>{if(run)document.querySelector('.follow-panel')?.scrollIntoView({block:'start'})},[run?.startedAt]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>{clearInterval(id);window.speechSynthesis?.cancel()}},[]);
 const phase=run?followPhase(run,now):null;
 useEffect(()=>{
  if(!run?.voice||run.pausedAt||!phase)return;
  const key=phase.kind+phase.index;if(announced.current===key)return;announced.current=key;
  const synth=window.speechSynthesis,local=synth?.getVoices().find(v=>v.localService&&v.lang.startsWith('zh'));
  if(!local)return;
  const words=phase.kind==='ready'?'准备，五秒后开始':phase.kind==='work'?`${exerciseById[run.queue[phase.index].exerciseId].name}，第${phase.index+1}组开始`:phase.kind==='rest'?'这一组时间结束，休息': '跟练计时结束，休息后核对实际完成情况';
  synth.cancel();const utterance=new SpeechSynthesisUtterance(words);utterance.voice=local;utterance.lang='zh-CN';synth.speak(utterance);
 },[phase?.kind,phase?.index,run?.pausedAt,run?.voice]);
 function start(e){e.preventDefault();const queue=prescription.flatMap(m=>Array.from({length:m.sets},(_,i)=>({exerciseId:m.exerciseId,key:m.exerciseId+'-'+i}))).filter(q=>!state.activeWorkout.checked.includes(q.key));if(!queue.length){notify('所有组已记录完成');return}update(s=>{s.activeWorkout.follow={startedAt:Date.now(),work:Number(work),rest:Number(rest),voice,queue,pausedMs:0}});if(voice&&!window.speechSynthesis?.getVoices().some(v=>v.localService&&v.lang.startsWith('zh')))notify('未检测到本机中文语音，将使用屏幕倒计时；没有调用云语音')}
 if(!run)return <Section title="放下手机，连续跟练" sub="自动预告、练习和休息；最后一次核对，途中无需逐组点屏幕"><form className="form" onSubmit={start}><div className="form-grid"><label>每组跟练时间（秒）<input required type="number" min="5" max="600" value={work} onChange={e=>setWork(e.target.value)}/></label><label>组间休息（秒）<input required type="number" min="5" max="300" value={rest} onChange={e=>setRest(e.target.value)}/></label></div><label className="check-row"><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/>本机中文语音提示（可用时）</label><p className="muted">时间由你设置，不是运动量建议。倒计时不会自动勾选完成；请保持页面前台，锁屏后的提示无法保证。</p><Btn type="submit">5 秒准备后开始跟练</Btn></form></Section>;
 const current=run.queue[phase.index],next=run.queue[phase.index+1];
 return <Section className="follow-panel" title={phase.kind==='done'?'跟练计时结束，先休息一下':run.pausedAt?'跟练已暂停':({ready:'准备开始',work:exerciseById[current.exerciseId].name,rest:'组间休息'})[phase.kind]} sub={`第 ${Math.min(phase.index+1,run.queue.length)} / ${run.queue.length} 组 · 不自动记录完成`}>
 {phase.kind!=='done'?<><div className="follow-clock" role="timer">{phase.remaining}<small>秒</small></div><p>{phase.kind==='ready'?'即将开始：'+exerciseById[current.exerciseId].name:next?'下一组：'+exerciseById[next.exerciseId].name:'完成后统一核对记录'}</p><MotionPlayer key={current.exerciseId} exercise={exerciseById[current.exerciseId]} followPlay={phase.kind==='work'&&!run.pausedAt}/><div className="workflow-actions"><Btn onClick={()=>{window.speechSynthesis?.cancel();update(s=>{const f=s.activeWorkout.follow;if(f.pausedAt){f.pausedMs+=Date.now()-f.pausedAt;delete f.pausedAt}else f.pausedAt=Date.now()})}}>{run.pausedAt?'继续跟练':'暂停跟练'}</Btn><Btn kind="secondary" onClick={()=>{window.speechSynthesis?.cancel();update(s=>{delete s.activeWorkout.follow});notify('已结束跟练计时，请按实际情况勾选已完成的组')}}>提前结束，手动核对</Btn></div></>:<><Note>计时结束不代表已经做完。可以确认全部完成，或返回逐组核对；此前记录不会丢失。</Note><div className="workflow-actions"><Btn onClick={()=>update(s=>{s.activeWorkout.checked=[...new Set([...s.activeWorkout.checked,...run.queue.map(q=>q.key)])];delete s.activeWorkout.follow})}>我确认这些组已完成</Btn><Btn kind="secondary" onClick={()=>update(s=>{delete s.activeWorkout.follow})}>逐组核对实际完成</Btn></div></>}
 </Section>;
}
