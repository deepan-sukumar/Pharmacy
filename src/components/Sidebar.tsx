import React, { useState } from 'react';
import {
  Gauge, Boxes, CalendarDays, Truck, CreditCard, ClipboardList,
  Users, Bell, ShieldAlert, BrainCircuit, SlidersHorizontal, BarChart3,
  Settings as SettingsIcon, Stethoscope, ChevronDown, ChevronRight,
  LogOut, PanelLeftClose, PanelLeft, X, Sparkles
} from 'lucide-react';
import type { Page } from '../data';

interface SubItem {
  id: Page;
  label: string;
  icon: React.ElementType;
  count?: number;
  countTone?: 'amber' | 'red' | 'teal';
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  defaultPage: Page;
  items: SubItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    defaultPage: 'inventory',
    items: [
      { id: 'inventory', label: 'Medicines & Stock', icon: Boxes },
      { id: 'expiry', label: 'Batches & Expiry', icon: CalendarDays },
      { id: 'suppliers', label: 'Suppliers & Returns', icon: Truck },
    ],
  },
  {
    id: 'dispensing',
    label: 'Dispensing',
    icon: CreditCard,
    defaultPage: 'dispensing',
    items: [
      { id: 'dispensing', label: 'New Dispensing', icon: CreditCard },
      { id: 'audit', label: 'Dispensing Audit', icon: ClipboardList },
      { id: 'customers', label: 'Customers', icon: Users },
    ],
  },
  {
    id: 'safety',
    label: 'Safety & Alerts',
    icon: ShieldAlert,
    defaultPage: 'alerts',
    items: [
      { id: 'alerts', label: 'Alerts', icon: Bell, count: 3, countTone: 'amber' },
      { id: 'recall', label: 'Batch Recall', icon: ShieldAlert, count: 1, countTone: 'red' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Insights',
    icon: BrainCircuit,
    defaultPage: 'ai',
    items: [
      { id: 'ai', label: 'AI Pharmacy Assistant', icon: BrainCircuit },
      { id: 'simulator', label: 'What-If Simulator', icon: SlidersHorizontal },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    ],
  },
];

interface SidebarProps {
  page: Page;
  onNavigate: (p: Page) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  inventoryCount?: number;
  criticalAlertCount?: number;
}

export default function Sidebar({
  page,
  onNavigate,
  onLogout,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Determine which group contains the current active page
  const activeGroupId = navGroups.find(g =>
    g.items.some(i => i.id === page || (page === 'add-stock' && g.id === 'inventory'))
  )?.id || null;

  // Single-expanded accordion: only one group is expanded at a time
  // Default to null if on dashboard/settings, or active group if on a child route
  const [expandedGroup, setExpandedGroup] = useState<string | null>(activeGroupId);

  // Automatically expand the section corresponding to active route whenever page changes
  React.useEffect(() => {
    if (activeGroupId) {
      setExpandedGroup(activeGroupId);
    }
  }, [activeGroupId, page]);

  const toggleGroup = (groupId: string) => {
    // When clicking a group header in expanded view: toggle accordion
    setExpandedGroup(prev => (prev === groupId ? null : groupId));
  };

  // Tooltip tracking for collapsed mode
  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; top: number } | null>(null);

  // Handle clicking a group icon when collapsed (navigates directly without expanding sidebar)
  const handleCollapsedGroupClick = (group: NavGroup) => {
    // Set this group as active accordion for whenever user expands
    setExpandedGroup(group.id);
    // Navigate directly to group's default page while keeping collapsed state
    onNavigate(group.defaultPage);
  };

  return (
    <aside
      className={`sidebar-container hidden-mobile-aside ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? 74 : 260,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 40,
      }}
    >
      {/* ────────── TOP HEADER & EXPAND/COLLAPSE CONTROL ────────── */}
      <div
        style={{
          padding: collapsed ? '14px 8px 12px' : '0 16px',
          height: collapsed ? 'auto' : 68,
          minHeight: collapsed ? 88 : 68,
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: collapsed ? 8 : 10,
          flexShrink: 0,
        }}
      >
        {/* Brand Logo & Name */}
        <div
          onClick={() => onNavigate('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            overflow: 'hidden',
          }}
          title="PharmaFlow Operations Portal"
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
            }}
          >
            <Stethoscope size={20} color="#FFFFFF" />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.3px' }}>
                  PHARMAFLOW
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: '#0D9488',
                    background: '#F0FDFA',
                    padding: '1.5px 5px',
                    borderRadius: 4,
                    border: '1px solid #CCFBF1',
                  }}
                >
                  PRO
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', fontWeight: 500 }}>
                Audit & Expiry Portal
              </p>
            </div>
          )}
        </div>

        {/* Single Top Expand/Collapse Control */}
        {!collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="btn-ghost"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
            }}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            onMouseEnter={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTooltip({ label: 'Expand sidebar', top: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
            style={{
              width: 36,
              height: 32,
              borderRadius: 8,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0D9488',
              backgroundColor: '#F0FDFA',
              border: '1px solid #CCFBF1',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Expand sidebar"
          >
            <PanelLeft size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* ────────── MAIN NAVIGATION AREA ────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: collapsed ? '12px 8px' : '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: collapsed ? 8 : 4,
        }}
      >
        {/* 1. DASHBOARD */}
        {collapsed ? (
          <button
            onClick={() => onNavigate('dashboard')}
            onMouseEnter={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTooltip({ label: 'Dashboard', top: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
            style={{
              width: 48,
              height: 48,
              margin: '0 auto',
              borderRadius: 12,
              background: page === 'dashboard' ? '#F0FDFA' : 'transparent',
              border: page === 'dashboard' ? '1.5px solid #0D9488' : '1px solid transparent',
              color: page === 'dashboard' ? '#0D9488' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Dashboard"
          >
            <Gauge size={20} strokeWidth={page === 'dashboard' ? 2.4 : 1.8} />
          </button>
        ) : (
          <button
            onClick={() => onNavigate('dashboard')}
            className={`sidebar-subitem ${page === 'dashboard' ? 'active' : ''}`}
            style={{
              fontSize: 13.5,
              fontWeight: page === 'dashboard' ? 700 : 600,
              color: page === 'dashboard' ? '#0D9488' : '#334155',
              padding: '10px 14px',
              borderRadius: page === 'dashboard' ? '0 10px 10px 0' : '10px',
              marginBottom: 6,
            }}
          >
            <Gauge size={18} strokeWidth={page === 'dashboard' ? 2.4 : 1.8} />
            <span>Dashboard</span>
          </button>
        )}

        {/* 2. GROUPED NAVIGATION SECTIONS */}
        {navGroups.map(group => {
          const isGroupActive = activeGroupId === group.id;
          const isExpanded = expandedGroup === group.id;
          const GroupIcon = group.icon;

          if (collapsed) {
            // Collapsed rail mode: show main group icon only with tooltip
            // Clicking expands the sidebar and opens this category (Requirement #5)
            return (
              <div key={group.id} style={{ position: 'relative' }}>
                <button
                  onClick={() => handleCollapsedGroupClick(group)}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredTooltip({ label: group.label, top: rect.top + rect.height / 2 });
                  }}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  style={{
                    width: 48,
                    height: 48,
                    margin: '0 auto',
                    borderRadius: 12,
                    background: isGroupActive ? '#F0FDFA' : 'transparent',
                    border: isGroupActive ? '1.5px solid #0D9488' : '1px solid transparent',
                    color: isGroupActive ? '#0D9488' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                  title={group.label}
                >
                  <GroupIcon size={20} strokeWidth={isGroupActive ? 2.4 : 1.8} />
                  {group.items.some(i => i.count) && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: '#DC2626',
                        border: '1.5px solid #FFFFFF',
                      }}
                    />
                  )}
                </button>
              </div>
            );
          }

          return (
            <div key={group.id} style={{ marginBottom: 4 }}>
              {/* Group Header with Expand/Collapse toggle */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="sidebar-group-header"
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  backgroundColor: isExpanded ? '#F8FAFC' : 'transparent',
                  border: isExpanded ? '1px solid #E2E8F0' : '1px solid transparent',
                }}
                title={`${group.label} (Click to expand/collapse)`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GroupIcon size={15} color={isGroupActive ? '#0D9488' : '#64748B'} strokeWidth={isGroupActive ? 2.2 : 1.8} />
                  <span style={{ color: isGroupActive ? '#0F172A' : '#475569', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>
                    {group.label.toUpperCase()}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} color="#64748B" />
                ) : (
                  <ChevronRight size={14} color="#94A3B8" />
                )}
              </button>

              {/* Sub-items list with clear visual hierarchy */}
              {isExpanded && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    marginTop: 3,
                    marginLeft: 12,
                    paddingLeft: 10,
                    borderLeft: '2px solid #E2E8F0',
                  }}
                >
                  {group.items.map(item => {
                    const isItemActive = page === item.id || (page === 'add-stock' && item.id === 'inventory');
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`sidebar-subitem ${isItemActive ? 'active' : ''}`}
                        style={{
                          padding: '8px 12px',
                          fontSize: 13,
                        }}
                      >
                        <ItemIcon
                          size={15}
                          strokeWidth={isItemActive ? 2.2 : 1.8}
                          color={isItemActive ? '#0D9488' : '#64748B'}
                        />
                        <span style={{ flex: 1, fontWeight: isItemActive ? 700 : 500 }}>
                          {item.label}
                        </span>
                        {item.count !== undefined && (
                          <span
                            className={`chip ${
                              item.countTone === 'red'
                                ? 'badge-red'
                                : item.countTone === 'amber'
                                ? 'badge-amber'
                                : 'badge-teal'
                            }`}
                            style={{
                              padding: '1.5px 6px',
                              fontSize: 10,
                              lineHeight: 1.2,
                              borderRadius: 99,
                              fontWeight: 800,
                            }}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ────────── BOTTOM SETTINGS & LOGOUT (PERMANENTLY ANCHORED) ────────── */}
      <div
        style={{
          borderTop: '1px solid #E2E8F0',
          padding: collapsed ? '10px 8px 14px' : '10px 12px 14px',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
        }}
      >
        {/* Settings Item */}
        {collapsed ? (
          <button
            onClick={() => onNavigate('settings')}
            onMouseEnter={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTooltip({ label: 'Settings', top: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
            style={{
              width: 48,
              height: 44,
              margin: '0 auto',
              borderRadius: 10,
              background: page === 'settings' ? '#F0FDFA' : 'transparent',
              border: page === 'settings' ? '1.5px solid #0D9488' : '1px solid transparent',
              color: page === 'settings' ? '#0D9488' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Settings"
          >
            <SettingsIcon size={19} />
          </button>
        ) : (
          <button
            onClick={() => onNavigate('settings')}
            className={`sidebar-subitem ${page === 'settings' ? 'active' : ''}`}
            style={{
              fontSize: 13.5,
              fontWeight: page === 'settings' ? 700 : 500,
              color: page === 'settings' ? '#0D9488' : '#334155',
              padding: '9px 12px',
              borderRadius: 8,
            }}
          >
            <SettingsIcon size={17} strokeWidth={page === 'settings' ? 2.2 : 1.8} />
            <span>Settings</span>
          </button>
        )}

        {/* User Profile & Logout */}
        {!collapsed ? (
          <div
            style={{
              paddingTop: 8,
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 99,
                  background: '#0D9488',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                AR
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Dr. Anita Rao
                </p>
                <p style={{ fontSize: 11, color: '#64748B' }}>Pharmacist-in-Charge</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn-ghost"
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            onMouseEnter={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTooltip({ label: 'Sign Out', top: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => setHoveredTooltip(null)}
            style={{
              width: 48,
              height: 44,
              margin: '0 auto',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid transparent',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Sign Out"
          >
            <LogOut size={19} />
          </button>
        )}
      </div>

      {/* Floating Tooltip in Collapsed Mode */}
      {collapsed && hoveredTooltip && (
        <div
          className="sidebar-tooltip animate-fade-in"
          style={{
            top: hoveredTooltip.top,
            transform: 'translateY(-50%)',
          }}
        >
          {hoveredTooltip.label}
        </div>
      )}
    </aside>
  );
}

/* ────────── MOBILE DRAWER NAVIGATION ────────── */
export function MobileSidebarDrawer({
  open,
  onClose,
  page,
  onNavigate,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  page: Page;
  onNavigate: (p: Page) => void;
  onLogout: () => void;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
        }}
        onClick={onClose}
      />
      <div
        className="animate-slide-in-right"
        style={{
          position: 'relative',
          width: '85%',
          maxWidth: 320,
          background: '#FFFFFF',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          zIndex: 151,
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#0D9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Stethoscope size={18} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>PharmaFlow</p>
              <p style={{ fontSize: 11, color: '#64748B' }}>Operations Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} color="#64748B" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
          <button
            onClick={() => {
              onNavigate('dashboard');
              onClose();
            }}
            className={`sidebar-subitem ${page === 'dashboard' ? 'active' : ''}`}
            style={{ marginBottom: 12, padding: '10px 14px' }}
          >
            <Gauge size={18} />
            <span style={{ fontWeight: 700 }}>Dashboard</span>
          </button>

          {navGroups.map(group => (
            <div key={group.id} style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#94A3B8',
                  padding: '4px 12px',
                  textTransform: 'uppercase',
                }}
              >
                {group.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                {group.items.map(item => {
                  const active = page === item.id || (page === 'add-stock' && item.id === 'inventory');
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className={`sidebar-subitem ${active ? 'active' : ''}`}
                      style={{ padding: '9px 14px' }}
                    >
                      <Icon size={17} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.count && (
                        <span
                          className={`chip ${item.countTone === 'red' ? 'badge-red' : 'badge-amber'}`}
                          style={{ padding: '1px 6px', fontSize: 10 }}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ paddingTop: 8, borderTop: '1px solid #E2E8F0', marginTop: 8 }}>
            <button
              onClick={() => {
                onNavigate('settings');
                onClose();
              }}
              className={`sidebar-subitem ${page === 'settings' ? 'active' : ''}`}
              style={{ padding: '9px 14px' }}
            >
              <SettingsIcon size={17} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Dr. Anita Rao</p>
            <p style={{ fontSize: 11, color: '#64748B' }}>Pharmacist-in-Charge</p>
          </div>
          <button
            onClick={onLogout}
            className="btn btn-danger"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
