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

function runTests() {
  console.log('\n🧪 Running Expiry Timeline Layout & Collision Engine Tests...\n');

  // Test 1: Date calculations relative to 2026-10-08
  console.log('--- TEST 1: Date Synchronization ---');
  const d1 = calculateDaysRemaining('2026-10-18', 'VD102', 'Available');
  assert.strictEqual(d1, 10, '2026-10-18 is exactly 10 days from 2026-10-08');
  console.log('  ✅ [PASS] 10-day expiry parsed correctly');

  const d2 = calculateDaysRemaining('2026-09-08', 'EXP001', 'Expired');
  assert.ok(d2 <= 0, 'Past date returns <= 0 days');
  console.log('  ✅ [PASS] Expired date returns <= 0');

  // Test 2: Left and Right Boundary Clamping
  console.log('--- TEST 2: Boundary Clamping ---');
  const leftItem = [{ batch: 'EXP01', medicine: 'Paracetamol', daysLeft: -10 }];
  const { results: leftRes } = assignTimelineLanes(leftItem, 900);
  assert.ok(leftRes[0].cardLeft >= 18, `Left card must not clip left border (got ${leftRes[0].cardLeft})`);
  console.log('  ✅ [PASS] Left edge strictly clamped >= 18px');

  const rightItem = [{ batch: 'SAFE01', medicine: 'Metformin', daysLeft: 300 }];
  const { results: rightRes } = assignTimelineLanes(rightItem, 900);
  assert.ok(rightRes[0].cardRight <= 900 - 18, `Right card must not clip right border (got ${rightRes[0].cardRight})`);
  console.log('  ✅ [PASS] Right edge strictly clamped <= containerWidth - 18px');

  // Test 3: Same-Date Batches Vertical Lane Separation
  console.log('--- TEST 3: Same-Date Batches Lane Separation ---');
  const sameDateBatches = [
    { batch: 'PAR1010', medicine: 'Paracetamol 500mg', daysLeft: 90 },
    { batch: 'PAR1011', medicine: 'Paracetamol 650mg', daysLeft: 90 },
    { batch: 'CLO1009', medicine: 'Clopidogrel 75mg', daysLeft: 90 },
    { batch: 'AMX204', medicine: 'Amoxicillin 500mg', daysLeft: 90 },
    { batch: 'AZI109', medicine: 'Azithromycin 500mg', daysLeft: 90 }
  ];

  const { results: sameDateRes, laneCount: sameDateLanes } = assignTimelineLanes(sameDateBatches, 900);
  assert.strictEqual(sameDateLanes, 5, `5 simultaneous batches at same date must occupy 5 distinct vertical lanes (got ${sameDateLanes})`);

  // Verify no 2 batches in the same lane overlap
  for (let i = 0; i < sameDateRes.length; i++) {
    for (let j = i + 1; j < sameDateRes.length; j++) {
      if (sameDateRes[i].laneIndex === sameDateRes[j].laneIndex) {
        assert.fail(`Batch ${sameDateRes[i].item.batch} and ${sameDateRes[j].item.batch} share the same lane ${sameDateRes[i].laneIndex}!`);
      }
    }
  }
  console.log('  ✅ [PASS] 5 identical-date batches allocated to 5 collision-free lanes');

  // Test 4: Dynamic Height Expansion
  console.log('--- TEST 4: Dynamic Height Adaptation ---');
  const { totalTimelineHeight: height3 } = assignTimelineLanes(sameDateBatches.slice(0, 2), 900);
  const { totalTimelineHeight: height5 } = assignTimelineLanes(sameDateBatches, 900);
  assert.ok(height5 > height3, `Timeline height must expand for more lanes (${height5} > ${height3})`);
  console.log(`  ✅ [PASS] Timeline height adapts dynamically (${height3}px -> ${height5}px)`);

  // Test 5: 20 Nearby Batches Collision-Free Test
  console.log('--- TEST 5: Large Cluster (20 Batches) Collision Test ---');
  const clusterBatches = [];
  for (let i = 0; i < 20; i++) {
    clusterBatches.push({
      batch: `BATCH-${1000 + i}`,
      medicine: `Medicine ${i + 1}`,
      daysLeft: 15 + Math.floor(i / 2) // tightly packed around days 15-25
    });
  }

  const { results: clusterRes } = assignTimelineLanes(clusterBatches, 900);
  // Verify pairwise that within every lane, no cards overlap
  const byLane = {};
  clusterRes.forEach(r => {
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
  console.log(`  ✅ [PASS] 20 clustered batches successfully placed across ${Object.keys(byLane).length} lanes without a single collision!`);

  console.log('\n🎉 ALL 5 TIMELINE LAYOUT TESTS PASSED!\n');
}

runTests();
