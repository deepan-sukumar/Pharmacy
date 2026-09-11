import React, { useState } from 'react';
import {
  Gauge, Boxes, CalendarDays, Truck, CreditCard, ClipboardList,
  Users, Bell, ShieldAlert, BrainCircuit, SlidersHorizontal, BarChart3,
  Settings as SettingsIcon, Stethoscope, ChevronDown, ChevronRight,
  LogOut, PanelLeftClose, PanelLeft, X, Sparkles, MessageSquare
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
      { id: 'sms-reports', label: 'SMS Notifications', icon: MessageSquare },
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
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 40,
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* ────────── TOP HEADER & EXPAND/COLLAPSE CONTROL ────────── */}
      <div
        style={{
          padding: collapsed ? '14px 8px 12px' : '0 16px',
          height: collapsed ? 'auto' : 68,
          minHeight: collapsed ? 88 : 68,
          borderBottom: '1px solid var(--border)',
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
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px var(--primary-glow)',
            }}
          >
            <Stethoscope size={20} color="#FFFFFF" />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  PHARMAFLOW
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: 'var(--primary)',
                    background: 'var(--primary-light)',
                    padding: '1.5px 5px',
                    borderRadius: 4,
                    border: '1px solid var(--primary-border)',
                  }}
                >
                  PRO
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-4)', whiteSpace: 'nowrap', fontWeight: 500 }}>
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
              color: 'var(--text-3)',
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
              color: 'var(--primary)',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
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
              background: page === 'dashboard' ? 'var(--primary-light)' : 'transparent',
              border: page === 'dashboard' ? '1.5px solid var(--primary)' : '1px solid transparent',
              color: page === 'dashboard' ? 'var(--primary)' : 'var(--text-3)',
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
              color: page === 'dashboard' ? 'var(--primary)' : 'var(--text-2)',
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
                    background: isGroupActive ? 'var(--primary-light)' : 'transparent',
                    border: isGroupActive ? '1.5px solid var(--primary)' : '1px solid transparent',
                    color: isGroupActive ? 'var(--primary)' : 'var(--text-3)',
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
                        backgroundColor: 'var(--danger)',
                        border: '1.5px solid var(--bg-sidebar)',
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
                  backgroundColor: isExpanded ? 'var(--bg-alt)' : 'transparent',
                  border: isExpanded ? '1px solid var(--border)' : '1px solid transparent',
                }}
                title={`${group.label} (Click to expand/collapse)`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GroupIcon size={15} color={isGroupActive ? 'var(--primary)' : 'var(--text-4)'} strokeWidth={isGroupActive ? 2.2 : 1.8} />
                  <span style={{ color: isGroupActive ? 'var(--text)' : 'var(--text-3)', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.04em' }}>
                    {group.label.toUpperCase()}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} color="var(--text-3)" />
                ) : (
                  <ChevronRight size={14} color="var(--text-4)" />
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
                    borderLeft: '2px solid var(--border)',
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
                          color={isItemActive ? 'var(--primary)' : 'var(--text-3)'}
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
          borderTop: '1px solid var(--border)',
          padding: collapsed ? '10px 8px 14px' : '10px 12px 14px',
          backgroundColor: 'var(--bg-alt)',
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
              background: page === 'settings' ? 'var(--primary-light)' : 'transparent',
              border: page === 'settings' ? '1.5px solid var(--primary)' : '1px solid transparent',
              color: page === 'settings' ? 'var(--primary)' : 'var(--text-3)',
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
              color: page === 'settings' ? 'var(--primary)' : 'var(--text-2)',
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
              borderTop: '1px solid var(--border)',
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
                  background: 'var(--primary)',
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
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Dr. Anita Rao
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-4)' }}>Pharmacist-in-Charge</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="btn-ghost"
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                color: 'var(--danger)',
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
              color: 'var(--danger)',
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

/* ────────── MOBILE BOTTOM NAVIGATION BAR ────────── */
export function MobileBottomNav({
  page,
  onNavigate,
  onOpenMenu,
  alertCount = 3,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  onOpenMenu: () => void;
  alertCount?: number;
}) {
  const isInventoryActive = ['inventory', 'add-stock', 'expiry', 'suppliers'].includes(page);
  const isDispenseActive = ['dispensing', 'audit', 'customers'].includes(page);
  const isAlertsActive = ['alerts', 'recall'].includes(page);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <button
        onClick={() => onNavigate('dashboard')}
        className={`mobile-nav-tab ${page === 'dashboard' ? 'active' : ''}`}
        title="Dashboard"
      >
        <Gauge size={20} strokeWidth={page === 'dashboard' ? 2.5 : 1.8} />
        <span>Home</span>
      </button>

      <button
        onClick={() => onNavigate('inventory')}
        className={`mobile-nav-tab ${isInventoryActive ? 'active' : ''}`}
        title="Inventory"
      >
        <Boxes size={20} strokeWidth={isInventoryActive ? 2.5 : 1.8} />
        <span>Inventory</span>
      </button>

      <button
        onClick={() => onNavigate('dispensing')}
        className={`mobile-nav-tab ${isDispenseActive ? 'active' : ''}`}
        title="Dispense Prescription"
      >
        <div
          style={{
            marginTop: -8,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isDispenseActive ? 'var(--primary)' : 'var(--primary-light)',
            border: '2px solid var(--primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDispenseActive ? '#FFFFFF' : 'var(--primary)',
            boxShadow: '0 2px 8px var(--primary-glow)',
          }}
        >
          <CreditCard size={18} strokeWidth={2.2} />
        </div>
        <span style={{ color: isDispenseActive ? 'var(--primary)' : undefined }}>Dispense</span>
      </button>

      <button
        onClick={() => onNavigate('alerts')}
        className={`mobile-nav-tab ${isAlertsActive ? 'active' : ''}`}
        title="Alerts & Recalls"
      >
        <div style={{ position: 'relative' }}>
          <Bell size={20} strokeWidth={isAlertsActive ? 2.5 : 1.8} />
          {alertCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -4,
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: 'var(--danger)',
                border: '1px solid var(--surface)',
              }}
            />
          )}
        </div>
        <span>Alerts</span>
      </button>

      <button
        onClick={onOpenMenu}
        className="mobile-nav-tab"
        title="Open Full Menu"
      >
        <PanelLeft size={20} strokeWidth={1.8} />
        <span>Menu</span>
      </button>
    </nav>
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
        zIndex: 200,
        display: 'flex',
      }}
    >
      {/* Backdrop overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Slide-out drawer panel */}
      <div
        className="animate-slide-in-right"
        style={{
          position: 'relative',
          width: '85%',
          maxWidth: 320,
          background: 'var(--bg-sidebar)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 201,
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px var(--primary-glow)',
              }}
            >
              <Stethoscope size={19} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.3px' }}>
                  PHARMAFLOW
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'var(--primary)',
                    background: 'var(--primary-light)',
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  PRO
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-4)' }}>Operations Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close menu"
          >
            <X size={18} color="var(--text-3)" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Dashboard */}
          <button
            onClick={() => {
              onNavigate('dashboard');
              onClose();
            }}
            className={`sidebar-subitem ${page === 'dashboard' ? 'active' : ''}`}
            style={{
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: page === 'dashboard' ? 700 : 600,
              borderRadius: 8,
              borderLeft: page === 'dashboard' ? '3px solid var(--primary)' : 'none',
              background: page === 'dashboard' ? 'var(--primary-light)' : 'transparent',
              color: page === 'dashboard' ? 'var(--primary)' : 'var(--text-2)',
            }}
          >
            <Gauge size={18} strokeWidth={page === 'dashboard' ? 2.4 : 1.8} />
            <span>Dashboard</span>
          </button>

          {/* Grouped sections */}
          {navGroups.map(group => (
            <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--text-4)',
                  textTransform: 'uppercase',
                }}
              >
                <group.icon size={13} color="var(--text-4)" />
                <span>{group.label}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 6 }}>
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
                      style={{
                        padding: '9px 12px',
                        fontSize: 13,
                        borderRadius: 8,
                      }}
                    >
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} color={active ? 'var(--primary)' : 'var(--text-3)'} />
                      <span style={{ flex: 1, fontWeight: active ? 700 : 500 }}>{item.label}</span>
                      {item.count !== undefined && (
                        <span
                          className={`chip ${item.countTone === 'red' ? 'badge-red' : item.countTone === 'amber' ? 'badge-amber' : 'badge-teal'}`}
                          style={{ padding: '1px 6px', fontSize: 10, fontWeight: 800 }}
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

          {/* Settings Section */}
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button
              onClick={() => {
                onNavigate('settings');
                onClose();
              }}
              className={`sidebar-subitem ${page === 'settings' ? 'active' : ''}`}
              style={{ padding: '9px 12px', fontSize: 13.5 }}
            >
              <SettingsIcon size={17} strokeWidth={page === 'settings' ? 2.2 : 1.8} />
              <span>Settings & Profile</span>
            </button>
          </div>
        </div>

        {/* Drawer Bottom Profile & Logout */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-alt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--primary)',
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
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Dr. Anita Rao
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Pharmacist-in-Charge</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="btn btn-danger"
            style={{ padding: '6px 12px', fontSize: 12, minHeight: 34 }}
            title="Sign Out"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

