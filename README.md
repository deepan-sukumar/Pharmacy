# PharmaFlow – Intelligent Pharmacy Dispensing Audit, Expiry Tracking & Real SMS Management Portal 💊

[![React](https://img.shields.io/badge/React-18.3-blue.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-black.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firestore-Admin%20SDK-orange.svg?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%203.5%20Flash-blueviolet.svg?style=flat-square&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)]()

**PharmaFlow** is a full-stack clinical safety and pharmacy operations management portal engineered for modern retail pharmacies and healthcare dispensaries. It combines **First-Expiry-First-Out (FEFO)** inventory tracking, **Gemini 3.5 Flash AI Assistant** with controlled tools, **What-If Expiry Risk Simulator**, **Barcode/QR scanning**, and a unified **Real SMS Notification Hub** (Automatic Scheduled + Manual Pharmacist-Initiated).

---

## 🏛️ System Architecture & Technology Stack

PharmaFlow is architected with a strict **Frontend ↔ Backend separation of concerns** to guarantee maximum clinical security, tamper-proof audit trails, and isolation of sensitive credentials.

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                    │
│    UI Components · Dashboards · AI Chat · What-If Matrix    │
│            Manual SMS Composer · Delivery Reports           │
└──────────────────────────────┬──────────────────────────────┘
                               │  REST API (JSON / Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 NODE.JS / EXPRESS BACKEND                   │
│   Auth & Tenant Middleware · AI Safety Guard · Tools Engine │
│  What-If Simulation Logic · SMS Dispatcher & Idempotency    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   FIREBASE / FIRESTORE DB    │ │    EXTERNAL SERVICES       │
│ Inventory · Dispense Audits  │ │ • Gemini 3.5 Flash API     │
│ Customers · SMS Logs · Users │ │ • Carrier SMS REST Gateway │
└──────────────────────────────┘ └────────────────────────────┘
```

### Core Technology Stack

- **Frontend**: React.js 18, TypeScript, Vite, Vanilla CSS Design System, Lucide React Icons
- **Backend**: Node.js, Express.js REST API, Background Cron Scheduler
- **Database**: Google Cloud Firestore via Firebase Admin SDK
- **Authentication**: JWT-based tenant-isolated authentication & password hashing
- **AI Intelligence**: Google Gemini 3.5 Flash with deterministic safety guards & controlled tools
- **SMS Notifications**: DLT-compliant Indian REST SMS Engine (English, Tamil, Telugu, Kannada, Hindi)

---

## 📂 Project Structure & Folder Separation

PharmaFlow maintains a clean, transparent separation between client presentation and server-side business logic:

```
d:/pharm/
│
├── src/                                  # ─── FRONTEND (React + TypeScript) ───
│   ├── components/                       # Modular UI components
│   │   ├── AIAssistant.tsx               # AI Clinical & Operations chat interface
│   │   ├── WhatIfSimulator.tsx           # Multi-scenario order sizing simulator
│   │   ├── ManualSmsModal.tsx            # Pharmacist direct SMS composer modal
│   │   ├── SmsReportsView.tsx            # SMS transmission log & delivery tracker
│   │   ├── Charts.tsx                    # Expiry risk & stock movement visualizations
│   │   ├── ExpiryTimeline.tsx            # Visual FEFO batch shelf-life timeline
│   │   ├── Sidebar.tsx                   # Role-based collapsible navigation
│   │   ├── WorkspaceTabs.tsx             # Contextual tab bar for operational workspaces
│   │   └── ThemeContext.tsx              # Light / Dark mode theme provider
│   ├── services/
│   │   └── api.ts                        # Centralized client REST API client
│   ├── types/
│   │   └── pharmacy.ts                   # Strongly-typed data models & interfaces
│   ├── App.tsx                           # Top-level routing (Landing / Auth / Portal)
│   ├── PharmacistPortal.tsx              # Primary Pharmacist Operational Workspace
│   ├── Auth.tsx                          # Login & Registration authentication views
│   ├── Landing.tsx                       # Public application showcase
│   ├── data.ts                           # Client data types & fallback mock initializers
│   ├── index.css                         # Tailored HSL design system & micro-animations
│   └── main.tsx                          # React DOM entrypoint
│
├── server/                               # ─── BACKEND (Node.js + Express + Firestore) ───
│   ├── services/
│   │   ├── aiSafetyGuard.js              # Medical diagnosis & dosage refusal guard
│   │   ├── aiService.js                  # Gemini 3.5 Flash orchestrator with tool context
│   │   ├── pharmacyTools.js              # 17 tenant-isolated controlled Firestore tools
│   │   ├── simulationService.js          # Pure Node.js What-If calculation engine
│   │   ├── smsService.js                 # Unified SMS dispatcher (Auto + Manual)
│   │   ├── smsTemplates.js               # Approved multilingual DLT templates (5 languages)
│   │   └── schedulerService.js           # Background automated notification scheduler
│   ├── tests/
│   │   └── aiAndSms.test.js              # 24-test automated integration suite
│   ├── firebase.js                       # Firebase Admin SDK initialization & credentials
│   ├── index.js                          # Express app entrypoint & REST route controllers
│   ├── package.json                      # Backend dependencies & scripts
│   └── .env.example                      # Server environment configuration template
│
├── index.html                            # Frontend HTML5 entrypoint
├── package.json                          # Frontend dependencies & workspace scripts
├── tsconfig.json                         # TypeScript root compiler configuration
└── vite.config.ts                        # Vite client build configuration
```

---

## ⚖️ Frontend vs Backend Responsibilities

| Responsibility Area | React Frontend (`src/`) | Express Backend (`server/`) |
| :--- | :--- | :--- |
| **Presentation & UI** | ✅ Dashboards, forms, charts, modals, reactive UI | ❌ Does not render HTML |
| **Sensitive Secrets** | ❌ **NEVER** exposed (Zero API keys in bundle) | ✅ Holds `GEMINI_API_KEY`, `SMS_API_KEY`, Firebase Admin JSON |
| **Clinical Safety Guard**| ⚠️ Client input sanitization & quick hints | ✅ Authoritative server regex & intent interception |
| **What-If Calculations** | ⚠️ Slider state & visual comparison matrix | ✅ Pure Node.js math (surplus, days to expiry, value at risk) |
| **Database Operations** | ❌ Never talks directly to Firestore | ✅ Authenticated tenant-isolated Firestore operations |
| **SMS Dispatching** | ⚠️ Composes variables & previews message | ✅ Carrier validation, idempotency, webhook callbacks, DLT format |
| **Background Cron** | ❌ Cannot run background crons | ✅ Automated 08:30 daily expiry & stock scan scheduler |

---

## 🔄 Detailed Data Flow Diagrams

### 1. General REST API Architecture
```
React Frontend (src/)
    │  HTTP / JSON Requests (e.g. POST /api/dispensing)
    ▼
Express REST API (server/index.js)
    │  Tenant Authorization & Payload Validation
    ▼
Firebase Admin SDK (server/firebase.js)
    │  Encrypted Service Account Connection
    ▼
Google Cloud Firestore Database
```

### 2. AI Intelligence & Safety Flow
```
User Query (Frontend)
    │  POST /api/ai/chat
    ▼
Express AI Endpoint (server/index.js)
    │
    ▼
AI Safety Guard (server/services/aiSafetyGuard.js)
    ├── If Clinical Diagnosis / Dosage advice ──> Return Standard Operational Refusal
    └── If Operational Query:
            │
            ▼
Controlled Pharmacy Tools (server/services/pharmacyTools.js)
            │  Executes 17 Firestore queries (Inventory, Expiry, Recall, Audits)
            ▼
Gemini 3.5 Flash Model (server/services/aiService.js)
            │  Synthesizes briefing strictly with factual tool output (Zero Hallucination)
            ▼
Structured Markdown Response -> React UI
```

### 3. Unified Real SMS Notification Flow
```
Automatic Scheduler (08:30) OR Pharmacist Manual Send
    │
    ▼
SMS Service Dispatcher (server/services/smsService.js)
    │
    ├── 1. Validate Indian E.164 Mobile Number (+91 XXXXXXXXXX)
    ├── 2. Check Idempotency Key (Prevents duplicate automatic messages within 24h)
    ├── 3. Render Multilingual DLT Template (English / தமிழ் / తెలుగు / ಕನ್ನಡ / हिन्दी)
    ├── 4. Transmit to SMS Provider Gateway (Mock / Twilio / Fast2SMS / DLT)
    ├── 5. Log Transaction to Firestore `sms_notifications` audit collection
    │
    ▼
Delivery Webhook Callback (/api/sms/webhook) ──> Updates Status to 'Delivered'
```

---

## 🔒 Environment & Secret Separation

All sensitive third-party API keys and database credentials reside exclusively in server-side environment files and are **never bundled** into the client build:

### Backend Configuration (`server/.env`)
```ini
# Server Port
PORT=5000

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# SMS Provider Configuration (India DLT Compliant)
SMS_PROVIDER=MOCK_TEST_PROVIDER
SMS_API_KEY=your_sms_api_key_here
SMS_SENDER_ID=PHARMFLOW
SMS_DLT_ENTITY_ID=1101452390000014582

# Multi-tenant isolation default
DEFAULT_PHARMACY_ID=DEMO_PHARMACY
```

---

## 🚀 Running the Project

### Option A: Simultaneous Development Mode

```bash
# Terminal 1 — Start React Frontend (Vite)
npm install
npm run dev

# Terminal 2 — Start Node.js Express Backend
cd server
npm install
node index.js
```

### Option B: Build & Production Test

```bash
# Compile and test React frontend production bundle
npm run build

# Run automated backend test suite
cd server
node tests/aiAndSms.test.js
```

- **Frontend URL**: `http://localhost:5173/`
- **Backend API URL**: `http://localhost:5000/api`
- **Default Pharmacist Credentials**: `pharmacist@demo.com` / `demo123`

---

## 🎓 Viva & Final-Year Evaluation Guide

### Frequently Asked Questions

#### Q1: Is the frontend and backend clearly separated?
> **Yes.** The frontend is built entirely in React/TypeScript inside `src/`, communicating over REST APIs with the Express backend located in `server/`. The frontend has zero direct database connections and holds no server credentials.

#### Q2: Why did you separate frontend and backend?
> The frontend is responsible for presentation and user interaction, while the backend handles authentication, authorization, business logic, Firestore access, AI processing, SMS communication, scheduling, and security. This separation improves maintainability, security, scalability, and clear responsibility between application layers.

#### Q3: How do you prevent AI hallucinations in pharmacy operations?
> We employ a dual-layer strategy:
> 1. **AI Safety Guard**: Deterministic regex and classification patterns block medical diagnosis, prescription, and dosage modification requests before reaching the model.
> 2. **Controlled Tools Engine**: For operational stock queries, 17 pre-defined backend tools fetch exact numbers directly from Firestore. The LLM only formats the verified data.

#### Q4: How is duplicate SMS transmission prevented?
> The SMS service builds a unique idempotency key for each automated scan:
> `${tenantId}__${customerId}__${batchNumber}__${notificationType}__${YYYY-MM-DD}`.
> If an entry exists for that day, the message is skipped. Manual pharmacist messages bypass the daily rate-limiter while maintaining full audit logging.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
