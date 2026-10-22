import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Medicine } from '../data';
import {
  Clock3, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle,
  PackagePlus, ChevronDown, ChevronUp, Search, Info, SlidersHorizontal,
  Calendar, ArrowRight, X, Sparkles
} from 'lucide-react';
import { api } from '../services/api';

interface WhatIfSimulatorProps {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  showToast: (msg: string) => void;
}

// Indian standard currency formatting
function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

// Formats day offset into Indian calendar date string
function formatFutureCalendarDate(daysFromNow: number | null | undefined): string | null {
  if (daysFromNow === null || daysFromNow === undefined || isNaN(daysFromNow)) return null;
  const d = new Date();
  d.setDate(d.getDate() + Math.round(daysFromNow));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Calculate days to expiry dynamically from current date
function calculateDaysToExpiry(expiryStr: string): number {
  if (!expiryStr) return 45;
  const str = String(expiryStr).trim();
  let expiryDate = new Date(str);

  if (isNaN(expiryDate.getTime())) {
    const parts = str.split(/\s+/);
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    if (parts.length === 2) {
      const mIdx = monthNames.indexOf(parts[0].toLowerCase().slice(0, 3));
      const year = parseInt(parts[1], 10);
      if (mIdx >= 0 && !isNaN(year)) {
        expiryDate = new Date(year, mIdx + 1, 0);
      }
    } else if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const mIdx = monthNames.indexOf(parts[1].toLowerCase().slice(0, 3));
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && mIdx >= 0 && !isNaN(year)) {
        expiryDate = new Date(year, mIdx, day);
      }
    }
  }

  if (isNaN(expiryDate.getTime())) return 45;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Authoritative client-side calculation mirror matching backend simulationService.js
