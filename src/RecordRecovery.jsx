import React from 'react';
import {removeRecord,restoreRecord,undoRecordCorrection,recordKinds} from './record-history.js';
import {Btn,Section} from './ui';
export function RemoveRecord({kind,record,update,notify}){
 return <button className="text-link" aria-label={`删除${record.title||record.kind||record.date}${recordKinds[kind]}记录`} onClick={()=>{if(update(s=>removeRecord(s,kind,record.id)))notify('已移入本页的已删除记录，可随时恢复')}}>删除</button>;
}
export function UndoCorrection({kind,record,update,notify}){
 return record.corrections?.length?<button className="text-link" onClick={()=>{if(update(s=>undoRecordCorrection(s,kind,record.id)))notify('已撤销最近一次更正，汇总已更新')}}>撤销最近更正</button>:null;
}
export function DeletedRecords({kind,state,update,notify}){
 const records=(state.deletedRecords||[]).filter(d=>d.kind===kind);if(!records.length)return null;
 return <Section title={`已删除的${recordKinds[kind]}记录（${records.length}）`} sub="可恢复，尚未永久清除"><details><summary>查看并恢复</summary><p>已删除记录不计入统计，仍保存在当前档案及备份中。</p>{records.slice().reverse().map(({record})=><div className="training-history" key={record.id}><strong>{record.title||record.kind||recordKinds[kind]}</strong><p>{record.date} · {kind==='indicators'?`${record.name} ${record.comparator} ${record.value} ${record.unit}`:kind==='pendingMeals'?`${record.meal} · ${record.amountText}`:kind==='meals'?record.meal:kind==='workouts'?`${record.duration} 分钟 · ${record.sets} 组`:`${record.value} ${kind==='weights'?'千克':'厘米'}`}</p><Btn kind="secondary" onClick={()=>{if(update(s=>restoreRecord(s,kind,record.id)))notify('已恢复原记录及其历史版本')}}>恢复这条记录</Btn></div>)}</details></Section>;
}
