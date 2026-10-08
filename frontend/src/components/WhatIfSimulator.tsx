import React, { useState, useEffect, useMemo } from 'react';
import type { Medicine } from '../data';
import {
  RefreshCw, Clock3, BrainCircuit, CheckCircle2,
  PackagePlus, Sparkles, Info, Boxes, X,
  Search, Calendar, HelpCircle
} from 'lucide-react';
import { api } from '../services/api';

interface WhatIfSimulatorProps {
  inventory: Medicine[];
  setInventory: React.Dispatch<React.SetStateAction<Medicine[]>>;
  showToast: (msg: string) => void;
}

interface ScenarioComparisonItem {
  orderIncrement: number;
  orderQty: number;
  projectedStock: number;
  expectedConsumption: number;
  projectedConsumption: number;
  projectedSurplus: number;
  surplusAtExpiry: number;
  potentialShortage: number;
  capitalAtRisk: number;
  expiryCapitalAtRisk: number;
  wasteCost: number;
  stockoutExposure: number;
  daysUntilStockout: number | null;
  estimatedStockoutDate: string | null;
  utilizationPct: number;
  stockUtilizationPct: number;
  riskLevel: string;
  riskLabel: string;
  riskClassification: string;
  explanation: string;
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
  riskLabel?: string;
  isCurrentSelected?: boolean;
}

