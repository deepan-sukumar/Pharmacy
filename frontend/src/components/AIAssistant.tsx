import React, { useState } from 'react';
import type { Medicine, Audit, SupplierItem } from '../data';
import {
  BrainCircuit, Send, Sparkles, SlidersHorizontal, AlertTriangle,
  Clock3, ShieldAlert, ArrowRight, CheckCircle2, Boxes, CreditCard,
  Truck, Search, Info, Globe, ShieldCheck, RefreshCw, MessageSquare
} from 'lucide-react';
import { api } from '../services/api';

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
  sourceTransparency?: string;
  isRefusal?: boolean;
  isEmergency?: boolean;
  time: string;
}

const LANGUAGES = [
  { id: 'English', label: 'English', native: 'English' },
  { id: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { id: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { id: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
];

const QUESTION_CATEGORIES = [
  {
    category: 'Inventory',
    icon: Boxes,
    questions: [
      'Which medicines are currently low in stock?',
      'Which medicines have the highest stock quantity?',
      'Which medicines have multiple batches?',
      'Show medicines with high stock but low dispensing.',
    ]
  },
  {
    category: 'Expiry',
    icon: Clock3,
    questions: [
      'Which medicines expire within 30 days?',
      'Which medicines expire within 60 days?',
      'Which batches have the highest expiry risk?',
      'How much stock is at risk of expiry?',
      'Which batches should I review first?',
    ]
  },
  {
    category: 'Dispensing',
    icon: CreditCard,
    questions: [
      'How many medicines were dispensed this week?',
      'Which medicines were dispensed most this month?',
      'Show recent dispensing activity.',
      'Compare this month dispensing with last month.',
    ]
  },
  {
    category: 'Audit',
    icon: ShieldCheck,
    questions: [
      'Show recent dispensing audit activity.',
      'Are there potentially unusual dispensing patterns?',
      'Which batch has the highest dispensing volume?',
      'Which pharmacist has the highest dispensing count?',
    ]
  },
  {
    category: 'Suppliers',
    icon: Truck,
    questions: [
      'Which batches are eligible for supplier return?',
      'Which supplier has the most near-expiry stock?',
      'Which supplier has the most pending returns?',
    ]
  },
  {
    category: 'Recalls',
    icon: ShieldAlert,
    questions: [
      'Are there any recalled batches?',
      'Which recalled batches are currently blocked?',
      'Which customers received this recalled batch?',
      'Show the latest recall activity.',
    ]
  }
];

export default function AIAssistant({
  inventory,
  audits,
  suppliersList,
  onOpenSimulator,
  onNavigatePage,
}: AIAssistantProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [activeCategory, setActiveCategory] = useState('Inventory');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init',
      from: 'ai',
      badge: 'GEMINI 3.5 FLASH • PHARMACY INTELLIGENCE',
      text: 'Good day. I am your operational Pharmacy Intelligence Assistant powered by Gemini 3.5 Flash. I am connected directly to your live inventory, batch tracking, expiry timelines, supplier return windows, and dispensing audit trails.\n\nAsk me anything about your pharmacy operations or select from the categorized suggestions below.',
      sourceTransparency: 'Connected to live Firestore workspace state.',
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      from: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history payload
      const historyPayload = messages.slice(-4).map(m => ({
        role: m.from === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await api.askAI(q, selectedLanguage, historyPayload);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        from: 'ai',
        badge: res.isRefusal ? 'CLINICAL SAFETY RESTRICTION' : res.badge || 'OPERATIONAL INTELLIGENCE',
        text: res.answer || res.text || 'Operational analysis completed.',
        sourceTransparency: res.sourceTransparency || (res.isRefusal ? 'Clinical safety restriction enforced.' : 'Based on current pharmacy inventory and dispensing records.'),
        isRefusal: res.isRefusal || false,
        isEmergency: res.isEmergency || false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        from: 'ai',
        badge: 'QUERY ERROR',
        text: `⚠️ Could not complete query: ${err.message || 'Please verify network and backend connection.'}`,
        sourceTransparency: 'Execution error',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'm-init',
        from: 'ai',
        badge: 'GEMINI 3.5 FLASH • PHARMACY INTELLIGENCE',
        text: 'Conversation history reset. Ready for new pharmacy operational queries.',
        sourceTransparency: 'Connected to live Firestore workspace state.',
        time: 'Just now',
      }
    ]);
  };

  const currentCategoryData = QUESTION_CATEGORIES.find(c => c.category === activeCategory) || QUESTION_CATEGORIES[0];

  return (
    <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: 620, padding: 0, overflow: 'hidden' }}>
      {/* Header with Language Selector & Actions */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrainCircuit size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                PharmaFlow Operational AI Assistant
              </span>
              <span className="chip badge-teal" style={{ fontSize: 10, padding: '2px 8px' }}>
                Gemini 3.5 Flash
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0 0' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
              Live Controlled Tools & Audit Trail Synced
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-alt)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <Globe size={14} color="var(--primary)" />
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id} style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
                  {l.label} ({l.native})
                </option>
              ))}
            </select>
          </div>

          <button onClick={onOpenSimulator} className="btn btn-secondary" style={{ fontSize: 12 }}>
            <SlidersHorizontal size={14} /> What-If Simulator
          </button>

          <button onClick={handleClearHistory} className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 10px' }} title="Clear conversation">
            <RefreshCw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Categorized Suggested Questions Chips */}
      <div style={{ padding: '10px 18px', backgroundColor: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
          {QUESTION_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontWeight: 700,
                  border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-2)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={13} />
                {cat.category}
              </button>
            );
          })}
        </div>

        {/* Category Specific Prompts */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 6 }}>
          {currentCategoryData.questions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 99,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = 'var(--primary-light)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.backgroundColor = 'var(--surface)';
              }}
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          backgroundColor: 'var(--bg)',
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
                maxWidth: m.from === 'user' ? '75%' : '85%',
                borderRadius: m.from === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                padding: '14px 18px',
                backgroundColor: m.from === 'user'
                  ? 'var(--primary)'
                  : m.isRefusal
                  ? 'var(--warning-light)'
                  : m.isEmergency
                  ? 'var(--danger-light)'
                  : 'var(--surface)',
                color: m.from === 'user' ? '#FFFFFF' : 'var(--text)',
                border: m.from === 'user'
                  ? 'none'
                  : m.isRefusal
                  ? '1.5px solid var(--warning-border)'
                  : m.isEmergency
                  ? '1.5px solid var(--danger-border)'
                  : '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {/* Header Badge */}
              {m.badge && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    borderBottom: `1px solid ${m.from === 'user' ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                    paddingBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      color: m.from === 'user'
                        ? '#E0F2FE'
                        : m.isRefusal
                        ? 'var(--warning-dark)'
                        : m.isEmergency
                        ? 'var(--danger)'
                        : 'var(--primary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.badge}
                  </span>
                  {m.from === 'ai' && !m.isRefusal && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        backgroundColor: 'var(--bg-alt)',
                        color: 'var(--text-3)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      ACTUAL DATA
                    </span>
                  )}
                </div>
              )}

              {/* Message Content formatted */}
              <div style={{ whiteSpace: 'pre-line', color: m.from === 'user' ? '#FFFFFF' : 'var(--text)' }}>
                {m.text}
              </div>

              {/* Source Transparency & Timestamp */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: `1px solid ${m.from === 'user' ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`,
                  fontSize: 10.5,
                  color: m.from === 'user' ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                }}
              >
                <span>{m.sourceTransparency || 'Live operational verified data'}</span>
                <span>{m.time}</span>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              className="card animate-pulse"
              style={{
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 2px',
                backgroundColor: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                color: 'var(--primary)',
                fontWeight: 700,
              }}
            >
              <RefreshCw size={14} className="animate-spin" />
              Gemini 3.5 Flash querying controlled pharmacy records...
            </div>
          </div>
        )}
      </div>

      {/* Free-form Input Bar */}
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 10,
        }}
      >
        <input
          className="input"
          placeholder="Ask anything about your pharmacy operations (e.g. expiry, supplier returns, dispensing volume)..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend();
          }}
          disabled={loading}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button
          onClick={() => handleSend()}
          className="btn btn-teal"
          disabled={loading || !input.trim()}
          style={{ padding: '9px 20px', minWidth: 100, justifyContent: 'center' }}
        >
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </div>
    </div>
  );
}
