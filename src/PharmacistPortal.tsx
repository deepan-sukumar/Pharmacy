import React, { useState } from 'react';
import {
  LayoutDashboard, Boxes, PackagePlus, CalendarDays, CreditCard, ClipboardList,
  Users, Bell, Truck, RotateCcw, BrainCircuit, BarChart3, Settings as SettingsIcon,
  Stethoscope, Search, LogOut, Menu, X, ChevronDown, Plus, Download, Edit3, Trash2,
  AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight, Clock3, Package, Filter,
  Check, Send, QrCode, FileText, MoreHorizontal, ChevronRight,
  Activity, CheckCircle2, ShieldCheck
} from 'lucide-react';
import type { Page, Medicine, Audit, Status } from './data';
import { customers, initialInventory } from './data';

const nav = [
  { id:'dashboard', label:'Dashboard', icon:LayoutDashboard },
  { id:'inventory', label:'Medicine Inventory', icon:Boxes },
  { id:'add-stock', label:'Add Stock', icon:PackagePlus },
  { id:'expiry', label:'Batch & Expiry', icon:CalendarDays },
  { id:'dispensing', label:'Dispensing', icon:CreditCard },
  { id:'audit', label:'Dispensing Audit', icon:ClipboardList },
  { id:'customers', label:'Customers', icon:Users },
  { id:'alerts', label:'Alerts', icon:Bell, count:3 },
  { id:'suppliers', label:'Suppliers & Returns', icon:Truck },
  { id:'recall', label:'Batch Recall', icon:RotateCcw },
  { id:'ai', label:'AI Pharmacy Assistant', icon:BrainCircuit },
  { id:'reports', label:'Reports & Analytics', icon:BarChart3 },
  { id:'settings', label:'Settings', icon:SettingsIcon },
];

