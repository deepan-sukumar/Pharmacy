import React, { useState } from 'react';
import type { Medicine, Audit, SupplierItem } from '../data';
import {
  BrainCircuit, Send, Sparkles, SlidersHorizontal, AlertTriangle,
  Clock3, ShieldAlert, ArrowRight, CheckCircle2, Boxes, CreditCard,
  Truck, Search, Info
} from 'lucide-react';

interface AIAssistantProps {
  inventory: Medicine[];
  audits: Audit[];
  suppliersList: SupplierItem[];
  onOpenSimulator: () => void;
  onNavigatePage: (p: string) => void;
}

interface Message {
  id: string;
  from: 'ai' | 'user';
  text: string;
  badge?: string;
  dataCard?: React.ReactNode;
  time: string;
}

export default function AIAssistant({
  inventory,
  audits,
  suppliersList,
  onOpenSimulator,
  onNavigatePage,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init',
      from: 'ai',
      badge: 'PHARMAFLOW OPERATIONS INTELLIGENCE',
      text: 'Good day, Dr. Anita. I am your operational pharmacy intelligence assistant. I am continuously synced with your live medication inventory, batch expirations, supplier deliveries, and dispensing audits. What operational insights do you need?',
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');

  const sampleQueries = [
    'Which medicines are expiring within 30 days?',
    'Which batch has the highest expiry risk?',
    'How many medicines were dispensed this week?',
    'Which supplier has the most near-expiry stock?',
    'Show unusual stock or dispensing activity.',
  ];

  const handleQuery = (q: string) => {
    const query = q.toLowerCase().trim();
    if (!query) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      from: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let aiText = '';
    let badge = 'INVENTORY INSIGHT';
    let dataCard: React.ReactNode = null;

    // 1. Expiring within 30 days
    if (query.includes('30 days') || (query.includes('expir') && (query.includes('soon') || query.includes('which')))) {
      badge = 'EXPIRY RISK ALERT';
      const nearExp = inventory.filter(m => m.status === 'Near Expiry' || m.status === 'Expired');
      aiText = `Analysis of live batches shows ${nearExp.length} medication batches requiring immediate attention before expiry:`;
      dataCard = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {nearExp.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                fontSize: 12,
              }}
            >
              <div>
                <b style={{ color: '#0F172A' }}>{m.medicine}</b>
                <span style={{ color: '#B45309', marginLeft: 8 }}>Batch {m.batch} ({m.expiry})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#D97706' }}>{m.quantity} units</span>
                <button
                  onClick={() => onNavigatePage('dispensing')}
                  className="btn btn-teal"
                  style={{ fontSize: 10.5, padding: '3px 8px' }}
                >
                  FEFO Dispense
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    // 2. Highest expiry risk batch
    else if (query.includes('highest') && (query.includes('risk') || query.includes('batch'))) {
      badge = 'CRITICAL RISK ASSESSMENT';
      const highestRisk = inventory.find(m => m.status === 'Near Expiry' && m.medicine.includes('Vitamin D3')) || inventory[1];
      aiText = `Batch ${highestRisk.batch} (${highestRisk.medicine}) presents the highest financial and clinical expiry risk. There are ${highestRisk.quantity} units valued at ₹ ${(highestRisk.quantity * (highestRisk.unitPrice || 65)).toLocaleString()} with an average dispensing velocity of only 5 units/day.`;
      dataCard = (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, color: '#DC2626', fontSize: 12 }}>CRITICAL EXPOSURE: ~120 UNITS SURPLUS</span>
            <span style={{ fontSize: 11, color: '#991B1B' }}>Supplier: {highestRisk.supplier}</span>
          </div>
          <p style={{ fontSize: 11.5, color: '#450A0A', lineHeight: 1.4 }}>
            Recommendation: Avoid new reorders and prioritize FEFO dispensing. Test exact write-off impact in the What-If Simulator.
          </p>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <button onClick={onOpenSimulator} className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}>
              Simulate in What-If Module →
            </button>
          </div>
        </div>
      );
    }
    // 3. Medicines dispensed this week
    else if (query.includes('dispensed') || query.includes('how many') || query.includes('week')) {
      badge = 'DISPENSING AUDIT SUMMARY';
      const totalUnits = audits.reduce((sum, a) => sum + a.quantity, 0);
      const totalRevenue = audits.reduce((sum, a) => sum + (a.totalAmount || a.quantity * 45), 0);
      aiText = `A total of ${totalUnits} medication units across ${audits.length} recorded prescriptions were safely dispensed with 100% batch traceability:`;
      dataCard = (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#F0FDFA', border: '1px solid #99F6E4', marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8, textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: 10.5, color: '#0F766E' }}>Total Units</p>
              <b style={{ fontSize: 16, color: '#0D9488' }}>{totalUnits}</b>
            </div>
            <div>
              <p style={{ fontSize: 10.5, color: '#0F766E' }}>Prescriptions</p>
              <b style={{ fontSize: 16, color: '#0D9488' }}>{audits.length}</b>
            </div>
            <div>
              <p style={{ fontSize: 10.5, color: '#0F766E' }}>Audit Volume</p>
              <b style={{ fontSize: 16, color: '#0D9488' }}>₹ {totalRevenue.toLocaleString()}</b>
            </div>
          </div>
          <button onClick={() => onNavigatePage('audit')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}>
            Open Dispensing Audit Log →
          </button>
        </div>
      );
    }
    // 4. Supplier with most near-expiry stock
    else if (query.includes('supplier')) {
      badge = 'SUPPLIER QUALITY AUDIT';
      aiText = `HealthCare Labs is associated with the highest volume of near-expiry inventory (Batch VD102 - 180 units of Vitamin D3 60K). MediSource also has 1 quarantined batch under active recall (AMX204).`;
      dataCard = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b style={{ color: '#B45309' }}>HealthCare Labs</b>
              <span style={{ color: '#D97706', fontWeight: 700 }}>180 units near expiry</span>
            </div>
            <p style={{ fontSize: 11, color: '#78350F', marginTop: 2 }}>
              Eligible for credit exchange per Supplier Agreement. Contact: care@healthcarelabs.com
            </p>
          </div>
          <button onClick={() => onNavigatePage('suppliers')} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px', alignSelf: 'flex-start' }}>
            Initiate Supplier Return Slip →
          </button>
        </div>
      );
    }
    // 5. Unusual activity / anomalies
    else if (query.includes('unusual') || query.includes('activit') || query.includes('anomaly')) {
      badge = 'ANOMALY DETECTION';
      aiText = `Operational anomaly scan identified 2 notable events across your pharmacy state:`;
      dataCard = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12 }}>
            <b style={{ color: '#DC2626' }}>Anomaly 1: Recalled Batch in Storage</b>
            <p style={{ fontSize: 11, color: '#7F1D1D', marginTop: 2 }}>
              45 units of Amoxicillin 500mg (Batch AMX204) remain physically present. System has quarantined it from dispensing, but supplier dispatch is required.
            </p>
          </div>
          <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', fontSize: 12 }}>
            <b style={{ color: '#EA580C' }}>Anomaly 2: High Velocity on Paracetamol</b>
            <p style={{ fontSize: 11, color: '#7C2D12', marginTop: 2 }}>
              Dispensing velocity increased +18% this month; current buffer of 120 units will reach reorder trigger in 8 days.
            </p>
          </div>
        </div>
      );
    }
    // General Operational Fallback
    else {
      badge = 'SYSTEM METRICS';
      aiText = `Based on your live state with ${inventory.length} tracked medication batches, 100% FEFO enforcement is active. You have ${inventory.filter(m => m.status === 'Low Stock').length} low-stock items and ${audits.length} logged dispensing events. How can I assist further?`;
    }

    const aiMsg: Message = {
      id: `ai-${Date.now()}`,
      from: 'ai',
      badge,
      text: aiText,
      dataCard,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 600, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrainCircuit size={19} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                PharmaFlow Operational AI Assistant
              </span>
              <span className="chip badge-teal" style={{ fontSize: 10, padding: '2px 6px' }}>
                LIVE NLP
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
              Connected to Live Pharmacy State & Audit Trail
            </p>
          </div>
        </div>

        <button onClick={onOpenSimulator} className="btn btn-secondary" style={{ fontSize: 12 }}>
          <SlidersHorizontal size={14} /> Open What-If Simulator
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          backgroundColor: 'var(--bg-alt)',
        }}
      >
        {messages.map(m => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              className="animate-slide-up"
              style={{
                maxWidth: '82%',
                borderRadius: m.from === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                padding: '12px 16px',
                backgroundColor: m.from === 'user' ? 'var(--primary)' : 'var(--surface)',
                color: m.from === 'user' ? '#FFFFFF' : 'var(--text)',
                border: m.from === 'user' ? 'none' : '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {m.badge && (
                <div style={{ fontSize: 9.5, fontWeight: 800, color: m.from === 'user' ? '#CCFBF1' : 'var(--primary)', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {m.badge}
                </div>
              )}
              <p>{m.text}</p>
              {m.dataCard}
              <div
                style={{
                  fontSize: 10.5,
                  color: m.from === 'user' ? '#CCFBF1' : 'var(--text-muted)',
                  textAlign: 'right',
                  marginTop: 6,
                }}
              >
                {m.time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested Prompt Chips */}
      <div style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {sampleQueries.map(q => (
            <button
              key={q}
              onClick={() => handleQuery(q)}
              style={{
                fontSize: 11.5,
                borderRadius: 99,
                border: '1px solid var(--border)',
                padding: '4px 11px',
                backgroundColor: 'var(--bg-alt)',
                color: 'var(--text)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--bg-alt)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <input
          className="input"
          placeholder="Ask a question about your pharmacy inventory, expiry, or dispensing..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleQuery(input);
          }}
          style={{ flex: 1 }}
        />
        <button onClick={() => handleQuery(input)} className="btn btn-teal" style={{ padding: '9px 18px' }}>
          <Send size={15} /> Send
        </button>
      </div>
    </div>
  );
}
