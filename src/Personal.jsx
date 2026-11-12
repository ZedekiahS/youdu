import {writeReportFiles,pendingReportWrites,retryReportWrites} from './report-write.js';
import {recordFamilyPortion} from './family-batches.js';
import {remainingServings} from './workflows.js';
import {DateInput} from './DateInput';
import React,{useState,useRef,useEffect} from 'react';
import {initialState,uid,reportStore,STORE_KEY,TODAY} from './model';
import {profileSnapshot,backupSnapshot,switchProfile,asNewProfile} from './storage-core';
import {Btn,Section,Disclosure,Help,Note,Empty} from './ui';
import {nav} from './Shell';
const readBase64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob)});
export function SettingsPage({state,setState,getState,go,notify,update}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(0);const restoring=useRef(false);
 function checkPending(){try{setPending(pendingReportWrites(localStorage,STORE_KEY).length)}catch{setError('无法读取本机文件清理状态，请检查浏览器存储权限')}}
 useEffect(checkPending,[]);
 async function cleanup(){setBusy(true);setError('');try{await retryReportWrites({storage:localStorage,key:STORE_KEY,store:reportStore,getState});notify('已清理未保存的原件，现有报告保留')}catch(e){setError('清理未完成：'+e.message)}finally{checkPending();setBusy(false)}}
 function create(ev){ev.preventDefault();const f=Object.fromEntries(new FormData(ev.currentTarget)),next=initialState(false);next.profile={...next.profile,name:f.name,height:Number(f.height),goal:f.goal};next.recordingMode=f.mode;next.otherProfiles={...state.otherProfiles,[state.profileId]:profileSnapshot(state)};setState(next);notify('个人档案已创建，原档案保留');go('today')}
 async function backup(){setBusy(true);setError('');try{if(state.reportDeletions?.length)throw Error('请先在身体资料中完成原件删除，再导出备份');const files=[];for(const r of state.reports){const blob=await reportStore('get',r.id);if(!blob)throw Error('未找到报告原件：'+r.name+'。备份未生成，请先核对。');files.push({id:r.id,type:r.type,name:r.name,base64:await readBase64(blob)});}const payload={format:'youdu-backup',version:2,exportedAt:new Date().toISOString(),state:backupSnapshot(state),files};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='youdu-'+TODAY+'.backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已导出当前档案，含本地报告原件')}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function restore(ev){const file=ev.target.files[0];if(!file||restoring.current)return;restoring.current=true;setBusy(true);setError('');try{if(file.size>120*1024*1024)throw Error('备份超过 120 MB');const data=asNewProfile(JSON.parse(await file.text()),uid(),uid);const files=data.files.map(f=>({id:f.id,blob:new Blob([Uint8Array.from(atob(f.base64),c=>c.charCodeAt(0))],{type:f.type})}));const warning=await writeReportFiles({files,operationId:uid(),storage:localStorage,key:STORE_KEY,store:reportStore,getState,persist:()=>setState(latest=>({...data.state,otherProfiles:{...latest.otherProfiles,[latest.profileId]:profileSnapshot(latest)}}))});notify(warning||'已恢复为新档案，原有档案未覆盖')}catch(e){setError('无法导入：'+e.message)}finally{restoring.current=false;checkPending();setBusy(false);ev.target.value=''}}
 return <><div className="page-heading"><div><h1>你的资料，由你掌握</h1><p>{state.profile.name} · {state.demo?'示例档案':'本机个人档案'}</p></div><Btn onClick={()=>go('body')}>身体资料与记录</Btn></div>
 <Section title="全部功能"><div className="module-grid">{nav.map(([id,name,Icon])=><a key={id} href={'#/'+id}><Icon size={24}/>{name}</a>)}</div></Section>
 <Section title="切换档案" sub="共用此浏览器的人可以切换档案"><div className="chips"><span className="pill">当前：{state.profile.name}</span>{Object.entries(state.otherProfiles||{}).map(([id,p])=><button key={id} onClick={()=>{setState(switchProfile(state,id));go('today')}}>{p.profile.name}</button>)}</div></Section>
 <Disclosure title="创建另一个个人档案" defaultOpen={state.demo} sub="不会复制示例体重、目标或饮食记录；现有档案会保留"><form className="form" onSubmit={create}><div className="form-grid"><label>称呼<input name="name" required maxLength="30"/></label><label>身高（厘米）<input name="height" type="number" min="80" max="250" step="0.1" required/></label><label>当前主目标<select name="goal"><option>减脂</option><option>维持</option><option>增肌塑形</option><option>提高体能</option></select></label><label>记录方式（之后可切换）<select name="mode"><option>简单记录</option><option>详细记录</option></select></label></div><Btn type="submit">创建并开始个人试用</Btn></form></Disclosure>
 <Section title="记录与隐私"><label className="form">记录方式<select value={state.recordingMode||'简单记录'} onChange={e=>update(s=>{s.recordingMode=e.target.value})}><option>简单记录</option><option>详细记录</option></select></label><p>资料仅保存在此浏览器，请定期备份。</p><Help title="数据使用与共享说明"><p>暂不支持跨设备同步，也不会向云端 AI 发送资料。</p><p>家庭页仅代记明确选择的本次制作与份量，不展示报告和对话。同一浏览器中的档案不是安全账户隔离，共用设备的人仍可切换查看。</p></Help><label className="check-row"><input type="checkbox" checked={state.settings.ai} onChange={e=>update(s=>{s.settings.ai=e.target.checked})}/>启用资料助手（演示）</label><button className="text-link" onClick={()=>go('sources')}>查看资料来源</button></Section>
 <Section title="可恢复备份" sub="只导出当前档案；导入总是新增档案，不覆盖其他人"><div className="workflow-actions"><Btn disabled={busy} onClick={backup}>导出备份（含报告原件）</Btn><label className="btn secondary file-picker">导入备份并核验<input aria-label="导入有度备份" type="file" accept="application/json,.json" disabled={busy} onChange={restore}/></label></div>{pending>0&&<div><p>有未完成的文件清理；已保存的报告会保留。</p><Btn kind="secondary" disabled={busy} onClick={cleanup}>重试清理</Btn></div>}{error&&<p role="alert">{error}</p>}</Section>
</>;
}
export function FamilyPage({state,update,go,notify,route}){
 const [selected,setSelected]=useState(route[1]||state.batches[0]?.id||''),[busy,setBusy]=useState(false),portionId=useRef(uid());
 const others=Object.entries(state.otherProfiles||{}).filter(([,p])=>!p.demo),batch=state.batches.find(b=>b.id===selected),available=batch?remainingServings(state,batch.id):0;
 function portion(e){e.preventDefault();if(busy)return;const f=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);
  const ok=update(s=>recordFamilyPortion(s,{member:f.member,batchId:selected,portion:Number(f.portion),date:f.date,meal:f.meal,id:portionId.current}));
  setBusy(false);if(ok){notify('已记录家人的实际摄入，本次制作的份量已同步');go('batch/'+selected)}
 }
 return <><h1>一起做饭，各自记录</h1><Note>仅为已同意的家人记录。<details className="inline-disclosure"><summary>了解本机档案与共享范围</summary>本页只显示共餐信息，不展示其他档案的报告和对话。档案保存在同一浏览器，共用设备的人仍可从设置切换查看。</details></Note>
 <Section title="家庭档案">{others.map(([id,p])=><div className="source-row" key={id}><strong>{p.profile.name}</strong><span>独立目标与记录</span></div>)}<Btn kind="secondary" onClick={()=>go('settings')}>创建或切换档案</Btn></Section>
 {!others.length?<Empty title="先创建另一个本机档案"/>:!state.batches.length?<Empty title="先保存这次做好的菜" text="在菜谱中完成制作，核对实际用料和总份数，再为家人记录。" action={<Btn onClick={()=>go('food/recipes')}>选择菜谱</Btn>}/>:<Section title="记录家人吃了多少" sub="确认吃过后再保存"><form className="form" onSubmit={portion}>
 <label>记录到谁的档案<select name="member">{others.map(([id,p])=><option key={id} value={id}>{p.profile.name}</option>)}</select></label>
 <label>这次做好的菜<select name="batch" value={selected} onChange={e=>setSelected(e.target.value)}>{state.batches.map(b=><option key={b.id} value={b.id}>{b.title} · {b.date} · 共 {b.servings} 份</option>)}</select></label>
 <p>尚可记录 {available} 份</p><div className="form-grid"><label>日期<DateInput required name="date" min={batch?.date} max={TODAY}/></label><label>餐次<select name="meal"><option>早餐</option><option>午餐</option><option>晚餐</option><option>加餐</option></select></label><label>实际吃了几份<input key={selected} name="portion" type="number" min="0.01" max={available} step="0.01" defaultValue={Math.min(1,available)} required/></label></div>
 <label className="check-row"><input type="checkbox" required/>已经得到同意，并确认这是实际摄入</label><Btn disabled={busy||available<0.01}>保存这位成员的份量</Btn></form></Section>}</>;
}