function calculateDeterministicSimulation(params: {
  medicine: string;
  batch: string;
  currentStock: number;
  orderQty: number;
  dailyUsage: number;
  daysToExpiry: number;
  unitCost: number;
  leadTimeDays: number;
  holdBatch: boolean;
  demandChangePct: number;
}) {
  const currentStock = Math.max(0, Number(params.currentStock) || 0);
  const orderQty = Math.max(0, Number(params.orderQty) || 0);
  const baseDailyUsage = Math.max(0, Number(params.dailyUsage) || 0);
  const daysToExpiry = Number(params.daysToExpiry) !== undefined && !isNaN(Number(params.daysToExpiry)) ? Number(params.daysToExpiry) : 45;
  const leadTimeDays = Math.max(0, Number(params.leadTimeDays) || 0);
  const unitCost = Math.max(0, Number(params.unitCost) || 50);
  const isHold = Boolean(params.holdBatch);

  const demandMultiplier = 1 + (Number(params.demandChangePct) || 0) / 100;
  const simulatedDailyDemand = isHold ? 0 : Math.max(0, baseDailyUsage * demandMultiplier);

  // Baseline
  const baselineDemand = Math.round(baseDailyUsage * Math.max(0, daysToExpiry));
  const baselineConsumption = Math.min(currentStock, baselineDemand);
  const baselineSurplus = Math.max(0, currentStock - baselineDemand);
  const baselineCapitalAtRisk = baselineSurplus * unitCost;
  const baselineStockoutDays = baseDailyUsage > 0 && currentStock <= baselineDemand ? Math.floor(currentStock / baseDailyUsage) : null;

  // Scenario
  const projectedTotalStock = currentStock + orderQty;
  const effectiveWindow = Math.max(0, daysToExpiry - leadTimeDays);
  const initialWindowDemand = Math.round(simulatedDailyDemand * Math.min(daysToExpiry, leadTimeDays));
  const delayedWindowDemand = Math.round(simulatedDailyDemand * effectiveWindow);
  const totalWindowDemand = initialWindowDemand + delayedWindowDemand;

  const usableInitialStock = Math.min(currentStock, totalWindowDemand);
  const remainingDemandAfterInitial = Math.max(0, delayedWindowDemand - usableInitialStock);
  const usableOrderQty = Math.min(orderQty, remainingDemandAfterInitial);
  const projectedConsumptionActual = usableInitialStock + usableOrderQty;

  const projectedSurplusAtExpiry = Math.max(0, projectedTotalStock - projectedConsumptionActual);
  const expiryCapitalAtRisk = projectedSurplusAtExpiry * unitCost;

  let daysUntilStockout: number | null = null;
  let potentialShortage = 0;
  if (simulatedDailyDemand > 0) {
    if (projectedTotalStock < totalWindowDemand) {
      potentialShortage = totalWindowDemand - projectedTotalStock;
      daysUntilStockout = Math.floor(projectedTotalStock / simulatedDailyDemand);
    }
  }

  const stockUtilizationPct = projectedTotalStock > 0 ? Math.round((projectedConsumptionActual / projectedTotalStock) * 100) : 100;

  let riskLevel = 'Safe';
  let riskLabel = 'Low Risk';
  if (isHold) {
    riskLevel = 'Medium';
    riskLabel = 'Quarantined';
  } else if (daysToExpiry <= 0) {
    riskLevel = 'High';
    riskLabel = 'Expired';
  } else if (projectedSurplusAtExpiry > 0 && daysToExpiry <= 30) {
    riskLevel = 'High';
    riskLabel = 'Likely Expiry';
  } else if (potentialShortage > 0) {
    riskLevel = 'Medium';
    riskLabel = 'Stockout Risk';
  }

  // Recommendations
  const recommendations: string[] = [];
  if (isHold) {
    recommendations.push('Batch is quarantined: all dispensing is halted. Quarantine impact is included in expiry calculations.');
  } else if (daysToExpiry <= 30 && projectedSurplusAtExpiry > 0) {
    recommendations.push(`Prioritize dispensing ${projectedSurplusAtExpiry} units via FEFO to prevent ₹ ${Math.round(expiryCapitalAtRisk)} write-off.`);
  } else if (potentialShortage > 0) {
    recommendations.push(`Reorder at least ${potentialShortage} additional units to prevent anticipated stockout.`);
  } else if (orderQty > 0 && projectedSurplusAtExpiry > 0) {
    recommendations.push(`Proposed order (+${orderQty}) increases surplus by ${projectedSurplusAtExpiry} units. Consider reducing order size.`);
  } else {
    recommendations.push('Stock levels and dispensing rate are balanced. No immediate reorder required.');
  }

  return {
    actualData: {
      currentStock,
      daysToExpiry,
      dailyUsage: baseDailyUsage,
      baselineConsumption,
      baselineSurplus,
      baselineCapitalAtRisk,
      baselineStockoutDays,
      baselineStockoutDate: formatFutureCalendarDate(baselineStockoutDays),
      baselineRiskLabel: baselineSurplus > 0 ? 'Surplus Risk' : 'Adequate',
    },
    simulatedData: {
      projectedTotalStock,
      simulatedDailyDemand,
      projectedConsumptionActual,
      projectedSurplusAtExpiry,
      expiryCapitalAtRisk,
      potentialShortage,
      stockoutExposure: potentialShortage * unitCost,
      daysUntilStockout,
      estimatedStockoutDate: formatFutureCalendarDate(daysUntilStockout),
      stockUtilizationPct,
      riskLevel,
      riskLabel,
      recommendation: recommendations[0],
      recommendations,
    },
  };
}

