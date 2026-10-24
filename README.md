# CAMPUSFLOW — Smart Fair Queue

> **"Never lose your place. Never hold up the queue."**

CAMPUSFLOW is a production-grade, full-stack campus queue management platform designed specifically for university service desks (Registrar, Financial Aid, Academic Advising, Student Accounts, Examination Cell). It addresses the core dilemma of campus service queues: students have legitimate academic commitments (classes, labs, advisor meetings) that cause them to temporarily miss their turn when called, resulting in either blocked queues or students being penalized and forced to restart from the back.

CAMPUSFLOW introduces **Smart Hold** and **Bounded Fair-Skip**: an algorithmic, transaction-safe queue coordination engine that grants students temporary hold windows while guaranteeing bounded movement, preventing queue deadlocks, and maintaining complete audit transparency.

---

## 60-Second Pitch

> “CampusFlow is a smart campus queue management platform designed around a common problem: students are sometimes temporarily unavailable when their token is called.
> 
> Instead of blocking the queue or immediately sending them to the end, CampusFlow lets students declare a **Smart Hold**.
> 
> Our **Bounded Fair-Skip** mechanism temporarily moves a held token back by one position while enforcing a configurable maximum skip limit. Once that limit is reached, the token moves to the tail.
> 
> Every transition is recorded in a transparent event log, while students receive real-time in-app notifications.
> 
> The result is a queue that balances student flexibility with fairness to everyone waiting.”

---

## Technical Overview for Judges

| Component | Technology | Architectural Role |
|---|---|---|
| **Frontend** | React 18, Vite, JavaScript (JSX) | SPA with role-based routing, real-time polling (3–5s), Framer Motion micro-animations, Recharts analytics, and isolated client-side simulator. |
| **Backend** | Node.js, Express, JavaScript (ES Modules) | REST API with Zod validation, centralized error handling, and transaction-safe queue engine state machine. |
| **Database** | PostgreSQL | Relational storage with composite uniqueness constraints, foreign keys, and indexed lookups. |
| **ORM** | Prisma ORM (v6.4.1) | Type-safe query builder, migration manager, and interactive transaction runner (`$transaction`). |
| **Authentication** | JWT + bcryptjs + HTTP-Only Cookies | Secure cookie-based authentication (`campusflow_token`), role-based authorization (`STUDENT`, `STAFF`), and privilege escalation prevention. |
| **Concurrency** | Row-Level Locking | Concurrency-safe token issuance and `callNext()` queue evaluation preventing duplicate serving tokens. |
| **Audit & Telemetry** | Append-Only Event Stream | Immutable `QueueEvent` log tracking every state change (`JOINED`, `HOLD_DECLARED`, `SKIPPED`, `MOVED_TO_TAIL`, `SERVING`, `COMPLETED`, `NO_SHOW`). |
| **Notifications** | In-App Event Notifications | Persistent `Notification` records created synchronously upon queue lifecycle milestones. |
| **Fairness Simulator** | Pure Frontend Sandbox | Isolated deterministic queue simulation engine with adjustable parameters (students, skips, held ratios), zero database mutations. |

---

## Architecture

