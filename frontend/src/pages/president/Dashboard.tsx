import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import { CalendarDays, LayoutDashboard, Plus, MapPin, Users, Wallet, Bell, Building2, UserRound, Handshake, LogOut, RefreshCw } from 'lucide-react';

type EventItem = { id:string; title:string; club:string; date:string; time:string; venue:string; description:string; capacity:number; registered:number; status:string };
type Venue = { id:string; name:string; type:string; capacity:number; building:string; floor:string; bookable:boolean };
type Notice = { id:string; title:string; message:string; read:boolean };

const sections = [
  {id:'overview',label:'Overview',icon:LayoutDashboard},
  {id:'events',label:'My Events',icon:CalendarDays},
  {id:'create',label:'Create Event',icon:Plus},
  {id:'venues',label:'Venues',icon:MapPin},
  {id:'club',label:'Club Profile',icon:Building2},
  {id:'members',label:'Members',icon:Users},
  {id:'volunteers',label:'Volunteers',icon:Handshake},
  {id:'budget',label:'Budget',icon:Wallet},
  {id:'notifications',label:'Notifications',icon:Bell},
];

export function PresidentDashboard({user,onLogout}:{user:any;onLogout:()=>void}) {
  const [section,setSection]=useState('overview');
  const [events,setEvents]=useState<EventItem[]>([]);
  const [venues,setVenues]=useState<Venue[]>([]);
  const [notifications,setNotifications]=useState<Notice[]>([]);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({title:'',club:user?.profile?.club_name||'Campus Club',date:'',time:'10:00',venue:'',description:'',capacity:100});
  const [budget,setBudget]=useState({event_id:'',category:'venue',amount:'',justification:''});
  const [clubName,setClubName]=useState(user?.profile?.club_name||'');
  const [clubDescription,setClubDescription]=useState(user?.profile?.club_description||'');

  async function refresh(){
    try { const mine=await api<EventItem[]>('/api/v1/my/events'); setEvents(mine); }
    catch(e:any){setNotice(e.message)}
    try { setVenues(await api<Venue[]>('/api/v1/venues')); } catch {}
    try { setNotifications(await api<Notice[]>('/api/v1/notifications')); } catch {}
  }
  useEffect(()=>{refresh()},[]);
  const registered=useMemo(()=>events.reduce((n,e)=>n+(e.registered||0),0),[events]);
  const pending=events.filter(e=>e.status==='pending').length;

  async function createEvent(e:FormEvent){
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      await api('/api/v1/events',{method:'POST',body:JSON.stringify(form)});
      setNotice('Event submitted for approval.'); setForm({...form,title:'',description:''}); setSection('events'); await refresh();
    } catch(err:any){setNotice(err.message)} finally{setBusy(false)}
  }
  async function submitBudget(e:FormEvent){
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      await api('/api/v1/budget/request',{method:'POST',body:JSON.stringify({event_id:budget.event_id,total_amount:Number(budget.amount),items:[{category:budget.category,amount:Number(budget.amount),justification:budget.justification}]})});
      setNotice('Budget request submitted.'); setBudget({...budget,amount:'',justification:''});
    } catch(err:any){setNotice(err.message)} finally{setBusy(false)}
  }
  async function markRead(id:string){
    try{await api('/api/v1/notifications/'+id+'/read',{method:'POST'});await refresh()}catch(e:any){setNotice(e.message)}
  }

  return <div className="president-layout">
    <aside className="president-nav">
      <div className="president-brand"><span className="brand-mark">S</span><span>syncra<small>PRESIDENT PORTAL</small></span></div>
      <div className="side-label">CLUB WORKSPACE</div>
      {sections.map(item=>{const Icon=item.icon;return <button key={item.id} className={'side-link president-nav-link '+(section===item.id?'selected':'')} onClick={()=>setSection(item.id)}><Icon size={17}/>{item.label}</button>})}
      <div className="president-nav-bottom"><div className="user-chip"><span className="avatar">{user?.email?.[0]?.toUpperCase()||'P'}</span><span><b>{user?.email?.split('@')[0]}</b><small>Club President</small></span></div><button className="logout" onClick={onLogout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    <main className="president-main">
      <header className="page-header"><div><div className="eyebrow">CLUB MANAGEMENT</div><h1>{sections.find(s=>s.id===section)?.label||'President Portal'} <span>✳</span></h1><p>Plan, organise and grow your club's campus presence.</p></div><button className="btn btn-outline" onClick={refresh}><RefreshCw size={15}/> Refresh</button></header>
      {notice&&<div className="notice" onClick={()=>setNotice('')}>{notice}<button>×</button></div>}
      {section==='overview'&&<><div className="stats-grid"><div className="stat-card"><span>MY EVENTS</span><b>{events.length}</b><small>Events created by your club account</small><CalendarDays/></div><div className="stat-card"><span>REGISTRATIONS</span><b>{registered}</b><small>Across your events</small><Users/></div><div className="stat-card"><span>AWAITING APPROVAL</span><b>{pending}</b><small>Submitted for review</small><Bell/></div></div><section className="panel"><div className="panel-heading"><div><div className="eyebrow">YOUR CLUB</div><h2>{clubName||'Club profile not set'}</h2></div><button className="btn btn-coral" onClick={()=>setSection('create')}><Plus size={16}/> Create event</button></div>{events.length?events.slice(0,5).map((event,i)=><EventRow key={event.id} event={event} index={i}/>):<p className="muted">You haven't created any events yet. Start by adding your first event.</p>}</section></>}
      {section==='events'&&<section className="panel"><div className="panel-heading"><div><div className="eyebrow">YOUR ACTIVITY</div><h2>Events created by you</h2></div><button className="btn btn-coral" onClick={()=>setSection('create')}><Plus size={16}/> New event</button></div>{events.length?events.map((event,i)=><EventRow key={event.id} event={event} index={i}/>):<p className="muted">No events yet.</p>}</section>}
      {section==='create'&&<form className="create-form" onSubmit={createEvent}><h3>Bring your next idea to campus.</h3><div className="form-grid"><label>Event name<input required minLength={3} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Club / organiser<input required value={form.club} onChange={e=>setForm({...form,club:e.target.value})}/></label><label>Date<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Start time<input type="time" required value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></label><label>Venue<select required value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}><option value="">Choose a venue</option>{venues.map(v=><option key={v.id} value={v.name}>{v.name} · {v.capacity} seats</option>)}</select></label><label>Capacity<input type="number" min="1" required value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})}/></label></div><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3}/></label><button className="btn btn-dark" disabled={busy}>{busy?'Submitting…':'Submit for approval'}</button></form>}
      {section==='venues'&&<section className="panel"><div className="eyebrow">CAMPUS SPACES</div><h2>Available venues</h2><div className="president-venue-grid">{venues.map(v=><article className="president-subcard" key={v.id}><MapPin/><h3>{v.name}</h3><p>{v.type} · {v.building}, {v.floor}</p><b>Capacity: {v.capacity}</b><small>{v.bookable?'Booking enquiries available':'Not currently bookable'}</small></article>)}</div>{!venues.length&&<p className="muted">Venue information is not available yet.</p>}</section>}
      {section==='club'&&<section className="panel"><div className="eyebrow">YOUR IDENTITY</div><h2>Club profile</h2><form className="create-form" onSubmit={e=>{e.preventDefault();setNotice('Profile details are shown for this session. Profile saving needs a backend endpoint.')}}><label>Club name<input value={clubName} onChange={e=>setClubName(e.target.value)}/></label><label>About your club<textarea rows={4} value={clubDescription} onChange={e=>setClubDescription(e.target.value)}/></label><label>President email<input value={user?.email||''} readOnly/></label><button className="btn btn-dark">Save profile</button></form><p className="muted">Profile editing will be connected when the club profile API is added.</p></section>}
      {section==='members'&&<PortalPlaceholder icon={<Users/>} title="Club members" detail="Member directory, roles and membership management will appear here when the membership API is connected."/>}
      {section==='volunteers'&&<PortalPlaceholder icon={<Handshake/>} title="Volunteer team" detail="Manage volunteer applications, assign event duties and track participation when volunteer endpoints are available."/>}
      {section==='budget'&&<><section className="panel"><div className="eyebrow">FINANCE</div><h2>Request an event budget</h2>{events.length?<form className="create-form" onSubmit={submitBudget}><label>Event<select required value={budget.event_id} onChange={e=>setBudget({...budget,event_id:e.target.value})}><option value="">Select your event</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></label><div className="form-grid"><label>Expense category<select value={budget.category} onChange={e=>setBudget({...budget,category:e.target.value})}>{['venue','food','prizes','marketing','equipment','honorarium','misc'].map(c=><option key={c}>{c}</option>)}</select></label><label>Amount<input type="number" min="1" required value={budget.amount} onChange={e=>setBudget({...budget,amount:e.target.value})}/></label></div><label>Justification<input value={budget.justification} onChange={e=>setBudget({...budget,justification:e.target.value})}/></label><button className="btn btn-dark" disabled={busy}>Submit budget request</button></form>:<p className="muted">Create an event before requesting its budget.</p>}</section><p className="muted">Budget submission is connected. Approval history and detailed expense tracking are not yet available in the current backend.</p></>}
      {section==='notifications'&&<section className="panel"><div className="eyebrow">UPDATES</div><h2>Notifications</h2>{notifications.length?notifications.map(n=><div className="notification" key={n.id}><span className="notification-icon"><Bell size={16}/></span><div><b>{n.title}</b><p>{n.message}</p>{!n.read&&<button onClick={()=>markRead(n.id)}>Mark as read</button>}</div></div>):<p className="muted">You're all caught up.</p>}</section>}
    </main>
  </div>;
}

function EventRow({event,index}:{event:EventItem;index:number}){
  const date=new Date(event.date+'T00:00:00');
  return <article className="dashboard-event"><div className={'date-tile date-'+(index%3)}><b>{date.getDate()}</b><small>{date.toLocaleString('en',{month:'short'}).toUpperCase()}</small></div><div className="dashboard-event-info"><span>{event.club} · {event.status}</span><h3>{event.title}</h3><small>{event.time} · {event.venue} · {event.registered}/{event.capacity} registered</small><div className="mini-track"><i style={{width:Math.min(100,event.registered/Math.max(1,event.capacity)*100)+'%'}}/></div></div></article>;
}
function PortalPlaceholder({icon,title,detail}:{icon:React.ReactNode;title:string;detail:string}){
 return <section className="panel president-placeholder"><div className="president-placeholder-icon">{icon}</div><div className="eyebrow">COMING ONLINE</div><h2>{title}</h2><p className="muted">{detail}</p></section>;
}
