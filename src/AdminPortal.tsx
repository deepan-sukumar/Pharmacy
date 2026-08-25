import React, { useState } from 'react';
import {
  LayoutDashboard, Users, ShieldCheck, Building2, ClipboardList, Database, HardDrive,
  Lock, Bell, BrainCircuit, Settings as SettingsIcon, BarChart3, Activity, LogOut,
  Search, ChevronDown, Menu, X, Plus, Download, Trash2, MoreHorizontal,
  RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight, UserCheck, PackagePlus,
  Check, Shield, Eye, FileText, Server, Wifi, Clock, Calendar, Key, Globe,
  Package, Boxes, Stethoscope
} from 'lucide-react';
import type { AdminPage } from './data';

const adminNav = [
  { id:'admin-dashboard', label:'Admin Dashboard', icon:LayoutDashboard },
  { id:'user-management', label:'User Management', icon:Users },
  { id:'roles', label:'Roles & Permissions', icon:ShieldCheck },
  { id:'pharmacy-management', label:'Pharmacy Management', icon:Building2 },
  { id:'system-audit', label:'System Audit', icon:ClipboardList },
  { id:'data-management', label:'Data Management', icon:Database },
  { id:'backup', label:'Backup & Restore', icon:HardDrive },
  { id:'security', label:'Security Center', icon:Lock },
  { id:'notifications', label:'Notifications', icon:Bell },
  { id:'ai-config', label:'AI Configuration', icon:BrainCircuit },
  { id:'system-settings', label:'System Settings', icon:SettingsIcon },
  { id:'admin-reports', label:'Reports', icon:BarChart3 },
  { id:'activity', label:'Activity Monitoring', icon:Activity },
];

