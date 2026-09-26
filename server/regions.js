import sharp from 'sharp';
import {z} from 'zod';
import {AppError} from './errors.js';
import {closestSize} from './hy-image.js';
export const boxSchema=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1)}).refine(b=>b.x+b.width<=1.000001&&b.y+b.height<=1.000001,'Region must stay inside image');
export function pixelBox(b,width,height,padding=0){
  const left=Math.max(0,Math.floor((b.x-padding)*width)),top=Math.max(0,Math.floor((b.y-padding)*height));
  const right=Math.min(width,Math.ceil((b.x+b.width+padding)*width)),bottom=Math.min(height,Math.ceil((b.y+b.height+padding)*height));
  return {left,top,width:right-left,height:bottom-top};
}
export async function normalizedPng(bytes){
  try{const image=sharp(bytes,{limitInputPixels:20000000}).rotate().toColourspace('srgb').removeAlpha();const data=await image.png().toBuffer();const {width,height}=await sharp(data).metadata();return {bytes:data,width,height};}
  catch{throw new AppError('The provider returned an invalid or oversized image.',502);}
}
export async function createEditRegion(bytes,box,{fullReference=false,feather=0,removal=false}={}){
  const {width,height}=await sharp(bytes).metadata();
  const target=pixelBox(box,width,height);
  if(fullReference){
    const [referenceWidth,referenceHeight]=closestSize(width,height).split('x').map(Number);
    const scale=Math.min(referenceWidth/width,referenceHeight/height),fitWidth=Math.round(width*scale),fitHeight=Math.round(height*scale);
    const left=Math.floor((referenceWidth-fitWidth)/2),top=Math.floor((referenceHeight-fitHeight)/2);
    const crop=await sharp(bytes).resize(fitWidth,fitHeight).extend({left,right:referenceWidth-fitWidth-left,top,bottom:referenceHeight-fitHeight-top,background:'#808080'}).png().toBuffer();
    const reference={width:referenceWidth,height:referenceHeight,left,top,fitWidth,fitHeight};
    return {target,context:{left:0,top:0,width:referenceWidth,height:referenceHeight},crop,width,height,reference,feather,removal};
  }
  const context=pixelBox(box,width,height,0.04);
  const crop=await sharp(bytes).extract(context).png().toBuffer();
  return {target,context,crop,width,height,feather,removal};
}
export async function composeRegion(original,generated,region){
  const {target,context,width,height}=region;
  let full,patch,cleanup;
  if(region.reference){
    const ref=region.reference,metadata=await sharp(generated).metadata();
    if(Math.abs(Math.log((metadata.width/metadata.height)/(ref.width/ref.height)))>.01)throw new AppError('The provider changed the image proportions. The edit was not applied; your original is unchanged.',422);
    const referencePixels=await sharp(generated,{limitInputPixels:20000000}).rotate().resize(ref.width,ref.height).png().toBuffer();
    full=await sharp(referencePixels).extract({left:ref.left,top:ref.top,width:ref.fitWidth,height:ref.fitHeight}).resize(width,height).removeAlpha().toColourspace('srgb').raw().toBuffer();
    if(region.removal)cleanup=cleanRemovalBackground(full,width,height,target);
    patch=await sharp(full,{raw:{width,height,channels:3}}).extract(target).raw().toBuffer();
  }else{
    patch=await sharp(generated,{limitInputPixels:20000000}).rotate().resize(context.width,context.height,{fit:'fill'}).removeAlpha().toColourspace('srgb').extract({left:target.left-context.left,top:target.top-context.top,width:target.width,height:target.height}).raw().toBuffer();
  }
  const raw=await sharp(original).removeAlpha().toColourspace('srgb').raw().toBuffer();
  const boundary={pixels:0,visiblePixels:0,meanDifference:0,visibleFraction:0};
  if(full){
    const collar=Math.max(3,Math.round(Math.min(width,height)*.008));let difference=0;
    for(let y=Math.max(0,target.top-collar);y<Math.min(height,target.top+target.height+collar);y++)for(let x=Math.max(0,target.left-collar);x<Math.min(width,target.left+target.width+collar);x++){
      if(x>=target.left&&x<target.left+target.width&&y>=target.top&&y<target.top+target.height)continue;
      const offset=(y*width+x)*3;let maximum=0;
      for(let c=0;c<3;c++){const d=Math.abs(raw[offset+c]-full[offset+c]);difference+=d;maximum=Math.max(maximum,d);}
      boundary.pixels++;if(maximum>=24)boundary.visiblePixels++;
    }
    boundary.meanDifference=boundary.pixels?difference/(boundary.pixels*3):0;
    boundary.visibleFraction=boundary.pixels?boundary.visiblePixels/boundary.pixels:0;
  }
  let changedPixels=0,visibleChangedPixels=0,totalDifference=0;
  const feather=Math.min(region.feather||0,Math.floor(Math.min(target.width,target.height)/8));
  for(let row=0;row<target.height;row++)for(let col=0;col<target.width;col++){
    const source=((target.top+row)*width+target.left+col)*3,destination=(row*target.width+col)*3;
    const distances=[];
    if(target.left>0)distances.push(col);if(target.top>0)distances.push(row);
    if(target.left+target.width<width)distances.push(target.width-1-col);if(target.top+target.height<height)distances.push(target.height-1-row);
    const t=feather&&distances.length?Math.min(1,Math.min(...distances)/feather):1,alpha=t*t*(3-2*t);
    let largest=0;
    for(let channel=0;channel<3;channel++){
      const before=raw[source+channel],after=Math.round(before*(1-alpha)+patch[destination+channel]*alpha);
      const difference=Math.abs(before-after);largest=Math.max(largest,difference);totalDifference+=difference;raw[source+channel]=after;
    }
    if(largest>0)changedPixels++;if(largest>=8)visibleChangedPixels++;
  }
  const targetPixels=target.width*target.height;
  const change={changedPixels,visibleChangedPixels,targetPixels,visibleFraction:visibleChangedPixels/targetPixels,meanDifference:totalDifference/(targetPixels*3)};
  const bytes=await sharp(raw,{raw:{width,height,channels:3}}).png().toBuffer();
  return {bytes,change,boundary,cleanup,preservation:{outsideChangedPixels:0,protectedPixels:width*height-target.width*target.height,totalPixels:width*height,featherPixels:feather,method:'Original RGB preserved outside approved region; inward edge blend'}};
}

