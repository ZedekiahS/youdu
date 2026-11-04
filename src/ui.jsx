import React from 'react';
import {Info,ArrowSquareOut,BookOpen} from '@phosphor-icons/react';
export const fmt=(n,d=0)=>n==null?'—':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:d});
export function Btn({children,kind='primary',className='',...props}){return <button className={`btn ${kind} ${className}`} {...props}>{children}</button>}
export function Section({title,sub,action,children,className='',help,helpTitle='查看说明'}){return <section className={`panel ${className}`}><div className="section-heading"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{action}</div>{children}{help&&<Help title={helpTitle}>{help}</Help>}</section>}
export function Disclosure({title,sub,children,defaultOpen=false}){return <details className="panel disclosure" open={defaultOpen||undefined}><summary><span>{title}</span>{sub&&<small>{sub}</small>}</summary><div className="disclosure-content">{children}</div></details>}
export function Empty({title='还没有记录',text,action}){return <div className="empty"><BookOpen size={32} weight="duotone"/><h3>{title}</h3><p>{text}</p>{action}</div>}
export function Note({children,tone=''}){return <div className={`note ${tone}`}><Info size={18}/><div>{children}</div></div>}
export function LinkOut({href,children}){return <a className="text-link" href={href} target="_blank" rel="noreferrer">{children}<ArrowSquareOut size={15}/></a>}
export function Stat({label,value,unit,sub,icon:Icon,color='',empty='暂无数据'}){const missing=value==null||value===''||value==='—';return <div className={`stat ${color}`}><div className="stat-top">{label}{Icon&&<Icon size={21}/>}</div><div className={`stat-value${missing?' stat-empty':''}`}>{missing?empty:value}{!missing&&unit&&<small>{unit}</small>}</div>{sub&&<p>{sub}</p>}</div>}
export function Nutri({value,compact=false}){return <div className={`nutrients ${compact?'compact':''}`}>{[['kcal','热量','千卡'],['protein','蛋白质','克'],['carbs','碳水','克'],['fat','脂肪','克']].map(([k,l,u])=><div key={k}><span>{l}</span><strong>{value.missing?.includes(k)?'缺失':fmt(value[k],k==='kcal'?0:1)}<small>{value.missing?.includes(k)?'未计完整':u}</small></strong></div>)}</div>}

export function Help({title,children}){return <details className="inline-disclosure help-details"><summary>{title}</summary><div className="help-content">{children}</div></details>}