```
                                  CAMPUSFLOW ARCHITECTURE
                                  
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           BROWSER CLIENT (React + Vite)                    │
  │                                                                             │
  │   ┌───────────────────────────────┐     ┌───────────────────────────────┐   │
  │   │      Student Experience       │     │     Staff Control Center      │   │
  │   │  - Service Discovery          │     │  - Desk Active Serving Token  │   │
  │   │  - Dynamic Position Derivation│     │  - Waiting / Held Rosters     │   │
  │   │  - Smart Hold Modal & Actions │     │  - Call Next, Complete, NoShow│   │
  │   │  - In-App Notifications Drawer│     │  - Pause / Resume / Close     │   │
  │   └───────────────┬───────────────┘     └───────────────┬───────────────┘   │
  │                   │                                     │                   │
  │                   │        ┌────────────────────────────┴───────────────┐   │
  │                   │        │ Operational Analytics & Fairness Simulator │   │
  │                   │        │  - Recharts Hourly/Service Wait Times      │   │
  │                   │        │  - Client-Side Sandbox (Zero DB Mutation)  │   │
  │                   │        └────────────────────┬───────────────────────┘   │
  └───────────────────┼─────────────────────────────┼───────────────────────────┘
                      │ Polling (3-5s) / REST JSON  │
                      ▼                             ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           EXPRESS REST API BACKEND                          │
  │                                                                             │
  │   [Security Middleware]                                                     │
  │   ├── CORS (Configured origin, credentials enabled)                         │
  │   ├── Express Body Parser (1MB limit)                                       │
  │   ├── Cookie Parser (HTTP-only `campusflow_token`)                          │
  │   └── Zod Request Body & Query Validators                                   │
  │                                                                             │
  │   [Authentication & RBAC]                                                   │
  │   ├── `authenticate` (JWT verification)                                     │
  │   └── `authorizeRoles(UserRole.STAFF)`                                      │
  │                                                                             │
  │   [Transaction-Safe Queue Engine]                                           │
  │   ├── Dynamic Position Engine (`QueuePositionEngine`)                       │
  │   ├── Smart Hold Validator (`SmartHoldEngine`)                              │
  │   ├── Bounded Fair-Skip State Machine (`QueueTransitions`)                  │
  │   └── Append-Only Audit Logger (`QueueEventLogger`)                         │
  └─────────────────────────────────────┬───────────────────────────────────────┘
                                        │ Prisma Interactive Transactions
                                        ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        POSTGRESQL RELATIONAL DATABASE                       │
  │                                                                             │
  │   ├── `User` (id, email, passwordHash, role, name)                          │
  │   ├── `Service` (id, name, description, active)                             │
  │   ├── `Queue` (id, serviceId, status, maxSkips, minLeadTime, maxHoldDuration│
  │   ├── `QueueToken` (id, queueId, userId, tokenNumber, status, skipCount)    │
  │   ├── `SmartHold` (id, tokenId, startTime, endTime, reason, status)         │
  │   ├── `QueueEvent` (id, queueId, tokenId, eventType, metadata, createdAt)   │
  │   └── `Notification` (id, userId, title, message, type, isRead)             │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Innovations: Smart Hold & Bounded Fair-Skip

### 1. Smart Hold
When a student has a scheduled conflict:
- Student specifies a valid time window `[startTime, endTime]` and a reason (e.g., "Midterm Exam").
- **Validation Rules**:
  - `startTime` must be at least `minLeadTime` minutes in the future (default 5 min).
  - Duration `endTime - startTime` cannot exceed `maxHoldDuration` minutes (default 60 min).
  - Queue must be `OPEN` or `PAUSED` (cannot declare hold on `CLOSED` queue).
  - Only one active hold permitted per student token.
- During the hold window, the token status is `HOLD`.

### 2. Bounded Fair-Skip Algorithm
When staff triggers `callNext()`:
1. The engine fetches the candidate token with the lowest `tokenNumber` in `WAITING` or `HOLD` status.
2. If candidate is in active `HOLD` (current time is within hold window):
   - **Under Fairness Limit (`skipCount < maxSkips`)**:
     - Token is skipped for this turn.
     - `skipCount` is incremented by 1.
     - Token is moved back by 1 position (relative order preserved).
     - `SKIPPED` event is appended to audit log.
     - Student receives instant notification: *"Token #X was skipped (Skip Y/Z). Next eligible student called."*
     - Engine loops to evaluate the next eligible candidate in the queue.
   - **At Fairness Limit (`skipCount >= maxSkips`)**:
     - Token has exceeded maximum allowable skips.
     - Active hold transitions to `EXPIRED`.
     - Token is moved to the tail of the queue in `WAITING` status.
     - `MOVED_TO_TAIL` event is logged.
     - Student receives notification: *"Token #X moved to tail after reaching maximum skips."*
3. **Serving**: The first eligible `WAITING` token transitions to `SERVING` status.
4. **Absolute Rule on No-Show**: When staff marks a `SERVING` token as `NO_SHOW`, it is an administrative attendance outcome. `skipCount` is **never** modified, and no fairness skip event is triggered.

---

## Demo Credentials

The database comes pre-seeded with realistic demo accounts:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| **Staff** | `staff@campusflow.demo` | `Staff@123` | Staff Control Center, Call Next, No-Show, Complete, Queue Controls, Analytics, Simulator, Full Audit Logs |
| **Student** | `student@campusflow.demo` | `Student@123` | Student Dashboard, Service Intake, Join Queue, Live Position, Smart Hold Declaration & Cancellation, Notifications |

---

## API Reference

### Authentication Endpoints
- `POST /api/auth/register` — Register a new student account (public registration strictly assigns `STUDENT` role).
- `POST /api/auth/login` — Authenticate and receive HTTP-only JWT session cookie.
- `POST /api/auth/logout` — Clear JWT session cookie.
- `GET /api/auth/me` — Retrieve current authenticated user profile and active token summary.

### Student Queue Endpoints
- `GET /api/services` — List campus services with active queue statuses.
- `POST /api/queue/:queueId/join` — Join an active queue (row-locked token generation; prevents duplicate active tokens).
- `GET /api/queue/my-active` — Get current student's active token with dynamically calculated queue position and people ahead.
- `GET /api/queue/:queueId/status` — Real-time queue telemetry (waiting count, currently serving token, user's ticket).
- `GET /api/token/:tokenId` — Detailed token metadata.
- `POST /api/token/:tokenId/cancel` — Student self-cancellation of active token.

### Smart Hold Endpoints
- `POST /api/queue/:queueId/hold` — Declare a Smart Hold window (`startTime`, `endTime`, `reason`).
- `POST /api/queue/:queueId/hold/cancel` — Cancel an active Smart Hold (preserves existing `skipCount`).

### Staff Control Center Endpoints (`STAFF` Role Required)
- `GET /api/staff/queues` — Master queue dashboard with real-time roster counts.
- `GET /api/staff/queue/:queueId` — Queue view with ordered waiting/held rosters and recent events.
- `POST /api/queue/:queueId/call-next` — Transactional next token invocation with Bounded Fair-Skip evaluation.
- `POST /api/token/:tokenId/complete` — Mark currently serving token as completed.
- `POST /api/token/:tokenId/no-show` — Mark currently serving token as no-show (preserves skip count).
- `POST /api/queue/:queueId/pause` — Pause queue intake (prevents new joins; existing tokens serviced).
- `POST /api/queue/:queueId/resume` — Resume paused queue back to `OPEN`.
- `POST /api/queue/:queueId/close` — Close queue for the operating day.
- `PATCH /api/queue/:queueId/config` — Update queue parameters (`maxSkips`, `minLeadTime`, `maxHoldDuration`).

### Analytics & Audit Endpoints
- `GET /api/queue/:queueId/analytics` — Server-side aggregated metrics (total served, wait time, service time, no-show rate, skip metrics, hourly throughput).
- `GET /api/queue/:queueId/events` — Paginated immutable audit event stream with event type filters (`JOINED`, `HOLD_DECLARED`, `SKIPPED`, `MOVED_TO_TAIL`, `SERVING`, `COMPLETED`, `NO_SHOW`, `QUEUE_PAUSED`, etc.).

### Notification Endpoints
- `GET /api/notifications` — Retrieve user's in-app notification feed.
- `PATCH /api/notifications/:notificationId/read` — Mark notification as read.
- `PATCH /api/notifications/read-all` — Mark all notifications as read.

### Health Check Endpoint
- `GET /api/health` — Liveness & database connectivity probe (`SELECT 1`).

---

## Installation & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher running locally or accessible via URL

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/campusflow.git
cd campusflow

# Install dependencies across all workspaces (client & server)
npm install
```

