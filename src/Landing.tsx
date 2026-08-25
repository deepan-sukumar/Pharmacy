import React, { useState, useEffect } from 'react';
import {
  Stethoscope, ArrowRight, CheckCircle2, ShieldCheck, Boxes, ClipboardList,
  RotateCcw, BrainCircuit, Bell, BarChart3, Lock, PackagePlus,
  ChevronRight, Activity, FileText, SlidersHorizontal, AlertTriangle,
  Clock3, Sparkles
} from 'lucide-react';

export default function Landing({ onSignIn, onGetStarted }: { onSignIn:()=>void; onGetStarted:()=>void }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const heroFloatingBadges = [
    { title: "12 Near Expiry", sub: "Action required", icon: Clock3, color: "#B5838D", bg: "#F7EDE2", pos: { top: "18%", left: "6%" }, move: 15 },
    { title: "7 Low Stock", sub: "Paracetamol & 6 more", icon: AlertTriangle, color: "#B86B35", bg: "#F7EBE3", pos: { top: "62%", left: "4%" }, move: -20 },
    { title: "Audit Complete", sub: "100% Traceability", icon: ShieldCheck, color: "#52796F", bg: "#E6EFEA", pos: { top: "22%", right: "6%" }, move: -15 },
    { title: "AI Risk Detected", sub: "VD102 overstock predicted", icon: BrainCircuit, color: "#6B8068", bg: "#E8EFE7", pos: { top: "66%", right: "4%" }, move: 22 }
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
      title: "Medication Dispensing Audit",
      desc: "Record every dispensing transaction with medicine, batch, quantity, customer and pharmacist details.",
      icon: ClipboardList,
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
      id: "audit-ai",
      title: "AI Audit Conversation",
      desc: "Explore dispensing activity and identify unusual or important transactions through natural dialogue.",
      icon: FileText,
      badge: "SMART AUDIT",
      preview: { metric: "100% Trace", label: "Full Transaction Analysis", detail: "Automated Compliance Checks" }
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
      badge: "PROCUREMENT",
      preview: { metric: "₹ 1.82L", label: "Eligible Returns Processed", detail: "4 Pending Supplier Claims" }
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      desc: "Turn pharmacy operations into clear, actionable visual insights.",
      icon: BarChart3,
      badge: "ANALYTICS",
      preview: { metric: "+12.4%", label: "Dispensing Efficiency Growth", detail: "Custom Automated Reports" }
    },
    {
      id: "admin",
      title: "Security & Administration",
      desc: "Manage users, permissions, audit trails, backups and system controls securely.",
      icon: Lock,
      badge: "ENTERPRISE GRADE",
      preview: { metric: "AES-256", label: "Encrypted Daily Backups", detail: "Role-Based Access Control" }
    }
  ];

  return (
    <div style={{ background: '#FFFFFF', color: '#111111', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Top Banner */}
      <div style={{ background: '#111111', color: '#FAFAF8', padding: '10px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>
        <span>✨ Commercial-Grade Healthcare SaaS · </span>
        <span style={{ color: '#A3B19B', fontWeight: 600 }}>Pharmacy Medication Dispensing Audit & Expiry Tracking Portal</span>
      </div>

      {/* Navigation */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #EFEFEA' }}>
        <div className="container" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#6B8068', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(107,128,104,0.25)' }}>
              <Stethoscope size={20} color="white" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 19, letterSpacing: '-0.5px', color: '#111111' }}>
              PHARMA<span style={{ color: '#6B8068' }}>FLOW</span>
            </span>
          </div>
          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hidden-mobile">
            {['Capabilities', 'Workflow', 'AI Intelligence', 'Security'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: 13.5, fontWeight: 600, color: '#555555', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#111111')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555555')}>
                {item}
              </a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ padding: '9px 18px' }} onClick={onSignIn}>Sign In</button>
            <button className="btn btn-sage" style={{ padding: '9px 20px' }} onClick={onGetStarted}>Launch Demo <ArrowRight size={14}/></button>
          </div>
        </div>
      </header>

      {/* Interactive Floating Hero Section */}
      <section style={{ position: 'relative', padding: '110px 0 100px', background: 'radial-gradient(ellipse at 50% 10%, #F0F4EF 0%, #FAFAF8 65%, #FFFFFF 100%)', borderBottom: '1px solid #EFEFEA' }}>
        
        {/* Parallax Floating Metric Badges */}
        {heroFloatingBadges.map((b, i) => {
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
                background: 'white',
                border: '1px solid #E5E5E0',
                borderRadius: 14,
                padding: '12px 18px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.02)',
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
                <p style={{ fontWeight: 800, fontSize: 13.5, color: '#111111', lineHeight: 1.2 }}>{b.title}</p>
                <p style={{ fontSize: 11.5, color: '#666666', marginTop: 2 }}>{b.sub}</p>
              </div>
            </div>
          );
        })}

        <div className="container" style={{ textAlign: 'center', maxWidth: 860, position: 'relative', zIndex: 15 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 99, background: '#E8EFE7', color: '#526350', fontSize: 12.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 28, boxShadow: '0 2px 8px rgba(107,128,104,0.1)' }}>
            <Sparkles size={15}/> Healthcare Technology Platform
          </div>

          <h1 style={{ fontSize: 'clamp(34px, 4.8vw, 58px)', fontWeight: 900, letterSpacing: '-1.4px', lineHeight: 1.1, color: '#111111', marginBottom: 24 }}>
            Pharmacy Medication Dispensing Audit & Expiry Tracking Portal
          </h1>

          <p style={{ fontSize: 18.5, color: '#444444', lineHeight: 1.65, maxWidth: 720, margin: '0 auto 40px', fontWeight: 400 }}>
            One intelligent platform to manage medicines, monitor batch expiry, track dispensing activity and maintain a complete pharmacy audit trail.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-sage" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 14 }} onClick={onGetStarted}>
              Explore PharmaFlow <ArrowRight size={16}/>
            </button>
            <button className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 14 }} onClick={onSignIn}>
              Launch Demo
            </button>
          </div>

          {/* Clean Trust Indicators */}
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', marginTop: 56, flexWrap: 'wrap', fontSize: 13.5, color: '#555555', fontWeight: 600 }}>
            {['FEFO Batch Expiry Logic', 'Complete Audit Traceability', 'AI Operational Intelligence', 'Zero Data Loss Protocol'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={17} color="#6B8068" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Interactive Product Showcase Grid */}
      <section id="capabilities" className="section-padding" style={{ background: '#FAFAF8' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p className="section-eyebrow">PRODUCT CAPABILITIES</p>
            <h2 className="section-title">11 Core Pillars of Smart Pharmacy Operations</h2>
            <p className="section-desc" style={{ margin: '14px auto 0' }}>Explore every capability designed to protect inventory, simplify audits, and elevate patient care.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              const isHovered = activeFeature === i;
              const cardTiltX = isHovered ? mousePos.y * -8 : 0;
              const cardTiltY = isHovered ? mousePos.x * 8 : 0;

              return (
                <div key={f.id}
                  onMouseEnter={() => setActiveFeature(i)}
                  style={{
                    background: 'white',
                    border: `1.5px solid ${isHovered ? '#6B8068' : '#EFEFEA'}`,
                    borderRadius: 20,
                    padding: 28,
                    transition: 'all 0.2s ease-out',
                    transform: `perspective(1000px) rotateX(${cardTiltX}deg) rotateY(${cardTiltY}deg) translateY(${isHovered ? '-4px' : '0px'})`,
                    boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(107,128,104,0.1)' : '0 2px 10px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={onGetStarted}>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: isHovered ? '#6B8068' : '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                        <Icon size={22} color={isHovered ? 'white' : '#526350'} />
                      </div>
                      <span className="chip badge-blue" style={{ fontSize: 11 }}>{f.badge}</span>
                    </div>

                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#111111', marginBottom: 10 }}>{f.title}</h3>
                    <p style={{ fontSize: 14, color: '#555555', lineHeight: 1.6, marginBottom: 24 }}>{f.desc}</p>
                  </div>

                  {/* Small Live Realistic Data Preview */}
                  <div style={{ background: '#F4F4F0', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E5E5E0' }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 900, color: '#111111' }}>{f.preview.metric}</p>
                      <p style={{ fontSize: 11.5, color: '#666666', fontWeight: 500 }}>{f.preview.label}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6B8068', background: 'white', padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E5E0' }}>
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
      <section id="workflow" style={{ padding: '90px 0', background: '#F4F4F0', borderTop: '1px solid #E5E5E0', borderBottom: '1px solid #E5E5E0' }}>
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
              <div key={i} className="card card-hover" style={{ padding: 22, textAlign: 'center', background: 'white', border: '1px solid #E5E5E0', borderRadius: 16 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#6B8068', display: 'block', marginBottom: 8 }}>{w.step}</span>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 6 }}>{w.title}</h4>
                <p style={{ fontSize: 12, color: '#666666', lineHeight: 1.5 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Showcase */}
      <section id="ai-intelligence" className="section-padding">
        <div className="container">
          <div style={{ borderRadius: 24, background: '#111111', color: 'white', padding: '64px 48px', boxShadow: '0 24px 60px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#A3B19B', textTransform: 'uppercase' }}>AI PHARMACY ASSISTANT</span>
                <h2 style={{ fontSize: 36, fontWeight: 900, color: 'white', margin: '14px 0 18px', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
                  Natural language insights for smarter pharmacy management
                </h2>
                <p style={{ fontSize: 16, color: '#CCCCCC', lineHeight: 1.65, marginBottom: 32 }}>
                  Ask questions in plain language to get instant answers about stock levels, expiring batches, supplier returns, and dispensing history.
                </p>
                <button className="btn btn-sage" style={{ padding: '13px 28px', fontSize: 14.5, borderRadius: 12 }} onClick={onGetStarted}>
                  Ask AI Assistant <ChevronRight size={16}/>
                </button>
              </div>

              {/* Mock AI Conversation Floating Box */}
              <div style={{ background: '#1A1A1A', borderRadius: 18, border: '1px solid #333333', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid #2A2A2A' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6B8068', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BrainCircuit size={18} color="white" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>PharmaFlow AI</span>
                </div>
                <div style={{ background: '#252525', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#DDDDDD' }}>
                  "Which medicines expire within 30 days?"
                </div>
                <div style={{ background: '#6B8068', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'white', lineHeight: 1.5 }}>
                  "12 batches identified. Vitamin D3 60K (VD102) is highest priority with 180 units expiring in 12 days."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding" style={{ background: '#FFFFFF', textAlign: 'center', borderTop: '1px solid #EFEFEA' }}>
        <div className="container" style={{ maxWidth: 740 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: '#111111', letterSpacing: '-1px', marginBottom: 16 }}>
            Make Every Medication Decision Smarter.
          </h2>
          <p style={{ fontSize: 17, color: '#555555', lineHeight: 1.6, marginBottom: 36 }}>
            PharmaFlow brings pharmacy operations, medication safety and intelligent decision support together.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button className="btn btn-sage" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 14 }} onClick={onGetStarted}>
              Launch Demo <ArrowRight size={16}/>
            </button>
            <button className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 15, borderRadius: 14 }} onClick={onSignIn}>
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 0', borderTop: '1px solid #EFEFEA', background: '#F4F4F0', fontSize: 13, color: '#666666' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontWeight: 900, color: '#111111' }}>PHARMAFLOW</span> · Pharmacy Medication Dispensing Audit & Expiry Tracking Portal
          </div>
          <div>© 2026 PharmaFlow Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