function AdminSidebar({ open, page, onNavigate, onLogout }: { open:boolean; page:AdminPage; onNavigate:(p:string)=>void; onLogout:()=>void }) {
  return (
    <aside style={{ width:open?260:76, flexShrink:0, position:'fixed', inset:'0 auto 0 0', zIndex:30, background:'#111111', display:'flex', flexDirection:'column', transition:'width 0.2s' }} className="hidden-mobile-aside">
      <div style={{ height:72, display:'flex', alignItems:'center', padding:'0 16px', gap:10, borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'#6B8068', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <ShieldCheck size={19} color="white" />
        </div>
        {open && <div><div style={{ fontWeight:800, fontSize:15, letterSpacing:'-0.3px', color:'white', lineHeight:1 }}>PHARMA<span style={{ color:'#A3B19B' }}>FLOW</span></div><div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:600, letterSpacing:'0.06em' }}>ADMINISTRATION</div></div>}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 10px' }}>
        {open && <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', textTransform:'uppercase', padding:'0 10px', marginBottom:8 }}>Administration</p>}
        {adminNav.map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={()=>onNavigate(id)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9.5px 12px', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.15s', width:'100%', border:'none', textAlign:'left', justifyContent:open?'flex-start':'center', marginBottom:2, background:page===id?'rgba(107,128,104,0.3)':'transparent', color:page===id?'#A3B19B':'rgba(255,255,255,0.55)' }}
            title={!open?label:undefined}
            onMouseEnter={e=>{ if(page!==id){(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.85)';} }}
            onMouseLeave={e=>{ if(page!==id){(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.55)';} }}>
            <Icon size={17} style={{ flexShrink:0 }} />
            {open && <span style={{ flex:1 }}>{label}</span>}
            {open && page===id && <span style={{ width:6, height:6, borderRadius:'50%', background:'#A3B19B', flexShrink:0 }} />}
          </button>
        ))}
      </div>
      <div style={{ padding:10, borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.15s', width:'100%', border:'none', textAlign:'left', justifyContent:open?'flex-start':'center', background:'transparent', color:'rgba(255,255,255,0.4)' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(166,58,80,0.2)';(e.currentTarget as HTMLElement).style.color='#F5C6D0';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)';}}>
          <LogOut size={17}/>{open && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}

function AdminTopbar({ onMenu, page }: { onMenu:()=>void; page:AdminPage }) {
  const label = adminNav.find(x=>x.id===page)?.label || 'Administration';
  return (
    <header style={{ height:72, background:'white', borderBottom:'1px solid #E5E5E0', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', position:'sticky', top:0, zIndex:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onMenu} style={{ background:'none', border:'none', cursor:'pointer', padding:8, borderRadius:8, color:'#555555' }}><Menu size={20}/></button>
        <div>
          <h1 style={{ fontSize:18, fontWeight:800, color:'#111111', letterSpacing:'-0.3px' }}>{label}</h1>
          <p style={{ fontSize:12, color:'#888888' }}>Administration & system management</p>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div className="search-input" style={{ width:220 }}><Search size={15} color="#888888"/><input placeholder="Search..."/></div>
        <button style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:8, borderRadius:8, color:'#555555' }}>
          <Bell size={19}/>
          <span style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:'50%', background:'#A63A50', border:'2px solid white' }}/>
        </button>
        <div style={{ width:1, height:32, background:'#E5E5E0' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#526350' }}>AD</div>
          <div><p style={{ fontSize:13, fontWeight:700, color:'#111111' }}>Admin</p><p style={{ fontSize:11, color:'#888888' }}>Super Admin</p></div>
          <ChevronDown size={14} color="#888888"/>
        </div>
      </div>
    </header>
  );
}

function PageHdr({ eyebrow, title, desc, action }: { eyebrow?:string; title:string; desc?:string; action?:React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:16 }}>
      <div>
        {eyebrow && <p style={{ fontSize:11.5, fontWeight:700, color:'#6B8068', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>{eyebrow}</p>}
        <h2 style={{ fontSize:24, fontWeight:800, color:'#111111', letterSpacing:'-0.3px' }}>{title}</h2>
        {desc && <p style={{ fontSize:14, color:'#555555', marginTop:4 }}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function KPI({ label, value, change, icon:Icon, tone='sage' }: { label:string; value:string; change?:string; icon: React.ElementType; tone?:string }) {
  const bg: Record<string,string> = { sage:'#E8EFE7', teal:'#E3ECE7', green:'#E6EFEA', amber:'#F7EDE2', red:'#F9ECEF', purple:'#ECEAEF' };
  const fg: Record<string,string> = { sage:'#526350', teal:'#4A6B5D', green:'#52796F', amber:'#8C5E3C', red:'#A63A50', purple:'#5D4E6D' };
  return (
    <div className="card" style={{ padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <p style={{ fontSize:12, color:'#555555', fontWeight:500 }}>{label}</p>
          <p style={{ fontSize:28, fontWeight:800, color:'#111111', letterSpacing:'-0.5px', marginTop:6 }}>{value}</p>
          {change && <p style={{ fontSize:12, color:'#52796F', marginTop:4, display:'flex', alignItems:'center', gap:3 }}><ArrowUpRight size={13}/>{change}</p>}
        </div>
        <div style={{ width:40, height:40, borderRadius:10, background:bg[tone]||bg.sage, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={20} color={fg[tone]||fg.sage}/>
        </div>
      </div>
    </div>
  );
}

function Pnl({ title, action, children }: { title:string; action?:React.ReactNode; children:React.ReactNode }) {
  return (
    <div className="card">
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #EFEFEA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#111111' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Bdg({ status }: { status:string }) {
  const m: Record<string,string> = { Active:'badge-green', Inactive:'badge-gray', Invited:'badge-blue', Suspended:'badge-red', Completed:'badge-green', Success:'badge-green', Failed:'badge-red', Pending:'badge-amber', Manual:'badge-blue', Automatic:'badge-teal', Online:'badge-green', Admin:'badge-purple', Pharmacist:'badge-blue', Auditor:'badge-teal' };
  return <span className={`chip ${m[status]||'badge-gray'}`}><span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }}/>{status}</span>;
}

function Timeline({ icon:Icon, title, detail, who, time }: { icon: React.ElementType; title:string; detail:string; who:string; time:string }) {
  return (
    <div style={{ display:'flex', gap:14 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'#F2F2EE', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={16} color="#555555"/></div>
        <div style={{ width:1.5, flex:1, background:'#EFEFEA', marginTop:6 }}/>
      </div>
      <div style={{ paddingBottom:20, flex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
          <p style={{ fontSize:13.5, fontWeight:700, color:'#111111' }}>{title}</p>
          <span style={{ fontSize:11, color:'#888888', whiteSpace:'nowrap' }}>{time}</span>
        </div>
        <p style={{ fontSize:13, color:'#555555', marginTop:3, lineHeight:1.5 }}>{detail}</p>
        <p style={{ fontSize:11, color:'#888888', marginTop:4 }}>By {who}</p>
      </div>
    </div>
  );
}

/* ─────────── ADMIN DASHBOARD ─────────── */
function AdminDashboard() {
  return (
    <>
      <PageHdr eyebrow="OVERVIEW" title="Admin Dashboard" desc="Platform-level command center for PharmaFlow." action={
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary"><Download size={14}/> Export</button>
          <button className="btn btn-sage"><RefreshCw size={14}/> Refresh</button>
        </div>
      }/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        <KPI label="Total Users" value="18" change="2 this month" icon={Users} tone="sage" />
        <KPI label="Pharmacists" value="14" icon={Stethoscope} tone="teal" />
        <KPI label="Admins" value="4" icon={ShieldCheck} tone="purple" />
        <KPI label="Pharmacies" value="3" icon={Building2} tone="green" />
        <KPI label="System Uptime" value="99.9%" icon={Activity} tone="green" />
        <KPI label="Security Alerts" value="0" icon={Lock} tone="amber" />
        <KPI label="Last Backup" value="2h ago" icon={HardDrive} tone="sage" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, marginBottom:20 }}>
        <Pnl title="System Activity" action={<span style={{ fontSize:12, color:'#888888' }}>Last 30 days</span>}>
          <div style={{ padding:'16px 20px 28px', height:200, position:'relative' }}>
            <svg viewBox="0 0 600 160" style={{ width:'100%', height:'100%' }} preserveAspectRatio="none">
              <defs><linearGradient id="ag" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6B8068" stopOpacity=".2"/><stop offset="1" stopColor="#6B8068" stopOpacity="0"/></linearGradient></defs>
              <path d="M0 140 C50 120 70 130 120 90 S180 110 220 70 S280 100 320 55 S390 80 430 35 S490 55 540 25 S570 45 600 10 L600 160 L0 160Z" fill="url(#ag)"/>
              <path d="M0 140 C50 120 70 130 120 90 S180 110 220 70 S280 100 320 55 S390 80 430 35 S490 55 540 25 S570 45 600 10" fill="none" stroke="#6B8068" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        </Pnl>
        <Pnl title="Workspace Health">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
              <div><p style={{ fontSize:12, color:'#555555' }}>Data completeness</p><p style={{ fontSize:28, fontWeight:800, marginTop:4 }}>94%</p></div>
              <span style={{ fontSize:12, color:'#52796F', fontWeight:700 }}>Healthy</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width:'94%', background:'#52796F' }}/></div>
            {[['Last backup','Today, 02:00 AM'],['Storage used','2.4 GB of 10 GB'],['Active sessions','11 users online'],['DB connections','Optimal']].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'8px 0', borderBottom:'1px solid #EFEFEA' }}>
                <span style={{ color:'#555555' }}>{k}</span><b style={{ color:'#111111' }}>{v}</b>
              </div>
            ))}
          </div>
        </Pnl>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Pnl title="Recent Activity">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:0 }}>
            <Timeline icon={UserCheck} title="New pharmacist invited" detail="Dr. Neha Menon added to the team" who="Admin" time="Today, 08:45 AM"/>
            <Timeline icon={PackagePlus} title="Stock updated" detail="180 units of Vitamin D3 60K added (VD102)" who="Dr. Suresh Kumar" time="Today, 08:55 AM"/>
            <Timeline icon={ShieldCheck} title="Batch blocked" detail="AMX204 marked recalled and blocked" who="Admin" time="Yesterday, 04:28 PM"/>
            <Timeline icon={HardDrive} title="Backup completed" detail="Full backup completed successfully (2.4 GB)" who="System" time="Yesterday, 02:00 AM"/>
          </div>
        </Pnl>
        <Pnl title="Quick Actions">
          <div style={{ padding:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { icon:Plus, label:'Add User', color:'#6B8068', bg:'#E8EFE7' },
              { icon:HardDrive, label:'Backup Now', color:'#4A6B5D', bg:'#E3ECE7' },
              { icon:Download, label:'Export Logs', color:'#5D4E6D', bg:'#ECEAEF' },
              { icon:Shield, label:'Security Scan', color:'#B86B35', bg:'#F7EBE3' },
              { icon:RefreshCw, label:'Sync Data', color:'#52796F', bg:'#E6EFEA' },
              { icon:BarChart3, label:'View Reports', color:'#8C5E3C', bg:'#F7EDE2' },
            ].map(({ icon:Icon, label, color, bg })=>(
              <button key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:16, borderRadius:12, border:'1.5px solid #E5E5E0', background:'white', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=color;(e.currentTarget as HTMLElement).style.background=bg;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#E5E5E0';(e.currentTarget as HTMLElement).style.background='white';}}>
                <div style={{ width:36, height:36, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={18} color={color}/></div>
                <span style={{ fontSize:12, fontWeight:600, color:'#222222' }}>{label}</span>
              </button>
            ))}
          </div>
        </Pnl>
      </div>
    </>
  );
}

/* ─────────── USER MANAGEMENT ─────────── */
function UserManagement({ showToast }: { showToast:(s:string)=>void }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', role:'Pharmacist', pharmacy:'WellCare' });
  const users = [
    { name:'Dr. Anita Rao', email:'anita@wellcare.com', role:'Admin', pharmacy:'WellCare', status:'Active', last:'Today, 10:24 AM', created:'Jan 2025' },
    { name:'Dr. Suresh Kumar', email:'suresh@wellcare.com', role:'Pharmacist', pharmacy:'WellCare', status:'Active', last:'Today, 09:58 AM', created:'Jan 2025' },
    { name:'Dr. Neha Menon', email:'neha@wellcare.com', role:'Pharmacist', pharmacy:'WellCare', status:'Active', last:'Today, 08:30 AM', created:'Aug 2025' },
    { name:'Rahul Verma', email:'rahul@wellcare.com', role:'Pharmacist', pharmacy:'WellCare', status:'Invited', last:'Never', created:'Aug 2025' },
    { name:'Priya Nair', email:'priya@wellcare.com', role:'Admin', pharmacy:'WellCare', status:'Active', last:'Yesterday', created:'Mar 2025' },
  ];
  return (
    <>
      <PageHdr eyebrow="ADMINISTRATION" title="User Management" desc="Manage team access and roles for your pharmacy workspace." action={
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary"><Download size={14}/> Import Users</button>
          <button className="btn btn-sage" onClick={()=>setShowModal(true)}><Plus size={15}/> Add User</button>
        </div>
      }/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <KPI label="Total Users" value="18" icon={Users} tone="sage" />
        <KPI label="Active" value="14" icon={CheckCircle2} tone="green" />
        <KPI label="Invited" value="3" icon={Bell} tone="amber" />
        <KPI label="Admins" value="4" icon={ShieldCheck} tone="purple" />
      </div>
      <Pnl title="Team Members" action={<span style={{ fontSize:12, color:'#888888' }}>18 total users</span>}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead><tr style={{ background:'#F2F2EE' }}>
              {['User','Role','Pharmacy','Status','Last Active','Created','Actions'].map(h=><th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{users.map((u)=>(
              <tr key={u.email} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                <td style={{ padding:'14px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#526350', flexShrink:0 }}>
                      {u.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
                    </div>
                    <div><p style={{ fontWeight:700, fontSize:13.5, color:'#111111' }}>{u.name}</p><p style={{ fontSize:11, color:'#888888' }}>{u.email}</p></div>
                  </div>
                </td>
                <td style={{ padding:'14px 20px' }}><Bdg status={u.role}/></td>
                <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{u.pharmacy}</td>
                <td style={{ padding:'14px 20px' }}><Bdg status={u.status}/></td>
                <td style={{ padding:'14px 20px', fontSize:12, color:'#555555' }}>{u.last}</td>
                <td style={{ padding:'14px 20px', fontSize:12, color:'#555555' }}>{u.created}</td>
                <td style={{ padding:'14px 20px' }}>
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="btn btn-ghost" style={{ padding:'5px 9px', fontSize:12 }}>Edit</button>
                    <button className="btn btn-ghost" style={{ padding:'5px 9px', fontSize:12 }}>Reset pw</button>
                    <button className="btn btn-ghost" style={{ padding:6, color:'#A63A50' }}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Pnl>
      {showModal && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(17,17,17,0.4)' }} onClick={()=>setShowModal(false)}/>
          <div className="card animate-scale-in" style={{ position:'relative', width:'100%', maxWidth:480 }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #EFEFEA', display:'flex', justifyContent:'space-between' }}>
              <h3 style={{ fontWeight:700, fontSize:16 }}>Add New User</h3>
              <button onClick={()=>setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#888888' }}><X size={18}/></button>
            </div>
            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label className="label">Full Name *</label><input className="input" placeholder="Dr. John Smith" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div><label className="label">Email *</label><input className="input" placeholder="john@pharmacy.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><label className="label">Role</label><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>Pharmacist</option><option>Admin</option><option>Auditor</option><option>Inventory Manager</option></select></div>
                <div><label className="label">Pharmacy</label><select className="input" value={form.pharmacy} onChange={e=>setForm({...form,pharmacy:e.target.value})}><option>WellCare</option><option>MediCare Plus</option><option>HealthFirst</option></select></div>
              </div>
              <div style={{ background:'#E8EFE7', borderRadius:10, padding:14, fontSize:13, color:'#526350' }}>
                <strong>Note:</strong> An invitation email will be sent to the user with login credentials.
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="btn btn-sage" onClick={()=>{setShowModal(false);showToast('User invited successfully');}}>Send Invitation</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────── BACKUP & RESTORE ─────────── */
function BackupRestore({ showToast }: { showToast:(s:string)=>void }) {
  const [confirm, setConfirm] = useState<string|null>(null);
  const backups = [
    { date:'Aug 25, 2025', time:'02:00 AM', size:'2.4 GB', type:'Automatic', status:'Completed', by:'System' },
    { date:'Aug 24, 2025', time:'02:00 AM', size:'2.3 GB', type:'Automatic', status:'Completed', by:'System' },
    { date:'Aug 23, 2025', time:'10:30 AM', size:'2.2 GB', type:'Manual', status:'Completed', by:'Admin' },
    { date:'Aug 22, 2025', time:'02:00 AM', size:'2.1 GB', type:'Automatic', status:'Completed', by:'System' },
    { date:'Aug 21, 2025', time:'03:45 PM', size:'2.0 GB', type:'Manual', status:'Completed', by:'Dr. Anita Rao' },
  ];
  return (
    <>
      <PageHdr eyebrow="DATA MANAGEMENT" title="Backup & Restore" desc="Protect your pharmacy data with automated and manual backups." action={
        <button className="btn btn-sage" onClick={()=>showToast('Backup initiated — estimated 2 minutes')}><HardDrive size={15}/> Backup Now</button>
      }/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:12, color:'#555555' }}>Last Backup</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#111111', marginTop:4 }}>2h ago</p>
          <p style={{ fontSize:12, color:'#52796F', marginTop:4, display:'flex', alignItems:'center', gap:4 }}><Check size={12}/> Successful</p>
        </div>
        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:12, color:'#555555' }}>Backup Size</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#111111', marginTop:4 }}>2.4 GB</p>
          <p style={{ fontSize:12, color:'#888888', marginTop:4 }}>of 10 GB allocated</p>
        </div>
        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:12, color:'#555555' }}>Next Scheduled</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#111111', marginTop:4 }}>22h</p>
          <p style={{ fontSize:12, color:'#888888', marginTop:4 }}>Daily at 02:00 AM</p>
        </div>
        <div className="card" style={{ padding:20 }}>
          <p style={{ fontSize:12, color:'#555555' }}>Total Backups</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#111111', marginTop:4 }}>47</p>
          <p style={{ fontSize:12, color:'#888888', marginTop:4 }}>Last 60 days</p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, marginBottom:20 }}>
        <Pnl title="Backup History" action={<button className="btn btn-secondary" style={{ fontSize:12 }}><Download size={13}/> Export log</button>}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
              <thead><tr style={{ background:'#F2F2EE' }}>
                {['Date & Time','Size','Type','Status','Created By','Actions'].map(h=><th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>{backups.map((b,i)=>(
                <tr key={i} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                  <td style={{ padding:'14px 20px' }}><p style={{ fontWeight:600, fontSize:13 }}>{b.date}</p><p style={{ fontSize:11, color:'#888888' }}>{b.time}</p></td>
                  <td style={{ padding:'14px 20px', fontWeight:700, fontSize:13 }}>{b.size}</td>
                  <td style={{ padding:'14px 20px' }}><Bdg status={b.type}/></td>
                  <td style={{ padding:'14px 20px' }}><Bdg status={b.status}/></td>
                  <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{b.by}</td>
                  <td style={{ padding:'14px 20px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-secondary" style={{ fontSize:11, padding:'4px 10px' }} onClick={()=>showToast('Backup downloaded')}>Download</button>
                      <button className="btn btn-secondary" style={{ fontSize:11, padding:'4px 10px' }} onClick={()=>setConfirm('restore')}>Restore</button>
                      <button className="btn btn-ghost" style={{ padding:5, color:'#A63A50' }} onClick={()=>setConfirm('delete')}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Pnl>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Pnl title="Backup Schedule">
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              {[['Frequency','Daily'],['Time','02:00 AM IST'],['Retention','60 days'],['Encryption','AES-256']].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'1px solid #EFEFEA' }}>
                  <span style={{ color:'#555555' }}>{k}</span><b>{v}</b>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ justifyContent:'center', marginTop:4 }} onClick={()=>showToast('Schedule settings opened')}>
                <SettingsIcon size={14}/> Configure schedule
              </button>
            </div>
          </Pnl>
          <Pnl title="Storage Usage">
            <div style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, color:'#555555' }}>2.4 GB used</span>
                <span style={{ fontSize:13, fontWeight:700 }}>24%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width:'24%', background:'#6B8068' }}/></div>
              <p style={{ fontSize:12, color:'#888888', marginTop:8 }}>7.6 GB remaining of 10 GB</p>
            </div>
          </Pnl>
        </div>
      </div>
      {confirm && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(17,17,17,0.4)' }} onClick={()=>setConfirm(null)}/>
          <div className="card animate-scale-in" style={{ position:'relative', width:'100%', maxWidth:400, padding:28 }}>
            <div style={{ width:48, height:48, borderRadius:12, background: confirm==='delete'?'#F9ECEF':'#F7EDE2', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
              {confirm==='delete'?<Trash2 size={22} color="#A63A50"/>:<RefreshCw size={22} color="#8C5E3C"/>}
            </div>
            <h3 style={{ fontWeight:800, fontSize:17, marginBottom:8 }}>{confirm==='delete'?'Delete backup?':'Restore from backup?'}</h3>
            <p style={{ fontSize:13.5, color:'#555555', lineHeight:1.6, marginBottom:24 }}>
              {confirm==='delete'?'This will permanently delete this backup. This action cannot be undone.':'This will restore your pharmacy data to this backup point. Current data will be replaced.'}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={()=>setConfirm(null)}>Cancel</button>
              <button className={`btn ${confirm==='delete'?'btn-danger':'btn-sage'}`} style={{ flex:1, justifyContent:'center' }} onClick={()=>{setConfirm(null);showToast(confirm==='delete'?'Backup deleted':'Restore initiated');}}>{confirm==='delete'?'Yes, delete':'Yes, restore'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────── SECURITY CENTER ─────────── */
function SecurityCenter() {
  return (
    <>
      <PageHdr eyebrow="SECURITY" title="Security Center" desc="Monitor and manage platform security in real time." action={<button className="btn btn-sage"><Shield size={14}/> Run security scan</button>}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:24 }}>
        <KPI label="Security Score" value="98/100" icon={Shield} tone="green" />
        <KPI label="Active Sessions" value="11" icon={Wifi} tone="sage" />
        <KPI label="Failed Logins" value="3" icon={AlertCircle} tone="amber" />
        <KPI label="Blocked Accounts" value="0" icon={Lock} tone="green" />
        <KPI label="Security Alerts" value="0" icon={Bell} tone="green" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Pnl title="Security Controls">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {[['Two-Factor Authentication','Disabled — Enable for stronger security',false],['Session Timeout','Auto logout after 30 min of inactivity',true],['IP Restriction','Disabled — Allow all IPs',false],['Password Policy','Minimum 8 chars, 1 uppercase, 1 number',true],['Login Audit','All login events are logged',true],['Failed Login Lockout','Lock after 5 failed attempts',true]].map(([title,desc,on])=>(
              <div key={title as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #EFEFEA' }}>
                <div style={{ flex:1, paddingRight:16 }}>
                  <p style={{ fontSize:14, fontWeight:600 }}>{title as string}</p>
                  <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>{desc as string}</p>
                </div>
                <div className={`toggle ${on?'on':''}`}/>
              </div>
            ))}
          </div>
        </Pnl>
        <Pnl title="Active Sessions">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
            {[['Dr. Anita Rao','Chrome · Windows · Mumbai','Now','Active'],['Dr. Suresh Kumar','Safari · macOS · Chennai','5 min ago','Active'],['Dr. Neha Menon','Firefox · Windows · Bangalore','12 min ago','Active'],['Priya Nair','Chrome · Windows · Mumbai','1 hr ago','Idle']].map(([name,device,time,status])=>(
              <div key={name as string} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #EFEFEA' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#526350', flexShrink:0 }}>
                  {(name as string).split(' ').map((x:string)=>x[0]).join('').slice(0,2)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600 }}>{name as string}</p>
                  <p style={{ fontSize:11, color:'#888888' }}>{device as string} · {time as string}</p>
                </div>
                <Bdg status={status as string}/>
                <button className="btn btn-ghost" style={{ padding:5, fontSize:11 }}><X size={13}/></button>
              </div>
            ))}
          </div>
        </Pnl>
      </div>
      <Pnl title="Security Activity Timeline">
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:0 }}>
          <Timeline icon={CheckCircle2} title="Successful login" detail="Dr. Anita Rao logged in from Chrome, Windows" who="System" time="Today, 08:30 AM"/>
          <Timeline icon={AlertCircle} title="Failed login attempt" detail="3 failed attempts for user rahul@wellcare.com" who="System" time="Today, 07:12 AM"/>
          <Timeline icon={Key} title="Password changed" detail="Dr. Neha Menon changed their password" who="System" time="Yesterday, 03:40 PM"/>
          <Timeline icon={Globe} title="New device login" detail="New browser fingerprint detected for Dr. Suresh Kumar" who="System" time="Yesterday, 09:22 AM"/>
        </div>
      </Pnl>
    </>
  );
}

/* ─────────── ROLES & PERMISSIONS ─────────── */
function RolesPermissions() {
  const roles = ['Super Admin','Pharmacy Admin','Pharmacist','Auditor','Inventory Manager'];
  const perms = ['Dashboard','Inventory','Dispensing','Audit','Customers','AI Assistant','Reports','User Mgmt','Backup','Settings'];
  const matrix: Record<string,boolean[]> = {
    'Super Admin': perms.map(()=>true),
    'Pharmacy Admin': [true,true,true,true,true,true,true,true,false,true],
    'Pharmacist': [true,true,true,true,true,true,false,false,false,false],
    'Auditor': [true,false,false,true,false,false,true,false,false,false],
    'Inventory Manager': [true,true,true,false,false,false,false,false,false,false],
  };
  const [selected, setSelected] = useState('Pharmacist');
  return (
    <>
      <PageHdr eyebrow="ACCESS CONTROL" title="Roles & Permissions" desc="Define what each role can access and do in PharmaFlow." action={<button className="btn btn-sage"><Plus size={15}/> Create role</button>}/>
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20 }}>
        <div className="card" style={{ padding:8, height:'fit-content' }}>
          {roles.map(r=>(
            <button key={r} onClick={()=>setSelected(r)} className="sidebar-item" style={{ width:'100%', marginBottom:2, ...(selected===r?{ background:'#E8EFE7', color:'#526350' }:{}) }}>{r}</button>
          ))}
        </div>
        <Pnl title={`${selected} — Permission Matrix`} action={<button className="btn btn-secondary" style={{ fontSize:12 }}>Save changes</button>}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'center' }}>
              <thead><tr style={{ background:'#F2F2EE' }}>
                <th style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', textAlign:'left' }}>Module</th>
                {['View','Create','Edit','Delete'].map(a=><th key={a} style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:'#888888' }}>{a}</th>)}
              </tr></thead>
              <tbody>{perms.map((p,i)=>{
                const allowed = matrix[selected][i];
                return (
                  <tr key={p} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                    <td style={{ padding:'13px 20px', fontSize:13.5, fontWeight:600, textAlign:'left' }}>{p}</td>
                    {['View','Create','Edit','Delete'].map((a,j)=>{
                      const on = allowed && (selected==='Super Admin' || j===0 || (allowed && j<2));
                      return <td key={a} style={{ padding:13 }}>
                        <div className={`perm-cell ${on?'perm-on':'perm-off'}`} style={{ margin:'0 auto' }}>
                          {on?<Check size={14}/>:<X size={14}/>}
                        </div>
                      </td>;
                    })}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </Pnl>
      </div>
    </>
  );
}

/* ─────────── SYSTEM AUDIT ─────────── */
function SystemAudit() {
  const [filterUser, setFilterUser] = useState('All');
  const [filterModule, setFilterModule] = useState('All');
  const events = [
    { time:'09:42 AM', user:'Dr. Anita Rao', role:'Admin', action:'Role updated', module:'Users', detail:'Priya Nair → Admin', ip:'192.168.1.45', status:'Success' },
    { time:'09:30 AM', user:'Admin', role:'Admin', action:'User created', module:'Users', detail:'Rahul Kumar invited', ip:'192.168.1.45', status:'Success' },
    { time:'09:12 AM', user:'System', role:'System', action:'Expiry alert', module:'Inventory', detail:'VD102 alert generated', ip:'—', status:'Success' },
    { time:'08:55 AM', user:'Dr. Suresh Kumar', role:'Pharmacist', action:'Stock added', module:'Inventory', detail:'VD102 +180 units', ip:'192.168.1.52', status:'Success' },
    { time:'08:30 AM', user:'Dr. Anita Rao', role:'Pharmacist', action:'Dispensed', module:'Dispensing', detail:'Paracetamol 500mg × 12', ip:'192.168.1.45', status:'Success' },
    { time:'07:12 AM', user:'Unknown', role:'—', action:'Login failed', module:'Auth', detail:'3 attempts — rahul@wellcare.com', ip:'203.0.113.55', status:'Failed' },
    { time:'02:00 AM', user:'System', role:'System', action:'Backup completed', module:'Backup', detail:'Full backup 2.4 GB', ip:'—', status:'Success' },
  ];
  const filtered = events.filter(e=>(filterUser==='All'||e.role===filterUser)&&(filterModule==='All'||e.module===filterModule));
  return (
    <>
      <PageHdr eyebrow="COMPLIANCE" title="System Audit" desc="Complete timeline of all changes and events across PharmaFlow." action={<button className="btn btn-secondary"><Download size={14}/> Export log</button>}/>
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <select className="input" style={{ width:160 }} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
          <option value="All">All roles</option><option>Admin</option><option>Pharmacist</option><option>System</option>
        </select>
        <select className="input" style={{ width:160 }} value={filterModule} onChange={e=>setFilterModule(e.target.value)}>
          <option value="All">All modules</option><option>Users</option><option>Inventory</option><option>Dispensing</option><option>Auth</option><option>Backup</option>
        </select>
        <button className="btn btn-secondary"><Calendar size={14}/> Date range</button>
      </div>
      <Pnl title={`Audit Trail — ${filtered.length} events`}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead><tr style={{ background:'#F2F2EE' }}>
              {['Time','User','Role','Action','Module','Detail','IP','Status'].map(h=><th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map((e,i)=>(
              <tr key={i} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                <td style={{ padding:'13px 20px', fontSize:12, color:'#555555', fontFamily:'monospace' }}>{e.time}</td>
                <td style={{ padding:'13px 20px', fontWeight:700, fontSize:13 }}>{e.user}</td>
                <td style={{ padding:'13px 20px' }}><Bdg status={e.role}/></td>
                <td style={{ padding:'13px 20px', fontSize:13 }}>{e.action}</td>
                <td style={{ padding:'13px 20px', fontSize:13, color:'#555555' }}>{e.module}</td>
                <td style={{ padding:'13px 20px', fontSize:12, color:'#555555', maxWidth:200 }}>{e.detail}</td>
                <td style={{ padding:'13px 20px', fontFamily:'monospace', fontSize:11, color:'#888888' }}>{e.ip}</td>
                <td style={{ padding:'13px 20px' }}><Bdg status={e.status}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Pnl>
    </>
  );
}

/* ─────────── DATA MANAGEMENT ─────────── */
function DataManagement({ showToast }: { showToast:(s:string)=>void }) {
  const sections = [
    { label:'Medicine Data', count:'128 records', size:'24 MB', icon:Package, color:'#6B8068' },
    { label:'Inventory Data', count:'246 batches', size:'18 MB', icon:Boxes, color:'#4A6B5D' },
    { label:'Customer Data', count:'5 customers', size:'2 MB', icon:Users, color:'#5D4E6D' },
    { label:'Dispensing Data', count:'1,240 records', size:'86 MB', icon:ClipboardList, color:'#B86B35' },
    { label:'Audit Data', count:'4,820 entries', size:'142 MB', icon:FileText, color:'#52796F' },
    { label:'Supplier Data', count:'18 suppliers', size:'4 MB', icon:Building2, color:'#8C5E3C' },
  ];
  return (
    <>
      <PageHdr eyebrow="DATA MANAGEMENT" title="Data Management" desc="View, export, import, and manage all pharmacy data." />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16, marginBottom:24 }}>
        {sections.map(({ label, count, size, icon:Icon, color })=>(
          <div key={label} className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={22} color={color}/>
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:15 }}>{label}</p>
                <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>{count} · {size}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary" style={{ flex:1, fontSize:12, justifyContent:'center' }} onClick={()=>showToast(`${label} exported`)}><Download size={13}/> Export</button>
              <button className="btn btn-secondary" style={{ flex:1, fontSize:12, justifyContent:'center' }} onClick={()=>showToast(`${label} import ready`)}>Import</button>
              <button className="btn btn-secondary" style={{ padding:'6px 10px' }} onClick={()=>showToast(`${label} archived`)}><Eye size={14}/></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────── NOTIFICATIONS ─────────── */
function Notifications({ showToast }: { showToast:(s:string)=>void }) {
  return (
    <>
      <PageHdr eyebrow="NOTIFICATIONS" title="Notification Management" desc="Configure and monitor all platform notifications." action={<button className="btn btn-sage" onClick={()=>showToast('Test notification sent')}><Bell size={14}/> Send test</button>}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <KPI label="Sent today" value="24" icon={CheckCircle2} tone="green" />
        <KPI label="Pending" value="3" icon={Clock} tone="amber" />
        <KPI label="Failed" value="1" icon={AlertCircle} tone="red" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Pnl title="Notification Settings">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {[['Expiry alerts','Notify when medicines near expiry threshold',true],['Low stock alerts','Notify when stock drops below minimum',true],['Recall notifications','Instant alerts on batch recall events',true],['SMS notifications','Send SMS to registered customers',false],['Weekly digest','Send weekly pharmacy summary report',true],['System notifications','System maintenance and update alerts',true]].map(([title,desc,on])=>(
              <div key={title as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #EFEFEA' }}>
                <div style={{ flex:1, paddingRight:16 }}>
                  <p style={{ fontSize:14, fontWeight:600 }}>{title as string}</p>
                  <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>{desc as string}</p>
                </div>
                <div className={`toggle ${on?'on':''}`}/>
              </div>
            ))}
          </div>
        </Pnl>
        <Pnl title="Recent Notifications">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
            {[['Expiry alert sent','VD102 near expiry — sent to Dr. Anita','2 min ago','Success'],['Low stock alert','Paracetamol PCT101 below minimum','1 hr ago','Success'],['SMS notification','Customer Priya Sharma — recall notice','3 hrs ago','Failed'],['Weekly digest','Sent to all 18 team members','Yesterday','Success']].map(([title,desc,time,status])=>(
              <div key={title as string} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'1px solid #EFEFEA' }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600 }}>{title as string}</p>
                  <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>{desc as string}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <Bdg status={status as string}/>
                  <p style={{ fontSize:11, color:'#888888', marginTop:4 }}>{time as string}</p>
                </div>
              </div>
            ))}
          </div>
        </Pnl>
      </div>
    </>
  );
}

/* ─────────── AI CONFIGURATION ─────────── */
function AIConfig({ showToast }: { showToast:(s:string)=>void }) {
  return (
    <>
      <PageHdr eyebrow="AI CONFIGURATION" title="AI Configuration" desc="Manage AI assistant settings and monitor usage statistics." action={<button className="btn btn-sage" onClick={()=>showToast('AI settings saved')}>Save changes</button>}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <KPI label="Questions Today" value="48" icon={BrainCircuit} tone="purple" />
        <KPI label="This Month" value="1,240" icon={BarChart3} tone="sage" />
        <KPI label="Avg Response" value="0.8s" icon={Clock} tone="green" />
        <KPI label="Accuracy" value="98.4%" icon={CheckCircle2} tone="green" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Pnl title="AI Feature Controls">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {[['AI Pharmacy Assistant','Enable the main AI chat assistant',true],['AI Audit Conversation','Allow AI to explain audit records',true],['What-If Simulator','Enable inventory simulation tool',true],['AI Expiry Predictions','Predict expiry risk using AI',true],['AI Reorder Suggestions','Suggest reorder quantities',false],['Natural Language Queries','Plain language database queries',true]].map(([title,desc,on])=>(
              <div key={title as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #EFEFEA' }}>
                <div style={{ flex:1, paddingRight:16 }}>
                  <p style={{ fontSize:14, fontWeight:600 }}>{title as string}</p>
                  <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>{desc as string}</p>
                </div>
                <div className={`toggle ${on?'on':''}`}/>
              </div>
            ))}
          </div>
        </Pnl>
        <Pnl title="Most Asked Questions">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {[['Which medicines expire soon?','284 times'],['Which stock is low?','201 times'],['Which batches need return?','156 times'],['Show dispensing activity','124 times'],['What should I reorder?','98 times']].map(([q,c],i)=>(
              <div key={q as string} style={{ display:'flex', gap:12, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #EFEFEA' }}>
                <span style={{ width:22, fontSize:11, color:'#888888', fontWeight:700 }}>0{i+1}</span>
                <span style={{ flex:1, fontSize:13, color:'#111111' }}>{q as string}</span>
                <span style={{ fontSize:12, color:'#555555', fontWeight:600, whiteSpace:'nowrap' }}>{c as string}</span>
              </div>
            ))}
          </div>
        </Pnl>
      </div>
    </>
  );
}

/* ─────────── PHARMACY MANAGEMENT ─────────── */
function PharmacyManagement({ showToast }: { showToast:(s:string)=>void }) {
  const pharmacies = [
    { name:'WellCare Pharmacy', admin:'Dr. Anita Rao', users:8, medicines:128, status:'Active', last:'Today' },
    { name:'MediCare Plus', admin:'Dr. Ramesh Gupta', users:5, medicines:94, status:'Active', last:'Yesterday' },
    { name:'HealthFirst Clinic', admin:'Dr. Pooja Singh', users:3, medicines:67, status:'Suspended', last:'Aug 20' },
  ];
  return (
    <>
      <PageHdr eyebrow="PLATFORM" title="Pharmacy Management" desc="View and manage registered pharmacies on PharmaFlow." action={<button className="btn btn-sage" onClick={()=>showToast('Add pharmacy form ready')}><Plus size={15}/> Add Pharmacy</button>}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <KPI label="Total Pharmacies" value="3" icon={Building2} tone="sage" />
        <KPI label="Active" value="2" icon={CheckCircle2} tone="green" />
        <KPI label="Suspended" value="1" icon={AlertCircle} tone="red" />
      </div>
      <Pnl title="Registered Pharmacies">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead><tr style={{ background:'#F2F2EE' }}>
              {['Pharmacy','Admin','Users','Medicines','Status','Last Activity','Actions'].map(h=><th key={h} style={{ padding:'12px 20px', fontSize:11, fontWeight:700, color:'#888888', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{pharmacies.map(p=>(
              <tr key={p.name} className="table-row" style={{ borderTop:'1px solid #EFEFEA' }}>
                <td style={{ padding:'14px 20px' }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center' }}><Building2 size={17} color="#526350"/></div>
                    <p style={{ fontWeight:700, fontSize:13.5 }}>{p.name}</p>
                  </div>
                </td>
                <td style={{ padding:'14px 20px', fontSize:13, color:'#555555' }}>{p.admin}</td>
                <td style={{ padding:'14px 20px', fontWeight:700, fontSize:14 }}>{p.users}</td>
                <td style={{ padding:'14px 20px', fontWeight:700, fontSize:14 }}>{p.medicines}</td>
                <td style={{ padding:'14px 20px' }}><Bdg status={p.status}/></td>
                <td style={{ padding:'14px 20px', fontSize:12, color:'#555555' }}>{p.last}</td>
                <td style={{ padding:'14px 20px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-secondary" style={{ fontSize:11, padding:'4px 10px' }}>View</button>
                    <button className="btn btn-secondary" style={{ fontSize:11, padding:'4px 10px' }}>Edit</button>
                    <button className="btn btn-ghost" style={{ padding:5 }}><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Pnl>
    </>
  );
}

/* ─────────── SYSTEM SETTINGS ─────────── */
function SystemSettings({ showToast }: { showToast:(s:string)=>void }) {
  const [sec, setSec] = useState('General');
  const sections = ['General','Pharmacy Defaults','Alert Rules','Expiry Rules','Security','Notifications','Language','Data Retention','Backup Schedule'];
  return (
    <>
      <PageHdr eyebrow="CONFIGURATION" title="System Settings" desc="Configure platform-level settings for PharmaFlow."/>
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20 }}>
        <div className="card" style={{ padding:8, height:'fit-content' }}>
          {sections.map(s=>(
            <button key={s} onClick={()=>setSec(s)} className="sidebar-item" style={{ width:'100%', marginBottom:2, ...(sec===s?{ background:'#E8EFE7', color:'#526350' }:{}) }}>{s}</button>
          ))}
        </div>
        <div className="card">
          <div style={{ padding:'20px 24px', borderBottom:'1px solid #EFEFEA' }}>
            <h3 style={{ fontWeight:700, fontSize:16 }}>{sec}</h3>
            <p style={{ fontSize:12, color:'#888888', marginTop:4 }}>Configure {sec.toLowerCase()} settings for your platform.</p>
          </div>
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16, maxWidth:520 }}>
            {sec==='General' ? <>
              <div><label className="label">Platform name</label><input className="input" defaultValue="PharmaFlow"/></div>
              <div><label className="label">Platform URL</label><input className="input" defaultValue="https://pharmaflow.app"/></div>
              <div><label className="label">Default timezone</label><select className="input"><option>Asia/Kolkata (GMT+5:30)</option><option>UTC</option></select></div>
              <div><label className="label">Date format</label><select className="input"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div>
            </> : sec==='Alert Rules' ? <>
              <div><label className="label">Low stock threshold (units)</label><input className="input" type="number" defaultValue="20"/></div>
              <div><label className="label">Expiry alert (days before)</label><input className="input" type="number" defaultValue="30"/></div>
              <div><label className="label">Critical expiry threshold (days)</label><input className="input" type="number" defaultValue="7"/></div>
            </> : sec==='Data Retention' ? <>
              <div><label className="label">Audit log retention (days)</label><input className="input" type="number" defaultValue="365"/></div>
              <div><label className="label">Backup retention (days)</label><input className="input" type="number" defaultValue="60"/></div>
              <div><label className="label">Session log retention (days)</label><input className="input" type="number" defaultValue="90"/></div>
            </> : sec==='Backup Schedule' ? <>
              <div><label className="label">Auto backup frequency</label><select className="input"><option>Daily</option><option>Weekly</option><option>Hourly</option></select></div>
              <div><label className="label">Backup time</label><input className="input" type="time" defaultValue="02:00"/></div>
              <div><label className="label">Backup storage limit (GB)</label><input className="input" type="number" defaultValue="10"/></div>
            </> : <>
              {['Enable feature 1','Enable feature 2','Enable feature 3'].map((x,i)=>(
                <div key={x} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #EFEFEA' }}>
                  <p style={{ fontSize:14, fontWeight:600 }}>{x}</p>
                  <div className={`toggle ${i%2===0?'on':''}`}/>
                </div>
              ))}
            </>}
            <button className="btn btn-sage" style={{ alignSelf:'flex-start', marginTop:8 }} onClick={()=>showToast('Settings saved successfully')}>Save changes</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── ADMIN REPORTS ─────────── */
function AdminReports({ showToast }: { showToast:(s:string)=>void }) {
  const reports = ['User Activity','System Activity','Inventory Activity','Dispensing Activity','Audit Activity','Security Activity','Backup History'];
  return (
    <>
      <PageHdr eyebrow="ANALYTICS" title="Admin Reports" desc="Platform-wide analytics and administrative reporting." action={<button className="btn btn-sage" onClick={()=>showToast('Report exported')}><Download size={14}/> Export report</button>}/>
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <button className="btn btn-secondary">Last 30 days <ChevronDown size={13}/></button>
        <button className="btn btn-secondary">All pharmacies <ChevronDown size={13}/></button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {reports.map(r=>(
          <div key={r} className="card card-hover" style={{ padding:20, cursor:'pointer' }} onClick={()=>showToast(`${r} report loading...`)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'#E8EFE7', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BarChart3 size={20} color="#526350"/>
              </div>
              <span style={{ fontSize:11, color:'#888888' }}>Updated today</span>
            </div>
            <p style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{r}</p>
            <p style={{ fontSize:12, color:'#888888', lineHeight:1.5, marginBottom:14 }}>Comprehensive {r.toLowerCase()} data with filters and export.</p>
            <button style={{ fontSize:12, color:'#6B8068', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              View report <ArrowUpRight size={13}/>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────── ACTIVITY MONITORING ─────────── */
function ActivityMonitoring() {
  return (
    <>
      <PageHdr eyebrow="MONITORING" title="Activity Monitoring" desc="Real-time monitoring of all user and system activity." action={<button className="btn btn-secondary"><RefreshCw size={14}/> Refresh</button>}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <KPI label="Active Users" value="11" icon={Users} tone="green" />
        <KPI label="API Calls / hr" value="284" icon={Activity} tone="sage" />
        <KPI label="DB Queries / hr" value="1,240" icon={Server} tone="teal" />
        <KPI label="Response Time" value="45ms" icon={Wifi} tone="green" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Pnl title="Live Activity Feed">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {[['Dr. Anita Rao','Viewed inventory dashboard','Just now','#52796F'],['Dr. Suresh Kumar','Added stock to VD102','1 min ago','#6B8068'],['System','Expiry check completed','2 min ago','#555555'],['Dr. Neha Menon','Confirmed dispensing record','3 min ago','#6B8068'],['System','Auto-backup scheduled','5 min ago','#555555'],['Priya Nair','Exported audit report','8 min ago','#B86B35']].map(([user,action,time,color])=>(
              <div key={action as string} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #EFEFEA' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:color as string, flexShrink:0 }} className="animate-pulse"/>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{user as string}</span>
                  <span style={{ fontSize:13, color:'#555555' }}> — {action as string}</span>
                </div>
                <span style={{ fontSize:11, color:'#888888', whiteSpace:'nowrap' }}>{time as string}</span>
              </div>
            ))}
          </div>
        </Pnl>
        <Pnl title="System Performance">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {[['CPU Usage','23%','#52796F'],['Memory','58%','#B86B35'],['Storage','24%','#52796F'],['Network','12%','#52796F'],['DB Load','31%','#52796F']].map(([label,pct,color])=>(
              <div key={label as string}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                  <span style={{ fontWeight:500 }}>{label as string}</span>
                  <span style={{ fontWeight:700, color:color as string }}>{pct as string}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width:pct as string, background:color as string }}/></div>
              </div>
            ))}
          </div>
        </Pnl>
      </div>
    </>
  );
}

/* ─────────── MAIN EXPORT ─────────── */
export default function AdminPortal({ onLogout }: { onLogout:()=>void }) {
  const [page, setPage] = useState<AdminPage>('admin-dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (text:string) => { setToast(text); setTimeout(()=>setToast(''), 2800); };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#FAFAF8' }}>
      <AdminSidebar open={sidebarOpen} page={page} onNavigate={p=>setPage(p as AdminPage)} onLogout={onLogout} />
      <div style={{ flex:1, marginLeft: sidebarOpen?260:76, transition:'margin 0.2s', minWidth:0 }}>
        <AdminTopbar onMenu={()=>setSidebarOpen(!sidebarOpen)} page={page} />
        <main style={{ padding:32, maxWidth:1400, margin:'0 auto' }} className="animate-fade-in">
          {page==='admin-dashboard' && <AdminDashboard />}
          {page==='user-management' && <UserManagement showToast={showToast} />}
          {page==='roles' && <RolesPermissions />}
          {page==='pharmacy-management' && <PharmacyManagement showToast={showToast} />}
          {page==='system-audit' && <SystemAudit />}
          {page==='data-management' && <DataManagement showToast={showToast} />}
          {page==='backup' && <BackupRestore showToast={showToast} />}
          {page==='security' && <SecurityCenter />}
          {page==='notifications' && <Notifications showToast={showToast} />}
          {page==='ai-config' && <AIConfig showToast={showToast} />}
          {page==='system-settings' && <SystemSettings showToast={showToast} />}
          {page==='admin-reports' && <AdminReports showToast={showToast} />}
          {page==='activity' && <ActivityMonitoring />}
        </main>
      </div>
      {toast && (
        <div className="animate-slide-up" style={{ position:'fixed', bottom:24, right:24, zIndex:100, display:'flex', alignItems:'center', gap:10, background:'#111111', color:'white', padding:'12px 20px', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', fontSize:13, fontWeight:500 }}>
          <CheckCircle2 size={16} color="#A3B19B"/> {toast}
        </div>
      )}
      <style>{`@media(max-width:768px){.hidden-mobile-aside{display:none!important;}}`}</style>
    </div>
  );
}
