import extraRecipes from './recipes-extra.json';
import {migrateState} from './storage-core.js';
import {calculate,revisionOf} from './nutrition-core.js';
import foods from './foods.json';
import motionExercises from './motion-exercises.json';
export { foods };
import {TODAY,localDate} from './day-clock.js';
export {TODAY,localDate} from './day-clock.js';
export const foodById = Object.fromEntries(foods.map(f => [f.id, f]));
export const uid = () => crypto.randomUUID?.() || '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));
export const round = (v, n=1) => v==null?null:Number(v.toFixed(n));
export function dateOffset(n) { const d=new Date(TODAY+'T12:00:00'); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export const totals=(items=[])=>calculate(items,foodById);
export function snapshotItems(items) {return items.map(i=>{const snapshot=structuredClone(i.snapshot||foodById[i.foodId]);return {...i,revision:revisionOf(snapshot),snapshot};});}
export const recipes = [
 {id:'tomato-eggs',name:'番茄炒蛋',subtitle:'熟悉的一餐，也可以心里有数',type:'家常菜',time:15,servings:2,image:'/images/tomato-eggs.png',ingredients:[{foodId:'tomato',grams:300},{foodId:'egg',grams:200},{foodId:'oil',grams:10},{foodId:'salt',grams:2}],steps:['番茄洗净切块，鸡蛋去壳后打散。按实际使用量称量食材。','锅中放入部分橄榄油，倒入蛋液炒至凝固，盛出备用。','放入剩余油和番茄，翻炒至软，再加入鸡蛋和盐，炒熟后出锅。'],note:'自编演示配方。营养按原料加总，未计烹调损耗、残留油和水分变化；图片为 AI 生成示意。'},
 {id:'tomato-tofu',name:'番茄炖豆腐',subtitle:'热乎乎的家常滋味',type:'家常菜',time:20,servings:2,ingredients:[{foodId:'tomato',grams:300},{foodId:'tofu',grams:300},{foodId:'oil',grams:8},{foodId:'salt',grams:2}],steps:['番茄洗净切块，豆腐切成小块。','锅内加入油，炒软番茄，加入少量水。','加入豆腐煮熟，加入盐调味。'],note:'自编演示配方；水不计入营养加总，成品重量需另行称量。'},
 {id:'banana-milk',name:'香蕉牛奶',subtitle:'两种食材，简单准备',type:'早餐',time:5,servings:1,ingredients:[{foodId:'banana',grams:100},{foodId:'milk',grams:200}],steps:['香蕉去皮，称量可食部分；准备牛奶。','放入料理机搅打均匀，也可以分开食用。'],note:'自编演示配方；牛奶按克计量，没有把毫升直接当成克。'},
 {id:'broccoli-rice',name:'西兰花豆腐饭',subtitle:'把主食、蔬菜和豆腐放在一餐',type:'一人食',time:20,servings:1,ingredients:[{foodId:'rice',grams:150},{foodId:'broccoli',grams:150},{foodId:'tofu',grams:150},{foodId:'oil',grams:5},{foodId:'salt',grams:1}],steps:['准备熟米饭；西兰花洗净切小朵，豆腐切块。','西兰花和豆腐分别烹调至熟，加入橄榄油和盐调味。','与熟米饭搭配，按实际吃掉的份量记录。'],note:'自编演示组合。米饭采用熟重条目，西兰花和豆腐采用原料条目；未计烹调损耗。'},
...extraRecipes,
];
export const recipeById = Object.fromEntries(recipes.map(r=>[r.id,r]));
const legacyExercises = [
 {id:'chair',name:'坐站练习',en:'Sit-to-stand',group:'下肢',equipment:'稳固无轮椅',reps:5,sets:2,steps:['双脚自然分开，坐在稳固椅子边缘。','身体稍向前倾，用腿部力量缓慢站起。','站稳后缓慢坐下，保持动作可控。'],source:'https://www.nhs.uk/live-well/exercise/strength-exercises/#sit-to-stand'},
 {id:'wall',name:'靠墙俯卧撑',en:'Wall press-up',group:'上肢',equipment:'墙面',reps:5,sets:2,steps:['面对墙壁，将手放在胸口高度的墙面。','保持背部平直，缓慢屈肘靠近墙面。','平稳推回起始位置。'],source:'https://www.nhs.uk/live-well/exercise/strength-exercises/#wall-press-up'},
 {id:'calf',name:'扶椅提踵',en:'Calf raises',group:'下肢',equipment:'稳固椅背',reps:5,sets:2,steps:['扶稳椅背，双脚平放。','缓慢抬起脚跟，在舒适范围内移动。','有控制地放回脚跟。'],source:'https://www.nhs.uk/live-well/exercise/strength-exercises/#calf-raises'},
 {id:'squat',name:'扶椅浅蹲',en:'Mini-squats',group:'下肢',equipment:'稳固椅背',reps:5,sets:2,steps:['扶住椅背，双脚自然分开。','在舒适范围内缓慢屈膝，保持背部平直。','缓慢恢复站立。'],source:'https://www.nhs.uk/live-well/exercise/strength-exercises/#mini-squats'},
];
export const exercises=[...legacyExercises.filter(e=>!motionExercises.some(m=>m.id===e.id)),...motionExercises];
export const exerciseById=Object.fromEntries(exercises.map(e=>[e.id,e]));
export function makeMeal(title,items,meal='早餐',date=TODAY) {return {id:uid(),title,items:snapshotItems(items),meal,date,createdAt:new Date().toISOString()};}
export function initialState(demo=true) {
 const s={version:1,demo:true,profile:{name:'体验用户',height:170,targetWeight:68,goal:'减脂',preference:'家常菜',constraints:'',kcal:1800},
 weights:[[-13,73.2],[-10,72.8],[-7,73],[-4,72.6],[-1,72.4]].map(([d,value])=>({id:uid(),date:dateOffset(d),value,source:'演示记录'})),
 meals:[makeMeal('香蕉牛奶',recipeById['banana-milk'].ingredients),...[-6,-4,-2].map(d=>makeMeal('西兰花豆腐饭',recipeById['broccoli-rice'].ingredients,'午餐',dateOffset(d)))],
 water:{[TODAY]:500},workouts:[],activeWorkout:null,
 plans:[{id:'demo-dinner',date:TODAY,time:'18:30',type:'meal',title:'番茄炒蛋',ref:'tomato-eggs'},{id:'demo-workout',date:TODAY,time:'19:30',type:'workout',title:'居家基础练习',minutes:20}],
 settings:{reminders:true,reminderTime:'19:00',reminderFrequency:'每天一次',quietStart:'22:00',quietEnd:'08:00',ai:false,autoAdjust:false},
 family:[{id:'member-demo',name:'家人 A',recipes:true,progress:false}],sharedRecipes:['tomato-eggs'],reports:[],moods:{},changes:[],saved:['tomato-eggs'],shopping:[],chats:{},batches:[]};
 if(!demo){s.demo=false;s.profile={name:'我的档案',height:null,targetWeight:null,goal:'待选择',preference:'',constraints:'',kcal:null};for(const k of ['weights','meals','workouts','plans','family','sharedRecipes','saved'])s[k]=[];s.water={};s.settings.reminders=false;}
 return migrateState(s,uid());
}
export const STORE_KEY='youdu-disposable-prototype-v1'+(typeof location!=='undefined'&&new URLSearchParams(location.search).has('sandbox')?'-qa':'');
export function loadState(){
 const raw=localStorage.getItem(STORE_KEY);
 if(!raw)return initialState(typeof location!=='undefined'&&new URLSearchParams(location.search).has('sandbox'));
 try{const old=JSON.parse(raw);const s=migrateState(old);if(old.version===1&&!localStorage.getItem(STORE_KEY+'-before-v2'))localStorage.setItem(STORE_KEY+'-before-v2',raw);return s;}
 catch(e){try{localStorage.setItem(STORE_KEY+'-unreadable-'+Date.now(),raw)}catch{}const s=initialState(false);s.loadError=e.message;return s;}
}
export async function reportStore(mode,id,file) {
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('youdu-prototype-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('reports');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return new Promise((resolve,reject)=>{const tx=db.transaction('reports',mode==='get'?'readonly':'readwrite');const st=tx.objectStore('reports');let result;
  if(mode==='putMany'){for(const entry of file)st.put(entry.blob,entry.id)}else{const r=mode==='get'?st.get(id):mode==='delete'?st.delete(id):st.put(file,id);r.onsuccess=()=>{result=r.result}}
  tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||Error('本机文件保存失败'))};});
}
