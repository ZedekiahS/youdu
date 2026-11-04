import {remainingServings} from './workflows.js';

export const recordKinds={pendingMeals:'待核对饮食',meals:'饮食',workouts:'活动',weights:'体重',measurements:'围度'};
const copyRecord=r=>{const copy=structuredClone(r);delete copy.corrections;return copy};
function checkPlacement(state,kind,record,excludeId){
 if(!recordKinds[kind])throw Error('不支持的记录类型');
 if(kind==='meals'&&record.batchId){
  const batch=state.batches.find(b=>b.id===record.batchId);
  if(!batch||record.date<batch.date||record.batchPortions>remainingServings(state,record.batchId,excludeId))throw Error('本次制作的可记录份量不足或日期不符，请先核对其他摄入记录');
 }
 if(kind==='weights'&&state.weights.some(r=>r.id!==excludeId&&r.date===record.date))throw Error('该日期已有体重，请先核对现有记录，不会覆盖它');
 if(kind==='workouts'&&record.planId&&(state.workouts.some(r=>r.id!==excludeId&&r.planId===record.planId)||state.activeWorkout?.planId===record.planId))throw Error('关联安排已有另一次训练，请先核对，不会覆盖进度');
}
function updatePlan(state,record){
 const plan=state.plans.find(p=>p.id===record.planId);if(!plan)return;
 const records=state.workouts.filter(w=>w.planId===plan.id);
 plan.done=records.some(w=>!w.prescription||w.sets===w.prescription.reduce((n,m)=>n+m.sets,0));
 plan.progress=plan.done?'complete':records.length?'partial':'pending';
}
export function removeRecord(state,kind,id,now=new Date().toISOString()){
 if(!recordKinds[kind])throw Error('不支持的记录类型');
 const index=state[kind].findIndex(r=>r.id===id);if(index<0)return;
 const record=state[kind][index];state.deletedRecords||=[];
 state.deletedRecords.push({kind,record:structuredClone(record),deletedAt:now});state[kind].splice(index,1);
 if(kind==='workouts')updatePlan(state,record);
 if(kind==='meals'&&state.completeness?.[record.date])state.completeness[record.date]='partial';
}
export function restoreRecord(state,kind,id){
 const index=(state.deletedRecords||[]).findIndex(d=>d.kind===kind&&d.record.id===id);if(index<0)return;
 const record=state.deletedRecords[index].record;
 if(state[kind].some(r=>r.id===id))throw Error('这条记录已存在，不重复恢复');
 checkPlacement(state,kind,record);
 state[kind].push(structuredClone(record));state[kind].sort((a,b)=>a.date.localeCompare(b.date));
 state.deletedRecords.splice(index,1);if(kind==='workouts')updatePlan(state,record);
}
export function reviseRecord(state,kind,id,patch,now=new Date().toISOString()){
 const record=state[kind].find(r=>r.id===id);if(!record)throw Error('这条记录已不存在，请重新打开');
 const next={...record,...structuredClone(patch),id:record.id};checkPlacement(state,kind,next,id);
 const corrections=[...(record.corrections||[]),{before:copyRecord(record),changedAt:now}];
 Object.assign(record,next,{corrections,updatedAt:now});state[kind].sort((a,b)=>a.date.localeCompare(b.date));
}
export function undoRecordCorrection(state,kind,id){
 const index=state[kind].findIndex(r=>r.id===id),record=state[kind][index],last=record?.corrections?.at(-1);if(!last)return;
 checkPlacement(state,kind,last.before,id);
 state[kind][index]={...structuredClone(last.before),corrections:record.corrections.slice(0,-1)};
 state[kind].sort((a,b)=>a.date.localeCompare(b.date));
}
