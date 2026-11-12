import React,{useState,useEffect,useRef} from 'react';
import {CaretLeft,CaretRight,MagnifyingGlass,X} from '@phosphor-icons/react';
import {useCatalog} from './catalog';
import {searchCatalog} from './catalog-core.js';
import {Btn,Empty,fmt} from './ui';
const pageSize=20;
export function FoodLibrary({query,setQuery,fallback}){
 const {data,error,retry}=useCatalog(),[category,setCategory]=useState('全部'),[energy,setEnergy]=useState('all'),[page,setPage]=useState(1),top=useRef(null);
 useEffect(()=>setPage(1),[query,category,energy]);
 if(error)return <Empty title={error} action={<Btn onClick={retry}>重新读取资料库</Btn>}/>;
 if(!data)return <p role="status">正在读取食品…</p>;
 const result=searchCatalog(data.entries,query,category,energy),pages=Math.max(1,Math.ceil(result.length/pageSize)),current=Math.min(page,pages);
 const changePage=n=>{setPage(n);top.current?.focus({preventScroll:true});top.current?.scrollIntoView({block:'start',behavior:'instant'})};
 const numbers=[...new Set([1,current-1,current,current+1,pages])].filter(n=>n>0&&n<=pages).sort((a,b)=>a-b);
 return <div ref={top} className="food-browser" tabIndex={-1} aria-label="食品列表"><section className="panel food-search-panel" aria-label="查找食品">
  <div className="search-field food-search"><MagnifyingGlass size={21} aria-hidden="true"/><input name="food-search" type="search" autoComplete="off" aria-label="搜索食品" placeholder="搜索食品" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button className="icon-btn" aria-label="清除搜索" onClick={()=>setQuery('')}><X size={17}/></button>}</div>
  <div className="food-filters" role="group" aria-label="筛选食品">
   <label>分类<select aria-label="食品分类" value={category} onChange={e=>setCategory(e.target.value)}><option value="全部">全部分类</option>{[...new Set(data.entries.map(f=>f.category))].map(c=><option key={c}>{c}</option>)}</select></label>
   <label>热量（千卡 / 100 克）<select aria-label="热量范围" value={energy} onChange={e=>setEnergy(e.target.value)}><option value="all">不限热量</option><option value="0-100">0–100 千卡</option><option value="100-300">大于 100–300 千卡</option><option value="300+">大于 300 千卡</option></select></label>
   {(category!=='全部'||energy!=='all')&&<button className="text-link filter-reset" onClick={()=>{setCategory('全部');setEnergy('all')}}>重置筛选</button>}
  </div>
  <div className="food-results-bar"><span role="status">{(query.trim()||category!=='全部'||energy!=='all')&&<>找到 {fmt(result.length)} 项{result.length>0&&' · '}</>}{result.length>0&&`第 ${current} / ${pages} 页`}</span>{pages>1&&<div className="food-page-short"><button aria-label="上一页" disabled={current===1} onClick={()=>changePage(current-1)}><CaretLeft size={18} aria-hidden="true"/></button><button aria-label="下一页" disabled={current===pages} onClick={()=>changePage(current+1)}><CaretRight size={18} aria-hidden="true"/></button></div>}</div>
  <div className="food-list">{result.slice((current-1)*pageSize,current*pageSize).map(f=><a className="food-row" key={f.id} href={`#/food-detail/${f.id}/revision/${f.revision}`}><span><strong>{f.name}</strong>{f.needsReview&&<small className="muted">名称待核对</small>}</span><span className="food-kcal">{fmt(f.kcal)}<small>千卡 / 100 克</small></span></a>)}</div>
  {!result.length&&<><Empty title="没有找到符合条件的食品" text="换个名称或调整筛选，也可以先手动记录。"/><div className="manual-record">{fallback}</div></>}
  {pages>1&&<nav className="food-pagination" aria-label="食品分页"><button aria-label="上一页" disabled={current===1} onClick={()=>changePage(current-1)}><CaretLeft size={18} aria-hidden="true"/></button><div className="food-page-numbers">{numbers.map((n,i)=><React.Fragment key={n}>{i>0&&n-numbers[i-1]>1&&<span aria-hidden="true">…</span>}<button aria-label={`第 ${n} 页`} aria-current={current===n?'page':undefined} onClick={()=>changePage(n)}>{n}</button></React.Fragment>)}</div><label className="food-page-picker">页码<select aria-label="跳转页码" value={current} onChange={e=>changePage(Number(e.target.value))}>{Array.from({length:pages},(_,i)=><option key={i+1} value={i+1}>{i+1} / {pages}</option>)}</select></label><button aria-label="下一页" disabled={current===pages} onClick={()=>changePage(current+1)}><CaretRight size={18} aria-hidden="true"/></button></nav>}
 </section></div>;
}
