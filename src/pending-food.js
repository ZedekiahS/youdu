export function pendingInRange(state,from,to=from){return (state.pendingMeals||[]).filter(m=>m.date>=from&&m.date<=to)}
export function resolvePending(state,id,meal){
 const original=state.pendingMeals?.find(m=>m.id===id);if(!original)throw Error('待核对记录已不存在，请重新打开');
 if(state.meals.some(m=>m.pendingOriginal?.id===id))throw Error('这条摄入已经补全，不重复记入');
 meal.pendingOriginal=structuredClone(original);state.meals.push(meal);state.pendingMeals=state.pendingMeals.filter(m=>m.id!==id);delete state.recordContext?.pendingId;
}
