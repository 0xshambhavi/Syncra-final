import { FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, Compass, LogOut, Plus, Users, Bell, LayoutDashboard, ArrowRight, MapPin, Sparkles, Award, User, Settings } from 'lucide-react';
import { api, setSession } from './utils/api';
import StudentPortal from './StudentPortal';
import PresidentDashboard from './PresidentDashboard';
import GovernanceDashboard from './GovernanceDashboard';
import { useAuth } from './utils/useAuth';

type EventItem = { id: string; title: string; club: string; date: string; time: string; venue: string; description: string; capacity: number; registered: number; status: string };

function Shell({ children, user, onLogout }: any) {
  const student = user?.role === 'student';
  const studentLinks = [
    {to:'/app',label:'Home',icon:<LayoutDashboard size={18}/>,end:true},
    {to:'/app/my-events',label:'My Events',icon:<CalendarDays size={18}/>},
    {to:'/app/certificates',label:'My Certificates',icon:<Award size={18}/>},
    {to:'/app/clubs',label:'Explore Clubs',icon:<Users size={18}/>},
    {to:'/app/notifications',label:'Notifications',icon:<Bell size={18}/>},
    {to:'/app/profile',label:'Profile',icon:<User size={18}/>},
    {to:'/app/settings',label:'Settings',icon:<Settings size={18}/>}
  ];
  const presidentLinks = [
    {to:'/app',label:'President workspace',icon:<LayoutDashboard size={18}/>,end:true},
    {to:'/app/events',label:'Explore events',icon:<CalendarDays size={18}/>},
    {to:'/app/members',label:'Club members',icon:<Users size={18}/>},
    {to:'/app/clashes',label:'Clash & collaboration',icon:<CalendarDays size={18}/>},
    {to:'/app/analytics',label:'Analytics & reports',icon:<LayoutDashboard size={18}/>},
    {to:'/app/notifications',label:'Notifications',icon:<Bell size={18}/>}
  ];
  const staffLinks = [
    {to:'/app',label:'Overview',icon:<LayoutDashboard size={18}/>,end:true},
    {to:'/app/events',label:'Explore events',icon:<CalendarDays size={18}/>},
    ...(user?.role==='faculty'?[{to:'/app/analytics',label:'Club reports',icon:<LayoutDashboard size={18}/>}]:[]),
    {to:'/app/notifications',label:'Notifications',icon:<Bell size={18}/>}
  ];
  const links=student?studentLinks:user?.role==='president'?presidentLinks:staffLinks;
  return <div className={student?'app-shell student-shell':'app-shell'}>
    <aside className="sidebar">
      <Link to="/app" className="brand"><span className="brand-mark">S</span><span>syncra<small>CAMPUS, CONNECTED</small></span></Link>
      <div className="side-label">{student?'YOUR CAMPUS':'WORKSPACE'}</div>
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        {links.map(item=><NavLink key={item.to} to={item.to} end={item.end} className={({isActive})=>`side-link ${isActive?'active':''}`}>{item.icon}{item.label}{item.label==='Notifications'&&student&&<span className="nav-unread">•</span>}</NavLink>)}
      </nav>
      <div className="sidebar-bottom"><div className="user-chip"><span className="avatar">{user?.email?.[0]?.toUpperCase()||'S'}</span><span><b>{user?.profile?.full_name||user?.email?.split('@')[0]}</b><small>{user?.role}</small></span></div><button className="logout" onClick={onLogout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    <main className="main-area">{children}</main>
  </div>;
}

function Landing() {
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => { api<EventItem[]>('/api/v1/public/events').then(setEvents).catch(() => {}); }, []);
  return <div className="landing"><nav className="topnav"><Link to="/" className="brand"><span className="brand-mark">S</span><span>syncra<small>CAMPUS, CONNECTED</small></span></Link><div className="navlinks"><a href="#features">Features</a><a href="#events">Events</a></div><div className="nav-actions"><Link to="/auth" className="btn btn-quiet">Log in</Link><Link to="/auth?mode=signup" className="btn btn-dark">Get started <ArrowRight size={16}/></Link></div></nav>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> THE CAMPUS OPERATING SPACE</div><h1>Make campus life<br/><em>happen together.</em></h1><p>One connected space for student events, clubs and the people who bring them to life. Less chaos. More community.</p><div className="hero-actions"><Link to="/auth?mode=signup" className="btn btn-coral">Join your campus <ArrowRight size={17}/></Link><a href="#events" className="text-link">Explore what's happening <span>↗</span></a></div><div className="hero-proof"><div className="proof-avatars"><i>S</i><i>A</i><i>R</i><i>+</i></div><span>Made for the people who make campus.</span></div></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card card-yellow"><CalendarDays size={23}/><b>Campus calendar</b><span>Everything, in sync.</span></div><div className="art-card card-pink"><Users size={22}/><b>Club community</b><span>Find your people.</span></div><div className="art-center"><span>✳</span><b>SYNC<br/>YOUR<br/>CAMPUS</b></div><div className="art-card card-green"><CheckCircle2 size={22}/><b>No more clashes</b><span>Plans that work.</span></div><div className="art-sticker">LET'S<br/>MAKE<br/>IT HAPPEN!</div></div></section>
    <section className="feature-strip" id="features"><div><span>01 / DISCOVER</span><b>Find your next thing.</b><small>Events and clubs worth showing up for.</small></div><div><span>02 / ORGANISE</span><b>Bring ideas to life.</b><small>Plan events with your whole team.</small></div><div><span>03 / CONNECT</span><b>Keep everyone in sync.</b><small>Clear updates, fewer crossed wires.</small></div></section>
    <section className="events-section" id="events"><div className="section-heading"><div><div className="eyebrow">THE CAMPUS PULSE</div><h2>Coming up <em>next.</em></h2></div><Link to="/auth" className="text-link">See all events ↗</Link></div><div className="event-grid">{events.map((e, i) => <article className={`event-card event-${i%3}`} key={e.id}><div className="event-top"><span>{e.club}</span><span className="event-dot">✳</span></div><h3>{e.title}</h3><p>{e.description}</p><div className="event-meta"><span><CalendarDays size={15}/>{e.date}</span><span><Clock3 size={15}/>{e.time}</span><span><MapPin size={15}/>{e.venue}</span></div><div className="seat-line"><span>{e.registered} registered</span><span>{Math.max(0,e.capacity-e.registered)} spots left</span></div><div className="seat-track"><i style={{width:`${Math.min(100,e.registered/e.capacity*100)}%`}}/></div></article>)}</div>{!events.length && <p className="muted">Events are loading from your Syncra server…</p>}</section>
    <footer className="footer"><Link to="/" className="brand"><span className="brand-mark">S</span><span>syncra<small>CAMPUS, CONNECTED</small></span></Link><span>Good things happen when we sync. © 2026 Syncra</span></footer></div>;
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (user:any)=>void }) {
  const nav=useNavigate();
  const [mode,setMode]=useState<'login'|'signup'>(new URLSearchParams(location.search).get('mode')==='signup'?'signup':'login');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [role,setRole]=useState('student');
  const [fullName,setFullName]=useState(''); const [studentId,setStudentId]=useState(''); const [department,setDepartment]=useState('');
  const [clubName,setClubName]=useState(''); const [position,setPosition]=useState('');
  const [verificationCode,setVerificationCode]=useState(''); const [pendingVerification,setPendingVerification]=useState(false);
  const [devCode,setDevCode]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if(mode==='signup') {
        const result=await api<any>('/api/v1/auth/signup',{method:'POST',body:JSON.stringify({email,password,role,full_name:fullName,student_id:studentId||null,department:department||null,club_name:clubName||null,position:position||null})});
        if(role==='student') { setPendingVerification(true); setDevCode(result.development_verification_code||''); setMessage('Account created. Verify your institutional email to activate your student account.'); }
        else { setMessage('Your request has been sent. You can log in after the Principal approves it.'); setMode('login'); }
      } else {
        const result=await api<any>('/api/v1/auth/login',{method:'POST',body:JSON.stringify({email,password})});
        if(!result?.access_token||!result?.user) throw new Error('The server returned an incomplete login response.');
        setSession(result.access_token,result.user); onAuthenticated(result.user); nav('/app',{replace:true});
      }
    } catch(err:any) { setError(err.message); } finally { setBusy(false); }
  }
  async function verify(e:FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result=await api<any>('/api/v1/auth/verify-email',{method:'POST',body:JSON.stringify({email,code:verificationCode})}); setSession(result.access_token,result.user); onAuthenticated(result.user); nav('/app',{replace:true}); }
    catch(err:any) { setError(err.message); } finally { setBusy(false); }
  }
  return <div className="auth-page"><Link to="/" className="brand"><span className="brand-mark">S</span><span>syncra<small>CAMPUS, CONNECTED</small></span></Link><div className="auth-card">
    <div className="eyebrow">YOUR CAMPUS, ONE PLACE</div><h1>{pendingVerification?'Verify your email':mode==='login'?'Welcome back.':'Find your people.'}</h1>
    <p>{pendingVerification?'Enter the six-digit verification code.':mode==='login'?'Pick up where your campus left off.':'Create your campus profile.'}</p>
    {message&&<div className="notice">{message}</div>}{error&&<div className="error-msg">{error}</div>}
    {pendingVerification?<form onSubmit={verify}><label>Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={e=>setVerificationCode(e.target.value)} required placeholder="6-digit code"/></label>{devCode&&<div className="demo-hint"><b>Development verification code</b><span>{devCode}</span></div>}<button className="btn btn-dark full" disabled={busy}>{busy?'Verifying…':'Verify email and continue'}</button></form>:<>
      <div className="auth-tabs"><button type="button" className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('');setMessage('')}}>Log in</button><button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('')}}>Sign up</button></div>
      <form onSubmit={submit}>
        {mode==='signup'&&<label>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} minLength={2} required placeholder="Your full name"/></label>}
        <label>Institutional email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@college.edu" autoComplete="email"/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==='login'?'current-password':'new-password'} placeholder="At least 8 characters"/></label>
        {mode==='signup'&&<>
          <label>I am a…<select value={role} onChange={e=>setRole(e.target.value)}><option value="student">Normal Student</option><option value="faculty">Faculty Coordinator</option></select></label>
          {role==='student'&&<label>Student ID (optional)<input value={studentId} onChange={e=>setStudentId(e.target.value)}/></label>}
          
          {role==='faculty'&&<><label>Department<input value={department} onChange={e=>setDepartment(e.target.value)} required/></label><label>Assigned club<select value={clubName} onChange={e=>setClubName(e.target.value)} required><option value="">Choose the club you coordinate</option>{['TEDxBMSIT&M','Node','Web3','AR/VR Club','E-Cell','Alterino'].map(c=><option key={c} value={c}>{c}</option>)}</select></label></>}
          <p className="muted">{role==='student'?'Student accounts activate after email verification.':'This profile remains pending until approved by the Principal.'} Principal accounts are provisioned privately by the institution.</p>
        </>}
        <button className="btn btn-dark full" disabled={busy}>{busy?'Please wait…':mode==='login'?'Log in to Syncra':'Create account'} <ArrowRight size={16}/></button>
      </form></>}
    <div className="demo-hint"><b>Local demo accounts</b><span>student@example.edu · syncra123</span><span>faculty@example.edu · syncra123</span></div>
  </div><span className="auth-foot">A little more together. A lot less complicated.</span></div>;
}

