export const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export let TODAY=localDate();
const listeners=new Set();
export function refreshToday(now=new Date()){const next=localDate(now);if(next!==TODAY){TODAY=next;for(const fn of listeners)fn()}return TODAY}
export const todaySnapshot=()=>TODAY;
export function subscribeToday(fn){
 listeners.add(fn);let timer;
 const tick=()=>{refreshToday();clearTimeout(timer);const now=new Date(),next=new Date(now);next.setHours(24,0,0,0);timer=setTimeout(tick,next-now+25)};
 window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);tick();
 return()=>{listeners.delete(fn);clearTimeout(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick)};
}
