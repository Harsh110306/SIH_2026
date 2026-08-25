# 🏛️ AI-Powered Government Museum & Zoo Visitor Assistance, Ticketing & Complaint Management Platform

> **Official Problem Statement Project**: Online Chatbot Based Ticketing System  
> **Status**: All Features Fully Implemented & QA Verified (Phases 1 through 8)

---

## 📐 Application Architecture & Stack

The platform is engineered using a clean, decoupled client-server architecture:

```text
Musume SIh 2026/
├── client/              # React 18 SPA (Vite + Modern Glassmorphic Vanilla CSS)
│   ├── src/
│   │   ├── api/         # Axios API Client Wrapper
│   │   ├── components/  # Header, Footer, DigitalTicketModal, ChatbotWidget, AuthModal
│   │   ├── context/     # Auth Context (Email OTP & Google OAuth Login State)
│   │   ├── pages/       # HomePage, MuseumsPage, ChatPage, RecommendationsPage,
│   │   │                # MyBookingsPage, StaffScannerPage, SubmitComplaintPage,
│   │   │                # MyComplaintsPage, AdminComplaintsPage, AdminPortalPage
│   │   └── App.jsx
│   └── vite.config.js
│
└── server/              # Node.js + Express REST API Backend
    ├── dev.db           # SQLite Database (WAL Mode Enabled)
    ├── src/
    │   ├── config/      # DB Connection & Environment Config
    │   ├── controllers/ # Auth, Museum, Chat, Recommendation, Booking, Ticket, Complaint
    │   ├── db/          # Database Seeders & Schemas
    │   ├── middleware/  # Auth (JWT/RBAC), Security (Helmet, Rate-limiting), Error Handler
    │   ├── models/      # Booking & Complaint SQLite Data Models
    │   ├── routes/      # REST Routers (/api/auth, /api/museums, /api/chat, etc.)
    │   ├── services/    # AI RAG Service, Recommendation Engine, Payment Gateway,
    │   │                # QR HMAC Engine, Complaint AI Classifier, SLA Processor
    │   └── tests/       # Automated Test Suites (ticketTest.js, complaintTest.js, masterIntegrationTest.js)
    └── server.js        # Express Server & SLA Cron Processor Startup
```

### Verified Technology Stack
* **Frontend**: React 18, Vite 6, `react-router-dom` v6, `axios`, `lucide-react`, `qrcode`.
* **Backend**: Node.js, Express.js v4, SQLite (`better-sqlite3` v11 in WAL mode).
* **AI & Machine Learning**: `@google/generative-ai` (`gemini-1.5-flash`) for Chatbot RAG knowledge retrieval and Complaint Auto-Classification.
* **Authentication**: 6-Digit Email OTP, Google OAuth 2.0 verification stub, JWT Bearer tokens, Role-Based Access Control (`VISITOR`, `STAFF`, `ADMIN`).
* **Cryptographic Security**: Node.js `crypto` HMAC SHA-256 signatures for QR payload security.
* **Notifications**: Multi-channel Nodemailer simulator for OTPs, Booking confirmations, and SLA escalation alerts.

---

## 🚀 Setup & Execution Instructions

### Prerequisites
* Node.js (v18 or higher recommended)
* npm (v9 or higher recommended)

### 1. Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```

### 2. Backend Setup & Startup
Navigate to the `server/` directory and start the Express REST API:
```bash
cd server
npm install
npm run start
```
The backend server will initialize SQLite database tables (`dev.db`), apply seed data, start the SLA background processor, and listen on `http://localhost:5000`.

### 3. Frontend Setup & Startup
Navigate to the `client/` directory and launch the Vite dev server:
```bash
cd client
npm install
npm run dev
```
The React frontend application will open on `http://localhost:3000` (or `http://localhost:5173`).

---

## 🧪 Running Automated Test Suites

To execute the master end-to-end integration and security audit test suite:
```bash
cd server
node src/tests/masterIntegrationTest.js
```

Individual phase test suites:
- **Phase 6 & 7 Ticket Booking & QR Validation**: `node src/tests/ticketTest.js`
- **Phase 8 Complaint & SLA Escalation**: `node src/tests/complaintTest.js`

---

## 🎬 26-Step End-to-End Demo Walkthrough

1. Open application in browser (`http://localhost:5173`).
2. Click **Sign In / Register** and enter email for instant Email OTP login.
3. Browse Museums & Zoos on `/museums`. Select **Baroda Museum & Picture Gallery**.
4. Open the **AI Assistant** (`/chat`) and ask *"What can I explore here?"*.
5. Switch language in chat: Ask in Gujarati *"આ મ્યુઝિયમ કેટલા વાગ્યે ખુલે છે?"*.
6. Click **Recommendations** (`/recommendations`), select interests (Archaeology, History), and view ranked match scores with data-driven match explanations.
7. Select **Baroda Museum**, click **Book Entry Tickets**, select visitor count, and proceed.
8. Complete sandbox payment flow — backend validates price calculations server-side.
9. Receive booking confirmation and automated email notification.
10. Navigate to **My Bookings** (`/my-bookings`) and click **View QR Ticket**.
11. View high-resolution HMAC-signed digital QR ticket.
12. Log in as **Staff** (or click profile role switch for testing).
13. Open **Staff Scanner** (`/staff/scanner`), paste QR payload, and click **Validate Entry**.
14. Observe instant **✓ VALID TICKET - ENTRY ALLOWED** green banner and staff audit record.
15. Scan the exact same QR ticket a second time.
16. Observe instant **✕ ENTRY DENIED! Ticket has ALREADY BEEN USED** replay protection response.
17. Log in as **Visitor**, click **Report Issue** (`/submit-complaint`).
18. Enter complaint: *"Exposed electrical wire in main hallway causing shock hazard"*.
19. Submit report and observe AI Auto-Classification and hard safety rule override forcing priority to `CRITICAL` and category to `SAFETY`.
20. Log in as **Admin**, navigate to **Complaints Portal** (`/admin/complaints`).
21. Filter complaints by priority `CRITICAL` or SLA status.
22. Click **Override** to adjust category, priority, department, or assigned staff.
23. Click **Run SLA Escalation Check** to execute SLA deadline evaluation.
24. Click **Resolve** to mark complaint resolved.
25. Log in as **Visitor**, open **My Complaints** (`/my-complaints`).
26. View resolution details and submit 5-Star satisfaction feedback rating.

---

## 🔐 Security & Replay Prevention Summary

- **Server-Side Price Authority**: Ticket total costs calculated strictly from DB unit prices.
- **HMAC SHA-256 Signatures**: Digitally signed QR payloads prevent barcode cloning or parameter tampering.
- **Atomic One-Time Entry Lock**: Concurrent scan lock prevents double-entry replay attacks.
- **Role Isolation**: Visitor attempts to call Staff/Admin scanner or complaint management endpoints return `403 Forbidden`.
- **Internal Note Privacy**: Internal staff notes are stripped from visitor-facing responses.

---

## 📌 SQLite Database Evaluation

- **Demo / Development**: SQLite with Write-Ahead Logging (WAL) enabled provides 100% ACID-compliant transactions, sub-millisecond query execution, zero configuration, and effortless portability.
- **Production Deployment Recommendation**: For high-concurrency public cloud deployments, migrate SQLite to PostgreSQL with Connection Pooling (PgBouncer) for multi-region read/write scaling.
