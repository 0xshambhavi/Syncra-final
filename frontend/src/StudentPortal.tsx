import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Award, Bell, CalendarDays, CalendarPlus, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Compass, ExternalLink,
  Filter, MapPin, Search, Settings, Ticket, Users, X, UserRound, Sparkles,
  Bookmark, BookmarkCheck, CalendarCheck, CircleHelp, LogOut
} from 'lucide-react';
import { api } from './utils/api';

type CampusEvent = {
  id: string; title: string; club: string; date: string; time: string;
  venue: string; description: string; capacity: number; registered: number;
  status: string; event_type?: string; type?: string; fee?: number;
  registration_deadline?: string; seats_left?: number; guest_speakers?: {name:string;affiliation?:string;role?:string;photo?:string}[];
  faculty_coordinator?: string; discord_url?: string; whatsapp_url?: string;
  club_url?: string; volunteer_recruiting?: boolean; poster_url?: string;
};
type Notice = { id:string; title:string; message:string; read?:boolean; created_at?:string; type?:string };
type ViewMode = 'month' | 'week' | 'agenda';

const CLUBS = [
  {name:'Tech Club',tagline:'Build things. Break limits. Learn together.',members:84,accent:'coral',initials:'TC',category:'Technology'},
  {name:'Design Society',tagline:'A space for visual thinkers and makers.',members:52,accent:'pink',initials:'DS',category:'Creative'},
  {name:'Literary Circle',tagline:'Words, ideas, debates and stories.',members:46,accent:'mint',initials:'LC',category:'Culture'},
  {name:'Entrepreneurship Cell',tagline:'Turn your what-if into what-next.',members:63,accent:'yellow',initials:'EC',category:'Innovation'},
  {name:'Music & Arts Club',tagline:'Make a little noise. Find your rhythm.',members:71,accent:'blue',initials:'MA',category:'Culture'},
  {name:'Photography Club',tagline:'Notice more. Capture the in-between.',members:39,accent:'lavender',initials:'PC',category:'Creative'}
];

const pad=(n:number)=>String(n).padStart(2,'0');
const iso=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dateFrom=(s:string)=>{const [y,m,d]=s.slice(0,10).split('-').map(Number);return new Date(y,m-1,d||1)};
const monthLabel=(d:Date)=>d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
const prettyDate=(s:string)=>dateFrom(s).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
const eventType=(e:CampusEvent)=>e.event_type||e.type||'Campus event';
const initials=(s:string)=>s.split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');

