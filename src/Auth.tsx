import React, { useState, useEffect } from 'react';
import {
  Stethoscope, ArrowLeft, ShieldCheck, Lock, Mail, CheckCircle2, ChevronRight,
  Boxes, Activity, Clock3, AlertTriangle, BrainCircuit
} from 'lucide-react';
import type { Role } from './data';

export default function Auth({ mode = 'signin', onLogin, onSwitch, onBack }: {
  mode: 'signin' | 'signup';
  onLogin: (role: Role) => void;
  onSwitch: () => void;
  onBack: () => void;
}) {
  const [role, setRole] = useState<Role>('Pharmacist');
  const [email, setEmail] = useState('pharmacist@demo.com');
  const [password, setPassword] = useState('demo123');
  const [remember, setRemember] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(role);
  };

  const setDemoRole = (targetRole: Role) => {
    setRole(targetRole);
    setEmail(targetRole === 'Administrator' ? 'admin@demo.com' : 'pharmacist@demo.com');
    setPassword('demo123');
    onLogin(targetRole);
  };

  const tiltX = mousePos.y * -6;
  const tiltY = mousePos.x * 6;

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '520px 1fr', background: '#FFFFFF', color: '#111111', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      
      {/* LEFT SIDE: Premium Compact Login / Signup Form */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 48px', borderRight: '1px solid #F1F2EE', background: '#FFFFFF', zIndex: 10 }}>
        <div>
          <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#5F6360', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 32, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#111111')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5F6360')}>
            <ArrowLeft size={16}/> Back to Home
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#6B8068', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(107,128,104,0.2)' }}>
              <Stethoscope size={19} color="white" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 19, letterSpacing: '-0.4px', color: '#111111' }}>
              PHARMA<span style={{ color: '#6B8068' }}>FLOW</span>
            </span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111111', letterSpacing: '-0.5px' }}>
            {mode === 'signin' ? 'Welcome to PharmaFlow' : 'Create your PharmaFlow account'}
          </h1>
          <p style={{ fontSize: 13.5, color: '#5F6360', marginTop: 6, marginBottom: 28, lineHeight: 1.5 }}>
            {mode === 'signin'
              ? 'Secure access to your pharmacy medication operations.'
              : 'Set up secure access to your pharmacy operations.'}
          </p>

          {/* Role selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#F1F2EE', padding: 4, borderRadius: 12, marginBottom: 24 }}>
            <button type="button" onClick={() => { setRole('Pharmacist'); setEmail('pharmacist@demo.com'); }}
              style={{ padding: '9.5px 12px', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: role === 'Pharmacist' ? 'white' : 'transparent', color: role === 'Pharmacist' ? '#111111' : '#5F6360', boxShadow: role === 'Pharmacist' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
              Pharmacist
            </button>
            <button type="button" onClick={() => { setRole('Administrator'); setEmail('admin@demo.com'); }}
              style={{ padding: '9.5px 12px', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: role === 'Administrator' ? 'white' : 'transparent', color: role === 'Administrator' ? '#111111' : '#5F6360', boxShadow: role === 'Administrator' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
              Administrator
            </button>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label" style={{ fontSize: 11, fontWeight: 800, color: '#5F6360', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase', display: 'block' }}>Work Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#888888" style={{ position: 'absolute', left: 13, top: 12 }} />
                <input className="input" style={{ paddingLeft: 40, height: 42, fontSize: 13.5, background: '#FFFFFF', border: '1.5px solid #E5E5E0', borderRadius: 11 }} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="label" style={{ fontSize: 11, fontWeight: 800, color: '#5F6360', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase', display: 'block' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#888888" style={{ position: 'absolute', left: 13, top: 12 }} />
                <input className="input" style={{ paddingLeft: 40, height: 42, fontSize: 13.5, background: '#FFFFFF', border: '1.5px solid #E5E5E0', borderRadius: 11 }} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#5F6360', fontWeight: 500 }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#6B8068', width: 15, height: 15 }} /> Remember me
              </label>
              <a href="#" onClick={e => e.preventDefault()} style={{ color: '#6B8068', fontWeight: 700, textDecoration: 'none' }}>Forgot Password?</a>
            </div>

            <button type="submit" className="btn btn-sage" style={{ width: '100%', justifyContent: 'center', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 700, marginTop: 6, background: '#6B8068', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(107,128,104,0.25)' }}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'} <ChevronRight size={16}/>
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F1F2EE' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#888888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Quick Demo Access</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" className="btn btn-secondary" style={{ justifyContent: 'center', fontSize: 12.5, height: 38, borderRadius: 10, background: '#F7F7F4', border: '1px solid #E5E5E0', color: '#111111', fontWeight: 600 }} onClick={() => setDemoRole('Pharmacist')}>
                Pharmacist Demo
              </button>
              <button type="button" className="btn btn-secondary" style={{ justifyContent: 'center', fontSize: 12.5, height: 38, borderRadius: 10, background: '#F7F7F4', border: '1px solid #E5E5E0', color: '#111111', fontWeight: 600 }} onClick={() => setDemoRole('Administrator')}>
                Administrator Demo
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 13, color: '#5F6360', textAlign: 'center' }}>
          {mode === 'signin' ? (
            <span>Don't have an account? <button onClick={onSwitch} style={{ color: '#6B8068', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}>Create account</button></span>
          ) : (
            <span>Already have an account? <button onClick={onSwitch} style={{ color: '#6B8068', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}>Sign in</button></span>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Bright Premium Interactive Product Showcase */}
      <div style={{ background: '#F7F7F4', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        
        {/* Top Header Text */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 620 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#6B8068', textTransform: 'uppercase', background: '#E8EEE6', padding: '5px 12px', borderRadius: 99, display: 'inline-block', marginBottom: 14 }}>
            PHARMACY INTELLIGENCE PLATFORM
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111111', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 10 }}>
            Pharmacy Medication Dispensing Audit & Expiry Tracking Portal
          </h2>
          <p style={{ fontSize: 14, color: '#5F6360', lineHeight: 1.6, maxWidth: 540 }}>
            Complete traceability, intelligent expiry monitoring and secure dispensing audit — all in one platform.
          </p>
        </div>

        {/* Center Floating Interactive Mini-Dashboard Showcase */}
        <div style={{ position: 'relative', margin: '32px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          
          {/* Floating Glass Metric Badges Around Dashboard */}
          {[
            { title: "12 Near Expiry", sub: "Action Required", icon: Clock3, color: "#B5838D", bg: "#F7EDE2", pos: { top: "-18px", left: "10px" }, move: 14 },
            { title: "7 Low Stock", sub: "Reorder Alert", icon: AlertTriangle, color: "#B86B35", bg: "#F7EBE3", pos: { bottom: "-18px", left: "20px" }, move: -18 },
            { title: "Audit Protected", sub: "100% Traceability", icon: ShieldCheck, color: "#52796F", bg: "#E6EFEA", pos: { top: "-18px", right: "10px" }, move: -14 },
            { title: "AI Risk Detected", sub: "VD102 Overstock", icon: BrainCircuit, color: "#6B8068", bg: "#E8EEE6", pos: { bottom: "-18px", right: "20px" }, move: 20 }
          ].map((b, i) => {
            const Icon = b.icon;
            const offsetX = mousePos.x * b.move;
            const offsetY = mousePos.y * b.move;
            return (
              <div key={i} className="hidden-mobile"
                style={{
                  position: 'absolute',
                  ...b.pos,
                  transform: `translate3d(${offsetX}px, ${offsetY}px, 0px)`,
                  transition: 'transform 0.1s ease-out',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid #E5E5E0',
                  borderRadius: 12,
                  padding: '10px 14px',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  zIndex: 20,
                  cursor: 'default'
                }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={b.color} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 12.5, color: '#111111', lineHeight: 1.1 }}>{b.title}</p>
                  <p style={{ fontSize: 10.5, color: '#666666', marginTop: 2 }}>{b.sub}</p>
                </div>
              </div>
            );
          })}

          {/* Main 3D Mini Interactive Dashboard Card */}
          <div style={{
            width: '100%',
            maxWidth: 580,
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1.5px solid #E5E5E0',
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.07), 0 4px 16px rgba(107,128,104,0.08)',
            transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transition: 'transform 0.15s ease-out',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {/* Header Mini Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #F1F2EE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6B8068' }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#111111' }}>PharmaFlow Control Center</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#52796F', background: '#E6EFEA', padding: '3px 8px', borderRadius: 99 }}>LIVE SYSTEM</span>
            </div>

            {/* Grid of Mini Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#F7F7F4', borderRadius: 12, padding: 14, border: '1px solid #E5E5E0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#5F6360' }}>Active Stock</span>
                  <Boxes size={15} color="#6B8068" />
                </div>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#111111', marginTop: 4 }}>18,420</p>
                <p style={{ fontSize: 11, color: '#52796F', marginTop: 2 }}>128 Medicines tracked</p>
              </div>

              <div style={{ background: '#F7F7F4', borderRadius: 12, padding: 14, border: '1px solid #E5E5E0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#5F6360' }}>Dispensed Today</span>
                  <Activity size={15} color="#52796F" />
                </div>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#111111', marginTop: 4 }}>42 Records</p>
                <p style={{ fontSize: 11, color: '#5F6360', marginTop: 2 }}>100% FEFO Compliant</p>
              </div>
            </div>

            {/* AI Insight Box inside Mini Dashboard */}
            <div style={{ background: '#111111', color: 'white', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#6B8068', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BrainCircuit size={16} color="white" />
              </div>
              <p style={{ fontSize: 11.5, color: '#EEEEEE', lineHeight: 1.4 }}>
                <strong style={{ color: '#A3B19B' }}>AI Recommendation:</strong> Vitamin D3 60K (VD102) expires in 12 days. Prioritize dispensing.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights List */}
        <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, paddingTop: 16, borderTop: '1px solid #E5E5E0' }}>
          {[
            'FEFO Dispensing & Batch Management',
            'Real-Time Expiry & Low Stock Alerts',
            'Complete Dispensing Audit Trail',
            'AI Pharmacy Intelligence',
            'Role-Based Administration'
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#222222' }}>
              <CheckCircle2 size={16} color="#6B8068" style={{ flexShrink: 0 }} /> {item}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
