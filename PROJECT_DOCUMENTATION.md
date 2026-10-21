# 🚗 Apex Motor Consultancy — Enterprise Vehicle & Compliance ERP

> **A Next-Generation Vehicle Management, RTO Compliance Automation & Renewal Tracking Platform**  
> Tailored for Motor Consultancies, RTO Driving Schools, Fleet Operators, and Automobile Service Agencies.

---

## 📌 Executive Summary

**Apex Motor Consultancy** is a high-performance web application engineered to streamline the full lifecycle of commercial and private motor vehicles. The platform replaces tedious paper files and fragmented spreadsheets with automated compliance tracking, OCR-assisted RC smart card scanning, real-time Kanban task management, instant WhatsApp client notifications, and multi-tenant agent task delegation.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technology | Details & Capabilities |
|---|---|---|
| **Frontend Framework** | **Next.js 16 (App Router)** | High-speed server & client rendering with React 19 and Turbopack |
| **Language & Typing** | **TypeScript 5** | Strict type safety across vehicles, documents, tasks, and users |
| **Styling & Design System** | **Tailwind CSS & Lucide Icons** | Custom design tokens, glassmorphism, micro-animations, and responsive layouts |
| **Database & Realtime** | **Google Cloud Firestore** | Scalable NoSQL real-time document sync with granular security rules |
| **Authentication** | **Firebase Auth & Mock Auth** | Staff login with dual-mode support (Cloud Firebase Auth + local role-based access) |
| **Offline & State Persistence** | **Dual-Layer Context Store** | Optimistic UI updates with instant `localStorage` caching and background Firestore sync |
| **Document Processing (OCR)** | **Tesseract.js & HTML Canvas** | Automated Smart Card RC scanning, date normalisation, and text parsing |
| **Communication Gateway** | **WhatsApp Business Deep Links** | Pre-formatted, bilingual compliance alerts and quotation follow-ups |

---

## 🏗️ System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Apex Motor Consultancy UI                       │
│     (Dashboard • Vehicles • Tasks Kanban • Clients • Agents)           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  App Context State & Renewal Engine                    │
│   • calculateRenewalStatus()        • automated Task Generator         │
│   • completeRenewalCycle()          • duplicate prevention engine      │
└──────────────────┬──────────────────────────────────┬──────────────────┘
                   │                                  │
         (Instant Hydration)                 (Background Sync)
                   ▼                                  ▼
      ┌─────────────────────────┐        ┌─────────────────────────┐
      │   Client localStorage   │        │     Cloud Firestore     │
      │  (Zero Data Loss Mode)  │        │   (Real-time Listeners) │
      └─────────────────────────┘        └─────────────────────────┘
