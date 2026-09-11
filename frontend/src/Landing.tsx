import React, { useState, useEffect } from 'react';
import {
  Stethoscope, ArrowRight, CheckCircle2, ShieldCheck, Boxes, ClipboardList,
  RotateCcw, BrainCircuit, Bell, BarChart3, PackagePlus,
  ChevronRight, Activity, FileText, SlidersHorizontal, AlertTriangle,
  Clock3, Sparkles
} from 'lucide-react';
import { ThemeToggle } from './components/ThemeContext';

export default function Landing({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);

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

  const heroFloatingBadges = [
    { title: "12 Near Expiry", sub: "Action required", icon: Clock3, color: "#D97706", bg: "var(--warning-light)", pos: { top: "18%", left: "6%" }, move: 15 },
    { title: "7 Low Stock", sub: "Paracetamol & 6 more", icon: AlertTriangle, color: "#EA580C", bg: "var(--orange-light)", pos: { top: "62%", left: "4%" }, move: -20 },
    { title: "Audit Complete", sub: "100% Traceability", icon: ShieldCheck, color: "#16A34A", bg: "var(--success-light)", pos: { top: "22%", right: "6%" }, move: -15 },
    { title: "AI Risk Detected", sub: "VD102 overstock predicted", icon: BrainCircuit, color: "#0D9488", bg: "var(--primary-light)", pos: { top: "66%", right: "4%" }, move: 22 }
  ];

  const features = [
    {
      id: "inventory",
      title: "Smart Medication Inventory",
      desc: "Track every medicine, batch, quantity and supplier in one clean workspace.",
      icon: Boxes,
      badge: "STOCK CONTROL",
      preview: { metric: "18,420", label: "Total Units in Stock", detail: "128 Active Medicines" }
    },
    {
      id: "expiry",
      title: "Batch & Expiry Intelligence",
      desc: "Identify near-expiry and expired medicines before they become costly waste.",
      icon: Activity,
      badge: "RISK PREVENTION",
      preview: { metric: "12 Batches", label: "Expiring in 30 Days", detail: "₹ 48,200 Stock Value at Risk" }
    },
    {
      id: "dispensing",
      title: "Medication Dispensing",
      desc: "Dispense prescriptions with automatic FEFO batch selection and dosage safety checks.",
      icon: ClipboardList,
      badge: "PATIENT SAFETY",
      preview: { metric: "42 Dispensed", label: "Logged Today", detail: "100% FEFO Compliance" }
    },
    {
      id: "audit",
      title: "Dispensing Audit Trail",
      desc: "Record every dispensing transaction with medicine, batch, quantity, customer and pharmacist details.",
      icon: ShieldCheck,
      badge: "COMPLIANCE",
      preview: { metric: "1,240", label: "Dispensed Records Logged", detail: "100% Audit Readiness" }
    },
    {
      id: "alerts",
      title: "Intelligent Alerts",
      desc: "Stay ahead of low stock, expiry, recall and return risks with real-time push warnings.",
      icon: Bell,
      badge: "PROACTIVE WARNINGS",
      preview: { metric: "3 Urgent", label: "Actionable Alerts Active", detail: "0 Missed Expiries" }
    },
    {
      id: "assistant",
      title: "AI Pharmacy Assistant",
      desc: "Ask questions about inventory, expiry, dispensing and pharmacy operations using plain language.",
      icon: BrainCircuit,
      badge: "INTELLIGENCE",
      preview: { metric: "Instant", label: "Data Queries & Answers", detail: "Trained on Pharmacy Operations" }
    },
    {
      id: "simulator",
      title: "What-If Expiry Simulator",
      desc: "Test purchase and inventory decisions before placing an order to minimize wasted stock.",
      icon: SlidersHorizontal,
      badge: "DECISION SUPPORT",
      preview: { metric: "255 Units", label: "Waste Avoided per Order", detail: "Demand vs Expiry Modeling" }
    },
    {
      id: "recall",
      title: "Batch Recall Management",
      desc: "Trace recalled batches, affected customers and remaining stock with a single click.",
      icon: RotateCcw,
      badge: "SAFETY FIRST",
      preview: { metric: "AMX204", label: "Recalled Batch Isolated", detail: "45 Units Quarantined" }
    },
    {
      id: "returns",
      title: "Supplier Returns",
      desc: "Identify eligible batches and manage supplier return workflows seamlessly.",
      icon: PackagePlus,
      badge: "SUPPLIER RECOVERY",
      preview: { metric: "₹ 82,400", label: "Processed Returns", detail: "4 Active Credit Notes" }
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      desc: "Turn pharmacy operations into clear, actionable visual insights.",
      icon: BarChart3,
      badge: "ANALYTICS",
      preview: { metric: "+12.4%", label: "Dispensing Efficiency Growth", detail: "Custom Automated Reports" }
    }
  ];

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', transition: 'background-color 0.2s ease, color 0.2s ease' }}>
      {/* Top Notice Bar */}
      <div style={{ background: '#0F172A', color: '#F8FAFC', padding: '10px 24px', fontSize: 12.5, fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Live Pharmacy Dispensing, Expiry Prediction & Regulatory Compliance System
        </span>
        <span style={{ color: '#94A3B8' }}>·</span>
        <button onClick={onGetStarted} style={{ background: 'none', border: 'none', color: '#5EEAD4', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Launch Portal <ArrowRight size={13}/>
        </button>
      </div>

      {/* Navigation Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px var(--primary-glow)' }}>
              <Stethoscope size={20} color="white" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 19, letterSpacing: '-0.5px', color: 'var(--text)' }}>
              PHARMA<span style={{ color: 'var(--primary)' }}>FLOW</span>
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hidden-mobile">
            {['Capabilities', 'Workflow', 'AI Intelligence', 'Compliance'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}>
                {item}
              </a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThemeToggle size="sm" />
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={onSignIn}>Sign In</button>
            <button className="btn btn-teal" style={{ padding: '8px 18px' }} onClick={onGetStarted}>Launch Demo <ArrowRight size={14}/></button>
          </div>
        </div>
      </header>

      {/* Interactive Floating Hero Section */}
      <section style={{ position: 'relative', padding: '100px 0 90px', borderBottom: '1px solid var(--border)', background: 'radial-gradient(ellipse at top, var(--primary-light) 0%, var(--bg) 70%)' }}>
        {/* Parallax Floating Metric Badges */}
        {heroFloatingBadges.map((b, i) => {
          const Icon = b.icon;
          const offsetX = mousePos.x * b.move;
          const offsetY = mousePos.y * b.move;
          return (
            <div key={i} className="hidden-mobile card"
              style={{
                position: 'absolute',
                ...b.pos,
                transform: `translate3d(${offsetX}px, ${offsetY}px, 0px)`,
                transition: 'transform 0.1s ease-out',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                zIndex: 10,
                cursor: 'default'
              }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={b.color} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.2 }}>{b.title}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{b.sub}</p>
              </div>
            </div>
          );
        })}

        <div className="container" style={{ textAlign: 'center', maxWidth: 880, position: 'relative', zIndex: 15 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary-border)', fontSize: 12, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 24 }}>
            <Sparkles size={14}/> Healthcare Technology Platform
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 54px)', fontWeight: 900, letterSpacing: '-1.4px', lineHeight: 1.15, color: 'var(--text)', marginBottom: 20 }}>
            Pharmacy Medication Dispensing Audit & Expiry Tracking Portal
          </h1>

          <p style={{ fontSize: 17, color: 'var(--text-3)', lineHeight: 1.65, maxWidth: 700, margin: '0 auto 36px', fontWeight: 400 }}>
            One intelligent platform to manage medicines, monitor batch expiry, track dispensing activity and maintain a complete pharmacy audit trail.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-teal" style={{ padding: '12px 28px', fontSize: 14.5, borderRadius: 12 }} onClick={onGetStarted}>
              Explore PharmaFlow <ArrowRight size={15}/>
            </button>
            <button className="btn btn-secondary" style={{ padding: '12px 28px', fontSize: 14.5, borderRadius: 12 }} onClick={onSignIn}>
              Launch Demo
            </button>
          </div>

          {/* Trust Indicators */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
            {['FEFO Batch Expiry Logic', 'Complete Audit Traceability', 'AI Operational Intelligence', 'Zero Data Loss Protocol'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle2 size={16} color="var(--primary)" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Interactive Product Showcase Grid */}
      <section id="capabilities" className="section-padding" style={{ background: 'var(--bg-alt)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p className="section-eyebrow">PRODUCT CAPABILITIES</p>
            <h2 className="section-title">10 Core Pillars of Smart Pharmacy Operations</h2>
            <p className="section-desc" style={{ margin: '14px auto 0' }}>Explore every capability designed to protect inventory, simplify audits, and elevate patient care.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 'clamp(14px, 2.5vw, 24px)' }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              const isHovered = activeFeature === i;
              const cardTiltX = isHovered ? mousePos.y * -8 : 0;
              const cardTiltY = isHovered ? mousePos.x * 8 : 0;

              return (
                <div key={f.id}
                  onMouseEnter={() => setActiveFeature(i)}
                  style={{
                    background: 'var(--surface)',
                    border: `1.5px solid ${isHovered ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 20,
                    padding: 28,
                    transition: 'all 0.2s ease-out',
                    transform: `perspective(1000px) rotateX(${cardTiltX}deg) rotateY(${cardTiltY}deg) translateY(${isHovered ? '-4px' : '0px'})`,
                    boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.1), 0 4px 12px var(--primary-glow)' : 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={onGetStarted}>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: isHovered ? 'var(--primary)' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        <Icon size={22} color={isHovered ? 'white' : 'var(--primary)'} />
                      </div>
                      <span className="chip badge-blue" style={{ fontSize: 11 }}>{f.badge}</span>
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{f.title}</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 24 }}>{f.desc}</p>
                  </div>

                  {/* Small Live Realistic Data Preview */}
                  <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{f.preview.metric}</p>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{f.preview.label}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--surface)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                      {f.preview.detail}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="workflow" style={{ padding: '90px 0', background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p className="section-eyebrow">HOW IT WORKS</p>
            <h2 className="section-title">End-to-End Pharmacy Workflow</h2>
            <p className="section-desc" style={{ margin: '12px auto 0' }}>Stock Entry → Batch Tracking → Dispensing → Audit → AI Analysis → Alerts → Action</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            {[
              { step: "01", title: "Stock Entry", desc: "Scan barcode or OCR invoice to capture batch & expiry." },
              { step: "02", title: "Batch Tracking", desc: "Real-time FEFO inventory tracking across all locations." },
              { step: "03", title: "Dispensing", desc: "Safely dispense linked batch records to customers." },
              { step: "04", title: "Audit", desc: "Immutable compliance log captured automatically." },
              { step: "05", title: "AI Analysis", desc: "Intelligent predictions for overstock and expiry risk." },
              { step: "06", title: "Alerts", desc: "Automated warnings for stock thresholds & recalls." },
              { step: "07", title: "Action", desc: "Execute supplier returns, reorders, or quarantine." }
            ].map((w, i) => (
              <div key={i} className="card card-hover" style={{ padding: 22, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', display: 'block', marginBottom: 8 }}>{w.step}</span>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{w.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Showcase */}
      <section id="ai-intelligence" className="section-padding">
        <div className="container">
          <div style={{ borderRadius: 24, background: '#0F172A', color: 'white', padding: '64px 48px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', border: '1px solid #1E293B' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#5EEAD4', textTransform: 'uppercase' }}>AI PHARMACY ASSISTANT</span>
                <h2 style={{ fontSize: 36, fontWeight: 900, color: 'white', margin: '14px 0 18px', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
                  Natural language insights for smarter pharmacy management
                </h2>
                <p style={{ fontSize: 16, color: '#94A3B8', lineHeight: 1.65, marginBottom: 32 }}>
                  Ask questions in plain language to get instant answers about stock levels, expiring batches, supplier returns, and dispensing history.
                </p>
                <button className="btn btn-teal" style={{ padding: '13px 28px', fontSize: 14.5, borderRadius: 12 }} onClick={onGetStarted}>
                  Ask AI Assistant <ChevronRight size={16}/>
                </button>
              </div>

              {/* Mock AI Conversation Floating Box */}
              <div style={{ background: '#1E293B', borderRadius: 18, border: '1px solid #334155', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid #334155' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BrainCircuit size={18} color="white" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>PharmaFlow AI</span>
                </div>
                <div style={{ background: '#0F172A', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#E2E8F0', border: '1px solid #334155' }}>
                  "Which medicines expire within 30 days?"
                </div>
                <div style={{ background: '#0D9488', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'white', lineHeight: 1.5 }}>
                  "12 batches identified. Vitamin D3 60K (VD102) is highest priority with 180 units expiring in 12 days."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance / Safety Section */}
      <section id="compliance" className="section-padding" style={{ background: 'var(--bg-alt)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p className="section-eyebrow">AUDIT & COMPLIANCE</p>
            <h2 className="section-title">Built for Pharmacists, Designed for Safety</h2>
            <p className="section-desc" style={{ margin: '12px auto 0' }}>Every prescription dispensed is logged with immutable batch traceability and patient safety verification.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { icon: ShieldCheck, title: "100% Dispensing Audit Trail", desc: "Every transaction logs medicine, batch, quantity, patient name, and pharmacist ID." },
              { icon: Activity, title: "FEFO First-Expiry Enforcement", desc: "Prevents dispensing younger stock while near-expiry batches remain available." },
              { icon: RotateCcw, title: "Instant Batch Recall Isolation", desc: "Quarantine hazardous or recalled batches instantly across the entire inventory." },
              { icon: FileText, title: "Automated Regulatory Reports", desc: "One-click generation of audit-ready compliance and stock movement logs." }
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="card card-hover" style={{ padding: 24, background: 'var(--surface)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={20} color="var(--primary)" />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{c.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding" style={{ background: 'var(--surface)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 740 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 16 }}>
            Make Every Medication Decision Smarter.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 36 }}>
            PharmaFlow brings pharmacy operations, medication safety and intelligent decision support together.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button className="btn btn-teal" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 14 }} onClick={onGetStarted}>
              Launch Demo <ArrowRight size={16}/>
            </button>
            <button className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 14 }} onClick={onSignIn}>
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 0', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)', fontSize: 13, color: 'var(--text-3)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontWeight: 900, color: 'var(--text)' }}>PHARMAFLOW</span> · Pharmacy Medication Dispensing Audit & Expiry Tracking Portal
          </div>
          <div>© 2026 PharmaFlow Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
