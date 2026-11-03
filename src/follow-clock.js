// Wall-clock scheduling survives reloads; this function never writes completion records.
export function followPhase(run,now=Date.now()){
 const elapsed=Math.max(0,Math.floor(((run.pausedAt??now)-run.startedAt-(run.pausedMs||0))/1000));
 if(elapsed<5)return {kind:'ready',remaining:5-elapsed,index:0};
 const slot=run.work+run.rest,t=elapsed-5,index=Math.floor(t/slot),offset=t%slot;
 if(index>=run.queue.length||(index===run.queue.length-1&&offset>=run.work))return {kind:'done',remaining:0,index:run.queue.length-1};
 return {kind:offset<run.work?'work':'rest',remaining:offset<run.work?run.work-offset:slot-offset,index};
}
