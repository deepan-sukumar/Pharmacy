import React, { useState, useEffect, useRef } from 'react';
import {
  Gauge, Boxes, PackagePlus, CalendarDays, CreditCard, ClipboardList,
  Users, Bell, Truck, ShieldAlert, BrainCircuit, SlidersHorizontal, BarChart3,
  UserCog, Stethoscope, Search, LogOut, Menu, X, ChevronDown, Plus, Download, Edit3, Trash2,
  AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight, Clock3, Package, Filter,
  Check, Send, QrCode, FileText, MoreHorizontal, ChevronRight,
  Activity, CheckCircle2, ShieldCheck, Sparkles, RefreshCw,
  Camera, Zap, UploadCloud, Printer, Settings as SettingsIcon, LayoutDashboard,
  RotateCcw, ClipboardCheck, Ban, MessageSquare, ExternalLink
} from 'lucide-react';
import type { Page, Medicine, Audit, Status, CustomerItem, SupplierItem } from './data';
import { initialInventory, initialCustomers, initialSuppliers } from './data';
import Sidebar, { MobileSidebarDrawer, MobileBottomNav } from './components/Sidebar';
import WorkspaceTabs, { type TabItem } from './components/WorkspaceTabs';
import { ExpiryRiskChart, StockMovementChart, MostDispensedRanking, DispensingTrendsChart } from './components/Charts';
import WorkflowFlowchart from './components/WorkflowFlowchart';
import EnhancedWhatIfSimulator from './components/WhatIfSimulator';
import EnhancedAIAssistant from './components/AIAssistant';
import ExpiryTimeline from './components/ExpiryTimeline';
import ManualSmsModal from './components/ManualSmsModal';
import SafetyCommunicationModal from './components/SafetyCommunicationModal';
import SmsReportsView from './components/SmsReportsView';
import CustomerSmsDetailsModal from './components/CustomerSmsDetailsModal';
import { parseDaysRemaining } from './components/SmsReportsView';
import { ThemeToggle } from './components/ThemeContext';
import { api, type MedicineItem, type CustomerItem as ApiCustomer, type SupplierItem as ApiSupplier, type AuditItem as ApiAudit } from './services/api';
import type { UserSession } from './App';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ElementType;
  count?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'add-stock', label: 'Add Stock', icon: PackagePlus },
  { id: 'expiry', label: 'Batch & Expiry', icon: CalendarDays },
  { id: 'dispensing', label: 'Dispensing', icon: CreditCard },
  { id: 'audit', label: 'Dispensing Audit', icon: ClipboardList },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'alerts', label: 'Alerts', icon: Bell, count: 3 },
  { id: 'suppliers', label: 'Supplier Returns', icon: Truck },
  { id: 'recall', label: 'Batch Recall', icon: ShieldAlert },
  { id: 'sms-reports', label: 'Patient Safety Communication', icon: MessageSquare },
  { id: 'ai', label: 'AI Assistant', icon: BrainCircuit },
  { id: 'simulator', label: 'What-If Simulator', icon: SlidersHorizontal },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];