### 2. Configure Environment Variables
Create `.env` files in both `server/` and `client/` directories:

**`server/.env`**:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/campusflow"
JWT_SECRET=campusflow_super_secret_jwt_key_2026_production
JWT_EXPIRES_IN=1d
```

**`client/.env`**:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Initialize Database & Run Seed
```bash
# Push Prisma schema migrations to PostgreSQL
cd server
npx prisma migrate dev --name init

# Seed demo users, services, queues, and test tokens
npm run seed
cd ..
```

### 4. Start Development Servers
```bash
# Start both Backend (Port 5000) and Frontend (Port 5173) concurrently
npm run dev:all
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`

---

## Verification & Automated Test Suites

The project contains complete automated test suites covering all 10 project phases with 100% pass rates:

```bash
# Run all automated test suites across all phases
npm run test:all

# Run production build validation (Client Vite build + Prisma client generation)
npm run build
```

### Test Coverage Highlights
- `test-smart-hold.js`: 18/18 test cases validating hold window bounds, time validation, multi-skip progression, and tail movement.
- `test-part7-staff.js`: 14/14 test cases testing Desk #01 lifecycle, pause/resume/close, and concurrent `callNext()` transactions.
- `test-part8-events-notifications.js`: 16/16 test cases verifying immutable audit streams, pagination, and notification delivery.
- `test-part9-analytics.js`: 14/14 test cases verifying server-side aggregations, KPI calculations, and simulator isolation.
- `test-part10-e2e.js`: 17/17 end-to-end integration tests verifying cross-role authorization, privacy barriers, and full queue cycles.

---

## Production Deployment Guide

### 1. Database Deployment (Supabase / Railway PostgreSQL)
1. Provision a PostgreSQL instance on Supabase or Railway.
2. Retrieve the connection string URI.
3. Run migrations against production database:
   ```bash
   npx prisma migrate deploy
   ```
4. *(Optional for demo)* Run seed data:
   ```bash
   npx prisma db seed
   ```

### 2. Backend Deployment (Render / Railway)
- **Root Directory**: `server`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start` (runs `node src/server.js`)
- **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=5000` (or provider-assigned)
  - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE`
  - `JWT_SECRET=your_secure_random_production_secret`
  - `JWT_EXPIRES_IN=1d`
  - `CLIENT_URL=https://your-campusflow-frontend.vercel.app`