// Remove faint, background-connected residue only when a uniform background is measurable.
// Strong foreground edges get a two-pixel guard to retain antialiasing and anatomy.
export function cleanRemovalBackground(raw,width,height,target){
 const samples=[];
 const sample=(x,y)=>{if(x>=0&&x<width&&y>=0&&y<height){const i=(y*width+x)*3;samples.push([raw[i],raw[i+1],raw[i+2]]);}};
 for(let x=target.left;x<target.left+target.width;x+=3){sample(x,target.top-2);sample(x,target.top+target.height+1);}
 for(let y=target.top;y<target.top+target.height;y+=3){sample(target.left-2,y);sample(target.left+target.width+1,y);}
 if(samples.length<20)return {cleanedPixels:0,reason:'No surrounding background sample'};
 const background=[0,1,2].map(c=>samples.map(p=>p[c]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]);
 const confidence=samples.filter(p=>p.every((n,c)=>Math.abs(n-background[c])<=3)).length/samples.length;
 if(confidence<.75)return {cleanedPixels:0,reason:'Background is not uniform enough for automatic cleanup'};
 const count=target.width*target.height,visited=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0,cleanedPixels=0;
 const offset=(x,y)=>((target.top+y)*width+target.left+x)*3;
 function enqueue(x,y){if(x<0||y<0||x>=target.width||y>=target.height)return;const n=y*target.width+x;if(visited[n])return;visited[n]=1;const i=offset(x,y);if([0,1,2].every(c=>Math.abs(raw[i+c]-background[c])<=28))queue[tail++]=n;}
 for(let x=0;x<target.width;x++){enqueue(x,0);enqueue(x,target.height-1);}for(let y=0;y<target.height;y++){enqueue(0,y);enqueue(target.width-1,y);}
 while(head<tail){const n=queue[head++],x=n%target.width,y=Math.floor(n/target.width),i=offset(x,y);let protectedEdge=false;
  for(let dy=-2;dy<=2&&!protectedEdge;dy++)for(let dx=-2;dx<=2;dx++){
   const px=target.left+x+dx,py=target.top+y+dy;if(px<0||py<0||px>=width||py>=height)continue;const j=(py*width+px)*3;
   if([0,1,2].some(c=>Math.abs(raw[j+c]-background[c])>70)){protectedEdge=true;break;}
  }
  if(!protectedEdge&&[0,1,2].some(c=>raw[i+c]!==background[c])){for(let c=0;c<3;c++)raw[i+c]=background[c];cleanedPixels++;}
  enqueue(x-1,y);enqueue(x+1,y);enqueue(x,y-1);enqueue(x,y+1);
 }
 return {cleanedPixels,background,confidence,method:'Uniform background-connected residue cleanup with foreground edge protection'};
}
export async function cleanupRemovedObject(bytes,box){
 const {data,info}=await sharp(bytes).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
 const cleanup=cleanRemovalBackground(data,info.width,info.height,pixelBox(box,info.width,info.height));
 return {bytes:await sharp(data,{raw:{width:info.width,height:info.height,channels:3}}).png().toBuffer(),cleanup};
}
