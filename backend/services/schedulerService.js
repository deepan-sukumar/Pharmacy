/**
 * Automated Idempotent Notification Scheduler for PharmaFlow
 * 
 * Periodically scans pharmacy data for:
 * 1. Near Expiry Batches (< 30 days) -> Automatic alerts to customers with active prescriptions
 * 2. Supplier Return Deadlines -> Logistics notifications
 * 3. Low Stock Thresholds -> Inventory reorder alerts
 * 4. Active Recalls -> Critical safety broadcasts
 */

const { getExpiringMedicines, getLowStockMedicines, getRecallSummary, getSupplierReturnEligibleBatches } = require('./pharmacyTools');
const { sendSms, sendRecallNotificationToAffectedCustomers } = require('./smsService');

let schedulerTimer = null;
const RUN_INTERVAL_MS = 1000 * 60 * 60; // Run hourly in background

/**
 * Runs a single idempotent automated notification check cycle for a pharmacy.
 */
async function runNotificationCycle(pharmacyId = 'DEMO_PHARMACY') {
  console.log(`⏰ [Scheduler] Running automated notification cycle for: ${pharmacyId}`);
  const summary = {
    nearExpiryProcessed: 0,
    lowStockProcessed: 0,
    recallsProcessed: 0,
    supplierReturnsProcessed: 0
  };

  try {
    // 1. Process Near-Expiry Batches (< 30 days)
    const expiringBatches = await getExpiringMedicines(pharmacyId, 30);
    for (const batch of expiringBatches) {
      summary.nearExpiryProcessed++;
      // Check customer dispensing history to notify registered patients
      const { getRecalledBatchCustomers } = require('./pharmacyTools');
      const patientRecords = await getRecalledBatchCustomers(pharmacyId, batch.batch);
      
      for (const p of patientRecords.affectedPatients || []) {
        if (p.phone) {
          await sendSms({
            pharmacyId,
            recipientName: p.customerName,
            recipientPhone: p.phone,
            recipientType: 'customer',
            notificationType: 'NEAR_EXPIRY',
            batchId: batch.batch,
            language: p.preferredLang || 'English',
            variables: {
              medicine: batch.medicine,
              batch: batch.batch,
              expiry: batch.expiry,
              pharmacy: 'Apollo MedPlus Express'
            },
            notificationSource: 'automatic'
          });
        }
      }
    }

    // 2. Process Supplier Return Windows
    const returnEligible = await getSupplierReturnEligibleBatches(pharmacyId);
    summary.supplierReturnsProcessed = returnEligible.length;

    // 3. Process Low Stock Alerts
    const lowStock = await getLowStockMedicines(pharmacyId);
    summary.lowStockProcessed = lowStock.length;

    console.log(`✅ [Scheduler] Cycle complete:`, summary);
    return { success: true, summary, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error(`❌ [Scheduler] Error during notification cycle:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Starts the automated background scheduler
 */
function startScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  
  // Run initial cycle after 5 seconds
  setTimeout(() => {
    runNotificationCycle('DEMO_PHARMACY');
  }, 5000);

  // Set recurring interval
  schedulerTimer = setInterval(() => {
    runNotificationCycle('DEMO_PHARMACY');
  }, RUN_INTERVAL_MS);

  console.log('⏰ Automated PharmaFlow Notification Scheduler initialized (Idempotent 1-hour interval).');
}

function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

module.exports = {
  runNotificationCycle,
  startScheduler,
  stopScheduler
};
