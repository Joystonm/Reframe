export const directionOptions = {
 style: [
  {id:'auto',name:'Let Reframe decide',hint:'Follow your idea',instruction:''},
  {id:'editorial',name:'Editorial',hint:'Quiet, considered, refined',instruction:'Minimal editorial art direction, generous negative space, refined visual hierarchy'},
  {id:'cinematic',name:'Cinematic',hint:'Depth, atmosphere, drama',instruction:'Cinematic art direction, atmospheric depth and deliberate dramatic framing'},
  {id:'playful',name:'Playful',hint:'Expressive shapes and color',instruction:'Playful art direction, expressive rounded forms and an optimistic character'},
  {id:'organic',name:'Organic',hint:'Natural, tactile, warm',instruction:'Organic art direction, natural forms and tactile material textures'},
  {id:'futuristic',name:'Futuristic',hint:'Precise, luminous, immersive',instruction:'Futuristic art direction, precise geometry and luminous technological details'}
 ],
 palette:[
  {id:'auto',name:'Automatic',colors:['#dddfe3','#aaaeb6','#656b75'],instruction:''},
  {id:'neutral',name:'Soft neutrals',colors:['#eee9df','#b8aa96','#534c43'],instruction:'A restrained palette of ivory, warm gray and charcoal'},
  {id:'earth',name:'Earth tones',colors:['#d6b293','#a76951','#697761'],instruction:'Earth tones with terracotta, sand and muted sage'},
  {id:'cool',name:'Cool tones',colors:['#cadbdf','#7d9daa','#415569'],instruction:'Cool slate blue, mist gray and soft teal'},
  {id:'vivid',name:'Vivid',colors:['#ec705b','#b8d459','#8071d0'],instruction:'Confident saturated colors with clear, intentional contrast'},
  {id:'mono',name:'Monochrome',colors:['#f0f0ed','#a2a29f','#292b2a'],instruction:'Monochromatic grayscale with rich tonal separation'}
 ],
 lighting:[
  {id:'auto',name:'Automatic',instruction:''},
  {id:'soft',name:'Soft & diffused',instruction:'Soft diffused light and gentle shadows'},
  {id:'dramatic',name:'High contrast',instruction:'Dramatic directional lighting with deep shadows'},
  {id:'warm',name:'Golden hour',instruction:'Warm golden-hour illumination with a gentle glow'}
 ],
 composition:[
  {id:'auto',name:'Automatic',instruction:''},
  {id:'spacious',name:'Spacious',instruction:'An uncluttered composition with generous breathing room'},
  {id:'centered',name:'Centered',instruction:'A strong centered subject with balanced visual weight'},
  {id:'dynamic',name:'Dynamic',instruction:'An asymmetric composition with a clear sense of movement'}
 ]
};
export const defaultDirection={style:'auto',palette:'auto',lighting:'auto',composition:'auto'};
export function normalizeDirection(value){return Object.fromEntries(Object.entries(directionOptions).map(([key,options])=>[key,options.some(o=>o.id===value?.[key])?value[key]:'auto']));}
export function directionChoices(value){return Object.entries(directionOptions).map(([key,options])=>({key,...options.find(o=>o.id===value[key])})).filter(o=>o.instruction);}
export function buildDirectedPrompt(prompt,value){
 const clean=prompt.trim().replace(/\n\nCreative direction\n(?:Style|Palette|Lighting|Composition): [^\n]*(?:\n(?:Style|Palette|Lighting|Composition): [^\n]*)*$/,'');
 const choices=directionChoices(value);
 return clean+(choices.length?'\n\nCreative direction\n'+choices.map(o=>o.key[0].toUpperCase()+o.key.slice(1)+': '+o.instruction+'.').join('\n'):'');
}
