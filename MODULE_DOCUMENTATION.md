# Apex Motor Consultancy — System & Module Architecture Documentation

> **Platform Overview**: Enterprise Automobile Consultancy Vehicle, RTO Compliance, and Renewal Management System. Engineered with Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons, and client-side Tesseract.js OCR.

---

## 📑 Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Module 1: Authentication & Role-Based Access (RBAC)](#2-module-1-authentication--role-based-access-rbac)
3. [Module 2: Client Management & Auto-Lookup Engine](#3-module-2-client-management--auto-lookup-engine)
4. [Module 3: Vehicle Specification & Smart RC OCR Scanner](#4-module-3-vehicle-specification--smart-rc-ocr-scanner)
5. [Module 4: RTO Renewal & Expiry Tracking Engine](#5-module-4-rto-renewal--expiry-tracking-engine)
6. [Module 5: Task Management & Staff Allocation](#6-module-5-task-management--staff-allocation)
7. [Module 6: WhatsApp Notice & Client Communication Engine](#7-module-6-whatsapp-notice--client-communication-engine)
8. [Module 7: Executive Analytics & Dashboard](#8-module-7-executive-analytics--dashboard)
9. [Database Schema & Data Models](#9-database-schema--data-models)
10. [Local Development & Deployment Guide](#10-local-development--deployment-guide)

---

## 1. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        APEX MOTOR CONSULTANCY                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ Authentication (RBAC)  │  │ Smart RC Scanner (OCR) │  │ Renewal Engine         │
│ • Admin / Agent Roles  │  │ • Zero-hallucination   │  │ • Days-to-expiry calc  │
│ • Unified Card UI      │  │ • Verified Check list  │  │ • Active / Overdue     │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED CLIENT & FLEET STORE                       │
│  • Mobile Number as Unique Key                                         │
│  • Inline Client Auto-Linking (Eliminates double-entry)                │
│  • 1-Click WhatsApp Renewal Dispatch                                   │
└────────────────────────────────────────────────────────────────────────┘
```

The system is built on a reactive state store (`lib/store/app-context.tsx`) that operates seamlessly in both:
1. **Firebase Cloud Mode**: Real-time Firestore synchronization and Firebase Auth.
2. **Local Demo / Offline Mode**: In-memory and local mock persistence allowing full operational workflows without cloud credentials.

---

## 2. Module 1: Authentication & Role-Based Access (RBAC)

### Key Files
* `app/login/page.tsx`: Unified all-in-card authentication portal.
* `lib/types/index.ts`: User role definitions (`ADMIN` | `AGENT`).
* `lib/store/app-context.tsx`: `loginStaff()`, `logout()`, `currentUser`.

### How It Works
* **Role Hierarchy**:
  * **ADMIN (`Administrator`)**: Full system visibility. Can manage staff members, reassign clients, edit agency settings, and access system-wide financial analytics.
  * **AGENT (`Staff Agent`)**: Operates in a scoped view. Only sees their assigned clients, assigned vehicle fleets, assigned tasks, and renewal follow-up deadlines.
* **All-In-Card Design**:
  * The entire login interface (company branding, feature capability badges, credentials form, 1-click test logins, and SSL security status) is unified inside a single luxury card container.
* **Dummy Staff Accounts (1-Click Auto-Fill Available)**:
  * **Anas (Admin)**: `admin@apexmotors.com` (or alias `admin@gmail.com`) / `password` → Full administrator access (all clients, vehicles, staff management & settings).
  * **Rahman (Field Agent)**: `rahman@apexmotors.com` (or alias `agent1@gmail.com`) / `password` → Field operations agent (manages 5 assigned vehicles & urgent renewals).
  * **Suresh Kumar (Senior Agent)**: `suresh@apexmotors.com` (or alias `agent2@gmail.com`) / `password` → Senior consultancy agent (manages 2 assigned vehicles & client desk).

---

## 3. Module 2: Client Management & Auto-Lookup Engine

### Key Files
* `app/clients/page.tsx`: Client directory with responsive desktop table and mobile cards.
* `app/clients/[clientId]/page.tsx`: Dedicated client detail view showing owned vehicles and history.
* `components/shared/client-modal.tsx`: Client creation/edit dialog.
* `components/shared/vehicle-modal.tsx`: Inline auto-client detection.

### How It Works
1. **Elimination of the "Double Task"**:
   * Previously, agents had to manually create a client record first, copy the ID, and then create the vehicle.
   * **Now**: Agents can create a vehicle directly. The client information is entered directly inside the vehicle dialog.
2. **Phone Number as Primary Key**:
   * The client's 10-digit mobile number (`clientMobile`) acts as the unique identifier.
   * As the agent types the mobile number:
     * **If Phone Exists**: The system immediately fetches the existing client profile (Name, Address, Email) and links the vehicle to their existing fleet.
     * **If Phone is New**: The system automatically registers a brand-new client in the database upon form submission.
3. **Fleet Management**:
   * Each client card shows the total count of active vehicles, total pending renewals, and direct quick links to WhatsApp and phone dialing.

---

## 4. Module 3: Vehicle Specification & Smart RC OCR Scanner

### Key Files
* `lib/ocr/rc-scanner.ts`: Optical character parsing engine powered by `tesseract.js`.
* `components/shared/vehicle-modal.tsx`: Vehicle modal with dual-tab interface (`Form` and `Smart RC Scanner`).
* `app/vehicles/page.tsx`: Vehicle fleet directory.
* `app/vehicles/[vehicleId]/page.tsx`: Vehicle detail hub with compliance timeline.

### How It Works
1. **Optical Character Recognition (OCR)**:
   * Users can upload an image (PNG, JPG, WEBP) or take a smartphone photo of an Indian Vehicle Registration Certificate (Smart Card, Paper RC, or mParivahan screenshot).
   * A laser-beam scanning animation provides visual feedback while Tesseract processes the image client-side.
2. **Zero-Hallucination Parser (`parseRcText`)**:
   * Strictly extracts **only explicit document fields**:
     * **Registration Number**: Standard Indian patterns (`KL-10-AZ-4589`, `KL-55-R-7788`).
     * **Chassis VIN**: 17-character alphanumeric string (excluding confusing characters I, O, Q).
     * **Engine Number**: 6 to 16 alphanumeric characters.
     * **Make / Brand**: Explicit brand detection (Toyota, Maruti Suzuki, Hyundai, Tata, Mahindra, etc.).
     * **Model**: Specific model detection (Innova Crysta, Swift, Nexon, Tigor, etc.).
     * **Fuel Type**: Matches `DIESEL`, `PETROL`, `ELECTRIC`, `CNG`, or `HYBRID`.
     * **Manufacturing Year**: Strict 4-digit year following `MFG` / `M.YEAR` labels.
     * **Dates**: Strict ISO `YYYY-MM-DD` normalization to guarantee compatibility with native HTML date inputs.
3. **No Hallucinated Defaults**:
   * If a field is not present in the document, it remains **completely blank** (`''`).
   * No hardcoded default year (previously `2022`) or RTO location (previously `KL-10`).
   * Seating capacity and unladen weight lines are explicitly filtered out so they do not pollute other fields.
4. **Verified Fields Checklist Preview**:
   * Before applying the scanned data to the form, the scanner displays a **"Verified Document Fields" checklist** with individual badges for each detected attribute.
   * Clicking **"Apply Verified Details to Form →"** transfers only the verified values into the form fields.
5. **Duplicate Prevention**:
   * Strips spaces and hyphens (`KL10AZ4589`) to verify uniqueness against existing active vehicles before saving.

---

## 5. Module 4: RTO Renewal & Expiry Tracking Engine

### Key Files
* `lib/renewals/engine.ts`: Expiry date calculation, renewal status progression, and days-remaining algorithms.
* `app/renewals/page.tsx`: Dedicated renewal operations center with filter tabs.
* `components/shared/completion-modal.tsx`: Modal for recording renewal completion and next-cycle scheduling.
* `components/shared/renewal-request-modal.tsx`: Modal for creating ad-hoc renewal requests.

### Supported Document Types
| Document Type | Code | Standard Validity | Description |
| :--- | :--- | :--- | :--- |
| **Insurance** | `INSURANCE` | 1 Year / 3 Years | Comprehensive or Third-Party motor insurance policy. |
| **Road Tax** | `ROAD_TAX` | Quarterly / 1 Year / 5 Years | State motor vehicle tax payable to the RTO. |
| **Green Tax** | `GREEN_TAX` | 5 Years | Environmental cess for transport vehicles over 15 years old. |
| **Pollution (PUC)** | `PUC` | 6 Months / 1 Year | Emission compliance certificate. |
| **Fitness Certificate** | `FITNESS` | 1 Year / 2 Years | Mandatory roadworthiness inspection for commercial vehicles. |
| **Transport Permit** | `PERMIT` | 5 Years | Goods or passenger carriage permits. |

### Expiry Progression Logic
* **`DUE_SOON`**: Expiry date is within 30 days of the current date. Highlighted in Amber.
* **`DUE_TODAY`**: Expiry date matches the current calendar date. Highlighted in Purple.
* **`OVERDUE`**: Expiry date is in the past, risking police penalties or impoundment. Highlighted in Rose Red.
* **`ACTIVE`**: More than 30 days remaining on validity. Highlighted in Emerald Green.
* **`COMPLETED`**: Renewal fee collected, policy/certificate issued, and automatically updated to the next cycle.

---

## 6. Module 5: Task Management & Staff Allocation

### Key Files
* `app/tasks/page.tsx`: Kanban and list views for operational tasks.
* `components/shared/task-modal.tsx`: Task creation and assignment modal.
* `app/agents/page.tsx`: Staff directory and workload monitoring.

### Workflow & Task States
1. **Creation**: Tasks can be created automatically when a renewal enters `DUE_SOON` or manually by an Administrator.
2. **Assignment**: Tasks are linked to an active staff member (`assignedAgentId`).
3. **Priority Matrix**: `LOW` (routine), `MEDIUM` (renewal due in 15 days), `HIGH` (due in 5 days), `URGENT` (overdue).
4. **Lifecycle**: `PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED` / `CANCELLED`.

---

## 7. Module 6: WhatsApp Notice & Client Communication Engine

### Key Files
* `components/shared/whatsapp-modal.tsx`: Interactive preview and template generator.
* `components/ui/whatsapp-icon.tsx`: High-resolution WhatsApp brand icon.

### How It Works
* **Pre-formatted Messages**: When an agent clicks the WhatsApp button on any vehicle or renewal card, the system generates a tailored notice:
  ```
  Dear [Client Name],
  Greetings from Apex Motor Consultancy!

  This is a courtesy reminder regarding your vehicle [Make Model] (Reg: [KL-XX-YY-ZZZZ]).
  Your [Document Type] is due for renewal on [Expiry Date] (X days remaining).

  Kindly submit your documents or contact us at +91 98460 12345 to process your renewal without RTO late fee penalties.

  Thank you for choosing Apex Motor Consultancy.
  ```
* **Direct Deep Linking**: Uses standard `https://wa.me/[Phone]?text=[EncodedText]` to launch WhatsApp on desktop or mobile without saving the number to phone contacts.

---

## 8. Module 7: Executive Analytics & Dashboard

### Key Files
* `app/dashboard/page.tsx`: Real-time KPI metrics and quick actions.
* `components/layout/navbar.tsx`: Global navigation, quick search, and user badge.
* `components/layout/sidebar.tsx`: Desktop and mobile navigation drawer.

### Dashboard Components
* **KPI Metrics**:
  * Total Active Vehicles in Fleet
  * Total Registered Clients
  * Renewals Due in Next 30 Days
  * Overdue Alert Counter
  * Monthly Processing Volume
* **Action Shortcuts**:
  * "+ Add Vehicle & Scan RC" (Opens Smart RC modal directly)
  * "Send WhatsApp Reminders" (Opens renewal follow-up list)
  * "New Client Onboarding"

---

## 9. Database Schema & Data Models

### 1. `Client`
```typescript
interface Client {
  id: string;
  name: string;
  mobile: string;            // Unique primary key for lookups
  alternateMobile?: string;
  address: string;
  email?: string;
  assignedAgentId: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. `Vehicle`
```typescript
interface Vehicle {
  id: string;
  clientId: string;
  registrationNumber: string;            // e.g. "KL-10-AZ-4589"
  normalizedRegistrationNumber: string;  // e.g. "KL10AZ4589"
  vehicleType: VehicleType;
  vehicleClass?: string;
  make: string;                          // e.g. "TOYOTA"
  model: string;                         // e.g. "INNOVA CRYSTA"
  variant?: string;                      // e.g. "2.4 GX"
  fuelType: FuelType;                    // 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC' | 'HYBRID'
  manufacturingYear?: number;            // e.g. 2022
  registrationDate?: string;             // ISO "YYYY-MM-DD"
  chassisNumber?: string;                // 17-character VIN
  engineNumber?: string;
  rto: string;                           // e.g. "KL-10 Perinthalmanna"
  registrationValidity?: string;         // ISO "YYYY-MM-DD"
  assignedAgentId: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3. `RenewalRecord`
```typescript
interface RenewalRecord {
  id: string;
  vehicleId: string;
  documentType: DocumentType;           // 'INSURANCE' | 'ROAD_TAX' | 'GREEN_TAX' | 'PUC' | 'FITNESS' | 'PERMIT'
  policyNumber?: string;
  issueDate: string;
  expiryDate: string;
  validityUnit: 'DAYS' | 'MONTHS' | 'YEARS';
  validityValue: number;
  cost?: number;
  status: 'ACTIVE' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 10. Local Development & Deployment Guide

### Prerequisites
* Node.js v18.17+ or v20+
* npm or pnpm

### Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Build production bundle to verify types
npm run build

# 3. Start local server
npm run dev
# or for production server on port 3010:
npm run start -- -p 3010
```

### Accessing the Portal
* Navigate to `http://localhost:3010/login`
* Click **Administrator** to test the full system, or **Staff Agent** to test scoped staff workflows.
