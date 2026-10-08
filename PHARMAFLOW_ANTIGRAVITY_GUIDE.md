# PHARMAFLOW ANTIGRAVITY MASTER INTEGRATION GUIDE

## System Architecture
- **Backend Engine:** Node.js / Express with Firebase Admin SDK
- **Frontend:** React + TypeScript with deterministic simulation & FEFO
- **Tenant Isolation:** Scoped via `workspaceId: pharmaflow-main`
- **Authoritative Pharmacist:** Deepak R (`PHARM-KA-2022-7212`)
- **Deterministic What-If Simulator:** Identical formulas across client and backend
