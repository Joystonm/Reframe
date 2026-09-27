import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {HyImageProvider,MiniMaxProvider,CloudinaryStorage} from './providers.js';
import {boxSchema,normalizedPng,createEditRegion,composeRegion} from './regions.js';
import {readAsset,saveAsset,saveScene,readScene} from './store.js';
import {AppError} from './errors.js';
import {transformCloudinaryImage} from './cloudinary-filters.js';
export const hy=new HyImageProvider(),minimax=new MiniMaxProvider(),cloud=new CloudinaryStorage();
const detectedEntity=z.object({name:z.string().min(1).max(100),type:z.string().max(60),description:z.string().max(1000),box:boxSchema,depth:z.number().int().min(0).max(100),relationships:z.array(z.string().max(200)).max(12)});
export function normalizeDetection(raw){
 const entities=[],issues=[];
 if(!raw||!Array.isArray(raw.entities))return {entities,issues:['Expected an entities array'],title:'Generated image'};
 const title=typeof raw.scene==='string'&&raw.scene.trim()?raw.scene.trim().slice(0,200):'Generated image';
 for(const [index,item] of raw.entities.slice(0,40).entries()){
  if(!item||typeof item!=='object'){issues.push('Entity '+index+' is not an object');continue;}
  const box={};
  for(const key of ['x','y','width','height']){const value=item.box?.[key];box[key]=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;}
  // Repair only sub-pixel rounding at normalized edges, never guess coordinate units.
  for(const [position,size] of [['x','width'],['y','height']]){
   if(box[position]<0&&box[position]>=-.001)box[position]=0;
   if(box[position]>=0&&box[position]<1&&box[size]>0&&box[position]+box[size]>1&&box[position]+box[size]<=1.001)box[size]=1-box[position];
  }
  const candidate={name:typeof item.name==='string'?item.name.trim().slice(0,100):'',type:typeof item.type==='string'?item.type.slice(0,60):'object',description:typeof item.description==='string'?item.description.slice(0,1000):'',box,depth:Number.isFinite(Number(item.depth))?Math.max(0,Math.min(100,Math.round(Number(item.depth)))):0,relationships:Array.isArray(item.relationships)?item.relationships.filter(r=>typeof r==='string').slice(0,12).map(r=>r.slice(0,200)):[]};
  const parsed=detectedEntity.safeParse(candidate);
  if(parsed.success)entities.push(parsed.data);else issues.push('Entity '+index+': '+parsed.error.issues.map(i=>i.path.join('.')+' '+i.message).join('; '));
 }
 return {title,entities,issues};
}

const planSchema=z.object({targetEntity:z.string().nullable(),operation:z.enum(['modify','remove','move','resize','replace']),instruction:z.string().min(1).max(3000),reason:z.string().max(1000),editBox:boxSchema.optional()});
function validate(schema,value){const result=schema.safeParse(value);if(!result.success)throw new AppError('MiniMax returned invalid structured data. Retry the operation.',502);return result.data;}
export async function analyze(bytes,signal){
  const instruction='Inspect the actual image. Identify up to 24 distinguishable visible entities useful for editing, including separate signs and individual people only when clearly visible. Use readable names such as Ferris Wheel. Return {scene:string,entities:[{name:string,type:string,description:string,box:{x:number,y:number,width:number,height:number},depth:integer 0..100,relationships:string[]}]}. Coordinates are normalized 0..1 from top-left. Width and height must be positive; x+width and y+height must each be <=1. Use tight complete rectangles. Relationships are an array of strings, not objects. These are approximate regions, NOT segmentation masks. Do not derive objects from any requested prompt.';
  let feedback='';
  for(let attempt=0;attempt<2;attempt++){
    const raw=await minimax.json(instruction+feedback,bytes,signal);
    const parsed=normalizeDetection(raw);
    if(parsed.entities.length){
      return {title:parsed.title,warning:parsed.issues.length?"Some invalid regions were omitted. Review the detected boundaries before editing.":null,entities:parsed.entities.map(e=>({...e,id:randomUUID(),regionKind:'approximate-box',source:'MiniMax-M3 image analysis',editHistory:[],removed:false}))};
    }
    feedback=' Your previous response did not validate. Correct these schema errors: '+JSON.stringify(parsed.issues)+'. Return a complete corrected JSON object based on the image.';
  }
  throw new AppError('MiniMax returned invalid entity regions after a correction attempt. The original is saved; retry analysis.',502);
}

