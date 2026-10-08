# PHARMAFLOW DATA DICTIONARY

## Dataset ID: PHARMAFLOW-MASTER-DATASET-V1 (v1.0.0)

**Reference Date:** 2026-10-08 | **Workspace ID:** `pharmaflow-main` | **Pharmacist ID:** `PHARM-KA-2022-7212`

### Collection Schema & Target vs Actual Counts

| Collection | Primary Key | Actual Count | Target Count | Description |
|---|---|---|---|---|
| `medicines` | `medicineId` | **512** | 512 | Authoritative records for medicines |
| `manufacturers` | `manufacturerId` | **214** | 214 | Authoritative records for manufacturers |
| `batches` | `batcheId` | **328** | 328 | Authoritative records for batches |
| `recalls` | `recallId` | **115** | 115 | Authoritative records for recalls |
| `suppliers` | `supplierId` | **35** | 35 | Authoritative records for suppliers |
| `customers` | `customerId` | **150** | 150 | Authoritative records for customers |
| `pharmacists` | `pharmacistId` | **25** | 25 | Authoritative records for pharmacists |
| `inventory` | `inventoryId` | **512** | 512 | Authoritative records for inventory |
| `stockMovements` | `stockMovementId` | **2450** | 2450 | Authoritative records for stockMovements |
| `invoices` | `invoiceId` | **150** | 150 | Authoritative records for invoices |
| `invoiceItems` | `invoiceItemId` | **520** | 520 | Authoritative records for invoiceItems |
| `dispensing` | `dispensingId` | **2048** | 2048 | Authoritative records for dispensing |
| `dispensingAudit` | `dispensingAuditId` | **2048** | 2048 | Authoritative records for dispensingAudit |
| `batchExposures` | `batchExposureId` | **48** | 48 | Authoritative records for batchExposures |
| `patientSafetyCommunications` | `patientSafetyCommunicationId` | **250** | 250 | Authoritative records for patientSafetyCommunications |
| `supplierReturns` | `supplierReturnId` | **52** | 52 | Authoritative records for supplierReturns |
| `sources` | `sourceId` | **12** | 12 | Authoritative records for sources |

**Total Authoritative Records:** 9469
