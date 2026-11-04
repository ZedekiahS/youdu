import {sessionElapsed} from './follow-clock.js';
// Shared prototype workflow rules. No model calls or background health decisions.
export const trainingFor = minutes => ({
  minutes,
  moves: (minutes <= 10 ? ['chair', 'wall'] : ['chair', 'wall', 'calf'])
    .map(exerciseId => ({exerciseId, sets: minutes <= 10 ? 1 : minutes >= 30 ? 3 : 2, reps: 5})),
});
export const isStructuredPlan = plan => !!plan?.training || plan?.templateId === 'home-basic' || plan?.id === 'demo-workout';
export const planTraining = plan => structuredClone(plan.training || trainingFor(plan.minutes || 20));
export const trainingSummary = training => `${training.minutes?training.minutes+' 分钟':'未设定预留时长'} · ${training.moves.length} 个动作 · ${training.moves.reduce((n,m)=>n+m.sets,0)} 组`;
const stamp = plan => JSON.stringify({minutes:plan.minutes,training:planTraining(plan),revision:plan.revision||0});

function blockedReason(state, plan) {
  if(state.demo===false)return '当前个人档案不使用原型的固定时长规则；请自行编辑计划。';
  if (!state.settings.ai) return 'AI 演示已关闭，计划未改变。';
  if (state.settings.adjustmentHold) return state.settings.adjustmentHold;
  if (!plan || !isStructuredPlan(plan)) return '没有可调整的居家示例训练，请先在计划中添加。';
  if(plan.skipped)return '这次安排已跳过，请先恢复安排。';
  if (plan.done) return '这次训练已经完成，保留实际记录，不再调整。';
  if (state.activeWorkout?.planId === plan.id) return '这次训练已经开始，请结束当前训练后再调整。';
  if (state.workouts.some(w=>w.planId===plan.id)) return '这项安排已有执行记录，演示暂不改动它。';
  if (state.profile.constraints?.trim()) return '档案中有需要考虑的限制；演示无法评估，暂停自动与确认调整。';
  return '';
}

export function proposeAdjustment(state, {id, planId, minutes, reason, pauseReason='',date}) {
  state.changes ||= [];
  const plan = state.plans.find(p=>p.id===planId);
  const change = {id,kind:'training',planId,reason,date,time:new Date().toISOString(),status:'pending',after:trainingFor(minutes)};
  state.changes.push(change);
  if (pauseReason) state.settings.adjustmentHold=pauseReason;
  const blocked = pauseReason || blockedReason(state,plan) || (date&&plan.date!==date?'本轮只演示今天的训练调整，其他日期的安排保持不变。':'');
  if (blocked) {change.status='paused';change.explanation=blocked;return change;}
  change.before=planTraining(plan);change.beforeStamp=stamp(plan);
  if (change.before.minutes === minutes) {change.status='paused';change.explanation='当前安排已经是这个时长，无需重复调整。';return change;}
  if (state.settings.autoAdjust && minutes >= 10 && minutes <= 20) applyAdjustment(state,id,'automatic');
  else change.explanation=state.settings.autoAdjust?'超出已授权的 10–20 分钟范围，等待你确认。':'未授权自动微调，等待你确认。';
  return change;
}

export function applyAdjustment(state,id,mode='confirmed') {
  const change=state.changes.find(c=>c.id===id && c.kind==='training');
  if (!change || change.status!=='pending') return false;
  const plan=state.plans.find(p=>p.id===change.planId);
  const blocked=blockedReason(state,plan)||(change.date&&plan.date!==change.date?'安排日期已经改变，请重新提出调整。':'');
  if (blocked || stamp(plan)!==change.beforeStamp) {
    change.status='paused';change.explanation=blocked||'计划在建议后发生过变化，请重新提出调整。';return false;
  }
  if(mode==='automatic' && (!state.settings.autoAdjust || change.after.minutes<10 || change.after.minutes>20)) return false;
  plan.minutes=change.after.minutes;plan.training=structuredClone(change.after);plan.revision=(plan.revision||0)+1;
  change.afterStamp=stamp(plan);change.status='applied';change.mode=mode;
  change.explanation=mode==='automatic'?'已在授权范围内自动调整；仅影响这次尚未开始的训练。':'已按你的确认调整；仅影响这次尚未开始的训练。';
  return true;
}

