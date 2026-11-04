import {calculate} from './nutrition-core.js';
import motionExercises from './motion-exercises.json' with {type:'json'};
const exerciseIds=new Set(['chair','wall','squat',...motionExercises.map(e=>e.id)]);
const fail=message=>{throw Error(message)};
const list=value=>Array.isArray(value)&&value.length<=50000;
const positive=value=>Number.isFinite(value)&&value>0;
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
function items(rows){
 if(!list(rows)||!rows.length)fail('食品记录为空或无效');
 for(const i of rows){if(!i||typeof i.foodId!=='string'||!positive(i.grams)||!i.snapshot?.nutrients||i.snapshot.id&&i.snapshot.id!==i.foodId)fail('食品快照与条目不符');
  calculate([i]);
  if(i.revision&&i.snapshot.revision&&i.revision!==i.snapshot.revision)fail('食品版本不一致');
  for(const [key,field] of Object.entries(i.snapshot.fields||{})){if(!field||field.value!==i.snapshot.nutrients[key])fail('营养数值与来源字段不一致');}
 }
}
function moves(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>50)fail('训练动作无效');
 const seen=new Set();for(const m of rows){if(!m||!exerciseIds.has(m.exerciseId)||seen.has(m.exerciseId)||!Number.isInteger(m.sets)||m.sets<1||m.sets>20||!Number.isInteger(m.reps)||m.reps<1||m.reps>100)fail('训练动作、组数或次数无效');seen.add(m.exerciseId);}
 return new Set(rows.flatMap(m=>Array.from({length:m.sets},(_,i)=>m.exerciseId+'-'+i)));
}
function record(kind,r,state,history=false){
 if(!r||typeof r.id!=='string'||r.date!=null&&!validDate(r.date))fail('记录编号或日期无效');
 if(kind==='pendingMeals'&&(!validDate(r.date)||!['早餐','午餐','晚餐','加餐'].includes(r.meal)||typeof r.title!=='string'||!r.title.trim()||typeof r.amountText!=='string'||!r.amountText.trim()))fail('待核对摄入记录无效');
 if(kind==='meals'){
  if(!validDate(r.date)||!['早餐','午餐','晚餐','加餐'].includes(r.meal))fail('餐次或日期无效');items(r.items);
  if(r.batchId){const b=state.batches.find(b=>b.id===r.batchId);if(!b||!positive(r.batchPortions)||r.date<b.date)fail('摄入与制作记录不匹配');}
 }
 if(kind==='weights'||kind==='measurements'){if(!validDate(r.date)||!positive(r.value))fail('测量数值或日期无效');}
 if(kind==='workouts'){
  if(!validDate(r.date)||!positive(r.duration)||!Number.isInteger(r.sets)||r.sets<0)fail('活动时间或组数无效');
  if(r.moves&&(!Array.isArray(r.moves)||r.moves.some(id=>!exerciseIds.has(id))))fail('活动包含无法识别的动作');
  if(r.prescription){const keys=moves(r.prescription);if(!Array.isArray(r.completedSets)||r.completedSets.some(m=>!keys.has(m.key)))fail('实际完成组与训练快照不符');}
 }
 if(!history){if(r.corrections!=null&&!list(r.corrections))fail('更正历史无效');for(const c of r.corrections||[]){if(c?.before?.id!==r.id)fail('更正历史与记录不符');record(kind,c.before,state,true);}}
}
export function validateProfileRecords(s){
 for(const key of ['settings','chats','water','moods','completeness'])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))fail('档案偏好或记录结构无效');
 for(const key of ['changes','saved','shopping','sharedRecipes','family','combos','deletedRecords'])if(!list(s[key]))fail('档案列表无效');
 for(const b of s.batches){if(!validDate(b.date)||!positive(b.servings))fail('制作日期或份量无效');items(b.items);}
 for(const kind of ['meals','workouts','weights','measurements','pendingMeals'])for(const r of s[kind])record(kind,r,s);
 for(const b of s.batches){const used=s.meals.filter(m=>m.batchId===b.id).reduce((n,m)=>n+m.batchPortions,0);if(used>b.servings+0.000001)fail('摄入份量超过本次制作');}
 for(const c of s.combos)items(c.items);
 const deleted=new Set();for(const d of s.deletedRecords){if(!d||!['meals','workouts','weights','measurements','pendingMeals'].includes(d.kind))fail('已删除记录无效');record(d.kind,d.record,s);const key=d.kind+':'+d.record.id;if(deleted.has(key)||s[d.kind].some(r=>r.id===d.record.id))fail('已删除记录重复或仍在使用');deleted.add(key);}
 for(const p of s.plans){if(!validDate(p.date)||typeof p.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)||!['meal','workout','habit'].includes(p.type))fail('计划日期、时间或类型无效');if(p.training)moves(p.training.moves);}
 const active=s.activeWorkout;if(active){
  if(typeof active.id!=='string'||!positive(active.startedAt)||active.pausedMs!=null&&(!Number.isFinite(active.pausedMs)||active.pausedMs<0)||active.pausedAt!=null&&(!positive(active.pausedAt)||active.pausedAt<active.startedAt))fail('训练计时状态无效');
  const keys=moves(active.prescription||active.moves?.map(exerciseId=>({exerciseId,sets:2,reps:5})));
  if(!Array.isArray(active.checked)||new Set(active.checked).size!==active.checked.length||active.checked.some(k=>!keys.has(k)))fail('已完成组与训练安排不符');
  const f=active.follow;if(f){if(!positive(f.startedAt)||!positive(f.work)||!positive(f.rest)||!Number.isFinite(f.pausedMs)||f.pausedMs<0||f.pausedAt!=null&&(!positive(f.pausedAt)||f.pausedAt<f.startedAt)||!Array.isArray(f.queue)||!f.queue.length||new Set(f.queue.map(q=>q?.key)).size!==f.queue.length||f.queue.some(q=>!keys.has(q?.key)||!q.key.startsWith(q.exerciseId+'-')))fail('跟练计时或动作队列无效');}
 }
}