```

---

## 🌟 Core Modules & Functional Breakdown

### 1. 📊 Executive Dashboard (`/dashboard`)
- **Key Performance Indicators (KPIs)**: Instant counts for Total Vehicles, Overdue Renewals, Due Today, Due Soon (next 30 days), and Completed Cycles this month.
- **Urgent Action Radar**: Highlights vehicles requiring immediate RTO intervention.
- **Agent Workload Tracker**: Displays live distribution of pending compliance tasks per staff member.
- **Quick Shortcuts**: 1-click access to Register Vehicle, Scan RC, and Add Client.

---

### 2. 🚘 Vehicle Registry & Smart RC Scanner (`/vehicles`)
- **Normalized Registration Search**: Search vehicle numbers with or without dashes/spaces (e.g., searching `kl53w8978` seamlessly matches `KL-53-W-8978`).
- **Filterable Grid & Table**: Filter by RTO Authority (KL-10, KL-53, etc.), Vehicle Category (Commercial, Private Car, Taxi, Goods Carrier, Two Wheeler), and Status.
- **RC Smart Card OCR**:
  - Drag-and-drop or photograph an RC Smart Card.
  - Automatically parses Registration Number, Chassis Number (VIN), Engine Number, Registered Owner, Fuel Type (Petrol/Diesel/EV), Vehicle Class, and Manufacturing Date.

---

### 3. 🏢 Vehicle Workspace (`/vehicles/[vehicleId]`)
The command center for any individual vehicle:
- **Vehicle Profile Header**: High-contrast registration plate banner, make/model, fuel type, owner details, and assigned agent.
- **RC Smart Card Technical Details**: VIN, engine number, RTO authority, registration date, and RC validity.
- **Compliance Documents & Renewal Status**:
  - Direct overview of **Pollution (PUC)**, **Motor Insurance**, **Road Tax (MVD)**, **Green Tax**, and **Fitness Certificate**.
  - Displays issue date, expiry milestone, and real-time status badge (`ACTIVE`, `DUE_SOON`, `OVERDUE`).
  - Action buttons: WhatsApp reminder, 1-Click Complete Renewal, Edit Document, and Delete.
- **Operational Tasks & Follow-ups**:
  - Themed cards showing category badges (`Sparkles` for PUC, `Shield` for Insurance, `FileCheck` for Fitness, `RotateCcw` for Tax).
  - 2-Column metadata grid (Assigned Agent with Avatar & Formatted Due Date).
  - Point of Contact (POC / Field Driver) card with direct phone dialer.
- **Uploaded Documents & Digital Scans**:
  - Attached digital scans (PDF, JPG, PNG) categorized by Active vs Historical.
  - 1-click download with descriptive file naming for insurance claim and RTO audits.
- **Renewal History & Audit Trail**:
  - Preserves every past cycle (previous expiry date, fees paid, archived certificate) ensuring full compliance traceability.

---

### 4. 🗂️ Operations & Renewal Tasks Kanban Hub (`/tasks`)
- **Kanban Board & Table List Views**: Switch seamlessly between interactive 3-column Kanban and searchable tabular list.
- **Workflow Columns**:
  1. **Pending / To-Do**: Newly scheduled or system-generated compliance alerts.
  2. **In Progress / Processing**: Tasks undergoing client contact, RTO queue submission, or physical inspection.
  3. **Completed / Renewed**: Finished renewal cycles with verified next validity date.
- **Smart Filter Bar**: Filter by Compliance Type (Insurance, Fitness, PUC, Road Tax), Priority (High, Normal, Low), and Assigned Agent.
- **Manual Task Creation**: Purple `+ Add Task` modal allowing agents or admin to create custom follow-up assignments for any vehicle with auto-filled client, vehicle, and agent references.

---

### 5. 👥 Client Relationship Management (CRM) (`/clients` & `/clients/[clientId]`)
- Comprehensive directory of registered vehicle owners, corporate fleet owners, and transport operators.
- Stores primary phone number, email, secondary contact, address, and Son/Daughter/Wife (S/D/W) relationship names for RTO documentation.
- Client workspace lists all vehicles owned by that individual/business, their total active documents, and payment statuses.

---

### 6. 🔄 Automated Renewal Engine & Roll-Over Modal
- **Autonomous Compliance Monitor**: Evaluates validity dates daily; automatically triggers notifications and tasks when a document enters `DUE_SOON` (30 days), `DUE_TODAY`, or `OVERDUE`.
- **Modern Complete Renewal & Roll-Over Modal**:
  - **Sleek Cycle Stepper**: Visual timeline showing `Previous Expiry` ──> `New Expiry`.
  - **Quick Interval Presets**: 1-click validity calculation (`+6 Months (PUC)`, `+1 Year`, `+2 Years`, `+3 Years`, `+5 Years`).
  - **Digital Scan Attachment**: Drag-and-drop certificate uploader with real-time file size and status preview.
  - **Non-Destructive Cycle Roll-Over**: Archives the old record into `historicalDocs` and activates the new expiry milestone with zero manual data re-entry.

---

### 7. 📲 WhatsApp Instant Client Outreach
- Pre-filled professional WhatsApp notifications linking directly to WhatsApp Web or WhatsApp Desktop:
  - Client's name.
  - Vehicle registration number.
  - Expiring document category (e.g., *Motor Insurance* or *Pollution Certificate*).
  - Exact expiry date and required follow-up instructions.

---

### 8. 🛡️ Role-Based Access Control (RBAC) & Security
- **Admin**: Full authority to create, edit, reassign, delete vehicles, modify system reminder thresholds, manage agents, and clear notifications.
- **Agent**: Authorized to manage assigned vehicles and tasks, contact clients, and mark renewals complete.
- **Firestore Security Rules**: Configured in `firestore.rules` to enforce role authorization and authenticated CRUD operations.

---

## 📁 Repository Directory Structure

```
├── app/
│   ├── layout.tsx                 # Root layout with App Shell, fonts, and AppProvider
│   ├── page.tsx                   # Auth redirect & landing router
│   ├── login/                     # Staff login with demo credential selector
│   ├── dashboard/                 # Analytics, KPI statistics & expiry radar
│   ├── vehicles/                  # Vehicles table, search & RTO category filters
│   │   └── [vehicleId]/page.tsx   # Comprehensive Vehicle Workspace
│   ├── tasks/                     # Unified Tasks Kanban & List hub
│   ├── clients/                   # CRM owner directory
│   │   └── [clientId]/page.tsx    # Client vehicle portfolio workspace
│   ├── agents/                    # Staff management & agent performance metrics
│   ├── settings/                  # Global RTO defaults, reminder days, and profile
│   └── api/                       # OCR and vehicle lookup endpoints
├── components/
│   ├── layout/                    # Sidebar, Navbar, Mobile Navigation
│   ├── shared/                    # Reusable enterprise modals:
│   │   ├── vehicle-modal.tsx      # Vehicle registration & smart RC OCR
│   │   ├── task-modal.tsx         # Manual & follow-up task creator
│   │   ├── completion-modal.tsx   # Modern cycle roll-over & document uploader
│   │   ├── document-modal.tsx     # Add/edit individual compliance policy
│   │   ├── notification-bell.tsx  # In-app alerts dropdown (Mark all read / Clear all)
│   │   └── whatsapp-modal.tsx     # Pre-filled WhatsApp notification launcher
│   └── ui/                        # Button, Card, Modal, Input, Pagination
├── lib/
│   ├── store/app-context.tsx      # Central State Store, LocalStorage caching & Firestore sync
│   ├── firebase/                  # Firebase Client SDK & Firestore helper functions
│   ├── renewals/engine.ts         # Expiry date calculator & status evaluator
│   ├── validation.ts              # Phone number, email, and vehicle registration validators
│   └── types.ts                   # Domain TypeScript interfaces (Vehicle, Document, Task, User)
├── firestore.rules                # Cloud Firestore database security rules
└── package.json                   # Dependencies, build scripts & metadata
```

---

## 🚀 Running the Project Locally

```bash
# 1. Install project dependencies
npm install

