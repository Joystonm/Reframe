import './config.js';
import express from 'express';
import path from 'node:path';
import {randomUUID,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {AppError} from './errors.js';
import {initStore,dataDir,readScene,saveScene} from './store.js';
import {boxSchema} from './regions.js';
import {hy,cloud,generateScene,reanalyze,planEdit,applyEdit,importLayerImage,applyFilter} from './services.js';
const app=express(),jobs=new Map(),plans=new Map(),locks=new Set();
const secret=randomBytes(32),password=process.env.WORKSPACE_PASSWORD;
if(process.env.NODE_ENV==='production'&&!password)throw new Error('WORKSPACE_PASSWORD is required in production.');
const sign=v=>createHmac('sha256',secret).update(v).digest('hex');
function equal(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);}
function authorized(req){if(!password)return true;const cookie=req.headers.cookie?.split('; ').find(s=>s.startsWith('reframe='))?.slice(8)||'';const [expires,sig]=cookie.split('.');return Number(expires)>Date.now()&&equal(sign(expires),sig);}
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  if(req.method!=='GET'&&req.headers.origin){
    try{const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host&&origin.origin!==process.env.FRONTEND_ORIGIN)throw new Error();}catch{return res.status(403).json({error:'Cross-origin request rejected.'});}
  }
  next();
});
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.get('/api/session',(req,res)=>res.json({authenticated:authorized(req),protected:!!password}));
const loginAttempts=new Map();
app.post('/api/session',(req,res)=>{
  const ip=req.ip,attempt=loginAttempts.get(ip)||{count:0,until:Date.now()+60000};
  if(attempt.until<Date.now()){attempt.count=0;attempt.until=Date.now()+60000;}
  attempt.count++;loginAttempts.set(ip,attempt);
  if(attempt.count>10)return res.status(429).json({error:'Too many sign-in attempts. Wait a minute.'});
  if(password&&!equal(req.body.password,password))return res.status(401).json({error:'Incorrect workspace password.'});
  const expires=String(Date.now()+86400000);
  res.setHeader('Set-Cookie','reframe='+expires+'.'+sign(expires)+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400'+(process.env.NODE_ENV==='production'?'; Secure':''));
  res.json({authenticated:true});
});
app.use(['/api','/assets'],(req,res,next)=>authorized(req)?next():res.status(401).json({error:'Sign in to this private workspace.'}));
app.get('/api/config',(_req,res)=>res.json({hy:{ready:hy.ready,model:hy.model,reason:hy.ready?null:'Configure GMI_API_KEY to generate with Hy Image 3.5 Preview.'},minimax:!!process.env.ANTHROPIC_API_KEY,cloudinary:cloud.configured()}));
function parse(schema,value){const r=schema.safeParse(value);if(!r.success)throw new AppError('Invalid request. Check the instruction and region bounds.');return r.data;}
function startJob(key,run){
  if(locks.has(key))throw new AppError('This scene already has an operation running.',409);
  if([...jobs.values()].some(j=>j.status==='running'))throw new AppError('Another operation is running. Wait for it to finish.',409);
  const id=randomUUID(),job={id,status:'running',stage:'Preparing',createdAt:Date.now(),controller:new AbortController()};
  jobs.set(id,job);locks.add(key);
  Promise.resolve().then(()=>run(job)).then(scene=>{job.status='complete';job.sceneId=scene.id;job.stage='Complete';}).catch(e=>{job.status=job.controller.signal.aborted?'cancelled':'failed';job.error=e instanceof AppError?e.message:'Operation failed. The saved scene remains available.';}).finally(()=>locks.delete(key));
  return {jobId:id};
}
app.post('/api/layer-images',express.raw({type:['image/png','image/jpeg','image/webp'],limit:'10mb'}),async(req,res)=>{
  if(!Buffer.isBuffer(req.body)||!req.body.length)throw new AppError('Upload a PNG, JPEG or WebP image.',400);
  res.status(201).json(await importLayerImage(req.body));
});
app.post('/api/scenes',(req,res)=>{
  const {prompt}=parse(z.object({prompt:z.string().trim().min(10).max(4000)}),req.body);
  res.status(202).json(startJob('generate',job=>generateScene(prompt,job)));
});
app.get('/api/scenes/:id',async(req,res)=>res.json(await readScene(req.params.id)));
app.post('/api/scenes/:id/analyze',(req,res)=>res.status(202).json(startJob(req.params.id,job=>reanalyze(req.params.id,job))));
app.get('/api/jobs/:id',(req,res)=>{const j=jobs.get(req.params.id);if(!j)throw new AppError('Operation is no longer available. Reload the saved scene.',404);res.json({id:j.id,status:j.status,stage:j.stage,error:j.error,sceneId:j.sceneId});});
app.delete('/api/jobs/:id',(req,res)=>{const j=jobs.get(req.params.id);if(!j)throw new AppError('Operation not found.',404);if(j.status==='running')j.controller.abort();res.json({message:'Cancellation requested. An already submitted provider job may still be billed.'});});
app.post('/api/scenes/:id/plan',async(req,res)=>{
  const {instruction,selectedId}=parse(z.object({instruction:z.string().trim().min(3).max(2000),selectedId:z.string().uuid().nullable().optional()}),req.body);
  if(locks.has(req.params.id))throw new AppError('Wait for the current edit to finish.',409);
  const plan=await planEdit(await readScene(req.params.id),instruction,selectedId,AbortSignal.timeout(120000));
  const id=randomUUID();plans.set(id,{...plan,expires:Date.now()+15*60000});res.json({...plan,planId:id});
});
app.post('/api/scenes/:id/filter',(req,res)=>{
 const settings=parse(z.object({versionId:z.string().uuid(),preset:z.enum(['original','mono','sepia','vivid','warm','cool','soft','sharpen']),brightness:z.number().int().min(-50).max(50).default(0),contrast:z.number().int().min(-50).max(50).default(0),saturation:z.number().int().min(-100).max(100).default(0)}),req.body);
 res.status(202).json(startJob(req.params.id,job=>applyFilter(req.params.id,settings,job)));
});
app.post('/api/scenes/:id/edit',(req,res)=>{
  const {planId,box}=parse(z.object({planId:z.string().uuid(),box:boxSchema}),req.body);
  const plan=plans.get(planId);if(!plan||plan.sceneId!==req.params.id||plan.expires<Date.now())throw new AppError('Edit plan expired. Prepare the edit again.',409);
  const response=startJob(req.params.id,job=>applyEdit(plan,box,job));plans.delete(planId);res.status(202).json(response);
});
app.post('/api/scenes/:id/restore',async(req,res)=>{
  if(locks.has(req.params.id))throw new AppError('Wait for the edit to finish.',409);
  locks.add(req.params.id);
  try{const {versionId}=parse(z.object({versionId:z.string().uuid()}),req.body);const scene=await readScene(req.params.id),index=scene.versions.findIndex(v=>v.id===versionId);if(index<0)throw new AppError('Version not found.',404);scene.current=index;await saveScene(scene);res.json(scene);}
  finally{locks.delete(req.params.id);}
});
app.use('/assets',express.static(path.join(dataDir,'assets'),{immutable:true,maxAge:'1y',setHeaders:res=>res.setHeader('Cache-Control','private, max-age=31536000, immutable')}));
app.use(express.static(path.resolve('dist')));
app.get('/{*path}',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Endpoint not found.'});res.sendFile(path.resolve('dist/index.html'));});
app.use((e,req,res,_next)=>{const status=e instanceof AppError?e.status:e.type==='entity.too.large'?413:500;res.status(status).json({error:e instanceof AppError?e.message:status===413?'Request is too large.':'The server could not complete this request.'});});
setInterval(()=>{const now=Date.now();for(const [id,j] of jobs)if(j.status!=='running'&&now-j.createdAt>86400000)jobs.delete(id);for(const [id,p] of plans)if(p.expires<now)plans.delete(id);for(const [id,a] of loginAttempts)if(a.until<now)loginAttempts.delete(id);},60000).unref();
await initStore();
app.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log('Reframe backend listening on port '+(process.env.PORT||3001)));
