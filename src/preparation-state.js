// Preparation progress and shopping checks belong to the current local profile.
export function cookingProgress(state,recipeId,id,now=Date.now()){
 return state.cookingDrafts?.[recipeId]||{id,step:0,startedAt:now,pausedAt:now,pausedMs:0};
}
export function finishCooking(state,recipeId,batch){
 state.batches||=[];
 if(!state.batches.some(b=>b.id===batch.id))state.batches.push(batch);
 if(state.cookingDrafts)delete state.cookingDrafts[recipeId];
 if(state.ingredientChecks)delete state.ingredientChecks[recipeId];
}
export function shoppingItems(state,recipes){
 const grouped={};
 for(const id of state.shopping){const r=recipes[id];if(!r)throw Error('清单中的菜谱不存在，请核对备份');
  const d=state.recipeDrafts?.[id]||r;
  for(const i of d.ingredients){grouped[i.foodId]??={foodId:i.foodId,grams:0};grouped[i.foodId].grams+=i.grams*d.servings/r.servings;}
 }
 return Object.values(grouped).map(i=>({...i,grams:Number(i.grams.toFixed(3))}));
}
export function checkShopping(state,foodId,checked,recipes){
 const item=shoppingItems(state,recipes).find(i=>i.foodId===foodId);
 if(!item)throw Error('清单已改变，请重新核对');
 state.shoppingChecked||={};
 if(checked)state.shoppingChecked[foodId]=item.grams;else delete state.shoppingChecked[foodId];
}

export function checkIngredient(state,recipeId,foodId,grams,checked){
 state.ingredientChecks||={};state.ingredientChecks[recipeId]||={};
 if(checked)state.ingredientChecks[recipeId][foodId]=grams;else delete state.ingredientChecks[recipeId][foodId];
}
export function resetPreparationChecks(state,recipeId){
 if(state.ingredientChecks)delete state.ingredientChecks[recipeId];
 if(state.shopping.includes(recipeId))state.shoppingChecked={};
}