export default function WhatIfSimulator({
  inventory = [],
  setInventory,
  showToast,
}: WhatIfSimulatorProps) {
  // Unique medicines from inventory
  const uniqueMedicines = useMemo(() => {
    const map = new Map<string, Medicine>();
    (inventory || []).forEach(item => {
      const name = item.medicine || (item as any).medicineName;
      if (name && !map.has(name)) {
        map.set(name, item);
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  // Selected Medicine & Batch
  const [selectedMedicineName, setSelectedMedicineName] = useState<string>('');
  const [selectedBatchCode, setSelectedBatchCode] = useState<string>('');

  // Sibling Batches (sorted FEFO)
  const availableBatches = useMemo(() => {
    if (!selectedMedicineName) return [];
    return (inventory || [])
      .filter(item => (item.medicine || (item as any).medicineName || '').toLowerCase() === selectedMedicineName.toLowerCase())
      .map(item => ({
        id: item.id,
        batch: item.batch || (item as any).batchNumber || 'BTH-001',
        expiry: item.expiry || 'Dec 2027',
        daysToExpiry: calculateDaysToExpiry(item.expiry || ''),
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 50,
        status: item.status || 'Available',
      }))
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  }, [inventory, selectedMedicineName]);

  // Baseline state
  const [currentStock, setCurrentStock] = useState<number>(45);
  const [baseDailyUsage, setBaseDailyUsage] = useState<number>(5);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(25);
  const [expiryDateStr, setExpiryDateStr] = useState<string>('Dec 2027');
  const [unitCost, setUnitCost] = useState<number>(50);

  // Scenario settings
  const [demandChangePct, setDemandChangePct] = useState<number>(0);
  const [orderQty, setOrderQty] = useState<number>(0);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(0);
  const [holdBatch, setHoldBatch] = useState<boolean>(false);

  // UI state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showCommitModal, setShowCommitModal] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // Initialize selected medicine
  useEffect(() => {
    if (uniqueMedicines.length > 0 && !selectedMedicineName) {
      const candidate = uniqueMedicines.find(m => m.status === 'Near Expiry') || uniqueMedicines[0];
      setSelectedMedicineName(candidate.medicine || (candidate as any).medicineName || '');
      setSelectedBatchCode(candidate.batch || (candidate as any).batchNumber || '');
    }
  }, [uniqueMedicines, selectedMedicineName]);

  // Update batch details when selection changes
  useEffect(() => {
    if (availableBatches.length > 0) {
      const matched = availableBatches.find(b => b.batch === selectedBatchCode) || availableBatches[0];
      if (matched) {
        setSelectedBatchCode(matched.batch);
        setCurrentStock(matched.quantity);
        setExpiryDateStr(matched.expiry);
        setDaysToExpiry(matched.daysToExpiry);
        setUnitCost(matched.unitPrice);
      }
    }
  }, [selectedMedicineName, selectedBatchCode, availableBatches]);

  // Active Simulation Result State
  const [simResult, setSimResult] = useState(() =>
    calculateDeterministicSimulation({
      medicine: selectedMedicineName,
      batch: selectedBatchCode,
      currentStock,
      orderQty,
      dailyUsage: baseDailyUsage,
      daysToExpiry,
      unitCost,
      leadTimeDays,
      holdBatch,
      demandChangePct,
    })
  );

  // Primary Run Simulation Workflow
  const handleRunSimulation = useCallback(async () => {
    setIsSimulating(true);
    try {
      const backendRes = await api.simulateScenario({
        medicine: selectedMedicineName,
        batch: selectedBatchCode,
        currentStock,
        orderQty,
        dailyUsage: baseDailyUsage,
        daysToExpiry,
        unitCost,
        leadTimeDays,
        holdBatch,
        demandChangePct,
      });

      if (backendRes?.simulatedData && backendRes?.actualData) {
        setSimResult({
          actualData: {
            currentStock: backendRes.actualData.currentStock ?? currentStock,
            daysToExpiry: backendRes.actualData.daysToExpiry ?? daysToExpiry,
            dailyUsage: backendRes.actualData.dailyUsage ?? baseDailyUsage,
            baselineConsumption: backendRes.actualData.baselineProjectedUsableConsumption ?? currentStock,
            baselineSurplus: backendRes.actualData.baselineProjectedSurplus ?? 0,
            baselineCapitalAtRisk: backendRes.actualData.baselineCapitalAtRisk ?? 0,
            baselineStockoutDays: backendRes.actualData.baselineStockoutDays ?? null,
            baselineStockoutDate: backendRes.actualData.baselineStockoutDate ?? null,
            baselineRiskLabel: backendRes.actualData.baselineRiskLabel ?? 'Adequate',
          },
          simulatedData: {
            projectedTotalStock: backendRes.simulatedData.projectedTotalStock ?? currentStock + orderQty,
            simulatedDailyDemand: backendRes.simulatedData.simulatedDailyDemand ?? baseDailyUsage,
            projectedConsumptionActual: backendRes.simulatedData.projectedConsumptionActual ?? currentStock,
            projectedSurplusAtExpiry: backendRes.simulatedData.projectedSurplusAtExpiry ?? 0,
            expiryCapitalAtRisk: backendRes.simulatedData.expiryCapitalAtRisk ?? 0,
            potentialShortage: backendRes.simulatedData.potentialShortage ?? 0,
            stockoutExposure: backendRes.simulatedData.stockoutExposure ?? 0,
            daysUntilStockout: backendRes.simulatedData.daysUntilStockout ?? null,
            estimatedStockoutDate: backendRes.simulatedData.estimatedStockoutDate ?? null,
            stockUtilizationPct: backendRes.simulatedData.stockUtilizationPct ?? 100,
            riskLevel: backendRes.simulatedData.riskLevel ?? 'Safe',
            riskLabel: backendRes.simulatedData.riskLabel ?? 'Low Risk',
            recommendation: backendRes.simulatedData.recommendation || 'Operational projection updated.',
            recommendations: backendRes.simulatedData.recommendation ? [backendRes.simulatedData.recommendation] : [],
          },
        });
        showToast('Simulation updated from authoritative backend engine.');
      } else {
        // Deterministic client calculation fallback
        const local = calculateDeterministicSimulation({
          medicine: selectedMedicineName,
          batch: selectedBatchCode,
          currentStock,
          orderQty,
          dailyUsage: baseDailyUsage,
          daysToExpiry,
          unitCost,
          leadTimeDays,
          holdBatch,
          demandChangePct,
        });
        setSimResult(local);
        showToast('Simulation evaluated.');
      }
    } catch {
      const local = calculateDeterministicSimulation({
        medicine: selectedMedicineName,
        batch: selectedBatchCode,
        currentStock,
        orderQty,
        dailyUsage: baseDailyUsage,
        daysToExpiry,
        unitCost,
        leadTimeDays,
        holdBatch,
        demandChangePct,
      });
      setSimResult(local);
      showToast('Simulation evaluated.');
    } finally {
      setIsSimulating(false);
    }
  }, [
    selectedMedicineName,
    selectedBatchCode,
    currentStock,
    orderQty,
    baseDailyUsage,
    daysToExpiry,
    unitCost,
    leadTimeDays,
    holdBatch,
    demandChangePct,
    showToast,
  ]);

  // Recalculate when medicine or batch changes
  useEffect(() => {
    handleRunSimulation();
  }, [selectedMedicineName, selectedBatchCode]);

  // Reset to Baseline
  const handleReset = () => {
    setDemandChangePct(0);
    setOrderQty(0);
    setLeadTimeDays(0);
    setHoldBatch(false);
    const baseline = calculateDeterministicSimulation({
      medicine: selectedMedicineName,
      batch: selectedBatchCode,
      currentStock,
      orderQty: 0,
      dailyUsage: baseDailyUsage,
      daysToExpiry,
      unitCost,
      leadTimeDays: 0,
      holdBatch: false,
      demandChangePct: 0,
    });
    setSimResult(baseline);
    showToast('Reset to live inventory baseline.');
  };

  // Commit order to inventory
  const handleCommitOrder = async () => {
    if (orderQty <= 0) return;
    setIsCommitting(true);
    try {
      const newBatchId = `PO-${Math.floor(100 + Math.random() * 900)}`;
      const saved = await api.addMedicine({
        medicine: selectedMedicineName,
        batch: newBatchId,
        expiry: 'Nov 2027',
        quantity: orderQty,
        supplier: 'MediSource Distributors Pvt Ltd',
        status: 'Available',
        unitPrice: unitCost,
      });
      setInventory(prev => [...prev, saved as Medicine]);
      setShowCommitModal(false);
      setOrderQty(0);
      showToast(`Added +${orderQty} units of ${selectedMedicineName} (Batch ${newBatchId}) to inventory.`);
    } catch (err: any) {
      showToast(`Commit failed: ${err.message || 'Server error'}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const act = simResult.actualData;
  const sim = simResult.simulatedData;

  const isRiskHigh = sim.riskLevel === 'High' || sim.riskLevel === 'Likely Expiry' || sim.projectedSurplusAtExpiry > 0;
  const isStockoutRisk = sim.potentialShortage > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ─────────────────────────────────────────────────────────────
          AREA 1: SCENARIO SETTINGS
          ───────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={18} color="var(--primary)" />
              1. Scenario Settings
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Select medicine and adjust operational parameters to simulate inventory outcomes.
            </p>
          </div>

          <button onClick={handleReset} className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
            <RefreshCw size={13} /> Reset Baseline
          </button>
        </div>

        {/* Medicine & Batch Selector Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label className="label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Medicine</label>
            <select
              className="input"
              value={selectedMedicineName}
              onChange={e => {
                setSelectedMedicineName(e.target.value);
                setSelectedBatchCode('');
              }}
              style={{ fontWeight: 600, fontSize: 13 }}
            >
              {uniqueMedicines.map(m => (
                <option key={m.id} value={m.medicine || (m as any).medicineName}>
                  {m.medicine || (m as any).medicineName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Batch (FEFO Order)</label>
            <select
              className="input"
              value={selectedBatchCode}
              onChange={e => setSelectedBatchCode(e.target.value)}
              style={{ fontWeight: 600, fontSize: 13 }}
            >
              {availableBatches.map(b => (
                <option key={b.batch} value={b.batch}>
                  Batch {b.batch} · {b.quantity} units · Expiry {b.expiry} ({b.daysToExpiry > 0 ? `${b.daysToExpiry}d left` : 'Expired'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'var(--bg-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Current Stock</span>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{currentStock} units</p>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Daily Demand</span>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{baseDailyUsage.toFixed(1)}/day</p>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Unit Cost</span>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>₹ {unitCost}</p>
            </div>
          </div>
        </div>

        {/* Essential Scenario Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          {/* Demand Shift */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Demand Change (%)</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: demandChangePct > 0 ? 'var(--primary)' : demandChangePct < 0 ? 'var(--danger)' : 'var(--text)' }}>
                {demandChangePct > 0 ? `+${demandChangePct}%` : `${demandChangePct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="100"
              step="5"
              value={demandChangePct}
              onChange={e => setDemandChangePct(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[-30, 0, 20, 50].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDemandChangePct(pct)}
                  className={`btn ${demandChangePct === pct ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 10.5, padding: '2px 6px', flex: 1 }}
                >
                  {pct === 0 ? '0%' : pct > 0 ? `+${pct}%` : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Reorder Quantity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Reorder Quantity</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>+{orderQty} units</span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="10"
              value={orderQty}
              onChange={e => setOrderQty(Math.max(0, Number(e.target.value)))}
              placeholder="0"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[0, 50, 100, 200].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setOrderQty(q)}
                  className={`btn ${orderQty === q ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 10.5, padding: '2px 6px', flex: 1 }}
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Time Delay */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Supplier Lead Time</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{leadTimeDays} days</span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              max="60"
              value={leadTimeDays}
              onChange={e => setLeadTimeDays(Math.max(0, Number(e.target.value)))}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {[0, 5, 10, 15].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setLeadTimeDays(d)}
                  className={`btn ${leadTimeDays === d ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 10.5, padding: '2px 6px', flex: 1 }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Options Accordion */}
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn btn-ghost"
            style={{ fontSize: 11.5, padding: '4px 8px', color: 'var(--text-3)' }}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAdvanced ? 'Hide Advanced Settings' : 'Advanced Settings (Quarantine Hold)'}
          </button>

          {showAdvanced && (
            <div style={{ marginTop: 10, padding: 12, background: 'var(--bg-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={holdBatch}
                  onChange={e => setHoldBatch(e.target.checked)}
                  style={{ accentColor: 'var(--danger)', width: 16, height: 16 }}
                />
                Hold / Quarantine Batch (halts dispensing velocity to model recall hold)
              </label>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="btn btn-teal"
            style={{ fontSize: 13.5, padding: '9px 24px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {isSimulating ? <RefreshCw size={15} className="animate-spin" /> : <SlidersHorizontal size={15} />}
            Run Simulation
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AREA 2: SIMULATION RESULTS
          ───────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock3 size={18} color="var(--primary)" />
            2. Simulation Results
          </h2>
          <span
            className={`chip ${isRiskHigh ? 'badge-red' : isStockoutRisk ? 'badge-amber' : 'badge-green'}`}
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            {sim.riskLabel}
          </span>
        </div>

        {/* 4 Core Results KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {/* 1. Remaining Stock */}
          <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Available Stock</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '4px 0 2px' }}>
              {sim.projectedTotalStock} <span style={{ fontSize: 12, fontWeight: 600 }}>units</span>
            </p>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Baseline: {act.currentStock} {orderQty > 0 ? `(+${orderQty} order)` : ''}
            </span>
          </div>

          {/* 2. Projected Consumption */}
          <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Projected Consumption</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '4px 0 2px' }}>
              {sim.projectedConsumptionActual} <span style={{ fontSize: 12, fontWeight: 600 }}>units</span>
            </p>
            <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
              {sim.stockUtilizationPct}% utilization
            </span>
          </div>

          {/* 3. Expiry / Wastage Risk */}
          <div style={{ padding: 14, borderRadius: 10, backgroundColor: sim.projectedSurplusAtExpiry > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-alt)', border: `1px solid ${sim.projectedSurplusAtExpiry > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}` }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: sim.projectedSurplusAtExpiry > 0 ? 'var(--danger)' : 'var(--text-3)', textTransform: 'uppercase' }}>Expiry Wastage Risk</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: sim.projectedSurplusAtExpiry > 0 ? 'var(--danger)' : 'var(--success)', margin: '4px 0 2px' }}>
              {sim.projectedSurplusAtExpiry} <span style={{ fontSize: 12, fontWeight: 600 }}>units</span>
            </p>
            <span style={{ fontSize: 11, color: sim.projectedSurplusAtExpiry > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
              {formatINR(sim.expiryCapitalAtRisk)} capital at risk
            </span>
          </div>

          {/* 4. Stockout Risk */}
          <div style={{ padding: 14, borderRadius: 10, backgroundColor: sim.potentialShortage > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-alt)', border: `1px solid ${sim.potentialShortage > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)'}` }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: sim.potentialShortage > 0 ? '#D97706' : 'var(--text-3)', textTransform: 'uppercase' }}>Stockout Exposure</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: sim.potentialShortage > 0 ? '#D97706' : 'var(--text)', margin: '4px 0 2px' }}>
              {sim.potentialShortage > 0 ? `${sim.potentialShortage} units` : 'No Stockout'}
            </p>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {sim.estimatedStockoutDate ? `Run out ~${sim.daysUntilStockout}d (${sim.estimatedStockoutDate})` : 'Sufficient until expiry'}
            </span>
          </div>
        </div>

        {/* Baseline vs Scenario Comparison Table */}
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-alt)' }}>
                <th style={{ padding: '9px 14px', color: 'var(--text-3)', fontWeight: 700 }}>Metric</th>
                <th style={{ padding: '9px 14px', color: 'var(--text-3)', fontWeight: 700 }}>Current Baseline</th>
                <th style={{ padding: '9px 14px', color: 'var(--primary)', fontWeight: 700 }}>Simulated Scenario</th>
                <th style={{ padding: '9px 14px', color: 'var(--text-3)', fontWeight: 700 }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '9px 14px', fontWeight: 600 }}>Total Stock</td>
                <td style={{ padding: '9px 14px' }}>{act.currentStock} units</td>
                <td style={{ padding: '9px 14px', fontWeight: 700 }}>{sim.projectedTotalStock} units</td>
                <td style={{ padding: '9px 14px', color: orderQty > 0 ? 'var(--primary)' : 'var(--text-3)' }}>
                  {orderQty > 0 ? `+${orderQty} units` : '—'}
                </td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '9px 14px', fontWeight: 600 }}>Dispensing Demand</td>
                <td style={{ padding: '9px 14px' }}>{act.dailyUsage.toFixed(1)} units/day</td>
                <td style={{ padding: '9px 14px', fontWeight: 700 }}>{sim.simulatedDailyDemand.toFixed(1)} units/day</td>
                <td style={{ padding: '9px 14px', color: demandChangePct !== 0 ? 'var(--primary)' : 'var(--text-3)' }}>
                  {demandChangePct !== 0 ? `${demandChangePct > 0 ? '+' : ''}${demandChangePct}%` : '—'}
                </td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '9px 14px', fontWeight: 600 }}>Expiry Wastage</td>
                <td style={{ padding: '9px 14px' }}>{act.baselineSurplus} units</td>
                <td style={{ padding: '9px 14px', fontWeight: 700, color: sim.projectedSurplusAtExpiry > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {sim.projectedSurplusAtExpiry} units
                </td>
                <td style={{ padding: '9px 14px', color: sim.projectedSurplusAtExpiry !== act.baselineSurplus ? 'var(--danger)' : 'var(--text-3)' }}>
                  {sim.projectedSurplusAtExpiry !== act.baselineSurplus
                    ? `${sim.projectedSurplusAtExpiry - act.baselineSurplus > 0 ? '+' : ''}${sim.projectedSurplusAtExpiry - act.baselineSurplus} units`
                    : 'No change'}
                </td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '9px 14px', fontWeight: 600 }}>Capital at Risk</td>
                <td style={{ padding: '9px 14px' }}>{formatINR(act.baselineCapitalAtRisk)}</td>
                <td style={{ padding: '9px 14px', fontWeight: 700, color: sim.expiryCapitalAtRisk > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {formatINR(sim.expiryCapitalAtRisk)}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  {sim.expiryCapitalAtRisk !== act.baselineCapitalAtRisk ? formatINR(sim.expiryCapitalAtRisk - act.baselineCapitalAtRisk) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          AREA 3: RECOMMENDED ACTIONS
          ───────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} color="var(--primary)" />
          3. Recommended Actions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sim.recommendations.map((rec, i) => (
            <div
              key={i}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--primary-light)',
                border: '1px solid var(--primary-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              <ArrowRight size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span>{rec}</span>
            </div>
          ))}
        </div>

        {/* Commit Action (If purchase order was modeled) */}
        {orderQty > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              Ready to execute this modeled order into live inventory?
            </span>
            <button onClick={() => setShowCommitModal(true)} className="btn btn-teal" style={{ fontSize: 12.5, padding: '7px 16px' }}>
              <PackagePlus size={14} /> Commit +{orderQty} Units to Live Stock
            </button>
          </div>
        )}
      </div>

      {/* Optional Commit Confirmation Modal */}
      {showCommitModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCommitModal(false)} />
          <div className="card animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: 440, zIndex: 121, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text)' }}>Confirm Stock Commit</h3>
              <button onClick={() => setShowCommitModal(false)} className="btn btn-ghost" style={{ padding: 4 }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Add <b>+{orderQty} units</b> of <b>{selectedMedicineName}</b> to live Firestore inventory at unit cost ₹ {unitCost}?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowCommitModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCommitOrder} disabled={isCommitting} className="btn btn-teal">
                {isCommitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
