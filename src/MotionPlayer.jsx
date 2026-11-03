import React,{useRef,useState,useEffect} from 'react';
import {Btn,Note} from './ui';
import media from './motion.json';

export function MotionPlayer({exercise,followPlay=false}) {
  const asset=media[exercise.id],video=useRef(),[playing,setPlaying]=useState(false),[error,setError]=useState(''),[key,setKey]=useState(0);
  useEffect(()=>{if(followPlay)video.current?.play().catch(()=>setError('请点击播放示范'));else video.current?.pause()},[followPlay]);
  if(!asset)return <Note>此动作暂缺精确匹配的动画。请查看下方步骤和原始图文；不会显示其他动作的示范。</Note>;
  const base='/motion/'+asset.mediaVersion+'/'+asset.clipId;
  async function play(restart=false){try{if(restart)video.current.currentTime=0;await video.current.play();setError('')}catch{setError('播放未成功，可重试或查看关键姿势和文字步骤。')}}
  return <div className="motion-player" data-exercise-id={exercise.id}>
    <video ref={video} playsInline muted loop preload="none" poster={base+'-poster.png'} aria-label={exercise.name+'连续动作示范'} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setPlaying(false);setError('视频加载失败。下方关键姿势与文字步骤仍可查看。')}}>
      <source src={base+'.mp4'} type="video/mp4"/>
    </video>
    <div className="workflow-actions"><Btn onClick={()=>playing?video.current.pause():play()}>{playing?'暂停示范':'播放示范'}</Btn><Btn kind="secondary" onClick={()=>play(true)}>从头重播</Btn></div>
    <p className="muted">静音循环 · 原始节奏 · 示范播放不影响训练计时或组数。默认显示海报，点击后播放。</p>
    {error&&<p role="alert">{error}</p>}
    <details><summary>关键姿势与播放回退</summary><div className="chips">{asset.keyTimes.map((t,i)=><button key={i} onClick={()=>{video.current?.pause();setKey(i)}}>姿势 {i+1} · {t.toFixed(1)} 秒</button>)}</div><img src={base+'-key-'+key+'.png'} alt={exercise.name+'关键姿势'+(key+1)} loading="lazy"/></details>
    <details><summary>动画来源与版本</summary><p>Shlomy Reshef · Desk Break · MIT。本站仅改为灰色材质、固定镜头与背景，离线渲染；未改动作节奏。</p><p>动作 ID：{exercise.id} · clip：{asset.clipId}<br/>媒体版本：{asset.mediaVersion}</p><a href="/licenses/desk-break-MIT.txt" target="_blank" rel="noreferrer">完整许可</a> · <a href={'https://github.com/shlomorsh/desk-break/tree/'+asset.sourceCommit+'/library'} target="_blank" rel="noreferrer">固定版本来源</a><p>动画用于观察动作，不代表专业审核或个体化运动建议。</p></details>
  </div>;
}
