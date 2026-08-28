import React, { useState, useEffect, useRef } from 'react';
import {
  Gauge, Boxes, PackagePlus, CalendarDays, CreditCard, ClipboardList,
  Users, Bell, Truck, ShieldAlert, BrainCircuit, SlidersHorizontal, BarChart3,
  UserCog, Stethoscope, Search, LogOut, Menu, X, ChevronDown, Plus, Download, Edit3, Trash2,
  AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight, Clock3, Package, Filter,
  Check, Send, QrCode, FileText, MoreHorizontal, ChevronRight,
  Activity, CheckCircle2, ShieldCheck, Sparkles, RefreshCw,
  Camera, Zap, UploadCloud, Printer, Settings as SettingsIcon, LayoutDashboard
} from 'lucide-react';
import type { Page, Medicine, Audit, Status, CustomerItem, SupplierItem } from './data';
import { initialInventory, initialCustomers, initialSuppliers } from './data';

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
  { id: 'ai', label: 'AI Assistant', icon: BrainCircuit },
  { id: 'simulator', label: 'What-If Simulator', icon: SlidersHorizontal },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

/* ─────────── SIDEBAR WITH EXACT SQUIRCLE BLOOMING & DARK ARROW TOOLTIP ─────────── */
function Sidebar({
  open,
  page,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  page: Page;
  onNavigate: (p: string) => void;
  onLogout: () => void;
  onToggle?: () => void;
}) {
  const [activeTooltip, setActiveTooltip] = useState<{ label: string; count?: number; top: number; left: number } | null>(null);

  const handleShowTooltip = (e: React.MouseEvent | React.TouchEvent, label: string, count?: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveTooltip({
      label,
      count,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
  };

  const handleHideTooltip = () => {
    setActiveTooltip(null);
  };

  return (
    <>
      <aside
        style={{
          width: 68,
          flexShrink: 0,
          position: 'fixed',
          inset: '0 auto 0 0',
          zIndex: 30,
          background: '#FFFFFF',
          borderRight: '1px solid #ECECE8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100vh',
          padding: '14px 0 14px',
          boxShadow: '1px 0 10px rgba(0,0,0,0.02)',
        }}
        className="hidden-mobile-aside"
      >
        {/* Project Brand Mark Icon on Top (As per before) */}
        <button
          onClick={() => onNavigate('dashboard')}
          onMouseEnter={e => handleShowTooltip(e, 'PharmaFlow Portal')}
          onMouseLeave={handleHideTooltip}
          onTouchStart={e => handleShowTooltip(e, 'PharmaFlow Portal')}
          onTouchEnd={() => setTimeout(handleHideTooltip, 2000)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: '#526350',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(82,99,80,0.25)',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
            transition: 'transform 0.15s ease',
          }}
          title="PharmaFlow Portal"
        >
          <Stethoscope size={19} color="white" />
        </button>

        <div style={{ width: 28, height: 1, background: '#EAEAE6', margin: '10px 0 6px' }} />

        {/* Continuous Uniform Icon List - Clean & Beautiful */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            padding: '4px 0',
          }}
        >
          {navItems.map(({ id, label, icon: Icon, count }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                onMouseEnter={e => handleShowTooltip(e, label, count)}
                onMouseLeave={handleHideTooltip}
                onTouchStart={e => handleShowTooltip(e, label, count)}
                onTouchEnd={() => setTimeout(handleHideTooltip, 2000)}
                className={`squircle-rail-item ${active ? 'active' : ''}`}
                title={label}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.3 : 1.85}
                  color={active ? '#526350' : '#4A5568'}
                />

                {count ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#A63A50',
                      border: '1.5px solid white',
                    }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Bottom Section: Settings & Sign Out (Matching Screenshot) */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid #ECECE8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            width: '100%',
          }}
        >
          <button
            onClick={() => onNavigate('settings')}
            onMouseEnter={e => handleShowTooltip(e, 'Settings')}
            onMouseLeave={handleHideTooltip}
            onTouchStart={e => handleShowTooltip(e, 'Settings')}
            onTouchEnd={() => setTimeout(handleHideTooltip, 2000)}
            className={`squircle-rail-item ${page === 'settings' ? 'active' : ''}`}
            title="Settings"
          >
            <UserCog
              size={20}
              strokeWidth={page === 'settings' ? 2.3 : 1.85}
              color={page === 'settings' ? '#526350' : '#4A5568'}
            />
          </button>

          <button
            onClick={onLogout}
            onMouseEnter={e => handleShowTooltip(e, 'Sign out')}
            onMouseLeave={handleHideTooltip}
            onTouchStart={e => handleShowTooltip(e, 'Sign out')}
            onTouchEnd={() => setTimeout(handleHideTooltip, 2000)}
            className="squircle-rail-item logout-item"
            title="Sign out"
          >
            <LogOut size={19} strokeWidth={1.85} color="#A63A50" />
          </button>
        </div>
      </aside>

      {/* Floating Dark Arrow Tooltip (Exactly matching Screenshot 2) */}
      {activeTooltip && (
        <div
          className="dark-arrow-tooltip"
          style={{
            left: `${activeTooltip.left}px`,
            top: `${activeTooltip.top}px`,
          }}
        >
          <span>{activeTooltip.label}</span>
          {activeTooltip.count ? (
            <span
              style={{
                fontSize: 10.5,
                background: '#A63A50',
                color: 'white',
                padding: '1px 6px',
                borderRadius: 99,
                fontWeight: 800,
              }}
            >
              {activeTooltip.count}
            </span>
          ) : null}
        </div>
      )}
    </>
  );
}

