const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const resizeHandles=[['nw','top left'],['n','top'],['ne','top right'],['e','right'],['se','bottom right'],['s','bottom'],['sw','bottom left'],['w','left']];
export function scaleLayer(layer,factor){
 const minimum=Math.max(10/layer.width,10/layer.height),maximum=Math.min(4000/layer.width,4000/layer.height,layer.fontSize?1024/layer.fontSize:Infinity);
 const amount=clamp(Number.isFinite(factor)?factor:1,minimum,maximum);
 return {...layer,width:layer.width*amount,height:layer.height*amount,fontSize:layer.fontSize?layer.fontSize*amount:layer.fontSize,radius:(layer.radius||0)*amount,strokeWidth:(layer.strokeWidth||0)*amount,scale:(layer.scale||1)*amount};
}
// Deltas are in canvas coordinates. Keep the opposite edge/corner fixed even when rotated.
export function resizeLayer(layer,handle,dx,dy,unlock=false){
 const angle=(layer.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const localX=c*dx+s*dy,localY=-s*dx+c*dy;
 const sx=handle.includes('e')?1:handle.includes('w')?-1:0,sy=handle.includes('s')?1:handle.includes('n')?-1:0;
 let width=clamp(layer.width+sx*localX,10,4000),height=clamp(layer.height+sy*localY,10,4000),next={...layer};
 if(sx&&sy&&!unlock){const rx=width/layer.width,ry=height/layer.height;next=scaleLayer(layer,Math.abs(rx-1)>Math.abs(ry-1)?rx:ry);width=next.width;height=next.height;}
 const shiftX=sx*(width-layer.width)/2,shiftY=sy*(height-layer.height)/2;
 return {...next,width,height,x:layer.x+layer.width/2+c*shiftX-s*shiftY-width/2,y:layer.y+layer.height/2+s*shiftX+c*shiftY-height/2};
}
