import {validateProfileRecords} from './validate-profile.js';
import {pauseSession} from './follow-clock.js';
export const SCHEMA_VERSION=2;
const lists=['weights','meals','workouts','plans','reports','batches','changes','saved','shopping','sharedRecipes','family'];
const owned=['weights','meals','workouts','plans','reports','batches','measurements','indicators','pendingMeals'];
export function migrateState(input,id='legacy-local'){
 if(!input||![1,2].includes(input.version)||!input.profile||!Array.isArray(input.meals))throw Error('不支持的档案版本或结构；原数据未覆盖');
 const s=structuredClone(input);s.version=2;s.profileId||=id;s.otherProfiles||={};
 for(const k of lists)s[k]||=[];
 for(const k of ['measurements','indicators','combos','deletedRecords','pendingMeals'])s[k]||=[];
 if(s.removedMeal){if(!s.meals.some(m=>m.id===s.removedMeal.id)&&!s.deletedRecords.some(d=>d.kind==='meals'&&d.record.id===s.removedMeal.id))s.deletedRecords.push({kind:'meals',record:s.removedMeal,deletedAt:null});delete s.removedMeal;}
 for(const k of ['chats','water','moods','completeness'])s[k]||={};
 s.settings||={};s.settings.cloudAI=false;s.settings.sync=false;
 for(const k of owned)for(const r of s[k]||[])r.ownerId||=s.profileId;
 return s;
}
export function profileSnapshot(s){const copy=structuredClone(s);delete copy.otherProfiles;delete copy.loadError;if(copy.activeWorkout)pauseSession(copy.activeWorkout);return copy}
export function switchProfile(s,id){const target=s.otherProfiles[id];if(!target)throw Error('未找到本机档案');const next=migrateState(target);next.otherProfiles={...s.otherProfiles,[s.profileId]:profileSnapshot(s)};delete next.otherProfiles[id];return next}
export function validateBackup(input){
 if(input?.format!=='youdu-backup'||input.version!==2||!input.state)throw Error('只接受有度 v2 备份；原档案保持不变');
 const s=migrateState(input.state);if(typeof s.profile.name!=='string'||s.profile.name.length>80)throw Error('档案名称无效');
 if(!Array.isArray(input.files)||input.files.length>100)throw Error('文件清单无效');
 for(const key of owned){if(!Array.isArray(s[key])||s[key].length>50000)throw Error('记录集合无效');const ids=new Set();for(const r of s[key]){if(!r||typeof r.id!=='string'||ids.has(r.id))throw Error('记录编号无效或重复');ids.add(r.id);if(r.date&&!/^\d{4}-\d{2}-\d{2}$/.test(r.date))throw Error('记录日期无效');}}
 for(const meal of s.meals){if(!Array.isArray(meal.items)||!meal.items.length)throw Error('餐食结构无效');for(const i of meal.items){if(typeof i.foodId!=='string'||!Number.isFinite(i.grams)||i.grams<=0||!i.snapshot?.nutrients)throw Error('食品快照或份量无效');for(const v of Object.values(i.snapshot.nutrients))if(v!==null&&(!Number.isFinite(v)||v<0))throw Error('营养数值无效');}}
 validateProfileRecords(s);
 for(const f of input.files){if(!f||!s.reports.some(r=>r.id===f.id)||!['application/pdf','image/png','image/jpeg','image/webp'].includes(f.type)||typeof f.base64!=='string'||!f.base64.length||f.base64.length>22*1024*1024||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.base64))throw Error('报告文件结构无效');}
 const ids=new Set(input.files.map(f=>f.id));if(ids.size!==input.files.length)throw Error('文件重复');
 if(s.reports.some(r=>!ids.has(r.id)))throw Error('备份缺少报告原件');
 if(s.indicators.some(i=>!s.reports.some(r=>r.id===i.reportId)))throw Error('指标没有对应报告');
 delete s.otherProfiles;return {state:s,files:input.files};
}
export function asNewProfile(backup,newId,makeId){
 const data=validateBackup(backup),s=data.state,reportIds=new Map(s.reports.map(r=>[r.id,makeId()]));
 s.profileId=newId;s.profile.name+='（恢复）';s.settings.cloudAI=false;s.settings.sync=false;
 for(const k of owned)for(const r of s[k]){r.ownerId=newId;if(k==='reports')r.id=reportIds.get(r.id);if(k==='indicators')r.reportId=reportIds.get(r.reportId)||r.reportId;}
 for(const d of s.deletedRecords)d.record.ownerId=newId;
 for(const records of [...owned.map(k=>s[k]),s.deletedRecords.map(d=>d.record)])for(const r of records)for(const c of r.corrections||[])c.before.ownerId=newId;
 if(s.activeWorkout){pauseSession(s.activeWorkout,s.activeWorkout.pausedAt||s.activeWorkout.follow?.pausedAt||s.activeWorkout.startedAt);s.activeWorkout.ownerId=newId;}
 data.files=data.files.map(f=>({...f,id:reportIds.get(f.id)}));return data;
}
