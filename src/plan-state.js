export function planStatus(p){if(p.skipped)return '已跳过';if(p.type==='meal')return `${p.done?'安排已完成':'待执行'} · 摄入请在日记核对`;if(p.type==='workout')return p.done?'已完成':p.progress==='partial'?'部分完成':'待完成';return p.done?'已完成':'待完成'}
export function togglePlanDone(p){if(p.skipped)throw Error('请先恢复安排，再标记完成');p.done=!p.done}
export function togglePlanSkipped(p){if(p.done&&!p.skipped)throw Error('已完成的安排不能跳过');p.skipped=!p.skipped;p.revision=(p.revision||0)+1}
