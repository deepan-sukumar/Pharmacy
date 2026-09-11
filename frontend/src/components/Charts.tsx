import React, { useState } from 'react';
import type { Medicine } from '../data';
import { AlertCircle, Clock3, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';

/* ─────────── 1. EXPIRY RISK OVERVIEW CHART ─────────── */
export function ExpiryRiskChart({
  inventory,
  onNavigateExpiry,
}: {
  inventory: Medicine[];
  onNavigateExpiry?: () => void;
}) {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  // Derive risk segments from real inventory data
  const expiredCount = inventory.filter(m => m.status === 'Expired').length;
  const criticalCount = inventory.filter(m => m.status === 'Recalled').length;
  const nearExpiryCount = inventory.filter(m => m.status === 'Near Expiry').length;
  const safeCount = inventory.filter(m => m.status === 'Available' || m.status === 'Low Stock').length;
  const total = inventory.length || 1;

  const segments = [
    {
      id: 'expired',
      label: 'Expired',
      count: expiredCount,
      color: 'var(--danger)',
      bgColor: 'var(--danger-light)',
      borderColor: 'var(--danger-border)',
      sub: 'Action: Quarantine & disposal',
      icon: AlertCircle,
      percent: Math.round((expiredCount / total) * 100),
    },
    {
      id: 'critical',
      label: 'Critical / Recalled',
      count: criticalCount,
      color: 'var(--orange)',
      bgColor: 'var(--orange-light)',
      borderColor: 'var(--orange-border)',
      sub: 'Action: Return to supplier',
      icon: ShieldAlert,
      percent: Math.round((criticalCount / total) * 100),
    },
    {
      id: 'near',
      label: 'Near Expiry (<90d)',
      count: nearExpiryCount,
      color: 'var(--warning)',
      bgColor: 'var(--warning-light)',
      borderColor: 'var(--warning-border)',
      sub: 'Action: FEFO priority dispensing',
      icon: Clock3,
      percent: Math.round((nearExpiryCount / total) * 100),
    },
    {
      id: 'safe',
      label: 'Safe & Stable (>90d)',
      count: safeCount,
      color: 'var(--success)',
      bgColor: 'var(--success-light)',
      borderColor: 'var(--success-border)',
      sub: 'Optimal stock levels',
      icon: CheckCircle2,
      percent: Math.round((safeCount / total) * 100),
    },
  ];

  return (
    <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Stacked Proportional Distribution Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
            Batch Expiry Risk Distribution
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            {inventory.length} Total Batches Tracked
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div
          style={{
            height: 14,
            borderRadius: 99,
            display: 'flex',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-alt)',
            border: '1px solid var(--border)',
            position: 'relative',
          }}
        >
          {segments.map(seg => {
            const widthPct = Math.max(seg.percent, seg.count > 0 ? 5 : 0);
            if (widthPct === 0) return null;
            const isHovered = activeSegment === seg.id;
            return (
              <div
                key={seg.id}
                onMouseEnter={() => setActiveSegment(seg.id)}
                onMouseLeave={() => setActiveSegment(null)}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: seg.color,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  opacity: activeSegment && !isHovered ? 0.45 : 1,
                  filter: isHovered ? 'brightness(1.1)' : 'none',
                }}
                title={`${seg.label}: ${seg.count} batches (${seg.percent}%)`}
              />
            );
          })}
        </div>

        {/* Legend pills below bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {segments.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSegment(activeSegment === s.id ? null : s.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: activeSegment === s.id ? s.bgColor : 'transparent',
                border: `1px solid ${activeSegment === s.id ? s.borderColor : 'transparent'}`,
                borderRadius: 6,
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--text-3)',
                fontWeight: activeSegment === s.id ? 700 : 500,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color }} />
              <span>{s.label}</span>
              <strong style={{ color: 'var(--text)' }}>({s.count})</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Breakdown Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
        }}
      >
        {segments.map(seg => {
          const Icon = seg.icon;
          const isSelected = activeSegment === seg.id;
          return (
            <div
              key={seg.id}
              onClick={() => setActiveSegment(isSelected ? null : seg.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: isSelected ? seg.bgColor : 'var(--bg-alt)',
                border: `1px solid ${isSelected ? seg.borderColor : 'var(--border)'}`,
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon size={16} color={seg.color} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{seg.label}</span>
                </div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: seg.color,
                  }}
                >
                  {seg.count}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{seg.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Relevant batches list when a segment is selected */}
      {activeSegment && (
        <div
          className="animate-slide-up"
          style={{
            background: 'var(--surface)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
              Batches in category: {segments.find(s => s.id === activeSegment)?.label}
            </span>
            {onNavigateExpiry && (
              <button
                onClick={onNavigateExpiry}
                style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
              >
                View in Expiry Table →
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
            {inventory
              .filter(m => {
                if (activeSegment === 'expired') return m.status === 'Expired';
                if (activeSegment === 'critical') return m.status === 'Recalled';
                if (activeSegment === 'near') return m.status === 'Near Expiry';
                return m.status === 'Available' || m.status === 'Low Stock';
              })
              .map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11.5,
                    padding: '5px 0',
                    borderBottom: '1px solid var(--border-light)',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{m.medicine}</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-3)', fontSize: 11 }}>
                    {m.batch} · {m.quantity} units ({m.expiry})
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── 2. STOCK MOVEMENT CHART (INFLOW VS DISPENSED) ─────────── */
export function StockMovementChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const monthsData = [
    { month: 'Apr', incoming: 1200, dispensed: 980 },
    { month: 'May', incoming: 1450, dispensed: 1320 },
    { month: 'Jun', incoming: 1100, dispensed: 1250 },
    { month: 'Jul', incoming: 1800, dispensed: 1540 },
    { month: 'Aug', incoming: 1650, dispensed: 1610 },
    { month: 'Sep', incoming: 2100, dispensed: 1840 },
  ];

  const maxVal = 2400;
  const chartHeight = 160;

  return (
    <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Legend & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--primary)' }} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>Stock Inflow (Received)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--info)' }} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>Stock Outflow (Dispensed)</span>
          </div>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 700, background: 'var(--success-light)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--success-border)' }}>
          +14.2% Net Turnover
        </span>
      </div>

      {/* SVG Bar Chart with Responsive ViewBox and Tooltips */}
      <div style={{ position: 'relative', width: '100%', height: chartHeight + 35 }}>
        {/* Y-Axis guide lines */}
        <div style={{ position: 'absolute', inset: 0, bottom: 25, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
          {[2400, 1800, 1200, 600, 0].map(val => (
            <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 30, textAlign: 'right' }}>{val}</span>
              <div style={{ flex: 1, height: 1, backgroundColor: val === 0 ? 'var(--border-strong)' : 'var(--border)' }} />
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div
          style={{
            position: 'absolute',
            left: 38,
            right: 10,
            top: 0,
            bottom: 25,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
          }}
        >
          {monthsData.map((d, i) => {
            const inHeight = (d.incoming / maxVal) * chartHeight;
            const outHeight = (d.dispensed / maxVal) * chartHeight;
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={d.month}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 4,
                  height: '100%',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {/* Inflow Bar */}
                <div
                  style={{
                    width: 14,
                    height: inHeight,
                    backgroundColor: 'var(--primary)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.2s ease',
                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                    filter: isHovered ? 'brightness(1.15)' : 'none',
                  }}
                />

                {/* Dispensed Bar */}
                <div
                  style={{
                    width: 14,
                    height: outHeight,
                    backgroundColor: 'var(--info)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'all 0.2s ease',
                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                    filter: isHovered ? 'brightness(1.15)' : 'none',
                  }}
                />

                {/* Hover Tooltip Popup */}
                {isHovered && (
                  <div
                    className="animate-slide-up"
                    style={{
                      position: 'absolute',
                      bottom: Math.max(inHeight, outHeight) + 8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'var(--surface-raised)',
                      color: 'var(--text)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      zIndex: 20,
                      boxShadow: 'var(--shadow-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p style={{ fontWeight: 800, color: 'var(--primary-hover)', marginBottom: 2 }}>{d.month} 2026 Movement</p>
                    <p style={{ color: 'var(--text)' }}>Inflow: <b>{d.incoming.toLocaleString()} units</b></p>
                    <p style={{ color: 'var(--text)' }}>Dispensed: <b>{d.dispensed.toLocaleString()} units</b></p>
                    <p style={{ color: 'var(--success)', borderTop: '1px solid var(--border)', paddingTop: 3, marginTop: 3 }}>
                      Net: +{(d.incoming - d.dispensed).toLocaleString()} units
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Month labels along X-axis */}
        <div
          style={{
            position: 'absolute',
            left: 38,
            right: 10,
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          {monthsData.map((d, i) => (
            <span
              key={d.month}
              style={{
                fontSize: 11,
                fontWeight: hoveredIndex === i ? 700 : 500,
                color: hoveredIndex === i ? 'var(--text)' : 'var(--text-3)',
                transition: 'color 0.15s ease',
              }}
            >
              {d.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────── 3. MOST DISPENSED MEDICINES RANKING ─────────── */
export function MostDispensedRanking({
  onViewReport,
}: {
  onViewReport?: () => void;
}) {
  const topItems = [
    { rank: 1, name: 'Paracetamol 500mg', units: '2,480', pct: 32, trend: '+18%', price: '₹ 25' },
    { rank: 2, name: 'Cetirizine 10mg', units: '1,842', pct: 24, trend: '+12%', price: '₹ 35' },
    { rank: 3, name: 'Metformin 500mg', units: '1,490', pct: 19, trend: '+8%', price: '₹ 45' },
    { rank: 4, name: 'Vitamin D3 60K', units: '988', pct: 13, trend: '+4%', price: '₹ 65' },
    { rank: 5, name: 'Azithromycin 250mg', units: '920', pct: 12, trend: '+15%', price: '₹ 120' },
  ];

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {topItems.map(item => (
        <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  backgroundColor: item.rank === 1 ? 'var(--primary)' : item.rank === 2 ? 'var(--info)' : 'var(--bg-alt)',
                  color: item.rank <= 2 ? '#FFFFFF' : 'var(--text-3)',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                }}
              >
                {item.rank}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                {item.units} <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>({item.pct}%)</span>
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--success)',
                  backgroundColor: 'var(--success-light)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--success-border)',
                }}
              >
                {item.trend}
              </span>
            </div>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div
              className="progress-fill"
              style={{
                width: `${item.pct * 2.8}%`,
                backgroundColor: item.rank === 1 ? 'var(--primary)' : item.rank === 2 ? 'var(--info)' : 'var(--text-muted)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── 4. DISPENSING TRENDS TIME-SERIES ─────────── */
export function DispensingTrendsChart({
  timeframe = 'Last 30 days',
}: {
  timeframe?: string;
}) {
  const points = [
    { day: '1', count: 42 },
    { day: '5', count: 68 },
    { day: '10', count: 54 },
    { day: '15', count: 88 },
    { day: '20', count: 72 },
    { day: '25', count: 96 },
    { day: '30', count: 110 },
  ];

  const maxVal = 120;
  const height = 150;
  const width = 500;

  // Generate SVG path
  const pathD = points.reduce((acc, pt, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - (pt.count / maxVal) * (height - 20) - 10;
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Dispensing Rate ({timeframe})</span>
        <span style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={14} /> +12.4% vs prior month
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 160 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#trendGradient)" />
          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((pt, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - (pt.count / maxVal) * (height - 20) - 10;
            return (
              <g key={pt.day}>
                <circle cx={x} cy={y} r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
        <span>Day 1</span>
        <span>Day 10</span>
        <span>Day 20</span>
        <span>Day 30</span>
      </div>
    </div>
  );
}
