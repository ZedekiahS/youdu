export function profileFor(state,id){const p=state.profileId===id?state:state.otherProfiles?.[id];if(!p)throw Error('档案已不存在');return p}
export function stageReportDeletion(state,ownerId,id){
 const p=profileFor(state,ownerId),report=p.reports.find(r=>r.id===id);if(!report)return;
 const profiles=[state,...Object.values(state.otherProfiles||{})];if(profiles.some(x=>x.profileId!==ownerId&&x.reports.some(r=>r.id===id)))throw Error('其他档案仍引用该原件，请先核对，未删除');
 p.reportDeletions||=[];if(!p.reportDeletions.some(r=>r.id===id))p.reportDeletions.push({id,name:report.name});
 p.reports=p.reports.filter(r=>r.id!==id);p.indicators=(p.indicators||[]).filter(r=>r.reportId!==id);
 p.deletedRecords=(p.deletedRecords||[]).filter(d=>!(d.kind==='indicators'&&d.record.reportId===id));
 for(const r of [...p.indicators,...p.deletedRecords.filter(d=>d.kind==='indicators').map(d=>d.record)])if(r.corrections)r.corrections=r.corrections.filter(c=>c.before.reportId!==id);
}
export function finishReportDeletion(state,ownerId,id){const p=profileFor(state,ownerId);p.reportDeletions=(p.reportDeletions||[]).filter(r=>r.id!==id)}
