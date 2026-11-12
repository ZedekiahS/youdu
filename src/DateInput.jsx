import React,{useState} from 'react';
import {TODAY} from './day-clock.js';
export function DateInput({defaultValue,onChange,...props}){const [selected,setSelected]=useState(null);return <input {...props} type="date" value={selected??defaultValue??TODAY} onChange={e=>{setSelected(e.target.value);onChange?.(e)}}/>}
export function RecordContext({state}){return state.recordContext?<p className="muted" role="status">正在记录：{state.recordContext.date} · {state.recordContext.meal}</p>:null}