function Dashboard({ user }: {user:any}) {
  const location=useLocation();
  const section=location.pathname==='/app/events'?'events':location.pathname==='/app/notifications'?'notifications':'overview';
  const [events,setEvents]=useState<EventItem[]>([]); const [notifications,setNotifications]=useState<any[]>([]); const [accessRequests,setAccessRequests]=useState<any[]>([]); const [showCreate,setShowCreate]=useState(false); const [notice,setNotice]=useState(''); const [form,setForm]=useState({title:'',club:'Campus Club',date:'2026-12-12',time:'10:00',venue:'Main Auditorium',description:'',capacity:100});
  const refresh=()=>{api<EventItem[]>('/api/v1/events').then(setEvents).catch(e=>setNotice(e.message));api<any[]>('/api/v1/notifications').then(setNotifications).catch(()=>{});if(user.role==='principal')api<any[]>('/api/v1/admin/access-requests').then(setAccessRequests).catch(e=>setNotice(e.message));};
  useEffect(refresh,[]);
  async function register(id:string){try{await api(`/api/v1/events/${id}/register`,{method:'POST'});setNotice('You’re registered! See you there.');refresh();}catch(e:any){setNotice(e.message)}}
  async function create(e:FormEvent){e.preventDefault();try{await api('/api/v1/events',{method:'POST',body:JSON.stringify(form)});setShowCreate(false);setNotice('Your event has been submitted for approval.');refresh();}catch(err:any){setNotice(err.message)}}
  async function approve(id:string){try{await api('/api/v1/admin/access-requests/'+id+'/approve',{method:'POST'});setNotice('Access request approved.');refresh();}catch(e:any){setNotice(e.message)}}
  async function markRead(id:string){await api(`/api/v1/notifications/${id}/read`,{method:'POST'});refresh()}
  if(section==='events') return <><header className="page-header"><div><div className="eyebrow">DISCOVER YOUR CAMPUS</div><h1>Explore events <span>✳</span></h1><p>Find something interesting and save your spot.</p></div></header>{notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} <button>×</button></div>}<section className="panel"><div className="panel-heading"><div><div className="eyebrow">WHAT'S HAPPENING</div><h2>All campus events</h2></div><span className="live-pill">● LIVE</span></div>{events.length?events.map((e,i)=><article className="dashboard-event" key={e.id}><div className={`date-tile date-${i%3}`}><b>{new Date(`${e.date}T00:00:00`).getDate()}</b><small>{new Date(`${e.date}T00:00:00`).toLocaleString('en',{month:'short'}).toUpperCase()}</small></div><div className="dashboard-event-info"><span>{e.club} · {e.status}</span><h3>{e.title}</h3><small><Clock3 size={13}/> {e.time} &nbsp; <MapPin size={13}/> {e.venue}</small><p className="muted">{e.description}</p><div className="mini-track"><i style={{width:`${Math.min(100,e.registered/e.capacity*100)}%`}}/></div></div><button className="btn btn-outline" onClick={()=>register(e.id)}>Join</button></article>):<p className="muted">No campus events are available right now.</p>}</section></>;
  if(section==='notifications') return <><header className="page-header"><div><div className="eyebrow">CAMPUS UPDATES</div><h1>Notifications <span>✳</span></h1><p>Important updates and reminders in one place.</p></div></header>{notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} <button>×</button></div>}<section className="panel"><div className="eyebrow">YOUR INBOX</div><h2>Recent updates</h2>{notifications.length?notifications.map(n=><div className="notification" key={n.id}><span className="notification-icon"><Bell size={16}/></span><div><b>{n.title}</b><p>{n.message}</p>{!n.read&&<button onClick={()=>markRead(n.id)}>Mark as read</button>}</div></div>):<p className="muted">You're all caught up. No notifications yet.</p>}</section></>;
  return <><header className="page-header"><div><div className="eyebrow">YOUR CAMPUS WORKSPACE</div><h1>Hey, {user.email.split('@')[0]} <span>✳</span></h1><p>Here's what's happening around your campus.</p></div>{['president','faculty','principal'].includes(user.role)&&<button className="btn btn-coral" onClick={()=>setShowCreate(!showCreate)}><Plus size={17}/> Create event</button>}</header>{notice&&<div className="notice" onClick={()=>setNotice('')}>{notice} <button>×</button></div>}{user.role==='principal'&&<section className="panel" style={{marginBottom:18}}><div className="eyebrow">INSTITUTION ADMINISTRATION</div><h2>Access requests</h2>{accessRequests.length?accessRequests.map(r=><div className="dashboard-event" key={r.id}><div className="dashboard-event-info"><b>{r.profile?.full_name||r.email}</b><span>{r.role} · {r.profile?.club_name||r.profile?.department||''}</span></div><button className="btn btn-dark" onClick={()=>approve(r.id)}>Approve</button></div>):<p className="muted">No pending access requests.</p>}</section>}{showCreate&&<form className="create-form" onSubmit={create}><h3>Put something on the calendar.</h3><div className="form-grid"><label>Event name<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Club / organiser<input value={form.club} onChange={e=>setForm({...form,club:e.target.value})}/></label><label>Date<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Time<input type="time" required value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></label><label>Venue<input required value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></label><label>Capacity<input type="number" min="1" value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})}/></label></div><label>Description<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button className="btn btn-dark">Submit event</button></form>}
    <div className="stats-grid"><div className="stat-card"><span>LIVE EVENTS</span><b>{events.length.toString().padStart(2,'0')}</b><small>Across your campus</small><CalendarDays/></div><div className="stat-card"><span>SEATS CLAIMED</span><b>{events.reduce((n,e)=>n+e.registered,0)}</b><small>People showing up</small><Users/></div><div className="stat-card"><span>OPEN SPOTS</span><b>{events.reduce((n,e)=>n+Math.max(0,e.capacity-e.registered),0)}</b><small>Room for you</small><Compass/></div></div>
    <div className="dashboard-columns"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">DON'T MISS OUT</div><h2>Campus events</h2></div><span className="live-pill">● LIVE</span></div><div className="dashboard-events">{events.map((e,i)=><article className="dashboard-event" key={e.id}><div className={`date-tile date-${i%3}`}><b>{new Date(`${e.date}T00:00:00`).getDate()}</b><small>{new Date(`${e.date}T00:00:00`).toLocaleString('en',{month:'short'}).toUpperCase()}</small></div><div className="dashboard-event-info"><span>{e.club} · {e.status}</span><h3>{e.title}</h3><small><Clock3 size={13}/> {e.time} &nbsp; <MapPin size={13}/> {e.venue}</small><div className="mini-track"><i style={{width:`${Math.min(100,e.registered/e.capacity*100)}%`}}/></div></div><button className="btn btn-outline" onClick={()=>register(e.id)}>Join</button></article>)}</div></section><aside className="panel updates-panel"><div className="eyebrow">YOUR INBOX</div><h2>Little updates.</h2>{notifications.length?notifications.map(n=><div className="notification" key={n.id}><span className="notification-icon"><Bell size={16}/></span><div><b>{n.title}</b><p>{n.message}</p>{!n.read&&<button onClick={()=>markRead(n.id)}>Mark as read</button>}</div></div>):<p className="muted">You're all caught up. Enjoy the quiet.</p>}<div className="tip-card"><Sparkles size={18}/><b>Good things start by showing up.</b><span>Explore something new this week.</span></div></aside></div></>;
}

export default function App(){const {user,loading,setUser,signOut}=useAuth();if(loading)return <div className="loading">Syncing your campus…</div>;return <Routes><Route path="/" element={user?<Navigate to="/app" replace/>:<Landing/>}/><Route path="/auth" element={user?<Navigate to="/app" replace/>:<AuthPage onAuthenticated={setUser}/>}/><Route path="/app/*" element={user?<Shell user={user} onLogout={()=>{signOut();location.href='/'}}>{user.role==='student'?<StudentPortal user={user}/>:user.role==='president'?<PresidentDashboard user={user}/>:['faculty','principal'].includes(user.role)?<GovernanceDashboard user={user}/>:<Dashboard user={user}/>}</Shell>:<Navigate to="/auth" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