### 3. Frontend Deployment (Vercel)
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL=https://your-campusflow-backend.onrender.com/api`

---

## Hackathon Judge Demo Sequence (3-Minute Flow)

1. **Login as Student** (`student@campusflow.demo` / `Student@123`).
2. **Join Queue**: Select *Examination Cell* and click *Join Queue*. Point out dynamically calculated position and wait time.
3. **Declare Smart Hold**: Click *Declare Smart Hold*, enter a future time window (e.g. Next 30 minutes, Reason: "Class Lecture"). Show badge change to `HOLD`.
4. **Switch to Staff Control Center** in an incognito window (`staff@campusflow.demo` / `Staff@123`).
5. **Demonstrate Bounded Fair-Skip**:
   - Click **Call Next**.
   - Notice the system does NOT deadlock: the held token is skipped (`Skip 1/3`), and the next waiting student is called.
   - Show the toast and audit stream reflecting the skip event.
6. **Trigger Tail Ejection**: Call next until `maxSkips` (3) is reached. Show the token automatically transition to the tail with an updated notification sent to the student.
7. **Operational Analytics**: Navigate to `/staff/analytics` to show real-time KPI cards (Total Served, Avg Wait Time, Skip Rate, Hourly Traffic).
8. **Fairness Simulator**: Open `/staff/simulator`. Run a 20-student simulation with 3 skips to demonstrate the mathematical fairness curve and queue dynamics in an isolated sandbox.

---
