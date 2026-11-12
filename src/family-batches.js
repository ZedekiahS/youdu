import {portionItems} from './workflows.js';
import {addMeal} from './record-history.js';
import {localDate} from './day-clock.js';
import {validDate} from './validate-profile.js';
export function recordFamilyPortion(state,{member,batchId,portion,date,meal,id}){
 const target=state.otherProfiles?.[member],batch=state.batches.find(b=>b.id===batchId);
 if(!target||target.demo||!batch)throw Error('请选择家人的档案和已有制作记录');
 if(!validDate(date)||date>localDate()||!['早餐','午餐','晚餐','加餐'].includes(meal))throw Error('请核对日期和餐次');
 if(!Number.isFinite(portion)||portion<=0)throw Error('请填写实际吃掉的份量');
 const record={id,title:batch.title,ownerId:member,recordedBy:state.profileId,date,meal,batchId,batchPortions:portion,recipeId:batch.recipeId,quantityMethod:'按本次制作等分估计',items:portionItems(batch,portion)};
 if(!addMeal(state,record,member))return false;
 if(!target.batches.some(b=>b.id===batchId))target.batches.push(structuredClone(batch));
 return true;
}
