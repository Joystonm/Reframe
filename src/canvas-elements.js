export const presets={
 text:[{name:'Heading',text:'A bold new idea',fontSize:64,fontWeight:700,width:680,height:170},{name:'Subheading',text:'Make room for something great.',fontSize:32,fontWeight:500,width:620,height:110},{name:'Body text',text:'Every great design begins with a thought. Give yours room to grow.',fontSize:22,width:430,height:160},{name:'Label',text:'CREATED WITH INTENTION',fontSize:14,fontWeight:700,width:340,height:55}],
 shape:['rectangle','ellipse','triangle','diamond','star','line'].map(shape=>({name:shape[0].toUpperCase()+shape.slice(1),shape,width:240,height:shape==='line'?30:200,color:'#9dae9d',stroke:'#354a3b',strokeWidth:shape==='line'?4:0})),
 cube:[{name:'Button',component:'button',text:'Get started',width:240,height:64,background:'#26382e',color:'#ffffff',fontSize:20,radius:14},{name:'Badge',component:'badge',text:'NEW RELEASE',width:210,height:48,background:'#e3eadf',color:'#4e6248',fontSize:14,fontWeight:700,radius:24},{name:'Feature card',component:'card',text:'Space for your next idea',body:'Bring a little clarity to something extraordinary.',width:380,height:230,background:'#f0f2e9',color:'#2e3c30',fontSize:28,radius:20},{name:'Quote',component:'quote',text:'Great things begin with a little curiosity.',body:'Your name / Designer',width:430,height:250,background:'#f3ebe2',color:'#584638',fontSize:30,fontFamily:'Georgia',radius:16}]
};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=(v,fallback,min=0,max=4000)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));
function textSvg(text,x,y,width,size,layer){
 const weight=layer.fontWeight||400,font=['Arial','Georgia','Verdana','Courier New'].includes(layer.fontFamily)?layer.fontFamily:'Arial';
 const align=layer.align||'left',anchor=align==='center'?'middle':align==='right'?'end':'start',tx=align==='center'?x+width/2:align==='right'?x+width:x;
 const limit=Math.max(1,Math.floor(width/(size*(font==='Courier New'?.61:.56)))),lines=[];
 for(const paragraph of String(text||'').split('\n')){let line='';for(const word of paragraph.split(' ')){if(line&&line.length+word.length+1>limit){lines.push(line);line='';}for(let part=word;part.length>limit;part=part.slice(limit)){if(line){lines.push(line);line='';}lines.push(part.slice(0,limit));}const tail=word.length>limit?word.slice(Math.floor((word.length-1)/limit)*limit):word;line+=(line?' ':'')+tail;}lines.push(line);}
 return '<text fill="'+esc(layer.color||'#202124')+'" font-family="'+font+'" font-size="'+size+'" font-weight="'+num(weight,400,100,900)+'" font-style="'+(layer.italic?'italic':'normal')+'" text-anchor="'+anchor+'">'+lines.map((line,i)=>'<tspan x="'+tx+'" y="'+(y+size+i*size*num(layer.lineHeight,1.25,.8,2))+'">'+esc(line)+'</tspan>').join('')+'</text>';
}
export function layerSvg(layer){
 const w=num(layer.width,240,10),h=num(layer.height,160,10),radius=num(layer.radius,0,0,Math.min(w,h)/2),size=num(layer.fontSize,24,1,1024);
 const unit=num(layer.scale,1,.001,400);
 let content='';
 if(layer.type==='shape'){
  const stroke=num(layer.strokeWidth,0,0,Math.min(w,h)),inset=stroke/2,fill=esc(layer.color||'#a8b7a5'),attrs=' fill="'+fill+'" stroke="'+esc(layer.stroke||'#26382e')+'" stroke-width="'+stroke+'"';
  if(layer.shape==='ellipse')content='<ellipse cx="'+w/2+'" cy="'+h/2+'" rx="'+(w-stroke)/2+'" ry="'+(h-stroke)/2+'"'+attrs+'/>';
  else if(layer.shape==='line')content='<path d="M0 '+h/2+' H'+w+'" stroke="'+esc(layer.stroke||layer.color)+'" stroke-width="'+Math.max(1,stroke)+'"/>';
  else if(['triangle','diamond','star'].includes(layer.shape)){
   let points=layer.shape==='triangle'?[[w/2,inset],[w-inset,h-inset],[inset,h-inset]]:layer.shape==='diamond'?[[w/2,inset],[w-inset,h/2],[w/2,h-inset],[inset,h/2]]:Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?.43:1;return [w/2+Math.cos(a)*(w/2-inset)*r,h/2+Math.sin(a)*(h/2-inset)*r];});
   content='<polygon points="'+points.map(p=>p.join(',')).join(' ')+'"'+attrs+'/>';
  }else content='<rect x="'+inset+'" y="'+inset+'" width="'+(w-stroke)+'" height="'+(h-stroke)+'" rx="'+radius+'"'+attrs+'/>';
 }else if(layer.type==='cube'){
  content='<rect width="'+w+'" height="'+h+'" rx="'+radius+'" fill="'+esc(layer.background||'#f0f2f4')+'"/>';
  if(['button','badge'].includes(layer.component))content+=textSvg(layer.text,12*unit,(h-size*1.25)/2,w-24*unit,size,{...layer,align:'center'});
  else{content+=textSvg(layer.text,24*unit,24*unit,w-48*unit,size,layer);content+=textSvg(layer.body,24*unit,h-76*unit,w-48*unit,14*unit,{...layer,fontWeight:400});}
 }else content=textSvg(layer.text,8*unit,5*unit,w-16*unit,size,layer);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+content+'</svg>';
}
