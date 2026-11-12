import React,{useState} from 'react';
import {reportStore} from './model';
import {stageReportDeletion,finishReportDeletion} from './report-management.js';
import {Btn,Section,Note} from './ui';
export function ReportDeletion({report,state,update,notify,pending=false}){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){const owner=state.profileId;setBusy(true);setError('');try{
  if(!pending&&!update(s=>stageReportDeletion(s,owner,report.id)))throw Error('删除申请未保存，原件保持不变');
  await reportStore('delete',report.id);
  if(!update(s=>finishReportDeletion(s,owner,report.id)))throw Error('原件已清除，状态保存失败，请重试完成');
  notify('已删除此报告原件及关联指标；此前导出的备份不受影响');
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div>{!confirm&&!pending?<button className="text-link" onClick={()=>setConfirm(true)}>删除报告</button>:<><Note>永久删除「{report.name}」及关联指标、更正和删除历史。无法撤销；此前导出的备份需另行管理。</Note><div className="workflow-actions"><Btn kind="secondary" disabled={busy} onClick={remove}>{busy?'正在删除…':pending?'重试清除原件':'确认永久删除'}</Btn>{!pending&&<Btn kind="secondary" disabled={busy} onClick={()=>setConfirm(false)}>取消</Btn>}</div></>}{error&&<p role="alert">{error}</p>}</div>;
}
export function PendingReportDeletions(props){return props.state.reportDeletions?.length?<Section title="尚未完成的原件删除" sub="原件可能仍在此浏览器，请重试完成清除。">{props.state.reportDeletions.map(r=><ReportDeletion key={r.id} {...props} report={r} pending/>)}</Section>:null}