async function persistImage(bytes){const local=await saveAsset(bytes);const remoteUrl=await cloud.upload(bytes,local.id);return {url:local.url,remoteUrl};}
export async function generateScene(prompt,job){
  job.stage='Generating scene with Hy Image 3.5 Preview';
  const result=await hy.generate({prompt,signal:job.controller.signal,onStatus:s=>job.stage=s});
  const normalized=await normalizedPng(result.bytes);
  job.stage='Storing original image';
  const asset=await persistImage(normalized.bytes);
  const scene={id:randomUUID(),title:'New scene',prompt,createdAt:new Date().toISOString(),width:normalized.width,height:normalized.height,current:0,versions:[{id:randomUUID(),...asset,createdAt:new Date().toISOString(),label:'Original',entities:[],provenance:{model:result.model,requestId:result.requestId,upstreamRequestId:result.upstreamRequestId,size:result.size,prompt}}]};
  await saveScene(scene);job.sceneId=scene.id;
  job.stage='Understanding visible entities with MiniMax M3';
  try{
    const analysis=await analyze(normalized.bytes,job.controller.signal);
    scene.title=analysis.title;scene.versions[0].entities=analysis.entities;scene.analysisWarning=analysis.warning;
  }catch(error){
    if(job.controller.signal.aborted)throw error;
    scene.analysisWarning='Your image is saved, but editable-region analysis did not finish. '+(error instanceof AppError?error.message:'Retry analysis of this saved image.');
  }
  await saveScene(scene);return scene;
}
export async function reanalyze(id,job){
  const scene=await readScene(id),version=scene.versions[scene.current];
  if(version.entities.length)throw new AppError('Existing entity identities are preserved. Adjust individual regions instead of replacing the scene analysis.');
  job.stage='Understanding visible entities with MiniMax M3';
  const analysis=await analyze(await readAsset(version.url),job.controller.signal);
  scene.title=analysis.title;version.entities=analysis.entities;scene.analysisWarning=analysis.warning;await saveScene(scene);return scene;
}
export async function planEdit(scene,instruction,selectedId,signal){
  const version=scene.versions[scene.current],entities=version.entities.filter(e=>!e.removed||e.id===selectedId);
  if(!entities.length)throw new AppError('Analyze this scene before editing.');
  const selectedLayer=entities.find(e=>e.id===selectedId&&e.regionKind==='image-layer');
  if(selectedLayer)return {box:selectedLayer.box,targetEntity:selectedLayer.id,operation:'modify',instruction,reason:'Apply this change to the selected image. All other Canvas layers stay unchanged.',entity:selectedLayer,versionId:version.id,sceneId:scene.id};

  const plan=validate(planSchema,await minimax.json('Interpret ONE localized image edit. Inspect the actual image and return {targetEntity:existing entity id or null if ambiguous,operation:modify|remove|move|resize|replace,instruction:string,reason:string,editBox:{x:number,y:number,width:number,height:number}}. editBox uses normalized coordinates and must contain the target plus any new silhouette, connection points and a small blending margin. For wings or attached parts, include the attachment junction and room for feathers. Keep nearby body anatomy, pose and outline intact. Do not unnecessarily include unrelated objects. If selectedId is supplied, pronouns refer to it, but do not override an explicitly named target. Do not invent ids. Instruction must describe the visual change and preserve surrounding content. DATA: '+JSON.stringify({instruction,selectedId,entities}),await readAsset(version.url),signal));
  const entity=entities.find(e=>e.id===plan.targetEntity);
  if(!entity)throw new AppError('The target is ambiguous. Select an entity and describe one change.');
  const proposed=plan.editBox||entity.box,left=Math.min(entity.box.x,proposed.x),top=Math.min(entity.box.y,proposed.y),right=Math.min(1,Math.max(entity.box.x+entity.box.width,proposed.x+proposed.width)),bottom=Math.min(1,Math.max(entity.box.y+entity.box.height,proposed.y+proposed.height));
  const box={x:left,y:top,width:right-left,height:bottom-top};
  return {...plan,box,entity,versionId:version.id,sceneId:scene.id};
}
export async function applyEdit(plan,box,job){
  const scene=await readScene(plan.sceneId),version=scene.versions[scene.current];
  if(version.id!==plan.versionId)throw new AppError('Scene changed. Prepare the edit again.',409);
  if(!hy.ready)await hy.edit();
  if(!cloud.configured())throw new AppError('Configure Cloudinary to deliver the context reference image to Hy.',503);
  const entity=version.entities.find(e=>e.id===plan.targetEntity);
  if(!entity||(entity.removed&&plan.operation!=='remove'))throw new AppError('Entity is unavailable. Choose removal to clean up a previously removed object.',409);
  const bytes=await readAsset(version.url),region=await createEditRegion(bytes,box,{fullReference:true,removal:plan.operation==='remove',feather:Math.max(8,Math.round(Math.min(scene.width,scene.height)*.012))});
  job.stage='Preparing target and context';
  const contextAsset=await persistImage(region.crop);
  const ref=region.reference;
  const localBox={x:(ref.left+box.x*ref.fitWidth)/ref.width,y:(ref.top+box.y*ref.fitHeight)/ref.height,width:box.width*ref.fitWidth/ref.width,height:box.height*ref.fitHeight/ref.height};
  const nearby=version.entities.filter(e=>e.id!==entity.id&&!e.removed&&e.box.x<box.x+box.width&&e.box.x+e.box.width>box.x&&e.box.y<box.y+box.height&&e.box.y+e.box.height>box.y).map(e=>({name:e.name,description:e.description,relationships:e.relationships}));
  const hairInstruction=/\b(hair|hairy|fur|furry|mane|beard|fur coat)\b/i.test(plan.instruction)?' For a hair or fur change, treat the existing face as locked: preserve eyes, pupils, eyebrows, nose, mouth, teeth, tongue, horns, skin color, head silhouette and facial expression exactly. Add hair only around the outside/top surface of the head and do not replace the face with an animal, lion, muzzle or new character. ':'';
  const removalInstruction=plan.operation==='remove'?' Completely erase the target, including every outline, pale silhouette, shadow, reflection and ghost trace. Reconstruct the background continuously. Do not turn it white, translucent or faint; it must cease to exist. Preserve the contours of remaining foreground objects. ':'';
  const prompt='Edit the supplied image. Requested change: '+plan.instruction+'. Target: '+entity.name+'. Target appearance: '+entity.description+'. Editable area (normalized x, y, width, height): '+JSON.stringify(localBox)+'. Return the entire image with the same framing and aspect ratio. Keep pixels outside the editable area unchanged. Inside it, follow the requested change, including changes to size or position when requested. Preserve unrelated objects, perspective, lighting and visual style. Keep gray padding unchanged. '+hairInstruction+removalInstruction+'Overlapping objects to preserve: '+JSON.stringify(nearby.map(e=>({name:e.name,relationships:e.relationships})))+'.';
  job.stage='Reframing '+entity.name;
  const result=await hy.edit({prompt,referenceUrl:contextAsset.remoteUrl,width:region.context.width,height:region.context.height,signal:job.controller.signal,onStatus:s=>job.stage=s});
  if(job.controller.signal.aborted)throw new AppError('Operation cancelled.',409);
  job.stage='Compositing approved region';
  const composed=await composeRegion(bytes,result.bytes,region);
  // Boundary color differences are diagnostics, not evidence of geometric movement.
  // composeRegion preserves original pixels outside the approved box and blends inward.
  if(composed.change.changedPixels===0||(composed.change.visibleFraction<0.001&&composed.change.meanDifference<0.5))throw new AppError('The image provider returned no visible change inside the selected region. Your original is unchanged. Try a more specific visual instruction or review the edit region.',422);
  const asset=await persistImage(composed.bytes);
  const entities=structuredClone(version.entities),edited=entities.find(e=>e.id===entity.id),now=new Date().toISOString();
  edited.editHistory.push({instruction:plan.instruction,operation:plan.operation,createdAt:now});
  edited.description=entity.description+'; requested edit: '+plan.instruction;
  edited.lastEditRegion=box;edited.removed=plan.operation==='remove';edited.source='Persistent entity; region reviewed by user';
  const newVersion={id:randomUUID(),...asset,parentId:version.id,entities,createdAt:now,label:entity.name+' — '+plan.instruction,targetId:entity.id,region:box,change:composed.change,boundary:composed.boundary,cleanup:composed.cleanup,preservation:composed.preservation,provenance:{model:result.model,requestId:result.requestId,upstreamRequestId:result.upstreamRequestId,size:result.size,prompt}};
  scene.versions.push(newVersion);scene.current=scene.versions.length-1;await saveScene(scene);return scene;
}

