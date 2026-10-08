import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CalendarDays, AlertTriangle, AlertCircle, CheckCircle2,
  ShieldAlert, Clock, ChevronRight, Info, Filter, ArrowUpRight
} from 'lucide-react';
import type { Medicine } from '../data';

interface ExpiryTimelineProps {
  inventory: Medicine[];
  onSelectBatch?: (medicine: Medicine) => void;
  onNavigateExpiryTable?: () => void;
}

export type RiskLevel = 'EXPIRED' | 'RECALLED' | 'CRITICAL' | 'NEAR EXPIRY' | 'SAFE';

// System Reference Date: 2026-10-08
const SYSTEM_REF_DATE = new Date(2026, 9, 8); // 8th October 2026

/**
 * Calculates days remaining dynamically from the authoritative system date (2026-10-08).
 * Parses ISO dates ('2026-10-18'), short dates ('18 Oct 2026'), and month-year strings ('Oct 2026').
 */
export function calculateDaysRemaining(
  expiryStr?: string,
  medicineBatch?: string,
  status?: string,
  providedDays?: number
): number {
  if (providedDays !== undefined && !isNaN(Number(providedDays))) {
    return Number(providedDays);
  }

  const normalizedStatus = String(status || '').toUpperCase();
  if (normalizedStatus === 'EXPIRED') {
    return -5;
  }

  if (!expiryStr) {
    return 90;
  }

  const trimmed = expiryStr.trim();

  // Try parsing ISO or standard date formats
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const diffMs = parsed.getTime() - SYSTEM_REF_DATE.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  // Parse 'Month YYYY' or 'Day Month YYYY' (e.g. 'Oct 2026', '15 Oct 2026')
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const parts = trimmed.split(/[\s-]+/);
  if (parts.length >= 2) {
    let day = 28;
    let monthIdx = -1;
    let year = -1;

    for (const part of parts) {
      const lower = part.toLowerCase().substring(0, 3);
      if (months[lower] !== undefined) {
        monthIdx = months[lower];
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          if (num > 1900) year = num;
          else if (num >= 1 && num <= 31) day = num;
        }
      }
    }

    if (monthIdx !== -1 && year !== -1) {
      const expDate = new Date(year, monthIdx, day);
      const diffMs = expDate.getTime() - SYSTEM_REF_DATE.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  return 90;
}

export function getBatchRisk(daysLeft: number, status?: string): {
  level: RiskLevel;
  badgeLabel: string;
  color: string;
  bg: string;
  border: string;
  dotColor: string;
} {
  const normStatus = String(status || '').toUpperCase();
  if (normStatus === 'RECALLED' || normStatus === 'QUARANTINED') {
    return {
      level: 'RECALLED',
      badgeLabel: 'RECALLED',
      color: 'var(--danger)',
      bg: 'var(--danger-light)',
      border: 'var(--danger-border)',
      dotColor: 'var(--danger)',
    };
  }
  if (daysLeft <= 0 || normStatus === 'EXPIRED') {
    return {
      level: 'EXPIRED',
      badgeLabel: 'EXPIRED',
      color: 'var(--danger)',
      bg: 'var(--danger-light)',
      border: 'var(--danger-border)',
      dotColor: 'var(--danger)',
    };
  }
  if (daysLeft <= 30) {
    return {
      level: 'CRITICAL',
      badgeLabel: 'CRITICAL',
      color: 'var(--orange)',
      bg: 'var(--orange-light)',
      border: 'var(--orange-border)',
      dotColor: 'var(--orange)',
    };
  }
  if (daysLeft <= 90 || normStatus === 'NEAR_EXPIRY' || normStatus === 'NEAR EXPIRY') {
    return {
      level: 'NEAR EXPIRY',
      badgeLabel: 'NEAR EXPIRY',
      color: 'var(--warning)',
      bg: 'var(--warning-light)',
      border: 'var(--warning-border)',
      dotColor: 'var(--warning)',
    };
  }
  return {
    level: 'SAFE',
    badgeLabel: 'SAFE',
    color: 'var(--success)',
    bg: 'var(--success-light)',
    border: 'var(--success-border)',
    dotColor: 'var(--success)',
  };
}

interface PositionedBatch {
  item: Medicine & { daysLeft: number; risk: ReturnType<typeof getBatchRisk> };
  laneIndex: number;
  cardLeft: number;
  cardRight: number;
  cardTop: number;
  markerX: number;
  markerY: number;
}

export default function ExpiryTimeline({
  inventory,
  onSelectBatch,
  onNavigateExpiryTable,
}: ExpiryTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [hoveredBatch, setHoveredBatch] = useState<{
    medicine: Medicine;
    daysLeft: number;
    risk: ReturnType<typeof getBatchRisk>;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);

  // ResizeObserver to dynamically adjust layout on sidebar collapse/expand & window resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);

    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Format header date ticks dynamically from SYSTEM_REF_DATE (2026-10-08)
  const headerTicks = useMemo(() => {
    const formatTickDate = (daysToAdd: number) => {
      const d = new Date(SYSTEM_REF_DATE.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[d.getMonth()]} ${d.getDate()}`;
    };

    const futureDate = new Date(SYSTEM_REF_DATE.getTime() + 120 * 24 * 60 * 60 * 1000);
    const futureStr = `${futureDate.getFullYear()}+`;

    return [
      { label: 'Today', sub: formatTickDate(0), pos: 0 },
      { label: '30 days', sub: formatTickDate(30), pos: 25 },
      { label: '60 days', sub: formatTickDate(60), pos: 50 },
      { label: '90 days', sub: formatTickDate(90), pos: 75 },
      { label: '120+ days', sub: futureStr, pos: 100 },
    ];
  }, []);

  // 1. Extend inventory with calculated daysLeft & risk data
  const enrichedBatches = useMemo(() => {
    return (inventory || []).map(item => {
      const daysLeft = calculateDaysRemaining(
        item.expiryDate || item.expiryDisplay || item.expiry,
        item.batchNumber || item.batch,
        item.status,
        (item as any).daysRemaining
      );
      const risk = getBatchRisk(daysLeft, item.status);
      return {
        ...item,
        medicine: item.medicineName || item.medicine || 'Medicine',
        batch: item.batchNumber || item.batch || 'BATCH-001',
        expiry: item.expiryDisplay || item.expiryDate || item.expiry || 'Oct 2026',
        supplier: item.supplierName || item.supplier || 'MediSource Distributors',
        quantity: Number(item.availableQuantity !== undefined ? item.availableQuantity : (item.quantity || 0)),
        daysLeft,
        risk,
      };
    });
  }, [inventory]);

  // KPI Summary Counts
  const expiredCount = enrichedBatches.filter(b => b.risk.level === 'EXPIRED').length;
  const recalledCount = enrichedBatches.filter(b => b.risk.level === 'RECALLED').length;
  const criticalCount = enrichedBatches.filter(b => b.risk.level === 'CRITICAL').length;
  const nearExpiryCount = enrichedBatches.filter(b => b.risk.level === 'NEAR EXPIRY').length;
  const safeCount = enrichedBatches.filter(b => b.risk.level === 'SAFE').length;

  // Filtered batches for display
  const displayBatches = useMemo(() => {
    return enrichedBatches.filter(b => {
      if (activeFilter === 'ALL') return true;
      return b.risk.level === activeFilter;
    });
  }, [enrichedBatches, activeFilter]);

  // Sort batches strictly by FEFO order (earliest expiry first), then name, then batch
  const sortedBatches = useMemo(() => {
    return [...displayBatches].sort((a, b) => {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      if (a.medicine !== b.medicine) return a.medicine.localeCompare(b.medicine);
      return a.batch.localeCompare(b.batch);
    });
  }, [displayBatches]);

  // -------------------------------------------------------------
  // 2. DETERMINISTIC COLLISION-AWARE LANE ASSIGNMENT ENGINE
  // -------------------------------------------------------------
  const { positionedBatches, totalTimelineHeight, laneCount } = useMemo(() => {
    const cardWidth = Math.min(210, Math.max(175, Math.floor(containerWidth * 0.22)));
    const cardHeight = 50;
    const cardGapX = 14; // Minimum horizontal spacing between cards in the same lane
    const cardGapY = 12; // Vertical spacing between lanes
    const paddingLeft = 18;
    const paddingRight = 18;
    const paddingTop = 32;
    const paddingBottom = 24;

    const availableTrackWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
    const maxScaleDays = 120;
    const markerY = 14; // Position of markers on top axis track

    // Lanes storage: array of bounding intervals for each vertical lane
    // lanes[laneIndex] = [ { left, right }, ... ]
    const lanes: Array<Array<{ left: number; right: number }>> = [];
    const results: PositionedBatch[] = [];

    sortedBatches.forEach(item => {
      // Calculate true chronological marker X position on timeline scale (0 to 120 days)
      const ratio = item.daysLeft <= 0 ? 0 : Math.min(1, item.daysLeft / maxScaleDays);
      const markerX = paddingLeft + ratio * availableTrackWidth;

      // Desired card center aligned with the marker
      let cardLeft = markerX - cardWidth / 2;

      // CLAMPING: Strictly prevent left and right clipping
      const minLeft = paddingLeft;
      const maxLeft = containerWidth - cardWidth - paddingRight;
      cardLeft = Math.max(minLeft, Math.min(cardLeft, maxLeft));
      const cardRight = cardLeft + cardWidth;

      // Find first available lane where this card's [cardLeft - gap, cardRight + gap] does NOT collide
      let assignedLane = -1;
      for (let l = 0; l < lanes.length; l++) {
        const laneIntervals = lanes[l];
        let hasCollision = false;
        for (const interval of laneIntervals) {
          if (cardLeft - cardGapX < interval.right && cardRight + cardGapX > interval.left) {
            hasCollision = true;
            break;
          }
        }
        if (!hasCollision) {
          assignedLane = l;
          laneIntervals.push({ left: cardLeft, right: cardRight });
          break;
        }
      }

      // If all existing lanes have collisions at this X range, create a new vertical lane!
      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push([{ left: cardLeft, right: cardRight }]);
      }

      const cardTop = paddingTop + assignedLane * (cardHeight + cardGapY);

      results.push({
        item,
        laneIndex: assignedLane,
        cardLeft,
        cardRight,
        cardTop,
        markerX,
        markerY,
      });
    });

    const activeLanes = Math.max(3, lanes.length);
    const dynamicHeight = Math.max(260, paddingTop + activeLanes * (cardHeight + cardGapY) + paddingBottom);

    return {
      positionedBatches: results,
      totalTimelineHeight: dynamicHeight,
      laneCount: activeLanes,
    };
  }, [sortedBatches, containerWidth]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. EXPIRY SUMMARY KPI BAR (Interactive Filter Bar) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
        }}
      >
        {[
          {
            key: 'ALL',
            label: 'All Batches',
            count: enrichedBatches.length,
            tone: 'var(--primary)',
            bg: 'var(--bg-alt)',
            border: 'var(--border)',
          },
          {
            key: 'EXPIRED',
            label: 'Expired',
            count: expiredCount,
            tone: 'var(--danger)',
            bg: 'var(--danger-light)',
            border: 'var(--danger-border)',
          },
          {
            key: 'RECALLED',
            label: 'Recalled',
            count: recalledCount,
            tone: '#B91C1C',
            bg: 'var(--danger-light)',
            border: 'var(--danger-border)',
          },
          {
            key: 'CRITICAL',
            label: 'Critical (<30d)',
            count: criticalCount,
            tone: '#EA580C',
            bg: 'var(--orange-light)',
            border: 'var(--orange-border)',
          },
          {
            key: 'NEAR EXPIRY',
            label: 'Near Expiry (90d)',
            count: nearExpiryCount,
            tone: 'var(--warning)',
            bg: 'var(--warning-light)',
            border: 'var(--warning-border)',
          },
          {
            key: 'SAFE',
            label: 'Safe (>90d)',
            count: safeCount,
            tone: 'var(--success)',
            bg: 'var(--success-light)',
            border: 'var(--success-border)',
          },
        ].map(cat => {
          const isSelected = activeFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                background: isSelected ? 'var(--surface)' : cat.bg,
                border: isSelected ? `2px solid ${cat.tone}` : `1px solid ${cat.border}`,
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              title={`Click to filter timeline by ${cat.label}`}
            >
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: cat.tone,
                    letterSpacing: '0.04em',
                  }}
                >
                  {cat.label}
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
                  {cat.count}
                </span>
              </div>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: cat.tone,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* 2. THE VISUAL HORIZONTAL TIMELINE (DESKTOP & TABLET) */}
      <div
        className="card hidden-mobile"
        style={{
          padding: '24px 20px',
          backgroundColor: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
        }}
      >
        {/* Timeline Header Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={18} color="var(--primary)" />
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Dynamic FEFO Expiry Timeline
            </h3>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                background: 'var(--bg-alt)',
                padding: '2px 8px',
                borderRadius: 99,
                fontWeight: 600,
                border: '1px solid var(--border)',
              }}
            >
              Collision-Free FEFO Horizon ({sortedBatches.length} Batches)
            </span>
          </div>

          {onNavigateExpiryTable && (
            <button
              onClick={onNavigateExpiryTable}
              className="btn btn-ghost"
              style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View Full Batch Table <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Timeline Horizon Scale & Grid Lines */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: 16 }}>
          {/* Day markers header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--text-3)',
              paddingLeft: 18,
              paddingRight: 18,
            }}
          >
            {headerTicks.map(tick => (
              <div key={tick.label} style={{ textAlign: 'center', minWidth: 60 }}>
                <span style={{ display: 'block', color: 'var(--text)', fontWeight: 800 }}>{tick.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tick.sub}</span>
              </div>
            ))}
          </div>

          {/* Timeline canvas track / Axis baseline with vertical guidelines */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              height: totalTimelineHeight,
              background: 'var(--bg-alt)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              overflow: 'hidden',
              transition: 'height 0.25s ease',
            }}
          >
            {/* Background Risk Gradient Zones */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '25%',
                background: 'rgba(239, 68, 68, 0.04)',
                borderRight: '1px dashed #FECACA',
              }}
              title="Zone 1: Critical Expiry (0 - 30 days)"
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '25%',
                width: '25%',
                background: 'rgba(245, 158, 11, 0.04)',
                borderRight: '1px dashed #FDE68A',
              }}
              title="Zone 2: Watchlist (30 - 60 days)"
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: '25%',
                background: 'rgba(234, 179, 8, 0.03)',
                borderRight: '1px dashed #E2E8F0',
              }}
              title="Zone 3: Near Expiry (60 - 90 days)"
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '75%',
                width: '25%',
                background: 'rgba(34, 197, 94, 0.04)',
              }}
              title="Zone 4: Safe Inventory (>90 days)"
            />

            {/* Top Axis Baseline Track Line */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 18,
                right: 18,
                height: 2,
                backgroundColor: 'var(--border-strong)',
                zIndex: 1,
              }}
            />

            {/* Vertical Tick Guide Lines at 0%, 25%, 50%, 75%, 100% */}
            {[0, 25, 50, 75, 100].map(pos => (
              <div
                key={pos}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `calc(18px + (100% - 36px) * ${pos / 100})`,
                  width: 1,
                  backgroundColor: 'var(--border)',
                  zIndex: 1,
                }}
              />
            ))}

            {/* SVG Connector Lines from Top Track Markers to Cards */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {positionedBatches.map(({ item, cardLeft, cardTop, markerX, markerY }) => {
                const cardMidX = cardLeft + 24;
                const cardAnchorY = cardTop;
                return (
                  <g key={`conn-${item.batch}-${item.id || item.medicine}`}>
                    {/* Top track marker dot */}
                    <circle
                      cx={markerX}
                      cy={markerY}
                      r={4}
                      fill={item.risk.dotColor}
                      stroke="var(--surface)"
                      strokeWidth={1.5}
                    />
                    {/* Clean connector line to card */}
                    <path
                      d={`M ${markerX} ${markerY} L ${markerX} ${markerY + 6} L ${cardMidX} ${cardAnchorY}`}
                      fill="none"
                      stroke={item.risk.dotColor}
                      strokeWidth={1.2}
                      strokeDasharray={item.risk.level === 'EXPIRED' ? '2 2' : 'none'}
                      opacity={0.5}
                    />
                  </g>
                );
              })}
            </svg>

            {/* 3. COLLISION-FREE BATCH CARDS */}
            {positionedBatches.map(({ item: b, cardLeft, cardTop }) => {
              return (
                <div
                  key={`card-${b.batch}-${b.id || b.medicine}`}
                  onClick={() => onSelectBatch?.(b)}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredBatch({
                      medicine: b,
                      daysLeft: b.daysLeft,
                      risk: b.risk,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredBatch(null)}
                  style={{
                    position: 'absolute',
                    left: cardLeft,
                    top: cardTop,
                    zIndex: 3,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                  }}
                >
                  {/* Visual Node Card */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 9px',
                      borderRadius: 7,
                      backgroundColor: b.risk.bg,
                      border: `1.5px solid ${b.risk.border}`,
                      boxShadow: 'var(--shadow-xs)',
                      whiteSpace: 'nowrap',
                      maxWidth: 215,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: b.risk.dotColor,
                        flexShrink: 0,
                        boxShadow: `0 0 0 2px ${b.risk.bg}`,
                      }}
                    />

                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: 'var(--text)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {b.batch}
                        </span>
                        <span
                          style={{
                            fontSize: 8.5,
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: 3,
                            backgroundColor: b.risk.border,
                            color: b.risk.color,
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          {b.risk.badgeLabel}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 1,
                          fontSize: 10.5,
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--text-2)',
                            fontWeight: 600,
                            maxWidth: 95,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={b.medicine}
                        >
                          {b.medicine}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <span style={{ color: b.risk.color, fontWeight: 700, flexShrink: 0 }}>
                          {b.daysLeft <= 0
                            ? 'Expired'
                            : b.status === 'Recalled' || b.status === 'RECALLED'
                            ? 'Recalled'
                            : `${b.daysLeft}d`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Legend Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
            fontSize: 11.5,
            color: 'var(--text-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>Risk Legend:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#DC2626' }} />
              <b>Expired / Recalled</b> (Quarantine)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EA580C' }} />
              <b>Critical &lt;30d</b> (Immediate FEFO)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#D97706' }} />
              <b>Near Expiry &lt;90d</b> (Prioritize)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16A34A' }} />
              <b>Safe &gt;90d</b> (Healthy stock)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <Info size={13} color="var(--text-muted)" />
            <span>Hover on any batch card for complete stock & supplier audit details.</span>
          </div>
        </div>
      </div>

      {/* 3. VERTICAL TIMELINE FOR MOBILE PHONE SCREENS (< 768px) */}
      <div
        className="card hidden-desktop"
        style={{
          padding: '18px 16px',
          backgroundColor: 'var(--surface)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={18} color="var(--primary)" />
            <h3 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Expiry Milestones
            </h3>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 99 }}>
            FEFO Order
          </span>
        </div>

        {/* Vertical Timeline Spine */}
        <div style={{ position: 'relative', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Vertical continuous line */}
          <div
            style={{
              position: 'absolute',
              left: 7,
              top: 6,
              bottom: 12,
              width: 2,
              background: 'linear-gradient(to bottom, var(--danger) 0%, var(--warning) 40%, var(--success) 100%)',
            }}
          />

          {sortedBatches.map(b => (
            <div
              key={`mob-${b.batch}-${b.id || b.medicine}`}
              onClick={() => onSelectBatch?.(b)}
              style={{
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {/* Spine Node Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: -22 + 3,
                  top: 14,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: b.risk.dotColor,
                  border: '2px solid var(--surface)',
                  boxShadow: '0 0 0 2px ' + b.risk.bg,
                }}
              />

              {/* Mobile Timeline Item Card */}
              <div
                style={{
                  background: b.risk.bg,
                  border: `1.5px solid ${b.risk.border}`,
                  borderRadius: 12,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                      {b.medicine}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11.5, color: 'var(--text-2)' }}>
                        {b.batch}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Exp: {b.expiry}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 5,
                      backgroundColor: b.risk.border,
                      color: b.risk.color,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {b.risk.badgeLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 5,
                    borderTop: '1px solid ' + b.risk.border,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: 'var(--text-3)' }}>
                    Supplier: <b>{b.supplier}</b>
                  </span>
                  <span style={{ fontWeight: 800, color: b.risk.color }}>
                    {b.quantity} units ({b.daysLeft <= 0 ? 'Expired' : b.status === 'Recalled' ? 'Quarantined' : `${b.daysLeft}d left`})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. HOVER TOOLTIP / POPOVER FOR OPERATIONAL CLARITY */}
      {hoveredBatch && (
        <div
          className="card animate-fade-in"
          style={{
            position: 'fixed',
            left: Math.max(120, Math.min(window.innerWidth - 140, hoveredBatch.x)),
            top: Math.max(80, hoveredBatch.y - 12),
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            backgroundColor: 'var(--surface-raised)',
            color: 'var(--text)',
            padding: '12px 16px',
            borderRadius: 10,
            boxShadow: 'var(--shadow-lg)',
            minWidth: 220,
            pointerEvents: 'none',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-hover)' }}>
              {hoveredBatch.medicine.medicine}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: hoveredBatch.risk.dotColor,
                color: '#FFFFFF',
              }}
            >
              {hoveredBatch.risk.badgeLabel}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-4)' }}>Batch Code:</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{hoveredBatch.medicine.batch}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-4)' }}>Expiry Date:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{hoveredBatch.medicine.expiry}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-4)' }}>Time Remaining:</span>
              <span style={{ fontWeight: 700, color: 'var(--warning-dark)' }}>
                {hoveredBatch.daysLeft <= 0 ? '0 days (Expired)' : `${hoveredBatch.daysLeft} days`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-4)' }}>Available Stock:</span>
              <span style={{ fontWeight: 800, color: 'var(--success-dark)' }}>{hoveredBatch.medicine.quantity} units</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-4)' }}>Distributor / Supplier:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{hoveredBatch.medicine.supplier}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
