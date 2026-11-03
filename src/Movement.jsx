import React,{useState} from 'react';
import {ArrowLeft} from '@phosphor-icons/react';
import {TODAY,exerciseById,uid} from './model';
import {Btn,Section,Empty,Note,LinkOut} from './ui';
import {MotionPlayer} from './MotionPlayer';
import {beginTraining} from './workflows';
import media from './motion.json';
export function ExercisePage({route,go,state,update}) {
 const e=exerciseById[route[1]],[sets,setSets]=useState(1),[reps,setReps]=useState(5);
 if(!e)return <Empty title="未找到动作"/>;
 function start(ev){ev.preventDefault();if(state.activeWorkout){go('session');return}const id=uid();update(s=>{const plan={id,date:TODAY,time:new Date().toTimeString().slice(0,5),type:'workout',templateId:'custom',title:e.name,minutes:0,training:{minutes:0,moves:[{exerciseId:e.id,sets:Number(sets),reps:Number(reps),mediaVersion:media[e.id]?.mediaVersion}]}};s.plans.push(plan);beginTraining(s,plan,uid())});go('session')}
 return <><button className="back-link" onClick={()=>go(state.activeWorkout?'session':route[2]==='plan'?'workout-plan/'+route[3]:'workout')}><ArrowLeft/>{state.activeWorkout?'返回进行中的训练':'返回运动安排'}</button><div className="page-heading"><div><div className="eyebrow">{e.group} / {e.equipment}</div><h1>{e.name}</h1><p>{e.en}</p></div></div><div className="detail-columns"><Section title="连续动作示范"><MotionPlayer key={e.id} exercise={e}/></Section><Section title="动作步骤" sub={e.sourceLabel||'基于 NHS 公开说明的中文简述'}>{e.steps.map((s,i)=><div className="cooking-step" key={s}><span>0{i+1}</span><p>{s}</p></div>)}<h3>关键提示与常见错误</h3><p>{e.mistakes||'保持动作可控，支撑物应稳固不滑动，避免用惯性完成。'}</p><Note>在舒适范围内进行；疼痛或不适时停止。内容未经过专业人员审核，不是个人运动处方。</Note><LinkOut href={e.source}>查看动作说明依据</LinkOut>{state.activeWorkout?<Btn onClick={()=>go('session')}>继续原训练，组数和计时保留</Btn>:<form className="form" onSubmit={start}><h3>按自己的安排练习</h3><p className="muted">自行填写组数和次数；初始数值仅方便输入，不是推荐运动量。</p><div className="form-grid"><label>组数<input type="number" min="1" max="20" required value={sets} onChange={ev=>setSets(ev.target.value)}/></label><label>每组次数<input type="number" min="1" max="100" required value={reps} onChange={ev=>setReps(ev.target.value)}/></label></div><Btn type="submit">加入今天并开始</Btn></form>}</Section></div></>;
}
