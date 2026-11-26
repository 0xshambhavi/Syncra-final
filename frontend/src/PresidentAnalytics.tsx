import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, Instagram, MessageSquareText, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { api } from './utils/api';

type AnalyticsData = { club:string; events:any[]; feedback:any[]; instagram:any; event_reports:any[]; club_health:any; feedback_sources:Record<string,number>; integrations:any };
const money = (n:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);

export default function PresidentAnalytics({user}:{user:any}) {
  const [data,setData]=useState<AnalyticsData|null>(null);
  const [selected,setSelected]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [csv,setCsv]=useState('');
  const [source,setSource]=useState('student');
  const [rating,setRating]=useState(5);
  const [comments,setComments]=useState('');
  const [metrics,setMetrics]=useState({objective_delivery:75,operations:75,budget_discipline:75});
  const [instagram,setInstagram]=useState({followers:0,reach:0,impressions:0,profile_visits:0,interactions:0,link_clicks:0});
  const refresh=async()=>{setBusy(true);try{const d=await api<AnalyticsData>('/api/v1/president/analytics/overview');setData(d);setSelected(x=>x||d.events[0]?.id||'');setInstagram(d.instagram?.source==='not_connected'?instagram:{followers:d.instagram.followers||0,reach:d.instagram.reach||0,impressions:d.instagram.impressions||0,profile_visits:d.instagram.profile_visits||0,interactions:d.instagram.interactions||0,link_clicks:d.instagram.link_clicks||0});}catch(e:any){setNotice(e.message)}finally{setBusy(false)}};
  useEffect(()=>{void refresh()},[]);
  const selectedEvent=data?.events.find(e=>e.id===selected);
  const report=data?.event_reports.find(r=>r.event_id===selected);
  const chartData=useMemo(()=>data?.event_reports.map(r=>({name:r.event_title.length>18?r.event_title.slice(0,18)+'…':r.event_title,score:r.score}))||[],[data]);
  async function submitFeedback(e:FormEvent){e.preventDefault();try{await api('/api/v1/president/analytics/feedback',{method:'POST',body:JSON.stringify({event_id:selected,source,rating,comments})});setComments('');setNotice('Feedback response added to the event report.');await refresh()}catch(err:any){setNotice(err.message)}}
  async function importCsv(e:FormEvent){e.preventDefault();try{const result=await api<any>('/api/v1/president/analytics/feedback/import-csv',{method:'POST',body:JSON.stringify({event_id:selected,csv})});setNotice('Imported '+result.imported+' Google Forms responses.');setCsv('');await refresh()}catch(err:any){setNotice(err.message)}}
  async function saveInstagram(e:FormEvent){e.preventDefault();try{await api('/api/v1/president/analytics/instagram',{method:'PUT',body:JSON.stringify(instagram)});setNotice('Instagram insight snapshot saved.');await refresh()}catch(err:any){setNotice(err.message)}}
  async function saveMetrics(e:FormEvent){e.preventDefault();try{await api('/api/v1/president/analytics/events/'+selected+'/metrics',{method:'PUT',body:JSON.stringify(metrics)});setNotice('Event evaluation inputs saved.');await refresh()}catch(err:any){setNotice(err.message)}}
  const scoreColor=(score:number)=>score>=85?'#16845b':score>=70?'#bd7c00':score>=50?'#c65b3c':'#b42318';
  return <div className="staff-dashboard">
    <header className="page-header"><div><div className="eyebrow">CLUB PERFORMANCE STUDIO</div><h1>Analytics & reports <span>✳</span></h1><p>{data?.club||user?.profile?.club_name||'Your club'} · Turn event feedback and social performance into decisions.</p></div><button className="btn btn-outline" onClick={()=>void refresh()}><RefreshCw size={15}/> {busy?'Refreshing…':'Refresh data'}</button></header>
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
    {!data?<section className="panel">Loading your club analytics…</section>:<>
    <div className="stats-grid">
      <div className="stat-card"><span>CLUB HEALTH</span><b>{data.club_health.score}<small>/100</small></b><small>{data.club_health.label} · {data.club_health.events_scored} event reports</small><ShieldCheck/></div>
      <div className="stat-card"><span>FEEDBACK RESPONSES</span><b>{Object.values(data.feedback_sources).reduce((a,b)=>a+b,0)}</b><small>Faculty {data.feedback_sources.faculty||0} · Students {data.feedback_sources.student||0} · Guests {data.feedback_sources.guest||0}</small><MessageSquareText/></div>
      <div className="stat-card"><span>INSTAGRAM FOLLOWERS</span><b>{(data.instagram.followers||0).toLocaleString('en-IN')}</b><small>{data.instagram.engagement_rate||0}% engagement rate · {data.instagram.source==='not_connected'?'Not connected':'Snapshot imported'}</small><Instagram/></div>
    </div>
    <div className="dashboard-columns">
      <section className="panel"><div className="eyebrow">EVENT SCORECARD</div><h2>How events are performing</h2>{chartData.length?<div style={{width:'100%',height:260}}><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="score" fill="#8e9bff" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>:<p className="muted">Create an event report to begin building a performance history.</p>}</section>
      <aside className="panel"><div className="eyebrow">CLUB HEALTH REPORT</div><h2>{data.club_health.label}</h2><div style={{fontSize:52,fontWeight:800,lineHeight:1.1}}>{data.club_health.score}<small style={{fontSize:18}}>/100</small></div><p className="muted">{data.club_health.basis}</p><div className="settings-row"><b>Events with reports</b><span>{data.club_health.events_scored}</span></div><p className="muted">A low score highlights areas for the club leadership to review. Scores based on incomplete inputs are marked partial.</p></aside>
    </div>
    <section className="panel" style={{marginTop:18}}><div className="panel-heading"><div><div className="eyebrow">EVENT REPORT GENERATOR</div><h2>Generate an event evaluation</h2></div><BarChart3/></div>
      <label>Choose your event<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select an event</option>{data.events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      {selectedEvent&&<><div className="stats-grid" style={{marginTop:16}}><div className="stat-card"><span>OVERALL EVENT SCORE</span><b style={{color:scoreColor(report?.score||0)}}>{report?.score||0}<small>/100</small></b><small>{report?.grade||'Awaiting inputs'} · {report?.data_completeness||'partial'} data</small><Activity/></div><div className="stat-card"><span>AVERAGE FEEDBACK</span><b>{report?.rating_average??'—'}<small>/5</small></b><small>{report?.response_count||0} responses</small><MessageSquareText/></div><div className="stat-card"><span>ATTENDANCE / CAPACITY</span><b>{Math.round((selectedEvent.registered||0)/Math.max(1,selectedEvent.capacity||1)*100)}<small>%</small></b><small>{selectedEvent.registered||0} of {selectedEvent.capacity||0} seats</small><Activity/></div></div>
      <h3 style={{marginTop:20}}>Success criteria (weighted score out of 100)</h3><p className="muted">Attendance 20% · Satisfaction 25% · Objective delivery 20% · Operations 15% · Budget discipline 10% · Digital engagement 10%.</p>
      <div className="form-grid">{Object.entries(report?.criteria||{}).map(([k,v]:any)=><div className="settings-row" key={k}><b>{k.replace(/_/g,' ')}</b><span>{v}/100</span></div>)}</div>
      <form className="create-form" onSubmit={saveMetrics}><h3>Record organiser evaluation</h3><p className="muted">Enter evidence-based scores after the event. These are kept separate from respondent ratings.</p><div className="form-grid">{Object.entries(metrics).map(([k,v])=><label key={k}>{k.replace(/_/g,' ')} (0–100)<input type="number" min="0" max="100" value={v} onChange={e=>setMetrics({...metrics,[k]:Number(e.target.value)})}/></label>)}</div><button className="btn btn-dark">Save evaluation inputs</button></form>
      </>}
    </section>
    <div className="dashboard-columns" style={{marginTop:18}}>
      <section className="panel"><div className="eyebrow">GOOGLE FORMS FEEDBACK</div><h2>Faculty, student & guest responses</h2><p className="muted">Export your Google Form responses as CSV (Google Forms → Responses → Open in Sheets → File → Download → CSV), then import the file content here. Rating columns should contain a 1–5 score; respondent role should identify faculty, student or guest.</p><form className="create-form" onSubmit={importCsv}><label>Event<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select an event</option>{data.events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><label>Paste CSV contents<textarea rows={6} value={csv} onChange={e=>setCsv(e.target.value)} placeholder="Timestamp,Respondent role,Overall rating,Comments…"/></label><button className="btn btn-dark" disabled={!selected||!csv.trim()}><Upload size={15}/> Import Google Forms CSV</button></form>
      <form className="create-form" onSubmit={submitFeedback}><h3>Add a response manually</h3><div className="form-grid"><label>Respondent type<select value={source} onChange={e=>setSource(e.target.value)}><option value="student">Student</option><option value="faculty">Faculty</option><option value="guest">Guest</option></select></label><label>Rating (1–5)<input type="number" min="1" max="5" value={rating} onChange={e=>setRating(Number(e.target.value))}/></label></div><label>Feedback<textarea rows={3} value={comments} onChange={e=>setComments(e.target.value)}/></label><button className="btn btn-outline" disabled={!selected}>Add feedback</button></form></section>
      <section className="panel"><div className="eyebrow">INSTAGRAM INSIGHTS</div><h2>Club page performance</h2><p className="muted">Demo mode: enter metrics from Instagram Insights. Live Meta Graph API access requires a connected professional account and valid permissions; no scraping or guessed metrics are used.</p><form className="create-form" onSubmit={saveInstagram}><div className="form-grid">{Object.entries(instagram).map(([k,v])=><label key={k}>{k.replace(/_/g,' ')}<input type="number" min="0" value={v} onChange={e=>setInstagram({...instagram,[k]:Number(e.target.value)})}/></label>)}</div><button className="btn btn-dark"><Instagram size={15}/> Save insights snapshot</button></form><div className="settings-row"><b>Engagement rate</b><span>{data.instagram.engagement_rate||0}%</span></div><div className="settings-row"><b>Profile visits</b><span>{data.instagram.profile_visits||0}</span></div><div className="settings-row"><b>Link clicks</b><span>{data.instagram.link_clicks||0}</span></div></section>
    </div>
    <section className="panel" style={{marginTop:18}}><div className="eyebrow">REPORT HISTORY</div><h2>Event-by-event results</h2>{data.event_reports.map(r=><article className="settings-row" key={r.event_id}><div><b>{r.event_title}</b><p>{r.grade} · {r.response_count} feedback responses · {r.data_completeness} inputs</p></div><strong>{r.score}/100</strong></article>)}</section>
    </>}
  </div>;
}
