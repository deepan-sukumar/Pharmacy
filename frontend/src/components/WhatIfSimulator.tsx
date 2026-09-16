import React, { useState, useEffect, useMemo } from 'react';
import type { Medicine } from '../data';
import {
  SlidersHorizontal, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck,
  TrendingUp, TrendingDown, Clock3, BrainCircuit, CheckCircle2, ChevronRight,
  PackagePlus, Sparkles, DollarSign, Info, Eye, Boxes, X, Layers, AlertCircle,
  Truck, ArrowUpRight, Scale
} from 'lucide-react';
import { api } from '../services/api';

interface WhatIfSimulatorProps {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  showToast: (msg: string) => void;
}

interface ScenarioComparisonItem {
  orderIncrement: number;
  projectedStock: number;
  expectedConsumption: number;
  projectedSurplus: number;
  potentialShortage: number;
  capitalAtRisk: number;
  utilizationPct: number;
  riskLevel: string;
  riskLabel?: string;
  recommendation: string;
}

interface BatchBreakdownItem {
  id: string | number;
  batch: string;
  expiry: string;
  daysToExpiry: number;
  quantity: number;
  unitPrice: number;
  status: string;
  isCurrentSelected?: boolean;
}

// Dynamic helper to calculate days to expiry from real current date
function calculateDaysToExpiry(expiryStr: string): number {
  if (!expiryStr) return 45;
  const str = String(expiryStr).trim();
  if (!str) return 45;

  let expiryDate = new Date(str);
  if (isNaN(expiryDate.getTime())) {
    const parts = str.split(/\s+/);
    if (parts.length === 2) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = monthNames.indexOf(parts[0].toLowerCase().slice(0, 3));
      const year = parseInt(parts[1], 10);
      if (mIdx >= 0 && !isNaN(year)) {
        expiryDate = new Date(year, mIdx + 1, 0);
      }
    } else if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
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

  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function WhatIfSimulator({
  inventory,
  setInventory,
  showToast,
}: WhatIfSimulatorProps) {
  // Extract unique medicines from live inventory
  const uniqueMedicines = useMemo(() => {
    const map = new Map<string, Medicine>();
    (inventory || []).forEach(item => {
      const name = item.medicine || (item as any).medicineName || 'Medicine';
      if (!map.has(name)) {
        map.set(name, item);
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  // Selected State
  const [selectedMedicineName, setSelectedMedicineName] = useState<string>('');
  const [selectedBatchCode, setSelectedBatchCode] = useState<string>('');
  
  // Actual Baseline Parameters from live Firestore
  const [currentStock, setCurrentStock] = useState<number>(45);
  const [baseDailyUsage, setBaseDailyUsage] = useState<number>(5);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(25);
  const [expiryDateStr, setExpiryDateStr] = useState<string>('25 Sep 2026');
  const [unitCost, setUnitCost] = useState<number>(95);
  const [demandProvenance, setDemandProvenance] = useState<string>('');

  // What-If Simulation Variables
  const [orderQty, setOrderQty] = useState<number>(0);
  const [dispensingIncreasePct, setDispensingIncreasePct] = useState<number>(0);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(0);
  const [holdBatch, setHoldBatch] = useState<boolean>(false);
  const [scenarioPreset, setScenarioPreset] = useState<string>('baseline');

  // Backend Sync & Multi-Scenario Data
  const [comparisonMatrix, setComparisonMatrix] = useState<ScenarioComparisonItem[]>([]);
  const [multiBatchList, setMultiBatchList] = useState<BatchBreakdownItem[]>([]);
  const [suggestedAiTarget, setSuggestedAiTarget] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Commit Modal
  const [showCommitModal, setShowCommitModal] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // Initialize selected medicine from inventory
  useEffect(() => {
    if (uniqueMedicines.length > 0 && !selectedMedicineName) {
      // Find one with near expiry or first item
      const candidate = uniqueMedicines.find(m => m.status === 'Near Expiry') || uniqueMedicines[0];
      setSelectedMedicineName(candidate.medicine || (candidate as any).medicineName || 'Vitamin D3 60K');
      setSelectedBatchCode(candidate.batch || (candidate as any).batchNumber || 'VD102');
    }
  }, [uniqueMedicines, selectedMedicineName]);

  // Batches for the currently selected medicine
  const availableBatches = useMemo(() => {
    if (!selectedMedicineName) return [];
    return (inventory || []).filter(item => {
      const name = item.medicine || (item as any).medicineName || '';
      return name.toLowerCase() === selectedMedicineName.toLowerCase();
    }).map(item => {
      const bDays = calculateDaysToExpiry(item.expiry || '');
      return {
        id: item.id,
        batch: item.batch || (item as any).batchNumber || 'BTH-001',
        expiry: item.expiry || 'Dec 2027',
        daysToExpiry: bDays,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 50,
        status: item.status || 'Available',
      };
    }).sort((a, b) => a.daysToExpiry - b.daysToExpiry); // FEFO Sorting
  }, [inventory, selectedMedicineName]);

  // Sync baseline whenever selected medicine or batch changes
  useEffect(() => {
    if (availableBatches.length > 0) {
      const matchedBatch = availableBatches.find(b => b.batch === selectedBatchCode) || availableBatches[0];
      if (matchedBatch) {
        setSelectedBatchCode(matchedBatch.batch);
        setCurrentStock(matchedBatch.quantity);
        setExpiryDateStr(matchedBatch.expiry);
        setDaysToExpiry(matchedBatch.daysToExpiry);
        setUnitCost(matchedBatch.unitPrice);
      }
    }
  }, [selectedMedicineName, selectedBatchCode, availableBatches]);

  // Run backend calculation engine for full simulation and comparison matrix
  useEffect(() => {
    let isMounted = true;
    async function fetchBackendSimulation() {
      setLoading(true);
      try {
        const res = await api.simulateScenario({
          medicine: selectedMedicineName,
          batchId: selectedBatchCode,
          currentStock,
          orderQty,
          dailyUsage: baseDailyUsage,
          daysToExpiry,
          unitCost,
          leadTimeDays,
          holdBatch,
          dispensingIncreasePct,
        } as any);

        if (isMounted && res) {
          if (res.multiScenarioComparison?.comparisonMatrix) {
            setComparisonMatrix(res.multiScenarioComparison.comparisonMatrix);
          }
          if (res.demandProvenance) {
            setDemandProvenance(res.demandProvenance);
          }
          if (res.suggestedAiOrder !== undefined) {
            setSuggestedAiTarget(res.suggestedAiOrder);
          }
          if (res.multiBatchBreakdown && res.multiBatchBreakdown.length > 0) {
            setMultiBatchList(res.multiBatchBreakdown);
          }
        }
      } catch (err) {
        console.error('Simulation calculation engine error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBackendSimulation();
    return () => { isMounted = false; };
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
    dispensingIncreasePct
  ]);

  // Deterministic Local Computations (Matching exact specifications)
  const demandMultiplier = 1 + (dispensingIncreasePct / 100);
  const simulatedDailyDemand = holdBatch ? 0 : Math.max(0, baseDailyUsage * demandMultiplier);

  // Baseline (without proposed order)
  const baselineExpectedConsumption = Math.round(simulatedDailyDemand * Math.max(0, daysToExpiry));
  const baselineUsableConsumption = Math.min(currentStock, baselineExpectedConsumption);
  const baselineSurplus = Math.max(0, currentStock - baselineExpectedConsumption);
  const baselineCapitalAtRisk = baselineSurplus * unitCost;

  // What-If Scenario Projection (with proposed order)
  const projectedTotalStock = currentStock + orderQty;
  const effectiveWindowDays = Math.max(0, daysToExpiry - leadTimeDays);
  const expectedConsumption = Math.round(simulatedDailyDemand * effectiveWindowDays);
  const projectedSurplus = Math.max(0, projectedTotalStock - expectedConsumption);
  const potentialShortage = Math.max(0, expectedConsumption - projectedTotalStock);
  const capitalAtRisk = projectedSurplus * unitCost;
  const stockoutExposure = potentialShortage * unitCost;

  const projectedConsumptionActual = Math.min(projectedTotalStock, expectedConsumption);
  const stockUtilizationPct = projectedTotalStock > 0
    ? Math.min(100, Math.round((projectedConsumptionActual / projectedTotalStock) * 100))
    : 100;

  const daysUntilStockout = simulatedDailyDemand > 0
    ? Math.floor(projectedTotalStock / simulatedDailyDemand)
    : 999;

  // Risk Classification
  const isHighRisk = daysToExpiry <= 0 || holdBatch || projectedSurplus > projectedTotalStock * 0.25 || projectedSurplus > 50;
  const isModerateRisk = projectedSurplus > 0 && !isHighRisk;
  const isShortageRisk = potentialShortage > 0;

  // Preset Handlers
  const handleApplyPreset = (type: string) => {
    setScenarioPreset(type);
    if (type === 'baseline') {
      setOrderQty(0);
      setDispensingIncreasePct(0);
      setLeadTimeDays(0);
      setHoldBatch(false);
      showToast('Restored Current Baseline (+0)');
    } else if (type === 'order-100') {
      setOrderQty(100);
      setHoldBatch(false);
      showToast('Loaded Scenario: Reorder +100 Units');
    } else if (type === 'order-300') {
      setOrderQty(300);
      setHoldBatch(false);
      showToast('Loaded Scenario: Reorder +300 Units');
    } else if (type === 'order-500') {
      setOrderQty(500);
      setHoldBatch(false);
      showToast('Loaded Scenario: Reorder +500 Units');
    } else if (type === 'demand-20') {
      setDispensingIncreasePct(20);
      setHoldBatch(false);
      showToast('Loaded Scenario: +20% Dispensing Surge');
    } else if (type === 'delay-15') {
      setLeadTimeDays(15);
      showToast('Loaded Scenario: 15-Day Supplier Delivery Delay');
    } else if (type === 'hold-batch') {
      setHoldBatch(true);
      showToast('Loaded Scenario: Hold Expiry Batch (Divert Dispensing)');
    }
  };

  // Reset to live Firestore baseline
  const handleResetToBaseline = () => {
    setOrderQty(0);
    setDispensingIncreasePct(0);
    setLeadTimeDays(0);
    setHoldBatch(false);
    setScenarioPreset('baseline');
    showToast('Simulator reset to actual live inventory baseline.');
  };

  // Auto-Size to AI Target
  const handleApplyAiTarget = () => {
    const optimal = Math.max(0, expectedConsumption - currentStock);
    setOrderQty(optimal);
    showToast(`Order quantity auto-sized to AI target: ${optimal} units`);
  };

  // Commit to Live Stock
  const handleConfirmCommit = async () => {
    if (orderQty <= 0) {
      showToast('Please specify an order quantity greater than 0.');
      return;
    }

    setIsCommitting(true);
    try {
      const newBatchId = `PO-${Math.floor(100 + Math.random() * 900)}`;
      const savedMedicine = await api.addMedicine({
        medicine: selectedMedicineName,
        batch: newBatchId,
        expiry: 'Nov 2027',
        quantity: orderQty,
        supplier: 'MediSource Distributors Pvt Ltd',
        status: 'Available',
        unitPrice: unitCost,
      });

      setInventory(prev => [...prev, savedMedicine as Medicine]);
      setIsCommitting(false);
      setShowCommitModal(false);
      showToast(`Purchase order confirmed: +${orderQty} units of ${selectedMedicineName} (Batch ${newBatchId}) saved to Firestore.`);
      // Reset simulation order quantity
      setOrderQty(0);
    } catch (err: any) {
      console.error('Failed to commit purchase order:', err);
      setIsCommitting(false);
      showToast(`Failed to commit: ${err.message || 'Server error'}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER BANNER */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 14,
          backgroundColor: 'var(--primary-light)',
          border: '1.5px solid var(--primary-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
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
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            <SlidersHorizontal size={19} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                Operational What-If Expiry & Inventory Simulator
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  backgroundColor: 'var(--surface)',
                  color: 'var(--primary)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--primary-border)',
                }}
              >
                PROJECTION SANDBOX
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Simulates hypothetical purchasing, dispensing, and lead-time decisions from live Firestore data before making real inventory changes.
            </p>
          </div>
        </div>

        {/* Quick Simulation Presets */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => handleApplyPreset('baseline')}
            className={`btn ${scenarioPreset === 'baseline' && orderQty === 0 && !holdBatch && dispensingIncreasePct === 0 && leadTimeDays === 0 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            Baseline (+0)
          </button>
          <button
            onClick={() => handleApplyPreset('order-100')}
            className={`btn ${orderQty === 100 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            +100 Units
          </button>
          <button
            onClick={() => handleApplyPreset('order-300')}
            className={`btn ${orderQty === 300 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            +300 Units
          </button>
          <button
            onClick={() => handleApplyPreset('order-500')}
            className={`btn ${orderQty === 500 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            +500 Units
          </button>
          <button
            onClick={() => handleApplyPreset('demand-20')}
            className={`btn ${dispensingIncreasePct === 20 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            +20% Dispensing
          </button>
          <button
            onClick={() => handleApplyPreset('delay-15')}
            className={`btn ${leadTimeDays === 15 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            15d Delay
          </button>
          <button
            onClick={() => handleApplyPreset('hold-batch')}
            className={`btn ${holdBatch ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 11.5, padding: '5px 10px' }}
          >
            Hold Batch
          </button>
          <button
            onClick={handleResetToBaseline}
            className="btn btn-ghost"
            style={{ fontSize: 11.5, padding: '5px 8px', color: 'var(--text-3)' }}
            title="Reset Simulator to Current State"
          >
            <RefreshCw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* MEDICINE & BATCH SELECTOR TOOLBAR */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
              Select Live Pharmacy Medicine:
            </label>
            <select
              className="input"
              value={selectedMedicineName}
              onChange={e => {
                setSelectedMedicineName(e.target.value);
                setSelectedBatchCode('');
              }}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {uniqueMedicines.map((m, idx) => (
                <option key={idx} value={m.medicine || (m as any).medicineName}>
                  {m.medicine || (m as any).medicineName} ({m.quantity} units · Batch {m.batch})
                </option>
              ))}
            </select>
          </div>

          {availableBatches.length > 1 && (
            <div style={{ minWidth: 180 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                Target Batch (FEFO Prioritized):
              </label>
              <select
                className="input"
                value={selectedBatchCode}
                onChange={e => setSelectedBatchCode(e.target.value)}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {availableBatches.map((b, idx) => (
                  <option key={idx} value={b.batch}>
                    {b.batch} ({b.quantity} units · {b.daysToExpiry}d left)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-3)' }}>
          <span className="chip badge-blue" style={{ fontSize: 11 }}>
            {availableBatches.length} {availableBatches.length === 1 ? 'Batch' : 'Batches'} in Inventory
          </span>
          <span>FEFO Active</span>
        </div>
      </div>

      {/* 4-STAGE OPERATIONAL SIMULATION PIPELINE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {/* Stage 1: Actual Current State */}
        <div
          className="card"
          style={{
            padding: 18,
            borderLeft: '4px solid #3B82F6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Actual Current State
              </span>
              <span className="chip badge-blue" style={{ fontSize: 10 }}>FIRESTORE DATA</span>
            </div>
            
            <p style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
              {selectedMedicineName}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>
              Batch: <strong style={{ color: 'var(--text)' }}>{selectedBatchCode}</strong> · Expiry: <strong style={{ color: 'var(--text)' }}>{expiryDateStr}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Stock:</span>
                <b style={{ color: 'var(--text)' }}>{currentStock} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Daily Dispensing Rate:</span>
                <b style={{ color: 'var(--text)' }}>{baseDailyUsage} units / day</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Days to Expiry (Real Date):</span>
                <b style={{ color: daysToExpiry <= 30 ? 'var(--danger)' : 'var(--text)' }}>
                  {daysToExpiry > 0 ? `${daysToExpiry} days remaining` : 'Expired'}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Unit Purchase Cost:</span>
                <b style={{ color: 'var(--text)' }}>₹ {unitCost}</b>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-3)' }}>
            Baseline Consumption: <b>{baselineUsableConsumption} units</b> · Surplus: <b style={{ color: baselineSurplus > 0 ? 'var(--warning)' : 'var(--success)' }}>{baselineSurplus} units (₹ {baselineCapitalAtRisk.toLocaleString('en-IN')})</b>
          </div>
        </div>

        {/* Stage 2: Scenario Hypothesis */}
        <div
          className="card"
          style={{
            padding: 18,
            borderLeft: '4px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Scenario Hypothesis
              </span>
              <span className="chip badge-teal" style={{ fontSize: 10 }}>SIMULATED</span>
            </div>

            <p style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
              {orderQty > 0 ? `Proposed Order: +${orderQty} units` : 'Baseline Order: +0 units'}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>
              Simulated Velocity: <strong style={{ color: 'var(--text)' }}>{simulatedDailyDemand.toFixed(1)} / day</strong> {dispensingIncreasePct !== 0 ? `(${dispensingIncreasePct > 0 ? '+' : ''}${dispensingIncreasePct}%)` : ''} {holdBatch ? '· [HELD]' : ''}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Supplier Lead Time:</span>
                <b>{leadTimeDays} days delay</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Usable Window Remaining:</span>
                <b>{effectiveWindowDays} days</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Batch Holding Status:</span>
                <b style={{ color: holdBatch ? 'var(--danger)' : 'var(--success)' }}>
                  {holdBatch ? 'Hold Batch (0 Dispensing)' : 'Active FEFO Dispensing'}
                </b>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-3)' }}>
            Proposed Order Value: <b>₹ {(orderQty * unitCost).toLocaleString('en-IN')}</b> (Purchase Cost)
          </div>
        </div>

        {/* Stage 3: Projected Impact */}
        <div
          className="card"
          style={{
            padding: 18,
            borderLeft: `4px solid ${isHighRisk ? 'var(--danger)' : isModerateRisk ? 'var(--warning)' : isShortageRisk ? '#F59E0B' : 'var(--success)'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: isHighRisk ? 'var(--danger)' : isModerateRisk ? 'var(--warning)' : isShortageRisk ? '#F59E0B' : 'var(--success)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                3. Projected Impact
              </span>
              <span
                className={`chip ${isHighRisk ? 'badge-red' : isModerateRisk ? 'badge-amber' : isShortageRisk ? 'badge-orange' : 'badge-green'}`}
                style={{ fontSize: 10 }}
              >
                {isHighRisk ? 'High Expiry Risk' : isModerateRisk ? 'Moderate Surplus' : isShortageRisk ? 'Shortage Risk' : 'Optimal Balance'}
              </span>
            </div>

            <p style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
              Projected Stock → {projectedTotalStock} units
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>
              Expected Consumption: <strong style={{ color: 'var(--text)' }}>{expectedConsumption} units</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Surplus at Expiry:</span>
                <b style={{ color: isHighRisk ? 'var(--danger)' : isModerateRisk ? 'var(--warning)' : 'var(--text)' }}>
                  {projectedSurplus} units
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Capital at Risk (Purchase Cost):</span>
                <b style={{ color: isHighRisk ? 'var(--danger)' : isModerateRisk ? 'var(--warning)' : 'var(--text)' }}>
                  ₹ {capitalAtRisk.toLocaleString('en-IN')}
                </b>
              </div>
              {potentialShortage > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#F59E0B' }}>Potential Shortage:</span>
                  <b style={{ color: '#F59E0B' }}>{potentialShortage} units (₹ {stockoutExposure.toLocaleString('en-IN')})</b>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Stock Utilization:</span>
                <b>{stockUtilizationPct}%</b>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-3)' }}>
            Days to Runout: <b>{daysUntilStockout > 365 ? '365+ days' : `${daysUntilStockout} days`}</b>
          </div>
        </div>

        {/* Stage 4: AI Decision Support */}
        <div
          className="card"
          style={{
            padding: 18,
            borderLeft: '4px solid #8B5CF6',
            backgroundColor: 'var(--bg-alt)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. AI Decision Support
              </span>
              <BrainCircuit size={17} color="#8B5CF6" />
            </div>

            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, marginBottom: 12 }}>
              {holdBatch
                ? `Holding this batch diverts dispensing velocity; all ${projectedTotalStock} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) remain at risk of expiring unsold.`
                : isHighRisk
                ? `Ordering +${orderQty} units creates a projected surplus of ${projectedSurplus} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) expiring unsold if demand remains ${simulatedDailyDemand.toFixed(1)}/day. Optimal order size is ~${Math.max(0, expectedConsumption - currentStock)} units.`
                : isModerateRisk
                ? `Moderate surplus of ${projectedSurplus} units projected at expiry date (₹ ${capitalAtRisk.toLocaleString('en-IN')}). Maintain FEFO priority.`
                : isShortageRisk
                ? `Projected consumption (${expectedConsumption} units) exceeds available stock (${projectedTotalStock} units). Consider an order of +${potentialShortage} units.`
                : `Optimal balance: ${projectedTotalStock} units are projected to be fully consumed within ~${Math.min(daysToExpiry, daysUntilStockout)} days prior to expiry.`}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isHighRisk && orderQty > 0 && (
              <button
                onClick={handleApplyAiTarget}
                className="btn"
                style={{
                  backgroundColor: '#7C3AED',
                  color: '#FFFFFF',
                  fontSize: 12,
                  padding: '7px 12px',
                  borderRadius: 8,
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                <Sparkles size={14} /> Auto-Size to AI Target (~{Math.max(0, expectedConsumption - currentStock)} units)
              </button>
            )}

            <button
              onClick={() => setShowCommitModal(true)}
              disabled={orderQty <= 0}
              className="btn btn-teal"
              style={{
                fontSize: 12,
                padding: '7px 12px',
                borderRadius: 8,
                justifyContent: 'center',
                fontWeight: 700,
                opacity: orderQty <= 0 ? 0.6 : 1,
              }}
            >
              <PackagePlus size={14} /> Commit to Live Stock (+{orderQty})
            </button>
          </div>
        </div>
      </div>

      {/* SCENARIO COMPARISON MATRIX (Current Baseline vs +100 vs +300 vs +500) */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Scenario Comparison Matrix (Baseline vs +100 vs +300 vs +500)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Comparative evaluation calculated from live pharmacy inventory and velocity
            </p>
          </div>
          <span className="chip badge-blue" style={{ fontSize: 10.5 }}>4 SCENARIOS COMPARED</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {comparisonMatrix.map((item, idx) => {
            const isSelected = item.orderIncrement === orderQty;
            const isDanger = item.riskLevel === 'High' || item.riskLevel === 'Expired';
            return (
              <div
                key={idx}
                onClick={() => setOrderQty(item.orderIncrement)}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-alt)',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <b style={{ fontSize: 13.5, color: 'var(--text)' }}>
                    {item.orderIncrement === 0 ? 'Current Baseline (+0)' : `+${item.orderIncrement} Units`}
                  </b>
                  <span
                    className={`chip ${isDanger ? 'badge-red' : item.projectedSurplus > 0 ? 'badge-amber' : 'badge-green'}`}
                    style={{ fontSize: 10 }}
                  >
                    {item.riskLabel || item.riskLevel}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Projected Stock:</span>
                    <b>{item.projectedStock} units</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Expected Consumption:</span>
                    <b>{item.expectedConsumption} units</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Projected Surplus:</span>
                    <b style={{ color: isDanger ? 'var(--danger)' : item.projectedSurplus > 0 ? 'var(--warning)' : 'var(--text)' }}>
                      {item.projectedSurplus} units
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Capital at Risk:</span>
                    <b style={{ color: isDanger ? 'var(--danger)' : item.projectedSurplus > 0 ? 'var(--warning)' : 'var(--text)' }}>
                      ₹ {item.capitalAtRisk.toLocaleString('en-IN')}
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Utilization:</span>
                    <b>{item.utilizationPct}%</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FEFO MULTI-BATCH BREAKDOWN (When multiple batches exist) */}
      {availableBatches.length > 1 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                FEFO Batch Breakdown: {selectedMedicineName}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                Batches sorted by expiration order (First Expiry, First Out)
              </p>
            </div>
            <span className="chip badge-teal" style={{ fontSize: 10.5 }}>FEFO COMPLIANCE</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>FEFO Priority</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Current Stock</th>
                  <th>Unit Cost</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {availableBatches.map((b, idx) => {
                  const isCurrent = b.batch === selectedBatchCode;
                  return (
                    <tr key={idx} style={{ backgroundColor: isCurrent ? 'var(--primary-light)' : 'transparent' }}>
                      <td>
                        <span className={`chip ${idx === 0 ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: 10.5 }}>
                          #{idx + 1} {idx === 0 ? '(Primary FEFO)' : ''}
                        </span>
                      </td>
                      <td><strong>{b.batch}</strong></td>
                      <td>{b.expiry}</td>
                      <td>
                        <span style={{ color: b.daysToExpiry <= 30 ? 'var(--danger)' : 'var(--text)', fontWeight: 700 }}>
                          {b.daysToExpiry > 0 ? `${b.daysToExpiry} days` : 'Expired'}
                        </span>
                      </td>
                      <td>{b.quantity} units</td>
                      <td>₹ {b.unitPrice}</td>
                      <td>
                        <span className={`chip ${b.status === 'Near Expiry' ? 'badge-amber' : b.status === 'Recalled' ? 'badge-red' : 'badge-green'}`} style={{ fontSize: 10 }}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {isCurrent ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>Active in Simulator</span>
                        ) : (
                          <button
                            onClick={() => setSelectedBatchCode(b.batch)}
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: '3px 8px' }}
                          >
                            Simulate This Batch
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INTERACTIVE VARIABLES CONTROL PANEL */}
      <div className="card" style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 14,
            borderBottom: '1px solid var(--border)',
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Adjust Simulation Variables
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Modify hypothetical order quantities, dispensing demand, lead-times, or holding conditions
            </p>
          </div>
          <button
            onClick={handleResetToBaseline}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '5px 10px' }}
          >
            <RefreshCw size={13} /> Reset Variables
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {/* Proposed Order Quantity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Proposed Order Quantity</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>+{orderQty} units</span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="10"
              value={orderQty}
              onChange={e => setOrderQty(Math.max(0, Number(e.target.value)))}
            />
            <input
              type="range"
              min="0"
              max="1000"
              step="25"
              value={orderQty}
              onChange={e => setOrderQty(Number(e.target.value))}
              style={{ width: '100%', marginTop: 8, accentColor: 'var(--primary)' }}
            />
          </div>

          {/* Daily Dispensing Demand */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Daily Dispensing Rate</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                {simulatedDailyDemand.toFixed(1)} / day ({baseDailyUsage} baseline)
              </span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={baseDailyUsage}
              onChange={e => setBaseDailyUsage(Math.max(0, Number(e.target.value)))}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {[0, 10, 20, 50].map(pct => (
                <button
                  key={pct}
                  onClick={() => setDispensingIncreasePct(pct)}
                  className={`btn ${dispensingIncreasePct === pct ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 10.5, padding: '3px 8px', flex: 1 }}
                >
                  {pct === 0 ? 'Current' : `+${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier Delivery Delay */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Supplier Delivery Delay</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{leadTimeDays} days</span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={leadTimeDays}
              onChange={e => setLeadTimeDays(Math.max(0, Number(e.target.value)))}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {[0, 7, 15, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setLeadTimeDays(d)}
                  className={`btn ${leadTimeDays === d ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 10.5, padding: '3px 8px', flex: 1 }}
                >
                  {d}d Delay
                </button>
              ))}
            </div>
          </div>

          {/* Hold Batch Switch & Days to Expiry */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Days to Expiry (Dynamic)</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: daysToExpiry <= 30 ? 'var(--danger)' : 'var(--primary)' }}>
                {daysToExpiry} days
              </span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              value={daysToExpiry}
              onChange={e => setDaysToExpiry(Math.max(0, Number(e.target.value)))}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="holdBatchCheck"
                checked={holdBatch}
                onChange={e => setHoldBatch(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--danger)' }}
              />
              <label htmlFor="holdBatchCheck" style={{ fontSize: 12, fontWeight: 700, color: holdBatch ? 'var(--danger)' : 'var(--text)', cursor: 'pointer' }}>
                Hold Expiry Batch (Divert Dispensing)
              </label>
            </div>
          </div>
        </div>

        {/* Provenance note */}
        {demandProvenance && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={13} color="var(--primary)" />
            <span>Demand baseline: {demandProvenance}</span>
          </div>
        )}
      </div>

      {/* COMMIT CONFIRMATION MODAL */}
      {showCommitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
            }}
            onClick={() => setShowCommitModal(false)}
          />

          <div
            className="card animate-scale-in"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              background: 'var(--surface)',
              borderRadius: 18,
              border: '1.5px solid var(--border)',
              padding: 24,
              zIndex: 151,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PackagePlus size={20} color="#10B981" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                    Confirm Purchase Order Commit
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                    This action will add the proposed stock to live Firestore inventory.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCommitModal(false)} className="btn btn-ghost" style={{ padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Medicine:</span>
                <b>{selectedMedicineName}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Stock:</span>
                <b>{currentStock} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Proposed Order:</span>
                <b style={{ color: 'var(--primary)' }}>+{orderQty} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>New Projected Stock:</span>
                <b style={{ color: 'var(--primary)', fontSize: 14 }}>{currentStock + orderQty} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Unit Purchase Cost:</span>
                <b>₹ {unitCost} / unit</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Total Purchase Value:</span>
                <b>₹ {(orderQty * unitCost).toLocaleString('en-IN')}</b>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowCommitModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCommit}
                disabled={isCommitting}
                className="btn btn-teal"
                style={{ fontSize: 13, padding: '8px 18px', fontWeight: 700 }}
              >
                {isCommitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Committing to Firestore...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Confirm & Commit to Live Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