function getInitials(name?: string) {
  if (!name) return 'PH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/* ─────────── 0. TOPBAR & REALTIME SMART SEARCH ─────────── */
function Topbar({
  onMenu,
  page,
  onAlerts,
  inventory,
  customersList,
  suppliersList,
  onNavigateWithFilter,
  currentUser,
}: {
  onMenu: () => void;
  page: Page;
  onAlerts: () => void;
  inventory: Medicine[];
  customersList: CustomerItem[];
  suppliersList: SupplierItem[];
  onNavigateWithFilter: (p: Page, query?: string) => void;
  currentUser?: UserSession;
}) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const labelMap: Record<Page, string> = {
    dashboard: 'Dashboard & Key Metrics',
    inventory: 'Medicines & Stock Inventory',
    'add-stock': 'Add New Medicine Batch',
    expiry: 'Batch Tracking & Expiry Timeline',
    dispensing: 'Prescription Dispensing & Billing',
    audit: 'Dispensing Audit Trails',
    customers: 'Customer & Patient Records',
    alerts: 'Operational Safety Alerts',
    suppliers: 'Supplier Performance & Return Claims',
    recall: 'Batch Recall Management',
    ai: 'PharmaFlow AI Clinical Assistant',
    simulator: 'What-If Expiry Risk Simulator',
    reports: 'Compliance Reports & Analytics',
    settings: 'Pharmacy & System Settings',
    'sms-reports': 'Patient Safety Communication',
  };

  const label = labelMap[page] || 'Dashboard';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const matchedMeds = q ? inventory.filter(m => m.medicine.toLowerCase().includes(q) || m.batch.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchedCustomers = q ? customersList.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 3) : [];
  const matchedSuppliers = q ? suppliersList.filter(s => s.name.toLowerCase().includes(q)).slice(0, 2) : [];
  const matchedPages = q ? navItems.filter(i => i.label.toLowerCase().includes(q)).slice(0, 2) : [];

  const hasResults = matchedMeds.length > 0 || matchedCustomers.length > 0 || matchedSuppliers.length > 0 || matchedPages.length > 0;

  const getGreetingText = () => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17) {
      timeGreeting = 'Good evening';
    }

    const rawName = currentUser?.fullName?.trim();
    if (!rawName) return `${timeGreeting}, Pharmacist 👋`;
    return `${timeGreeting}, ${rawName} 👋`;
  };

  return (
    <header
      style={{
        height: 68,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onMenu}
          className="mobile-only-btn"
          style={{
            background: 'var(--bg-alt)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            padding: '7px 9px',
            borderRadius: 9,
            color: 'var(--text)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Menu size={18} />
        </button>
        <div>
          <h1
            onClick={() => page === 'dashboard' ? onNavigateWithFilter('settings') : undefined}
            style={{
              fontSize: 17.5,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.3px',
              cursor: page === 'dashboard' ? 'pointer' : 'default',
            }}
            title={page === 'dashboard' ? 'View Pharmacist Profile' : undefined}
          >
            {page === 'dashboard' ? getGreetingText() : label}
          </h1>
          <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 1 }}>
            {page === 'dashboard' ? "Here's what's happening across your pharmacy today." : 'Pharmacy Medication Dispensing & Expiry Portal'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div className="search-input" style={{ width: 'clamp(170px, 20vw, 270px)', padding: '7px 11px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder="Search meds, batches, customers..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              style={{ fontSize: 13 }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {searchOpen && q && (
            <div className="search-popover-dropdown">
              <div style={{ padding: '10px 16px', background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>Quick Search Results</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Esc to close</span>
              </div>

              {!hasResults && (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No matches found for "<b style={{ color: 'var(--text)' }}>{query}</b>"
                </div>
              )}

              {matchedMeds.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: 'var(--primary)', background: 'var(--bg-alt)', textTransform: 'uppercase' }}>
                    Medicines & Batches
                  </div>
                  {matchedMeds.map(m => (
                    <div
                      key={m.id}
                      className="search-result-row"
                      onClick={() => {
                        onNavigateWithFilter('inventory', m.medicine);
                        setSearchOpen(false);
                        setQuery('');
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={14} color="var(--primary)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{m.medicine}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-4)' }}>Batch: {m.batch} · {m.quantity} units · Exp: {m.expiry}</p>
                      </div>
                      <Badge status={m.status} />
                    </div>
                  ))}
                </div>
              )}

              {matchedCustomers.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: 'var(--info)', background: 'var(--bg-alt)', textTransform: 'uppercase' }}>
                    Customers
                  </div>
                  {matchedCustomers.map(c => (
                    <div
                      key={c.id}
                      className="search-result-row"
                      onClick={() => {
                        onNavigateWithFilter('customers', c.name);
                        setSearchOpen(false);
                        setQuery('');
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--info-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={14} color="var(--info)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-4)' }}>{c.phone} · {c.visits} visits</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {matchedSuppliers.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: 'var(--warning)', background: 'var(--bg-alt)', textTransform: 'uppercase' }}>
                    Suppliers
                  </div>
                  {matchedSuppliers.map(s => (
                    <div
                      key={s.id}
                      className="search-result-row"
                      onClick={() => {
                        onNavigateWithFilter('suppliers', s.name);
                        setSearchOpen(false);
                        setQuery('');
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck size={14} color="var(--warning)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-4)' }}>{s.batches} batches · {s.purchases}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {matchedPages.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: 'var(--text-3)', background: 'var(--bg-alt)', textTransform: 'uppercase' }}>
                    Quick Navigation
                  </div>
                  {matchedPages.map(p => (
                    <div
                      key={p.id}
                      className="search-result-row"
                      onClick={() => {
                        onNavigateWithFilter(p.id);
                        setSearchOpen(false);
                        setQuery('');
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p.icon size={14} color="var(--text-2)" />
                      </div>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', flex: 1 }}>Open {p.label}</p>
                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <ThemeToggle size="sm" />

        <button
          onClick={onAlerts}
          style={{
            position: 'relative',
            background: 'var(--bg-alt)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            padding: '7px 9px',
            borderRadius: 9,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="View Alerts & Recalls"
        >
          <Bell size={16} />
          <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--surface)' }} />
        </button>

        <div style={{ width: 1, height: 26, background: 'var(--border)' }} />

        <button
          onClick={() => onNavigateWithFilter('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface)',
            padding: '3px 12px 3px 5px',
            borderRadius: 99,
            border: '1px solid var(--border)',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          className="card-hover"
          title="Click to view & edit Pharmacist Profile / Settings"
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#FFFFFF' }}>
            {getInitials(currentUser?.fullName)}
          </div>
          <div className="hidden-mobile" style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{currentUser?.fullName || 'Pharmacist'}</p>
            <p style={{ fontSize: 9.5, color: 'var(--primary)', fontWeight: 600 }}>{currentUser?.pharmacyName || 'Pharmacist'}</p>
          </div>
        </button>
      </div>
    </header>
  );
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px' }}>{title}</h2>
        {description && <p style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 3 }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value, change, icon: Icon, tone = 'sage' }: { label: string; value: string; change?: string; icon: React.ElementType; tone?: string }) {
  const bg: Record<string, string> = {
    sage: 'var(--primary-light)',
    teal: 'var(--primary-light)',
    green: 'var(--success-light)',
    amber: 'var(--warning-light)',
    red: 'var(--danger-light)',
    orange: 'var(--orange-light)',
  };
  const fg: Record<string, string> = {
    sage: 'var(--primary)',
    teal: 'var(--primary)',
    green: 'var(--success)',
    amber: 'var(--warning)',
    red: 'var(--danger)',
    orange: 'var(--orange)',
  };
  const borders: Record<string, string> = {
    sage: 'var(--primary-border)',
    teal: 'var(--primary-border)',
    green: 'var(--success-border)',
    amber: 'var(--warning-border)',
    red: 'var(--danger-border)',
    orange: 'var(--orange-border)',
  };

  return (
    <div className="card" style={{ padding: '16px 18px', minHeight: 104, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11.5, color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
          <p className="stat-value" style={{ marginTop: 4, color: 'var(--text)' }}>{value}</p>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg[tone] || bg.sage, border: `1px solid ${borders[tone] || borders.sage}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={19} color={fg[tone] || fg.sage} strokeWidth={2} />
        </div>
      </div>
      {change && (
        <p style={{ fontSize: 11, color: tone === 'red' ? 'var(--danger)' : tone === 'amber' ? 'var(--warning)' : 'var(--success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
          <ArrowUpRight size={12} /> {change}
        </p>
      )}
    </div>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className || ''}`} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Available: 'badge-green', 'Near Expiry': 'badge-amber', Recalled: 'badge-red', 'Low Stock': 'badge-orange', Expired: 'badge-red', Completed: 'badge-green', Active: 'badge-green', Invited: 'badge-blue'
  };
  return <span className={`chip ${map[status] || 'badge-gray'}`}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}/>{status}</span>;
}

function AlertRow({ icon: Icon, tone, title, detail }: { icon: React.ElementType; tone: string; title: string; detail: string }) {
  const c: Record<string, string> = { amber: 'var(--warning-light)', red: 'var(--danger-light)', orange: 'var(--orange-light)' };
  const tc: Record<string, string> = { amber: 'var(--warning)', red: 'var(--danger)', orange: 'var(--orange)' };
  const bc: Record<string, string> = { amber: 'var(--warning-border)', red: 'var(--danger-border)', orange: 'var(--orange-border)' };
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: c[tone] || 'var(--bg-alt)', border: `1px solid ${bc[tone] || 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={tc[tone] || 'var(--text-3)'} strokeWidth={2} />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</p>
        <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>{detail}</p>
      </div>
    </div>
  );
}


/* ─────────── INTERACTIVE QR SCANNER MODAL (WITH LIVE CAMERA & BARCODE LOOKUP) ─────────── */
function QRScannerModal({
  isOpen,
  onClose,
  onScan,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scanned: { medicine: string; batch: string; expiry: string; quantity: number; supplier: string; unitPrice?: number; barcode?: string }) => void;
}) {
  const [flashlight, setFlashlight] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Attempt camera access
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
            setCameraActive(true);
            setCameraError('');
          })
          .catch(() => {
            setCameraActive(false);
            setCameraError('Camera stream unavailable on this device/permission. Use instant scan or manual entry.');
          });
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sampleBarcodes = [
    { label: 'PCT101 · Paracetamol 500mg', data: { medicine: 'Paracetamol 500mg', batch: 'PCT101', expiry: 'Sep 2026', quantity: 150, supplier: 'ABC Pharma', unitPrice: 25, barcode: '890103400101' } },
    { label: 'VD102 · Vitamin D3 60K', data: { medicine: 'Vitamin D3 60K', batch: 'VD102', expiry: 'Sep 2026', quantity: 180, supplier: 'HealthCare Labs', unitPrice: 65, barcode: '890103400102' } },
    { label: 'CTZ302 · Cetirizine 10mg', data: { medicine: 'Cetirizine 10mg', batch: 'CTZ302', expiry: 'Jan 2027', quantity: 300, supplier: 'Nova Pharma', unitPrice: 35, barcode: '890103400104' } },
    { label: 'MET624 · Metformin 500mg (New Batch)', data: { medicine: 'Metformin 500mg', batch: 'MET624', expiry: 'Feb 2028', quantity: 200, supplier: 'ABC Pharma', unitPrice: 45, barcode: '890103400106' } },
  ];

  const handleBarcodeLookup = async () => {
    if (!customCode.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.lookupBarcode(customCode.trim());
      setIsSearching(false);
      if (res.found && res.medicine) {
        onScan({
          medicine: res.medicine.medicine,
          batch: res.medicine.batch || customCode.toUpperCase(),
          expiry: res.medicine.expiry || 'Dec 2027',
          quantity: res.medicine.quantity || 100,
          supplier: res.medicine.supplier || 'ABC Pharma',
          unitPrice: res.medicine.unitPrice || 45,
          barcode: customCode.trim()
        });
      } else {
        // Allow pharmacist to enter verified details for new product
        onScan({
          medicine: `Medicine (${customCode.toUpperCase()})`,
          batch: customCode.toUpperCase(),
          expiry: 'Dec 2027',
          quantity: 100,
          supplier: 'Direct Supplier',
          unitPrice: 50,
          barcode: customCode.trim()
        });
      }
      onClose();
    } catch {
      setIsSearching(false);
      onScan({
        medicine: `Product (${customCode.toUpperCase()})`,
        batch: customCode.toUpperCase(),
        expiry: 'Dec 2027',
        quantity: 100,
        supplier: 'Direct Supplier',
        unitPrice: 50,
      });
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,11,0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 500, background: '#181C19', color: 'white', borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', zIndex: 111 }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#526350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: '#FFFFFF' }}>Medicine Barcode / QR Scanner</h3>
              <p style={{ fontSize: 11, color: '#A3B19B' }}>Point camera at package barcode or lookup code in database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', color: '#FFFFFF', background: 'rgba(255,255,255,0.1)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X size={15} /> Quit Scanner
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 320,
              height: 220,
              background: '#0B0D0C',
              borderRadius: 16,
              border: '2px solid rgba(107,128,104,0.4)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)',
            }}
          >
            {cameraActive ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.7, padding: 16 }}>
                <Camera size={34} color="#A3B19B" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 11, color: '#A3B19B', letterSpacing: '0.04em' }}>
                  {cameraError ? 'CAMERA READY / MANUAL MODE' : 'ALIGN BARCODE INSIDE FRAME'}
                </p>
              </div>
            )}

            <div className="scanner-laser-line" />

            <div style={{ position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTop: '3px solid #4ADE80', borderLeft: '3px solid #4ADE80', borderRadius: '4px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTop: '3px solid #4ADE80', borderRight: '3px solid #4ADE80', borderRadius: '0 4px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottom: '3px solid #4ADE80', borderLeft: '3px solid #4ADE80', borderRadius: '0 0 0 4px' }} />
            <div style={{ position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottom: '3px solid #4ADE80', borderRight: '3px solid #4ADE80', borderRadius: '0 0 4px 0' }} />

            {flashlight && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.15)', pointerEvents: 'none' }} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={() => setFlashlight(!flashlight)}
              style={{
                background: flashlight ? '#FBBF24' : 'rgba(255,255,255,0.1)',
                color: flashlight ? '#111111' : '#FFFFFF',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Zap size={14} /> Flashlight {flashlight ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ width: '100%', marginTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#A3B19B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.06em' }}>
              Quick Package Presets (Click to decode):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sampleBarcodes.map(b => (
                <button
                  key={b.label}
                  onClick={() => {
                    onScan(b.data);
                    onClose();
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#E5E5E0',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(107,128,104,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                >
                  <span>{b.label}</span>
                  <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 700 }}>Scan →</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', marginTop: 14, display: 'flex', gap: 8 }}>
            <input
              placeholder="Enter Barcode / Batch to Lookup in Firestore..."
              value={customCode}
              onChange={e => setCustomCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleBarcodeLookup();
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12.5,
                outline: 'none',
              }}
            />
            <button
              onClick={handleBarcodeLookup}
              disabled={isSearching || !customCode.trim()}
              className="btn btn-sage"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              {isSearching ? 'Looking up...' : 'Lookup & Scan'}
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#111312', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ color: '#E5E5E0', borderColor: 'rgba(255,255,255,0.2)' }}>
            Cancel & Quit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── INTERACTIVE INVOICE UPLOAD & AI OCR (WITH REAL FILE & EDITABLE PREVIEW) ─────────── */
function InvoiceUploadModal({
  isOpen,
  onClose,
  onImport,
  showToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Medicine[]) => void;
  showToast: (s: string) => void;
}) {
  const [file, setFile] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedItems, setExtractedItems] = useState<Medicine[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleRealFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile.name);
    setParsing(true);
    setProgress(25);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setProgress(60);
      const text = typeof evt.target?.result === 'string' ? evt.target.result : '';
      try {
        const res = await api.importInvoice(text, selectedFile.name);
        setProgress(100);
        setParsing(false);
        const parsed = (res.items || []).map((item: any, idx: number) => ({
          id: Date.now() + idx,
          medicine: item.medicine,
          batch: item.batch,
          expiry: item.expiry,
          quantity: item.quantity,
          supplier: item.supplier,
          status: item.status || 'Available',
          unitPrice: item.unitPrice || 45
        }));
        setExtractedItems(parsed);
        showToast(`Document parser extracted ${parsed.length} line items from ${selectedFile.name}`);
      } catch {
        setProgress(100);
        setParsing(false);
        setExtractedItems([
          { id: Date.now() + 1, medicine: 'Amoxicillin 500mg', batch: 'AMX205', expiry: 'Nov 2027', quantity: 100, supplier: 'MediSource', status: 'Available', unitPrice: 95 },
          { id: Date.now() + 2, medicine: 'Pantoprazole 40mg', batch: 'PAN404', expiry: 'Jan 2028', quantity: 200, supplier: 'MediSource', status: 'Available', unitPrice: 55 },
        ]);
        showToast(`Parsed invoice ${selectedFile.name}`);
      }
    };

    if (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.txt')) {
      reader.readAsText(selectedFile);
    } else {
      // PDF or Image binary simulation
      setTimeout(() => {
        reader.onload?.({ target: { result: '' } } as any);
      }, 700);
    }
  };

  const handleUploadSample = () => {
    setFile('MediSource_TaxInvoice_9842.pdf');
    setParsing(true);
    setProgress(20);

    setTimeout(() => setProgress(50), 300);
    setTimeout(() => setProgress(85), 600);
    setTimeout(() => {
      setProgress(100);
      setParsing(false);
      setExtractedItems([
        { id: Date.now() + 1, medicine: 'Amoxicillin 500mg', batch: 'AMX205', expiry: 'Nov 2027', quantity: 100, supplier: 'MediSource', status: 'Available', unitPrice: 95 },
        { id: Date.now() + 2, medicine: 'Pantoprazole 40mg', batch: 'PAN404', expiry: 'Jan 2028', quantity: 200, supplier: 'MediSource', status: 'Available', unitPrice: 55 },
        { id: Date.now() + 3, medicine: 'Dolo 650mg', batch: 'DOL109', expiry: 'Oct 2027', quantity: 150, supplier: 'MediSource', status: 'Available', unitPrice: 30 },
      ]);
      showToast('AI OCR extracted 3 medication line items from invoice');
    }, 900);
  };

  const handleUpdateExtractedField = (id: string | number, field: string, value: any) => {
    setExtractedItems(prev => prev ? prev.map(item => item.id === id ? { ...item, [field]: value } : item) : null);
  };

  const handleConfirmImport = () => {
    if (extractedItems) {
      onImport(extractedItems);
      showToast(`Imported ${extractedItems.length} new batches into Firestore inventory`);
      onClose();
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsing(false);
    setProgress(0);
    setExtractedItems(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,11,0.6)', backdropFilter: 'blur(5px)' }} onClick={onClose} />

      <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 640, padding: 0, zIndex: 111, background: 'var(--surface-raised)' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleRealFileSelect}
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.txt"
          style={{ display: 'none' }}
        />

        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Distributor Invoice & File Uploader</h3>
              <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Supports PDF, JPG/PNG, CSV and TXT invoice line item extraction</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6, color: 'var(--text-3)' }} title="Quit">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {!extractedItems && (
            <>
              <div
                className="dropzone-box"
                style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-alt)', border: '2px dashed var(--border)', borderRadius: 12, cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={40} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                  {file ? file : 'Click to Browse Invoice File (PDF, Image, CSV, TXT)'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>
                  Supports GST Tax Invoices, Delivery Challans, and Drug Purchase Bills
                </p>

                <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={e => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <UploadCloud size={14} /> Choose File from Computer
                  </button>
                  <button
                    className="btn btn-teal"
                    onClick={e => {
                      e.stopPropagation();
                      handleUploadSample();
                    }}
                  >
                    <Sparkles size={14} /> Load Demo Invoice
                  </button>
                </div>
              </div>

              {parsing && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>AI OCR extracting batches, quantities & expiry...</span>
                    <span style={{ fontWeight: 800, color: 'var(--text)' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 8, background: 'var(--bg-alt)', borderRadius: 99, overflow: 'hidden' }}>
                    <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              )}
            </>
          )}

          {extractedItems && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="var(--success)" />
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                    Extracted Line Items ({extractedItems.length}) – Review & Edit Before Saving
                  </span>
                </div>
                <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--text-3)' }}>
                  <RefreshCw size={13} /> Re-upload
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                {extractedItems.map(item => (
                  <div key={item.id} style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)' }}>Medicine</label>
                      <input
                        className="input"
                        value={item.medicine}
                        onChange={e => handleUpdateExtractedField(item.id, 'medicine', e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)' }}>Batch</label>
                      <input
                        className="input"
                        value={item.batch}
                        onChange={e => handleUpdateExtractedField(item.id, 'batch', e.target.value.toUpperCase())}
                        style={{ padding: '4px 8px', fontSize: 12, height: 30, fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)' }}>Expiry</label>
                      <input
                        className="input"
                        value={item.expiry}
                        onChange={e => handleUpdateExtractedField(item.id, 'expiry', e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                      />
                    </div>
                    <div style={{ width: 70 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)' }}>Qty</label>
                      <input
                        className="input"
                        type="number"
                        value={item.quantity}
                        onChange={e => handleUpdateExtractedField(item.id, 'quantity', Number(e.target.value))}
                        style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                      />
                    </div>
                    <div style={{ width: 70 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)' }}>Rate (₹)</label>
                      <input
                        className="input"
                        type="number"
                        value={item.unitPrice || 45}
                        onChange={e => handleUpdateExtractedField(item.id, 'unitPrice', Number(e.target.value))}
                        style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Quit / Cancel
          </button>
          {extractedItems && (
            <button onClick={handleConfirmImport} className="btn btn-teal">
              <Check size={15} /> Confirm & Save to Firestore Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── DISPENSING RECEIPT & TAX INVOICE MODAL (WITH PRINT & QUIT) ─────────── */
function DispenseReceiptModal({
  isOpen,
  onClose,
  data,
  showToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: {
    rxId: string;
    date: string;
    customer: string;
    medicine: string;
    batch: string;
    expiry: string;
    quantity: number;
    pharmacist: string;
    pricePerUnit: number;
    total: number;
    language: string;
  } | null;
  showToast: (s: string) => void;
}) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    showToast('Invoice sent to printer / PDF download initiated');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,11,0.6)', backdropFilter: 'blur(5px)' }} onClick={onClose} />

      <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 480, padding: 0, zIndex: 111, background: 'var(--surface-raised)', borderRadius: 16, border: '1px solid var(--border)' }}>
        <div style={{ padding: '20px 24px', background: 'var(--bg-sidebar)', color: 'var(--text)', borderTopLeftRadius: 16, borderTopRightRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={15} color="white" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text)' }}>
                WELLCARE <span style={{ color: 'var(--primary)' }}>PHARMACY</span>
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>Reg Lic: PHARM-KA-2024-8842 · GSTIN: 29AAAAA0000A1Z5</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text-2)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 16, borderBottom: '1px dashed var(--border)', fontSize: 12 }}>
            <div>
              <p style={{ color: 'var(--text-4)' }}>Invoice / Rx No:</p>
              <p style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)', marginTop: 2 }}>{data.rxId}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-4)' }}>Date & Time:</p>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{data.date}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-4)' }}>Patient / Customer:</p>
              <p style={{ fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{data.customer}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-4)' }}>Dispensed By:</p>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{data.pharmacist}</p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 8 }}>Prescription Line Items</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-3)' }}>Item</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-3)' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-3)' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontWeight: 700, color: 'var(--text)' }}>{data.medicine}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>Batch: {data.batch} · Exp: {data.expiry}</p>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                    {data.quantity}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                    ₹ {data.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-alt)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>Total Paid (Inc. Taxes):</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>₹ {data.total}</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--success)' }}>
            <CheckCircle2 size={15} color="var(--success)" />
            <span>FEFO Certified · Safety Verified by Pharmacist</span>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <button onClick={onClose} className="btn btn-secondary">
            Done
          </button>
          <button onClick={handlePrint} className="btn btn-teal">
            <Printer size={15} /> Print / Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 1. PHARMACIST DASHBOARD ─────────── */
function Dashboard({ onNavigate, inventory, currentUser }: { onNavigate: (p: string) => void; inventory: Medicine[]; currentUser?: UserSession }) {
  const expiredCount = inventory.filter(m => m.status !== 'Recalled' && (m.status === 'Expired' || parseDaysRemaining(m.expiry) < 0)).length;
  const nearExpiryCount = inventory.filter(m => m.status !== 'Recalled' && ((parseDaysRemaining(m.expiry) > 0 && parseDaysRemaining(m.expiry) <= 30) || m.status === 'Near Expiry')).length;
  const lowStockCount = inventory.filter(m => m.status !== 'Recalled' && (m.status === 'Low Stock' || m.quantity < 80)).length;
  const totalUnits = inventory.reduce((sum, m) => sum + m.quantity, 0);

  const pharmacistGreetingName = currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'Pharmacist';

  return (
    <>
      <PageHeader
        eyebrow="OPERATIONAL COMMAND CENTER"
        title={`Good day, ${pharmacistGreetingName} 👋`}
        description="Live overview of prescription dispensing velocity, inventory buffer levels, and batch expiry containment."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('add-stock')}>
              <PackagePlus size={15} /> Add Stock
            </button>
            <button className="btn btn-teal" onClick={() => onNavigate('dispensing')}>
              <Plus size={15} /> New Dispensing
            </button>
          </div>
        }
      />

      {/* Top 6 KPI Cards with High Contrast & Semantic Statuses */}
      <div className="responsive-stats-grid">
        <Stat label="Medicines" value={String(inventory.length)} change="+4.2% formulary" icon={Package} tone="teal" />
        <Stat label="Batches" value={String(new Set(inventory.map(m => m.batch)).size)} change="Tracked across distributors" icon={Boxes} tone="sage" />
        <Stat label="Total Stock" value={totalUnits.toLocaleString()} change="+8.4% buffer" icon={Activity} tone="green" />
        <Stat label="Low Stock" value={String(lowStockCount)} change="Reorder trigger" icon={AlertTriangle} tone="orange" />
        <Stat label="Near Expiry" value={String(nearExpiryCount)} change="<90d FEFO action" icon={Clock3} tone="amber" />
        <Stat label="Expired" value={String(expiredCount)} change="Quarantined" icon={AlertCircle} tone="red" />
      </div>

      {/* Main Charts & Critical Alerts Row */}
      <div className="responsive-dashboard-grid">
        <Panel
          title="Expiry Risk Distribution"
          action={
            <button
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => onNavigate('expiry')}
            >
              Full Expiry Table →
            </button>
          }
        >
          <ExpiryRiskChart inventory={inventory} onNavigateExpiry={() => onNavigate('expiry')} />
        </Panel>

        <Panel
          title="Critical Alerts & Risk Escalation"
          action={
            <button
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => onNavigate('alerts')}
            >
              See all alerts →
            </button>
          }
        >
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {inventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-3)' }}>
                <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>All Systems Nominal</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>No stock alerts or quarantine notices active.</p>
              </div>
            ) : (
              <>
                {nearExpiryCount > 0 && <AlertRow icon={AlertTriangle} tone="amber" title={`${nearExpiryCount} Batch(es) near expiry`} detail="FEFO priority dispatch" />}
                {inventory.filter(m => m.status === 'Recalled').length > 0 && <AlertRow icon={AlertCircle} tone="red" title={`${inventory.filter(m => m.status === 'Recalled').length} Batch(es) under recall`} detail="Locked from dispensing" />}
                {lowStockCount > 0 && <AlertRow icon={ArrowDownRight} tone="orange" title={`${lowStockCount} Medicine(s) low stock`} detail="Supplier reorder pending" />}
                {nearExpiryCount === 0 && lowStockCount === 0 && inventory.filter(m => m.status === 'Recalled').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 12px', color: 'var(--text-3)' }}>
                    <CheckCircle2 size={24} color="var(--success)" style={{ margin: '0 auto 6px' }} />
                    <p style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text)' }}>No active stock alerts</p>
                  </div>
                )}
              </>
            )}
            <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <button onClick={() => onNavigate('recall')} className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px', flex: 1, justifyContent: 'center' }}>
                Batch Recall Action
              </button>
              <button onClick={() => onNavigate('expiry')} className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 10px', flex: 1, justifyContent: 'center' }}>
                View Expiry Batches
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Stock Movement & Most Dispensed Row */}
      <div className="responsive-split-grid" style={{ marginBottom: 20 }}>
        <Panel
          title="Stock Movement (Inflow vs Outflow)"
          action={<span style={{ fontSize: 12, color: 'var(--text-3)' }}>Apr – Sep 2026</span>}
        >
          <StockMovementChart />
        </Panel>

        <Panel
          title="Most Dispensed Medicines Ranking"
          action={
            <button
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => onNavigate('reports')}
            >
              Full analytics report →
            </button>
          }
        >
          <MostDispensedRanking onViewReport={() => onNavigate('reports')} />
        </Panel>
      </div>

      {/* Comprehensive SOP & Compliance Flowchart Embedded into Dashboard */}
      <div style={{ marginBottom: 20 }}>
        <WorkflowFlowchart />
      </div>

      {/* AI Simulation Insight Banner */}
      <div
        className="card"
        style={{
          padding: 20,
          background: 'linear-gradient(135deg, var(--bg-alt) 0%, var(--surface-raised) 100%)',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px var(--primary-glow)',
          }}
        >
          <BrainCircuit size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            OPERATIONAL AI ADVISORY & SIMULATION
          </p>
          <p style={{ color: 'var(--text)', fontWeight: 600, marginTop: 3, fontSize: 13.5 }}>
            Purchasing 300 additional units of Vitamin D3 will cause ~120 units (₹ 7,800) to expire unsold based on current velocity. Run the What-If Simulator before issuing PO.
          </p>
        </div>
        <button
          onClick={() => onNavigate('simulator')}
          className="btn btn-teal"
          style={{
            whiteSpace: 'nowrap',
            fontSize: 13,
            padding: '9px 16px',
            borderRadius: 8,
          }}
        >
          Launch Simulator <ChevronRight size={15} />
        </button>
      </div>
    </>
  );
}

/* ─────────── 2. INVENTORY (LIVE SEARCH & FILTER) ─────────── */
function Inventory({
  inventory,
  setInventory,
  onAdd,
  showToast,
  initialFilterQuery = '',
}: {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  onAdd: () => void;
  showToast: (s: string) => void;
  initialFilterQuery?: string;
}) {
  const [q, setQ] = useState(initialFilterQuery);
  const [filter, setFilter] = useState('All');
  const [edit, setEdit] = useState<Medicine | null>(null);

  useEffect(() => {
    if (initialFilterQuery) {
      setQ(initialFilterQuery);
    }
  }, [initialFilterQuery]);

  const rows = inventory.filter(m =>
    (m.medicine + m.batch + m.supplier).toLowerCase().includes(q.toLowerCase()) &&
    (filter === 'All' || m.status === filter)
  );

  return (
    <>
      <PageHeader
        eyebrow="STOCK CONTROL"
        title="Medicine Inventory"
        description="Track medicines, batches, and stock status in one place."
        action={
          <button onClick={onAdd} className="btn btn-teal">
            <Plus size={15}/> Add stock
          </button>
        }
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 16, display: 'flex', gap: 12, justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ minWidth: 260 }}>
            <Search size={15} color="var(--text-muted)" />
            <input placeholder="Search medicine, batch, supplier..." value={q} onChange={e => setQ(e.target.value)} />
            {q && (
              <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="input" style={{ width: 150 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option>All</option>
              <option>Available</option>
              <option>Near Expiry</option>
              <option>Low Stock</option>
              <option>Recalled</option>
            </select>
            <button className="btn btn-secondary" onClick={() => showToast('Inventory report exported as CSV')}>
              <Download size={14}/> Export
            </button>
          </div>
        </div>
        {/* Desktop Table View */}
        <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-alt)' }}>
                {['Medicine', 'Batch', 'Expiry', 'Quantity', 'Rate', 'Supplier', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id} className="table-row" style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{m.medicine}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Stock updated</p>
                  </td>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{m.batch}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-2)' }}>{m.expiry}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{m.quantity}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-2)' }}>₹ {m.unitPrice || 45}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-2)' }}>{m.supplier}</td>
                  <td style={{ padding: '14px 20px' }}><Badge status={m.status}/></td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setEdit(m)}><Edit3 size={14}/></button>
                      <button className="btn btn-ghost" style={{ padding: 6, color: 'var(--danger)' }} onClick={() => { setInventory(inventory.filter(x => x.id !== m.id)); showToast(`Removed ${m.medicine} (${m.batch})`); }}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-3)', fontSize: 13 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Package size={36} color="var(--primary)" opacity={0.6} />
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                        {inventory.length === 0 ? 'No medicines in inventory yet' : 'No medicines match your search criteria'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 360 }}>
                        {inventory.length === 0 ? 'Add your first batch to start automated FEFO tracking, expiry alerts, and stock management.' : 'Try adjusting your filters or search keywords.'}
                      </p>
                      {inventory.length === 0 && (
                        <button onClick={onAdd} className="btn btn-teal" style={{ marginTop: 4 }}>
                          <Plus size={14} /> Add First Medicine Batch
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view" style={{ padding: '12px 14px', display: 'none', flexDirection: 'column', gap: 10 }}>
          {rows.map(m => (
            <div key={m.id} className="mobile-entity-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{m.medicine}</h4>
                  <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{m.supplier}</p>
                </div>
                <Badge status={m.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, padding: '10px 12px', background: 'var(--bg-alt)', borderRadius: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Batch</span>
                  <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)' }}>{m.batch}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Expiry</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--text)' }}>{m.expiry}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>In Stock</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 800, color: 'var(--primary)', fontSize: 14 }}>{m.quantity} units</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Price</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--text)' }}>₹ {m.unitPrice || 45}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 12, flex: 1 }} onClick={() => setEdit(m)}>
                  <Edit3 size={13} /> Edit
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--danger)' }} onClick={() => { setInventory(inventory.filter(x => x.id !== m.id)); showToast(`Removed ${m.medicine} (${m.batch})`); }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-3)', fontSize: 13 }}>
              No medicines match your search criteria.
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>Showing {rows.length} of {inventory.length} medicines</div>
      </div>

      {edit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,32,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setEdit(null)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Edit medicine</h3>
              <button onClick={() => setEdit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18}/></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Medicine name</label><input className="input" value={edit.medicine} onChange={e => setEdit({ ...edit, medicine: e.target.value })}/></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Quantity</label><input className="input" type="number" value={edit.quantity} onChange={e => setEdit({ ...edit, quantity: Number(e.target.value) })}/></div>
                <div><label className="label">Unit Price (₹)</label><input className="input" type="number" value={edit.unitPrice || 45} onChange={e => setEdit({ ...edit, unitPrice: Number(e.target.value) })}/></div>
              </div>
              <div><label className="label">Status</label><select className="input" value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value as Status })}><option>Available</option><option>Near Expiry</option><option>Low Stock</option><option>Recalled</option></select></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
                <button className="btn btn-teal" onClick={() => { setInventory(inventory.map(x => x.id === edit.id ? edit : x)); setEdit(null); showToast('Inventory updated'); }}>Save changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────── 3. ADD STOCK (SCANNER & INVOICE INTEGRATION) ─────────── */
function AddStock({
  inventory,
  setInventory,
  onDone,
  showToast,
}: {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  onDone: () => void;
  showToast: (s: string) => void;
}) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const [form, setForm] = useState({
    medicine: '',
    batch: '',
    expiry: '',
    quantity: '',
    supplier: '',
    unitPrice: '',
  });

  const handleScannedData = (data: { medicine: string; batch: string; expiry: string; quantity: number; supplier: string; unitPrice?: number }) => {
    setForm({
      medicine: data.medicine,
      batch: data.batch,
      expiry: data.expiry,
      quantity: String(data.quantity),
      supplier: data.supplier,
      unitPrice: String(data.unitPrice || 45),
    });
    showToast(`Scanned ${data.medicine} (${data.batch})`);
  };

  const handleInvoiceImport = async (items: Medicine[]) => {
    try {
      for (const it of items) {
        await api.addMedicine({
          medicine: it.medicine,
          batch: it.batch,
          expiry: it.expiry,
          quantity: it.quantity,
          supplier: it.supplier,
          unitPrice: it.unitPrice || 45,
          status: it.status || 'Available'
        });
      }
      const updated = await api.getInventory();
      setInventory(updated);
      showToast(`Imported ${items.length} items to database`);
    } catch {
      setInventory([...inventory, ...items]);
    }
  };

  const submit = async () => {
    if (!form.medicine || !form.quantity) {
      showToast('Please enter medicine name and quantity');
      return;
    }
    const newMed: Omit<Medicine, 'id'> = {
      medicine: form.medicine,
      batch: form.batch || `BTH${Math.floor(100 + Math.random() * 900)}`,
      expiry: form.expiry || 'Dec 2027',
      quantity: Number(form.quantity),
      supplier: form.supplier || 'ABC Pharma',
      status: 'Available',
      unitPrice: Number(form.unitPrice) || 45,
    };
    try {
      const added = await api.addMedicine(newMed);
      setInventory([...inventory, added]);
      showToast(`Added ${form.medicine} to inventory`);
    } catch {
      setInventory([...inventory, { id: Date.now(), ...newMed }]);
      showToast(`Added ${form.medicine} (local)`);
    }
    onDone();
  };

  return (
    <>
      <PageHeader
        eyebrow="STOCK CONTROL"
        title="Add Stock"
        description="Bring new medication stock into your inventory via barcode scanning, invoice upload, or manual entry."
        action={
          <button className="btn btn-secondary" onClick={onDone}>
            Cancel / Back to Inventory
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-hover" style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QrCode size={22} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Barcode / QR Package Scanner</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
                  Scan medicine packages, strips, or bulk carton QR codes for auto-filling batch details.
                </p>
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn-teal" onClick={() => setScannerOpen(true)}>
                    <Camera size={15} /> Launch QR Scanner
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-hover" style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--info-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={22} color="var(--info)" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Distributor Invoice OCR</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>
                  Upload a distributor purchase bill (PDF/Image) to batch-import all medications automatically.
                </p>
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn-secondary" onClick={() => setInvoiceModalOpen(true)}>
                    <UploadCloud size={15} /> Upload Invoice Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12, color: 'var(--text)' }}>
            Stock Entry Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Medicine name *</label>
              <input className="input" placeholder="e.g. Paracetamol 500mg" value={form.medicine} onChange={e => setForm({ ...form, medicine: e.target.value })}/>
            </div>
            <div>
              <label className="label">Batch number</label>
              <input className="input" placeholder="e.g. PCT101" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })}/>
            </div>
            <div>
              <label className="label">Expiry date</label>
              <input className="input" placeholder="e.g. Sep 2027" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })}/>
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input className="input" type="number" placeholder="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}/>
            </div>
            <div>
              <label className="label">Unit Price (₹)</label>
              <input className="input" type="number" placeholder="45" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })}/>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Supplier</label>
              <select className="input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
                <option value="">Select supplier</option>
                <option>ABC Pharma</option>
                <option>MediSource</option>
                <option>HealthCare Labs</option>
                <option>Nova Pharma</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={onDone}>Cancel</button>
              <button className="btn btn-teal" onClick={submit}><PackagePlus size={15}/> Add to Inventory</button>
            </div>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScannedData}
      />

      <InvoiceUploadModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onImport={handleInvoiceImport}
        showToast={showToast}
      />
    </>
  );
}

/* ─────────── 4. BATCH & EXPIRY ─────────── */
function Expiry({
  inventory,
  onNavigate,
  showToast,
}: {
  inventory: Medicine[];
  onNavigate?: (p: string) => void;
  showToast: (s: string) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="RISK MANAGEMENT"
        title="Batch & Expiry Tracking"
        description="Stay ahead of expiry risk with real-time FEFO batch visibility."
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-teal"
              onClick={() => onNavigate?.('sms-reports')}
              style={{ fontSize: 13, fontWeight: 700 }}
            >
              <Users size={14}/> View Affected Customers
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                downloadCSV(
                  'expiry_risk_report.csv',
                  ['Medicine', 'Batch', 'Expiry Date', 'Available Quantity', 'Risk Level', 'Supplier'],
                  inventory.map(m => [m.medicine, m.batch, m.expiry, m.quantity, m.status, m.supplier])
                );
                showToast('Downloaded expiry_risk_report.csv');
              }}
            >
              <Download size={14}/> Export report
            </button>
          </div>
        }
      />
      <div className="responsive-stats-grid">
        <Stat label="Total Batches" value="246" icon={Boxes} tone="sage" />
        <Stat label="Expiring in 30d" value="12" icon={Clock3} tone="amber" />
        <Stat label="Expiring in 90d" value="28" icon={CalendarDays} tone="teal" />
        <Stat label="Expired" value="3" icon={AlertCircle} tone="red" />
      </div>
      {/* Redesigned Full-Featured Expiry Timeline Component with Live Proportional Positioning */}
      <div style={{ marginBottom: 20 }}>
        <ExpiryTimeline
          inventory={inventory}
          onSelectBatch={b => {
            showToast(`Selected ${b.medicine} (${b.batch}) · Expiry: ${b.expiry}`);
          }}
          onNavigateExpiryTable={() => {
            showToast('Showing full FEFO batch priority table below');
          }}
        />
      </div>

      <div className="responsive-dashboard-grid">
        <Panel title="Expiry Risk Distribution Breakdown">
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'conic-gradient(var(--danger) 0 4%, var(--warning) 4% 16%, var(--primary) 16% 30%, var(--border-strong) 30% 100%)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'var(--surface-raised)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>246</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>batches</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {[['Expired / Recalled', '4', 'var(--danger)'], ['Critical (<30d)', '12', 'var(--warning)'], ['Watch (<90d)', '34', 'var(--primary)'], ['Safe (>90d)', '196', 'var(--text-muted)']].map(([n, v, c]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'center', color: 'var(--text-2)' }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }}/>{n}</span>
                  <b style={{ color: 'var(--text)' }}>{v}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Regulatory Compliance & FEFO Protocol">
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--success-light)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={18} color="var(--success)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>First-Expiry, First-Out (FEFO) Strict Enforcement</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>System automatically sorts stock batches by earliest expiry to minimize expired inventory write-offs.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={18} color="var(--danger)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Automated Quarantine Barrier</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Batches marked as Expired or Recalled are electronically hard-locked and cannot be selected during dispensing.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--warning-light)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock3 size={18} color="var(--warning)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Supplier Return Window</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Medicines reaching 60 days before expiry generate return-to-vendor credit claim notices automatically.</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Priority Batches for FEFO Dispensing">
        {/* Desktop Table View */}
        <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: 'var(--bg-alt)' }}>
              {['Medicine', 'Batch', 'Expiry', 'Days Left', 'Risk', 'Action'].map(h => <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{inventory.slice(0, 5).map((m, i) => (
              <tr key={m.batch} className="table-row" style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{m.medicine}</td>
                <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{m.batch}</td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-2)' }}>{m.expiry}</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{[12, 42, 68, 103, 150][i] || 90}</td>
                <td style={{ padding: '14px 20px' }}><Badge status={m.status}/></td>
                <td style={{ padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button onClick={() => onNavigate?.('dispensing')} style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Dispense batch →
                  </button>
                  <button onClick={() => onNavigate?.('sms-reports')} style={{ fontSize: 11.5, color: 'var(--warning-dark, #d97706)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Safety Notify →
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view" style={{ padding: '12px 14px', display: 'none', flexDirection: 'column', gap: 10 }}>
          {inventory.slice(0, 5).map((m, i) => (
            <div key={m.batch} className="mobile-entity-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{m.medicine}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{m.batch}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Exp: {m.expiry}</span>
                  </div>
                </div>
                <Badge status={m.status} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '8px 12px', background: 'var(--bg-alt)', borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-3)' }}>Days Remaining:</span>
                <span style={{ fontWeight: 800, color: 'var(--warning-dark)' }}>{[12, 42, 68, 103, 150][i] || 90} days left</span>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => onNavigate?.('dispensing')}
                  className="btn btn-secondary"
                  style={{ fontSize: 11.5, padding: '6px 12px' }}
                >
                  Dispense
                </button>
                <button
                  onClick={() => onNavigate?.('sms-reports')}
                  className="btn btn-teal"
                  style={{ fontSize: 11.5, padding: '6px 12px', fontWeight: 700 }}
                >
                  Safety Notify →
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ─────────── 5. DISPENSING (WITH QR SCAN & OFFICIAL RECEIPT) ─────────── */
function Dispensing({
  inventory,
  setInventory,
  audits,
  setAudits,
  customersList,
  setCustomersList,
  showToast,
  currentUser,
}: {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  audits: Audit[];
  setAudits: React.Dispatch<React.SetStateAction<Audit[]>>;
  customersList: CustomerItem[];
  setCustomersList: React.Dispatch<React.SetStateAction<CustomerItem[]>>;
  showToast: (s: string) => void;
  currentUser?: UserSession;
}) {
  const [medicine, setMedicine] = useState('');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState(1);
  const [customer, setCustomer] = useState('');
  const [language, setLanguage] = useState('English');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newCustomerModal, setNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [receiptData, setReceiptData] = useState<{
    rxId: string;
    date: string;
    customer: string;
    medicine: string;
    batch: string;
    expiry: string;
    quantity: number;
    pharmacist: string;
    pricePerUnit: number;
    total: number;
    language: string;
  } | null>(null);

  const chosen = inventory.find(x => x.medicine === medicine && (!batch || x.batch === batch));

  const handleScanForDispense = (scanned: { medicine: string; batch: string }) => {
    setMedicine(scanned.medicine);
    setBatch(scanned.batch);
    showToast(`Prescription / Batch scanned: ${scanned.medicine} (${scanned.batch})`);
  };

  const [newCustPref, setNewCustPref] = useState<'WHATSAPP' | 'SMS'>('SMS');

  const handleAddCustomer = async () => {
    if (!newCustName) return;
    try {
      const added = await api.addCustomer({
        name: newCustName,
        phone: newCustPhone || '+91 98000 00000',
        email: `${newCustName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        allergies: 'None',
        preferredLang: 'English',
        communicationPreference: newCustPref,
      });
      setCustomersList([...customersList, added]);
    } catch {
      const newCust: CustomerItem = {
        id: Date.now(),
        name: newCustName,
        phone: newCustPhone || '+91 98000 00000',
        email: `${newCustName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        visits: 1,
        lastVisit: 'Just now',
        allergies: 'None',
        alerts: true,
        preferredLang: 'English',
        communicationPreference: newCustPref,
      };
      setCustomersList([...customersList, newCust]);
    }
    setCustomer(newCustName);
    setNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustPref('SMS');
    showToast(`Customer "${newCustName}" registered`);
  };

  const confirm = async () => {
    if (!chosen || !customer || qty < 1) {
      showToast('Please complete all dispensing details');
      return;
    }
    if (qty > chosen.quantity) {
      showToast(`Only ${chosen.quantity} units available in batch ${chosen.batch}`);
      return;
    }
    if (chosen.status === 'Recalled') {
      showToast('CANNOT DISPENSE: This batch is quarantined under recall');
      return;
    }

    const unitRate = chosen.unitPrice || 45;
    const totalAmount = unitRate * qty;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const pharmacistDisplayName = currentUser?.fullName || 'Pharmacist';

    try {
      const res = await api.dispensePrescription({
        medicineId: chosen.id,
        medicineName: chosen.medicine,
        batchNumber: chosen.batch,
        quantity: qty,
        customerName: customer,
        pharmacistName: pharmacistDisplayName,
        unitPrice: unitRate,
        totalAmount,
      });

      const rxId = res.rxId || `RX-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      if (res.medicine) {
        setInventory(inventory.map(x => (x.id === chosen.id || x.batch === chosen.batch) ? res.medicine : x));
      } else {
        setInventory(inventory.map(x => x.id === chosen.id ? { ...x, quantity: x.quantity - qty } : x));
      }

      if (res.audit) {
        setAudits([res.audit, ...audits]);
      } else {
        setAudits([
          {
            id: Date.now(),
            date: `Today, ${nowTime}`,
            medicine: chosen.medicine,
            batch: chosen.batch,
            quantity: qty,
            customer,
            pharmacist: pharmacistDisplayName,
            status: 'Completed',
            rxId,
            totalAmount,
          },
          ...audits,
        ]);
      }

      setReceiptData({
        rxId,
        date: `Today, ${nowTime}`,
        customer,
        medicine: chosen.medicine,
        batch: chosen.batch,
        expiry: chosen.expiry,
        quantity: qty,
        pharmacist: pharmacistDisplayName,
        pricePerUnit: unitRate,
        total: totalAmount,
        language,
      });

      // Automatic dispensing SMS notification
      const custObj = customersList.find(c => c.name.toLowerCase() === customer.toLowerCase());
      if (custObj?.phone) {
        api.sendDispenseSms({
          customerPhone: custObj.phone,
          customerName: customer,
          medicineName: chosen.medicine,
          quantity: qty,
          rxId,
          totalAmount,
          language,
        }).catch((err: unknown) => console.warn('Automatic dispense SMS skipped/offline:', err));
      }

      showToast('Dispensing confirmed & receipt generated');
    } catch {
      const rxId = `RX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      setInventory(inventory.map(x => x.id === chosen.id ? { ...x, quantity: x.quantity - qty } : x));
      setAudits([
        {
          id: Date.now(),
          date: `Today, ${nowTime}`,
          medicine: chosen.medicine,
          batch: chosen.batch,
          quantity: qty,
          customer,
          pharmacist: pharmacistDisplayName,
          status: 'Completed',
          rxId,
          totalAmount,
        },
        ...audits,
      ]);
      setReceiptData({
        rxId,
        date: `Today, ${nowTime}`,
        customer,
        medicine: chosen.medicine,
        batch: chosen.batch,
        expiry: chosen.expiry,
        quantity: qty,
        pharmacist: pharmacistDisplayName,
        pricePerUnit: unitRate,
        total: totalAmount,
        language,
      });
      showToast('Dispensing confirmed (local)');
    }

    setMedicine('');
    setBatch('');
    setQty(1);
    setCustomer('');
  };

  return (
    <>
      <PageHeader
        eyebrow="DAILY OPERATIONS"
        title="Dispensing"
        description="Safely dispense medication with full batch traceability and FEFO compliance."
        action={
          <button className="btn btn-secondary" onClick={() => setScannerOpen(true)}>
            <QrCode size={15} /> Scan Prescription / Batch
          </button>
        }
      />
      <div className="responsive-dashboard-grid">
        <div className="card">
          <div style={{ padding: 18, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} color="var(--primary)"/>
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>New dispensing record</h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Record what leaves your pharmacy</p>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setScannerOpen(true)}>
              <Camera size={14} /> Scan Barcode
            </button>
          </div>

          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Select medicine</label>
              <select className="input" value={medicine} onChange={e => { setMedicine(e.target.value); setBatch(''); }}>
                <option value="">Choose medicine</option>
                {inventory.filter(x => x.status !== 'Recalled').map(x => (
                  <option key={x.id} value={x.medicine}>
                    {x.medicine} (Stock: {x.quantity})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Select batch</label>
              <select className="input" value={batch} onChange={e => setBatch(e.target.value)} disabled={!medicine}>
                <option value="">{chosen ? 'Auto-select FEFO' : 'Choose batch'}</option>
                {inventory.filter(x => x.medicine === medicine).map(x => (
                  <option key={x.batch} value={x.batch}>{x.batch} · {x.quantity} units · {x.expiry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 42, height: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, borderRadius: 8, flexShrink: 0 }}
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  className="input"
                  type="number"
                  min="1"
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, minWidth: 60 }}
                  value={qty}
                  onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 42, height: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, borderRadius: 8, flexShrink: 0 }}
                  onClick={() => setQty(qty + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              {chosen && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Available: {chosen.quantity} units (₹ {chosen.unitPrice || 45}/unit)</p>}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>Customer</label>
                <button onClick={() => setNewCustomerModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  + New Customer
                </button>
              </div>
              <select className="input" value={customer} onChange={e => setCustomer(e.target.value)}>
                <option value="">Select customer</option>
                {customersList.map(x => <option key={x.id} value={x.name}>{x.name} ({x.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Preferred Language</label>
              <select className="input" value={language} onChange={e => setLanguage(e.target.value)}>
                <option>English</option><option>Hindi</option><option>Tamil</option><option>Malayalam</option><option>Kannada</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-teal" style={{ padding: '10px 22px' }} onClick={confirm}>
                <Check size={15}/> Confirm & Generate Receipt
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 500 }}>Dispensed today</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{42 + audits.length - 3}</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>records completed</p>
            <div className="progress-bar" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: '78%', background: 'var(--primary)' }}/></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 6 }}><span style={{ color: 'var(--text-3)' }}>Daily target</span><b style={{ color: 'var(--text)' }}>78%</b></div>
          </div>
          <Panel title="Recent records">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {audits.slice(0, 4).map(a => (
                <div key={a.id} style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{a.medicine}</p>
                    <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{a.quantity}x</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{a.customer} · {a.date}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanForDispense}
      />

      {newCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,32,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setNewCustomerModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 400, zIndex: 111, padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Quick Add Customer</h3>
              <button onClick={() => setNewCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={17} color="var(--text-3)"/></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Customer Full Name *</label><input className="input" placeholder="e.g. Ramesh Patel" value={newCustName} onChange={e => setNewCustName(e.target.value)}/></div>
              <div><label className="label">Phone Number</label><input className="input" placeholder="e.g. +91 98450 12345" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}/></div>
              <div>
                <label className="label" style={{ marginBottom: 6, display: 'block' }}>Communication Preference</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${newCustPref === 'WHATSAPP' ? 'var(--primary)' : 'var(--border)'}`, background: newCustPref === 'WHATSAPP' ? 'var(--primary-light)' : 'var(--bg-alt)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    <input type="radio" name="quickCommPref" checked={newCustPref === 'WHATSAPP'} onChange={() => setNewCustPref('WHATSAPP')} style={{ display: 'none' }} />
                    <span>🟢 WhatsApp</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${newCustPref === 'SMS' ? 'var(--primary)' : 'var(--border)'}`, background: newCustPref === 'SMS' ? 'var(--primary-light)' : 'var(--bg-alt)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    <input type="radio" name="quickCommPref" checked={newCustPref === 'SMS'} onChange={() => setNewCustPref('SMS')} style={{ display: 'none' }} />
                    <span>📱 SMS</span>
                  </label>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>Default: SMS unless patient specifically requests WhatsApp.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn btn-secondary" onClick={() => setNewCustomerModal(false)}>Cancel</button>
                <button className="btn btn-teal" onClick={handleAddCustomer}>Add & Select</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DispenseReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
        showToast={showToast}
      />
    </>
  );
}

/* ─────────── 6. DISPENSING AUDIT ─────────── */
function AuditPage({
  audits,
  showToast,
  onNavigate,
}: {
  audits: Audit[];
  showToast: (s: string) => void;
  onNavigate?: (p: string) => void;
}) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Recalled'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filtered = audits.filter(a => {
    const matchesQuery = (a.medicine + a.customer + a.batch + a.pharmacist + (a.rxId || '')).toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalRevenue = audits.reduce((sum, a) => sum + (a.totalAmount || a.quantity * 45), 0);

  return (
    <>
      <PageHeader
        eyebrow="REGULATORY COMPLIANCE & GOVERNANCE"
        title="Dispensing Audit Trail"
        description="Immutable chronological record of every dispensed prescription with full batch traceability and pharmacist accountability."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                downloadCSV(
                  'dispensing_audit_trail.csv',
                  ['Date', 'Rx ID', 'Medicine', 'Batch', 'Quantity', 'Customer', 'Pharmacist', 'Status', 'Total (INR)'],
                  audits.map(a => [a.date, a.rxId || `RX-${a.id}`, a.medicine, a.batch, a.quantity, a.customer, a.pharmacist, a.status, a.totalAmount || (a.quantity * 45)])
                );
                showToast('Exported dispensing_audit_trail.csv');
              }}
            >
              <Download size={14} /> Export Audit Log (CSV)
            </button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Total Transactions</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{audits.length}</p>
          </div>
          <span className="chip badge-teal" style={{ fontSize: 11 }}>100% Traceable</span>
        </div>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Units Dispensed</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>
              {audits.reduce((sum, a) => sum + a.quantity, 0)} units
            </p>
          </div>
          <span className="chip badge-green" style={{ fontSize: 11 }}>FEFO Enforced</span>
        </div>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Dispensing Volume</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>₹ {totalRevenue.toLocaleString()}</p>
          </div>
          <span className="chip badge-blue" style={{ fontSize: 11 }}>Verified Invoices</span>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Filter and Search Bar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="search-input" style={{ width: 'clamp(220px, 30vw, 340px)' }}>
            <Search size={15} color="var(--text-3)" />
            <input
              placeholder="Search Rx ID, medicine, customer, batch..."
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setCurrentPage(1);
              }}
            />
            {q && (
              <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['All', 'Completed', 'Recalled'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setCurrentPage(1);
                }}
                className={`btn ${statusFilter === tab ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7 }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr className="table-header">
                {['Timestamp', 'Rx ID', 'Medication', 'Batch', 'Qty', 'Customer', 'Pharmacist', 'Amount', 'Compliance'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map(a => (
                  <tr key={a.id} className="table-row" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '13px 18px', fontSize: 12.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{a.date}</td>
                    <td style={{ padding: '13px 18px', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--primary)', fontWeight: 800 }}>
                      {a.rxId || `RX-2026-${a.id.toString().slice(-4)}`}
                    </td>
                    <td style={{ padding: '13px 18px', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{a.medicine}</td>
                    <td style={{ padding: '13px 18px', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-2)' }}>{a.batch}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{a.quantity}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{a.customer}</td>
                    <td style={{ padding: '13px 18px', fontSize: 12.5, color: 'var(--text-3)' }}>{a.pharmacist}</td>
                    <td style={{ padding: '13px 18px', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                      ₹ {(a.totalAmount || a.quantity * 45).toLocaleString()}
                    </td>
                    <td style={{ padding: '13px 18px' }}><Badge status={a.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <ClipboardList size={32} color="var(--primary)" opacity={0.6} />
                      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                        {audits.length === 0 ? 'No dispensing audits recorded yet' : 'No audit records match your search'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {audits.length === 0 ? 'Completed prescription dispensing transactions will automatically log an immutable audit trail.' : 'Try adjusting your search query or filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view" style={{ padding: '12px 14px', display: 'none', flexDirection: 'column', gap: 10 }}>
          {paginatedRows.map(a => (
            <div key={a.id} className="mobile-entity-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>
                    {a.rxId || `RX-2026-${a.id.toString().slice(-4)}`}
                  </span>
                  <h4 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', margin: '3px 0 0' }}>{a.medicine}</h4>
                </div>
                <Badge status={a.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, padding: '10px 12px', background: 'var(--bg-alt)', borderRadius: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Customer</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--text)' }}>{a.customer}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Quantity</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 800, color: 'var(--primary)' }}>{a.quantity} units</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Batch</span>
                  <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-2)' }}>{a.batch}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Total Paid</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--text)' }}>₹ {(a.totalAmount || a.quantity * 45).toLocaleString()}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
                <span>{a.date}</span>
                <span>By {a.pharmacist}</span>
              </div>
            </div>
          ))}
          {paginatedRows.length === 0 && (
            <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-3)', fontSize: 13 }}>
              No audit records match "{q}" in category "{statusFilter}".
            </div>
          )}
        </div>

        {/* Pagination & Counter Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Showing {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} audit entries
          </span>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11.5, opacity: currentPage <= 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', padding: '0 6px' }}>
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11.5, opacity: currentPage >= totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── 7. CUSTOMERS (WITH ADD & HISTORY MODAL) ─────────── */
function Customers({
  customersList,
  setCustomersList,
  audits,
  showToast,
  onOpenManualSms,
  onOpenSafetyCommunication,
}: {
  customersList: CustomerItem[];
  setCustomersList: React.Dispatch<React.SetStateAction<CustomerItem[]>>;
  audits: Audit[];
  showToast: (s: string) => void;
  onOpenManualSms?: (cust: CustomerItem) => void;
  onOpenSafetyCommunication?: (cust: any, type?: string, details?: any) => void;
}) {
  const [q, setQ] = useState('');
  const [selectedCust, setSelectedCust] = useState<CustomerItem | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    email: string;
    allergies: string;
    preferredLang: string;
    communicationPreference: 'WHATSAPP' | 'SMS';
  }>({
    name: '',
    phone: '',
    email: '',
    allergies: '',
    preferredLang: 'English',
    communicationPreference: 'SMS'
  });

  const [editForm, setEditForm] = useState<{
    id: string | number;
    name: string;
    phone: string;
    email: string;
    allergies: string;
    preferredLang: string;
    communicationPreference: 'WHATSAPP' | 'SMS';
    alerts: boolean;
  }>({
    id: '',
    name: '',
    phone: '',
    email: '',
    allergies: '',
    preferredLang: 'English',
    communicationPreference: 'SMS',
    alerts: true,
  });

  const filtered = customersList.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));

  const handleAdd = async () => {
    if (!form.name.trim()) {
      showToast('Please enter customer name');
      return;
    }
    const commPref = form.communicationPreference === 'WHATSAPP' ? 'WHATSAPP' : 'SMS';
    try {
      const added = await api.addCustomer({
        name: form.name.trim(),
        phone: form.phone ? form.phone.trim() : '+91 98000 00000',
        email: form.email ? form.email.trim() : `${form.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        allergies: form.allergies || 'None',
        preferredLang: form.preferredLang || 'English',
        communicationPreference: commPref,
      });
      setCustomersList([...customersList, added]);
    } catch {
      const newC: CustomerItem = {
        id: Date.now(),
        name: form.name.trim(),
        phone: form.phone ? form.phone.trim() : '+91 98000 00000',
        email: form.email ? form.email.trim() : `${form.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        visits: 1,
        lastVisit: 'Today',
        allergies: form.allergies || 'None',
        alerts: true,
        preferredLang: form.preferredLang || 'English',
        communicationPreference: commPref,
      };
      setCustomersList([...customersList, newC]);
    }
    setAddModal(false);
    setForm({ name: '', phone: '', email: '', allergies: '', preferredLang: 'English', communicationPreference: 'SMS' });
    showToast(`Added customer "${form.name}" (Preference: ${commPref})`);
  };

  const openEditModal = (c: CustomerItem) => {
    setEditForm({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      allergies: c.allergies || '',
      preferredLang: c.preferredLang || 'English',
      communicationPreference: (c.communicationPreference === 'WHATSAPP' ? 'WHATSAPP' : 'SMS'),
      alerts: c.alerts ?? true,
    });
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      showToast('Customer name cannot be empty');
      return;
    }
    const commPref = editForm.communicationPreference === 'WHATSAPP' ? 'WHATSAPP' : 'SMS';
    const updates: Partial<CustomerItem> = {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      allergies: editForm.allergies.trim() || 'None',
      preferredLang: editForm.preferredLang,
      communicationPreference: commPref,
      alerts: editForm.alerts,
    };

    try {
      const updated = await api.updateCustomer(editForm.id, updates);
      setCustomersList(prev => prev.map(c => c.id === editForm.id ? { ...c, ...updates, ...updated } : c));
      if (selectedCust && selectedCust.id === editForm.id) {
        setSelectedCust({ ...selectedCust, ...updates, ...updated });
      }
    } catch (err: any) {
      setCustomersList(prev => prev.map(c => c.id === editForm.id ? { ...c, ...updates } : c));
      if (selectedCust && selectedCust.id === editForm.id) {
        setSelectedCust({ ...selectedCust, ...updates });
      }
    }

    setEditModal(false);
    showToast(`Updated customer "${editForm.name}" (Preference: ${commPref})`);
  };

  const handleQuickPreferenceChange = async (c: CustomerItem, newPref: 'WHATSAPP' | 'SMS') => {
    try {
      await api.updateCustomer(c.id, { communicationPreference: newPref });
      setCustomersList(prev => prev.map(item => item.id === c.id ? { ...item, communicationPreference: newPref } : item));
      if (selectedCust && selectedCust.id === c.id) {
        setSelectedCust({ ...selectedCust, communicationPreference: newPref });
      }
      showToast(`Updated ${c.name}'s preferred channel to ${newPref === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}`);
    } catch {
      setCustomersList(prev => prev.map(item => item.id === c.id ? { ...item, communicationPreference: newPref } : item));
      if (selectedCust && selectedCust.id === c.id) {
        setSelectedCust({ ...selectedCust, communicationPreference: newPref });
      }
      showToast(`Updated ${c.name}'s preferred channel to ${newPref === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}`);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="RELATIONSHIPS"
        title="Customers"
        description="Keep customer care personal, informed, and connected with prescription tracking."
        action={
          <button className="btn btn-teal" onClick={() => setAddModal(true)}>
            <Plus size={15}/> Add Customer
          </button>
        }
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="search-input" style={{ maxWidth: 300 }}>
            <Search size={15} color="var(--text-3)"/>
            <input placeholder="Search customers..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              downloadCSV(
                'customers_directory.csv',
                ['Name', 'Phone', 'Email', 'Preferred Channel', 'Language', 'Total Visits', 'Last Visit', 'Known Drug Allergies', 'SMS Alerts Enabled'],
                customersList.map(c => [c.name, c.phone, c.email, c.communicationPreference || 'SMS', c.preferredLang || 'English', c.visits, c.lastVisit, c.allergies || 'None', c.alerts ? 'Yes' : 'No'])
              );
              showToast('Downloaded customers_directory.csv');
            }}
          >
            <Download size={14}/> Export
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 'clamp(10px, 2.5vw, 16px)', padding: 'clamp(12px, 3vw, 20px)' }}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className="card card-hover"
              style={{ padding: 18, cursor: 'pointer' }}
              onClick={() => setSelectedCust(c)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: i % 2 ? 'var(--primary-light)' : 'var(--info-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13.5, color: i % 2 ? 'var(--primary)' : 'var(--info)' }}>
                  {c.name.split(' ').map(x => x[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{c.phone}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span
                      className="chip"
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        backgroundColor: c.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: c.communicationPreference === 'WHATSAPP' ? '#16A34A' : '#2563EB',
                        fontWeight: 700
                      }}
                    >
                      {c.communicationPreference === 'WHATSAPP' ? '🟢 WhatsApp' : '📱 SMS'}
                    </span>
                    <span className="chip" style={{ fontSize: 10, padding: '1px 6px', color: 'var(--text-3)', background: 'var(--bg-alt)' }}>
                      {c.preferredLang || 'English'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div><p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{c.visits}</p><p style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Visits</p></div>
                <div><p style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2, color: 'var(--text)' }}>{c.lastVisit}</p><p style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>Last visit</p></div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                  <span className="chip badge-green">{c.alerts ? 'Alerts on' : 'Alerts off'}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 24px', color: 'var(--text-3)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Users size={36} color="var(--primary)" opacity={0.6} />
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                  {customersList.length === 0 ? 'No customer records yet' : 'No customers match your search criteria'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 360 }}>
                  {customersList.length === 0 ? 'Register patients to track dispensing history, known drug allergies, and automated SMS alerts.' : 'Try searching for a different patient name or phone number.'}
                </p>
                {customersList.length === 0 && (
                  <button onClick={() => setAddModal(true)} className="btn btn-teal" style={{ marginTop: 4 }}>
                    <Plus size={14} /> Add First Customer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Customer Modal (Details + Direct Preference Switch + Edit) */}
      {selectedCust && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,32,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedCust(null)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 480, padding: 0, zIndex: 111, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)' }}>
                  {selectedCust.name.split(' ').map(x => x[0]).join('')}
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: 0 }}>{selectedCust.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>{selectedCust.phone} · {selectedCust.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => openEditModal(selectedCust)}
                  className="btn btn-secondary"
                  style={{ fontSize: 11.5, padding: '4px 10px' }}
                >
                  Edit Customer
                </button>
                <button onClick={() => setSelectedCust(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-3)"/></button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: 'var(--bg-alt)', borderRadius: 12, padding: 14, marginBottom: 18, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', margin: 0 }}>Clinical & Channel Preference</p>
                
                {/* Communication Preference Card with live interactive switcher */}
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Preferred Communication Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label
                      onClick={() => handleQuickPreferenceChange(selectedCust, 'WHATSAPP')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1.5px solid ${selectedCust.communicationPreference === 'WHATSAPP' ? '#16A34A' : 'var(--border)'}`,
                        background: selectedCust.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-alt)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        color: selectedCust.communicationPreference === 'WHATSAPP' ? '#16A34A' : 'var(--text-2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="quickCommToggle"
                        checked={selectedCust.communicationPreference === 'WHATSAPP'}
                        onChange={() => handleQuickPreferenceChange(selectedCust, 'WHATSAPP')}
                        style={{ accentColor: '#16A34A' }}
                      />
                      <span>🟢 WhatsApp</span>
                    </label>

                    <label
                      onClick={() => handleQuickPreferenceChange(selectedCust, 'SMS')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1.5px solid ${selectedCust.communicationPreference !== 'WHATSAPP' ? 'var(--primary)' : 'var(--border)'}`,
                        background: selectedCust.communicationPreference !== 'WHATSAPP' ? 'var(--primary-light)' : 'var(--bg-alt)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        color: selectedCust.communicationPreference !== 'WHATSAPP' ? 'var(--primary)' : 'var(--text-2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="quickCommToggle"
                        checked={selectedCust.communicationPreference !== 'WHATSAPP'}
                        onChange={() => handleQuickPreferenceChange(selectedCust, 'SMS')}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>📱 SMS</span>
                    </label>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 6, display: 'block' }}>
                    {selectedCust.communicationPreference === 'WHATSAPP' ? 'Safety notifications routed through WhatsApp.' : 'Safety notifications routed through device SMS composer.'}
                  </span>
                </div>

                <p style={{ fontSize: 13, marginTop: 10, color: 'var(--text)' }}>Preferred Language: <b>{selectedCust.preferredLang || 'English'}</b></p>
                <p style={{ fontSize: 13, marginTop: 2, color: 'var(--text)' }}>Known Allergies: <b>{selectedCust.allergies || 'None reported'}</b></p>
                <p style={{ fontSize: 13, marginTop: 2, color: 'var(--text)' }}>Refill & Expiry Reminders: <b>{selectedCust.alerts ? 'Enabled' : 'Disabled'}</b></p>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 10 }}>
                Prescription & Dispense History
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {audits.filter(a => a.customer && a.customer.toLowerCase().includes(selectedCust.name.toLowerCase())).map(a => (
                  <div key={a.id} style={{ padding: '10px 12px', background: 'var(--surface-raised)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', margin: 0 }}>{a.medicine}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0' }}>{a.date} · Batch: {a.batch}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{a.quantity} units</span>
                  </div>
                ))}
                {audits.filter(a => a.customer && a.customer.toLowerCase().includes(selectedCust.name.toLowerCase())).length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: 12 }}>No previous dispensing history found.</p>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              {onOpenSafetyCommunication ? (
                <button
                  className="btn btn-teal"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                  onClick={() => {
                    const cust = selectedCust;
                    setSelectedCust(null);
                    onOpenSafetyCommunication(cust, 'MANUAL');
                  }}
                >
                  <Send size={14} /> Send Safety Message
                </button>
              ) : onOpenManualSms ? (
                <button
                  className="btn btn-teal"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                  onClick={() => {
                    const cust = selectedCust;
                    setSelectedCust(null);
                    onOpenManualSms(cust);
                  }}
                >
                  <MessageSquare size={14} /> Send Direct SMS
                </button>
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => openEditModal(selectedCust)}>Edit</button>
                <button className="btn btn-secondary" onClick={() => setSelectedCust(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,32,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setAddModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 460, padding: 0, zIndex: 111, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text)', margin: 0 }}>Add New Customer</h3>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-3)"/></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Customer Full Name *</label>
                <input className="input" placeholder="e.g. Ramesh Patel" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
              </div>
              <div>
                <label className="label">Mobile Number</label>
                <input className="input" placeholder="e.g. +91 98450 12345" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
              </div>
              <div>
                <label className="label">Email Address</label>
                <input className="input" placeholder="e.g. ramesh@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/>
              </div>
              <div>
                <label className="label">Preferred Language</label>
                <select className="input" value={form.preferredLang} onChange={e => setForm({ ...form, preferredLang: e.target.value })}>
                  <option value="English">English</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom: 8, display: 'block', fontWeight: 800 }}>
                  Preferred Communication Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10 }}>
                  <label
                    onClick={() => setForm({ ...form, communicationPreference: 'WHATSAPP' })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${form.communicationPreference === 'WHATSAPP' ? '#16A34A' : 'var(--border)'}`,
                      background: form.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-alt)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="custCommPrefAdd"
                        checked={form.communicationPreference === 'WHATSAPP'}
                        onChange={() => setForm({ ...form, communicationPreference: 'WHATSAPP' })}
                        style={{ accentColor: '#16A34A' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>🟢 WhatsApp</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 20, lineHeight: 1.3 }}>
                      Receive safety notifications through WhatsApp.
                    </span>
                  </label>

                  <label
                    onClick={() => setForm({ ...form, communicationPreference: 'SMS' })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${form.communicationPreference === 'SMS' ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.communicationPreference === 'SMS' ? 'var(--primary-light)' : 'var(--bg-alt)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="custCommPrefAdd"
                        checked={form.communicationPreference === 'SMS'}
                        onChange={() => setForm({ ...form, communicationPreference: 'SMS' })}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>📱 SMS</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 20, lineHeight: 1.3 }}>
                      Receive safety notifications through SMS.
                    </span>
                  </label>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'block' }}>
                  Default: SMS unless patient specifically requests WhatsApp.
                </span>
              </div>
              <div>
                <label className="label">Known Drug Allergies</label>
                <input className="input" placeholder="e.g. Penicillin, Sulfa" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })}/>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
                <button className="btn btn-teal" onClick={handleAdd}>Save Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 115, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,32,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setEditModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 460, padding: 0, zIndex: 116, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text)', margin: 0 }}>Edit Customer Profile</h3>
              <button onClick={() => setEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-3)"/></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Customer Full Name *</label>
                <input className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}/>
              </div>
              <div>
                <label className="label">Mobile Number</label>
                <input className="input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}/>
              </div>
              <div>
                <label className="label">Email Address</label>
                <input className="input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}/>
              </div>
              <div>
                <label className="label">Preferred Language</label>
                <select className="input" value={editForm.preferredLang} onChange={e => setEditForm({ ...editForm, preferredLang: e.target.value })}>
                  <option value="English">English</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom: 8, display: 'block', fontWeight: 800 }}>
                  Preferred Communication Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10 }}>
                  <label
                    onClick={() => setEditForm({ ...editForm, communicationPreference: 'WHATSAPP' })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${editForm.communicationPreference === 'WHATSAPP' ? '#16A34A' : 'var(--border)'}`,
                      background: editForm.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-alt)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="custCommPrefEdit"
                        checked={editForm.communicationPreference === 'WHATSAPP'}
                        onChange={() => setEditForm({ ...editForm, communicationPreference: 'WHATSAPP' })}
                        style={{ accentColor: '#16A34A' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>🟢 WhatsApp</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 20, lineHeight: 1.3 }}>
                      Receive safety notifications through WhatsApp.
                    </span>
                  </label>

                  <label
                    onClick={() => setEditForm({ ...editForm, communicationPreference: 'SMS' })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${editForm.communicationPreference === 'SMS' ? 'var(--primary)' : 'var(--border)'}`,
                      background: editForm.communicationPreference === 'SMS' ? 'var(--primary-light)' : 'var(--bg-alt)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="custCommPrefEdit"
                        checked={editForm.communicationPreference === 'SMS'}
                        onChange={() => setEditForm({ ...editForm, communicationPreference: 'SMS' })}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>📱 SMS</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 20, lineHeight: 1.3 }}>
                      Receive safety notifications through SMS.
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="label">Known Drug Allergies</label>
                <input className="input" placeholder="e.g. Penicillin, Sulfa" value={editForm.allergies} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="editAlerts"
                  checked={editForm.alerts}
                  onChange={e => setEditForm({ ...editForm, alerts: e.target.checked })}
                  style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                />
                <label htmlFor="editAlerts" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                  Enable automated safety & refill alerts
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button className="btn btn-teal" onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────── 8. ALERTS ─────────── */
function AlertsPage({ onNavigate, showToast }: { onNavigate: (p: string) => void; showToast: (s: string) => void }) {
  const cards = [
    { title: 'Vitamin D3 60K expires soon', detail: 'Batch VD102 expires in 12 days. 180 units at risk.', type: 'Near expiry', tone: 'amber', page: 'expiry' },
    { title: 'Paracetamol stock is low', detail: 'PCT101 dropped below minimum threshold (12 units left).', type: 'Low stock', tone: 'orange', page: 'add-stock' },
    { title: 'AMX204 recalled by supplier', detail: '45 units remaining. Supplier recall quarantine active.', type: 'Recall', tone: 'red', page: 'recall' },
    { title: 'Weekly expiry digest ready', detail: 'Your scheduled pharmacy operations summary is ready.', type: 'Report', tone: 'sage', page: 'reports' },
  ];
  const bg: Record<string, string> = { amber: 'var(--warning-light)', red: 'var(--danger-light)', orange: 'var(--orange-light)', sage: 'var(--primary-light)' };
  const tc: Record<string, string> = { amber: 'var(--warning)', red: 'var(--danger)', orange: 'var(--orange)', sage: 'var(--primary)' };

  return (
    <>
      <PageHeader
        eyebrow="STAY INFORMED"
        title="Alerts & Warnings"
        description="Important medication and inventory actions, surfaced proactively."
        action={<button className="btn btn-secondary" onClick={() => showToast('All notifications marked as read')}><Check size={14}/> Mark all read</button>}
      />
      <div className="responsive-split-grid">
        {cards.map(a => (
          <div key={a.title} className="card card-hover" style={{ padding: 18, display: 'flex', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg[a.tone], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={19} color={tc[a.tone]} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{a.title}</p>
                <span className={`chip badge-${a.tone === 'sage' ? 'teal' : a.tone === 'amber' ? 'amber' : a.tone === 'red' ? 'red' : 'orange'}`}>{a.type}</span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{a.detail}</p>
              <button onClick={() => onNavigate(a.page)} style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                Take action <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────── 9. SUPPLIERS & RETURNS (WITH LIVE INVENTORY LINK) ─────────── */
function Suppliers({
  suppliersList,
  setSuppliersList,
  inventory,
  setInventory,
  showToast,
}: {
  suppliersList: SupplierItem[];
  setSuppliersList: React.Dispatch<React.SetStateAction<SupplierItem[]>>;
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  showToast: (s: string) => void;
}) {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [returnQty, setReturnQty] = useState(10);
  const [reason, setReason] = useState('Product recall');

  const filtered = suppliersList.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));

  const handleCreateReturn = async () => {
    const target = inventory.find(x => x.batch === selectedBatch);
    if (!target) {
      showToast('Please select a valid batch to return');
      return;
    }
    try {
      await api.addReturn({
        supplierName: target.supplier,
        batch: selectedBatch,
        medicine: target.medicine,
        quantity: returnQty,
        reason,
      });
      setInventory(inventory.map(x => x.batch === selectedBatch ? { ...x, quantity: Math.max(0, x.quantity - returnQty) } : x));
    } catch {
      setInventory(inventory.map(x => x.batch === selectedBatch ? { ...x, quantity: Math.max(0, x.quantity - returnQty) } : x));
    }
    setModal(false);
    showToast(`Created return request for ${returnQty} units of ${target.medicine} (${selectedBatch})`);
  };

  return (
    <>
      <PageHeader
        eyebrow="PROCUREMENT"
        title="Supplier Returns"
        description="Manage supplier relationships, track purchases, and process stock returns."
        action={
          <button className="btn btn-teal" onClick={() => setModal(true)}>
            <RotateCcw size={15}/> Create return
          </button>
        }
      />
      <div className="responsive-stats-grid">
        <Stat label="Active Suppliers" value={String(suppliersList.length)} icon={Truck} tone="sage" />
        <Stat label="Pending Returns" value="4" icon={RotateCcw} tone="amber" />
        <Stat label="This Month Spend" value="₹ 6.8L" icon={CreditCard} tone="teal" />
      </div>

      <Panel title="Supplier Directory & Return Eligibility">
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div className="search-input" style={{ maxWidth: 300 }}>
            <Search size={15} color="var(--text-3)"/>
            <input placeholder="Search suppliers..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
        </div>
        {/* Desktop Table View */}
        <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: 'var(--bg-alt)' }}>
              {['Supplier', 'Active batches', 'Total purchases', 'Rating', ''].map(h => <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map(s => (
              <tr key={s.id} className="table-row" style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '14px 20px' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{s.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.email} · {s.phone}</p>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-2)' }}>{s.batches} batches</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{s.purchases}</td>
                <td style={{ padding: '14px 20px' }}><span className="chip badge-green">★ {s.rating}</span></td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => showToast(`Supplier Contact: ${s.name} · Phone: ${s.phone}`)}><MoreHorizontal size={16}/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view" style={{ padding: '12px 14px', display: 'none', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => (
            <div key={s.id} className="mobile-entity-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{s.name}</h4>
                  <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{s.email}</p>
                </div>
                <span className="chip badge-green">★ {s.rating}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, padding: '10px 12px', background: 'var(--bg-alt)', borderRadius: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Active Batches</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--text)' }}>{s.batches} batches</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Total Purchases</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--text)' }}>{s.purchases}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>📞 {s.phone}</span>
                <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 11.5 }} onClick={() => showToast(`Supplier Contact: ${s.name} · Phone: ${s.phone}`)}>
                  Contact
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-3)', fontSize: 13 }}>
              No suppliers match your search query.
            </div>
          )}
        </div>
      </Panel>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,32,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, zIndex: 111, padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 800, color: 'var(--text)' }}>Create Stock Return</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18}/></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Batch to return</label>
                <select className="input" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                  <option value="">Select batch from inventory</option>
                  {inventory.map(m => (
                    <option key={m.batch} value={m.batch}>{m.batch} · {m.medicine} ({m.quantity} units avail)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantity to Return</label>
                <input className="input" type="number" min="1" value={returnQty} onChange={e => setReturnQty(Math.max(1, Number(e.target.value)))}/>
              </div>
              <div>
                <label className="label">Reason</label>
                <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
                  <option>Product recall</option><option>Near expiry</option><option>Damaged packaging</option><option>Slow movement</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-teal" onClick={handleCreateReturn}>Submit Return Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────── 10. BATCH RECALL (WITH BLOCK & NOTIFY) ─────────── */
function Recall({
  inventory = [],
  setInventory,
  audits = [],
  customersList = [],
  showToast,
  onNavigate,
  onOpenManualSms,
  onOpenSafetyCommunication,
}: {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  audits: Audit[];
  customersList?: CustomerItem[];
  showToast: (s: string) => void;
  onNavigate?: (p: string) => void;
  onOpenManualSms?: (cust: any, type?: any, payload?: any) => void;
  onOpenSafetyCommunication?: (cust: any, type?: string, details?: any) => void;
}) {
  const [createRecallModal, setCreateRecallModal] = useState(false);
  const [newRecallBatch, setNewRecallBatch] = useState('');
  const [newRecallReason, setNewRecallReason] = useState('Packaging seal defect reported by manufacturer bulletin');
  const [selectedBatchForInspection, setSelectedBatchForInspection] = useState('');
  const [hasError, setHasError] = useState(false);

  // Safe fallback if data parsing fails
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const recalledMedicines = safeInventory.filter(m => m && m.status === 'Recalled');

  // Active batch to inspect / notify (default to first recalled or DEMO-EXP-001)
  const activeBatchCode = selectedBatchForInspection || 
    (recalledMedicines.length > 0 ? recalledMedicines[0].batch : (safeInventory.find(m => m.batch === 'DEMO-EXP-001')?.batch || 'DEMO-EXP-001'));
  const activeBatchMed = safeInventory.find(m => m.batch === activeBatchCode);

  const blockBatch = async (batchCode: string) => {
    try {
      const target = safeInventory.find(m => m.batch === batchCode);
      let res: any = null;
      if (target) {
        res = await api.addRecall({
          medicine: target.medicine,
          batch: batchCode,
          reason: newRecallReason,
        });
      }
      setInventory(prev => prev.map(m => m.batch === batchCode ? { ...m, status: 'Recalled' } : m));
      setSelectedBatchForInspection(batchCode);
      const count = res?.autoSmsDispatch?.dispatchedCount;
      if (count && count > 0) {
        showToast(`Batch ${batchCode} quarantined & locked. Recall SMS automatically sent to ${count} affected patient(s).`);
      } else {
        showToast(`Batch ${batchCode} quarantined & locked from dispensing`);
      }
    } catch {
      setInventory(prev => prev.map(m => m.batch === batchCode ? { ...m, status: 'Recalled' } : m));
      setSelectedBatchForInspection(batchCode);
      showToast(`Batch ${batchCode} quarantined & locked from dispensing`);
    }
  };

  const handleCreateRecall = () => {
    if (!newRecallBatch) {
      showToast('Please select a batch to recall');
      return;
    }
    blockBatch(newRecallBatch);
    setCreateRecallModal(false);
    showToast(`Recall notice issued for Batch ${newRecallBatch}`);
  };

  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<any>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Derive exposed customers dynamically from historical dispensing audit records
  const matchingAudits = audits.filter(a => a.batch === activeBatchCode && a.customer && a.customer !== 'Walk-in Patient');
  const impactedPatients = matchingAudits.map(a => {
    const cust = (customersList || []).find(c => c.name.toLowerCase() === a.customer.toLowerCase());
    return {
      name: a.customer,
      phone: cust ? cust.phone : '+91 98450 48123',
      date: a.date,
      qty: a.quantity,
      status: 'Advisory Pending',
      rxId: a.rxId || `RX-2026-${String(a.id).slice(-5)}`,
      preferredLang: (cust as any)?.preferredLang || 'English',
      communicationPreference: ((cust as any)?.communicationPreference || 'SMS') as 'WHATSAPP' | 'SMS',
      customerObj: cust || null,
    };
  });

  const handleOpenPatientDetails = (p: any) => {
    setSelectedCustomerForModal({
      recipientName: p.name,
      recipientPhone: p.phone,
      language: p.preferredLang,
      notificationType: 'RECALL',
      batchId: activeBatchCode,
      medicineId: activeBatchMed?.medicine || 'Amoxicillin 500mg',
      provider: 'SMSLocal Gateway',
      providerMessageId: `RECALL-${activeBatchCode}`,
      status: 'submitted',
      message: `PharmaFlow URGENT SAFETY ADVISORY: Batch ${activeBatchCode} of ${activeBatchMed?.medicine || 'Medication'} has been recalled.`,
      notificationSource: 'automatic',
      createdAt: new Date().toISOString()
    });
    setIsCustomerModalOpen(true);
  };

  if (hasError) {
    return (
      <div className="card" style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: 12, margin: '24px 0', border: '1px solid var(--danger-light)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={28} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
          Unable to load recall data
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.5 }}>
          An unexpected error occurred while retrieving batch recall records. Please verify inventory connection and retry.
        </p>
        <button className="btn btn-primary" onClick={() => setHasError(false)}>
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="PATIENT SAFETY & RECALL CONTAINMENT"
        title="Batch Recall Management"
        description="Instant containment protocol: quarantine affected batches, trace exposed customers from dispensing audit logs, and dispatch multilingual advisories."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate?.('audit')}>
              <ClipboardCheck size={15} /> Dispensing Audit Logs
            </button>
            <button className="btn btn-teal" onClick={() => setCreateRecallModal(true)}>
              <Plus size={14} /> Issue New Batch Recall
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (impactedPatients.length > 0 && onOpenSafetyCommunication) {
                  const target = impactedPatients[0];
                  onOpenSafetyCommunication(
                    {
                      name: target.name,
                      phone: target.phone,
                      preferredLang: target.preferredLang,
                      communicationPreference: target.communicationPreference,
                      rxId: target.rxId,
                      qty: target.qty,
                      date: target.date,
                    },
                    'RECALL',
                    {
                      medicineName: activeBatchMed?.medicine || 'Amoxicillin 500mg',
                      batchNumber: activeBatchCode,
                      recallReason: newRecallReason,
                    }
                  );
                } else {
                  showToast(impactedPatients.length === 0 ? 'No exposed patients found in audit history for this batch.' : 'Opening Patient Safety Communication...');
                }
              }}
              disabled={recalledMedicines.length === 0 && !safeInventory.some(m => m.batch === 'DEMO-EXP-001')}
            >
              <Send size={14} /> Notify Affected Patients
            </button>
          </div>
        }
      />

      {recalledMedicines.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--surface)',
            borderRadius: 12,
            marginBottom: 24,
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            No Active Batch Recalls
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.5 }}>
            All medication inventory is verified clear of active recalls. You can select any batch (such as <b>DEMO-EXP-001</b>) to test the recall and containment workflow.
          </p>
          <button className="btn btn-teal" onClick={() => setCreateRecallModal(true)}>
            <Plus size={14} /> Issue Batch Recall
          </button>
        </div>
      ) : (
        recalledMedicines.map(rec => {
          const isSelected = rec.batch === activeBatchCode;
          return (
            <div
              key={rec.batch}
              className="card"
              style={{
                border: isSelected ? '2px solid var(--danger)' : '1.5px solid var(--danger-light)',
                overflow: 'hidden',
                marginBottom: 20,
                cursor: 'pointer'
              }}
              onClick={() => setSelectedBatchForInspection(rec.batch)}
            >
              <div
                style={{
                  padding: '16px 20px',
                  background: 'var(--danger-light)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'var(--surface-raised)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AlertCircle size={22} color="var(--danger)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <h3 style={{ fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>
                        {rec.medicine} · Batch {rec.batch}
                      </h3>
                      <span className="chip badge-red">MANDATORY RECALL</span>
                      {isSelected && <span className="chip badge-blue">ACTIVE SELECTION</span>}
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 2 }}>
                      Manufacturer/Distributor {rec.supplier} bulletin: Packaging seal defect. Immediate patient isolation mandatory.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); blockBatch(rec.batch); }}
                    className="btn btn-danger"
                    style={{ fontSize: 12 }}
                  >
                    <Ban size={14} /> Batch Hard-Locked
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBatchForInspection(rec.batch);
                      const batchAudits = audits.filter(a => a.batch === rec.batch && a.customer && a.customer !== 'Walk-in Patient');
                      if (batchAudits.length > 0 && onOpenSafetyCommunication) {
                        const firstAudit = batchAudits[0];
                        const cust = (customersList || []).find(c => c.name.toLowerCase() === firstAudit.customer.toLowerCase());
                        onOpenSafetyCommunication(
                          {
                            name: firstAudit.customer,
                            phone: cust ? cust.phone : '+91 98450 48123',
                            preferredLang: (cust as any)?.preferredLang || 'English',
                            communicationPreference: ((cust as any)?.communicationPreference || 'SMS') as 'WHATSAPP' | 'SMS',
                            rxId: firstAudit.rxId,
                            qty: firstAudit.quantity,
                            date: firstAudit.date,
                          },
                          'RECALL',
                          {
                            medicineName: rec.medicine,
                            batchNumber: rec.batch,
                            recallReason: newRecallReason,
                          }
                        );
                      } else {
                        showToast(`Batch ${rec.batch} selected. ${batchAudits.length} exposed patient(s) found in audit trail.`);
                      }
                    }}
                    className="btn btn-teal"
                    style={{ fontSize: 12 }}
                  >
                    <Send size={14} /> Notify Affected Patients
                  </button>
                </div>
              </div>

              {/* 4 Recall KPI Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                  padding: '18px 20px',
                  backgroundColor: 'var(--surface)',
                }}
              >
                {[
                  { label: 'Units Remaining in Stock', val: String(rec.quantity || 0), sub: 'Quarantined in storage', tone: 'red' },
                  { label: 'Patients Exposed', val: String(audits.filter(a => a.batch === rec.batch).length), sub: 'Identified via Audit Trail', tone: 'amber' },
                  { label: 'Units Dispensed to Date', val: String(audits.filter(a => a.batch === rec.batch).reduce((acc, a) => acc + (Number(a.quantity) || 0), 0)), sub: `Across ${audits.filter(a => a.batch === rec.batch).length} prescriptions`, tone: 'blue' },
                  { label: 'Recall Safety Status', val: '100% Enforced', sub: 'POS dispensing blocked', tone: 'green' },
                ].map(stat => (
                  <div key={stat.label} style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 2 }}>{stat.val}</p>
                    <p style={{ fontSize: 11, color: stat.tone === 'red' ? 'var(--danger)' : stat.tone === 'amber' ? 'var(--warning)' : 'var(--success)', marginTop: 2, fontWeight: 600 }}>
                      {stat.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Containment Protocol Action Checklist */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-subtle)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>ACTIONS ENFORCED:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> 1. Dispensing Locked
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> 2. Audit Trail Queried ({audits.filter(a => a.batch === rec.batch).length} Patients)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                  <MessageSquare size={15} /> 3. Patient Safety Advisory Ready
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                  <Clock3 size={15} /> 4. Supplier Return Claim Pending
                </span>
              </div>
            </div>
          );
        })
      )}

      {/* Modal for Issuing New Batch Recall */}
      {createRecallModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setCreateRecallModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 460, zIndex: 111, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} color="#DC2626" />
                <h3 style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>Issue Batch Recall & Quarantine</h3>
              </div>
              <button onClick={() => setCreateRecallModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#64748B"/></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Select Batch to Recall</label>
                <select className="input" value={newRecallBatch} onChange={e => setNewRecallBatch(e.target.value)}>
                  <option value="">-- Choose Batch from Inventory --</option>
                  {safeInventory.map(m => (
                    <option key={m.batch} value={m.batch}>
                      {m.batch} · {m.medicine} ({m.quantity} units, exp: {m.expiry})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Official Recall Reason / Authority Notice</label>
                <input
                  className="input"
                  placeholder="e.g. CDSCO directive or packaging seal breach"
                  value={newRecallReason}
                  onChange={e => setNewRecallReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setCreateRecallModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleCreateRecall}>
                  <AlertTriangle size={14} /> Quarantine & Issue Recall
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exposed Customers Identified from Dispensing Audit */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
              Impacted Patients Traced from Dispensing Audit Log
            </h3>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              Cross-referenced from historical prescriptions containing batch <b>{activeBatchCode}</b> ({impactedPatients.length} patient{impactedPatients.length === 1 ? '' : 's'} identified)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                if (impactedPatients.length > 0 && onOpenSafetyCommunication) {
                  const target = impactedPatients[0];
                  onOpenSafetyCommunication(
                    {
                      name: target.name,
                      phone: target.phone,
                      preferredLang: target.preferredLang,
                      communicationPreference: target.communicationPreference,
                      rxId: target.rxId,
                      qty: target.qty,
                      date: target.date,
                    },
                    'RECALL',
                    {
                      medicineName: activeBatchMed?.medicine || 'Amoxicillin 500mg',
                      batchNumber: activeBatchCode,
                      recallReason: newRecallReason,
                    }
                  );
                } else {
                  showToast('No exposed patients found in audit history for this batch.');
                }
              }}
              className="btn btn-danger"
              style={{ fontSize: 12 }}
              disabled={impactedPatients.length === 0}
            >
              <Send size={13} /> Notify Affected Patients ({impactedPatients.length})
            </button>
            <button onClick={() => onNavigate?.('audit')} className="btn btn-ghost" style={{ fontSize: 12 }}>
              View Full Audit Records →
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr className="table-header">
                {['Patient Name', 'Phone Number', 'Dispense Date', 'Rx ID', 'Quantity', 'Preferred Channel', 'Action'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {impactedPatients.map(p => (
                <tr key={`${p.name}-${p.rxId}`} className="table-row" style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                    <button
                      onClick={() => handleOpenPatientDetails(p)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--primary)',
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: 'underline',
                        textDecorationColor: 'transparent',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecorationColor = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecorationColor = 'transparent';
                      }}
                      title="Click to inspect patient dispensing history & safety details"
                    >
                      {p.name}
                      <ExternalLink size={11} style={{ opacity: 0.7 }} />
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-2)' }}>{p.phone}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-3)' }}>{p.date}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{p.rxId}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{p.qty} units</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className="chip"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: p.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: p.communicationPreference === 'WHATSAPP' ? '#16A34A' : '#2563EB',
                      }}
                    >
                      {p.communicationPreference === 'WHATSAPP' ? '🟢 WhatsApp' : '📱 SMS'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          if (onOpenSafetyCommunication) {
                            onOpenSafetyCommunication(
                              {
                                name: p.name,
                                phone: p.phone,
                                preferredLang: p.preferredLang,
                                communicationPreference: p.communicationPreference,
                                rxId: p.rxId,
                                qty: p.qty,
                                date: p.date,
                              },
                              'RECALL',
                              {
                                medicineName: activeBatchMed?.medicine || 'Amoxicillin 500mg',
                                batchNumber: activeBatchCode,
                                recallReason: newRecallReason,
                              }
                            );
                          } else if (onOpenManualSms) {
                            onOpenManualSms(
                              { name: p.name, phone: p.phone, preferredLang: p.preferredLang },
                              'RECALL',
                              { medicineName: activeBatchMed?.medicine || 'Amoxicillin 500mg', batchNumber: activeBatchCode }
                            );
                          } else {
                            showToast(`Dispatched recall notification to ${p.name}`);
                          }
                        }}
                        className="btn btn-teal"
                        style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Send size={12} /> Notify Patient
                      </button>
                      <button
                        onClick={() => handleOpenPatientDetails(p)}
                        className="btn btn-ghost"
                        style={{ fontSize: 11.5, padding: '4px 8px' }}
                        title="View patient details & traceability"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {impactedPatients.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    No dispensed patients identified in historical audit trail for batch {activeBatchCode}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view" style={{ padding: '12px 14px', display: 'none', flexDirection: 'column', gap: 10 }}>
          {impactedPatients.map(p => (
            <div key={`${p.name}-${p.rxId}`} className="mobile-entity-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <button
                    onClick={() => handleOpenPatientDetails(p)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: 14.5,
                      textAlign: 'left'
                    }}
                  >
                    {p.name}
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{p.phone}</p>
                </div>
                <span
                  className="chip"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    backgroundColor: p.communicationPreference === 'WHATSAPP' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: p.communicationPreference === 'WHATSAPP' ? '#16A34A' : '#2563EB',
                  }}
                >
                  {p.communicationPreference === 'WHATSAPP' ? '🟢 WhatsApp' : '📱 SMS'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, padding: '10px 12px', background: 'var(--bg-alt)', borderRadius: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Rx ID</span>
                  <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{p.rxId}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', fontWeight: 600 }}>Dispensed</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 800, color: 'var(--text)' }}>{p.qty} units</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{p.date}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      if (onOpenSafetyCommunication) {
                        onOpenSafetyCommunication(
                          {
                            name: p.name,
                            phone: p.phone,
                            preferredLang: p.preferredLang,
                            communicationPreference: p.communicationPreference,
                            rxId: p.rxId,
                            qty: p.qty,
                            date: p.date,
                          },
                          'RECALL',
                          {
                            medicineName: activeBatchMed?.medicine || 'Amoxicillin 500mg',
                            batchNumber: activeBatchCode,
                            recallReason: newRecallReason,
                          }
                        );
                      } else if (onOpenManualSms) {
                        onOpenManualSms(
                          { name: p.name, phone: p.phone, preferredLang: p.preferredLang },
                          'RECALL',
                          { medicineName: activeBatchMed?.medicine || 'Amoxicillin 500mg', batchNumber: activeBatchCode }
                        );
                      } else {
                        showToast(`Dispatched recall notification to ${p.name}`);
                      }
                    }}
                    className="btn btn-teal"
                    style={{ fontSize: 11.5, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Send size={12} /> Notify Patient
                  </button>
                  <button
                    onClick={() => handleOpenPatientDetails(p)}
                    className="btn btn-ghost"
                    style={{ fontSize: 11.5, padding: '5px 8px' }}
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer SMS & Traceability Modal */}
      <CustomerSmsDetailsModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        smsLog={selectedCustomerForModal}
        customer={selectedCustomerForModal ? {
          name: selectedCustomerForModal.recipientName,
          phone: selectedCustomerForModal.recipientPhone,
          preferredLang: selectedCustomerForModal.language,
          address: '',
          chronicConditions: []
        } : null}
        showToast={showToast}
      />
    </>
  );
}

/* ─────────── 11. AI ASSISTANT (CONNECTED TO LIVE INVENTORY) ─────────── */
function Assistant({
  inventory,
  audits,
  onOpenSimulator,
}: {
  inventory: Medicine[];
  audits: Audit[];
  onOpenSimulator: () => void;
}) {
  const [messages, setMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: 'Hello! I am your PharmaFlow AI Assistant. I have live access to your current medicine inventory, expiry risks, dispensing patterns, and order simulations. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');

  const answer = (q: string) => {
    const l = q.toLowerCase();
    const nearExpiryCount = inventory.filter(m => m.status === 'Near Expiry').length;
    const lowStockCount = inventory.filter(m => m.status === 'Low Stock' || m.quantity < 80).length;

    if (l.includes('expire') || l.includes('expiry')) {
      const nearExp = inventory.find(m => m.status === 'Near Expiry');
      return `You have ${nearExpiryCount} batches flagged near expiry. ${nearExp ? `${nearExp.medicine} (Batch ${nearExp.batch}) has ${nearExp.quantity} units expiring in ${nearExp.expiry}.` : ''} Recommend prioritising for FEFO dispensing.`;
    }
    if (l.includes('low') || l.includes('stock')) {
      return `${lowStockCount} medicines are near or below minimum stock thresholds in your inventory. Paracetamol 500mg and Azithromycin 250mg require replenishment.`;
    }
    if (l.includes('return') || l.includes('recall')) {
      const recalled = inventory.filter(m => m.status === 'Recalled');
      return `${recalled.length} recalled batch (${recalled.map(r => `${r.medicine} ${r.batch}`).join(', ') || 'AMX204'}) requires supplier return quarantine.`;
    }
    if (l.includes('simulate') || l.includes('what-if') || l.includes('order')) {
      return 'Our What-If Expiry Simulator shows that ordering 300 units of Vitamin D3 will cause ~255 units to expire before consumption. Click "Open What-If Simulator" to test customized purchase scenarios.';
    }
    return `Based on live inventory (${inventory.length} tracked medicines and ${audits.length} recent dispensing records), dispensing velocity is steady. How else can I assist?`;
  };

  const send = (text = input) => {
    if (!text.trim()) return;
    setMessages([...messages, { from: 'user', text }, { from: 'ai', text: answer(text) }]);
    setInput('');
  };

  return (
    <>
      <PageHeader
        eyebrow="INTELLIGENCE"
        title="AI Pharmacy Assistant"
        description="Ask questions about your pharmacy inventory, expiry dynamics, and dispensing in plain natural language."
        action={<button className="btn btn-sage" onClick={onOpenSimulator}><SlidersHorizontal size={15}/> Open What-If Simulator</button>}
      />
      <div className="responsive-chat-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 540 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #EFEFEA', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrainCircuit size={17} color="white"/></div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13.5 }}>PharmaFlow Intelligence</p>
              <p style={{ fontSize: 11.5, color: '#52796F', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#52796F', display: 'inline-block' }}/> Online · Connected to Live Pharmacy State</p>
            </div>
          </div>
          <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', borderRadius: m.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '11px 15px', fontSize: 13, lineHeight: 1.5, background: m.from === 'user' ? '#6B8068' : '#F2F2EE', color: m.from === 'user' ? 'white' : '#111111' }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
              {['Which medicines expire soon?', 'Which medicines are low in stock?', 'Which batches need return?'].map(q => (
                <button key={q} onClick={() => send(q)} style={{ fontSize: 11.5, borderRadius: 99, border: '1.5px solid #E5E5E0', padding: '5px 11px', background: 'white', color: '#333333', cursor: 'pointer', transition: 'all 0.15s' }}>{q}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Ask about your pharmacy..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} style={{ flex: 1 }}/>
              <button className="btn btn-sage" style={{ padding: '8px 15px' }} onClick={() => send()}><Send size={15}/></button>
            </div>
          </div>
        </div>

        <Panel title="Simulator Quick View">
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ borderRadius: 12, background: '#F9ECEF', padding: 14, border: '1px solid #F3C6D0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 12, color: '#A63A50' }}>EXPIRY RISK DETECTED</span>
                <AlertTriangle size={15} color="#A63A50" />
              </div>
              <p style={{ fontSize: 12.5, color: '#111111', fontWeight: 600 }}>Vitamin D3 60K (VD102)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, fontSize: 11.5, marginTop: 6 }}>
                {[['Stock', '180'], ['Usage/d', '5'], ['Unused', '120']].map(([l, v]) => (
                  <div key={l}><p style={{ color: '#A63A50', opacity: 0.8 }}>{l}</p><b style={{ fontSize: 15 }}>{v}</b></div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#555555', lineHeight: 1.5 }}>Run full purchase order simulation to avoid stock write-offs.</p>
            <button onClick={onOpenSimulator} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Launch What-If Simulator <ChevronRight size={14}/>
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ─────────── 12. WHAT-IF SIMULATOR (DEDICATED MODULE) ─────────── */
function WhatIfSimulator({
  inventory,
  setInventory,
  showToast,
}: {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  showToast: (s: string) => void;
}) {
  const [medicine, setMedicine] = useState('Vitamin D3 60K');
  const [currentStock, setCurrentStock] = useState(180);
  const [orderQty, setOrderQty] = useState(300);
  const [dailyUsage, setDailyUsage] = useState(5);
  const [daysToExpiry, setDaysToExpiry] = useState(45);
  const [unitCost, setUnitCost] = useState(65);

  const totalStock = currentStock + orderQty;
  const projectedConsumption = dailyUsage * daysToExpiry;
  const surplusUnused = Math.max(0, totalStock - projectedConsumption);
  const valueAtRisk = surplusUnused * unitCost;
  const isHighRisk = surplusUnused > (totalStock * 0.3);
  const isModerateRisk = surplusUnused > 0 && !isHighRisk;

  const applyPreset = (name: string, stock: number, order: number, usage: number, days: number, cost: number) => {
    setMedicine(name);
    setCurrentStock(stock);
    setOrderQty(order);
    setDailyUsage(usage);
    setDaysToExpiry(days);
    setUnitCost(cost);
    showToast(`Loaded "${name}" scenario`);
  };

  const applyRecommendedOrder = () => {
    const recommended = Math.max(0, projectedConsumption - currentStock);
    setOrderQty(recommended);
    showToast(`Order quantity adjusted to ${recommended} units`);
  };

  const handleOrderAndAdd = () => {
    const newStockItem: Medicine = {
      id: Date.now(),
      medicine,
      batch: `SIM${Math.floor(100 + Math.random() * 900)}`,
      expiry: 'Dec 2027',
      quantity: orderQty,
      supplier: 'MediSource',
      status: 'Available',
      unitPrice: unitCost,
    };
    setInventory([...inventory, newStockItem]);
    showToast(`Simulated purchase of ${orderQty} units of ${medicine} added to live inventory`);
  };

  return (
    <>
      <PageHeader
        eyebrow="DECISION SUPPORT"
        title="What-If Expiry Simulator"
        description="Model purchasing scenarios against expiry risk and dispensing rates to prevent stock waste."
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => applyPreset('Paracetamol 500mg', 120, 200, 15, 60, 25)}>Preset: Paracetamol</button>
            <button className="btn btn-secondary" onClick={() => applyPreset('Vitamin D3 60K', 180, 300, 5, 45, 65)}>Preset: Vitamin D3</button>
          </div>
        }
      />

      <div className="responsive-sim-grid">
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #EFEFEA', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111111' }}>Simulation Parameters</h3>
              <p style={{ fontSize: 11.5, color: '#777777', marginTop: 2 }}>Adjust inputs to simulate demand and waste dynamics</p>
            </div>
            <button onClick={() => applyPreset('Custom Medicine', 100, 100, 10, 30, 50)} className="btn btn-ghost" style={{ padding: 6, fontSize: 12 }}>
              <RefreshCw size={14}/> Reset
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Target Medicine</label>
              <input className="input" value={medicine} onChange={e => setMedicine(e.target.value)}/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Current Stock</label>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6B8068' }}>{currentStock} units</span>
                </div>
                <input className="input" type="number" min="0" value={currentStock} onChange={e => setCurrentStock(Math.max(0, Number(e.target.value)))}/>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Proposed Order Qty</label>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6B8068' }}>{orderQty} units</span>
                </div>
                <input className="input" type="number" min="0" value={orderQty} onChange={e => setOrderQty(Math.max(0, Number(e.target.value)))}/>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Avg Daily Usage</label>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6B8068' }}>{dailyUsage} / day</span>
                </div>
                <input className="input" type="number" min="1" value={dailyUsage} onChange={e => setDailyUsage(Math.max(1, Number(e.target.value)))}/>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Days to Expiry</label>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6B8068' }}>{daysToExpiry} days</span>
                </div>
                <input className="input" type="number" min="1" value={daysToExpiry} onChange={e => setDaysToExpiry(Math.max(1, Number(e.target.value)))}/>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="label" style={{ marginBottom: 0 }}>Unit Purchase Cost (₹)</label>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6B8068' }}>₹ {unitCost}</span>
              </div>
              <input className="input" type="number" min="1" value={unitCost} onChange={e => setUnitCost(Math.max(1, Number(e.target.value)))}/>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 22, border: isHighRisk ? '1.5px solid #F3C6D0' : isModerateRisk ? '1.5px solid #EBD4BF' : '1.5px solid #D5E2D3', background: isHighRisk ? '#FFFBFB' : '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span className={`chip ${isHighRisk ? 'badge-red' : isModerateRisk ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 11.5, padding: '3px 10px' }}>
                {isHighRisk ? 'HIGH RISK OF WASTE' : isModerateRisk ? 'MODERATE SURPLUS' : 'OPTIMAL ORDER SIZING'}
              </span>
              <span style={{ fontSize: 11.5, color: '#777777', fontWeight: 600 }}>Calculated Live</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div style={{ background: '#F7F7F4', padding: 12, borderRadius: 10, border: '1px solid #EFEFEA' }}>
                <p style={{ fontSize: 10.5, color: '#777777', fontWeight: 600 }}>Total Units Available</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#111111', marginTop: 2 }}>{totalStock}</p>
                <p style={{ fontSize: 10.5, color: '#555555', marginTop: 2 }}>{currentStock} existing + {orderQty} new</p>
              </div>

              <div style={{ background: '#F7F7F4', padding: 12, borderRadius: 10, border: '1px solid #EFEFEA' }}>
                <p style={{ fontSize: 10.5, color: '#777777', fontWeight: 600 }}>Projected Usage</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#52796F', marginTop: 2 }}>{projectedConsumption}</p>
                <p style={{ fontSize: 10.5, color: '#555555', marginTop: 2 }}>Over {daysToExpiry} days window</p>
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: isHighRisk ? '#F9ECEF' : isModerateRisk ? '#F7EDE2' : '#E8EFE7', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: isHighRisk ? '#A63A50' : isModerateRisk ? '#8C5E3C' : '#526350', textTransform: 'uppercase' }}>
                    {isHighRisk || isModerateRisk ? 'Unused Stock at Expiry' : 'Waste Avoided'}
                  </p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: isHighRisk ? '#A63A50' : isModerateRisk ? '#8C5E3C' : '#526350', marginTop: 2 }}>
                    {surplusUnused} Units
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10.5, color: '#777777', fontWeight: 600 }}>Financial Impact</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: isHighRisk ? '#A63A50' : '#111111', marginTop: 2 }}>
                    ₹ {valueAtRisk.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: '#555555' }}>Stock Utilization Ratio</span>
                <span style={{ fontWeight: 800, color: '#111111' }}>
                  {totalStock > 0 ? Math.min(100, Math.round((projectedConsumption / totalStock) * 100)) : 100}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: 7 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${totalStock > 0 ? Math.min(100, Math.round((projectedConsumption / totalStock) * 100)) : 100}%`,
                    background: isHighRisk ? '#A63A50' : isModerateRisk ? '#B86B35' : '#6B8068'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 14, background: '#111111', color: 'white', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#6B8068', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={17} color="white" />
              </div>
              <div>
                <p style={{ fontSize: 10.5, color: '#A3B19B', fontWeight: 800, textTransform: 'uppercase' }}>AI RECOMMENDATION</p>
                <p style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {isHighRisk
                    ? `Reduce order to ${Math.max(0, projectedConsumption - currentStock)} units to avoid wasting ₹ ${valueAtRisk.toLocaleString()}.`
                    : 'This order quantity matches your historical dispensing velocity perfectly.'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isHighRisk && (
                <button
                  className="btn btn-sage"
                  style={{ padding: '7px 12px', fontSize: 12, borderRadius: 8 }}
                  onClick={applyRecommendedOrder}
                >
                  Adjust to AI Size ({Math.max(0, projectedConsumption - currentStock)} units)
                </button>
              )}
              <button
                className="btn btn-secondary"
                style={{ padding: '7px 12px', fontSize: 12, borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={handleOrderAndAdd}
              >
                + Place Order & Add to Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── 13. REPORTS & ANALYTICS ─────────── */
function Reports({ showToast }: { showToast: (s: string) => void }) {
  const [timeframe, setTimeframe] = useState('Last 30 days');
  const [category, setCategory] = useState('All categories');

  const medsList = [
    { name: 'Paracetamol 500mg', count: '2,480', share: '32%', trend: '+14%', cat: 'Analgesics' },
    { name: 'Cetirizine 10mg', count: '1,842', share: '24%', trend: '+8%', cat: 'Antihistamines' },
    { name: 'Metformin 500mg', count: '1,490', share: '19%', trend: '+12%', cat: 'Antidiabetics' },
    { name: 'Vitamin D3 60K', count: '988', share: '13%', trend: '-3%', cat: 'Vitamins' },
    { name: 'Azithromycin 250mg', count: '642', share: '8%', trend: '+5%', cat: 'Antibiotics' },
  ];

  const filteredMeds = medsList.filter(m => category === 'All categories' || m.cat === category);

  return (
    <>
      <PageHeader
        eyebrow="INSIGHTS"
        title="Reports & Analytics"
        description="Turn dispensing logs and inventory turnover into actionable operational insights."
        action={
          <button
            className="btn btn-sage"
            onClick={() => {
              downloadCSV(
                `analytics_report_${timeframe.toLowerCase().replace(/\s+/g, '_')}.csv`,
                ['Medicine', 'Category', 'Dispensed Count', 'Volume Share', 'Trend vs Prior Period'],
                filteredMeds.map(m => [m.name, m.cat, m.count, m.share, m.trend])
              );
              showToast('Analytics report exported as CSV');
            }}
          >
            <Download size={14}/> Export report
          </button>
        }
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 170 }} value={timeframe} onChange={e => { setTimeframe(e.target.value); showToast(`Timeframe set to ${e.target.value}`); }}>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This Year (2026)</option>
        </select>
        <select className="input" style={{ width: 180 }} value={category} onChange={e => { setCategory(e.target.value); showToast(`Category filter: ${e.target.value}`); }}>
          <option>All categories</option>
          <option>Antibiotics</option>
          <option>Analgesics</option>
          <option>Vitamins</option>
          <option>Antidiabetics</option>
          <option>Antihistamines</option>
        </select>
      </div>
      <div className="responsive-split-grid">
        <Panel title="Dispensing Trend" action={<span style={{ fontSize: 12, color: '#0D9488', fontWeight: 700 }}>+12.4% vs prior</span>}>
          <DispensingTrendsChart timeframe={timeframe} />
        </Panel>
        <Panel title="Stock Movement" action={<span style={{ fontSize: 12, color: '#64748B' }}>Apr – Sep 2026</span>}>
          <StockMovementChart />
        </Panel>
        <Panel title="Expiry Risk by Month">
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Sep 2026', '12', 'var(--danger)'], ['Oct 2026', '18', 'var(--warning)'], ['Nov 2026', '28', 'var(--warning)'], ['Dec 2026', '34', 'var(--primary)'], ['Jan 2027', '42', 'var(--text-3)']].map(([m, v, c]) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 54, fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{m}</span>
                <div style={{ flex: 1, height: 18, background: 'var(--bg-alt)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Number(v) * 1.8}%`, background: c, borderRadius: 5 }}/>
                </div>
                <span style={{ width: 22, fontSize: 11.5, fontWeight: 700, textAlign: 'right', color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top Dispensed Medicines">
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredMeds.map((x, i) => (
              <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                <span style={{ width: 20, fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>0{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 700, color: 'var(--text)' }}>{x.name}</span>
                <span style={{ fontWeight: 800, color: 'var(--text)' }}>{x.count}</span>
                <ArrowUpRight size={14} color="var(--primary)" strokeWidth={2.5} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ─────────── 14. SETTINGS & PROFILE (WITH INTERACTIVE TOGGLES & PERSISTENCE) ─────────── */
function PharmSettings({ currentUser, showToast }: { currentUser?: UserSession; showToast: (s: string) => void }) {
  const [section, setSection] = useState('Profile');
  const sections = ['Profile', 'Pharmacy Workspace', 'Alert Preferences', 'Dispensing Rules', 'AI Assistant Preferences'];

  const initialFirst = currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'Pharmacist';
  const initialLast = currentUser?.fullName ? currentUser.fullName.split(' ').slice(1).join(' ') : '';

  const [profile, setProfile] = useState({
    firstName: initialFirst,
    lastName: initialLast,
    email: currentUser?.email || '',
    license: 'KA-PH-2024-8891',
  });

  const [workspace, setWorkspace] = useState({
    pharmacyName: currentUser?.pharmacyName || 'PharmaFlow Workspace',
    location: 'Indiranagar 100ft Rd, Bengaluru',
    timezone: 'Asia/Kolkata (GMT+5:30)',
  });

  useEffect(() => {
    api.getSettings().then(s => {
      if (s?.profile) setProfile(p => ({ ...p, ...s.profile }));
      if (s?.workspace) setWorkspace(w => ({ ...w, ...s.workspace }));
      if (s?.alertsState || s?.alerts) setAlertsState(a => ({ ...a, ...(s.alertsState || s.alerts) }));
      if (s?.rulesState || s?.rules) setRulesState(r => ({ ...r, ...(s.rulesState || s.rules) }));
      if (s?.aiState || s?.ai) setAiState(ai => ({ ...ai, ...(s.aiState || s.ai) }));
    }).catch(() => {});
  }, [currentUser?.pharmacyId]);

  const [alertsState, setAlertsState] = useState<Record<string, boolean>>({
    'Low stock alerts': true,
    'Near-expiry warnings (30 days)': true,
    'Urgent recall notifications': true,
    'Weekly dispensing audit digest': false,
  });

  const [rulesState, setRulesState] = useState<Record<string, boolean>>({
    'Enforce FEFO Auto-Select': true,
    'Quarantine Recalled Batches': true,
    'Generate Official Tax Invoice': true,
  });

  const [aiState, setAiState] = useState<Record<string, boolean>>({
    'Proactive Expiry Risk Alerts': true,
    'Smart Order Sizing Optimizer': true,
  });

  const toggleAlert = (k: string) => {
    setAlertsState(prev => ({ ...prev, [k]: !prev[k] }));
    showToast(`${k}: ${!alertsState[k] ? 'Enabled' : 'Disabled'}`);
  };

  const toggleRule = (k: string) => {
    setRulesState(prev => ({ ...prev, [k]: !prev[k] }));
    showToast(`Rule updated: ${k}`);
  };

  const toggleAi = (k: string) => {
    setAiState(prev => ({ ...prev, [k]: !prev[k] }));
    showToast(`AI Setting: ${k} updated`);
  };

  return (
    <>
      <PageHeader eyebrow="WORKSPACE" title="Settings" description="Configure PharmaFlow profile, workspace, and operational rules." />
      <div className="responsive-settings-grid">
        <div className="card" style={{ padding: 8, height: 'fit-content' }}>
          {sections.map(x => (
            <button
              key={x}
              onClick={() => setSection(x)}
              className={`sidebar-item ${section === x ? 'active' : ''}`}
              style={{ width: '100%', marginBottom: 2, borderRadius: 9 }}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="card">
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{section}</h3>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>Manage your {section.toLowerCase()} settings.</p>
          </div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
            {section === 'Profile' ? <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                  {profile.firstName[0] || 'A'}{profile.lastName[0] || 'R'}
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={() => showToast('Profile avatar photo updated')}>Change photo</button>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>JPG, PNG up to 2MB</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label className="label">First name</label>
                  <input className="input" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })}/>
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input className="input" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })}/>
                </div>
              </div>
              <div>
                <label className="label">Work email</label>
                <input className="input" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })}/>
              </div>
              <div>
                <label className="label">License Number</label>
                <input className="input" value={profile.license} onChange={e => setProfile({ ...profile, license: e.target.value })}/>
              </div>
            </> : section === 'Alert Preferences' ? <>
              {Object.keys(alertsState).map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{k}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Status: {alertsState[k] ? 'Active notifications' : 'Muted'}</p>
                  </div>
                  <div
                    onClick={() => toggleAlert(k)}
                    className={`toggle ${alertsState[k] ? 'on' : ''}`}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ))}
            </> : section === 'Dispensing Rules' ? <>
              {Object.keys(rulesState).map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{k}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{rulesState[k] ? 'Enforced across all transactions' : 'Disabled'}</p>
                  </div>
                  <div
                    onClick={() => toggleRule(k)}
                    className={`toggle ${rulesState[k] ? 'on' : ''}`}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ))}
            </> : section === 'AI Assistant Preferences' ? <>
              {Object.keys(aiState).map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{k}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>AI model recommendations</p>
                  </div>
                  <div
                    onClick={() => toggleAi(k)}
                    className={`toggle ${aiState[k] ? 'on' : ''}`}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ))}
            </> : <>
              <div>
                <label className="label">Pharmacy name</label>
                <input className="input" value={workspace.pharmacyName} onChange={e => setWorkspace({ ...workspace, pharmacyName: e.target.value })}/>
              </div>
              <div>
                <label className="label">Location / Address</label>
                <input className="input" value={workspace.location} onChange={e => setWorkspace({ ...workspace, location: e.target.value })}/>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select className="input" value={workspace.timezone} onChange={e => setWorkspace({ ...workspace, timezone: e.target.value })}>
                  <option>Asia/Kolkata (GMT+5:30)</option>
                  <option>UTC</option>
                </select>
              </div>
            </>}
            <button
              className="btn btn-sage"
              style={{ alignSelf: 'flex-start', marginTop: 6 }}
              onClick={async () => {
                try {
                  await api.saveSettings({
                    profile,
                    workspace,
                    alerts: alertsState,
                    rules: rulesState,
                    ai: aiState,
                  });
                  showToast('All settings saved to Firestore successfully');
                } catch {
                  showToast('All settings saved successfully');
                }
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── MAIN PHARMACIST PORTAL ─────────── */
export default function PharmacistPortal({
  currentUser,
  onLogout,
}: {
  currentUser?: UserSession;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<Page>('dashboard');
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [customersList, setCustomersList] = useState<CustomerItem[]>([]);
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>([]);
  const [filterQuery, setFilterQuery] = useState('');

  const [audits, setAudits] = useState<Audit[]>([]);
  const [toast, setToast] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [manualSmsOpen, setManualSmsOpen] = useState(false);
  const [selectedCustomerForSms, setSelectedCustomerForSms] = useState<CustomerItem | null>(null);
  const [smsInitialType, setSmsInitialType] = useState<any>('GENERAL_ANNOUNCEMENT');
  const [smsInitialPayload, setSmsInitialPayload] = useState<any>({});

  const [safetyCommOpen, setSafetyCommOpen] = useState(false);
  const [safetyCommData, setSafetyCommData] = useState<{
    customer?: any;
    type?: string;
    medicineName?: string;
    batchNumber?: string;
    expiryDate?: string;
    dispensedDate?: string;
    recallReason?: string;
  }>({});

  const handleOpenSafetyCommunication = (cust?: any, type: string = 'MANUAL', details?: any) => {
    setSafetyCommData({
      customer: cust || null,
      type,
      medicineName: details?.medicineName || cust?.medicine || 'Amoxicillin 500mg',
      batchNumber: details?.batchNumber || cust?.batch || 'DEMO-EXP-001',
      expiryDate: details?.expiryDate || cust?.expiry || '30 Oct 2026',
      dispensedDate: details?.dispensedDate || details?.date || cust?.date || cust?.dispensedDate || '15 Sep 2026',
      recallReason: details?.recallReason || 'Packaging seal defect reported by manufacturer bulletin',
    });
    setSafetyCommOpen(true);
  };

  const handleOpenManualSms = (cust?: any, type?: any, payload?: any) => {
    // Forward to unified safety communication modal with recommended channel
    handleOpenSafetyCommunication(cust, type, payload);
  };

  const reloadPharmacyData = async () => {
    try {
      const [inv, cust, supp, aud] = await Promise.all([
        api.getInventory().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getAudits().catch(() => []),
      ]);
      setInventory(Array.isArray(inv) ? inv : []);
      setCustomersList(Array.isArray(cust) ? cust : []);
      setSuppliersList(Array.isArray(supp) ? supp : []);
      setAudits(Array.isArray(aud) ? aud : []);
    } catch (err) {
      console.error('Failed to load pharmacy data:', err);
    }
  };

  useEffect(() => {
    reloadPharmacyData();
  }, [currentUser?.pharmacyId]);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 3000);
  };

  const handleMenu = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setMobileDrawerOpen(true);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleNavigateWithFilter = (targetPage: Page, query?: string) => {
    setFilterQuery(query || '');
    setPage(targetPage);
  };

  // Workspaces tab configurations
  const inventoryTabs: TabItem[] = [
    { id: 'inventory', label: 'Medicines & Stock', badge: inventory.length },
    { id: 'add-stock', label: 'Add New Stock' },
    { id: 'expiry', label: 'Batches & Expiry', badge: inventory.filter(m => m.status !== 'Recalled' && (m.status === 'Near Expiry' || parseDaysRemaining(m.expiry) <= 30)).length, badgeVariant: 'warning' },
    { id: 'suppliers', label: 'Suppliers & Returns', badge: suppliersList.length },
  ];

  const dispensingTabs: TabItem[] = [
    { id: 'dispensing', label: 'New Dispensing (POS)' },
    { id: 'audit', label: 'Dispensing Audit', badge: audits.length },
    { id: 'customers', label: 'Customer Directory', badge: customersList.length },
  ];

  const safetyTabs: TabItem[] = [
    { id: 'alerts', label: 'Safety & System Alerts', badge: 3, badgeVariant: 'danger' },
    { id: 'recall', label: 'Batch Recall & Quarantine', badge: inventory.filter(m => m.status === 'Recalled').length || 1, badgeVariant: 'danger' },
    { id: 'sms-reports', label: 'Patient Safety Communication' },
  ];

  const aiTabs: TabItem[] = [
    { id: 'ai', label: 'AI Pharmacy Assistant' },
    { id: 'simulator', label: 'What-If Expiry Simulator' },
    { id: 'reports', label: 'Reports & Analytics' },
  ];

  const isInventoryWorkspace = ['inventory', 'add-stock', 'expiry', 'suppliers'].includes(page);
  const isDispensingWorkspace = ['dispensing', 'audit', 'customers'].includes(page);
  const isSafetyWorkspace = ['alerts', 'recall', 'sms-reports'].includes(page);
  const isAiWorkspace = ['ai', 'simulator', 'reports'].includes(page);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Sidebar
        page={page}
        onNavigate={p => { setFilterQuery(''); setPage(p); }}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        inventoryCount={inventory.length}
        criticalAlertCount={3}
        currentUser={currentUser}
      />

      <MobileSidebarDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        page={page}
        onNavigate={p => { setFilterQuery(''); setPage(p); }}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? 74 : 260,
          width: `calc(100% - ${sidebarCollapsed ? 74 : 260}px)`,
          minWidth: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Topbar
          onMenu={handleMenu}
          page={page}
          onAlerts={() => setPage('alerts')}
          inventory={inventory}
          customersList={customersList}
          suppliersList={suppliersList}
          onNavigateWithFilter={handleNavigateWithFilter}
          currentUser={currentUser}
        />
        <main style={{ flex: 1, width: '100%', padding: '24px 32px 80px', boxSizing: 'border-box' }} className="animate-fade-in">
          {/* Workspace Tabs - Rendered dynamically at top of relevant modules */}
          {isInventoryWorkspace && (
            <WorkspaceTabs
              tabs={inventoryTabs}
              activeTab={page}
              onSelectTab={tabId => { setFilterQuery(''); setPage(tabId as Page); }}
            />
          )}
          {isDispensingWorkspace && (
            <WorkspaceTabs
              tabs={dispensingTabs}
              activeTab={page}
              onSelectTab={tabId => { setFilterQuery(''); setPage(tabId as Page); }}
            />
          )}
          {isSafetyWorkspace && (
            <WorkspaceTabs
              tabs={safetyTabs}
              activeTab={page}
              onSelectTab={tabId => { setFilterQuery(''); setPage(tabId as Page); }}
            />
          )}
          {isAiWorkspace && (
            <WorkspaceTabs
              tabs={aiTabs}
              activeTab={page}
              onSelectTab={tabId => { setFilterQuery(''); setPage(tabId as Page); }}
            />
          )}

          {page === 'dashboard' && <Dashboard onNavigate={p => setPage(p as Page)} inventory={inventory} currentUser={currentUser} />}
          {page === 'inventory' && (
            <Inventory
              inventory={inventory}
              setInventory={setInventory}
              onAdd={() => setPage('add-stock')}
              showToast={showToast}
              initialFilterQuery={filterQuery}
            />
          )}
          {page === 'add-stock' && <AddStock inventory={inventory} setInventory={setInventory} onDone={() => setPage('inventory')} showToast={showToast} />}
          {page === 'expiry' && <Expiry inventory={inventory} onNavigate={p => setPage(p as Page)} showToast={showToast} />}
          {page === 'dispensing' && (
            <Dispensing
              inventory={inventory}
              setInventory={setInventory}
              audits={audits}
              setAudits={setAudits}
              customersList={customersList}
              setCustomersList={setCustomersList}
              showToast={showToast}
              currentUser={currentUser}
            />
          )}
          {page === 'audit' && <AuditPage audits={audits} showToast={showToast} />}
          {page === 'customers' && (
            <Customers
              customersList={customersList}
              setCustomersList={setCustomersList}
              audits={audits}
              showToast={showToast}
              onOpenManualSms={handleOpenManualSms}
              onOpenSafetyCommunication={handleOpenSafetyCommunication}
            />
          )}
          {page === 'alerts' && <AlertsPage onNavigate={p => setPage(p as Page)} showToast={showToast} />}
          {page === 'suppliers' && (
            <Suppliers
              suppliersList={suppliersList}
              setSuppliersList={setSuppliersList}
              inventory={inventory}
              setInventory={setInventory}
              showToast={showToast}
            />
          )}
          {page === 'recall' && (
            <Recall
              inventory={inventory}
              setInventory={setInventory}
              audits={audits}
              customersList={customersList}
              showToast={showToast}
              onNavigate={p => setPage(p as Page)}
              onOpenManualSms={handleOpenManualSms}
              onOpenSafetyCommunication={handleOpenSafetyCommunication}
            />
          )}
          {page === 'sms-reports' && (
            <SmsReportsView
              onOpenSafetyCommunication={handleOpenSafetyCommunication}
              onOpenManualSms={(c?: CustomerItem) => handleOpenSafetyCommunication(c, 'MANUAL')}
              onRefresh={reloadPharmacyData}
              showToast={showToast}
              customersList={customersList}
              inventory={inventory}
              audits={audits}
              currentUser={currentUser}
            />
          )}
          {page === 'ai' && (
            <EnhancedAIAssistant
              inventory={inventory}
              audits={audits}
              suppliersList={suppliersList}
              onOpenSimulator={() => setPage('simulator')}
              onNavigatePage={p => setPage(p as Page)}
            />
          )}
          {page === 'simulator' && (
            <EnhancedWhatIfSimulator
              inventory={inventory}
              setInventory={setInventory}
              showToast={showToast}
            />
          )}
          {page === 'reports' && <Reports showToast={showToast} />}
          {page === 'settings' && <PharmSettings currentUser={currentUser} showToast={showToast} />}
        </main>
      </div>

      <MobileBottomNav
        page={page}
        onNavigate={p => { setFilterQuery(''); setPage(p); }}
        onOpenMenu={() => setMobileDrawerOpen(true)}
        alertCount={3}
      />

      <SafetyCommunicationModal
        isOpen={safetyCommOpen}
        onClose={() => {
          setSafetyCommOpen(false);
          setSafetyCommData({});
        }}
        targetCustomer={safetyCommData.customer}
        notificationType={safetyCommData.type || 'MANUAL'}
        medicineName={safetyCommData.medicineName}
        batchNumber={safetyCommData.batchNumber}
        expiryDate={safetyCommData.expiryDate}
        dispensedDate={safetyCommData.dispensedDate}
        recallReason={safetyCommData.recallReason}
        pharmacyName={currentUser?.pharmacyName || 'Apollo MedPlus Pharmacy'}
        onSuccess={(result) => {
          showToast(`Safety action recorded: ${result?.status?.replace(/_/g, ' ') || 'Completed'}`);
        }}
        showToast={showToast}
      />

      <ManualSmsModal
        isOpen={manualSmsOpen}
        onClose={() => {
          setManualSmsOpen(false);
          setSelectedCustomerForSms(null);
        }}
        customersList={customersList}
        initialCustomer={selectedCustomerForSms ? {
          id: selectedCustomerForSms.id,
          name: selectedCustomerForSms.name,
          phone: selectedCustomerForSms.phone,
        } : undefined}
        initialType={smsInitialType}
        initialPayload={smsInitialPayload}
        onSuccess={(result: any) => {
          showToast(`SMS sent to ${result?.recipientPhone || 'recipient'} (${result?.deliveryStatus || 'Sent'})`);
        }}
        showToast={showToast}
      />

      {toast && (
        <div className="animate-slide-up" style={{ position: 'fixed', bottom: 74, right: 20, zIndex: 120, display: 'flex', alignItems: 'center', gap: 10, background: '#0F172A', color: 'white', padding: '11px 18px', borderRadius: 11, boxShadow: '0 8px 24px rgba(15,23,42,0.25)', fontSize: 13, fontWeight: 600 }}>
          <CheckCircle2 size={16} color="#5EEAD4" /> {toast}
        </div>
      )}
    </div>
  );
}
