/// <reference types="vite/client" />
const API_BASE=(import.meta.env.VITE_API_URL||'http://localhost:8000').replace(/\/$/,'');
export function getToken(){return localStorage.getItem('syncra_token')}
export function setSession(token:string,user:unknown){localStorage.setItem('syncra_token',token);localStorage.setItem('syncra_user',JSON.stringify(user))}
export function clearSession(){localStorage.removeItem('syncra_token');localStorage.removeItem('syncra_user')}
export function getStoredUser(){try{return JSON.parse(localStorage.getItem('syncra_user')||'null')}catch{clearSession();return null}}
function message(body:any,status:number){const d=body?.detail??body?.message;if(typeof d==='string')return d;if(Array.isArray(d))return d.map((x:any)=>x?.msg||'Invalid input').join('. ');return 'Request failed ('+status+'). Please try again.'}
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
 const headers=new Headers(options.headers);headers.set('Accept','application/json');headers.set('Content-Type','application/json');
 const token=getToken();if(token)headers.set('Authorization','Bearer '+token);
 let response:Response;
 try{response=await fetch(API_BASE+path,{...options,headers})}catch{throw new Error('Cannot reach the Syncra server at '+API_BASE+'. Make sure the backend is running.')}
 const type=response.headers.get('content-type')||'';
 const body=type.includes('application/json')?await response.json().catch(()=>({})):{detail:await response.text().catch(()=> '')};
 if(!response.ok)throw new Error(message(body,response.status));return body as T;
}
