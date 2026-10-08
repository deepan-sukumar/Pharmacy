const assert = require('assert');

// Reference System Date: 2026-10-08
const SYSTEM_REF_DATE = new Date(2026, 9, 8);

function calculateDaysRemaining(expiryStr, medicineBatch, status, providedDays) {
  if (providedDays !== undefined && !isNaN(Number(providedDays))) {
    return Number(providedDays);
  }
  const normalizedStatus = String(status || '').toUpperCase();
  if (normalizedStatus === 'EXPIRED') return -5;
  if (!expiryStr) return 90;

  const trimmed = expiryStr.trim();
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const diffMs = parsed.getTime() - SYSTEM_REF_DATE.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  const months = {
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

function assignTimelineLanes(batches, containerWidth = 900) {
  const cardWidth = Math.min(210, Math.max(175, Math.floor(containerWidth * 0.22)));
  const cardHeight = 50;
  const cardGapX = 14;
  const cardGapY = 12;
  const paddingLeft = 18;
  const paddingRight = 18;
  const paddingTop = 32;
  const paddingBottom = 24;

  const availableTrackWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const maxScaleDays = 120;
  const markerY = 14;

  const lanes = [];
  const results = [];

  const sortedBatches = [...batches].sort((a, b) => {
    if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
    if (a.medicine !== b.medicine) return a.medicine.localeCompare(b.medicine);
    return a.batch.localeCompare(b.batch);
  });

  sortedBatches.forEach(item => {
    const ratio = item.daysLeft <= 0 ? 0 : Math.min(1, item.daysLeft / maxScaleDays);
    const markerX = paddingLeft + ratio * availableTrackWidth;

    let cardLeft = markerX - cardWidth / 2;
    const minLeft = paddingLeft;
    const maxLeft = containerWidth - cardWidth - paddingRight;
    cardLeft = Math.max(minLeft, Math.min(cardLeft, maxLeft));
    const cardRight = cardLeft + cardWidth;

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
  const totalTimelineHeight = Math.max(260, paddingTop + activeLanes * (cardHeight + cardGapY) + paddingBottom);

  return { results, totalTimelineHeight, laneCount: activeLanes };
}

function calculateBatchPriority(daysLeft, status) {
  const norm = String(status || '').toUpperCase();
  if (norm === 'RECALLED' || norm === 'QUARANTINED') return 1000;
  if (daysLeft <= 0 || norm === 'EXPIRED') return 950;
  if (daysLeft <= 10) return 900;
  if (daysLeft <= 30) return 800;
  if (daysLeft <= 90 || norm.includes('NEAR')) return 600;
  return 300;
}

function selectPriorityTimelineBatches(batches, maxItems = 12) {
  const enriched = batches.map(b => {
    const daysLeft = b.daysLeft !== undefined ? b.daysLeft : calculateDaysRemaining(b.expiry, b.batch, b.status);
    const priorityScore = calculateBatchPriority(daysLeft, b.status);
    return { ...b, daysLeft, priorityScore };
  });

  const riskBatches = enriched
    .filter(b => b.priorityScore >= 600)
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      if (a.medicine !== b.medicine) return a.medicine.localeCompare(b.medicine);
      return a.batch.localeCompare(b.batch);
    });

  const safeBatches = enriched
    .filter(b => b.priorityScore < 600)
    .sort((a, b) => {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      if (a.medicine !== b.medicine) return a.medicine.localeCompare(b.medicine);
      return a.batch.localeCompare(b.batch);
    });

  if (riskBatches.length >= maxItems) {
    return riskBatches.slice(0, maxItems);
  }

  const remainingSlots = maxItems - riskBatches.length;
  const safeSlotsToTake = Math.min(3, remainingSlots);
  const selectedSafe = safeBatches.slice(0, safeSlotsToTake);

  return [...riskBatches, ...selectedSafe];
}

function runTests() {
  console.log('\n🧪 Running Expiry Timeline Layout & Priority Optimization Tests...\n');

  // Test 1: Date calculations relative to 2026-10-08
  console.log('--- TEST 1: Date Synchronization ---');
  const d1 = calculateDaysRemaining('2026-10-18', 'VD102', 'Available');
  assert.strictEqual(d1, 10, '2026-10-18 is exactly 10 days from 2026-10-08');
  console.log('  ✅ [PASS] 10-day expiry parsed correctly');

  const d2 = calculateDaysRemaining('2026-09-08', 'EXP001', 'Expired');
  assert.ok(d2 <= 0, 'Past date returns <= 0 days');
  console.log('  ✅ [PASS] Expired date returns <= 0');

  // Test 2: Priority Scoring Hierarchy
  console.log('--- TEST 2: Deterministic Risk Priority Scoring ---');
  assert.strictEqual(calculateBatchPriority(200, 'Recalled'), 1000, 'Recalled batch must get highest priority 1000');
  assert.strictEqual(calculateBatchPriority(-5, 'Expired'), 950, 'Expired batch must get priority 950');
  assert.strictEqual(calculateBatchPriority(7, 'Action Due'), 900, '0-10 days must get priority 900');
  assert.strictEqual(calculateBatchPriority(25, 'Critical'), 800, '11-30 days must get priority 800');
  assert.strictEqual(calculateBatchPriority(75, 'Near Expiry'), 600, '31-90 days must get priority 600');
  assert.strictEqual(calculateBatchPriority(365, 'Safe'), 300, '91+ days safe stock gets priority 300');
  console.log('  ✅ [PASS] Priority hierarchy strictly enforced');

  // Test 3: 512 Batches Slicing to MAX_VISIBLE (12 cards)
  console.log('--- TEST 3: 512-Batch Priority Slicing ---');
  const full512Batches = [];
  // 5 expired, 3 recalled, 10 critical, 20 near-expiry, 474 safe batches
  for (let i = 0; i < 5; i++) full512Batches.push({ batch: `EXP-${i}`, medicine: `Expired Med ${i}`, daysLeft: -2, status: 'Expired' });
  for (let i = 0; i < 3; i++) full512Batches.push({ batch: `REC-${i}`, medicine: `Recalled Med ${i}`, daysLeft: 200, status: 'Recalled' });
  for (let i = 0; i < 10; i++) full512Batches.push({ batch: `CRIT-${i}`, medicine: `Critical Med ${i}`, daysLeft: 10 + i, status: 'Active' });
  for (let i = 0; i < 20; i++) full512Batches.push({ batch: `NEAR-${i}`, medicine: `Near Expiry Med ${i}`, daysLeft: 40 + i, status: 'Active' });
  for (let i = 0; i < 474; i++) full512Batches.push({ batch: `SAFE-${i}`, medicine: `Safe Med ${i}`, daysLeft: 300 + i, status: 'Active' });

  assert.strictEqual(full512Batches.length, 512, 'Master dataset contains 512 batches');
  const prioritySubset = selectPriorityTimelineBatches(full512Batches, 12);
  assert.strictEqual(prioritySubset.length, 12, 'Timeline must select exactly 12 batches');
  
  // Verify that all 3 recalled and 5 expired batches are present in the top 12
  const recalledInTop = prioritySubset.filter(b => b.status === 'Recalled').length;
  const expiredInTop = prioritySubset.filter(b => b.status === 'Expired').length;
  assert.strictEqual(recalledInTop, 3, 'All 3 recalled batches included in top 12');
  assert.strictEqual(expiredInTop, 5, 'All 5 expired batches included in top 12');
  // Safe batches (priorityScore === 300) should NOT be in top 12 when there are sufficient risk batches
  const safeInTop = prioritySubset.filter(b => b.priorityScore < 600).length;
  assert.strictEqual(safeInTop, 0, 'No safe batches crowd out risk batches');
  console.log('  ✅ [PASS] Top 12 priority selection correctly prioritizes high-risk over safe inventory');

  // Test 4: Representative Safe Batches when Low Risk
  console.log('--- TEST 4: Representative Safe Batches When Risk is Low ---');
  const lowRiskDataset = [
    { batch: 'NEAR-1', medicine: 'Near Med', daysLeft: 45, status: 'Active' },
    { batch: 'NEAR-2', medicine: 'Near Med 2', daysLeft: 60, status: 'Active' },
  ];
  for (let i = 0; i < 500; i++) {
    lowRiskDataset.push({ batch: `SAFE-${i}`, medicine: `Safe Med ${i}`, daysLeft: 150 + i, status: 'Active' });
  }
  const lowRiskSelected = selectPriorityTimelineBatches(lowRiskDataset, 12);
  assert.strictEqual(lowRiskSelected.length, 5, 'Must select 2 near-expiry + up to 3 representative safe batches = 5');
  console.log('  ✅ [PASS] Low risk dataset cleanly renders 5 items without overflowing with 500 cards');

  // Test 5: Left and Right Boundary Clamping & Collision-free Placement
  console.log('--- TEST 5: Boundary Clamping & Collision-Free Lanes ---');
  const { results: layoutRes, laneCount } = assignTimelineLanes(prioritySubset, 900);
  assert.strictEqual(layoutRes.length, 12, 'Connector & card layout strictly has 12 items (no 512 fan-out)');
  assert.ok(laneCount >= 3, `Lane count dynamically allocated (got ${laneCount})`);

  layoutRes.forEach(r => {
    assert.ok(r.cardLeft >= 18, 'Card left boundary clamped >= 18px');
    assert.ok(r.cardRight <= 900 - 18, 'Card right boundary clamped <= 882px');
  });

  // Verify pairwise that within every lane, no cards overlap
  const byLane = {};
  layoutRes.forEach(r => {
    if (!byLane[r.laneIndex]) byLane[r.laneIndex] = [];
    byLane[r.laneIndex].push(r);
  });

  for (const laneId in byLane) {
    const laneItems = byLane[laneId];
    laneItems.sort((a, b) => a.cardLeft - b.cardLeft);
    for (let k = 0; k < laneItems.length - 1; k++) {
      const current = laneItems[k];
      const next = laneItems[k + 1];
      assert.ok(
        current.cardRight + 14 <= next.cardLeft,
        `Lane ${laneId} overlap between ${current.item.batch} and ${next.item.batch}`
      );
    }
  }

  console.log('  ✅ [PASS] 12 priority items rendered with zero overlap and zero boundary clipping');

  console.log('\n🎉 ALL 5 TIMELINE TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests();

