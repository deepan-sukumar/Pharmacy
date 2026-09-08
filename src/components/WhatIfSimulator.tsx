import React, { useState } from 'react';
import type { Medicine } from '../data';
import {
  SlidersHorizontal, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck,
  TrendingUp, TrendingDown, Clock3, BrainCircuit, CheckCircle2, ChevronRight,
  PackagePlus, Sparkles, DollarSign, Info
} from 'lucide-react';

interface WhatIfSimulatorProps {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  showToast: (msg: string) => void;
}

export default function WhatIfSimulator({
  inventory,
  setInventory,
  showToast,
}: WhatIfSimulatorProps) {
  // Scenario Parameters
  const [medicine, setMedicine] = useState('Vitamin D3 60K');
  const [currentStock, setCurrentStock] = useState(180);
  const [orderQty, setOrderQty] = useState(300);
  const [dailyUsage, setDailyUsage] = useState(5);
  const [leadTimeDays, setLeadTimeDays] = useState(3);
  const [daysToExpiry, setDaysToExpiry] = useState(45);
  const [unitCost, setUnitCost] = useState(65);
  const [scenarioType, setScenarioType] = useState<string>('bulk-order');

  // Calculations
  const totalStock = currentStock + orderQty;
  const daysUntilRunoutCurrent = dailyUsage > 0 ? Math.round(currentStock / dailyUsage) : 999;
  const daysUntilRunoutProjected = dailyUsage > 0 ? Math.round(totalStock / dailyUsage) : 999;

  // Consumption before expiry
  const effectiveWindowDays = Math.max(0, daysToExpiry - leadTimeDays);
  const projectedConsumption = dailyUsage * effectiveWindowDays;
  const surplusUnused = Math.max(0, totalStock - projectedConsumption);
  const valueAtRisk = surplusUnused * unitCost;

  // Risk classification
  const currentSurplus = Math.max(0, currentStock - (dailyUsage * daysToExpiry));
  const currentValueAtRisk = currentSurplus * unitCost;

  const isHighRisk = surplusUnused > totalStock * 0.25;
  const isModerateRisk = surplusUnused > 0 && !isHighRisk;

  // Preset Handlers
  const applyPreset = (type: string) => {
    setScenarioType(type);
    if (type === 'bulk-order') {
      setMedicine('Vitamin D3 60K');
      setCurrentStock(180);
      setOrderQty(300);
      setDailyUsage(5);
      setLeadTimeDays(3);
      setDaysToExpiry(45);
      setUnitCost(65);
      showToast('Loaded: "What if I order 300 more Vitamin D tablets?"');
    } else if (type === 'demand-surge') {
      setMedicine('Paracetamol 500mg');
      setCurrentStock(120);
      setOrderQty(200);
      setDailyUsage(18);
      setLeadTimeDays(2);
      setDaysToExpiry(60);
      setUnitCost(25);
      showToast('Loaded: "What if dispensing increases by 20%?"');
    } else if (type === 'delivery-delay') {
      setMedicine('Cetirizine 10mg');
      setCurrentStock(35);
      setOrderQty(250);
      setDailyUsage(12);
      setLeadTimeDays(18);
      setDaysToExpiry(90);
      setUnitCost(35);
      showToast('Loaded: "What if supplier delivery is delayed by 15 days?"');
    } else if (type === 'no-return') {
      setMedicine('Amoxicillin 500mg (AMX204)');
      setCurrentStock(45);
      setOrderQty(0);
      setDailyUsage(0);
      setLeadTimeDays(0);
      setDaysToExpiry(25);
      setUnitCost(95);
      showToast('Loaded: "What if I don\'t return this batch before expiry?"');
    }
  };

  const handleApplyRecommended = () => {
    const recommended = Math.max(0, Math.round(dailyUsage * effectiveWindowDays) - currentStock);
    setOrderQty(recommended);
    showToast(`Order size adjusted to AI optimal: ${recommended} units`);
  };

  const handleCommitOrder = () => {
    if (orderQty <= 0) {
      showToast('Order quantity must be greater than 0');
      return;
    }
    const newBatchId = `SIM-${Math.floor(100 + Math.random() * 900)}`;
    const newStockItem: Medicine = {
      id: Date.now(),
      medicine,
      batch: newBatchId,
      expiry: 'Oct 2027',
      quantity: orderQty,
      supplier: 'MediSource Distributors',
      status: 'Available',
      unitPrice: unitCost,
    };
    setInventory(prev => [...prev, newStockItem]);
    showToast(`Order confirmed! Added ${orderQty} units of ${medicine} (Batch ${newBatchId}) to live inventory.`);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Simulation Banner */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 12,
          backgroundColor: 'var(--primary-light)',
          border: '1.5px solid var(--primary-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={17} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>
                Operational What-If Simulation Sandbox
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  backgroundColor: 'var(--surface)',
                  color: 'var(--primary)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--primary-border)',
                }}
              >
                PROJECTION ONLY
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              Simulated variables do NOT alter live inventory until explicitly placed as a purchase order.
            </p>
          </div>
        </div>

        {/* Preset quick buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => applyPreset('bulk-order')}
            className={`btn ${scenarioType === 'bulk-order' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            +300 Vitamin D
          </button>
          <button
            onClick={() => applyPreset('demand-surge')}
            className={`btn ${scenarioType === 'demand-surge' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            +20% Dispensing
          </button>
          <button
            onClick={() => applyPreset('delivery-delay')}
            className={`btn ${scenarioType === 'delivery-delay' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            15d Delay
          </button>
          <button
            onClick={() => applyPreset('no-return')}
            className={`btn ${scenarioType === 'no-return' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            Hold Expiry Batch
          </button>
        </div>
      </div>

      {/* 4-STAGE OPERATIONAL PIPELINE: CURRENT STATE → SCENARIO → PROJECTED IMPACT → KEY RISKS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {/* Stage 1: Current State */}
        <div
          className="card"
          style={{
            padding: 16,
            borderLeft: '4px solid #3B82F6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase' }}>
                1. Current State
              </span>
              <span className="chip badge-blue" style={{ fontSize: 10 }}>Live Data</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
              {medicine}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Available Stock:</span>
                <b style={{ color: 'var(--text)' }}>{currentStock} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Daily Dispensing:</span>
                <b style={{ color: 'var(--text)' }}>{dailyUsage} units / day</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Runout Estimate:</span>
                <b style={{ color: daysUntilRunoutCurrent < 10 ? 'var(--danger)' : 'var(--success)' }}>
                  {daysUntilRunoutCurrent} days
                </b>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}>
            Current waste risk: <b>₹ {currentValueAtRisk.toLocaleString()}</b>
          </div>
        </div>

        {/* Stage 2: Scenario Input */}
        <div
          className="card"
          style={{
            padding: 16,
            borderLeft: '4px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                2. Scenario Hypothesis
              </span>
              <span className="chip badge-teal" style={{ fontSize: 10 }}>Simulated</span>
            </div>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
              Reorder +{orderQty} units
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Delivery Lead Time:</span>
                <b>{leadTimeDays} days</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Batch Shelf Life:</span>
                <b>{daysToExpiry} days</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Unit Procurement:</span>
                <b>₹ {unitCost} / unit</b>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}>
            Total investment: <b>₹ {(orderQty * unitCost).toLocaleString()}</b>
          </div>
        </div>

        {/* Stage 3: Projected Impact */}
        <div
          className="card"
          style={{
            padding: 16,
            borderLeft: `4px solid ${isHighRisk ? 'var(--danger)' : isModerateRisk ? 'var(--warning)' : 'var(--success)'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: isHighRisk ? 'var(--danger)' : isModerateRisk ? 'var(--warning)' : 'var(--success)',
                  textTransform: 'uppercase',
                }}
              >
                3. Projected Impact
              </span>
              <span
                className={`chip ${isHighRisk ? 'badge-red' : isModerateRisk ? 'badge-amber' : 'badge-green'}`}
                style={{ fontSize: 10 }}
              >
                {isHighRisk ? 'High Waste' : isModerateRisk ? 'Moderate Surplus' : 'Optimal'}
              </span>
            </div>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
              Total Stock → {totalStock} units
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Demand:</span>
                <b>{projectedConsumption} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Unsold at Expiry:</span>
                <b style={{ color: isHighRisk ? 'var(--danger)' : 'var(--text)' }}>{surplusUnused} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Value at Expiry Risk:</span>
                <b style={{ color: isHighRisk ? 'var(--danger)' : 'var(--text)' }}>₹ {valueAtRisk.toLocaleString()}</b>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}>
            Utilization: <b>{Math.min(100, Math.round((projectedConsumption / (totalStock || 1)) * 100))}%</b>
          </div>
        </div>

        {/* Stage 4: AI Decision & Mitigation */}
        <div
          className="card"
          style={{
            padding: 16,
            borderLeft: '4px solid #8B5CF6',
            backgroundColor: 'var(--bg-alt)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase' }}>
                4. Key Risks & AI Action
              </span>
              <BrainCircuit size={16} color="#8B5CF6" />
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4, marginBottom: 8 }}>
              {isHighRisk
                ? `Waste Warning: Buying ${orderQty} units will cause ${surplusUnused} units (₹ ${valueAtRisk.toLocaleString()}) to expire unsold.`
                : 'Balanced scenario. Stock velocity closely aligns with expiration date.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {isHighRisk && (
              <button
                onClick={handleApplyRecommended}
                className="btn"
                style={{
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  fontSize: 11.5,
                  padding: '6px 10px',
                  borderRadius: 6,
                  justifyContent: 'center',
                }}
              >
                Auto-Size Order to AI Target
              </button>
            )}
            <button
              onClick={handleCommitOrder}
              className="btn btn-teal"
              style={{ fontSize: 11.5, padding: '6px 10px', borderRadius: 6, justifyContent: 'center' }}
            >
              <PackagePlus size={14} /> Place Order & Add to Live Stock
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE CONTROLS & COMPARISON MATRIX */}
      <div className="responsive-sim-grid">
        {/* Controls Card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                Adjust Simulation Variables
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                Drag sliders or type exact values to recalculate in real time
              </p>
            </div>
            <button
              onClick={() => applyPreset('bulk-order')}
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '5px 8px' }}
            >
              <RefreshCw size={13} /> Reset
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Target Medication</label>
              <input
                className="input"
                value={medicine}
                onChange={e => setMedicine(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Current Stock</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{currentStock} units</span>
                </div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={e => setCurrentStock(Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Proposed Order</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{orderQty} units</span>
                </div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={orderQty}
                  onChange={e => setOrderQty(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Daily Dispense Rate</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{dailyUsage} / day</span>
                </div>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={dailyUsage}
                  onChange={e => setDailyUsage(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Days to Expiry</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{daysToExpiry} days</span>
                </div>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={daysToExpiry}
                  onChange={e => setDaysToExpiry(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Supplier Lead Time</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{leadTimeDays} days</span>
                </div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={leadTimeDays}
                  onChange={e => setLeadTimeDays(Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <label className="label" style={{ marginBottom: 0 }}>Unit Cost (₹)</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>₹ {unitCost}</span>
                </div>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={unitCost}
                  onChange={e => setUnitCost(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Comparison Cards Card */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
            Side-by-Side Comparison Matrix
          </h3>

          {/* Comparison 1: Stock */}
          <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
              <span>Total Available Stock</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                {currentStock} units → {totalStock} units (+{orderQty})
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (totalStock / (totalStock + 100)) * 100)}%`,
                  backgroundColor: 'var(--primary)',
                }}
              />
            </div>
          </div>

          {/* Comparison 2: Expiry Risk */}
          <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
              <span>Expiry Risk Exposure</span>
              <span style={{ fontWeight: 700, color: isHighRisk ? 'var(--danger)' : 'var(--success)' }}>
                {currentSurplus} units → {surplusUnused} units ({Math.round((surplusUnused / (totalStock || 1)) * 100)}%)
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, Math.round((surplusUnused / (totalStock || 1)) * 100))}%`,
                  backgroundColor: isHighRisk ? 'var(--danger)' : 'var(--warning)',
                }}
              />
            </div>
          </div>

          {/* Comparison 3: Waste Value */}
          <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: isHighRisk ? 'var(--danger-light)' : 'var(--success-light)', border: `1px solid ${isHighRisk ? 'var(--danger-border)' : 'var(--success-border)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: isHighRisk ? 'var(--danger)' : 'var(--success)', textTransform: 'uppercase' }}>
                  Financial Waste Exposure
                </p>
                <p style={{ fontSize: 20, fontWeight: 900, color: isHighRisk ? 'var(--danger)' : 'var(--success)', marginTop: 2 }}>
                  ₹ {valueAtRisk.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: isHighRisk ? 'var(--danger)' : 'var(--success)' }}>
                {isHighRisk ? 'Immediate Capital Risk' : 'Protected Margin'}
              </div>
            </div>
          </div>

          {/* AI Decision Card */}
          <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'var(--surface-raised)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BrainCircuit size={16} color="var(--primary-hover)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary-hover)', textTransform: 'uppercase' }}>
                FEFO & Economic Order Recommendation
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-2)' }}>
              {isHighRisk
                ? `Order size of ${orderQty} exceeds 45-day dispensing velocity. Reduce order to ${Math.max(0, projectedConsumption - currentStock)} units, or request distributor batches expiring in 2028.`
                : `Order velocity of ${dailyUsage} units/day comfortably exhausts stock before expiration. Recommended for purchase.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
