// Journal only newly allocated file IDs, before writing any blobs. It survives
// a failed rollback and is scoped to the same local/QA store as the metadata.
const active=new Set();
const prefix=key=>key+'-report-write-';
export function pendingReportWrites(storage,key){return Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k?.startsWith(prefix(key))&&!active.has(k));}
async function settle(storage,journal,store,getState){
 const ids=JSON.parse(storage.getItem(journal));
 if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'))throw Error('文件清理记录无法读取，未删除任何原件');
 const state=getState();if(state.loadError)throw Error('档案无法读取，暂不能清理原件');
 const used=new Set([state,...Object.values(state.otherProfiles||{})].flatMap(p=>[...(p.reports||[]),...(p.reportDeletions||[])].map(r=>r.id)));
 for(const id of ids)if(!used.has(id))await store('delete',id);
 storage.removeItem(journal);
}
export async function retryReportWrites({storage,key,store,getState}){
 for(const journal of pendingReportWrites(storage,key))await settle(storage,journal,store,getState);
}
export async function writeReportFiles({files,persist,storage,key,store,getState,operationId}){
 if(!files.length){if(persist()!==true)throw Error('档案未保存，原有资料保持不变');return '';}
 const journal=prefix(key)+operationId;
 storage.setItem(journal,JSON.stringify(files.map(f=>f.id)));
 active.add(journal);
 let saved=false;
 try{
  await store('putMany',null,files);
  if(persist()!==true)throw Error('档案未保存，原有资料保持不变');
  saved=true;
 }catch(error){
  try{await settle(storage,journal,store,getState)}catch{throw Error(error.message+'；文件清理尚未完成，请到“我的”重试清理');}
  throw error;
 }finally{active.delete(journal);}
 if(saved){try{storage.removeItem(journal)}catch{return '资料已保存；请到“我的”完成文件清理确认';}}
 return '';
}
