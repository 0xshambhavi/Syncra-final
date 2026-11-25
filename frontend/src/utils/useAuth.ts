import {useEffect,useState} from 'react';
import {api,clearSession,getStoredUser,getToken} from './api';
type AuthUser={id:string;email:string;role:string;student_id?:string|null};
export function useAuth(){
 const [user,setUser]=useState<AuthUser|null>(()=>getStoredUser());
 const [loading,setLoading]=useState<boolean>(()=>Boolean(getToken()));
 useEffect(()=>{let active=true;const token=getToken();if(!token){setUser(null);setLoading(false);return()=>{active=false}}
 api<AuthUser>('/api/v1/auth/me').then(current=>{if(active){setUser(current);localStorage.setItem('syncra_user',JSON.stringify(current))}})
 .catch(()=>{if(active){clearSession();setUser(null)}}).finally(()=>{if(active)setLoading(false)});
 return()=>{active=false}},[]);
 async function signOut(){try{if(getToken())await api('/api/v1/auth/logout',{method:'POST'})}catch{}finally{clearSession();setUser(null)}}
 return {user,loading,setUser,signOut};
}
