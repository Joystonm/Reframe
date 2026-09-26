import {AppError} from './errors.js';
export const filterPresets={original:[],mono:['e_grayscale'],sepia:['e_sepia:70'],vivid:['e_saturation:30','e_contrast:10'],warm:['e_red:12','e_blue:-8'],cool:['e_blue:12','e_red:-8'],soft:['e_blur:150'],sharpen:['e_sharpen:100']};
export function filterTransform(settings){
 if(!Object.hasOwn(filterPresets,settings.preset))throw new AppError('Unknown filter.',400);
 const parts=[...filterPresets[settings.preset]];
 for(const [key,min,max] of [['brightness',-50,50],['contrast',-50,50],['saturation',-100,100]]){const value=settings[key]??0;if(!Number.isInteger(value)||value<min||value>max)throw new AppError('Invalid filter adjustment.',400);if(value)parts.push('e_'+key+':'+value);}
 if(!parts.length)throw new AppError('Choose a filter or adjust a slider first.',400);
 return parts.join('/')+'/f_png';
}
export async function transformCloudinaryImage(cloud,bytes,settings,id,signal){
 const transformation=filterTransform(settings);
 if(!cloud.configured())throw new AppError('Configure Cloudinary to use image filters.',503);
 const remote=await cloud.upload(bytes,id),url=new URL(remote);
 if(url.protocol!=='https:'||url.hostname!=='res.cloudinary.com'||!url.pathname.includes('/image/upload/'))throw new AppError('Cloudinary returned an unsupported delivery URL.',502);
 url.pathname=url.pathname.replace('/image/upload/','/image/upload/'+transformation+'/');
 const response=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});
 if(!response.ok)throw new AppError(response.status===401||response.status===403?'Cloudinary blocked this transformation. Enable these image transformations in your Cloudinary account.':'Cloudinary could not apply the filter (HTTP '+response.status+').',502);
 const chunks=[];let length=0;
 for await(const chunk of response.body){length+=chunk.byteLength;if(length>40*1024*1024)throw new AppError('Filtered image is too large.',502);chunks.push(chunk);}
 return Buffer.concat(chunks);
}
