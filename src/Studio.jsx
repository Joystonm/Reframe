import React, {useRef, useState} from 'react';
import CreativeDirection from './CreativeDirection.jsx';
import {normalizeDirection,directionChoices,buildDirectedPrompt} from './direction.js';

export function Icon({name, ...props}) {
 const paths={plus:'M12 5v14M5 12h14',arrow:'m6 12 6-6 6 6M12 6v13',library:'M4 5h6v14H4zM14 5h6v14h-6z',settings:'M4 7h16M4 17h16M9 4v6M15 14v6',cube:'m12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8',select:'m5 3 14 10-7 1-3 7z',move:'M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',text:'M4 5h16M12 5v15M8 20h8',shape:'M5 5h14v14H5z',image:'M3 4h18v16H3zM3 16l6-6 5 5 3-3 4 4M16 8h1',undo:'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6',redo:'m15 5 5 5-5 5M20 10H10a6 6 0 0 0-6 6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0',export:'M12 3v12m-5-7 5-5 5 5M4 14v7h16v-7',close:'m6 6 12 12M6 18 18 6'};
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]||paths.cube}/></svg>;
}
export function Home({prompt,setPrompt,onSubmit,leaving,busy,error,ready,onResume,hasScene,onUpload,notice}) {
 const [panel,setPanel]=useState(null);const file=useRef(null),directionButton=useRef(null);
 const [direction,setDirection]=useState(()=>{try{return normalizeDirection(JSON.parse(localStorage.getItem('reframe-direction')));}catch{return normalizeDirection(null);}});
 const choices=directionChoices(direction),directedPrompt=buildDirectedPrompt(prompt,direction),tooLong=directedPrompt.length>4000;
 function closeDirection(){setPanel(null);requestAnimationFrame(()=>directionButton.current?.focus());}
 function submit(){if(prompt.trim()&&!busy&&ready&&!tooLong)onSubmit(directedPrompt);}

 const examples=['A futuristic landing page for an AI developer platform','A quiet architectural retreat surrounded by pine trees','An editorial poster for a contemporary design exhibition'];
 return <main className={'home '+(leaving?'home-leaving':'')}>
  <nav className="home-nav"><div className="brand"><span className="mark"/>Reframe<span className="home-beta">BETA</span></div>{hasScene&&<button onClick={onResume}>Open last canvas <span aria-hidden="true">&#8599;</span></button>}</nav>
  <section className="home-center"><div className="hero-copy"><div className="home-eyebrow">A LITTLE IDEA. ENDLESS POSSIBILITIES.</div><h1>Design is easier with <span>Reframe</span></h1><p>The creative workspace that turns your ideas into reality</p></div>
   <form className="composer" onSubmit={e=>{e.preventDefault();submit();}}>
    <textarea aria-label="Creative prompt" placeholder="Ask Reframe to design something..." maxLength={4000} value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={leaving} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();submit();}}}/>
    <div className="composer-bottom"><div className="composer-controls"><button type="button" className="icon-button" title="Add an image to Canvas" aria-label="Add image" onClick={()=>file.current.click()}><Icon name="plus"/></button><button type="button" className={'icon-button '+(panel==='library'?'active':'')} title="Prompt library" aria-label="Prompt library" aria-expanded={panel==='library'} onClick={()=>setPanel(panel==='library'?null:'library')}><Icon name="library"/></button></div><div className="composer-controls"><span className="composer-hint">Bring your idea to life</span><button ref={directionButton} type="button" className={"direction-trigger "+(choices.length?"has-direction":"")} title="Creative direction" aria-label="Creative direction" aria-haspopup="dialog" aria-expanded={panel==='settings'} disabled={busy} onClick={()=>setPanel('settings')}><Icon name="settings"/><span>Direction</span>{choices.length>0&&<i aria-hidden="true"/>}</button><button className="submit-prompt" type="submit" disabled={!prompt.trim()||busy||!ready||tooLong} aria-label="Generate and open Canvas"><Icon name="arrow"/></button></div></div>
   </form>
   <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{onUpload(e.target.files[0]);e.target.value='';}}/>
   {panel==='library'&&<div className="composer-popover"><strong>A starting point, if you need one</strong>{examples.map(p=><button key={p} onClick={()=>{setPrompt(p);setPanel(null);}}>{p}<span aria-hidden="true">&#8599;</span></button>)}</div>}
   {choices.length>0&&<div className="applied-direction" aria-label="Applied creative direction"><span>Direction</span>{choices.map(choice=><button key={choice.key} type="button" disabled={busy} onClick={()=>setPanel('settings')}>{choice.key==='palette'&&<i style={{background:choice.colors[1]}}/>}{choice.name}</button>)}<button type="button" aria-label="Clear creative direction" disabled={busy} onClick={()=>{const cleared=normalizeDirection(null);setDirection(cleared);try{localStorage.removeItem('reframe-direction');}catch{}}}>&#215;</button></div>}
   {panel==='settings'&&<CreativeDirection value={direction} onClose={closeDirection} onApply={next=>{setDirection(next);try{localStorage.setItem('reframe-direction',JSON.stringify(next));}catch{}closeDirection();}}/>}
   <div className="home-under">{(error||tooLong)?<p className="home-error" role="alert">{error||"Your prompt and direction exceed 4,000 characters. Shorten the prompt to continue."}</p>:notice?<p role="status">{notice}</p>:<p>Start with a thought. Make it your own.<span className="keyboard-hint">Ctrl / Cmd + Enter</span></p>}</div>
  </section><footer className="home-footer"><span>YOUR NEXT IDEA STARTS HERE</span><span>Made for the way you imagine.</span></footer>
 </main>;
}
export function ToolDock({tool,setTool,busy}) {return <div className="tool-dock" aria-label="Canvas tools">{[['select','Select'],['move','Move'],['text','Text'],['shape','Shapes'],['cube','Components'],['settings','Filters']].map(([icon,label])=><button key={icon} disabled={busy} title={label} aria-label={label} aria-pressed={tool===icon} className={tool===icon?'active':''} onClick={()=>setTool(tool===icon&& !['select','move'].includes(icon)?'select':icon)}><Icon name={icon}/><span>{label}</span></button>)}</div>}