export function restoreAdjustment(state,id) {
  const change=state.changes.find(c=>c.id===id && c.kind==='training');
  const plan=state.plans.find(p=>p.id===change?.planId);
  if (!change || change.status!=='applied' || !plan) return '没有可恢复的调整。';
  if (state.activeWorkout?.planId===plan.id) return '训练正在进行，请结束后再恢复未来安排。';
  if (stamp(plan)!==change.afterStamp) return '已有后续计划变更，为避免覆盖，请先恢复最近一次调整。';
  plan.minutes=change.before.minutes;plan.training=structuredClone(change.before);plan.revision=(plan.revision||0)+1;
  change.status='restored';change.restored=true;change.explanation='已恢复调整前的安排；这张卡保留当时的修改记录。';
  // A prior applied change can be restored next, without accepting unrelated edits.
  const previous=[...state.changes].reverse().find(c=>c.kind==='training' && c.planId===plan.id && c.status==='applied');
  if(previous && JSON.stringify(previous.after)===JSON.stringify(change.before)) previous.afterStamp=stamp(plan);
  return '已恢复原安排，已完成的训练记录保持不变。';
}

export function beginTraining(state, plan, id) {
  if(state.activeWorkout) return false;
  const training=plan?planTraining(plan):trainingFor(20);
  state.activeWorkout={id,planId:plan?.id||null,planRevision:plan?.revision||0,title:plan?.title||'居家基础练习',
    targetMinutes:training.minutes,prescription:training.moves,moves:training.moves.map(m=>m.exerciseId),checked:[],startedAt:Date.now()};
  return true;
}
export function sessionPrescription(session) {
  return session.prescription || session.moves.map(exerciseId=>({exerciseId,sets:2,reps:5}));
}
export function finishTraining(state,date) {
  const s=state.activeWorkout;
  if(!s?.checked.length) return false;
  const prescription=sessionPrescription(s);
  const completedSets=prescription.flatMap(m=>Array.from({length:m.sets},(_,i)=>({exerciseId:m.exerciseId,set:i+1,reps:m.reps,key:m.exerciseId+'-'+i}))).filter(m=>s.checked.includes(m.key));
  state.workouts.push({id:s.id,planId:s.planId||null,planRevision:s.planRevision||0,date,title:s.title||'居家基础练习',
    duration:Math.max(1,Math.round(sessionElapsed(s)/60000)),targetMinutes:s.targetMinutes??20,
    prescription:structuredClone(prescription),completedSets,sets:completedSets.length,moves:[...new Set(completedSets.map(m=>m.exerciseId))],source:'逐组记录'});
  const plan=state.plans.find(p=>p.id===s.planId);
  if(plan && (plan.revision||0)===(s.planRevision||0)) {
    plan.progress=completedSets.length===prescription.reduce((n,m)=>n+m.sets,0)?'complete':'partial';
    plan.done=plan.progress==='complete';
  }
  state.activeWorkout=null;return true;
}
export function remainingServings(state,batchId,excludeMealId) {
  const batch=(state.batches||[]).find(b=>b.id===batchId);
  if(!batch)return 0;
  return Math.max(0,Number((batch.servings-state.meals.filter(m=>m.batchId===batchId && m.id!==excludeMealId).reduce((n,m)=>n+(m.batchPortions||0),0)).toFixed(2)));
}
export function portionItems(batch,portion) {
  return batch.items.map(i=>({...structuredClone(i),grams:Number((i.grams*portion/batch.servings).toFixed(3))}));
}