function Sidebar({ open, page, onNavigate, onLogout }: { open:boolean; page:Page; onNavigate:(p:string)=>void; onLogout:()=>void }) {
  return (
    <aside style={{ width: open?248:76, flexShrink:0, position:'fixed', inset:'0 auto 0 0', zIndex:30, background:'white', borderRight:'1px solid #E5E5E0', display:'flex', flexDirection:'column', transition:'width 0.2s' }} className="hidden-mobile-aside">
      <div style={{ height:72, display:'flex', alignItems:'center', padding:'0 16px', gap:10, borderBottom:'1px solid #EFEFEA', flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'#6B8068', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Stethoscope size={19} color="white" />
        </div>
        {open && <span style={{ fontWeight:800, fontSize:16, letterSpacing:'-0.3px', color:'#111111', whiteSpace:'nowrap' }}>PHARMA<span style={{ color:'#6B8068' }}>FLOW</span></span>}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 10px' }}>
        {!open ? null : <p style={{ fontSize:10, fontWeight:700, color:'#888888', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0 10px', marginBottom:8 }}>Workspace</p>}
        {nav.map(({ id, label, icon:Icon, count }) => (
          <button key={id} onClick={()=>onNavigate(id)} className={`sidebar-item ${page===id?'active':''}`} style={{ justifyContent: open?'flex-start':'center', marginBottom:2 }} title={!open?label:undefined}>
            <Icon size={18} strokeWidth={page===id?2.5:1.8} style={{ flexShrink:0 }} />
            {open && <span style={{ flex:1 }}>{label}</span>}
            {open && count && <span style={{ fontSize:10, minWidth:18, height:18, borderRadius:99, background:'#F9ECEF', color:'#A63A50', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{count}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding:10, borderTop:'1px solid #EFEFEA' }}>
        <button onClick={onLogout} className="sidebar-item" style={{ justifyContent: open?'flex-start':'center', color:'#888888' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#F9ECEF';(e.currentTarget as HTMLElement).style.color='#A63A50';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='';(e.currentTarget as HTMLElement).style.color='#888888';}}>
          <LogOut size={17} />
          {open && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}

function Topbar({ onMenu, page, onAlerts }: { onMenu:()=>void; page:Page; onAlerts:()=>void }) {
  const label = nav.find(x=>x.id===page)?.label || 'PharmaFlow';
  return (
    <header style={{ height:72, background:'white', borderBottom:'1px solid #E5E5E0', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px 0 28px', position:'sticky', top:0, zIndex:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onMenu} style={{ background:'none', border:'none', cursor:'pointer', padding:8, borderRadius:8, color:'#555555' }}>
          <Menu size={20} />
        </button>
        <div>
          <h1 style={{ fontSize:18, fontWeight:800, color:'#111111', letterSpacing:'-0.3px' }}>{page==='dashboard'?'Good morning, Dr. Anita 👋':label}</h1>
          <p style={{ fontSize:12, color:'#888888' }}>{page==='dashboard'?'Here\'s what\'s happening across your pharmacy today.':'Manage your pharmacy operations'}</p>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div className="search-input" style={{ width:220 }}>
          <Search size={15} color="#888888" /><input placeholder="Search anything..." />
        </div>
        <button onClick={onAlerts} style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:8, borderRadius:8, color:'#555555' }}>
          <Bell size={19} />
          <span style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:'50%', background:'#A63A50', border:'2px solid white' }} />
        </button>
        <div style={{ width:1, height:32, background:'#E5E5E0' }} />
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#526350' }}>AR</div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#111111' }}>Dr. Anita Rao</p>
            <p style={{ fontSize:11, color:'#888888' }}>Pharmacist</p>
          </div>
          <ChevronDown size={14} color="#888888" />
        </div>
      </div>
    </header>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow?:string; title:string; description?:string; action?:React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:16 }}>
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 style={{ fontSize:24, fontWeight:800, color:'#111111', letterSpacing:'-0.3px' }}>{title}</h2>
        {description && <p style={{ fontSize:14, color:'#555555', marginTop:4 }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value, change, icon:Icon, tone='sage' }: { label:string; value:string; change?:string; icon: React.ElementType; tone?:string }) {
  const bg: Record<string,string> = { sage:'#E8EFE7', teal:'#E3ECE7', green:'#E6EFEA', amber:'#F7EDE2', red:'#F9ECEF', orange:'#F7EBE3' };
  const fg: Record<string,string> = { sage:'#526350', teal:'#4A6B5D', green:'#52796F', amber:'#8C5E3C', red:'#A63A50', orange:'#B86B35' };
  return (
    <div className="card" style={{ padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <p style={{ fontSize:12, color:'#555555', fontWeight:500 }}>{label}</p>
          <p className="stat-value" style={{ marginTop:6 }}>{value}</p>
          {change && <p style={{ fontSize:12, color:'#52796F', marginTop:4, display:'flex', alignItems:'center', gap:3 }}><ArrowUpRight size={13}/>{change}</p>}
        </div>
        <div style={{ width:40, height:40, borderRadius:10, background:bg[tone]||bg.sage, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={20} color={fg[tone]||fg.sage} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, action, children, className }: { title:string; action?:React.ReactNode; children:React.ReactNode; className?:string }) {
  return (
    <div className={`card ${className||''}`}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #EFEFEA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#111111' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Badge({ status }: { status:string }) {
  const map: Record<string,string> = {
    Available:'badge-green', 'Near Expiry':'badge-amber', Recalled:'badge-red', 'Low Stock':'badge-orange', Expired:'badge-gray', Completed:'badge-green', Active:'badge-green', Invited:'badge-blue'
  };
  return <span className={`chip ${map[status]||'badge-gray'}`}><span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }}/>{status}</span>;
}

function SimpleChart({ type='line' }: { type?:string }) {
  return (
    <div style={{ padding:'16px 20px 28px', height:200, position:'relative' }}>
      <svg viewBox="0 0 600 160" style={{ width:'100%', height:'100%' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6B8068" stopOpacity=".2"/>
            <stop offset="1" stopColor="#6B8068" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {type==='bar' ? [42,65,48,75,58,82,70,92,61,76,48,68].map((h,i)=>(
          <rect key={i} x={i*50+5} y={160-h*1.5} width="22" height={h*1.5} rx="4" fill={i%3===1?'#6B8068':'#E8EFE7'} />
        )) : <>
          <path d="M0 130 C50 110 70 135 120 95 S180 120 220 75 S280 105 320 60 S390 85 430 40 S490 60 540 28 S570 50 600 15 L600 160 L0 160Z" fill="url(#grad)"/>
          <path d="M0 130 C50 110 70 135 120 95 S180 120 220 75 S280 105 320 60 S390 85 430 40 S490 60 540 28 S570 50 600 15" fill="none" stroke="#6B8068" strokeWidth="2.5" strokeLinecap="round"/>
        </>}
      </svg>
    </div>
  );
}

function AlertRow({ icon:Icon, tone, title, detail }: { icon: React.ElementType; tone:string; title:string; detail:string }) {
  const c: Record<string,string> = { amber:'#F7EDE2', red:'#F9ECEF', orange:'#F7EBE3' };
  const tc: Record<string,string> = { amber:'#8C5E3C', red:'#A63A50', orange:'#B86B35' };
  return (
    <div style={{ display:'flex', gap:12 }}>
      <div style={{ width:36, height:36, borderRadius:9, background:c[tone]||'#F2F2EE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={17} color={tc[tone]||'#555555'} />
      </div>
      <div>
        <p style={{ fontSize:13.5, fontWeight:600, color:'#111111' }}>{title}</p>
        <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>{detail}</p>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate:(p:string)=>void }) {
  return (
    <>
      <PageHeader eyebrow="OVERVIEW" title="Good morning, Dr. Anita" description="Here's what's happening across your pharmacy today." action={<button className="btn btn-sage" onClick={()=>onNavigate('dispensing')}><Plus size={15}/> New dispensing</button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        <Stat label="Medicines" value="128" change="4.2% this month" icon={Package} tone="sage" />
        <Stat label="Batches" value="246" change="2.1% this month" icon={Boxes} tone="teal" />
        <Stat label="Total Stock" value="18,420" change="8.4% this month" icon={Activity} tone="green" />
        <Stat label="Low Stock" value="7" icon={AlertTriangle} tone="amber" />
        <Stat label="Near Expiry" value="12" icon={Clock3} tone="amber" />
        <Stat label="Expired" value="3" icon={AlertCircle} tone="red" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, marginBottom:20 }}>
        <Panel title="Expiry Risk Overview" action={<button style={{ fontSize:12, color:'#6B8068', fontWeight:600, background:'none', border:'none', cursor:'pointer' }} onClick={()=>onNavigate('expiry')}>View report</button>}>
          <SimpleChart />
        </Panel>
        <Panel title="Critical Alerts" action={<button style={{ fontSize:12, color:'#6B8068', fontWeight:600, background:'none', border:'none', cursor:'pointer' }} onClick={()=>onNavigate('alerts')}>See all</button>}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
            <AlertRow icon={AlertTriangle} tone="amber" title="Vitamin D3 expires soon" detail="Batch VD102 · 12 days left" />
            <AlertRow icon={AlertCircle} tone="red" title="Batch AMX204 recalled" detail="45 units · Action required" />
            <AlertRow icon={ArrowDownRight} tone="orange" title="Paracetamol low stock" detail="Only 12 units remaining" />
          </div>
        </Panel>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Panel title="Stock Movement" action={<span style={{ fontSize:12, color:'#888888' }}>Last 6 months</span>}>
          <SimpleChart type="bar" />
        </Panel>
        <Panel title="Most Dispensed" action={<button style={{ fontSize:12, color:'#6B8068', fontWeight:600, background:'none', border:'none', cursor:'pointer' }} onClick={()=>onNavigate('reports')}>Full report</button>}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {[['Paracetamol 500mg','2,480','32%','#6B8068'],['Cetirizine 10mg','1,842','24%','#4A6B5D'],['Metformin 500mg','1,490','19%','#555555'],['Vitamin D3 60K','988','13%','#B5838D']].map(([n,v,p,c])=>(
              <div key={n}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{n}</span>
                  <span style={{ fontSize:13, color:'#555555' }}>{v} <span style={{ fontSize:11 }}>({p})</span></span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width:p, background:c }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div style={{ borderRadius:16, background:'#111111', padding:24, display:'flex', alignItems:'center', gap:20 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:'#6B8068', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <BrainCircuit size={22} color="white" />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10, color:'#A3B19B', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>AI INSIGHT</p>
          <p style={{ color:'white', fontWeight:600, marginTop:4 }}>Your Vitamin D3 inventory may exceed demand before expiry. Consider pausing the next order.</p>
        </div>
        <button onClick={()=>onNavigate('ai')} className="btn" style={{ background:'rgba(255,255,255,0.12)', color:'white', border:'1px solid rgba(255,255,255,0.18)', whiteSpace:'nowrap' }}>
          Ask AI <ChevronRight size={14}/>
        </button>
      </div>
    </>
  );
}

function Inventory({ inventory, setInventory, onAdd, showToast }: { inventory:Medicine[]; setInventory:React.Dispatch<React.SetStateAction<Medicine[]>>; onAdd:()=>void; showToast:(s:string)=>void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [edit, setEdit] = useState<Medicine|null>(null);
  const rows = inventory.filter(m => (m.medicine+m.batch+m.supplier).toLowerCase().includes(q.toLowerCase()) && (filter==='All'||m.status===filter));
  return (
    <>
      <PageHeader eyebrow="STOCK CONTROL" title="Medicine Inventory" description="Track medicines, batches, and stock status in one place." action={<button onClick={onAdd} className="btn btn-sage"><Plus size={15}/> Add stock</button>} />
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:16, display:'flex', gap:12, justifyContent:'space-between', borderBottom:'1px solid #EFEFEA', flexWrap:'wrap' }}>
          <div className="search-input" style={{ minWidth:260 }}>
            <Search size={15} color="#888888" /><input placeholder="Search medicine, batch..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <select className="input" style={{ width:150 }} value={filter} onChange={e=>setFilter(e.target.value)}>
              <option>All</option><option>Available</option><option>Near Expiry</option><option>Low Stock</option><option>Recalled</option>
            </select>
            <button className="btn btn-secondary"><Download size={14}/> Export</button>
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead><tr style={{ background:'#F2F2EE' }}>
              {['Medicine','Batch','Expiry','Quantity','Supplier','Status',''].map(h=>(
                <th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(m=>(
                <tr key={m.id} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                  <td style={{ padding:'14px 20px' }}><p style={{ fontWeight:600, fontSize:13.5, color:'#111111' }}>{m.medicine}</p><p style={{ fontSize:11, color:'#888888', marginTop:2 }}>Updated today</p></td>
                  <td style={{ padding:'14px 20px', fontFamily:'monospace', fontSize:13, color:'#555555' }}>{m.batch}</td>
                  <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{m.expiry}</td>
                  <td style={{ padding:'14px 20px', fontSize:14, fontWeight:700, color:'#111111' }}>{m.quantity}</td>
                  <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{m.supplier}</td>
                  <td style={{ padding:'14px 20px' }}><Badge status={m.status}/></td>
                  <td style={{ padding:'14px 20px' }}>
                    <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                      <button className="btn btn-ghost" style={{ padding:6 }} onClick={()=>setEdit(m)}><Edit3 size={14}/></button>
                      <button className="btn btn-ghost" style={{ padding:6, color:'#A63A50' }} onClick={()=>{ setInventory(inventory.filter(x=>x.id!==m.id)); showToast('Medicine removed'); }}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 20px', borderTop:'1px solid #EFEFEA', fontSize:12, color:'#888888' }}>Showing {rows.length} of {inventory.length} medicines</div>
      </div>
      {edit && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(17,17,17,0.4)' }} onClick={()=>setEdit(null)} />
          <div className="card animate-scale-in" style={{ position:'relative', width:'100%', maxWidth:440, padding:0 }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #EFEFEA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontWeight:700, fontSize:16 }}>Edit medicine</h3>
              <button onClick={()=>setEdit(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#888888' }}><X size={18}/></button>
            </div>
            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
              <div><label className="label">Medicine name</label><input className="input" value={edit.medicine} onChange={e=>setEdit({...edit,medicine:e.target.value})}/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label className="label">Quantity</label><input className="input" type="number" value={edit.quantity} onChange={e=>setEdit({...edit,quantity:Number(e.target.value)})}/></div>
                <div><label className="label">Status</label><select className="input" value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value as Status})}><option>Available</option><option>Near Expiry</option><option>Low Stock</option><option>Recalled</option></select></div>
              </div>
              <button className="btn btn-sage" style={{ justifyContent:'center' }} onClick={()=>{ setInventory(inventory.map(x=>x.id===edit.id?edit:x)); setEdit(null); showToast('Inventory updated'); }}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddStock({ inventory, setInventory, onDone, showToast }: { inventory:Medicine[]; setInventory:React.Dispatch<React.SetStateAction<Medicine[]>>; onDone:()=>void; showToast:(s:string)=>void }) {
  const [tab, setTab] = useState('Barcode / QR');
  const [form, setForm] = useState({ medicine:'', batch:'', expiry:'', quantity:'', supplier:'' });
  const demo = (kind:string) => { setTab(kind); setForm(kind==='Invoice OCR'?{medicine:'Azithromycin 250mg',batch:'AZI118',expiry:'Dec 2027',quantity:'240',supplier:'MediSource'}:{medicine:'Metformin 500mg',batch:'MET624',expiry:'Feb 2028',quantity:'180',supplier:'ABC Pharma'}); showToast(`${kind} captured details`); };
  const submit = () => { if(!form.medicine||!form.quantity){showToast('Please complete all fields');return;} setInventory([...inventory,{id:Date.now(),medicine:form.medicine,batch:form.batch||'NEW001',expiry:form.expiry||'Dec 2027',quantity:Number(form.quantity),supplier:form.supplier||'ABC Pharma',status:'Available'}]); showToast('Stock added'); onDone(); };
  return (
    <>
      <PageHeader eyebrow="STOCK CONTROL" title="Add Stock" description="Bring new stock into your inventory using the fastest method." />
      <div className="card" style={{ maxWidth:760 }}>
        <div style={{ display:'flex', borderBottom:'1px solid #EFEFEA' }}>
          {['Barcode / QR','Invoice OCR','Manual entry'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'14px', fontSize:13, fontWeight:600, border:'none', borderBottom:`2px solid ${tab===t?'#6B8068':'transparent'}`, background:'none', color:tab===t?'#6B8068':'#888888', cursor:'pointer', transition:'all 0.15s' }}>{t}</button>
          ))}
        </div>
        {tab!=='Manual entry' && (
          <div style={{ padding:20, background:'#E8EFE7', borderBottom:'1px solid #D5E2D3', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                {tab==='Invoice OCR'?<FileText size={19} color="#526350"/>:<QrCode size={19} color="#526350"/>}
              </div>
              <div>
                <p style={{ fontWeight:600, fontSize:14, color:'#111111' }}>{tab==='Invoice OCR'?'Extract from invoice':'Scan a barcode'}</p>
                <p style={{ fontSize:12, color:'#555555', marginTop:2 }}>Demo auto-fills realistic details</p>
              </div>
            </div>
            <button className="btn btn-sage" onClick={()=>demo(tab)}>Demo {tab==='Invoice OCR'?'OCR':'Scan'}</button>
          </div>
        )}
        <div style={{ padding:24, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ gridColumn:'span 2' }}><label className="label">Medicine name</label><input className="input" placeholder="e.g. Paracetamol 500mg" value={form.medicine} onChange={e=>setForm({...form,medicine:e.target.value})}/></div>
          <div><label className="label">Batch number</label><input className="input" placeholder="e.g. PCT101" value={form.batch} onChange={e=>setForm({...form,batch:e.target.value})}/></div>
          <div><label className="label">Expiry date</label><input className="input" placeholder="e.g. Sep 2027" value={form.expiry} onChange={e=>setForm({...form,expiry:e.target.value})}/></div>
          <div><label className="label">Quantity</label><input className="input" type="number" placeholder="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></div>
          <div><label className="label">Supplier</label><select className="input" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}><option value="">Select supplier</option><option>ABC Pharma</option><option>MediSource</option><option>HealthCare Labs</option><option>Nova Pharma</option></select></div>
          <div style={{ gridColumn:'span 2', display:'flex', gap:12, justifyContent:'flex-end' }}>
            <button className="btn btn-secondary" onClick={onDone}>Cancel</button>
            <button className="btn btn-sage" onClick={submit}><PackagePlus size={15}/> Add to inventory</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Expiry({ inventory }: { inventory:Medicine[] }) {
  return (
    <>
      <PageHeader eyebrow="RISK MANAGEMENT" title="Batch & Expiry" description="Stay ahead of expiry risk with a clear view of every batch." action={<button className="btn btn-secondary"><Download size={14}/> Export report</button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <Stat label="Total Batches" value="246" icon={Boxes} tone="sage" />
        <Stat label="Expiring in 30d" value="12" icon={Clock3} tone="amber" />
        <Stat label="Expiring in 90d" value="28" icon={CalendarDays} tone="teal" />
        <Stat label="Expired" value="3" icon={AlertCircle} tone="red" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, marginBottom:20 }}>
        <Panel title="Expiry Timeline">
          <div style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24, fontSize:12, color:'#888888' }}>
              {['Today','30 days','60 days','90 days','120 days'].map(t=><span key={t}>{t}</span>)}
            </div>
            <div style={{ position:'relative', height:100, borderTop:'1.5px solid #E5E5E0' }}>
              {[{ left:'12%', top:16, text:'AMX204', sub:'Oct 2026 · Recalled', color:'#A63A50', bg:'#F9ECEF', border:'#F3C6D0' },
                { left:'25%', top:52, text:'VD102', sub:'Sep 2026 · High risk', color:'#8C5E3C', bg:'#F7EDE2', border:'#EBD4BF' }].map(b=>(
                <div key={b.text} style={{ position:'absolute', left:b.left, top:b.top, background:b.bg, border:`1px solid ${b.border}`, borderRadius:8, padding:'8px 12px', fontSize:12, color:b.color, fontWeight:600, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                  <span style={{ display:'block' }}>{b.text}</span>
                  <span style={{ fontWeight:400, fontSize:11 }}>{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Risk Distribution">
          <div style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
            <div style={{ width:140, height:140, borderRadius:'50%', background:'conic-gradient(#A63A50 0 4%,#B86B35 4% 16%,#52796F 16% 30%,#E5E5E0 30% 100%)', position:'relative' }}>
              <div style={{ position:'absolute', inset:20, borderRadius:'50%', background:'white', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:24, fontWeight:800, color:'#111111' }}>246</span>
                <span style={{ fontSize:11, color:'#888888' }}>batches</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
              {[['Expired','3','#A63A50'],['High risk','12','#B86B35'],['Watch','34','#52796F'],['Safe','197','#CCCCCC']].map(([n,v,c])=>(
                <div key={n} style={{ display:'flex', justifyContent:'space-between', fontSize:13, alignItems:'center' }}>
                  <span style={{ display:'flex', gap:8, alignItems:'center' }}><span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>{n}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Priority Batches">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead><tr style={{ background:'#F2F2EE' }}>
              {['Medicine','Batch','Expiry','Days Left','Risk','Action'].map(h=><th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{inventory.slice(1,5).map((m,i)=>(
              <tr key={m.batch} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                <td style={{ padding:'14px 20px', fontWeight:600, fontSize:13 }}>{m.medicine}</td>
                <td style={{ padding:'14px 20px', fontFamily:'monospace', fontSize:13 }}>{m.batch}</td>
                <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{m.expiry}</td>
                <td style={{ padding:'14px 20px', fontWeight:700, fontSize:14 }}>{[12,42,68,103][i]}</td>
                <td style={{ padding:'14px 20px' }}><Badge status={i<2?'Near Expiry':'Available'}/></td>
                <td style={{ padding:'14px 20px' }}><button style={{ fontSize:12, color:'#6B8068', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Review batch</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Dispensing({ inventory, setInventory, audits, setAudits, showToast }: { inventory:Medicine[]; setInventory:React.Dispatch<React.SetStateAction<Medicine[]>>; audits:Audit[]; setAudits:React.Dispatch<React.SetStateAction<Audit[]>>; showToast:(s:string)=>void }) {
  const [medicine, setMedicine] = useState('');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState(1);
  const [customer, setCustomer] = useState('');
  const chosen = inventory.find(x=>x.medicine===medicine&&(!batch||x.batch===batch));
  const confirm = () => {
    if(!chosen||!customer||qty<1){showToast('Complete all dispensing details');return;}
    if(qty>chosen.quantity){showToast(`Only ${chosen.quantity} units available`);return;}
    setInventory(inventory.map(x=>x.id===chosen.id?{...x,quantity:x.quantity-qty}:x));
    setAudits([{id:Date.now(),date:'Just now',medicine:chosen.medicine,batch:chosen.batch,quantity:qty,customer,pharmacist:'Dr. Anita Rao',status:'Completed'},...audits]);
    showToast('Dispensing confirmed & audit logged');
    setMedicine('');setBatch('');setQty(1);setCustomer('');
  };
  return (
    <>
      <PageHeader eyebrow="DAILY OPERATIONS" title="Dispensing" description="Safely dispense medication with full batch traceability." />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}>
        <div className="card">
          <div style={{ padding:20, borderBottom:'1px solid #EFEFEA', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center' }}><CreditCard size={18} color="#526350"/></div>
            <div><h3 style={{ fontWeight:700, fontSize:15 }}>New dispensing record</h3><p style={{ fontSize:12, color:'#888888', marginTop:2 }}>Record what leaves your pharmacy</p></div>
          </div>
          <div style={{ padding:24, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ gridColumn:'span 2' }}>
              <label className="label">Select medicine</label>
              <select className="input" value={medicine} onChange={e=>{setMedicine(e.target.value);setBatch('');}}>
                <option value="">Choose medicine</option>
                {inventory.filter(x=>x.status!=='Recalled').map(x=><option key={x.id}>{x.medicine}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Select batch</label>
              <select className="input" value={batch} onChange={e=>setBatch(e.target.value)} disabled={!medicine}>
                <option value="">{chosen?'Auto-select FEFO':'Choose batch'}</option>
                {inventory.filter(x=>x.medicine===medicine).map(x=><option key={x.batch} value={x.batch}>{x.batch} · {x.quantity} units · {x.expiry}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))}/>
              {chosen && <p style={{ fontSize:11, color:'#888888', marginTop:4 }}>Available: {chosen.quantity} units</p>}
            </div>
            <div>
              <label className="label">Customer</label>
              <select className="input" value={customer} onChange={e=>setCustomer(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map(x=><option key={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Preferred Language</label>
              <select className="input"><option>English</option><option>Hindi</option><option>Tamil</option><option>Malayalam</option></select>
            </div>
            <div style={{ gridColumn:'span 2', display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-sage" style={{ padding:'11px 24px' }} onClick={confirm}><Check size={15}/> Confirm dispensing</button>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ padding:20 }}>
            <p style={{ fontSize:12, color:'#555555', fontWeight:500 }}>Dispensed today</p>
            <p style={{ fontSize:36, fontWeight:800, color:'#111111', marginTop:4 }}>42</p>
            <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>records completed</p>
            <div className="progress-bar" style={{ marginTop:14 }}><div className="progress-fill" style={{ width:'72%', background:'#6B8068' }}/></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:6 }}><span style={{ color:'#555555' }}>Daily target</span><b>72%</b></div>
          </div>
          <Panel title="Recent records">
            <div style={{ display:'flex', flexDirection:'column' }}>
              {audits.slice(0,3).map(a=>(
                <div key={a.id} style={{ padding:'14px 20px', borderTop:'1px solid #EFEFEA' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#111111' }}>{a.medicine}</p>
                    <span style={{ fontSize:12, color:'#888888' }}>{a.quantity}x</span>
                  </div>
                  <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>{a.customer} · {a.date}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function AuditPage({ audits }: { audits:Audit[] }) {
  const [q, setQ] = useState('');
  const rows = audits.filter(a=>(a.medicine+a.customer+a.batch).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader eyebrow="COMPLIANCE" title="Dispensing Audit" description="Every dispensing event, traceable and review-ready." action={<button className="btn btn-secondary"><Download size={14}/> Export audit</button>} />
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:16, borderBottom:'1px solid #EFEFEA' }}>
          <div className="search-input" style={{ maxWidth:320 }}><Search size={15} color="#888888"/><input placeholder="Search audit records..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead><tr style={{ background:'#F2F2EE' }}>
              {['Date','Medicine','Batch','Quantity','Customer','Pharmacist','Status'].map(h=><th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.map(a=>(
              <tr key={a.id} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                <td style={{ padding:'14px 20px', fontSize:12, color:'#555555' }}>{a.date}</td>
                <td style={{ padding:'14px 20px', fontWeight:600, fontSize:13 }}>{a.medicine}</td>
                <td style={{ padding:'14px 20px', fontFamily:'monospace', fontSize:13 }}>{a.batch}</td>
                <td style={{ padding:'14px 20px', fontSize:13 }}>{a.quantity}</td>
                <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{a.customer}</td>
                <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{a.pharmacist}</td>
                <td style={{ padding:'14px 20px' }}><Badge status={a.status}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Customers() {
  const data = customers.map((name,i)=>({ name, visits:[12,8,6,4,3][i], last:['Today','Yesterday','Aug 18','Aug 12','Aug 04'][i], phone:['4812','9034','7710','2258','6419'][i] }));
  return (
    <>
      <PageHeader eyebrow="RELATIONSHIPS" title="Customers" description="Keep customer care personal, informed, and connected." action={<button className="btn btn-sage"><Plus size={15}/> Add customer</button>} />
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:16, borderBottom:'1px solid #EFEFEA', display:'flex', justifyContent:'space-between' }}>
          <div className="search-input" style={{ maxWidth:300 }}><Search size={15} color="#888888"/><input placeholder="Search customers..."/></div>
          <button className="btn btn-secondary"><Download size={14}/> Export</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16, padding:20 }}>
          {data.map((c,i)=>(
            <div key={c.name} className="card card-hover" style={{ padding:20, cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background: i%2?'#E3ECE7':'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color: i%2?'#4A6B5D':'#526350' }}>
                  {c.name.split(' ').map(x=>x[0]).join('')}
                </div>
                <div>
                  <p style={{ fontWeight:700, fontSize:14 }}>{c.name}</p>
                  <p style={{ fontSize:12, color:'#888888' }}>+91 ••••• {c.phone}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:20, marginTop:16, paddingTop:16, borderTop:'1px solid #EFEFEA' }}>
                <div><p style={{ fontSize:20, fontWeight:800 }}>{c.visits}</p><p style={{ fontSize:11, color:'#888888' }}>Visits</p></div>
                <div><p style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{c.last}</p><p style={{ fontSize:11, color:'#888888', marginTop:2 }}>Last visit</p></div>
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'flex-end' }}>
                  <span className="chip badge-green">Alerts on</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AlertsPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const cards = [
    { title:'Vitamin D3 60K expires soon', detail:'Batch VD102 expires in 12 days. 180 units at risk.', type:'Near expiry', tone:'amber', page:'expiry' },
    { title:'Paracetamol stock is low', detail:'PCT101 dropped below minimum threshold.', type:'Low stock', tone:'orange', page:'add-stock' },
    { title:'AMX204 recalled by supplier', detail:'45 units remaining. 18 customers affected.', type:'Recall', tone:'red', page:'recall' },
    { title:'Weekly expiry digest ready', detail:'Your scheduled pharmacy summary is ready.', type:'Report', tone:'sage', page:'reports' },
  ];
  const bg: Record<string,string> = { amber:'#F7EDE2', red:'#F9ECEF', orange:'#F7EBE3', sage:'#E8EFE7' };
  const tc: Record<string,string> = { amber:'#8C5E3C', red:'#A63A50', orange:'#B86B35', sage:'#526350' };
  return (
    <>
      <PageHeader eyebrow="STAY INFORMED" title="Alerts" description="Important actions, surfaced before they become problems." action={<button className="btn btn-secondary"><Check size={14}/> Mark all read</button>} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {cards.map(a=>(
          <div key={a.title} className="card card-hover" style={{ padding:20, display:'flex', gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:bg[a.tone], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <AlertCircle size={20} color={tc[a.tone]} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                <p style={{ fontWeight:700, fontSize:14 }}>{a.title}</p>
                <span className={`chip badge-${a.tone==='sage'?'blue':a.tone==='amber'?'amber':a.tone==='red'?'red':'orange'}`}>{a.type}</span>
              </div>
              <p style={{ fontSize:13, color:'#555555', marginTop:6, lineHeight:1.6 }}>{a.detail}</p>
              <button onClick={()=>onNavigate(a.page)} style={{ fontSize:12, color:'#6B8068', fontWeight:600, background:'none', border:'none', cursor:'pointer', marginTop:10, display:'flex', alignItems:'center', gap:4 }}>
                Take action <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Suppliers({ showToast }: { showToast:(s:string)=>void }) {
  const [modal, setModal] = useState(false);
  const suppliers = [['ABC Pharma','24 batches','₹ 2,48,600','Excellent'],['MediSource','18 batches','₹ 1,82,400','Good'],['HealthCare Labs','12 batches','₹ 98,200','Good'],['Nova Pharma','9 batches','₹ 74,800','Excellent']];
  return (
    <>
      <PageHeader eyebrow="PROCUREMENT" title="Suppliers & Returns" description="Manage supplier relationships and return stock with confidence." action={<button className="btn btn-sage" onClick={()=>setModal(true)}><RotateCcw size={15}/> Create return</button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <Stat label="Active Suppliers" value="18" icon={Truck} tone="sage" />
        <Stat label="Pending Returns" value="4" icon={RotateCcw} tone="amber" />
        <Stat label="This Month Spend" value="₹ 6.8L" icon={CreditCard} tone="teal" />
      </div>
      <Panel title="Supplier Directory">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead><tr style={{ background:'#F2F2EE' }}>
              {['Supplier','Active batches','Total purchases','Rating',''].map(h=><th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{suppliers.map(s=>(
              <tr key={s[0]} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                <td style={{ padding:'14px 20px' }}><p style={{ fontWeight:700, fontSize:13 }}>{s[0]}</p><p style={{ fontSize:11, color:'#888888' }}>supp@{s[0].split(' ')[0].toLowerCase()}.com</p></td>
                <td style={{ padding:'14px 20px', fontSize:13 }}>{s[1]}</td>
                <td style={{ padding:'14px 20px', fontWeight:700, fontSize:13 }}>{s[2]}</td>
                <td style={{ padding:'14px 20px' }}><span className="chip badge-green">★ {s[3]}</span></td>
                <td style={{ padding:'14px 20px', textAlign:'right' }}><button className="btn btn-ghost" style={{ padding:6 }}><MoreHorizontal size={16}/></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(17,17,17,0.4)' }} onClick={()=>setModal(false)} />
          <div className="card animate-scale-in" style={{ position:'relative', width:'100%', maxWidth:440 }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #EFEFEA', display:'flex', justifyContent:'space-between' }}>
              <h3 style={{ fontWeight:700 }}>Create stock return</h3>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#888888' }}><X size={18}/></button>
            </div>
            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
              <div><label className="label">Supplier</label><select className="input"><option>MediSource</option><option>ABC Pharma</option></select></div>
              <div><label className="label">Batch to return</label><select className="input"><option>AMX204 · Amoxicillin 500mg · 45 units</option></select></div>
              <div><label className="label">Reason</label><select className="input"><option>Product recall</option><option>Near expiry</option><option>Damaged stock</option></select></div>
              <div><label className="label">Notes</label><textarea className="input" style={{ height:80 }} placeholder="Add return notes..."/></div>
              <button className="btn btn-sage" style={{ justifyContent:'center' }} onClick={()=>{setModal(false);showToast('Return request created');}}>Create return request</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Recall({ showToast }: { showToast:(s:string)=>void }) {
  return (
    <>
      <PageHeader eyebrow="SAFETY CONTROLS" title="Batch Recall" description="Contain recalled medicines and protect affected customers." action={<button className="btn btn-danger" onClick={()=>showToast('Recall notice sent to 18 customers')}><Send size={14}/> Send notification</button>} />
      <div className="card" style={{ border:'1px solid #F3C6D0', overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:20, background:'#F9ECEF', borderBottom:'1px solid #F3C6D0', display:'flex', gap:16 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#F5D6DC', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AlertCircle size={22} color="#A63A50" />
          </div>
          <div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <h3 style={{ fontWeight:800, fontSize:16 }}>Amoxicillin 500mg · AMX204</h3>
              <Badge status="Recalled" />
            </div>
            <p style={{ fontSize:13, color:'#A63A50', marginTop:4 }}>Supplier recall issued on 18 Aug 2025 due to quality concerns.</p>
          </div>
        </div>
        <div style={{ padding:24, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
          {[['45','Units remaining','#A63A50','Must be blocked'],['18','Customers affected','#B86B35','Notifications pending'],['27','Dispensed this month','#555555','Across 6 transactions']].map(([v,l,c,s])=>(
            <div key={l}><p style={{ fontSize:12, color:'#888888' }}>{l}</p><p style={{ fontSize:32, fontWeight:800, color:'#111111', marginTop:4 }}>{v}</p><p style={{ fontSize:12, color:c, marginTop:4 }}>{s}</p></div>
          ))}
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid #EFEFEA', display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="btn btn-secondary" onClick={()=>showToast('Showing customer impact report')}><Users size={14}/> View impact</button>
          <button className="btn btn-danger" onClick={()=>showToast('Batch AMX204 blocked')}><ShieldCheck size={14}/> Block batch</button>
          <button className="btn btn-secondary" onClick={()=>showToast('Notification queued')}><Send size={14}/> Send notification</button>
        </div>
      </div>
    </>
  );
}

function Assistant() {
  const [messages, setMessages] = useState<{from:'ai'|'user';text:string}[]>([{ from:'ai', text:'Hello, Dr. Anita. I can help with stock levels, expiry risks, dispensing patterns, and more. What would you like to know?' }]);
  const [input, setInput] = useState('');
  const answer = (q:string) => {
    const l = q.toLowerCase();
    if(l.includes('expire')) return 'I found 12 batches expiring within 30 days. Vitamin D3 60K (VD102) is highest priority with 180 units and only 12 days remaining. Recommend prioritising this batch for dispensing.';
    if(l.includes('low')||l.includes('stock')) return '7 medicines are below minimum threshold. Paracetamol 500mg is most urgent at 12 units, followed by Azithromycin 250mg at 68 units.';
    if(l.includes('return')) return 'Two batches should be returned: AMX204 (recalled, 45 units) and VD102 (180 units at high expiry risk).';
    return 'Based on recent activity, dispensing is steady and stock coverage is healthy. Vitamin D3 may be overstocked relative to its expiry window — would you like me to model a smaller reorder?';
  };
  const send = (text=input) => { if(!text.trim())return; setMessages([...messages,{from:'user',text},{from:'ai',text:answer(text)}]); setInput(''); };
  return (
    <>
      <PageHeader eyebrow="INTELLIGENCE" title="AI Pharmacy Assistant" description="Ask questions about your pharmacy in plain language." />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', minHeight:560 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #EFEFEA', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'#111111', display:'flex', alignItems:'center', justifyContent:'center' }}><BrainCircuit size={18} color="white"/></div>
            <div>
              <p style={{ fontWeight:700, fontSize:14 }}>PharmaFlow Intelligence</p>
              <p style={{ fontSize:12, color:'#52796F', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#52796F', display:'inline-block' }}/> Online · Using your pharmacy data</p>
            </div>
          </div>
          <div style={{ flex:1, padding:20, display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
            {messages.map((m,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:m.from==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'80%', borderRadius: m.from==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'12px 16px', fontSize:13.5, lineHeight:1.6, background:m.from==='user'?'#6B8068':'#F2F2EE', color:m.from==='user'?'white':'#111111' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:'0 20px 20px' }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              {['Which medicines expire within 30 days?','Which medicines are low in stock?','Which batches need return?'].map(q=>(
                <button key={q} onClick={()=>send(q)} style={{ fontSize:12, borderRadius:99, border:'1.5px solid #E5E5E0', padding:'6px 12px', background:'white', color:'#333333', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#6B8068';(e.currentTarget as HTMLElement).style.color='#6B8068';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#E5E5E0';(e.currentTarget as HTMLElement).style.color='#333333';}}>{q}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" placeholder="Ask about your pharmacy..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} style={{ flex:1 }}/>
              <button className="btn btn-sage" style={{ padding:'9px 16px' }} onClick={()=>send()}><Send size={15}/></button>
            </div>
          </div>
        </div>
        <Panel title="What-If Simulator">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {[['Current stock','180'],['New order quantity','300'],['Daily usage (avg)','5'],['Days to expiry','45']].map(([l,v])=>(
              <div key={l}><label className="label">{l}</label><input className="input" type="number" defaultValue={v}/></div>
            ))}
            <div style={{ borderRadius:12, background:'#F9ECEF', padding:14, border:'1px solid #F3C6D0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontWeight:800, fontSize:13, color:'#A63A50' }}>HIGH RISK</span>
                <AlertTriangle size={16} color="#A63A50" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, fontSize:12 }}>
                {[['Total','480'],['Usage','225'],['Unused','255']].map(([l,v])=>(
                  <div key={l}><p style={{ color:'#A63A50', opacity:0.8 }}>{l}</p><b style={{ fontSize:18 }}>{v}</b></div>
                ))}
              </div>
            </div>
            <p style={{ fontSize:12, color:'#555555', lineHeight:1.6 }}>Consider a smaller order. This order may leave stock unused before expiry.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Reports() {
  return (
    <>
      <PageHeader eyebrow="INSIGHTS" title="Reports & Analytics" description="Turn pharmacy activity into better decisions." action={<button className="btn btn-sage"><Download size={14}/> Export report</button>} />
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <button className="btn btn-secondary">Last 30 days <ChevronDown size={13}/></button>
        <button className="btn btn-secondary"><Filter size={13}/> All locations</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Panel title="Dispensing Trend" action={<span style={{ fontSize:12, color:'#52796F', fontWeight:600 }}>+12.4% vs prior</span>}><SimpleChart /></Panel>
        <Panel title="Stock Movement"><SimpleChart type="bar" /></Panel>
        <Panel title="Expiry Risk by Month">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
            {[['Sep 2025','12','#A63A50'],['Oct 2025','18','#B86B35'],['Nov 2025','28','#B86B35'],['Dec 2025','34','#52796F'],['Jan 2026','42','#CCCCCC']].map(([m,v,c])=>(
              <div key={m} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:56, fontSize:12, color:'#555555' }}>{m}</span>
                <div style={{ flex:1, height:20, background:'#F2F2EE', borderRadius:6, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Number(v)*1.8}%`, background:c, borderRadius:6 }}/>
                </div>
                <span style={{ width:24, fontSize:12, fontWeight:700, textAlign:'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top Medicines">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
            {['Paracetamol 500mg','Cetirizine 10mg','Metformin 500mg','Vitamin D3 60K','Azithromycin 250mg'].map((x,i)=>(
              <div key={x} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
                <span style={{ width:24, fontSize:11, color:'#888888', fontWeight:600 }}>0{i+1}</span>
                <span style={{ flex:1, fontWeight:600 }}>{x}</span>
                <span style={{ fontWeight:700 }}>{['2,480','1,842','1,490','988','642'][i]}</span>
                <ArrowUpRight size={13} color="#52796F" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function PharmSettings({ showToast }: { showToast:(s:string)=>void }) {
  const [section, setSection] = useState('Profile');
  const sections = ['Profile','Pharmacy','Alerts','Languages','AI preferences','Security'];
  return (
    <>
      <PageHeader eyebrow="WORKSPACE" title="Settings" description="Configure PharmaFlow for your pharmacy." />
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20 }}>
        <div className="card" style={{ padding:8, height:'fit-content' }}>
          {sections.map(x=>(
            <button key={x} onClick={()=>setSection(x)} className="sidebar-item" style={{ width:'100%', marginBottom:2, ...(section===x?{}:{}) }}>
              {x}
            </button>
          ))}
        </div>
        <div className="card">
          <div style={{ padding:'20px 24px', borderBottom:'1px solid #EFEFEA' }}>
            <h3 style={{ fontWeight:700, fontSize:16 }}>{section} Settings</h3>
            <p style={{ fontSize:12, color:'#888888', marginTop:4 }}>Manage your {section.toLowerCase()} preferences.</p>
          </div>
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16, maxWidth:480 }}>
            {section==='Profile' ? <>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#526350' }}>AR</div>
                <button className="btn btn-secondary">Change photo</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label className="label">First name</label><input className="input" defaultValue="Anita"/></div>
                <div><label className="label">Last name</label><input className="input" defaultValue="Rao"/></div>
              </div>
              <div><label className="label">Work email</label><input className="input" defaultValue="pharmacist@demo.com"/></div>
            </> : ['Alerts','AI preferences','Security'].includes(section) ? <>
              {['Low stock alerts','Expiry notifications','Recall notifications','Weekly summary'].map((x,i)=>(
                <div key={x} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #EFEFEA' }}>
                  <div><p style={{ fontSize:14, fontWeight:600 }}>{x}</p><p style={{ fontSize:12, color:'#888888', marginTop:2 }}>Receive updates about {x.toLowerCase()}</p></div>
                  <div className={`toggle ${i!==3?'on':''}`} />
                </div>
              ))}
            </> : <>
              <div><label className="label">Pharmacy name</label><input className="input" defaultValue="WellCare Pharmacy"/></div>
              <div><label className="label">Timezone</label><select className="input"><option>Asia/Kolkata (GMT+5:30)</option><option>UTC</option></select></div>
            </>}
            <button className="btn btn-sage" style={{ alignSelf:'flex-start', marginTop:8 }} onClick={()=>showToast('Settings saved')}>Save changes</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PharmacistPortal({ onLogout }: { onLogout:()=>void }) {
  const [page, setPage] = useState<Page>('dashboard');
  const [inventory, setInventory] = useState(initialInventory);
  const [audits, setAudits] = useState<Audit[]>([
    {id:1,date:'Today, 10:42 AM',medicine:'Paracetamol 500mg',batch:'PCT101',quantity:12,customer:'Priya Sharma',pharmacist:'Dr. Anita Rao',status:'Completed'},
    {id:2,date:'Today, 09:18 AM',medicine:'Cetirizine 10mg',batch:'CTZ302',quantity:5,customer:'Arun Kumar',pharmacist:'Dr. Anita Rao',status:'Completed'},
    {id:3,date:'Yesterday, 04:35 PM',medicine:'Vitamin D3 60K',batch:'VD102',quantity:10,customer:'Meena Devi',pharmacist:'Dr. Suresh',status:'Completed'},
  ]);
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const showToast = (text:string) => { setToast(text); setTimeout(()=>setToast(''), 2800); };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#FAFAF8' }}>
      <Sidebar open={sidebarOpen} page={page} onNavigate={p=>setPage(p as Page)} onLogout={onLogout} />
      <div style={{ flex:1, marginLeft: sidebarOpen?248:76, transition:'margin 0.2s', minWidth:0 }}>
        <Topbar onMenu={()=>setSidebarOpen(!sidebarOpen)} page={page} onAlerts={()=>setPage('alerts')} />
        <main style={{ padding:32, maxWidth:1400, margin:'0 auto' }} className="animate-fade-in">
          {page==='dashboard' && <Dashboard onNavigate={p=>setPage(p as Page)} />}
          {page==='inventory' && <Inventory inventory={inventory} setInventory={setInventory} onAdd={()=>setPage('add-stock')} showToast={showToast} />}
          {page==='add-stock' && <AddStock inventory={inventory} setInventory={setInventory} onDone={()=>setPage('inventory')} showToast={showToast} />}
          {page==='expiry' && <Expiry inventory={inventory} />}
          {page==='dispensing' && <Dispensing inventory={inventory} setInventory={setInventory} audits={audits} setAudits={setAudits} showToast={showToast} />}
          {page==='audit' && <AuditPage audits={audits} />}
          {page==='customers' && <Customers />}
          {page==='alerts' && <AlertsPage onNavigate={p=>setPage(p as Page)} />}
          {page==='suppliers' && <Suppliers showToast={showToast} />}
          {page==='recall' && <Recall showToast={showToast} />}
          {page==='ai' && <Assistant />}
          {page==='reports' && <Reports />}
          {page==='settings' && <PharmSettings showToast={showToast} />}
        </main>
      </div>
      {toast && (
        <div className="animate-slide-up" style={{ position:'fixed', bottom:24, right:24, zIndex:100, display:'flex', alignItems:'center', gap:10, background:'#111111', color:'white', padding:'12px 20px', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', fontSize:13, fontWeight:500 }}>
          <CheckCircle2 size={16} color="#A3B19B" /> {toast}
        </div>
      )}
      <style>{`@media(max-width:768px){.hidden-mobile-aside{display:none!important;}}`}</style>
    </div>
  );
}
