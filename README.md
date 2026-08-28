# PharmaFlow – Intelligent Pharmacy Management & Clinical Safety System 💊

[![React](https://img.shields.io/badge/React-18.3-blue.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)]()

**PharmaFlow** is a modern, responsive web application engineered for modern retail pharmacies and healthcare dispensaries. It combines **First-Expiry-First-Out (FEFO)** inventory tracking, interactive **QR/Barcode scanning**, **AI distributor invoice OCR extraction**, **What-If waste simulation**, and rapid **quarantine safety recall broadcasts**.

---

## 🌟 Key Highlights & Feature Matrix

| Module | Key Capabilities |
| :--- | :--- |
| 📊 **Dashboard & Metrics** | Real-time stock valuation, critical expiry warnings, daily dispensing targets, and operational insights at a glance. |
| 📦 **FEFO Inventory & Expiry** | Earliest-expiry-first batch prioritisation, automated risk categorisation (Safe, Watch, High Risk, Recalled), live search, row editing, and CSV data exports. |
| 📷 **Barcode & QR Scanner** | Interactive in-browser barcode scanner with animated laser beam, flashlight toggle, quick test presets, and custom barcode lookup. |
| 🧾 **Distributor Invoice OCR** | AI-driven distributor purchase bill importer that extracts line items, batch numbers, unit rates, and expiry dates directly into inventory. |
| 💊 **Dispensing & Tax Invoices** | Stock-validated dispensing workflow with auto-generated GST tax receipts, customer allergy checking, and 100% traceable audit trail logging. |
| ⚠️ **Batch Recall & Safety** | Rapid batch quarantine locking (`AMX204`) and instant SMS / WhatsApp safety alert dispatch simulation to affected patients. |
| 🤖 **AI Assistant & What-If Simulator** | Dynamic order quantity and waste simulator calculating surplus financial risk, optimal reorder sizes, and live inventory replenishment. |
| 👥 **Customer & Supplier CRM** | Complete customer profiles with dispense history, known drug allergies, refill reminders, and supplier return workflows. |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `yarn` or `pnpm`

### Installation & Local Setup

```bash
# Clone repository
git clone https://github.com/deepan-sukumar/Pharmacy.git

# Navigate into project directory
cd Pharmacy

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will start immediately at `http://localhost:5173/`.

### Production Build

```bash
# Compile TypeScript & bundle production assets
npm run build

# Preview production build locally
npm run preview
```

---

## 🏗️ Architecture & Project Structure

```
d:/pharm/
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated GitHub Actions CI pipeline
├── src/
│   ├── types/
│   │   └── pharmacy.ts          # Centralized TypeScript models
│   ├── utils/
│   │   ├── csvExporter.ts       # Browser-side CSV generation & download engine
│   │   ├── expiryEngine.ts      # FEFO sorting & risk scoring algorithms
│   │   └── barcodeParser.ts     # Barcode & GS1-128 payload decoder
│   ├── App.tsx                  # Main application router (Landing / Auth / Portal)
│   ├── PharmacistPortal.tsx     # Pharmacist Workspace with all 14 interactive modules
│   ├── Landing.tsx              # Clean landing page showcase
│   ├── Auth.tsx                 # Login & Registration authentication workflows
│   ├── data.ts                  # Mock data for medicines, batches, and suppliers
│   ├── index.css                # Custom CSS design system & micro-animations
│   └── main.tsx                 # React DOM entrypoint
├── index.html                   # HTML5 template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite bundler configuration
```

---

## 🛡️ Clinical Safety & Compliance

- **FEFO Enforcement**: Dispensing automatically selects the earliest expiring batch to prevent expired drug distribution.
- **Quarantine Locking**: Any batch marked as recalled is blocked immediately from the dispensing dropdown.
- **Patient Allergy Cross-Reference**: Highlights customer drug allergies before confirming medication fulfillment.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