export default function StudentPortal({user}:{user:any}) {
  const location=useLocation();
  const path=location.pathname;
  const section=path==='/app/my-events'?'my-events':path==='/app/certificates'?'certificates':path==='/app/clubs'?'clubs':path==='/app/notifications'?'notifications':path==='/app/profile'?'profile':path==='/app/settings'?'settings':'home';
  const [events,setEvents]=useState<CampusEvent[]>([]);
  const [notices,setNotices]=useState<Notice[]>([]);
  const [registered,setRegistered]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('syncra_registered_'+(user?.id||user?.email))||'[]')}catch{return[]}});
  const [saved,setSaved]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('syncra_saved_'+(user?.id||user?.email))||'[]')}catch{return[]}});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [month,setMonth]=useState(()=>new Date());
  const [selectedDate,setSelectedDate]=useState(iso(new Date()));
  const [selectedEvent,setSelectedEvent]=useState<CampusEvent|null>(null);
  const [view,setView]=useState<ViewMode>('month');
  const [clubFilter,setClubFilter]=useState('All clubs');
  const [typeFilter,setTypeFilter]=useState('All types');
  const [priceFilter,setPriceFilter]=useState('All events');
  const [search,setSearch]=useState('');
  const [toast,setToast]=useState('');
  const [busyId,setBusyId]=useState('');
  const [clubSearch,setClubSearch]=useState('');

  const refresh=async()=>{
    setLoading(true);setError('');
    try{const data=await api<CampusEvent[]>('/api/v1/events');setEvents(Array.isArray(data)?data:[])}catch(e:any){setError(e.message||'Could not load campus events')}
    try{const mine=await api<CampusEvent[]>('/api/v1/my/events');const ids=Array.isArray(mine)?mine.map(e=>e.id):[];setRegistered(ids)}catch{}
    try{const data=await api<Notice[]>('/api/v1/notifications');setNotices(Array.isArray(data)?data:[])}catch{}
    setLoading(false);
  };
  useEffect(()=>{void refresh()},[]);
  useEffect(()=>{localStorage.setItem('syncra_registered_'+(user?.id||user?.email),JSON.stringify(registered))},[registered,user]);
  useEffect(()=>{localStorage.setItem('syncra_saved_'+(user?.id||user?.email),JSON.stringify(saved))},[saved,user]);

  const filtered=useMemo(()=>events.filter(e=>(clubFilter==='All clubs'||e.club===clubFilter)&&(typeFilter==='All types'||eventType(e)===typeFilter)&&(priceFilter==='All events'||(priceFilter==='Free'?!(Number(e.fee)>0):Number(e.fee)>0))&&(!search||[e.title,e.club,e.venue,e.description].join(' ').toLowerCase().includes(search.toLowerCase()))),[events,clubFilter,typeFilter,priceFilter,search]);
  const byDate=useMemo(()=>filtered.reduce<Record<string,CampusEvent[]>>((acc,e)=>{(acc[e.date] ||= []).push(e);return acc},{}),[filtered]);
  const selectedDayEvents=byDate[selectedDate]||[];
  const upcoming=[...events].filter(e=>e.date>=iso(new Date())).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const myEvents=events.filter(e=>registered.includes(e.id)).sort((a,b)=>a.date.localeCompare(b.date));
  const unread=notices.filter(n=>!n.read).length;
  const firstDay=new Date(month.getFullYear(),month.getMonth(),1);
  const gridStart=new Date(month.getFullYear(),month.getMonth(),1-firstDay.getDay());
  const days=Array.from({length:42},(_,i)=>new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i));
  const weekStart=new Date(dateFrom(selectedDate));weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  const weekDays=Array.from({length:7},(_,i)=>new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+i));
  const goMonth=(n:number)=>setMonth(new Date(month.getFullYear(),month.getMonth()+n,1));
  const notify=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(''),3200)};
  async function register(e:CampusEvent){
    setBusyId(e.id);
    try{await api(`/api/v1/events/${e.id}/register`,{method:'POST'});setRegistered(prev=>prev.includes(e.id)?prev:[...prev,e.id]);setEvents(prev=>prev.map(x=>x.id===e.id?{...x,registered:x.registered+1}:x));setSelectedEvent({...e,registered:e.registered+1});notify('You’re on the list! Your event pass is ready in My Events.')}
    catch(err:any){notify(err.message||'Could not register for this event')}
    finally{setBusyId('')}
  }
  async function markRead(n:Notice){try{await api(`/api/v1/notifications/${n.id}/read`,{method:'POST'});setNotices(prev=>prev.map(x=>x.id===n.id?{...x,read:true}:x))}catch(e:any){notify(e.message)}}
  function toggleSaved(id:string){setSaved(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
  const headerCopy:Record<string,[string,string]>={home:['YOUR CAMPUS, IN ONE VIEW','A good day starts with a plan.'], 'my-events':['YOUR PLANS','Every event you’ve signed up for.'],certificates:['YOUR MILESTONES','The memories and certificates you’ve collected.'],clubs:['FIND YOUR PEOPLE','Explore the communities that make campus yours.'],notifications:['CAMPUS UPDATES','The little things you shouldn’t miss.'],profile:['YOUR CORNER','Your campus identity, all in one place.'],settings:['MAKE IT YOURS','A few preferences for your Syncra experience.']};
  const [eyebrow,sub]=headerCopy[section];
  const greeting=user?.profile?.full_name||user?.email?.split('@')[0]||'there';

  return <div className="student-portal">
    <header className="student-topbar">
      <div className="student-heading"><div className="eyebrow">{eyebrow}</div><h1>{section==='home'?<>Hey, {greeting.split(' ')[0]} <span className="heading-spark">✳</span></>:section==='my-events'?'My events':section==='certificates'?'My certificates':section==='clubs'?'Explore clubs':section==='notifications'?'Notifications':section==='profile'?'Your profile':'Settings'}</h1><p>{sub}</p></div>
      <div className="student-top-actions"><button className="icon-button" aria-label="Search events" onClick={()=>{if(section!=='home')window.location.href='/app';else document.getElementById('calendar-search')?.focus()}}><Search size={18}/></button><Link className="notification-button" to="/app/notifications" aria-label={`Notifications, ${unread} unread`}><Bell size={18}/>{unread>0&&<i>{unread}</i>}</Link><div className="student-avatar">{initials(greeting)}</div></div>
    </header>
    {toast&&<div className="student-toast" role="status"><Check size={16}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={15}/></button></div>}
    {section==='home'&&<div className="student-home">
      <section className="student-welcome-row">
        <div className="welcome-note"><div className="eyebrow">YOUR NEXT CHAPTER</div><h2>Make room for <em>something good.</em></h2><p>Find a room full of ideas, people, and experiences waiting to happen.</p><Link to="/app/clubs" className="text-link">Meet your campus clubs <ArrowRight size={15}/></Link></div>
        <div className="welcome-count"><span className="count-spark">✳</span><small>UP NEXT ON CAMPUS</small><b>{upcoming.length.toString().padStart(2,'0')}</b><span>events to explore</span></div>
      </section>
      <section className="student-calendar-panel">
        <div className="calendar-heading">
          <div><div className="eyebrow">THE CAMPUS CALENDAR</div><h2>What’s happening?</h2><p>Pick a date. Find your next thing.</p></div>
          <div className="calendar-controls"><div className="calendar-view-toggle">{(['month','week','agenda'] as ViewMode[]).map(v=><button key={v} className={view===v?'active':''} onClick={()=>setView(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className="calendar-month-controls"><button aria-label="Previous period" onClick={()=>view==='week'?setSelectedDate(iso(new Date(dateFrom(selectedDate).getFullYear(),dateFrom(selectedDate).getMonth(),dateFrom(selectedDate).getDate()-7))):goMonth(-1)}><ChevronLeft size={17}/></button><b>{view==='week'?weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'}):monthLabel(month)}</b><button aria-label="Next period" onClick={()=>view==='week'?setSelectedDate(iso(new Date(dateFrom(selectedDate).getFullYear(),dateFrom(selectedDate).getMonth(),dateFrom(selectedDate).getDate()+7))):goMonth(1)}><ChevronRight size={17}/></button><button className="today-button" onClick={()=>{setMonth(new Date());setSelectedDate(iso(new Date()))}}>Today</button></div></div>
        </div>
        <div className="calendar-filters">
          <label className="calendar-search"><Search size={15}/><input id="calendar-search" placeholder="Find an event, club or venue…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
          <label><Filter size={14}/><select value={clubFilter} onChange={e=>setClubFilter(e.target.value)}><option>All clubs</option>{Array.from(new Set(events.map(e=>e.club))).filter(Boolean).map(c=><option key={c}>{c}</option>)}</select></label>
          <label><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option>All types</option>{Array.from(new Set(events.map(eventType))).map(t=><option key={t}>{t}</option>)}</select></label>
          <label><select value={priceFilter} onChange={e=>setPriceFilter(e.target.value)}><option>All events</option><option>Free</option><option>Paid</option></select></label>
        </div>
        {loading?<div className="calendar-loading"><div/><div/><div/><div/><div/><div/><div/></div>:error?<div className="student-empty"><CalendarDays size={28}/><b>We couldn’t load the calendar.</b><p>{error}</p><button className="btn btn-outline" onClick={()=>void refresh()}>Try again</button></div>:view==='month'?<div className="month-grid">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div className="weekday" key={d}>{d}</div>)}
          {days.map((d,i)=>{const key=iso(d),items=byDate[key]||[],isCurrent=d.getMonth()===month.getMonth(),isToday=key===iso(new Date()),isSelected=key===selectedDate;return <button key={key} className={`calendar-day ${!isCurrent?'outside':''} ${isToday?'today':''} ${isSelected?'selected':''}`} onClick={()=>setSelectedDate(key)} aria-label={`${prettyDate(key)}, ${items.length} events`}><span className="day-number">{d.getDate()}</span><span className="day-event-stack">{items.slice(0,2).map((e,j)=><span key={e.id} className={`day-event-pill club-tone-${j%4}`} onClick={ev=>{ev.stopPropagation();setSelectedDate(key);setSelectedEvent(e)}}>{e.title}</span>)}{items.length>2&&<small>+{items.length-2} more</small>}</span>{items.length>0&&<span className="day-dots">{items.slice(0,4).map((e,j)=><i key={e.id} className={`club-dot tone-${j%4}`}/>)}</span>}</button>})}
        </div>:view==='week'?<div className="week-grid">{weekDays.map(d=>{const key=iso(d),items=byDate[key]||[];return <div className={`week-column ${key===selectedDate?'chosen':''}`} key={key}><button className="week-day" onClick={()=>setSelectedDate(key)}><small>{d.toLocaleDateString('en-US',{weekday:'short'})}</small><b>{d.getDate()}</b></button>{items.map(e=><button key={e.id} className="week-event" onClick={()=>setSelectedEvent(e)}><b>{e.title}</b><small>{e.time} · {e.club}</small></button>)}</div>})}</div>:<div className="agenda-list">{filtered.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(e=><button key={e.id} className="agenda-event" onClick={()=>{setSelectedDate(e.date);setSelectedEvent(e)}}><span className="agenda-date"><b>{dateFrom(e.date).getDate()}</b><small>{dateFrom(e.date).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</small></span><span className="agenda-info"><b>{e.title}</b><small>{e.club} · {e.time} · {e.venue}</small></span><ArrowRight size={17}/></button>)}{!filtered.length&&<p className="muted">No events match those filters yet.</p>}</div>}
        <div className="calendar-legend"><span><i className="club-dot tone-0"/> Tech & innovation</span><span><i className="club-dot tone-1"/> Arts & culture</span><span><i className="club-dot tone-2"/> Community</span><span className="legend-note">Select a date to see its line-up</span></div>
      </section>
      <section className="selected-day-panel"><div className="selected-day-heading"><div><div className="eyebrow">YOUR SELECTED DAY</div><h2>{dateFrom(selectedDate).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</h2></div><span className="day-count">{selectedDayEvents.length} {selectedDayEvents.length===1?'event':'events'}</span></div>
        {selectedDayEvents.length?selectedDayEvents.map((e,i)=><article className="selected-event-card" key={e.id}><div className={`selected-event-accent accent-${i%4}`}/><div className="selected-event-main"><span className="event-club-label">{e.club} <i>·</i> {eventType(e)}</span><h3>{e.title}</h3><div className="selected-event-meta"><span><Clock3 size={14}/>{e.time}</span><span><MapPin size={14}/>{e.venue}</span><span><Users size={14}/>{Math.max(0,e.capacity-e.registered)} spots left</span></div></div><button className="btn btn-outline" onClick={()=>setSelectedEvent(e)}>Details <ArrowRight size={14}/></button></article>):<div className="calendar-empty"><CalendarDays size={23}/><div><b>A little breathing room.</b><span>No events on this date. Try another day or browse the upcoming line-up.</span></div></div>}
      </section>
      <section className="upcoming-row"><div className="section-mini-heading"><div><div className="eyebrow">SAVE YOUR SEAT</div><h2>Coming up soon</h2></div><Link to="/app/my-events" className="text-link">My events <ArrowRight size={14}/></Link></div><div className="upcoming-cards">{upcoming.slice(0,3).map((e,i)=><button key={e.id} className={`upcoming-card upcoming-${i}`} onClick={()=>setSelectedEvent(e)}><span className="upcoming-date">{dateFrom(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span><b>{e.title}</b><small>{e.club} · {e.time}</small><span className="upcoming-arrow"><ArrowRight size={16}/></span></button>)}{!upcoming.length&&<p className="muted">New events will show up here soon.</p>}</div></section>
    </div>}
    {section==='my-events'&&<section className="student-content-panel"><div className="section-mini-heading"><div><div className="eyebrow">YOUR EVENT PASSES</div><h2>Plans worth showing up for</h2></div><span className="count-chip">{myEvents.length} saved</span></div>{myEvents.length?myEvents.map(e=><article className="my-event-ticket" key={e.id}><div className="ticket-date"><b>{dateFrom(e.date).getDate()}</b><small>{dateFrom(e.date).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</small></div><div className="ticket-info"><span>{e.club} · {eventType(e)}</span><h3>{e.title}</h3><small><Clock3 size={13}/>{e.time} <MapPin size={13}/>{e.venue}</small><div className="status-chip"><Check size={12}/> Registration confirmed</div></div><button className="btn btn-outline" onClick={()=>setSelectedEvent(e)}>View pass <ArrowRight size={14}/></button></article>):<div className="student-empty"><Ticket size={35}/><h3>Your next great story starts here.</h3><p>You haven’t registered for an event yet. Explore the calendar and save a seat.</p><Link to="/app" className="btn btn-coral">Explore the calendar <ArrowRight size={15}/></Link></div>}</section>}
    {section==='certificates'&&<section className="student-content-panel"><div className="section-mini-heading"><div><div className="eyebrow">A LITTLE PROOF OF BIG THINGS</div><h2>Your certificates</h2></div><span className="count-chip">0 available</span></div><div className="student-empty certificate-empty"><Award size={38}/><h3>Your achievements will live here.</h3><p>Once an organiser issues a participation certificate, you’ll find it here ready to view and download.</p><span className="coming-soon-chip">CERTIFICATE WALLET</span></div></section>}
    {section==='clubs'&&<section className="student-content-panel"><div className="club-toolbar"><label className="calendar-search"><Search size={15}/><input placeholder="Search clubs or interests…" value={clubSearch} onChange={e=>setClubSearch(e.target.value)}/></label><span className="count-chip">{CLUBS.filter(c=>(c.name+' '+c.tagline+' '+c.category).toLowerCase().includes(clubSearch.toLowerCase())).length} communities</span></div><div className="club-grid">{CLUBS.filter(c=>(c.name+' '+c.tagline+' '+c.category).toLowerCase().includes(clubSearch.toLowerCase())).map(c=><article className={`club-card club-${c.accent}`} key={c.name}><div className="club-card-top"><span className="club-monogram">{c.initials}</span><span className="club-category">{c.category}</span></div><h3>{c.name}</h3><p>{c.tagline}</p><div className="club-card-footer"><span><Users size={14}/>{c.members} members</span><button onClick={()=>notify('Club profiles and member rosters will be connected in the next student-profile pass.')}>Explore <ArrowRight size={14}/></button></div></article>)}</div><p className="student-footnote">Club cards currently use sample campus content. Live club profiles and member rosters need a clubs API.</p></section>}
    {section==='notifications'&&<section className="student-content-panel"><div className="section-mini-heading"><div><div className="eyebrow">YOUR INBOX</div><h2>Stay in the loop</h2></div><span className="count-chip">{unread} unread</span></div>{notices.length?notices.map(n=><article className={`student-notice ${n.read?'is-read':''}`} key={n.id}><span className="notice-symbol"><Bell size={17}/></span><div><b>{n.title}</b><p>{n.message}</p><small>{n.created_at||'Campus update'}</small></div>{!n.read&&<button onClick={()=>void markRead(n)}>Mark read</button>}</article>):<div className="student-empty"><Bell size={35}/><h3>All quiet on campus.</h3><p>When there’s an event reminder, registration update or club call, you’ll find it here.</p></div>}</section>}
    {section==='profile'&&<section className="student-content-panel profile-panel"><div className="profile-hero"><div className="profile-big-avatar">{initials(greeting)}</div><div><div className="eyebrow">STUDENT PROFILE</div><h2>{greeting}</h2><p>{user?.email}</p></div><span className="student-role-chip">STUDENT</span></div><div className="profile-details"><div><small>FULL NAME</small><b>{user?.profile?.full_name||greeting}</b></div><div><small>COLLEGE EMAIL</small><b>{user?.email}</b></div><div><small>STUDENT ID</small><b>{user?.student_id||'Not added'}</b></div><div><small>ACCOUNT STATUS</small><b>{user?.status||'Active'}</b></div></div><p className="student-footnote">Your profile details are read from your verified Syncra account. Profile editing can be connected when the account-update endpoint is added.</p></section>}
    {section==='settings'&&<section className="student-content-panel"><div className="section-mini-heading"><div><div className="eyebrow">PREFERENCES</div><h2>Your Syncra settings</h2></div><Settings size={22}/></div><div className="settings-row"><div><b>Saved events</b><p>Events you bookmarked to revisit later.</p></div><span>{saved.length} saved</span></div><div className="settings-row"><div><b>Campus updates</b><p>In-app notifications are currently enabled.</p></div><span className="status-chip">On</span></div><div className="settings-row"><div><b>Account details</b><p>Review your student profile information.</p></div><Link to="/app/profile" className="text-link">View profile <ArrowRight size={14}/></Link></div></section>}
    {selectedEvent&&<div className="event-drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedEvent(null)}}><aside className="event-drawer" role="dialog" aria-modal="true" aria-labelledby="event-drawer-title"><div className="drawer-cover"><span>{selectedEvent.club}</span><button onClick={()=>setSelectedEvent(null)} aria-label="Close event details"><X size={19}/></button><div className="drawer-cover-mark">✳</div><small>{eventType(selectedEvent)}</small></div><div className="drawer-body"><div className="drawer-title-row"><div><div className="eyebrow">CAMPUS EVENT</div><h2 id="event-drawer-title">{selectedEvent.title}</h2></div><button className="save-event-button" onClick={()=>toggleSaved(selectedEvent.id)} aria-label="Save event">{saved.includes(selectedEvent.id)?<BookmarkCheck size={19}/>:<Bookmark size={19}/>}</button></div><p className="drawer-description">{selectedEvent.description||'More details about this event will be shared by the organising club.'}</p><div className="drawer-facts"><div><CalendarDays size={17}/><span><small>DATE</small><b>{prettyDate(selectedEvent.date)}</b></span></div><div><Clock3 size={17}/><span><small>TIME</small><b>{selectedEvent.time||'To be announced'}</b></span></div><div><MapPin size={17}/><span><small>VENUE</small><b>{selectedEvent.venue||'To be announced'}</b></span></div><div><Ticket size={17}/><span><small>ENTRY</small><b>{Number(selectedEvent.fee)>0?'₹'+selectedEvent.fee:'Free'}</b></span></div></div><div className="drawer-seats"><div><b>{Math.max(0,selectedEvent.capacity-selectedEvent.registered)}</b><span> seats left</span><small>{selectedEvent.registered} of {selectedEvent.capacity} registered</small></div><div className="seat-meter"><i style={{width:`${Math.min(100,selectedEvent.capacity?selectedEvent.registered/selectedEvent.capacity*100:0)}%`}}/></div></div>{selectedEvent.registration_deadline&&<div className="drawer-deadline"><Clock3 size={15}/> Register by {selectedEvent.registration_deadline}</div>}{selectedEvent.guest_speakers?.length? <div className="drawer-guests"><h3>Guest speakers</h3>{selectedEvent.guest_speakers.map(g=><div key={g.name} className="guest-row"><span>{initials(g.name)}</span><div><b>{g.name}</b><small>{g.role||'Guest'}{g.affiliation?' · '+g.affiliation:''}</small></div></div>)}</div>:null}{selectedEvent.faculty_coordinator&&<p className="drawer-coordinator">Faculty coordinator · <b>{selectedEvent.faculty_coordinator}</b></p>}<div className="drawer-links">{selectedEvent.discord_url&&<a href={selectedEvent.discord_url} target="_blank" rel="noreferrer">Discord <ExternalLink size={13}/></a>}{selectedEvent.whatsapp_url&&<a href={selectedEvent.whatsapp_url} target="_blank" rel="noreferrer">WhatsApp <ExternalLink size={13}/></a>}{selectedEvent.club_url&&<a href={selectedEvent.club_url} target="_blank" rel="noreferrer">Club page <ExternalLink size={13}/></a>}</div><div className="drawer-actions">{registered.includes(selectedEvent.id)?<div className="registered-banner"><Check size={17}/> You’re registered for this event</div>:<button className="btn btn-coral full" disabled={busyId===selectedEvent.id||selectedEvent.registered>=selectedEvent.capacity} onClick={()=>void register(selectedEvent)}>{busyId===selectedEvent.id?'Saving your spot…':selectedEvent.registered>=selectedEvent.capacity?'Event full':'Register for this event'} <ArrowRight size={16}/></button>}<small>Registration is recorded in Syncra. Event passes and calendar sync will be added when those services are connected.</small></div></div></aside></div>}
  </div>;
}
