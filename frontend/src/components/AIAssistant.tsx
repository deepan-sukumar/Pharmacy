import React, { useState } from 'react';
import type { Medicine, Audit, SupplierItem } from '../data';
import {
  BrainCircuit, Send, SlidersHorizontal, AlertTriangle,
  Clock3, ShieldAlert, ArrowRight, CheckCircle2, Boxes, CreditCard,
  Truck, Globe, ShieldCheck, RefreshCw, AlertCircle, Info, Check,
  ChevronRight, Sparkles, HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

interface AIAssistantProps {
  inventory: Medicine[];
  audits: Audit[];
  suppliersList: SupplierItem[];
  onOpenSimulator: () => void;
  onNavigatePage: (p: string) => void;
}

export interface StructuredAIItem {
  medicine: string;
  batch?: string;
  stock?: number | string;
  expiry?: string;
  supplier?: string;
  unitCost?: number | string;
  priority?: 'high' | 'medium' | 'low' | 'normal' | string;
  reason?: string;
  action?: string;
}

export interface StructuredAITable {
  headers: string[];
  rows: string[][];
}

export interface StructuredWhatIfDetails {
  medicine: string;
  currentStock: number;
  simulatedOrder: number;
  projectedTotal: number;
  projectedDemand: number;
  projectedSurplus: number;
  potentialWasteCost: number;
  daysUntilStockout: number;
  riskLevel: string;
}

export interface Message {
  id: string;
  from: 'ai' | 'user';
  text: string;
  title?: string;
  summary?: string;
  priority?: 'high' | 'medium' | 'low' | 'normal' | string;
  dataType?: 'actual' | 'simulation';
  items?: StructuredAIItem[];
  table?: StructuredAITable;
  whatIfDetails?: StructuredWhatIfDetails;
  recommendedActions?: string[];
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
    category: 'Procurement',
    icon: Boxes,
    questions: [
      'Which medicines do I need to buy sooner?',
      'Which medicines are currently low in stock?',
      'Which medicines have the highest stock quantity?',
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
    category: 'Simulation',
    icon: SlidersHorizontal,
    questions: [
      'What if I order 300 more units?',
      'Compare +100, +300 and +500.',
      'How will ordering +200 units impact expiry surplus?',
    ]
  },
  {
    category: 'Audit & Safety',
    icon: ShieldCheck,
    questions: [
      'Show unusual dispensing activity.',
      'Show recent dispensing audit activity.',
      'Which customers received the recalled batch?',
      'Are there any recalled batches?',
    ]
  },
  {
    category: 'Suppliers',
    icon: Truck,
    questions: [
      'Which batches should I return?',
      'Which supplier has the highest expiry exposure?',
      'Which supplier has the most pending returns?',
    ]
  }
];

/* ─────────────────────────────────────────────────────────────
   SUBCOMPONENTS: PROFESSIONAL PHARMACY INTELLIGENCE PRESENTATION
   ───────────────────────────────────────────────────────────── */

function PriorityBadge({ priority }: { priority?: string }) {
  const p = (priority || '').toLowerCase();
  if (p.includes('high') || p.includes('critical') || p.includes('danger')) {
    return (
      <span className="chip badge-red" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#DC2626' }} />
        High Priority
      </span>
    );
  }
  if (p.includes('medium') || p.includes('warn') || p.includes('replacement')) {
    return (
      <span className="chip badge-amber" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D97706' }} />
        Medium Priority
      </span>
    );
  }
  if (p.includes('low')) {
    return (
      <span className="chip" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', backgroundColor: 'var(--bg-alt)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
        Low Priority
      </span>
    );
  }
  return (
    <span className="chip badge-green" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <CheckCircle2 size={11} /> Normal / Safe
    </span>
  );
}

function AIDataTable({ table }: { table: StructuredAITable }) {
  if (!table || !table.headers || !table.rows || table.rows.length === 0) return null;

  return (
    <div style={{ marginTop: 12, marginBottom: 12, borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '8px 12px',
                    textAlign: i === 0 ? 'left' : (h.includes('Stock') || h.includes('Qty') || h.includes('Value') || h.includes('Cost') || h.includes('Remaining')) ? 'right' : 'left',
                    color: 'var(--text-3)',
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  borderBottom: rIdx < table.rows.length - 1 ? '1px solid var(--border-light)' : 'none',
                  backgroundColor: rIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                }}
              >
                {row.map((cell, cIdx) => {
                  const header = table.headers[cIdx] || '';
                  const isNumberCol = header.includes('Stock') || header.includes('Qty') || header.includes('Value') || header.includes('Cost') || header.includes('Remaining');
                  const isPriorityCol = header.includes('Priority') || header.includes('Risk') || header.includes('Status');

                  return (
                    <td
                      key={cIdx}
                      style={{
                        padding: '9px 12px',
                        textAlign: cIdx === 0 ? 'left' : isNumberCol ? 'right' : 'left',
                        color: cIdx === 0 ? 'var(--text)' : 'var(--text-2)',
                        fontWeight: cIdx === 0 ? 700 : 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isPriorityCol ? (
                        <PriorityBadge priority={cell} />
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AIItemCards({ items }: { items: StructuredAIItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, marginBottom: 12 }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            backgroundColor: 'var(--bg-alt)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Item Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
                {item.medicine}
              </span>
              {item.batch && (
                <span className="chip" style={{ fontSize: 10, padding: '1px 6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                  {item.batch}
                </span>
              )}
            </div>
            {item.priority && <PriorityBadge priority={item.priority} />}
          </div>

          {/* Key Facts Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>
            {item.stock !== undefined && (
              <div>
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Stock: </span>
                <b>{item.stock} {typeof item.stock === 'number' ? 'units' : ''}</b>
              </div>
            )}
            {item.expiry && (
              <div>
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Expiry: </span>
                <b>{item.expiry}</b>
              </div>
            )}
            {item.supplier && (
              <div>
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Supplier: </span>
                <span>{item.supplier}</span>
              </div>
            )}
            {item.unitCost !== undefined && Number(item.unitCost) > 0 && (
              <div>
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Unit Cost: </span>
                <span>₹{item.unitCost}</span>
              </div>
            )}
          </div>

          {/* Reason / Context */}
          {item.reason && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', borderLeft: '2px solid var(--border)', paddingLeft: 8, marginTop: 2 }}>
              <span style={{ fontWeight: 600 }}>Reason: </span>
              {item.reason}
            </div>
          )}

          {/* Recommended Action */}
          {item.action && (
            <div style={{ fontSize: 11.5, color: 'var(--primary-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <ArrowRight size={12} color="var(--primary)" />
              <span>Recommended Action: {item.action}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AIWhatIfCard({ details }: { details: StructuredWhatIfDetails }) {
  if (!details) return null;

  return (
    <div style={{ marginTop: 12, marginBottom: 12, borderRadius: 10, border: '1.5px solid #3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.03)', padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={14} /> What-If Simulation Scenario
        </span>
        <span className="chip" style={{ fontSize: 9.5, fontWeight: 800, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
          SIMULATED DATA
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: 8, backgroundColor: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Current Stock</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{details.currentStock} units</div>
        </div>

        <div style={{ padding: 8, backgroundColor: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 700, textTransform: 'uppercase' }}>Simulated Order</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#2563EB', marginTop: 2 }}>+{details.simulatedOrder} units</div>
        </div>

        <div style={{ padding: 8, backgroundColor: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Projected Demand</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{details.projectedDemand} units</div>
        </div>

        <div style={{ padding: 8, backgroundColor: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: details.projectedSurplus > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700, textTransform: 'uppercase' }}>
            Surplus at Expiry
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: details.projectedSurplus > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 2 }}>
            {details.projectedSurplus} units
          </div>
        </div>
      </div>

      {details.potentialWasteCost > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 700, marginBottom: 6 }}>
          ⚠️ Projected Expiry Waste: ₹{details.potentialWasteCost.toLocaleString('en-IN')}
        </div>
      )}
    </div>
  );
}

function RecommendedActionsList({ actions }: { actions?: string[] }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle2 size={13} color="var(--primary)" /> Recommended Action
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {actions.map((act, idx) => (
          <div key={idx} style={{ fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.45 }}>
            <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: 16 }}>{idx + 1}.</span>
            <span>{act}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormattedMarkdown({ text }: { text: string }) {
  if (!text) return null;

  // Split lines into structured markdown blocks
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rawRows = tableBuffer.filter(l => l.includes('|') && !l.includes('---'));
    if (rawRows.length > 0) {
      const headers = rawRows[0].split('|').map(s => s.trim()).filter(Boolean);
      const rows = rawRows.slice(1).map(r => r.split('|').map(s => s.trim()).filter(Boolean));
      elements.push(<AIDataTable key={`table-${elements.length}`} table={{ headers, rows }} />);
    }
    tableBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} style={{ margin: '6px 0 10px 18px', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {listBuffer.map((item, idx) => (
          <li key={idx} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      tableBuffer.push(trimmed);
      return;
    }

    if (tableBuffer.length > 0) flushTable();

    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^\d+\.\s+/, ''));
      return;
    }

    if (listBuffer.length > 0) flushList();

    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const heading = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4 key={idx} style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {parseInlineMarkdown(heading)}
        </h4>
      );
      return;
    }

    if (trimmed.length > 0) {
      elements.push(
        <p key={idx} style={{ margin: '4px 0', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55 }}>
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  flushTable();
  flushList();

  return <div style={{ display: 'flex', flexDirection: 'column' }}>{elements}</div>;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  // Replaces **bold** and `code` with styled span elements
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 800, color: 'var(--text)' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{ backgroundColor: 'var(--bg-alt)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', border: '1px solid var(--border)' }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/* ─────────────────────────────────────────────────────────────
   MAIN AIAssistant COMPONENT
   ───────────────────────────────────────────────────────────── */

export default function AIAssistant({
  inventory,
  audits,
  suppliersList,
  onOpenSimulator,
  onNavigatePage,
}: AIAssistantProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [activeCategory, setActiveCategory] = useState('Procurement');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init',
      from: 'ai',
      badge: 'PHARMACY INTELLIGENCE',
      title: 'OPERATIONAL DECISION COPILOT',
      summary: 'Connected directly to live inventory, batch tracking, expiry runways, supplier returns, and dispensing audit trails.',
      priority: 'normal',
      dataType: 'actual',
      text: 'Good day. I am your operational Pharmacy Intelligence Assistant. Ask me anything about stock reorders, near-expiry batches, supplier return eligibility, or dispensing audits.',
      recommendedActions: [
        'Ask: "Which medicines do I need to buy sooner?" for procurement recommendations.',
        'Ask: "Which medicines expire within 30 days?" for expiry exposure tracking.',
        'Use What-If Simulator to model prospective purchase batch orders.'
      ],
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
        title: res.title,
        summary: res.summary,
        priority: res.priority || (res.isRefusal ? 'high' : 'normal'),
        dataType: res.dataType || 'actual',
        items: res.items,
        table: res.table,
        whatIfDetails: res.whatIfDetails,
        recommendedActions: res.recommendedActions,
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
        title: 'EXECUTION ERROR',
        summary: 'Could not complete query against pharmacy backend.',
        priority: 'high',
        text: `Could not complete query: ${err.message || 'Please verify network and backend connection.'}`,
        sourceTransparency: 'Execution error',
        recommendedActions: ['Ensure backend server is running.', 'Verify network connectivity.'],
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
        badge: 'PHARMACY INTELLIGENCE',
        title: 'OPERATIONAL DECISION COPILOT',
        summary: 'Connected directly to live inventory, batch tracking, expiry runways, supplier returns, and dispensing audit trails.',
        priority: 'normal',
        dataType: 'actual',
        text: 'Conversation history reset. Ready for new pharmacy operational queries.',
        recommendedActions: [
          'Select categorized prompt chips below for instant analytics.',
          'Model prospective orders with the What-If Simulator.'
        ],
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
                Gemini 3.5 Flash Synced
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0 0' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
              Live Firestore Controlled Tools & Audit Trail Active
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
            {m.from === 'user' ? (
              <div
                className="animate-slide-up"
                style={{
                  maxWidth: '75%',
                  borderRadius: '16px 16px 2px 16px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}
              >
                {m.text}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 }}>
                  {m.time}
                </div>
              </div>
            ) : (
              /* AI Response Container */
              <div
                className="animate-slide-up"
                style={{
                  maxWidth: '85%',
                  width: '100%',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  backgroundColor: m.isRefusal ? 'var(--warning-light)' : m.isEmergency ? 'var(--danger-light)' : 'var(--surface)',
                  color: 'var(--text)',
                  border: m.isRefusal ? '1.5px solid var(--warning-border)' : m.isEmergency ? '1.5px solid var(--danger-border)' : '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: 13,
                }}
              >
                {/* AI Header: Category Badge & Data Source */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        color: m.isRefusal ? 'var(--warning-dark)' : m.isEmergency ? 'var(--danger)' : 'var(--primary)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {m.badge || 'PHARMACY INTELLIGENCE'}
                    </span>
                    {m.priority && !m.isRefusal && <PriorityBadge priority={m.priority} />}
                  </div>

                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      backgroundColor: m.dataType === 'simulation' ? '#EFF6FF' : 'var(--bg-alt)',
                      color: m.dataType === 'simulation' ? '#1D4ED8' : 'var(--text-3)',
                      border: `1px solid ${m.dataType === 'simulation' ? '#BFDBFE' : 'var(--border)'}`,
                      padding: '2px 7px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.dataType === 'simulation' ? 'SIMULATED DATA' : 'ACTUAL DATA'}
                  </span>
                </div>

                {/* Title & Summary First */}
                {m.title && (
                  <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {m.title}
                  </h3>
                )}

                {m.summary && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.priority === 'high' ? 'var(--danger)' : 'var(--text-2)', marginBottom: 8 }}>
                    {m.summary}
                  </div>
                )}

                {/* Clinical Safety Refusal Special View */}
                {m.isRefusal && (
                  <div style={{ padding: '12px 14px', borderRadius: 8, backgroundColor: 'rgba(217, 119, 6, 0.08)', border: '1px solid var(--warning-border)', margin: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning-dark)', fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                      <AlertTriangle size={15} /> Clinical Decision Restriction
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                      {m.text}
                    </p>
                  </div>
                )}

                {/* What-If Simulation Grid */}
                {m.whatIfDetails && <AIWhatIfCard details={m.whatIfDetails} />}

                {/* Structured Data Table */}
                {m.table && <AIDataTable table={m.table} />}

                {/* Structured Item Cards */}
                {m.items && !m.table && <AIItemCards items={m.items} />}

                {/* Formatted Markdown Fallback if free-form or no structured table/items */}
                {!m.table && !m.items && !m.whatIfDetails && !m.isRefusal && (
                  <FormattedMarkdown text={m.text} />
                )}

                {/* Recommended Actions Callout */}
                {m.recommendedActions && m.recommendedActions.length > 0 && (
                  <RecommendedActionsList actions={m.recommendedActions} />
                )}

                {/* Source Transparency & Timestamp Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    fontSize: 10.5,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} color="var(--success)" />
                    {m.sourceTransparency || 'Based on current pharmacy inventory and dispensing records.'}
                  </span>
                  <span>{m.time}</span>
                </div>
              </div>
            )}
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
          placeholder="Ask anything about pharmacy operations (e.g. reorders, near-expiry stock, supplier returns, audit velocity)..."
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