// Imported layers keep their own scene/version history; they never replace the canvas background.
export async function importLayerImage(bytes){
 let normalized;
 try{normalized=await normalizedPng(bytes);}catch{throw new AppError('Choose a valid image smaller than 20 megapixels.',400);}
 const asset=await saveAsset(normalized.bytes),now=new Date().toISOString();
 const entity={id:randomUUID(),name:'Selected image',type:'image',description:'The complete image selected by the user. Apply the requested visual change to this image.',box:{x:0,y:0,width:1,height:1},depth:0,relationships:[],editHistory:[],removed:false,regionKind:'image-layer',source:'User upload'};
 const scene={id:randomUUID(),title:'Uploaded image',prompt:'',createdAt:now,width:normalized.width,height:normalized.height,current:0,versions:[{id:randomUUID(),url:asset.url,createdAt:now,label:'Original upload',entities:[entity]}]};
 await saveScene(scene);return scene;
}

export async function applyFilter(id,settings,job){
 const scene=await readScene(id),version=scene.versions[scene.current];
 if(version.id!==settings.versionId)throw new AppError('The image changed. Apply the filter again.',409);
 const box={x:0,y:0,width:1,height:1};
 const original=await readAsset(version.url),region=await createEditRegion(original,box);
 job.stage='Applying Cloudinary '+settings.preset+' filter';
 const transformed=await transformCloudinaryImage(cloud,region.crop,settings,randomUUID(),job.controller.signal);
 if(job.controller.signal.aborted)throw new AppError('Filter cancelled.',409);
 const composed=await composeRegion(original,transformed,region);
 if(!composed.change.changedPixels)throw new AppError('This filter made no change to the selected image. Try another preset or adjustment.',422);
 job.stage='Saving filtered image';const asset=await persistImage(composed.bytes),now=new Date().toISOString();
 const entities=structuredClone(version.entities);
 scene.versions.push({id:randomUUID(),...asset,parentId:version.id,createdAt:now,label:'Whole image filter: '+settings.preset,entities,region:box,change:composed.change,boundary:composed.boundary,cleanup:composed.cleanup,preservation:composed.preservation,filter:{preset:settings.preset,brightness:settings.brightness,contrast:settings.contrast,saturation:settings.saturation}});
 scene.current=scene.versions.length-1;await saveScene(scene);return scene;
}
