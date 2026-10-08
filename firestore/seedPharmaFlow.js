/**
 * Safe, Idempotent Firestore Seeder for PHARMAFLOW-MASTER-DATASET-V1
 * Upserts all 17 collections for workspace pharmaflow-main without wiping Firestore.
 */
const fs = require('fs');
const path = require('path');
const { db } = require('../backend/firebase');

const DATASET_PATH = path.join(__dirname, '..', 'PHARMAFLOW_MASTER_DATASET_V1.json');

const ID_MAP = {
  medicines: 'medicineId',
  manufacturers: 'manufacturerId',
  batches: 'batchId',
  recalls: 'recallId',
  suppliers: 'supplierId',
  customers: 'customerId',
  pharmacists: 'pharmacistId',
  inventory: 'inventoryId',
  stockMovements: 'movementId',
  invoices: 'invoiceId',
  invoiceItems: 'invoiceItemId',
  dispensing: 'dispensingId',
  dispensingAudit: 'auditId',
  batchExposures: 'batchExposureId',
  patientSafetyCommunications: 'communicationId',
  supplierReturns: 'returnId',
  sources: 'sourceId'
};

async function seed() {
  console.log('Starting safe, idempotent Firestore seed for workspace: pharmaflow-main...');
  
  if (!fs.existsSync(DATASET_PATH)) {
    console.error('Dataset file not found:', DATASET_PATH);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  const collections = Object.keys(ID_MAP);

  for (const colName of collections) {
    const items = data[colName] || [];
    const idKey = ID_MAP[colName];
    console.log(`Writing ${items.length} records into collection: ${colName} (Key: ${idKey})...`);
    
    // Batch writes (max 400 per batch)
    const BATCH_SIZE = 400;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      
      for (const item of chunk) {
        const docId = String(item[idKey] || item.id || `${colName}_${i}`);
        const docRef = db.collection(colName).doc(docId);
        batch.set(docRef, { ...item, workspaceId: 'pharmaflow-main', updatedAt: new Date().toISOString() }, { merge: true });
      }
      
      await batch.commit();
    }
    console.log(`[OK] Completed ${colName}.`);
  }

  console.log('All 17 collections successfully upserted into Firestore for workspace: pharmaflow-main.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
