# Apex Motor Consultancy — Vehicle, RTO Compliance & Renewal Management

An enterprise-grade automobile consultancy platform engineered for vehicle registration, compliance management, client fleet oversight, and RTO renewal automation.

## 🚀 Key Modules & Highlights
* **Smart RC OCR Scanner**: Instant optical extraction of Registration Number, Chassis VIN, Engine Number, Make, Model, Fuel Type, and RTO with zero hallucination and a verified fields checklist.
* **Inline Client Auto-Linking**: Client phone number serves as unique primary key, eliminating the double-entry task of pre-registering clients.
* **Automated Expiry Engine**: Live tracking of Insurance, Road Tax, Green Tax, Fitness, and Permits across `ACTIVE`, `DUE_SOON`, `DUE_TODAY`, and `OVERDUE` states.
* **1-Click WhatsApp Notices**: Instant pre-formatted renewal notifications sent directly via WhatsApp deep links.
* **Role-Based Workspace (RBAC)**: Distinct workflows for Administrators and Staff Agents.
* **Luminous Light Theme**: Modern design with glassmorphism, responsive data tables, and touch-friendly mobile cards.

## 📖 Detailed Module Documentation
For a full, in-depth breakdown of each module's architecture, data models, workflows, and algorithms, read:
👉 **[MODULE_DOCUMENTATION.md](MODULE_DOCUMENTATION.md)**

## 💻 Getting Started Locally

```bash
# 1. Install dependencies
npm install

# 2. Build for production (verifies TypeScript & routes)
npm run build

# 3. Start local development server
npm run dev

# Or start production server
npm run start -- -p 3010
```

Open [http://localhost:3010/login](http://localhost:3010/login) to access the staff workspace.