# 2. Build the production Turbopack bundle
npm run build

# 3. Start the production server on port 3088
npm run start -- -p 3088
```

- Access the web application at: `http://localhost:3088`
- Default Admin Account: `admin@apexmotors.com` / `admin123`
- Default Agent Account: `rahman@apexmotors.com` / `agent123`

---

## 📜 Summary of Recent Enhancements

1. **Task Card Redesign**: Modern card layout with category-specific themed icons, status pills, 2-column agent/due date micro-grid, and emerald completion banners.
2. **Notification Center Fix**: Unconditional local React state and `localStorage` synchronization for **"Mark all read"** and **"Clear all"** actions with background Firestore sync.
3. **Table Column Optimization**: Removed empty/redundant `Document / Policy No.` and `Amount` columns from the Compliance table; document numbers now display as sleek subtext when present.
4. **Manual Task Creation Overhaul**: Streamlined manual task generation with auto-selected client, vehicle, assigned agent, and date presets, backed by async state validation.
5. **Roll-Over Completion Modal Overhaul**: Modernized the cycle roll-over popup with a minimalist horizontal timeline stepper, segmented interval chips (+6 Mo, +1 Yr, etc.), and compact document dropzone.
6. **Mobile Responsive Architecture (Phase 3)**: Optimized layouts across 320px, 375px, 768px, 1024px, and 1440px viewports with zero horizontal overflow, background scroll-locking mobile navigation drawer, and mobile Kanban column switcher tabs.
7. **Strict RBAC & Firestore Security Hardening**: Enforced role-based Firestore security rules preventing unauthorized client/vehicle edits, restricting user creation and deletion to Admin, blocking role escalation attempts, and making audit activity logs strictly immutable.
8. **Automated Verification Suite**: Full test coverage (`tests/audit-verification.mjs`) passing 16/16 tests (100%) for renewal calculations, data validation, and Firestore security rules.

---

## 🛡️ Pre-Delivery Security & Verification Audit

### 1. Security & RBAC Test Matrix
| Actor | Target | Action | Expected Result | Verified Result |
|---|---|---|---|---|
| **Admin** | `/settings` | Update company profile / intervals | Permitted | `PASS` (Admin writes accepted) |
| **Admin** | `/users` | Create/Delete staff personnel | Permitted | `PASS` (Admin creates and deletes) |
| **Admin** | `/activityLogs` | Update / Delete audit entries | Denied | `PASS` (Immutable audit trail) |
| **Agent** | `/settings` | Direct URL navigation & updates | Access Restricted | `PASS` (Denied, redirected to dashboard) |
| **Agent** | `/agents` | Direct URL navigation & updates | Access Restricted | `PASS` (Denied, redirected to dashboard) |
| **Agent** | `/users/{self}` | Role escalation to `ADMIN` | Denied | `PASS` (Role change blocked by rules) |
| **Agent** | `/clients` | Edit other agent's client | Denied | `PASS` (Restricted to assigned clients) |
| **Agent** | `/vehicles` | Delete vehicle record | Denied | `PASS` (Delete restricted to Admin) |

### 2. Multi-Viewport Responsive Matrix
| Viewport | Device Class | Key Verification | Result |
|---|---|---|---|
| **320px** | Small Mobile (iPhone SE) | Single-column KPI, compact search, zero horizontal scroll | `VERIFIED` |
| **375px** | Modern Mobile (iPhone 13/14) | Navigation drawer with scroll lock, touch-friendly vehicle cards | `VERIFIED` |
| **768px** | Tablet (iPad Portrait) | 2-column KPI grid, dual-mode tables, stacked specs grid | `VERIFIED` |
| **1024px** | Compact Laptop / iPad Landscape | 2-column agent grid, compact header (56px), compact sidebar (240px) | `VERIFIED` |
| **1440px** | Desktop Monitor | 4-column KPI grid, 3-column Kanban board, 20px padding density | `VERIFIED` |