// Formats an integer day offset from today into an Indian standard calendar date string
function formatFutureCalendarDate(daysFromNow: number | null | undefined): string | null {
  if (daysFromNow === null || daysFromNow === undefined || isNaN(daysFromNow)) return null;
  const d = new Date();
  d.setDate(d.getDate() + Math.round(daysFromNow));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * CLIENT-SIDE DETERMINISTIC ENGINE MIRROR
 * Identical mathematical formulas to backend simulationService.js.
 */
function runClientDeterministicSimulation(params: {
  medicine: string;
  batch: string;
  currentStock: number;
  orderQty: number;
  dailyUsage: number;
  daysToExpiry: number;
  unitCost: number;
  leadTimeDays: number;
  holdBatch: boolean;
  quarantineDays?: number;
  demandChangePct: number;
}) {
  const medicine = params.medicine || 'Selected Medicine';
  const batch = params.batch || 'Default Batch';
  const currentStock = Math.max(0, Number(params.currentStock) || 0);
  const orderQty = Math.max(0, Number(params.orderQty) || 0);
  const baseDailyUsage = Math.max(0, Number(params.dailyUsage) || 0);
  const daysToExpiry = Number(params.daysToExpiry) !== undefined && !isNaN(Number(params.daysToExpiry)) ? Number(params.daysToExpiry) : 45;
  const leadTimeDays = Math.max(0, Number(params.leadTimeDays) || 0);
  const unitCost = Math.max(0, Number(params.unitCost) || 50);
  
  let quarantineDays = 0;
  if (params.quarantineDays !== undefined && !isNaN(Number(params.quarantineDays))) {
    quarantineDays = Math.max(0, Number(params.quarantineDays));
  } else if (params.holdBatch) {
    quarantineDays = 999999;
  }
  const isHold = quarantineDays > 0 || Boolean(params.holdBatch);

  const demandChangePct = Number(params.demandChangePct) || 0;
  const demandMultiplier = 1 + (demandChangePct / 100);
  const normalScenarioVelocity = Math.max(0, baseDailyUsage * demandMultiplier);
  const simulatedDailyDemand = (quarantineDays > 0) ? 0 : normalScenarioVelocity;

  // 1. BASELINE PROJECTION
  const baselineDaysToExpiry = Math.max(0, daysToExpiry);
  const baselineDemandBeforeExpiry = Math.round(baseDailyUsage * baselineDaysToExpiry);
  const baselineProjectedUsableConsumption = Math.min(currentStock, baselineDemandBeforeExpiry);
  const baselineExpectedConsumption = baselineProjectedUsableConsumption;
  const baselineProjectedSurplus = Math.max(0, currentStock - baselineDemandBeforeExpiry);
  const baselineCapitalAtRisk = baselineProjectedSurplus * unitCost;
  const baselineShortage = Math.max(0, baselineDemandBeforeExpiry - currentStock);
  const baselineStockoutDays = baseDailyUsage > 0
    ? Math.floor(currentStock / baseDailyUsage)
    : null;
  const baselineStockoutDate = baselineStockoutDays !== null
    ? formatFutureCalendarDate(baselineStockoutDays)
    : null;
  const baselineUtilizationPct = currentStock > 0
    ? Math.min(100, Math.round((baselineProjectedUsableConsumption / currentStock) * 100))
    : 100;

  let baselineRiskLevel = 'Low Risk';
  let baselineRiskLabel = 'LOW RISK';
  let baselineExplanation = '';

  if (daysToExpiry <= 0) {
    baselineRiskLevel = 'Expired';
    baselineRiskLabel = 'EXPIRED';
    baselineExplanation = `Batch has passed its expiration date with ${currentStock} units remaining unsold. Immediate quarantine required.`;
  } else if (baselineProjectedSurplus > currentStock * 0.5 && baselineProjectedSurplus >= 30) {
    baselineRiskLevel = 'Likely Expiry';
    baselineRiskLabel = 'HIGH EXPIRY RISK';
    baselineExplanation = `At current dispensing velocity (${baseDailyUsage.toFixed(1)}/day), ${baselineExpectedConsumption} of ${currentStock} units are projected to be consumed over ${daysToExpiry} days, leaving ${baselineProjectedSurplus} units (${formatINR(baselineCapitalAtRisk)}) to expire unused.`;
  } else if (baselineProjectedSurplus > currentStock * 0.2 || baselineProjectedSurplus >= 15) {
    baselineRiskLevel = 'High';
    baselineRiskLabel = 'HIGH EXPIRY RISK';
    baselineExplanation = `Dispensing velocity of ${baseDailyUsage.toFixed(1)} units/day is insufficient to consume all ${currentStock} units within ${daysToExpiry} days. ${baselineProjectedSurplus} units (${formatINR(baselineCapitalAtRisk)}) projected to expire unused.`;
  } else if (baselineProjectedSurplus > 0 || (daysToExpiry <= 15 && currentStock > baselineExpectedConsumption * 0.8)) {
    baselineRiskLevel = 'Medium';
    baselineRiskLabel = 'MODERATE RISK';
    baselineExplanation = `Moderate surplus of ${baselineProjectedSurplus} units (${formatINR(baselineCapitalAtRisk)}) projected at expiry date under current velocity.`;
  } else if (baselineShortage > 0) {
    baselineRiskLevel = 'Shortage';
    baselineRiskLabel = 'STOCKOUT RISK';
    baselineExplanation = `Projected demand (${baselineDemandBeforeExpiry} units) will deplete current stock (${currentStock} units) in ~${baselineStockoutDays} days (est. ${baselineStockoutDate}), prior to batch expiry.`;
  } else {
    baselineRiskLevel = 'Safe';
    baselineRiskLabel = 'LOW RISK';
    baselineExplanation = `Current stock (${currentStock} units) is projected to be fully consumed within ~${Math.min(daysToExpiry, baselineStockoutDays || daysToExpiry)} days, well before the batch expiry date.`;
  }

  // 2. TIME-BASED WHAT-IF PROJECTION
  const projectedTotalStock = currentStock + orderQty;
  const effectiveLeadTime = Math.min(daysToExpiry > 0 ? daysToExpiry : 0, leadTimeDays);

  const activeLeadDays = Math.max(0, effectiveLeadTime - quarantineDays);
  const leadDemand = normalScenarioVelocity * activeLeadDays;
  const consumptionInLead = Math.min(currentStock, leadDemand);
  const stockRemainingBeforeArrival = Math.max(0, currentStock - leadDemand);
  const leadShortage = Math.max(0, leadDemand - currentStock);

  const orderArrivesBeforeExpiry = orderQty > 0 && leadTimeDays < daysToExpiry;
  const availableAfterArrival = stockRemainingBeforeArrival + (orderArrivesBeforeExpiry ? orderQty : 0);

  const activePostArrivalDays = Math.max(0, daysToExpiry - Math.max(effectiveLeadTime, quarantineDays));
  const postDemand = normalScenarioVelocity * activePostArrivalDays;
  const consumptionPostArrival = Math.min(availableAfterArrival, postDemand);
  const postShortage = Math.max(0, postDemand - availableAfterArrival);

  const effectiveWindowDays = Math.max(0, daysToExpiry - leadTimeDays);
  const totalProjectedDemandInWindow = Math.round(leadDemand + postDemand);
  const projectedConsumptionActual = Math.round(consumptionInLead + consumptionPostArrival);
  
  let projectedSurplusAtExpiry = 0;
  if (daysToExpiry <= 0) {
    projectedSurplusAtExpiry = currentStock;
  } else if (isHold && quarantineDays >= 999999) {
    projectedSurplusAtExpiry = projectedTotalStock;
  } else {
    projectedSurplusAtExpiry = Math.max(0, availableAfterArrival - postDemand);
  }
  const potentialShortage = Math.round(leadShortage + postShortage);

  const expiryCapitalAtRisk = projectedSurplusAtExpiry * unitCost;
  const stockoutExposure = potentialShortage * unitCost;
  const orderValue = orderQty * unitCost;

  const stockUtilizationPct = projectedTotalStock > 0
    ? Math.min(100, Math.max(0, Math.round((projectedConsumptionActual / projectedTotalStock) * 100)))
    : 100;

  let daysUntilStockout: number | null = null;
  let estimatedStockoutDate: string | null = null;

  if (normalScenarioVelocity > 0 && !isHold) {
    const t1 = currentStock / normalScenarioVelocity;
    if (orderQty === 0) {
      daysUntilStockout = Math.floor(t1);
    } else {
      if (leadTimeDays >= t1) {
        daysUntilStockout = Math.floor(t1);
      } else {
        const totalDuration = projectedTotalStock / normalScenarioVelocity;
        daysUntilStockout = Math.floor(totalDuration);
      }
    }
    estimatedStockoutDate = formatFutureCalendarDate(daysUntilStockout);
  } else if (isHold && quarantineDays < 999999 && normalScenarioVelocity > 0) {
    const t1 = quarantineDays + (currentStock / normalScenarioVelocity);
    if (orderQty === 0) {
      daysUntilStockout = Math.floor(t1);
    } else {
      if (leadTimeDays >= t1) {
        daysUntilStockout = Math.floor(t1);
      } else {
        const totalDuration = quarantineDays + (projectedTotalStock / normalScenarioVelocity);
        daysUntilStockout = Math.floor(totalDuration);
      }
    }
    estimatedStockoutDate = formatFutureCalendarDate(daysUntilStockout);
  }

  // 3. RISK CLASSIFICATION & EXPLANATION
  let riskLevel = 'Safe';
  let riskLabel = 'LOW RISK';
  let explanation = '';
  let recommendation = '';

  if (daysToExpiry <= 0) {
    riskLevel = 'Expired';
    riskLabel = 'EXPIRED';
    explanation = `Batch has expired with ${currentStock} units remaining unsold in inventory.`;
    recommendation = `⚠️ Quarantine remaining ${currentStock} units immediately and process supplier return. Do not dispense.`;
  } else if (isHold && quarantineDays >= 999999) {
    riskLevel = 'High';
    riskLabel = 'HIGH EXPIRY RISK (QUARANTINED)';
    explanation = `Batch is placed under quarantine hold, reducing dispensing velocity to 0 units/day. All ${projectedTotalStock} units will remain in storage until expiry.`;
    recommendation = `⚠️ Holding this batch stops dispensing velocity. All ${projectedTotalStock} units (${formatINR(expiryCapitalAtRisk)}) are projected to expire unused unless cleared for dispensing or returned.`;
  } else if (quarantineDays > 0) {
    riskLevel = 'Medium';
    riskLabel = 'MODERATE RISK (HOLD ACTIVE)';
    explanation = `Batch is held for ${quarantineDays} days (0 dispensing during hold). Normal dispensing (${normalScenarioVelocity.toFixed(1)}/day) resumes thereafter. Projected consumption before expiry is ${projectedConsumptionActual} units.`;
    recommendation = `Review quarantine release schedule to ensure stock is returned to active dispensing before expiry.`;
  } else if (projectedSurplusAtExpiry > projectedTotalStock * 0.5 && projectedSurplusAtExpiry >= 30) {
    riskLevel = 'High';
    riskLabel = 'HIGH EXPIRY RISK (SUBSTANTIAL WASTAGE)';
    const optimalOrder = Math.max(0, totalProjectedDemandInWindow - currentStock);
    explanation = `At simulated demand of ${normalScenarioVelocity.toFixed(1)} units/day, expected consumption across the remaining ${daysToExpiry} days is ${totalProjectedDemandInWindow} units. With total stock of ${projectedTotalStock} units, ${projectedSurplusAtExpiry} units (${formatINR(expiryCapitalAtRisk)}) will remain unsold at expiry.`;
    recommendation = `🔴 Substantial Expiry Risk: Projected surplus of ${projectedSurplusAtExpiry} units (${formatINR(expiryCapitalAtRisk)}). ${orderQty > 0 ? `Cancel/reduce proposed reorder to ~${optimalOrder} units.` : 'Prioritize front-of-shelf FEFO dispensing immediately.'}`;
  } else if (projectedSurplusAtExpiry > projectedTotalStock * 0.25 || projectedSurplusAtExpiry >= 15) {
    riskLevel = 'High';
    riskLabel = 'HIGH EXPIRY RISK';
    const optimalOrder = Math.max(0, totalProjectedDemandInWindow - currentStock);
    explanation = `At simulated demand of ${normalScenarioVelocity.toFixed(1)} units/day, expected consumption across ${daysToExpiry} days is ${totalProjectedDemandInWindow} units. Total stock of ${projectedTotalStock} units creates a projected surplus of ${projectedSurplusAtExpiry} units.`;
    recommendation = `⚠️ High Expiry Risk: Projected surplus of ${projectedSurplusAtExpiry} units (${formatINR(expiryCapitalAtRisk)}) expiring unsold. ${orderQty > 0 ? `Reduce proposed reorder to ~${optimalOrder} units.` : 'Maintain strict FEFO dispensing priority.'}`;
  } else if (projectedSurplusAtExpiry > 0) {
    riskLevel = 'Medium';
    riskLabel = 'MODERATE RISK (SURPLUS)';
    explanation = `Moderate surplus of ${projectedSurplusAtExpiry} units (${formatINR(expiryCapitalAtRisk)}) projected at expiry date under simulated velocity (${normalScenarioVelocity.toFixed(1)}/day).`;
    recommendation = `⚠️ Moderate Surplus: Projected surplus of ${projectedSurplusAtExpiry} units at expiry (${formatINR(expiryCapitalAtRisk)}). Maintain strict FEFO dispensing priority.`;
  } else if (potentialShortage > 0) {
    riskLevel = 'Shortage';
    riskLabel = 'STOCKOUT RISK';
    if (leadShortage > 0 && leadTimeDays > 0) {
      explanation = `Lead-time gap: Initial stock (${currentStock} units) will run out in ~${Math.floor(currentStock / normalScenarioVelocity)} days before replenishment arrives on day ${leadTimeDays}, causing ${leadShortage} units of unmet demand during lead time.`;
      recommendation = `📦 Lead-Time Shortage: Request expedited supplier dispatch or reallocate ${leadShortage} units from sibling batches to prevent stockout before order arrival.`;
    } else {
      explanation = `Projected demand (${totalProjectedDemandInWindow} units) exceeds total stock (${projectedTotalStock} units). Stockout expected in ~${daysUntilStockout} days (est. ${estimatedStockoutDate}), prior to batch expiry.`;
      recommendation = `📦 Shortage Warning: Projected demand (${totalProjectedDemandInWindow} units) exceeds stock (${projectedTotalStock} units). Projected shortage of ${potentialShortage} units before batch expiry. Consider reordering +${potentialShortage} units.`;
    }
  } else {
    riskLevel = 'Safe';
    riskLabel = 'LOW RISK (OPTIMAL BALANCE)';
    explanation = `Simulated demand of ${normalScenarioVelocity.toFixed(1)} units/day will fully consume available stock (${projectedTotalStock} units) in ~${Math.min(daysToExpiry, daysUntilStockout || daysToExpiry)} days, safely prior to the batch expiry date (${daysToExpiry} days away).`;
    recommendation = `✅ Optimal Scenario: ${projectedTotalStock} units are projected to be fully consumed within ~${Math.min(daysToExpiry, daysUntilStockout || daysToExpiry)} days prior to expiry date. Zero capital at risk of expiration.`;
  }

  if (leadTimeDays > 0 && orderQty > 0 && daysToExpiry > 0) {
    if (leadTimeDays >= daysToExpiry) {
      explanation += ` Note: Supplier lead time (${leadTimeDays} days) exceeds batch expiry (${daysToExpiry} days). Incoming order will arrive after this batch has expired.`;
    } else {
      explanation += ` (${orderQty} additional units arrive on day ${leadTimeDays}; ${Math.round(leadDemand)} units projected to be consumed during lead time, leaving ${stockRemainingBeforeArrival} units before arrival).`;
    }
  }

  return {
    medicine,
    batch,
    actualData: {
      currentStock,
      unitCost,
      dailyUsage: baseDailyUsage,
      daysToExpiry,
      baselineExpectedDemand,
      baselineExpectedConsumption,
      baselineProjectedUsableConsumption,
      baselineProjectedSurplus,
      baselineCapitalAtRisk,
      baselineShortage,
      baselineStockoutDays,
      baselineStockoutDate,
      baselineUtilizationPct,
      baselineRiskLevel,
      baselineRiskLabel,
      baselineExplanation,
    },
    simulatedData: {
      orderQty,
      orderQuantity: orderQty,
      leadTimeDays,
      supplierLeadTimeDays: leadTimeDays,
      holdBatch: isHold,
      quarantineDays,
      demandChangePct,
      dispensingIncreasePct: demandChangePct,
      simulatedDailyDemand: normalScenarioVelocity,
      projectedTotalStock,
      effectiveWindowDays,
      projectedDemandInWindow: totalProjectedDemandInWindow,
      projectedDemand: totalProjectedDemandInWindow,
      projectedConsumptionActual,
      projectedConsumption: projectedConsumptionActual,
      projectedSurplusAtExpiry,
      projectedSurplus: projectedSurplusAtExpiry,
      projectedExpiryQuantity: projectedSurplusAtExpiry,
      potentialShortage,
      capitalAtRisk: expiryCapitalAtRisk,
      expiryCapitalAtRisk,
      potentialWasteCost: expiryCapitalAtRisk,
      stockoutExposure,
      orderValue,
      daysUntilStockout,
      projectedStockoutDays: daysUntilStockout,
      estimatedStockoutDate,
      projectedStockoutDate: estimatedStockoutDate,
      stockUtilizationPct,
      stockUtilization: stockUtilizationPct,
      riskLevel,
      riskLabel,
      riskClassification: riskLabel,
      explanation,
      recommendation,
    }
  };
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

  // Commit Modal State
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
    'What if the supplier takes 10 days?',
    'What happens if I reorder 100 units?',
  ];

  // Initialize selected medicine from inventory
  useEffect(() => {
    if (uniqueMedicines.length > 0 && !selectedMedicineName) {
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

  // Fetch backend velocity provenance & audits
  useEffect(() => {
    let isMounted = true;
    async function fetchProvenance() {
      try {
        const res = await api.simulateScenario({
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

        if (isMounted && res) {
          if (res.demandProvenance) setDemandProvenance(res.demandProvenance);
          if (res.hasSufficientData !== undefined) setHasSufficientData(res.hasSufficientData);
          if (res.confidence) setConfidence(res.confidence);
          if (res.actualData?.dailyUsage !== undefined && baseDailyUsage === 5) {
            setBaseDailyUsage(res.actualData.dailyUsage);
          }
        }
      } catch (err) {
        console.error('Failed to sync backend simulation:', err);
      }
    }

    fetchProvenance();
    return () => { isMounted = false; };
  }, [selectedMedicineName, selectedBatchCode]);

  // =========================================================================
  // SINGLE AUTHORITATIVE DETERMINISTIC CALCULATION FOR SELECTED SCENARIO
  // =========================================================================
  const activeScenarioResult = useMemo(() => {
    return runClientDeterministicSimulation({
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

  const act = activeScenarioResult.actualData;
  const sim = activeScenarioResult.simulatedData;

  // =========================================================================
  // ORDER MATRIX (+0, +100, +300, +500) DRIVEN BY SAME DETERMINISTIC ENGINE
  // =========================================================================
  const comparisonMatrix: ScenarioComparisonItem[] = useMemo(() => {
    const increments = [0, 100, 300, 500];
    return increments.map(qty => {
      const res = runClientDeterministicSimulation({
        medicine: selectedMedicineName,
        batch: selectedBatchCode,
        currentStock,
        orderQty: qty,
        dailyUsage: baseDailyUsage,
        daysToExpiry,
        unitCost,
        leadTimeDays,
        holdBatch,
        demandChangePct,
      });
      const s = res.simulatedData;
      return {
        orderIncrement: qty,
        orderQty: qty,
        projectedStock: s.projectedTotalStock,
        expectedConsumption: s.projectedDemandInWindow,
        projectedConsumption: s.projectedConsumptionActual,
        projectedSurplus: s.projectedSurplusAtExpiry,
        surplusAtExpiry: s.projectedSurplusAtExpiry,
        potentialShortage: s.potentialShortage,
        capitalAtRisk: s.expiryCapitalAtRisk,
        expiryCapitalAtRisk: s.expiryCapitalAtRisk,
        wasteCost: s.expiryCapitalAtRisk,
        stockoutExposure: s.stockoutExposure,
        daysUntilStockout: s.daysUntilStockout,
        estimatedStockoutDate: s.estimatedStockoutDate,
        utilizationPct: s.stockUtilizationPct,
        stockUtilizationPct: s.stockUtilizationPct,
        riskLevel: s.riskLevel,
        riskLabel: s.riskLabel,
        riskClassification: s.riskLabel,
        explanation: s.explanation,
        recommendation: s.recommendation
      };
    });
  }, [
    selectedMedicineName,
    selectedBatchCode,
    currentStock,
    baseDailyUsage,
    daysToExpiry,
    unitCost,
    leadTimeDays,
    holdBatch,
    demandChangePct
  ]);

  // Sibling Batches with FEFO Analysis
  const multiBatchList: BatchBreakdownItem[] = useMemo(() => {
    return availableBatches.map(b => {
      const bRes = runClientDeterministicSimulation({
        medicine: selectedMedicineName,
        batch: b.batch,
        currentStock: b.quantity,
        orderQty: 0,
        dailyUsage: baseDailyUsage,
        daysToExpiry: b.daysToExpiry,
        unitCost: b.unitPrice,
        leadTimeDays: 0,
        holdBatch: false,
        demandChangePct: 0,
      });
      return {
        ...b,
        projectedConsumption: bRes.simulatedData.projectedConsumptionActual,
        projectedSurplus: bRes.simulatedData.projectedSurplusAtExpiry,
        capitalAtRisk: bRes.simulatedData.expiryCapitalAtRisk,
        riskLevel: bRes.simulatedData.riskLevel,
        riskLabel: bRes.simulatedData.riskLabel,
        isCurrentSelected: b.batch === selectedBatchCode
      };
    });
  }, [availableBatches, selectedMedicineName, selectedBatchCode, baseDailyUsage]);

  // Handle Ask the Simulator
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
        showToast('Question evaluated using authoritative deterministic simulation.');
      }
    } catch (err: any) {
      console.error('Failed to ask question:', err);
      showToast(`Error: ${err.message || 'Simulation question failed.'}`);
    } finally {
      setIsAskingQuestion(false);
    }
  };

  // Reset to live Firestore baseline
  const handleResetToBaseline = () => {
    setDemandChangePct(0);
    setOrderQty(0);
    setLeadTimeDays(0);
    setHoldBatch(false);
    showToast('Simulator reset to actual live pharmacy baseline.');
  };

  // Commit proposed order to live Firestore inventory
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

  // Badge helpers
  const getBadgeClass = (level: string) => {
    if (level === 'Expired' || level === 'EXPIRED') return 'badge-dark';
    if (level === 'High' || level === 'Likely Expiry' || level === 'Shortage' || level.includes('EXPIRY') || level.includes('STOCKOUT')) return 'badge-red';
    if (level === 'Medium' || level.includes('MODERATE')) return 'badge-amber';
    return 'badge-green';
  };

  const currentExpiryBadge = useMemo(() => {
    if (daysToExpiry <= 0) return { label: 'Expired', cls: 'badge-dark' };
    if (daysToExpiry === 0) return { label: 'Expires Today', cls: 'badge-red' };
    if (daysToExpiry === 1) return { label: '1 Day Left', cls: 'badge-red' };
    if (daysToExpiry <= 10) return { label: `${daysToExpiry}d Left (Critical)`, cls: 'badge-red' };
    if (daysToExpiry <= 30) return { label: `${daysToExpiry}d Left (Near Expiry)`, cls: 'badge-amber' };
    return { label: `${daysToExpiry}d Left`, cls: 'badge-green' };
  }, [daysToExpiry]);

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
                PROJECTION SANDBOX · DETERMINISTIC · READ-ONLY
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '3px 0 0' }}>
              Predicts whether medicine batches will be consumed before expiry and tests hypothetical demand shifts, supplier delays, or reorders without altering live inventory.
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
            <RefreshCw size={13} /> Reset to Baseline
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
          {/* Medicine Selector */}
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
            <b>Dispensing Provenance:</b> {demandProvenance || 'Derived from historical tenant dispensing audit logs.'} ({confidence} confidence)
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
              onClick={() => {
                setDemandChangePct(-50);
                setOrderQty(0);
                setHoldBatch(false);
                showToast('Scenario: -50% Demand Slowdown');
              }}
              className={`btn ${demandChangePct === -50 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              -50% Demand
            </button>
            <button
              onClick={() => {
                setDemandChangePct(-30);
                setOrderQty(0);
                setHoldBatch(false);
                showToast('Scenario: -30% Demand Slowdown');
              }}
              className={`btn ${demandChangePct === -30 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              -30% Demand
            </button>
            <button
              onClick={handleResetToBaseline}
              className={`btn ${demandChangePct === 0 && orderQty === 0 && !holdBatch && leadTimeDays === 0 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              Baseline (0%)
            </button>
            <button
              onClick={() => {
                setDemandChangePct(20);
                setHoldBatch(false);
                showToast('Scenario: +20% Demand Surge');
              }}
              className={`btn ${demandChangePct === 20 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              +20% Demand
            </button>
            <button
              onClick={() => {
                setDemandChangePct(50);
                setHoldBatch(false);
                showToast('Scenario: +50% Demand Peak');
              }}
              className={`btn ${demandChangePct === 50 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              +50% Demand
            </button>
            <button
              onClick={() => {
                setHoldBatch(!holdBatch);
                showToast(holdBatch ? 'Quarantine Lifted' : 'Batch Quarantined (0 Dispensing)');
              }}
              className={`btn ${holdBatch ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              {holdBatch ? 'Release Hold' : 'Hold Batch'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {/* Demand Change % Slider */}
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
              <span>0% Baseline ({baseDailyUsage.toFixed(1)}/d)</span>
              <span>+150%</span>
            </div>
          </div>

          {/* Additional Reorder Qty */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="label" style={{ marginBottom: 0 }}>Proposed Reorder Quantity</label>
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
              <label className="label" style={{ marginBottom: 0 }}>Supplier Lead Time (Days)</label>
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

      {/* 6. SIDE-BY-SIDE BASELINE vs WHAT-IF PROJECTION */}
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
                  Expected outcome under current dispensing behaviour
                </p>
              </div>
              <span className={`chip ${getBadgeClass(act.baselineRiskLevel)}`} style={{ fontSize: 11, fontWeight: 700 }}>
                {act.baselineRiskLabel}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Batch Stock:</span>
                <b>{act.currentStock} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Days to Expiry:</span>
                <b>{act.daysToExpiry} days ({expiryDateStr})</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Dispensing Velocity:</span>
                <b>{act.dailyUsage.toFixed(1)} units / day</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Consumption Before Expiry:</span>
                <b>{act.baselineProjectedUsableConsumption} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Expiry Wastage:</span>
                <b style={{ color: act.baselineProjectedSurplus > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  {act.baselineProjectedSurplus} units
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Expiry Capital at Risk:</span>
                <b style={{ color: act.baselineProjectedSurplus > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  {formatINR(act.baselineCapitalAtRisk)}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Estimated Stockout Date:</span>
                <b style={{ color: act.baselineShortage > 0 ? '#F59E0B' : 'var(--text)' }}>
                  {act.baselineStockoutDate ? `${act.baselineStockoutDate} (~${act.baselineStockoutDays}d)` : 'No Stockout Before Expiry'}
                </b>
              </div>
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
            <b>Baseline Trend:</b> {act.baselineProjectedSurplus === 0 ? 'Stock is projected to be fully consumed before expiry.' : `${act.baselineProjectedSurplus} units projected to remain unused at expiry.`}
          </div>
        </div>

        {/* WHAT-IF SCENARIO CARD */}
        <div
          className="card"
          style={{
            padding: 20,
            borderLeft: `4px solid ${sim.riskLevel === 'Safe' ? 'var(--success)' : sim.riskLevel === 'Medium' ? 'var(--warning)' : 'var(--danger)'}`,
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
              <span className={`chip ${getBadgeClass(sim.riskLevel)}`} style={{ fontSize: 11, fontWeight: 700 }}>
                {sim.riskLabel}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Simulated Available Stock:</span>
                <b>{sim.projectedTotalStock} units {orderQty > 0 ? `(+${orderQty} order)` : ''}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Supplier Lead Time:</span>
                <b>{leadTimeDays} days delay {leadTimeDays > 0 ? `(Arrival: Day ${leadTimeDays})` : '(Immediate)'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Simulated Velocity:</span>
                <b style={{ color: demandChangePct !== 0 ? 'var(--primary)' : 'var(--text)' }}>
                  {sim.simulatedDailyDemand.toFixed(1)} units / day {demandChangePct !== 0 ? `(${demandChangePct > 0 ? '+' : ''}${demandChangePct}%)` : ''}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Scenario Consumption:</span>
                <b>{sim.projectedConsumptionActual} units</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Projected Expiry Wastage:</span>
                <b style={{ color: sim.projectedSurplusAtExpiry > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  {sim.projectedSurplusAtExpiry} units
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Expiry Capital at Risk:</span>
                <b style={{ color: sim.projectedSurplusAtExpiry > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 14 }}>
                  {formatINR(sim.expiryCapitalAtRisk)}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Estimated Stockout Date:</span>
                <b style={{ color: sim.potentialShortage > 0 ? '#F59E0B' : 'var(--text)' }}>
                  {sim.estimatedStockoutDate ? `${sim.estimatedStockoutDate} (~${sim.daysUntilStockout}d)` : 'No Stockout Projected'}
                </b>
              </div>
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
            <b>Scenario Shift:</b> {sim.projectedSurplusAtExpiry !== act.baselineProjectedSurplus ? `Wastage changes from ${act.baselineProjectedSurplus} → ${sim.projectedSurplusAtExpiry} units (Δ ${sim.projectedSurplusAtExpiry - act.baselineProjectedSurplus > 0 ? '+' : ''}${sim.projectedSurplusAtExpiry - act.baselineProjectedSurplus} units).` : 'Wastage matches baseline.'}
          </div>
        </div>
      </div>

      {/* 7. PHARMACIST DECISION SUPPORT & RISK ANALYSIS */}
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
              Deterministic numerical analysis of risk drivers & recommended actions for selected scenario (+{orderQty} units)
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
              {sim.explanation}
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
              {sim.recommendation}
            </p>
          </div>

          {/* Financial Breakdown Cards */}
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
              <strong style={{ fontSize: 16, color: 'var(--danger)' }}>{formatINR(sim.expiryCapitalAtRisk)}</strong>
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>
                {sim.projectedSurplusAtExpiry} units potentially unused at unit cost ₹{unitCost}
              </span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700, display: 'block' }}>Estimated Stockout Exposure</span>
              <strong style={{ fontSize: 16, color: '#D97706' }}>
                {sim.potentialShortage > 0 ? formatINR(sim.stockoutExposure) : '₹0'}
              </strong>
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>
                {sim.potentialShortage} units unsatisfied demand
              </span>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, display: 'block' }}>Stock Utilization</span>
              <strong style={{ fontSize: 16, color: 'var(--primary)' }}>{sim.stockUtilizationPct}%</strong>
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>
                {sim.projectedConsumptionActual} of {sim.projectedTotalStock} units utilized
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 8. FEFO MULTI-BATCH BREAKDOWN TABLE */}
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
                {multiBatchList.map((b, idx) => {
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

      {/* 9. REORDER & MULTI-SCENARIO COMPARISON MATRIX (+0, +100, +300, +500) */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Multi-Scenario Order Matrix (+0 vs +100 vs +300 vs +500)
              </h3>
              <span className="chip badge-blue" style={{ fontSize: 10 }}>SYNCHRONIZED ENGINE</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>
              Compare stock availability, stockout timing, and expiry risks across varying purchase order quantities. Click any card to synchronize simulator views.
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
                    className={`chip ${getBadgeClass(item.riskLevel)}`}
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
                    <span>Projected Consumption:</span>
                    <b>{item.projectedConsumption} units</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Projected Expiry Wastage:</span>
                    <b style={{ color: isDanger ? 'var(--danger)' : item.projectedSurplus > 0 ? 'var(--warning)' : 'var(--text)' }}>
                      {item.projectedSurplus} units
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Expiry Capital at Risk:</span>
                    <b style={{ color: isDanger ? 'var(--danger)' : item.projectedSurplus > 0 ? 'var(--warning)' : 'var(--text)' }}>
                      {formatINR(item.expiryCapitalAtRisk)}
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stockout Date:</span>
                    <b>{item.estimatedStockoutDate ? `${item.estimatedStockoutDate} (~${item.daysUntilStockout}d)` : 'No Stockout'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stock Utilization:</span>
                    <b>{item.stockUtilizationPct}%</b>
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
                <b>{formatINR(orderQty * unitCost)}</b>
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
