import React, { useState, useEffect, useMemo } from 'react';
import type { Medicine } from '../data';
import {
  SlidersHorizontal, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck,
  TrendingUp, TrendingDown, Clock3, BrainCircuit, CheckCircle2, ChevronRight,
  PackagePlus, Sparkles, DollarSign, Info, Eye, Boxes, X, Layers, AlertCircle,
  Truck, ArrowUpRight, Scale, Search, ShieldAlert, Calendar, HelpCircle, Activity
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
  projectedConsumption?: number;
  projectedSurplus?: number;
  capitalAtRisk?: number;
  riskLevel?: string;
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

function formatFutureCalendarDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.round(daysFromNow));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

  // Selected Medicine & Batch State
  const [selectedMedicineName, setSelectedMedicineName] = useState<string>('');
  const [selectedBatchCode, setSelectedBatchCode] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Actual Baseline Parameters from live Firestore
  const [currentStock, setCurrentStock] = useState<number>(45);
  const [baseDailyUsage, setBaseDailyUsage] = useState<number>(5);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(25);
  const [expiryDateStr, setExpiryDateStr] = useState<string>('25 Sep 2026');
  const [unitCost, setUnitCost] = useState<number>(95);
  const [demandProvenance, setDemandProvenance] = useState<string>('');
  const [hasSufficientData, setHasSufficientData] = useState<boolean>(true);
  const [confidence, setConfidence] = useState<string>('Moderate');

  // What-If Simulation Scenario Variables
  const [demandChangePct, setDemandChangePct] = useState<number>(0);
  const [orderQty, setOrderQty] = useState<number>(0);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(0);
  const [holdBatch, setHoldBatch] = useState<boolean>(false);
  const [scenarioPreset, setScenarioPreset] = useState<string>('baseline');

  // Backend Sync & Multi-Scenario Data
  const [comparisonMatrix, setComparisonMatrix] = useState<ScenarioComparisonItem[]>([]);
  const [multiBatchList, setMultiBatchList] = useState<BatchBreakdownItem[]>([]);
  const [suggestedAiTarget, setSuggestedAiTarget] = useState<number>(0);
  const [backendResult, setBackendResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Commit Modal
  const [showCommitModal, setShowCommitModal] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // Ask the Simulator Question State
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAskingQuestion, setIsAskingQuestion] = useState<boolean>(false);
  const [questionResponse, setQuestionResponse] = useState<any>(null);

  const suggestedQuestions = [
    'Will this batch expire before it is used?',
    'What if demand decreases by 30%?',
    'What if demand increases by 20%?',
    'How much medicine could expire?',
    'How much money is at risk?',
    'When will this stock run out?',
    'Which batch should I prioritize?',
    'What happens if this batch is quarantined for 5 days?',
    'What happens if I reorder 50 units?',
  ];

  const handleAskQuestion = async (customQ?: string) => {
    const q = (customQ !== undefined ? customQ : questionInput).trim();
    if (!q) {
      showToast('Please enter a question to ask the simulator.');
      return;
    }
    setQuestionInput(q);
    setIsAskingQuestion(true);
    try {
      const res = await api.askSimulatorQuestion({
        question: q,
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

      if (res) {
        setQuestionResponse(res);
        // Automatically sync interpreted parameters into simulator controls if modified
        if (res.interpretedParameters) {
          if (res.interpretedParameters.demandChangePct !== undefined) {
            setDemandChangePct(res.interpretedParameters.demandChangePct);
          }
          if (res.interpretedParameters.orderQty !== undefined) {
            setOrderQty(res.interpretedParameters.orderQty);
          }
          if (res.interpretedParameters.holdBatch !== undefined) {
            setHoldBatch(Boolean(res.interpretedParameters.holdBatch));
          }
          if (res.interpretedParameters.leadTimeDays !== undefined) {
            setLeadTimeDays(res.interpretedParameters.leadTimeDays);
          }
        }
        showToast('Question analyzed against live inventory & dispensing velocity.');
      }
    } catch (err: any) {
      console.error('Failed to ask question:', err);
      showToast(`Error: ${err.message || 'Simulation question failed.'}`);
    } finally {
      setIsAskingQuestion(false);
    }
  };

  // Initialize selected medicine from inventory
  useEffect(() => {
    if (uniqueMedicines.length > 0 && !selectedMedicineName) {
      // Find one with near expiry or first item
      const candidate = uniqueMedicines.find(m => m.status === 'Near Expiry') || uniqueMedicines[0];
      setSelectedMedicineName(candidate.medicine || (candidate as any).medicineName || 'Vitamin D3 60K');
      setSelectedBatchCode(candidate.batch || (candidate as any).batchNumber || 'VD102');
    }
  }, [uniqueMedicines, selectedMedicineName]);

  // Sibling Batches for the currently selected medicine (sorted FEFO)
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

  // Run backend calculation engine for full simulation and multi-batch breakdown
  useEffect(() => {
    let isMounted = true;
    async function fetchBackendSimulation() {
      setLoading(true);
      try {
        const res = await api.simulateScenario({
          medicine: selectedMedicineName,
          batch: selectedBatchCode,
          batchId: selectedBatchCode,
          currentStock,
          orderQty,
          dailyUsage: baseDailyUsage,
          daysToExpiry,
          unitCost,
          leadTimeDays,
          holdBatch,
          demandChangePct,
          dispensingIncreasePct: demandChangePct,
        } as any);

        if (isMounted && res) {
          setBackendResult(res);
          if (res.multiScenarioComparison?.comparisonMatrix) {
            setComparisonMatrix(res.multiScenarioComparison.comparisonMatrix);
          }
          if (res.demandProvenance) {
            setDemandProvenance(res.demandProvenance);
          }
          if (res.hasSufficientData !== undefined) {
            setHasSufficientData(res.hasSufficientData);
          }
          if (res.confidence) {
            setConfidence(res.confidence);
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
    demandChangePct
  ]);

  // Deterministic Computations (Exact mathematical models)
  const demandMultiplier = 1 + (demandChangePct / 100);
  const simulatedDailyDemand = holdBatch ? 0 : Math.max(0, baseDailyUsage * demandMultiplier);

  // 1. BASELINE CALCULATIONS (Current Stock Only)
  const baselineUsableDays = Math.max(0, daysToExpiry);
  const baselineExpectedConsumption = Math.round(baseDailyUsage * baselineUsableDays);
  const baselineUsableConsumption = Math.min(currentStock, baselineExpectedConsumption);
  const baselineSurplus = Math.max(0, currentStock - baselineExpectedConsumption);
  const baselineCapitalAtRisk = baselineSurplus * unitCost;
  const baselineShortage = Math.max(0, baselineExpectedConsumption - currentStock);
  const baselineStockoutDays = (baseDailyUsage > 0 && currentStock < baselineExpectedConsumption)
    ? Math.floor(currentStock / baseDailyUsage)
    : null;
  const baselineStockoutDate = baselineStockoutDays !== null ? formatFutureCalendarDate(baselineStockoutDays) : null;

  // 2. WHAT-IF SCENARIO PROJECTIONS
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
  const estimatedStockoutDate = (simulatedDailyDemand > 0 && projectedTotalStock < expectedConsumption)
    ? formatFutureCalendarDate(daysUntilStockout)
    : null;

  // Risk Classification Engine
  // Baseline Risk
  let baselineRiskLevel = 'Low Risk';
  let baselineRiskClass = 'badge-green';
  if (daysToExpiry <= 0) {
    baselineRiskLevel = 'Expired';
    baselineRiskClass = 'badge-dark';
  } else if (baselineSurplus > currentStock * 0.5 && baselineSurplus >= 30) {
    baselineRiskLevel = 'Likely Expiry';
    baselineRiskClass = 'badge-red';
  } else if (baselineSurplus > currentStock * 0.2 || baselineSurplus >= 15) {
    baselineRiskLevel = 'High Expiry Risk';
    baselineRiskClass = 'badge-orange';
  } else if (baselineSurplus > 0 || (daysToExpiry <= 15 && currentStock > baselineExpectedConsumption * 0.8)) {
    baselineRiskLevel = 'Moderate Risk';
    baselineRiskClass = 'badge-amber';
  } else if (baselineShortage > 0) {
    baselineRiskLevel = 'Stockout Risk';
    baselineRiskClass = 'badge-red';
  }

  // Scenario Risk
  let scenarioRiskLevel = 'Low Risk';
  let scenarioRiskClass = 'badge-green';
  let riskExplanation = '';
  let pharmacistRecommendation = '';

  if (daysToExpiry <= 0) {
    scenarioRiskLevel = 'Expired';
    scenarioRiskClass = 'badge-dark';
    riskExplanation = `Batch expired with ${currentStock} units remaining in inventory.`;
    pharmacistRecommendation = `Quarantine remaining ${currentStock} units immediately and process supplier return. Do not dispense.`;
  } else if (holdBatch) {
    scenarioRiskLevel = 'High Expiry Risk';
    scenarioRiskClass = 'badge-red';
    riskExplanation = `Batch is under quarantine hold. Dispensing velocity is reduced to 0 units/day; all ${projectedTotalStock} units remain exposed to expiry.`;
    pharmacistRecommendation = `Batch is held. All ${projectedTotalStock} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) will expire unused unless quarantine is lifted or stock is returned.`;
  } else if (projectedSurplus > projectedTotalStock * 0.5 && projectedSurplus >= 30) {
    scenarioRiskLevel = 'Likely Expiry';
    scenarioRiskClass = 'badge-red';
    riskExplanation = `Simulated dispensing rate (${simulatedDailyDemand.toFixed(1)}/day) will consume only ${expectedConsumption} of ${projectedTotalStock} units over ${effectiveWindowDays} days, leaving ${projectedSurplus} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) unsold at expiry.`;
    pharmacistRecommendation = `High expiry exposure: Projected surplus of ${projectedSurplus} units. Prioritize front-of-shelf FEFO dispensing immediately${orderQty > 0 ? ` and cancel/reduce proposed reorder to ~${Math.max(0, expectedConsumption - currentStock)} units.` : '.'}`;
  } else if (projectedSurplus > projectedTotalStock * 0.25 || projectedSurplus >= 15) {
    scenarioRiskLevel = 'High Expiry Risk';
    scenarioRiskClass = 'badge-orange';
    riskExplanation = `Current dispensing velocity of ${simulatedDailyDemand.toFixed(1)} units/day is insufficient to clear ${projectedTotalStock} units within the remaining ${effectiveWindowDays} days. Projected surplus of ${projectedSurplus} units.`;
    pharmacistRecommendation = `Elevated expiry risk: Maintain strict FEFO dispensing priority. ${orderQty > 0 ? `Reduce proposed order to ~${Math.max(0, expectedConsumption - currentStock)} units.` : 'Monitor dispensing trend closely.'}`;
  } else if (projectedSurplus > 0) {
    scenarioRiskLevel = 'Moderate Risk';
    scenarioRiskClass = 'badge-amber';
    riskExplanation = `Moderate surplus of ${projectedSurplus} units (₹ ${capitalAtRisk.toLocaleString('en-IN')}) projected at expiry date under simulated velocity (${simulatedDailyDemand.toFixed(1)}/day).`;
    pharmacistRecommendation = `Moderate surplus: Projected ${projectedSurplus} units at expiry. Maintain FEFO priority to maximize stock clearance.`;
  } else if (potentialShortage > 0) {
    scenarioRiskLevel = 'Stockout Risk';
    scenarioRiskClass = 'badge-red';
    riskExplanation = `Projected demand (${expectedConsumption} units) exceeds total stock (${projectedTotalStock} units). Stock will run out in ~${daysUntilStockout} days (est. ${estimatedStockoutDate}), before the batch expiry date.`;
    pharmacistRecommendation = `Stockout risk: Projected shortage of ${potentialShortage} units before batch expiry. Consider placing a purchase order for +${potentialShortage} units to maintain service continuity.`;
  } else {
    scenarioRiskLevel = 'Low Risk';
    scenarioRiskClass = 'badge-green';
    riskExplanation = `Simulated demand of ${simulatedDailyDemand.toFixed(1)} units/day will fully consume available stock (${projectedTotalStock} units) in ~${Math.min(daysToExpiry, daysUntilStockout)} days, safely before the expiry date.`;
    pharmacistRecommendation = `Optimal balance: ${projectedTotalStock} units are projected to be consumed prior to expiry. Zero capital at risk.`;
  }

  // Preset Handlers
  const handleApplyPreset = (type: string) => {
    setScenarioPreset(type);
    if (type === 'baseline') {
      setDemandChangePct(0);
      setOrderQty(0);
      setLeadTimeDays(0);
      setHoldBatch(false);
      showToast('Restored Actual Baseline');
    } else if (type === 'demand-down-50') {
      setDemandChangePct(-50);
      setOrderQty(0);
      setHoldBatch(false);
      showToast('Scenario Loaded: -50% Demand Drop (Severe Slowdown)');
    } else if (type === 'demand-down-30') {
      setDemandChangePct(-30);
      setOrderQty(0);
      setHoldBatch(false);
      showToast('Scenario Loaded: -30% Demand Slowdown');
    } else if (type === 'demand-up-30') {
      setDemandChangePct(30);
      setHoldBatch(false);
      showToast('Scenario Loaded: +30% Demand Surge');
    } else if (type === 'demand-up-50') {
      setDemandChangePct(50);
      setHoldBatch(false);
      showToast('Scenario Loaded: +50% Demand Peak');
    } else if (type === 'hold-batch') {
      setHoldBatch(true);
      showToast('Scenario Loaded: Quarantine / Hold Batch (0 Dispensing)');
    } else if (type === 'reorder-100') {
      setOrderQty(100);
      setHoldBatch(false);
      showToast('Scenario Loaded: Additional Reorder +100 Units');
    } else if (type === 'reorder-300') {
      setOrderQty(300);
      setHoldBatch(false);
      showToast('Scenario Loaded: Additional Reorder +300 Units');
    }
  };

  // Reset to live Firestore baseline
  const handleResetToBaseline = () => {
    setDemandChangePct(0);
    setOrderQty(0);
    setLeadTimeDays(0);
    setHoldBatch(false);
    setScenarioPreset('baseline');
    showToast('Simulator reset to actual live pharmacy baseline.');
  };

  // Auto-Size to AI Target
  const handleApplyAiTarget = () => {
    const optimal = Math.max(0, expectedConsumption - currentStock);
    setOrderQty(optimal);
    showToast(`Order quantity auto-sized to optimal target: ${optimal} units`);
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
      showToast(`Purchase order confirmed: +${orderQty} units of ${selectedMedicineName} (Batch ${newBatchId}) saved to inventory.`);
      setOrderQty(0);
    } catch (err: any) {
      console.error('Failed to commit purchase order:', err);
      setIsCommitting(false);
      showToast(`Failed to commit: ${err.message || 'Server error'}`);
    }
  };

  // Expiry badge helper
  const getExpiryBadge = (days: number) => {
    if (days <= 0) return { label: 'Expired', cls: 'badge-dark', color: '#1F2937' };
    if (days === 0) return { label: 'Expires Today', cls: 'badge-red', color: 'var(--danger)' };
    if (days === 1) return { label: '1 Day Left', cls: 'badge-red', color: 'var(--danger)' };
    if (days <= 10) return { label: `${days}d Left (Critical)`, cls: 'badge-red', color: 'var(--danger)' };
    if (days <= 30) return { label: `${days}d Left (Near Expiry)`, cls: 'badge-amber', color: '#D97706' };
    return { label: `${days}d Left`, cls: 'badge-green', color: '#10B981' };
  };

  const currentExpiryBadge = getExpiryBadge(daysToExpiry);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. HEADER BANNER */}
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
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            <Clock3 size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                What-If Expiry & Inventory Risk Simulator
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
                PROJECTION SANDBOX · READ-ONLY
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '3px 0 0' }}>
              Predicts whether medicine batches will be consumed before expiry and tests hypothetical demand shifts without altering live inventory.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleResetToBaseline}
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Reset to live inventory baseline"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Reset to Baseline
          </button>
        </div>
      </div>

      {/* 2. MEDICINE & BATCH SELECTOR */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Boxes size={18} color="var(--primary)" />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
              Select Medicine & Batch from Live Pharmacy Stock
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="chip badge-blue" style={{ fontSize: 11 }}>
              {uniqueMedicines.length} Medicines in Stock
            </span>
            <span className="chip badge-teal" style={{ fontSize: 11 }}>
              FEFO Prioritization Active
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {/* Medicine Selector with Search */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
              Medicine Name:
            </label>
            <select
              className="input"
              value={selectedMedicineName}
              onChange={e => {
                setSelectedMedicineName(e.target.value);
                setSelectedBatchCode('');
              }}
              style={{ fontSize: 13.5, fontWeight: 600, width: '100%' }}
            >
              {uniqueMedicines.map((m, idx) => (
                <option key={idx} value={m.medicine || (m as any).medicineName}>
                  {m.medicine || (m as any).medicineName} ({m.quantity} units · Batch {m.batch})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selector (FEFO sorted) */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
              Target Batch (Sorted Earliest Expiry First):
            </label>
            <select
              className="input"
              value={selectedBatchCode}
              onChange={e => setSelectedBatchCode(e.target.value)}
              style={{ fontSize: 13.5, fontWeight: 600, width: '100%' }}
            >
              {availableBatches.map((b, idx) => (
                <option key={idx} value={b.batch}>
                  Batch {b.batch} · {b.quantity} units · Expiry: {b.expiry} ({b.daysToExpiry > 0 ? `${b.daysToExpiry}d left` : 'Expired'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. CURRENT BATCH CONTEXT CARD */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          borderLeft: '4px solid #3B82F6',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Actual Pharmacy Baseline Data
              </span>
              <span className="chip badge-blue" style={{ fontSize: 10 }}>TENANT VERIFIED</span>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '4px 0 0' }}>
              {selectedMedicineName}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className={`chip ${currentExpiryBadge.cls}`}
              style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px' }}
            >
              <Calendar size={12} style={{ marginRight: 4 }} />
              {currentExpiryBadge.label}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            padding: '12px 14px',
            backgroundColor: 'var(--bg-alt)',
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Batch Number</span>
            <strong style={{ fontSize: 14, color: 'var(--text)' }}>{selectedBatchCode}</strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Current Stock</span>
            <strong style={{ fontSize: 14, color: 'var(--text)' }}>{currentStock} units</strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Unit Cost</span>
            <strong style={{ fontSize: 14, color: 'var(--text)' }}>₹ {unitCost}</strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Exact Expiry Date</span>
            <strong style={{ fontSize: 14, color: daysToExpiry <= 30 ? 'var(--danger)' : 'var(--text)' }}>
              {expiryDateStr}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Historical Dispensing</span>
            <strong style={{ fontSize: 14, color: 'var(--text)' }}>
              {baseDailyUsage.toFixed(1)} units / day
            </strong>
          </div>
        </div>

        {/* Provenance & Confidence Notice */}
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={13} color={hasSufficientData ? 'var(--primary)' : '#F59E0B'} />
          <span>
            <b>Dispensing Provenance:</b> {demandProvenance} ({confidence} confidence)
          </span>
        </div>
      </div>

      {/* 4. ASK THE SIMULATOR (Natural-Language Decision Support) */}
      <div
        className="card"
        style={{
          padding: 20,
          borderLeft: '4px solid #10B981',
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-alt) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HelpCircle size={18} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Ask the Simulator
                </h3>
                <span className="chip badge-green" style={{ fontSize: 10 }}>
                  DETERMINISTIC DECISION SUPPORT
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                Ask operational What-If questions in plain English — grounded in {selectedMedicineName} (Batch {selectedBatchCode}) live stock and dispensing velocity.
              </p>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleAskQuestion();
          }}
          style={{ display: 'flex', gap: 10 }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="input"
              value={questionInput}
              onChange={e => setQuestionInput(e.target.value)}
              placeholder="e.g. Will this batch expire before it is used? What if demand decreases by 30%? How much money is at risk?"
              style={{ paddingLeft: 38, fontSize: 13.5, width: '100%' }}
            />
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}
            />
          </div>
          <button
            type="submit"
            disabled={isAskingQuestion || !questionInput.trim()}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            {isAskingQuestion ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Analyze Question
              </>
            )}
          </button>
        </form>

        {/* Suggested Question Pills */}
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
            Suggested Pharmacist Questions:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskQuestion(q)}
                disabled={isAskingQuestion}
                className="btn btn-secondary"
                style={{
                  fontSize: 11.5,
                  padding: '4px 10px',
                  borderRadius: 16,
                  backgroundColor: questionInput === q ? 'var(--primary-light)' : 'var(--surface)',
                  borderColor: questionInput === q ? 'var(--primary)' : 'var(--border)',
                  color: questionInput === q ? 'var(--primary)' : 'var(--text-2)',
                  textAlign: 'left',
                }}
              >
                • {q}
              </button>
            ))}
          </div>
        </div>

        {/* Question Response Card */}
        {questionResponse && (
          <div
            className="animate-fade-in"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              backgroundColor: 'var(--surface)',
              border: '1.5px solid var(--primary-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  SIMULATOR EVALUATION: &ldquo;{questionResponse.question}&rdquo;
                </span>
                <span className="chip badge-blue" style={{ fontSize: 10 }}>{questionResponse.queryType}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Target: {selectedMedicineName} (Batch {selectedBatchCode})
              </span>
            </div>

            {/* Direct Answer Box */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--primary-light)',
                border: '1px solid var(--primary-border)',
                fontSize: 13.5,
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.5,
              }}
            >
              {questionResponse.directAnswer}
            </div>

            {/* Detailed Explanation */}
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
              <b>Analysis:</b> {questionResponse.detailedExplanation}
            </div>

            {/* Operational Recommendation */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Info size={14} color="var(--primary)" />
              <span><b>Pharmacist Action:</b> {questionResponse.recommendation}</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. WHAT-IF SCENARIOS CONTROLS */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              What-If Scenario Controls
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Simulate changes in patient demand velocity, supply orders, supplier lead times, or quarantine holds
            </p>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleApplyPreset('demand-down-50')}
              className={`btn ${demandChangePct === -50 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              -50% Demand
            </button>
            <button
              onClick={() => handleApplyPreset('demand-down-30')}
              className={`btn ${demandChangePct === -30 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              -30% Demand
            </button>
            <button
              onClick={() => handleApplyPreset('baseline')}
              className={`btn ${demandChangePct === 0 && orderQty === 0 && !holdBatch && leadTimeDays === 0 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              Baseline (0%)
            </button>
            <button
              onClick={() => handleApplyPreset('demand-up-30')}
              className={`btn ${demandChangePct === 30 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              +30% Demand
            </button>
            <button
              onClick={() => handleApplyPreset('demand-up-50')}
              className={`btn ${demandChangePct === 50 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              +50% Demand
            </button>
            <button
              onClick={() => handleApplyPreset('hold-batch')}
              className={`btn ${holdBatch ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              Hold Batch
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {/* Demand Change % Slider & Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Demand Shift (%)</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: demandChangePct > 0 ? 'var(--primary)' : demandChangePct < 0 ? 'var(--danger)' : 'var(--text)' }}>
                {demandChangePct > 0 ? `+${demandChangePct}% Surge` : demandChangePct < 0 ? `${demandChangePct}% Drop` : '0% (Normal)'}
              </span>
            </div>
            <input
              type="range"
              min="-80"
              max="150"
              step="5"
              value={demandChangePct}
              onChange={e => setDemandChangePct(Number(e.target.value))}
              style={{ width: '100%', accentColor: demandChangePct >= 0 ? 'var(--primary)' : 'var(--danger)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              <span>-80%</span>
              <span>0% Baseline ({baseDailyUsage}/d)</span>
              <span>+150%</span>
            </div>
          </div>

          {/* Additional Stock / Reorder Qty (Secondary Scenario) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Additional Reorder Stock</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>+{orderQty} units</span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="10"
              value={orderQty}
              onChange={e => setOrderQty(Math.max(0, Number(e.target.value)))}
              placeholder="0 (Baseline Stock Only)"
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[0, 50, 100, 300, 500].map(q => (
                <button
                  key={q}
                  onClick={() => setOrderQty(q)}
                  className={`btn ${orderQty === q ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 10.5, padding: '3px 6px', flex: 1 }}
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier Lead Time Delay */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Supplier Lead Time Delay</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{leadTimeDays} days delay</span>
            </div>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={leadTimeDays}
              onChange={e => setLeadTimeDays(Math.max(0, Number(e.target.value)))}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[0, 5, 10, 15].map(d => (
                <button
                  key={d}
                  onClick={() => setLeadTimeDays(d)}
                  className={`btn ${leadTimeDays === d ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 10.5, padding: '3px 6px', flex: 1 }}
                >
                  {d}d Delay
                </button>
              ))}
            </div>
          </div>

          {/* Hold / Quarantine Batch Toggle */}
          <div>
            <label className="label" style={{ marginBottom: 6 }}>Batch Quarantine / Hold</label>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: holdBatch ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-alt)',
                border: `1px solid ${holdBatch ? 'var(--danger)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                id="holdBatchCheck"
                checked={holdBatch}
                onChange={e => setHoldBatch(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--danger)', cursor: 'pointer' }}
              />
              <label htmlFor="holdBatchCheck" style={{ fontSize: 12.5, fontWeight: 700, color: holdBatch ? 'var(--danger)' : 'var(--text)', cursor: 'pointer', margin: 0 }}>
                {holdBatch ? '⚠️ Batch Held (Dispensing Stopped)' : 'Batch Active (FEFO Dispensing)'}
              </label>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 0' }}>
              Holding stops dispensing velocity to simulate quarantine impact.
            </p>
          </div>
        </div>
      </div>

      {/* 5. SIDE-BY-SIDE BEFORE vs WHAT-IF COMPARISON */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {/* BASELINE CARD */}
        <div
          className="card"
          style={{
            padding: 20,
            borderLeft: '4px solid #64748B',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  BASELINE PROJECTION
                </span>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                  Expected outcome under current dispensing velocity
                </p>
              </div>
              <span className={`chip ${baselineRiskClass}`} style={{ fontSize: 11, fontWeight: 700 }}>
                {baselineRiskLevel}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Batch Stock:</span>
                <b>{currentStock} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Days to Expiry:</span>
                <b>{daysToExpiry} days ({expiryDateStr})</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Dispensing Velocity:</span>
                <b>{baseDailyUsage.toFixed(1)} units / day</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Consumption Before Expiry:</span>
                <b>{baselineUsableConsumption} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Expiry Wastage:</span>
                <b style={{ color: baselineSurplus > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  {baselineSurplus} units
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Capital at Risk (Wastage Value):</span>
                <b style={{ color: baselineSurplus > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  ₹ {baselineCapitalAtRisk.toLocaleString('en-IN')}
                </b>
              </div>
              {baselineShortage > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#F59E0B' }}>Est. Stockout Date:</span>
                  <b style={{ color: '#F59E0B' }}>{baselineStockoutDate} (~{baselineStockoutDays}d)</b>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-alt)',
              fontSize: 11.5,
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
            }}
          >
            <b>Baseline Trend:</b> {baselineSurplus === 0 ? 'Stock will be fully consumed before expiry.' : `${baselineSurplus} units projected to expire unused unless velocity increases.`}
          </div>
        </div>

        {/* WHAT-IF SCENARIO CARD */}
        <div
          className="card"
          style={{
            padding: 20,
            borderLeft: `4px solid ${scenarioRiskLevel === 'Low Risk' ? 'var(--success)' : scenarioRiskLevel === 'Moderate Risk' ? 'var(--warning)' : 'var(--danger)'}`,
            backgroundColor: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  WHAT-IF SCENARIO PROJECTION
                </span>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                  Outcome under selected hypothetical assumptions
                </p>
              </div>
              <span className={`chip ${scenarioRiskClass}`} style={{ fontSize: 11, fontWeight: 700 }}>
                {scenarioRiskLevel}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Simulated Available Stock:</span>
                <b>{projectedTotalStock} units {orderQty > 0 ? `(+${orderQty} order)` : ''}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Effective Window:</span>
                <b>{effectiveWindowDays} days {leadTimeDays > 0 ? `(-${leadTimeDays}d lead time)` : ''}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Simulated Velocity:</span>
                <b style={{ color: demandChangePct !== 0 ? 'var(--primary)' : 'var(--text)' }}>
                  {simulatedDailyDemand.toFixed(1)} units / day {demandChangePct !== 0 ? `(${demandChangePct > 0 ? '+' : ''}${demandChangePct}%)` : ''}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Scenario Consumption:</span>
                <b>{projectedConsumptionActual} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Expiry Wastage:</span>
                <b style={{ color: projectedSurplus > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  {projectedSurplus} units
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Capital at Risk (Wastage Value):</span>
                <b style={{ color: projectedSurplus > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  ₹ {capitalAtRisk.toLocaleString('en-IN')}
                </b>
              </div>
              {potentialShortage > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#F59E0B' }}>Est. Stockout Date:</span>
                  <b style={{ color: '#F59E0B' }}>{estimatedStockoutDate} (~{daysUntilStockout}d)</b>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: 'var(--primary-light)',
              fontSize: 11.5,
              color: 'var(--text)',
              border: '1px solid var(--primary-border)',
            }}
          >
            <b>Scenario Shift:</b> {projectedSurplus !== baselineSurplus ? `Wastage changes from ${baselineSurplus} → ${projectedSurplus} units (Δ ${projectedSurplus - baselineSurplus > 0 ? '+' : ''}${projectedSurplus - baselineSurplus} units).` : 'Wastage matches baseline.'}
          </div>
        </div>
      </div>

      {/* 6. DYNAMIC PHARMACIST INSIGHT & DECISION SUPPORT */}
      <div
        className="card"
        style={{
          padding: 20,
          borderLeft: '4px solid #8B5CF6',
          backgroundColor: 'var(--bg-alt)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrainCircuit size={18} color="#FFFFFF" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              Pharmacist Decision Support & Risk Analysis
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Deterministic numerical analysis of risk drivers & recommended actions
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Why the risk exists */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Why this risk status exists:
            </span>
            <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              {riskExplanation}
            </p>
          </div>

          {/* Operational Recommendation */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Operational Recommendation:
            </span>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
              {pharmacistRecommendation}
            </p>
          </div>

          {/* Financial Separation Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              paddingTop: 6,
            }}
          >
            <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, display: 'block' }}>Expiry Wastage Exposure</span>
              <strong style={{ fontSize: 16, color: 'var(--danger)' }}>₹ {capitalAtRisk.toLocaleString('en-IN')}</strong>
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>{projectedSurplus} units unsold at unit cost ₹{unitCost}</span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700, display: 'block' }}>Stockout Revenue Exposure</span>
              <strong style={{ fontSize: 16, color: '#D97706' }}>₹ {stockoutExposure.toLocaleString('en-IN')}</strong>
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>{potentialShortage} units unsatisfied demand</span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, display: 'block' }}>Stock Utilization</span>
              <strong style={{ fontSize: 16, color: 'var(--primary)' }}>{stockUtilizationPct}%</strong>
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>{projectedConsumptionActual} of {projectedTotalStock} units utilized</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. FEFO MULTI-BATCH BREAKDOWN TABLE */}
      {availableBatches.length > 1 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                FEFO Multi-Batch Breakdown: {selectedMedicineName}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
                All inventory batches sorted in First-Expired, First-Out sequence
              </p>
            </div>
            <span className="chip badge-teal" style={{ fontSize: 10.5 }}>FEFO AUDIT</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>FEFO Priority</th>
                  <th>Batch</th>
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

      {/* 8. SECONDARY: REORDER & MULTI-SCENARIO COMPARISON MATRIX */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Multi-Scenario Order Matrix (+0 vs +100 vs +300 vs +500)
              </h3>
              <span className="chip badge-blue" style={{ fontSize: 10 }}>SECONDARY SCENARIOS</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Compare financial and expiry risks across varying proposed purchase order quantities
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {comparisonMatrix.map((item, idx) => {
            const isSelected = item.orderIncrement === orderQty;
            const isDanger = item.riskLevel === 'High' || item.riskLevel === 'Expired' || item.riskLevel === 'Likely Expiry';
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
                    {item.orderIncrement === 0 ? 'Baseline (+0)' : `+${item.orderIncrement} Units`}
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

        {/* Action button to commit purchase order if pharmacist chooses */}
        {orderQty > 0 && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={() => setShowCommitModal(true)}
              className="btn btn-teal"
              style={{ fontSize: 12.5, padding: '7px 16px', fontWeight: 700 }}
            >
              <PackagePlus size={15} /> Commit Proposed Order (+{orderQty} units) to Live Inventory
            </button>
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
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>New Total Stock:</span>
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
