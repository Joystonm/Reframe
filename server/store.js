import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {AppError} from './errors.js';
export const dataDir=path.resolve(process.env.DATA_DIR||process.env.RAILWAY_VOLUME_MOUNT_PATH||'./data');
export async function initStore(){await mkdir(path.join(dataDir,'assets'),{recursive:true});}
export async function readScene(id){
  if(!/^[a-f0-9-]{36}$/.test(id))throw new AppError('Scene not found.',404);
  try{return JSON.parse(await readFile(path.join(dataDir,id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')throw new AppError('Scene not found.',404);throw e;}
}
export async function saveScene(scene){const target=path.join(dataDir,scene.id+'.json'),tmp=target+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(scene,null,2));await rename(tmp,target);}
export async function saveAsset(bytes){const id=randomUUID();await writeFile(path.join(dataDir,'assets',id+'.png'),bytes);return {id,url:'/assets/'+id+'.png'};}
export async function readAsset(url){if(!/^\/assets\/[a-f0-9-]{36}\.png$/.test(url))throw new AppError('Invalid stored asset.',400);return readFile(path.join(dataDir,url.slice(1)));}
