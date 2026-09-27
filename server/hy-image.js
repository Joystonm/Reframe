import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {setTimeout as delay} from 'node:timers/promises';
import {AppError,requireValue} from './errors.js';

const endpoint='https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests';
const editSizes=['1024x1024','1920x1080','1080x1920','1536x1152','1152x1536'];
export function closestSize(width,height){
  const ratio=width/height;
  return editSizes.reduce((best,size)=>{
    const distance=s=>{const [w,h]=s.split('x').map(Number);return Math.abs(Math.log((w/h)/ratio));};
    return distance(size)<distance(best)?size:best;
  },editSizes[0]);
}
function safeReason(value){
  let text=typeof value==='string'?value:JSON.stringify(value||'Unknown provider error');
  for(const name of ['GMI_API_KEY','ANTHROPIC_API_KEY','CLOUDINARY_API_SECRET']){
    if(process.env[name])text=text.split(process.env[name]).join('[redacted]');
  }
  return text.slice(0,500);
}
// Check the public upload before submitting a paid edit. Do not send the GMI key.
export async function validateEditReference(referenceUrl,signal){
  let url;
  try{url=new URL(referenceUrl);}catch{throw new AppError('The edit reference URL is invalid.',502);}
  if(url.protocol!=='https:'||url.username||url.password)throw new AppError('The edit reference must use a public HTTPS URL.',502);
  const timeout=AbortSignal.timeout(30000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  try{
    const response=await fetch(url,{signal:combined});
    if(!response.ok){await response.body?.cancel();throw new AppError('The edit reference image is not publicly accessible (HTTP '+response.status+'). Check Cloudinary delivery permissions. No GMI edit was submitted.',502);}
    const limit=20*1024*1024;
    if(Number(response.headers.get('content-length'))>=limit){await response.body?.cancel();throw new AppError('The edit reference must be smaller than 20 MB. No GMI edit was submitted.',502);}
    const chunks=[];let total=0;
    for await(const chunk of response.body){total+=chunk.byteLength;if(total>=limit)throw new AppError('The edit reference must be smaller than 20 MB. No GMI edit was submitted.',502);chunks.push(chunk);}
    let metadata;
    try{metadata=await sharp(Buffer.concat(chunks),{limitInputPixels:20000000}).metadata();}catch{throw new AppError('The reference URL did not return a valid image. Check Cloudinary delivery settings. No GMI edit was submitted.',502);}
    if(!['png','jpeg','webp'].includes(metadata.format)||!metadata.width||!metadata.height)throw new AppError('The edit reference must be a PNG, JPEG or WebP image. No GMI edit was submitted.',502);
    return {bytes:total,width:metadata.width,height:metadata.height,format:metadata.format};
  }catch(error){
    if(error instanceof AppError)throw error;
    if(signal?.aborted)throw new AppError('Operation cancelled before submitting the GMI edit.',409);
    throw new AppError('The edit reference image could not be downloaded. Check Cloudinary delivery and try again. No GMI edit was submitted.',502);
  }
}
export class HyImageProvider {
  model='hy-image-v3.5-preview';
  get ready(){return !!process.env.GMI_API_KEY;}
  async generate({prompt,signal,onStatus}={}){
    return this.request({prompt,size:'1920x1080'},signal,onStatus);
  }
  async edit({prompt,referenceUrl,width,height,signal,onStatus}={}){
    if(!referenceUrl)throw new AppError('The edit needs a publicly reachable reference image.',400);
    onStatus?.('Checking the edit reference image');
    await validateEditReference(referenceUrl,signal);
    return this.request({prompt,image:[referenceUrl],size:closestSize(width||1,height||1)},signal,onStatus);
  }
  async request(payload,signal,onStatus){
    const key=requireValue(process.env.GMI_API_KEY,'GMI_API_KEY');
    if(typeof payload.prompt!=='string'||!payload.prompt.trim())throw new AppError('An image prompt is required.');
    const deadline=AbortSignal.timeout(180000);
    const combined=signal?AbortSignal.any([signal,deadline]):deadline;
    const diagnosticId=randomUUID();
    let requestId,traceId,httpStatus;
    try{
      const call=async(url,body)=>{
        const response=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:combined});
        httpStatus=response.status;
        traceId=response.headers.get('x-request-id')||response.headers.get('request-id')||traceId;
        let data;try{data=await response.json();}catch{throw new AppError('GMI returned an unreadable response (HTTP '+response.status+').',502);}
        requestId=data.request_id||requestId;
        traceId=data.outcome?.request_id||traceId;
        if(!response.ok){
          const message=response.status===401||response.status===403?'GMI rejected this key or its model permissions.':
            response.status===402?'GMI account balance is insufficient.':
            response.status===429?'GMI rate limit reached. Wait before retrying.':
            'GMI request failed (HTTP '+response.status+'): '+safeReason(data.error||data.message||data.outcome?.error||data);
          throw new AppError(message,502);
        }
        return data;
      };
      onStatus?.('Hy Image 3.5 Preview is rendering');
      // Submit once. Never retry a paid generation after a timeout.
      let result=await call(endpoint,{model:this.model,payload});
      requestId=result.request_id||requestId;
      while(result.status==='queued'||result.status==='processing'){
        if(!requestId)throw new AppError('GMI returned a pending request without its tracking ID.',502);
        onStatus?.(result.status==='queued'?'Hy request queued':'Hy Image 3.5 Preview is rendering');
        await delay(2000,undefined,{signal:combined});
        result=await call(endpoint+'/'+encodeURIComponent(requestId));
      }
      if(result.status!=='success')throw new AppError('Hy generation '+(result.status||'returned an unknown status')+': '+safeReason(result.outcome?.error)+ (requestId?' (request '+requestId+')':''),502);
      if(result.model&&result.model!==this.model)throw new AppError('GMI returned a different model than the requested Hy Image 3.5 Preview.',502);
      const media=result.outcome?.media_urls?.find(item=>item.url&&(!item.type||item.type==='image'));
      if(!media)throw new AppError('Hy completed without returning an image URL.',502);
      const url=new URL(media.url);
      if(url.protocol!=='https:'||url.username||url.password)throw new AppError('Hy returned an invalid image URL.',502);
      onStatus?.('Downloading the generated image');
      const image=await fetch(url,{signal:combined});
      if(!image.ok)throw new AppError('The generated image could not be downloaded (HTTP '+image.status+'). Request '+requestId,502);
      const chunks=[];let total=0;
      for await(const chunk of image.body){
        total+=chunk.byteLength;
        if(total>40*1024*1024)throw new AppError('The generated image exceeds the 40 MB download limit.',502);
        chunks.push(chunk);
      }
      return {bytes:Buffer.concat(chunks),requestId,upstreamRequestId:result.outcome?.request_id,model:this.model,size:payload.size,createdAt:result.created_at};
    }catch(error){
      console.error('[GMI diagnostic] '+JSON.stringify({
        diagnosticId,requestId:requestId?safeReason(requestId):null,traceId:traceId?safeReason(traceId):null,
        httpStatus,model:this.model,operation:payload.image?'edit':'generate',size:payload.size,
        promptCharacters:payload.prompt.length,referenceCount:payload.image?.length||0,
        error:error instanceof AppError?safeReason(error.message):'Provider transport or response processing failed.'
      }));
      if(error instanceof AppError){
        const tracking=requestId||traceId;
        throw new AppError(error.message+(tracking?' GMI request: '+safeReason(tracking)+'.':' GMI did not supply a request ID.')+' Diagnostic: '+diagnosticId+'.',error.status);
      }
      if(signal?.aborted)throw new AppError('Stopped waiting for Hy. A submitted generation may still finish and be billed.'+(requestId?' Request: '+requestId:''),409);
      if(deadline.aborted)throw new AppError('Hy exceeded the 3-minute timeout. Do not resubmit blindly; check the request in GMI.'+(requestId?' Request: '+requestId:''),504);
      throw new AppError('Unable to complete the Hy request. Check GMI connectivity. No automatic retry was made.'+(requestId?' Request: '+requestId:''),502);
    }
  }
}
