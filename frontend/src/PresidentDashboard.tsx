import { FormEvent, useEffect, useState } from 'react';
import { api } from './utils/api';
import { CalendarDays, Plus, Wallet, Sparkles, Clock3, MapPin, RefreshCw } from 'lucide-react';

type EventItem = {id:string;title:string;club:string;date:string;time:string;venue:string;description:string;capacity:number;registered:number;status:string;end_date?:string;end_time?:string};
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const clubs=['TEDxBMSIT&M','Node','Web3','AR/VR Club','E-Cell','Alterino'];

export default function PresidentDashboard({user}:{user:any}) {
  const club=user?.profile?.club_name||'Your club';
  const [events,setEvents]=useState<EventItem[]>([]);
  const [budgets,setBudgets]=useState<any[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [showEvent,setShowEvent]=useState(false);
  const [showBudget,setShowBudget]=useState(false);
  const [title,setTitle]=useState('');
  const [date,setDate]=useState('2026-12-15');
  const [time,setTime]=useState('10:00');
  const [endDate,setEndDate]=useState('2026-12-15');
  const [endTime,setEndTime]=useState('16:00');
  const [venue,setVenue]=useState('');
  const [description,setDescription]=useState('');
  const [capacity,setCapacity]=useState(100);
  const [selectedEvent,setSelectedEvent]=useState('');
  const [amounts,setAmounts]=useState({venue:0,food:0,prizes:0,marketing:0,equipment:0,honorarium:0,misc:0});
  const [remarks,setRemarks]=useState('');
  const [readerInput,setReaderInput]=useState('');
  const [readerUrl,setReaderUrl]=useState('');
  const [analysis,setAnalysis]=useState('');
  const [readerBusy,setReaderBusy]=useState(false);
  const refresh=async()=>{setBusy(true);try{const [e,b]=await Promise.all([api<EventItem[]>('/api/v1/my/events'),api<any[]>('/api/v1/my/budgets').catch(()=>[])]);setEvents(e);setBudgets(b)}catch(err:any){setNotice(err.message)}finally{setBusy(false)}};
  useEffect(()=>{void refresh()},[]);
  async function createEvent(e:FormEvent){e.preventDefault();try{await api('/api/v1/events',{method:'POST',body:JSON.stringify({title,club,date,time,end_date:endDate,end_time:endTime,venue,description,capacity})});setNotice('Event submitted for faculty review.');setShowEvent(false);setTitle('');await refresh()}catch(err:any){setNotice(err.message)}}
  async function submitBudget(e:FormEvent){e.preventDefault();const items=Object.entries(amounts).filter(([,v])=>v>0).map(([category,amount])=>({category,amount,justification:remarks}));const total_amount=items.reduce((n,i)=>n+i.amount,0);if(!selectedEvent||!items.length){setNotice('Choose an event and enter at least one budget amount.');return}try{await api('/api/v1/budget/request',{method:'POST',body:JSON.stringify({event_id:selectedEvent,total_amount,items,remarks})});setNotice('Budget request submitted for review.');setShowBudget(false);await refresh()}catch(err:any){setNotice(err.message)}}
  async function readEvent(e:FormEvent){e.preventDefault();setReaderBusy(true);setAnalysis('');try{const result=await api<any>('/api/v1/ai/event-reader',{method:'POST',body:JSON.stringify(readerUrl?{url:readerUrl}:{text:readerInput})});setAnalysis(result.analysis||JSON.stringify(result,null,2))}catch(err:any){setNotice(err.message)}finally{setReaderBusy(false)}}
  const total=Object.values(amounts).reduce((a,b)=>a+b,0);
  return <div className="staff-dashboard">
    <header className="page-header"><div><div className="eyebrow">CLUB PRESIDENT WORKSPACE</div><h1>{club} <span>✳</span></h1><p>Plan events, request budgets and keep your team moving.</p></div><button className="btn btn-outline" onClick={()=>void refresh()}><RefreshCw size={15}/> Refresh</button></header>
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
    <div className="stats-grid"><div className="stat-card"><span>YOUR EVENTS</span><b>{events.length.toString().padStart(2,'0')}</b><small>Events managed by your club</small><CalendarDays/></div><div className="stat-card"><span>REGISTRATIONS</span><b>{events.reduce((n,e)=>n+(e.registered||0),0)}</b><small>Across your events</small><Clock3/></div><div className="stat-card"><span>BUDGET REQUESTS</span><b>{budgets.length.toString().padStart(2,'0')}</b><small>Submitted for review</small><Wallet/></div></div>
    <div className="dashboard-columns"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">YOUR CLUB CALENDAR</div><h2>Manage events</h2></div><button className="btn btn-coral" onClick={()=>setShowEvent(v=>!v)}><Plus size={15}/> New event</button></div>
      {showEvent&&<form className="create-form" onSubmit={createEvent}><h3>Create a club event</h3><div className="form-grid"><label>Event title<input required value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Venue<input required value={venue} onChange={e=>setVenue(e.target.value)}/></label><label>Start date<input type="date" required value={date} onChange={e=>{setDate(e.target.value);if(endDate<e.target.value)setEndDate(e.target.value)}}/></label><label>Start time<input type="time" required value={time} onChange={e=>setTime(e.target.value)}/></label><label>End date<input type="date" min={date} required value={endDate} onChange={e=>setEndDate(e.target.value)}/></label><label>End time<input type="time" required value={endTime} onChange={e=>setEndTime(e.target.value)}/></label><label>Capacity<input type="number" min="1" value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label></div><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}/></label><button className="btn btn-dark" disabled={busy}>Submit for approval</button></form>}
      {events.length?events.map(e=><article className="dashboard-event" key={e.id}><div className="date-tile"><b>{new Date(e.date+'T00:00:00').getDate()}</b><small>{new Date(e.date+'T00:00:00').toLocaleString('en',{month:'short'}).toUpperCase()}</small></div><div className="dashboard-event-info"><span>{e.status.toUpperCase()}</span><h3>{e.title}</h3><small><Clock3 size={13}/> {e.date} · {e.time} – {e.end_date||e.date} {e.end_time||''} &nbsp; <MapPin size={13}/> {e.venue}</small><p className="muted">{e.registered||0} registrations · {e.capacity} capacity</p></div></article>):<p className="muted">{busy?'Loading your events…':'No club events yet. Create your first one.'}</p>}
    </section><aside className="panel"><div className="eyebrow">FINANCE & PLANNING</div><h2>Event budgets</h2><p className="muted">Synthetic demo budget figures in INR. Submit itemised requests for review.</p><button className="btn btn-coral" onClick={()=>setShowBudget(v=>!v)}><Wallet size={15}/> Request event budget</button>
      {showBudget&&<form className="create-form" onSubmit={submitBudget}><label>Event<select required value={selectedEvent} onChange={e=>setSelectedEvent(e.target.value)}><option value="">Select your event</option>{events.map(e=><option value={e.id} key={e.id}>{e.title}</option>)}</select></label>{(Object.keys(amounts) as (keyof typeof amounts)[]).map(k=><label key={k}>{k[0].toUpperCase()+k.slice(1)} (₹)<input type="number" min="0" value={amounts[k]||''} onChange={e=>setAmounts({...amounts,[k]:Number(e.target.value)})}/></label>)}<label>Justification<textarea rows={2} value={remarks} onChange={e=>setRemarks(e.target.value)}/></label><b>Requested total: {money(total)}</b><button className="btn btn-dark" disabled={!total}>Submit budget</button></form>}
      {budgets.map((b,i)=><div className="settings-row" key={b.event_id||i}><div><b>{events.find(e=>e.id===b.event_id)?.title||'Event budget'}</b><p>{money(b.total_amount)} · {b.status}</p></div><span>{b.status}</span></div>)}
    </aside></div>
    <section className="panel" style={{marginTop:20}}><div className="panel-heading"><div><div className="eyebrow">AI EVENT READER</div><h2>Turn event pages into an organiser brief.</h2></div><Sparkles/></div><p className="muted">Paste public event-page URL or event text. The assistant extracts stated facts and flags missing details; it does not invent them.</p><form className="create-form" onSubmit={readEvent}><label>Public HTTPS event URL<input type="url" value={readerUrl} onChange={e=>{setReaderUrl(e.target.value);if(e.target.value)setReaderInput('')}} placeholder="https://…"/></label><label>Or paste event description<textarea rows={4} value={readerInput} onChange={e=>{setReaderInput(e.target.value);if(e.target.value)setReaderUrl('')}} placeholder="Paste event information here…"/></label><button className="btn btn-dark" disabled={readerBusy||(!readerUrl&&!readerInput)}>{readerBusy?'Reading event…':'Analyse event'} <Sparkles size={15}/></button></form>{analysis&&<pre style={{whiteSpace:'pre-wrap',fontSize:12,lineHeight:1.7,background:'#f8f3e9',padding:16,borderRadius:10}}>{analysis}</pre>}</section>
  </div>;
}