function MobileDrawer({ open, onClose, page, onNavigate, onLogout }: { open: boolean; onClose: () => void; page: Page; onNavigate: (p: string) => void; onLogout: () => void }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className="animate-scale-in"
        style={{
          position: 'relative',
          width: '84%',
          maxWidth: 300,
          background: '#FFFFFF',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          zIndex: 101,
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid #EFEFEA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#526350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#111111' }}>
                PHARMA<span style={{ color: '#526350' }}>FLOW</span>
              </div>
              <div style={{ fontSize: 9.5, color: '#526350', fontWeight: 700, textTransform: 'uppercase' }}>
                Pharmacist Portal
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F7F7F4', border: '1px solid #E5E5E0', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={17} color="#555555" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {navItems.map(({ id, label, icon: Icon, count }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => { onNavigate(id); onClose(); }}
                className={`sidebar-item ${active ? 'active' : ''}`}
                style={{
                  height: 42,
                  padding: '0 12px',
                  borderRadius: 10,
                  background: active ? '#E8EFE7' : 'transparent',
                  color: active ? '#526350' : '#333333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} color={active ? '#526350' : '#555555'} />
                <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, flex: 1, textAlign: 'left' }}>{label}</span>
                {count ? (
                  <span style={{ fontSize: 10.5, background: '#F9ECEF', color: '#A63A50', padding: '2px 7px', borderRadius: 99, fontWeight: 800 }}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #EFEFEA', background: '#FAFAF8', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => { onNavigate('settings'); onClose(); }}
            className="sidebar-item"
            style={{ height: 40, padding: '0 12px', borderRadius: 8 }}
          >
            <SettingsIcon size={17} />
            <span style={{ fontSize: 13 }}>Settings</span>
          </button>
          <button
            onClick={onLogout}
            className="sidebar-item"
            style={{ height: 40, padding: '0 12px', borderRadius: 8, color: '#A63A50' }}
          >
            <LogOut size={17} />
            <span style={{ fontSize: 13 }}>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
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
}: {
  onMenu: () => void;
  page: Page;
  onAlerts: () => void;
  inventory: Medicine[];
  customersList: CustomerItem[];
  suppliersList: SupplierItem[];
  onNavigateWithFilter: (p: Page, query?: string) => void;
}) {
  const activeItem = navItems.find(x => x.id === page);
  const label = activeItem?.label || (page === 'settings' ? 'Settings' : 'PharmaFlow');

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const matchedMeds = q ? inventory.filter(m => m.medicine.toLowerCase().includes(q) || m.batch.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchedCustomers = q ? customersList.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 3) : [];
  const matchedSuppliers = q ? suppliersList.filter(s => s.name.toLowerCase().includes(q)).slice(0, 2) : [];
  const matchedPages = q ? navItems.filter(i => i.label.toLowerCase().includes(q)).slice(0, 2) : [];

  const hasResults = matchedMeds.length > 0 || matchedCustomers.length > 0 || matchedSuppliers.length > 0 || matchedPages.length > 0;

  return (
    <header
      style={{
        height: 68,
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E5E0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onMenu}
          className="mobile-only-btn"
          style={{
            background: '#F7F7F4',
            border: '1px solid #E5E5E0',
            cursor: 'pointer',
            padding: '7px 9px',
            borderRadius: 9,
            color: '#333333',
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
              color: '#111111',
              letterSpacing: '-0.3px',
              cursor: page === 'dashboard' ? 'pointer' : 'default',
            }}
            title={page === 'dashboard' ? 'View Pharmacist Profile' : undefined}
          >
            {page === 'dashboard' ? 'Good morning, Dr. Anita 👋' : label}
          </h1>
          <p style={{ fontSize: 11.5, color: '#777777', marginTop: 1 }}>
            {page === 'dashboard' ? "Here's what's happening across your pharmacy today." : 'Pharmacy Medication Dispensing & Expiry Portal'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div className="search-input" style={{ width: 'clamp(170px, 22vw, 280px)', padding: '7px 11px' }}>
            <Search size={14} color="#888888" />
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
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: '#888888' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {searchOpen && q && (
            <div className="search-popover-dropdown">
              <div style={{ padding: '10px 16px', background: '#FAFAF8', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#8C928A', textTransform: 'uppercase' }}>Quick Search Results</span>
                <span style={{ fontSize: 11, color: '#888888' }}>Esc to close</span>
              </div>

              {!hasResults && (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: '#888888', fontSize: 13 }}>
                  No matches found for "<b style={{ color: '#111111' }}>{query}</b>"
                </div>
              )}

              {matchedMeds.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: '#6B8068', background: '#F8FAF8', textTransform: 'uppercase' }}>
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
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={14} color="#526350" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#111111' }}>{m.medicine}</p>
                        <p style={{ fontSize: 11, color: '#777777' }}>Batch: {m.batch} · {m.quantity} units · Exp: {m.expiry}</p>
                      </div>
                      <Badge status={m.status} />
                    </div>
                  ))}
                </div>
              )}

              {matchedCustomers.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: '#4A6B5D', background: '#F8FAF8', textTransform: 'uppercase' }}>
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
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#E3ECE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={14} color="#4A6B5D" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#111111' }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: '#777777' }}>{c.phone} · {c.visits} visits</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {matchedSuppliers.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: '#8C5E3C', background: '#F8FAF8', textTransform: 'uppercase' }}>
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
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F7EDE2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck size={14} color="#8C5E3C" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#111111' }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: '#777777' }}>{s.batches} batches · {s.purchases}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {matchedPages.length > 0 && (
                <div>
                  <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, color: '#555555', background: '#F8FAF8', textTransform: 'uppercase' }}>
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
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F2F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p.icon size={14} color="#555555" />
                      </div>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111111', flex: 1 }}>Open {p.label}</p>
                      <ChevronRight size={13} color="#888888" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={onAlerts} style={{ position: 'relative', background: '#F7F7F4', border: '1px solid #E5E5E0', cursor: 'pointer', padding: '7px 9px', borderRadius: 9, color: '#333333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={17} />
          <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#A63A50', border: '1.5px solid white' }} />
        </button>
        <div style={{ width: 1, height: 28, background: '#E5E5E0' }} />
        <button
          onClick={() => onNavigateWithFilter('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: '#FAFAF8',
            padding: '3px 12px 3px 5px',
            borderRadius: 99,
            border: '1.5px solid #EAEAE6',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          className="card-hover"
          title="Click to view & edit Pharmacist Profile / Settings"
        >
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, color: '#526350' }}>
            AR
          </div>
          <div className="hidden-mobile" style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#111111', lineHeight: 1.1 }}>Dr. Anita Rao</p>
            <p style={{ fontSize: 10, color: '#6B8068', fontWeight: 600 }}>Pharmacist</p>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111111', letterSpacing: '-0.3px' }}>{title}</h2>
        {description && <p style={{ fontSize: 13.5, color: '#555555', marginTop: 3 }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value, change, icon: Icon, tone = 'sage' }: { label: string; value: string; change?: string; icon: React.ElementType; tone?: string }) {
  const bg: Record<string, string> = { sage: '#E8EFE7', teal: '#E3ECE7', green: '#E6EFEA', amber: '#F7EDE2', red: '#F9ECEF', orange: '#F7EBE3' };
  const fg: Record<string, string> = { sage: '#526350', teal: '#4A6B5D', green: '#52796F', amber: '#8C5E3C', red: '#A63A50', orange: '#B86B35' };
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11.5, color: '#555555', fontWeight: 500 }}>{label}</p>
          <p className="stat-value" style={{ marginTop: 4 }}>{value}</p>
          {change && <p style={{ fontSize: 11.5, color: '#52796F', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}><ArrowUpRight size={12}/>{change}</p>}
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: bg[tone] || bg.sage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={fg[tone] || fg.sage} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className || ''}`}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#111111' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Available: 'badge-green', 'Near Expiry': 'badge-amber', Recalled: 'badge-red', 'Low Stock': 'badge-orange', Expired: 'badge-gray', Completed: 'badge-green', Active: 'badge-green', Invited: 'badge-blue'
  };
  return <span className={`chip ${map[status] || 'badge-gray'}`}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}/>{status}</span>;
}

function SimpleChart({ type = 'line' }: { type?: string }) {
  return (
    <div style={{ padding: '16px 20px 24px', height: 180, position: 'relative' }}>
      <svg viewBox="0 0 600 160" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6B8068" stopOpacity=".2"/>
            <stop offset="1" stopColor="#6B8068" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {type === 'bar' ? [42, 65, 48, 75, 58, 82, 70, 92, 61, 76, 48, 68].map((h, i) => (
          <rect key={i} x={i * 50 + 5} y={160 - h * 1.5} width="22" height={h * 1.5} rx="4" fill={i % 3 === 1 ? '#6B8068' : '#E8EFE7'} />
        )) : <>
          <path d="M0 130 C50 110 70 135 120 95 S180 120 220 75 S280 105 320 60 S390 85 430 40 S490 60 540 28 S570 50 600 15 L600 160 L0 160Z" fill="url(#grad)"/>
          <path d="M0 130 C50 110 70 135 120 95 S180 120 220 75 S280 105 320 60 S390 85 430 40 S490 60 540 28 S570 50 600 15" fill="none" stroke="#6B8068" strokeWidth="2.5" strokeLinecap="round"/>
        </>}
      </svg>
    </div>
  );
}

function AlertRow({ icon: Icon, tone, title, detail }: { icon: React.ElementType; tone: string; title: string; detail: string }) {
  const c: Record<string, string> = { amber: '#F7EDE2', red: '#F9ECEF', orange: '#F7EBE3' };
  const tc: Record<string, string> = { amber: '#8C5E3C', red: '#A63A50', orange: '#B86B35' };
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: c[tone] || '#F2F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={tc[tone] || '#555555'} />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111111' }}>{title}</p>
        <p style={{ fontSize: 11.5, color: '#888888', marginTop: 2 }}>{detail}</p>
      </div>
    </div>
  );
}

/* ─────────── INTERACTIVE QR SCANNER MODAL (WITH QUIT OPTION) ─────────── */
function QRScannerModal({
  isOpen,
  onClose,
  onScan,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scanned: { medicine: string; batch: string; expiry: string; quantity: number; supplier: string; unitPrice?: number }) => void;
}) {
  const [flashlight, setFlashlight] = useState(false);
  const [customCode, setCustomCode] = useState('');

  if (!isOpen) return null;

  const sampleBarcodes = [
    { label: 'PCT101 · Paracetamol 500mg', data: { medicine: 'Paracetamol 500mg', batch: 'PCT101', expiry: 'Sep 2026', quantity: 150, supplier: 'ABC Pharma', unitPrice: 25 } },
    { label: 'VD102 · Vitamin D3 60K', data: { medicine: 'Vitamin D3 60K', batch: 'VD102', expiry: 'Sep 2026', quantity: 180, supplier: 'HealthCare Labs', unitPrice: 65 } },
    { label: 'CTZ302 · Cetirizine 10mg', data: { medicine: 'Cetirizine 10mg', batch: 'CTZ302', expiry: 'Jan 2027', quantity: 300, supplier: 'Nova Pharma', unitPrice: 35 } },
    { label: 'MET624 · Metformin 500mg (New Batch)', data: { medicine: 'Metformin 500mg', batch: 'MET624', expiry: 'Feb 2028', quantity: 200, supplier: 'ABC Pharma', unitPrice: 45 } },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,11,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 500, background: '#181C19', color: 'white', borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', zIndex: 111 }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#526350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: '#FFFFFF' }}>Medicine Barcode / QR Scanner</h3>
              <p style={{ fontSize: 11, color: '#A3B19B' }}>Point camera at package barcode or pick a sample</p>
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
            <div className="scanner-laser-line" />

            <div style={{ position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTop: '3px solid #4ADE80', borderLeft: '3px solid #4ADE80', borderRadius: '4px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTop: '3px solid #4ADE80', borderRight: '3px solid #4ADE80', borderRadius: '0 4px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottom: '3px solid #4ADE80', borderLeft: '3px solid #4ADE80', borderRadius: '0 0 0 4px' }} />
            <div style={{ position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottom: '3px solid #4ADE80', borderRight: '3px solid #4ADE80', borderRadius: '0 0 4px 0' }} />

            <div style={{ textAlign: 'center', opacity: 0.6 }}>
              <Camera size={34} color="#A3B19B" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 11, color: '#A3B19B', letterSpacing: '0.04em' }}>ALIGN BARCODE INSIDE FRAME</p>
            </div>

            {flashlight && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
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
              Instant Test Scan (Click to scan):
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
              placeholder="Or enter custom Batch / Barcode..."
              value={customCode}
              onChange={e => setCustomCode(e.target.value)}
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
              onClick={() => {
                if (customCode.trim()) {
                  onScan({
                    medicine: `Medication (${customCode.toUpperCase()})`,
                    batch: customCode.toUpperCase(),
                    expiry: 'Dec 2027',
                    quantity: 100,
                    supplier: 'ABC Pharma',
                    unitPrice: 50,
                  });
                  onClose();
                }
              }}
              className="btn btn-sage"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              Scan
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#111312', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ background: 'transparent', color: '#CCCCCC', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Cancel & Quit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── INTERACTIVE INVOICE UPLOAD & AI OCR (WITH QUIT OPTION) ─────────── */
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

  if (!isOpen) return null;

  const handleUploadSample = () => {
    setFile('MediSource_TaxInvoice_9842.pdf');
    setParsing(true);
    setProgress(15);

    setTimeout(() => setProgress(45), 350);
    setTimeout(() => setProgress(80), 700);
    setTimeout(() => {
      setProgress(100);
      setParsing(false);
      setExtractedItems([
        { id: Date.now() + 1, medicine: 'Amoxicillin 500mg', batch: 'AMX205', expiry: 'Nov 2027', quantity: 100, supplier: 'MediSource', status: 'Available', unitPrice: 95 },
        { id: Date.now() + 2, medicine: 'Pantoprazole 40mg', batch: 'PAN404', expiry: 'Jan 2028', quantity: 200, supplier: 'MediSource', status: 'Available', unitPrice: 55 },
        { id: Date.now() + 3, medicine: 'Dolo 650mg', batch: 'DOL109', expiry: 'Oct 2027', quantity: 150, supplier: 'MediSource', status: 'Available', unitPrice: 30 },
      ]);
      showToast('AI OCR extracted 3 medication line items from invoice');
    }, 1100);
  };

  const handleConfirmImport = () => {
    if (extractedItems) {
      onImport(extractedItems);
      showToast(`Imported ${extractedItems.length} new batches into inventory`);
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

      <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 580, padding: 0, zIndex: 111 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#526350" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16 }}>Distributor Invoice OCR Uploader</h3>
              <p style={{ fontSize: 12, color: '#777777' }}>Automatic batch & expiry extraction from purchase bills</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6, color: '#888888' }} title="Quit">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {!extractedItems && (
            <>
              <div
                className="dropzone-box"
                style={{ padding: '36px 20px', textAlign: 'center' }}
                onClick={handleUploadSample}
              >
                <UploadCloud size={40} color="#6B8068" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 700, fontSize: 15, color: '#111111' }}>
                  {file ? file : 'Click or Drop Distributor Invoice (PDF / Image)'}
                </p>
                <p style={{ fontSize: 12, color: '#888888', marginTop: 4 }}>
                  Supports GST Tax Invoices, Delivery Challans, and Drug Purchase Bills
                </p>

                <div style={{ marginTop: 18 }}>
                  <button
                    className="btn btn-sage"
                    onClick={e => {
                      e.stopPropagation();
                      handleUploadSample();
                    }}
                  >
                    <Sparkles size={14} /> Upload Sample Invoice (MediSource)
                  </button>
                </div>
              </div>

              {parsing && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: '#526350' }}>AI OCR extracting batches, quantities & expiry...</span>
                    <span style={{ fontWeight: 800 }}>{progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 8 }}>
                    <div className="progress-fill" style={{ width: `${progress}%`, background: '#6B8068' }} />
                  </div>
                </div>
              )}
            </>
          )}

          {extractedItems && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="#52796F" />
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#111111' }}>Extracted Line Items (3)</span>
                </div>
                <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>
                  <RefreshCw size={13} /> Re-upload
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {extractedItems.map(item => (
                  <div key={item.id} style={{ background: '#F8FAF8', border: '1px solid #E5ECE4', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#111111' }}>{item.medicine}</p>
                      <p style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>Batch: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.batch}</span> · Exp: {item.expiry} · Supplier: {item.supplier}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, fontSize: 14, color: '#526350' }}>+{item.quantity} units</p>
                      <p style={{ fontSize: 11, color: '#888888' }}>₹ {item.unitPrice}/unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEFEA', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Quit / Cancel
          </button>
          {extractedItems && (
            <button onClick={handleConfirmImport} className="btn btn-sage">
              <Check size={15} /> Import All into Inventory
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

      <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 480, padding: 0, zIndex: 111, background: '#FFFFFF', borderRadius: 16 }}>
        <div style={{ padding: '20px 24px', background: '#1F2421', color: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#526350', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={15} color="white" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.3px' }}>
                WELLCARE <span style={{ color: '#A3B19B' }}>PHARMACY</span>
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#A3B19B', marginTop: 4 }}>Reg Lic: PHARM-KA-2024-8842 · GSTIN: 29AAAAA0000A1Z5</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, color: 'white', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 16, borderBottom: '1px dashed #E5E5E0', fontSize: 12 }}>
            <div>
              <p style={{ color: '#888888' }}>Invoice / Rx No:</p>
              <p style={{ fontWeight: 800, fontFamily: 'monospace', color: '#111111', marginTop: 2 }}>{data.rxId}</p>
            </div>
            <div>
              <p style={{ color: '#888888' }}>Date & Time:</p>
              <p style={{ fontWeight: 600, color: '#111111', marginTop: 2 }}>{data.date}</p>
            </div>
            <div>
              <p style={{ color: '#888888' }}>Patient / Customer:</p>
              <p style={{ fontWeight: 700, color: '#111111', marginTop: 2 }}>{data.customer}</p>
            </div>
            <div>
              <p style={{ color: '#888888' }}>Dispensed By:</p>
              <p style={{ fontWeight: 600, color: '#111111', marginTop: 2 }}>{data.pharmacist}</p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#888888', textTransform: 'uppercase', marginBottom: 8 }}>Prescription Line Items</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAF8', borderBottom: '1px solid #EFEFEA' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#555555' }}>Item</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#555555' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#555555' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 10px', borderBottom: '1px solid #EFEFEA' }}>
                    <p style={{ fontWeight: 700, color: '#111111' }}>{data.medicine}</p>
                    <p style={{ fontSize: 11, color: '#888888', marginTop: 2 }}>Batch: {data.batch} · Exp: {data.expiry}</p>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid #EFEFEA' }}>
                    {data.quantity}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #EFEFEA' }}>
                    ₹ {data.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, padding: '12px 14px', background: '#F8FAF8', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#333333' }}>Total Paid (Inc. Taxes):</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#526350' }}>₹ {data.total}</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#52796F' }}>
            <CheckCircle2 size={15} color="#52796F" />
            <span>FEFO Certified · Safety Verified by Pharmacist</span>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #EFEFEA', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <button onClick={onClose} className="btn btn-secondary">
            Done
          </button>
          <button onClick={handlePrint} className="btn btn-sage">
            <Printer size={15} /> Print / Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 1. PHARMACIST DASHBOARD ─────────── */
function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title="Good morning, Dr. Anita"
        description="Here's what's happening across your pharmacy today."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('add-stock')}>
              <PackagePlus size={15} /> Add Stock
            </button>
            <button className="btn btn-sage" onClick={() => onNavigate('dispensing')}>
              <Plus size={15} /> New Dispensing
            </button>
          </div>
        }
      />
      <div className="responsive-stats-grid">
        <Stat label="Medicines" value="128" change="4.2% this month" icon={Package} tone="sage" />
        <Stat label="Batches" value="246" change="2.1% this month" icon={Boxes} tone="teal" />
        <Stat label="Total Stock" value="18,420" change="8.4% this month" icon={Activity} tone="green" />
        <Stat label="Low Stock" value="7" icon={AlertTriangle} tone="amber" />
        <Stat label="Near Expiry" value="12" icon={Clock3} tone="amber" />
        <Stat label="Expired" value="3" icon={AlertCircle} tone="red" />
      </div>
      <div className="responsive-dashboard-grid">
        <Panel title="Expiry Risk Overview" action={<button style={{ fontSize: 12, color: '#6B8068', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => onNavigate('expiry')}>View report</button>}>
          <SimpleChart />
        </Panel>
        <Panel title="Critical Alerts" action={<button style={{ fontSize: 12, color: '#6B8068', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => onNavigate('alerts')}>See all</button>}>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AlertRow icon={AlertTriangle} tone="amber" title="Vitamin D3 expires soon" detail="Batch VD102 · 12 days left" />
            <AlertRow icon={AlertCircle} tone="red" title="Batch AMX204 recalled" detail="45 units · Action required" />
            <AlertRow icon={ArrowDownRight} tone="orange" title="Paracetamol low stock" detail="Only 12 units remaining" />
          </div>
        </Panel>
      </div>
      <div className="responsive-split-grid" style={{ marginBottom: 20 }}>
        <Panel title="Stock Movement" action={<span style={{ fontSize: 12, color: '#888888' }}>Last 6 months</span>}>
          <SimpleChart type="bar" />
        </Panel>
        <Panel title="Most Dispensed" action={<button style={{ fontSize: 12, color: '#6B8068', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => onNavigate('reports')}>Full report</button>}>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Paracetamol 500mg', '2,480', '32%', '#6B8068'], ['Cetirizine 10mg', '1,842', '24%', '#4A6B5D'], ['Metformin 500mg', '1,490', '19%', '#555555'], ['Vitamin D3 60K', '988', '13%', '#B5838D']].map(([n, v, p, c]) => (
              <div key={n}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{n}</span>
                  <span style={{ fontSize: 12.5, color: '#555555' }}>{v} <span style={{ fontSize: 10.5 }}>({p})</span></span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: p, background: c }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ borderRadius: 16, background: '#111111', padding: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: '#6B8068', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BrainCircuit size={20} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: '#A3B19B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI INSIGHT & SIMULATION</p>
          <p style={{ color: 'white', fontWeight: 600, marginTop: 3, fontSize: 13.5 }}>Your Vitamin D3 inventory may exceed demand before expiry. Run the What-If Simulator before reordering.</p>
        </div>
        <button onClick={() => onNavigate('simulator')} className="btn" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.18)', whiteSpace: 'nowrap', fontSize: 13 }}>
          Open Simulator <ChevronRight size={14}/>
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
          <button onClick={onAdd} className="btn btn-sage">
            <Plus size={15}/> Add stock
          </button>
        }
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 16, display: 'flex', gap: 12, justifyContent: 'space-between', borderBottom: '1px solid #EFEFEA', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ minWidth: 260 }}>
            <Search size={15} color="#888888" />
            <input placeholder="Search medicine, batch, supplier..." value={q} onChange={e => setQ(e.target.value)} />
            {q && (
              <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888' }}>
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F2F2EE' }}>
                {['Medicine', 'Batch', 'Expiry', 'Quantity', 'Rate', 'Supplier', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#888888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id} className="table-row" style={{ borderTop: '1px solid #EFEFEA' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, color: '#111111' }}>{m.medicine}</p>
                    <p style={{ fontSize: 11, color: '#888888', marginTop: 2 }}>Stock updated</p>
                  </td>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 13, color: '#555555' }}>{m.batch}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#555555' }}>{m.expiry}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#111111' }}>{m.quantity}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#555555' }}>₹ {m.unitPrice || 45}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#555555' }}>{m.supplier}</td>
                  <td style={{ padding: '14px 20px' }}><Badge status={m.status}/></td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setEdit(m)}><Edit3 size={14}/></button>
                      <button className="btn btn-ghost" style={{ padding: 6, color: '#A63A50' }} onClick={() => { setInventory(inventory.filter(x => x.id !== m.id)); showToast(`Removed ${m.medicine} (${m.batch})`); }}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: '#888888', fontSize: 13 }}>
                    No medicines match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #EFEFEA', fontSize: 12, color: '#888888' }}>Showing {rows.length} of {inventory.length} medicines</div>
      </div>

      {edit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,17,0.4)' }} onClick={() => setEdit(null)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Edit medicine</h3>
              <button onClick={() => setEdit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888' }}><X size={18}/></button>
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
                <button className="btn btn-sage" onClick={() => { setInventory(inventory.map(x => x.id === edit.id ? edit : x)); setEdit(null); showToast('Inventory updated'); }}>Save changes</button>
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

  const handleInvoiceImport = (items: Medicine[]) => {
    setInventory([...inventory, ...items]);
  };

  const submit = () => {
    if (!form.medicine || !form.quantity) {
      showToast('Please enter medicine name and quantity');
      return;
    }
    const newMed: Medicine = {
      id: Date.now(),
      medicine: form.medicine,
      batch: form.batch || `BTH${Math.floor(100 + Math.random() * 900)}`,
      expiry: form.expiry || 'Dec 2027',
      quantity: Number(form.quantity),
      supplier: form.supplier || 'ABC Pharma',
      status: 'Available',
      unitPrice: Number(form.unitPrice) || 45,
    };
    setInventory([...inventory, newMed]);
    showToast(`Added ${form.medicine} to inventory`);
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
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QrCode size={22} color="#526350" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>Barcode / QR Package Scanner</h3>
                <p style={{ fontSize: 13, color: '#555555', marginTop: 4, lineHeight: 1.5 }}>
                  Scan medicine packages, strips, or bulk carton QR codes for auto-filling batch details.
                </p>
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn-sage" onClick={() => setScannerOpen(true)}>
                    <Camera size={15} /> Launch QR Scanner
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-hover" style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E3ECE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={22} color="#4A6B5D" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>Distributor Invoice OCR</h3>
                <p style={{ fontSize: 13, color: '#555555', marginTop: 4, lineHeight: 1.5 }}>
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
          <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, borderBottom: '1px solid #EFEFEA', paddingBottom: 12 }}>
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
              <button className="btn btn-sage" onClick={submit}><PackagePlus size={15}/> Add to Inventory</button>
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
        }
      />
      <div className="responsive-stats-grid">
        <Stat label="Total Batches" value="246" icon={Boxes} tone="sage" />
        <Stat label="Expiring in 30d" value="12" icon={Clock3} tone="amber" />
        <Stat label="Expiring in 90d" value="28" icon={CalendarDays} tone="teal" />
        <Stat label="Expired" value="3" icon={AlertCircle} tone="red" />
      </div>
      <div className="responsive-dashboard-grid">
        <Panel title="Expiry Timeline">
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 12, color: '#888888' }}>
              {['Today', '30 days', '60 days', '90 days', '120 days'].map(t => <span key={t}>{t}</span>)}
            </div>
            <div style={{ position: 'relative', height: 100, borderTop: '1.5px solid #E5E5E0' }}>
              {[{ left: '12%', top: 16, text: 'AMX204', sub: 'Oct 2026 · Recalled', color: '#A63A50', bg: '#F9ECEF', border: '#F3C6D0' },
                { left: '25%', top: 52, text: 'VD102', sub: 'Sep 2026 · High risk', color: '#8C5E3C', bg: '#F7EDE2', border: '#EBD4BF' }].map(b => (
                <div key={b.text} style={{ position: 'absolute', left: b.left, top: b.top, background: b.bg, border: `1px solid ${b.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: b.color, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <span style={{ display: 'block' }}>{b.text}</span>
                  <span style={{ fontWeight: 400, fontSize: 11 }}>{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Risk Distribution">
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'conic-gradient(#A63A50 0 4%,#B86B35 4% 16%,#52796F 16% 30%,#E5E5E0 30% 100%)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#111111' }}>246</span>
                <span style={{ fontSize: 11, color: '#888888' }}>batches</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {[['Expired', '3', '#A63A50'], ['High risk', '12', '#B86B35'], ['Watch', '34', '#52796F'], ['Safe', '197', '#CCCCCC']].map(([n, v, c]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'center' }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }}/>{n}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Priority Batches for FEFO Dispensing">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: '#F2F2EE' }}>
              {['Medicine', 'Batch', 'Expiry', 'Days Left', 'Risk', 'Action'].map(h => <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#888888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{inventory.slice(0, 5).map((m, i) => (
              <tr key={m.batch} className="table-row" style={{ borderTop: '1px solid #EFEFEA' }}>
                <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13 }}>{m.medicine}</td>
                <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 13 }}>{m.batch}</td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#555555' }}>{m.expiry}</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: 14 }}>{[12, 42, 68, 103, 150][i] || 90}</td>
                <td style={{ padding: '14px 20px' }}><Badge status={m.status}/></td>
                <td style={{ padding: '14px 20px' }}>
                  <button onClick={() => onNavigate?.('dispensing')} style={{ fontSize: 12, color: '#6B8068', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Dispense batch →
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
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
}: {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  audits: Audit[];
  setAudits: React.Dispatch<React.SetStateAction<Audit[]>>;
  customersList: CustomerItem[];
  setCustomersList: React.Dispatch<React.SetStateAction<CustomerItem[]>>;
  showToast: (s: string) => void;
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

  const handleAddCustomer = () => {
    if (!newCustName) return;
    const newCust: CustomerItem = {
      id: Date.now(),
      name: newCustName,
      phone: newCustPhone || '+91 98000 00000',
      email: `${newCustName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      visits: 1,
      lastVisit: 'Just now',
      allergies: 'None',
      alerts: true,
    };
    setCustomersList([...customersList, newCust]);
    setCustomer(newCustName);
    setNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    showToast(`Customer "${newCustName}" registered`);
  };

  const confirm = () => {
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
    const rxId = `RX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setInventory(inventory.map(x => x.id === chosen.id ? { ...x, quantity: x.quantity - qty } : x));

    setAudits([
      {
        id: Date.now(),
        date: `Today, ${nowTime}`,
        medicine: chosen.medicine,
        batch: chosen.batch,
        quantity: qty,
        customer,
        pharmacist: 'Dr. Anita Rao',
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
      pharmacist: 'Dr. Anita Rao',
      pricePerUnit: unitRate,
      total: totalAmount,
      language,
    });

    showToast('Dispensing confirmed & receipt generated');
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
          <div style={{ padding: 18, borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} color="#526350"/>
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 14.5 }}>New dispensing record</h3>
                <p style={{ fontSize: 11.5, color: '#888888', marginTop: 2 }}>Record what leaves your pharmacy</p>
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
              <input className="input" type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))}/>
              {chosen && <p style={{ fontSize: 11, color: '#888888', marginTop: 4 }}>Available: {chosen.quantity} units (₹ {chosen.unitPrice || 45}/unit)</p>}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>Customer</label>
                <button onClick={() => setNewCustomerModal(true)} style={{ background: 'none', border: 'none', color: '#6B8068', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
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
              <button className="btn btn-sage" style={{ padding: '10px 22px' }} onClick={confirm}>
                <Check size={15}/> Confirm & Generate Receipt
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 11.5, color: '#555555', fontWeight: 500 }}>Dispensed today</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#111111', marginTop: 2 }}>{42 + audits.length - 3}</p>
            <p style={{ fontSize: 11.5, color: '#888888', marginTop: 2 }}>records completed</p>
            <div className="progress-bar" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: '78%', background: '#6B8068' }}/></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 6 }}><span style={{ color: '#555555' }}>Daily target</span><b>78%</b></div>
          </div>
          <Panel title="Recent records">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {audits.slice(0, 4).map(a => (
                <div key={a.id} style={{ padding: '12px 18px', borderTop: '1px solid #EFEFEA' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111111' }}>{a.medicine}</p>
                    <span style={{ fontSize: 11.5, color: '#888888' }}>{a.quantity}x</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#888888', marginTop: 2 }}>{a.customer} · {a.date}</p>
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
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,17,0.5)' }} onClick={() => setNewCustomerModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 400, zIndex: 111 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>Quick Add Customer</h3>
              <button onClick={() => setNewCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={17} color="#888"/></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Customer Full Name *</label><input className="input" placeholder="e.g. Ramesh Patel" value={newCustName} onChange={e => setNewCustName(e.target.value)}/></div>
              <div><label className="label">Phone Number</label><input className="input" placeholder="e.g. +91 98450 12345" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}/></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn btn-secondary" onClick={() => setNewCustomerModal(false)}>Cancel</button>
                <button className="btn btn-sage" onClick={handleAddCustomer}>Add & Select</button>
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
function AuditPage({ audits, showToast }: { audits: Audit[]; showToast: (s: string) => void }) {
  const [q, setQ] = useState('');
  const rows = audits.filter(a => (a.medicine + a.customer + a.batch + a.pharmacist).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        eyebrow="COMPLIANCE"
        title="Dispensing Audit"
        description="Every dispensing event, fully traceable and review-ready."
        action={
          <button
            className="btn btn-secondary"
            onClick={() => {
              downloadCSV(
                'dispensing_audit_trail.csv',
                ['Date', 'Rx ID', 'Medicine', 'Batch', 'Quantity', 'Customer', 'Pharmacist', 'Status', 'Total (INR)'],
                audits.map(a => [a.date, a.rxId || `RX-${a.id}`, a.medicine, a.batch, a.quantity, a.customer, a.pharmacist, a.status, a.totalAmount || (a.quantity * 45)])
              );
              showToast('Downloaded dispensing_audit_trail.csv');
            }}
          >
            <Download size={14}/> Export audit log
          </button>
        }
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="search-input" style={{ maxWidth: 320 }}>
            <Search size={15} color="#888888"/><input placeholder="Search audit records..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#52796F', fontWeight: 600, background: '#E6EFEA', padding: '4px 10px', borderRadius: 99 }}>
              100% Traceable
            </span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: '#F2F2EE' }}>
              {['Date', 'Rx ID', 'Medicine', 'Batch', 'Quantity', 'Customer', 'Pharmacist', 'Status'].map(h => <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#888888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.map(a => (
              <tr key={a.id} className="table-row" style={{ borderTop: '1px solid #EFEFEA' }}>
                <td style={{ padding: '14px 20px', fontSize: 12, color: '#555555' }}>{a.date}</td>
                <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 12, color: '#6B8068', fontWeight: 700 }}>{a.rxId || `RX-2026-${a.id.toString().slice(-4)}`}</td>
                <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13 }}>{a.medicine}</td>
                <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 13 }}>{a.batch}</td>
                <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700 }}>{a.quantity}</td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#555555' }}>{a.customer}</td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#555555' }}>{a.pharmacist}</td>
                <td style={{ padding: '14px 20px' }}><Badge status={a.status}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #EFEFEA', fontSize: 12, color: '#888888' }}>Showing {rows.length} of {audits.length} logged dispensing events</div>
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
}: {
  customersList: CustomerItem[];
  setCustomersList: React.Dispatch<React.SetStateAction<CustomerItem[]>>;
  audits: Audit[];
  showToast: (s: string) => void;
}) {
  const [q, setQ] = useState('');
  const [selectedCust, setSelectedCust] = useState<CustomerItem | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', allergies: '' });

  const filtered = customersList.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));

  const handleAdd = () => {
    if (!form.name) {
      showToast('Please enter customer name');
      return;
    }
    const newC: CustomerItem = {
      id: Date.now(),
      name: form.name,
      phone: form.phone || '+91 98000 00000',
      email: form.email || `${form.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      visits: 1,
      lastVisit: 'Today',
      allergies: form.allergies || 'None',
      alerts: true,
    };
    setCustomersList([...customersList, newC]);
    setAddModal(false);
    setForm({ name: '', phone: '', email: '', allergies: '' });
    showToast(`Added customer "${form.name}"`);
  };

  return (
    <>
      <PageHeader
        eyebrow="RELATIONSHIPS"
        title="Customers"
        description="Keep customer care personal, informed, and connected with prescription tracking."
        action={
          <button className="btn btn-sage" onClick={() => setAddModal(true)}>
            <Plus size={15}/> Add Customer
          </button>
        }
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="search-input" style={{ maxWidth: 300 }}>
            <Search size={15} color="#888888"/>
            <input placeholder="Search customers..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              downloadCSV(
                'customers_directory.csv',
                ['Name', 'Phone', 'Email', 'Total Visits', 'Last Visit', 'Known Drug Allergies', 'SMS Alerts Enabled'],
                customersList.map(c => [c.name, c.phone, c.email, c.visits, c.lastVisit, c.allergies || 'None', c.alerts ? 'Yes' : 'No'])
              );
              showToast('Downloaded customers_directory.csv');
            }}
          >
            <Download size={14}/> Export
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16, padding: 20 }}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className="card card-hover"
              style={{ padding: 18, cursor: 'pointer' }}
              onClick={() => setSelectedCust(c)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: i % 2 ? '#E3ECE7' : '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13.5, color: i % 2 ? '#4A6B5D' : '#526350' }}>
                  {c.name.split(' ').map(x => x[0]).join('')}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</p>
                  <p style={{ fontSize: 11.5, color: '#888888' }}>{c.phone}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid #EFEFEA' }}>
                <div><p style={{ fontSize: 18, fontWeight: 800 }}>{c.visits}</p><p style={{ fontSize: 10.5, color: '#888888' }}>Visits</p></div>
                <div><p style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{c.lastVisit}</p><p style={{ fontSize: 10.5, color: '#888888', marginTop: 2 }}>Last visit</p></div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                  <span className="chip badge-green">{c.alerts ? 'Alerts on' : 'Alerts off'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCust && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,17,0.5)' }} onClick={() => setSelectedCust(null)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 480, padding: 0, zIndex: 111 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#526350' }}>
                  {selectedCust.name.split(' ').map(x => x[0]).join('')}
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 16 }}>{selectedCust.name}</h3>
                  <p style={{ fontSize: 12, color: '#888888' }}>{selectedCust.phone} · {selectedCust.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCust(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#888"/></button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: '#F8FAF8', borderRadius: 12, padding: 14, marginBottom: 18, border: '1px solid #E5ECE4' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#6B8068', textTransform: 'uppercase' }}>Clinical Information</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Known Allergies: <b>{selectedCust.allergies || 'None reported'}</b></p>
                <p style={{ fontSize: 13, marginTop: 2 }}>SMS Refill & Expiry Reminders: <b>{selectedCust.alerts ? 'Enabled' : 'Disabled'}</b></p>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#111111', textTransform: 'uppercase', marginBottom: 10 }}>
                Prescription & Dispense History
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {audits.filter(a => a.customer.toLowerCase().includes(selectedCust.name.toLowerCase())).map(a => (
                  <div key={a.id} style={{ padding: '10px 12px', background: '#FAFAF8', borderRadius: 8, border: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{a.medicine}</p>
                      <p style={{ fontSize: 11, color: '#888888' }}>{a.date} · Batch: {a.batch}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{a.quantity} units</span>
                  </div>
                ))}
                {audits.filter(a => a.customer.toLowerCase().includes(selectedCust.name.toLowerCase())).length === 0 && (
                  <p style={{ fontSize: 12, color: '#888888', textAlign: 'center', padding: 12 }}>No previous dispensing history found.</p>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #EFEFEA', background: '#FAFAF8', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedCust(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {addModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,17,0.5)' }} onClick={() => setAddModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, padding: 0, zIndex: 111 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800 }}>Add New Customer</h3>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#888"/></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Customer Full Name *</label><input className="input" placeholder="e.g. Ramesh Patel" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
              <div><label className="label">Phone Number</label><input className="input" placeholder="e.g. +91 98450 12345" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></div>
              <div><label className="label">Email Address</label><input className="input" placeholder="e.g. ramesh@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></div>
              <div><label className="label">Known Drug Allergies</label><input className="input" placeholder="e.g. Penicillin, Sulfa" value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })}/></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
                <button className="btn btn-sage" onClick={handleAdd}>Save Customer</button>
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
  const bg: Record<string, string> = { amber: '#F7EDE2', red: '#F9ECEF', orange: '#F7EBE3', sage: '#E8EFE7' };
  const tc: Record<string, string> = { amber: '#8C5E3C', red: '#A63A50', orange: '#B86B35', sage: '#526350' };

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
                <p style={{ fontWeight: 700, fontSize: 13.5 }}>{a.title}</p>
                <span className={`chip badge-${a.tone === 'sage' ? 'blue' : a.tone === 'amber' ? 'amber' : a.tone === 'red' ? 'red' : 'orange'}`}>{a.type}</span>
              </div>
              <p style={{ fontSize: 12.5, color: '#555555', marginTop: 4, lineHeight: 1.5 }}>{a.detail}</p>
              <button onClick={() => onNavigate(a.page)} style={{ fontSize: 12, color: '#6B8068', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
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

  const handleCreateReturn = () => {
    const target = inventory.find(x => x.batch === selectedBatch);
    if (!target) {
      showToast('Please select a valid batch to return');
      return;
    }
    setInventory(inventory.map(x => x.batch === selectedBatch ? { ...x, quantity: Math.max(0, x.quantity - returnQty) } : x));
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
          <button className="btn btn-sage" onClick={() => setModal(true)}>
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
        <div style={{ padding: 16, borderBottom: '1px solid #EFEFEA' }}>
          <div className="search-input" style={{ maxWidth: 300 }}>
            <Search size={15} color="#888888"/>
            <input placeholder="Search suppliers..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: '#F2F2EE' }}>
              {['Supplier', 'Active batches', 'Total purchases', 'Rating', ''].map(h => <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#888888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map(s => (
              <tr key={s.id} className="table-row" style={{ borderTop: '1px solid #EFEFEA' }}>
                <td style={{ padding: '14px 20px' }}>
                  <p style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</p>
                  <p style={{ fontSize: 11, color: '#888888' }}>{s.email} · {s.phone}</p>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13 }}>{s.batches} batches</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, fontSize: 13 }}>{s.purchases}</td>
                <td style={{ padding: '14px 20px' }}><span className="chip badge-green">★ {s.rating}</span></td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => showToast(`Supplier Contact: ${s.name} · Phone: ${s.phone}`)}><MoreHorizontal size={16}/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,17,0.5)' }} onClick={() => setModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, zIndex: 111 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 800 }}>Create Stock Return</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888' }}><X size={18}/></button>
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
                <button className="btn btn-sage" onClick={handleCreateReturn}>Submit Return Request</button>
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
  inventory,
  setInventory,
  showToast,
}: {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  showToast: (s: string) => void;
}) {
  const [notifyModal, setNotifyModal] = useState(false);

  const blockBatch = () => {
    setInventory(inventory.map(m => m.batch === 'AMX204' ? { ...m, status: 'Recalled' } : m));
    showToast('Batch AMX204 has been quarantined & locked from dispensing');
  };

  const handleSendNotice = () => {
    setNotifyModal(false);
    showToast('SMS & WhatsApp recall alert broadcast to 18 affected patients');
  };

  return (
    <>
      <PageHeader
        eyebrow="SAFETY CONTROLS"
        title="Batch Recall"
        description="Contain recalled medicines and protect affected customers."
        action={
          <button className="btn btn-danger" onClick={() => setNotifyModal(true)}>
            <Send size={14}/> Send Notification
          </button>
        }
      />
      <div className="card" style={{ border: '1px solid #F3C6D0', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: 18, background: '#F9ECEF', borderBottom: '1px solid #F3C6D0', display: 'flex', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5D6DC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={20} color="#A63A50" />
          </div>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, fontSize: 15 }}>Amoxicillin 500mg · AMX204</h3>
              <Badge status="Recalled" />
            </div>
            <p style={{ fontSize: 12.5, color: '#A63A50', marginTop: 3 }}>Supplier recall issued on 18 Aug 2025 due to quality concerns.</p>
          </div>
        </div>
        <div className="responsive-stats-grid" style={{ padding: 20 }}>
          {[['45', 'Units remaining', '#A63A50', 'Must be blocked'], ['18', 'Customers affected', '#B86B35', 'Notifications pending'], ['27', 'Dispensed this month', '#555555', 'Across 6 transactions']].map(([v, l, c, s]) => (
            <div key={l}><p style={{ fontSize: 11.5, color: '#888888' }}>{l}</p><p style={{ fontSize: 28, fontWeight: 800, color: '#111111', marginTop: 2 }}>{v}</p><p style={{ fontSize: 11.5, color: c, marginTop: 2 }}>{s}</p></div>
          ))}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #EFEFEA', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => showToast('Showing 18 customer records matching AMX204')}><Users size={14}/> View Impacted Customers</button>
          <button className="btn btn-danger" onClick={blockBatch}><ShieldCheck size={14}/> Lock / Block Batch</button>
          <button className="btn btn-secondary" onClick={() => setNotifyModal(true)}><Send size={14}/> Send Safety Notice</button>
        </div>
      </div>

      {notifyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,17,0.5)' }} onClick={() => setNotifyModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, zIndex: 111 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EFEFEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800 }}>Broadcast Safety Recall Alert</h3>
              <button onClick={() => setNotifyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#888"/></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: '#555555' }}>
                This will send an automated SMS & WhatsApp notification to all <b>18 patients</b> who received batch <b>AMX204 (Amoxicillin 500mg)</b>.
              </p>
              <div style={{ background: '#F9ECEF', padding: 12, borderRadius: 8, border: '1px solid #F3C6D0', fontSize: 12.5, color: '#A63A50' }}>
                "Urgent notification from WellCare Pharmacy: Please discontinue taking Amoxicillin 500mg Batch AMX204. Please visit the pharmacy for free replacement."
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setNotifyModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleSendNotice}>Send 18 Notifications</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    { from: 'ai', text: 'Hello, Dr. Anita. I am your PharmaFlow AI Assistant. I have live access to your current medicine inventory, expiry risks, dispensing patterns, and order simulations. How can I help you today?' }
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
        <Panel title="Dispensing Trend" action={<span style={{ fontSize: 12, color: '#52796F', fontWeight: 600 }}>+12.4% vs prior</span>}><SimpleChart /></Panel>
        <Panel title="Stock Movement"><SimpleChart type="bar" /></Panel>
        <Panel title="Expiry Risk by Month">
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Sep 2026', '12', '#A63A50'], ['Oct 2026', '18', '#B86B35'], ['Nov 2026', '28', '#B86B35'], ['Dec 2026', '34', '#52796F'], ['Jan 2027', '42', '#CCCCCC']].map(([m, v, c]) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 54, fontSize: 11.5, color: '#555555' }}>{m}</span>
                <div style={{ flex: 1, height: 18, background: '#F2F2EE', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Number(v) * 1.8}%`, background: c, borderRadius: 5 }}/>
                </div>
                <span style={{ width: 22, fontSize: 11.5, fontWeight: 700, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top Dispensed Medicines">
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredMeds.map((x, i) => (
              <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                <span style={{ width: 20, fontSize: 10.5, color: '#888888', fontWeight: 600 }}>0{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{x.name}</span>
                <span style={{ fontWeight: 700 }}>{x.count}</span>
                <ArrowUpRight size={12} color="#52796F" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ─────────── 14. SETTINGS & PROFILE (WITH INTERACTIVE TOGGLES & PERSISTENCE) ─────────── */
function PharmSettings({ showToast }: { showToast: (s: string) => void }) {
  const [section, setSection] = useState('Profile');
  const sections = ['Profile', 'Pharmacy Workspace', 'Alert Preferences', 'Dispensing Rules', 'AI Assistant Preferences'];

  const [profile, setProfile] = useState({
    firstName: 'Anita',
    lastName: 'Rao',
    email: 'pharmacist@wellcare.com',
    license: 'PHARM-KA-2024-8842',
  });

  const [workspace, setWorkspace] = useState({
    pharmacyName: 'WellCare Pharmacy',
    location: 'Main Medical Square, 100 Feet Rd, Indiranagar',
    timezone: 'Asia/Kolkata (GMT+5:30)',
  });

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
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #EFEFEA' }}>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>{section}</h3>
            <p style={{ fontSize: 11.5, color: '#888888', marginTop: 3 }}>Manage your {section.toLowerCase()} settings.</p>
          </div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
            {section === 'Profile' ? <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#E8EFE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#526350' }}>
                  {profile.firstName[0] || 'A'}{profile.lastName[0] || 'R'}
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={() => showToast('Profile avatar photo updated')}>Change photo</button>
                  <p style={{ fontSize: 11, color: '#888888', marginTop: 4 }}>JPG, PNG up to 2MB</p>
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
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EFEFEA' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#111111' }}>{k}</p>
                    <p style={{ fontSize: 11.5, color: '#888888', marginTop: 2 }}>Status: {alertsState[k] ? 'Active notifications' : 'Muted'}</p>
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
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EFEFEA' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#111111' }}>{k}</p>
                    <p style={{ fontSize: 11.5, color: '#888888', marginTop: 2 }}>{rulesState[k] ? 'Enforced across all transactions' : 'Disabled'}</p>
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
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EFEFEA' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#111111' }}>{k}</p>
                    <p style={{ fontSize: 11.5, color: '#888888', marginTop: 2 }}>AI model recommendations</p>
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
            <button className="btn btn-sage" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={() => showToast('All settings saved successfully')}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── MAIN PHARMACIST PORTAL ─────────── */
export default function PharmacistPortal({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<Page>('dashboard');
  const [inventory, setInventory] = useState<Medicine[]>(initialInventory);
  const [customersList, setCustomersList] = useState<CustomerItem[]>(initialCustomers);
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>(initialSuppliers);
  const [filterQuery, setFilterQuery] = useState('');

  const [audits, setAudits] = useState<Audit[]>([
    { id: 1, date: 'Today, 10:42 AM', medicine: 'Paracetamol 500mg', batch: 'PCT101', quantity: 12, customer: 'Priya Sharma', pharmacist: 'Dr. Anita Rao', status: 'Completed', rxId: 'RX-2026-88192', totalAmount: 300 },
    { id: 2, date: 'Today, 09:18 AM', medicine: 'Cetirizine 10mg', batch: 'CTZ302', quantity: 5, customer: 'Arun Kumar', pharmacist: 'Dr. Anita Rao', status: 'Completed', rxId: 'RX-2026-88185', totalAmount: 175 },
    { id: 3, date: 'Yesterday, 04:35 PM', medicine: 'Vitamin D3 60K', batch: 'VD102', quantity: 10, customer: 'Meena Devi', pharmacist: 'Dr. Suresh', status: 'Completed', rxId: 'RX-2026-88102', totalAmount: 650 },
  ]);
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 3000);
  };

  const handleMenu = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setMobileDrawerOpen(true);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const handleNavigateWithFilter = (targetPage: Page, query?: string) => {
    setFilterQuery(query || '');
    setPage(targetPage);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
      <Sidebar
        open={sidebarOpen}
        page={page}
        onNavigate={p => { setFilterQuery(''); setPage(p as Page); }}
        onLogout={onLogout}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        page={page}
        onNavigate={p => { setFilterQuery(''); setPage(p as Page); }}
        onLogout={onLogout}
      />

      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          marginLeft: 68,
          transition: 'margin 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: 0,
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
        />
        <main style={{ padding: 'clamp(14px, 2.5vw, 28px)', maxWidth: 1400, margin: '0 auto', paddingBottom: '90px' }} className="animate-fade-in">
          {page === 'dashboard' && <Dashboard onNavigate={p => setPage(p as Page)} />}
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
            />
          )}
          {page === 'audit' && <AuditPage audits={audits} showToast={showToast} />}
          {page === 'customers' && (
            <Customers
              customersList={customersList}
              setCustomersList={setCustomersList}
              audits={audits}
              showToast={showToast}
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
          {page === 'recall' && <Recall inventory={inventory} setInventory={setInventory} showToast={showToast} />}
          {page === 'ai' && <Assistant inventory={inventory} audits={audits} onOpenSimulator={() => setPage('simulator')} />}
          {page === 'simulator' && <WhatIfSimulator inventory={inventory} setInventory={setInventory} showToast={showToast} />}
          {page === 'reports' && <Reports showToast={showToast} />}
          {page === 'settings' && <PharmSettings showToast={showToast} />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button onClick={() => setPage('dashboard')} className={`mobile-bottom-item ${page === 'dashboard' ? 'active' : ''}`}>
          <Gauge size={19} />
          <span>Dashboard</span>
        </button>
        <button onClick={() => setPage('inventory')} className={`mobile-bottom-item ${page === 'inventory' ? 'active' : ''}`}>
          <Boxes size={19} />
          <span>Inventory</span>
        </button>
        <button onClick={() => setPage('dispensing')} className={`mobile-bottom-item ${page === 'dispensing' ? 'active' : ''}`}>
          <CreditCard size={19} />
          <span>Dispense</span>
        </button>
        <button onClick={() => setPage('simulator')} className={`mobile-bottom-item ${page === 'simulator' ? 'active' : ''}`}>
          <SlidersHorizontal size={19} />
          <span>Simulator</span>
        </button>
        <button onClick={() => setMobileDrawerOpen(true)} className="mobile-bottom-item">
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>

      {toast && (
        <div className="animate-slide-up" style={{ position: 'fixed', bottom: 74, right: 20, zIndex: 120, display: 'flex', alignItems: 'center', gap: 10, background: '#111111', color: 'white', padding: '11px 18px', borderRadius: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 13, fontWeight: 500 }}>
          <CheckCircle2 size={16} color="#A3B19B" /> {toast}
        </div>
      )}
    </div>
  );
}
