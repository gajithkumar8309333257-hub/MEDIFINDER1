# MediFinder — Intelligent Hospital Discovery & Appointment Platform

MediFinder is an evidence-based, mobile-first healthcare discovery platform that helps patients and family members discover nearby hospitals, understand expected patient load, inspect on-duty doctor availability, book appointments with capacity enforcement, and track live clinic queues before traveling.

---

## 🌟 Key Highlights & Architecture

- **Intelligent Crowd & Queue Engine**: Mathematically distinguishes **Expected Patient Load** (confirmed future bookings) from **Current Waiting Crowd** (checked-in patients waiting in queue).
- **Multi-Counter Waiting-Time Estimation**: Employs an $M/M/c$ multi-counter queuing approximation based on rolling average consultation durations from completed visits, returning realistic uncertainty bounds ($\text{min} - \text{max}$).
- **Data Freshness & Verification Separation**: Strictly distinguishes `updated_at` (database modification) from `verified_at` (real-world clinical verification), actively flagging stale data with warnings.
- **Atomic Booking Transactions**: Enforces slot capacity limits, generates unique opaque reference codes (`MF-2026-XXXX`), prevents duplicate bookings, and safely releases capacity upon cancellation.
- **Hospital Staff Operations Dashboard**: Role-scoped queue management permitting staff to register arrivals (`checked_in`), call patients (`called`), start consultations (`in_service`), complete consultations (`completed`), manage doctor duty rosters, and record crowd overrides.
- **Cross-Tab Real-Time Synchronization**: Instant broadcast updates via `BroadcastChannel` and Supabase Realtime integration.
- **Bilingual Support (English & Telugu)**: Full internationalization for the entire patient journey.
- **Interactive OpenStreetMap & Leaflet**: Haversine distance calculations, GPS location permission handling with fallback to manual search, and crowd-colored map markers.

---

## 🛠 Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 3
- **Icons**: Lucide React
- **Maps**: Leaflet & OpenStreetMap (custom DivIcons with crowd indicators)
- **Database & Security**: Supabase PostgreSQL with Row Level Security (RLS) policies, atomic stored procedures, and audit triggers
- **Testing**: Vitest, React Testing Library, JSDOM
- **Resilience**: Isomorphic persistence layer (zero-config local sync + full Supabase PostgreSQL migration ready)

---

## 🧮 Mathematical Queue & Waiting-Time Estimation

Unlike platforms that display arbitrary static numbers (such as an unexplained "20 minutes"), MediFinder computes waiting times dynamically:

### 1. Expected Patient Load (Future Arrivals)
$$\text{Expected Load} = \sum \text{Appointments}(\text{hospital\_id}, \text{today}, \text{status} = \text{'confirmed'})$$
Cancelled, completed, and no-show appointments are strictly excluded from future load.

### 2. Current Waiting Crowd
$$\text{Waiting Crowd} = \sum \text{Patients}(\text{status} \in \{\text{'checked\_in'}, \text{'called'}\})$$
Patients currently in consultation (`in_service`) or completed are tracked separately and not double-counted as waiting.

### 3. Waiting-Time Range Estimation
For a clinic with $c$ active counters and rolling average consultation duration $D_{\text{avg}}$:
$$\text{Central Estimate} = \frac{\text{Patients Ahead}}{c} \times D_{\text{avg}}$$
$$\text{Wait Range} = \left[\max(5, \lfloor 0.8 \times \text{Central} \rfloor), \; \lceil 1.3 \times \text{Central} \rceil + 5 \right]$$

### 4. Freshness Classification
- **Recent**: $\Delta t < 15 \text{ mins}$ (Green indicator)
- **Aging**: $15 \le \Delta t \le 60 \text{ mins}$ (Amber indicator)
- **Stale**: $\Delta t > 60 \text{ mins}$ (Red warning banner: *"Crowd status may be outdated. Call hospital to confirm."*)

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v24.16.0)
- npm v9+

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Run unit & integration test suite
npm run test

# 3. Start local development server
npm run dev

# 4. Build for production
npm run build
```

---

## 🗄 Database Schema & Supabase Setup

The production SQL schema is provided in `supabase/migrations/20261014000000_medifinder_schema.sql`.

### Tables Created:
1. `hospitals`: Hospital directory, coordinates, active counters, operating hours.
2. `doctors`: Doctor roster, specialties, fees, working hours, duty status.
3. `hospital_staff`: Staff authorization mapping to hospitals and roles.
4. `appointment_slots`: Doctor scheduling capacity constraints.
5. `appointments`: Atomic bookings, patient details, queue numbers, statuses.
6. `queue_events`: State transitions history (`confirmed` $\rightarrow$ `checked_in` $\rightarrow$ `called` $\rightarrow$ `in_service` $\rightarrow$ `completed`).
7. `crowd_updates`: Staff crowd level overrides with verification timestamps.
8. `audit_events`: Immutable audit trail of administrative actions.

### Connecting to Live Supabase:
Create a `.env` file from `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
Execute the SQL migration in the Supabase SQL Editor. Row Level Security policies are enabled by default.

---

## 🎬 Hackathon Live Demonstration Walkthrough Script

Follow these steps for a live demonstration:

1. **Discovery & Geolocation**:
   - Open the application. Explain that location is requested transparently to compute Haversine distance to nearby hospitals (Apollo Jubilee Hills, Yashoda Somajiguda, NIMS, Osmania, Continental).
   - Toggle language to **తెలుగు (Telugu)** to demonstrate full accessibility for local citizens.
2. **Review Intelligent Crowd & Freshness**:
   - Inspect Apollo Hospitals: note the **Recent (<15m)** freshness badge and the breakdown of **Waiting Patients** vs **Expected Patient Load**.
   - Inspect AIG Hospitals: note the **Stale (>60m)** warning banner instructing the patient to call reception before traveling.
3. **Book an Appointment (Patient Flow)**:
   - Click **Book Appointment** on Apollo Hospitals.
   - Select Doctor (e.g., Dr. K. S. Somaraju, Cardiology), choose a time slot, and enter patient details.
   - Submit: receive the unique reference code (e.g., `MF-2026-XXXX`) and sequential Queue Number.
4. **Staff Dashboard (Hospital Staff Flow)**:
   - Navigate to the **Staff Dashboard** tab.
   - Select Apollo Hospitals: note the newly booked appointment appearing under today's queue.
   - Click **Register Arrival** (`checked_in`). The patient enters the live waiting queue.
   - Open a second browser window or tab: notice the waiting crowd count updates instantly.
   - Advance through **Call Next** $\rightarrow$ **Start Consultation** $\rightarrow$ **Complete Consultation**.
   - Observe the live queue position and estimated wait time updating dynamically.

---

## 🔒 Security & Privacy Practices

- **Zero Secret Exposure**: Only the public anonymous Supabase key is used in frontend code; no service-role secrets.
- **Opaque Reference Codes**: Booking references are cryptographically random strings (`MF-2026-XXXX`), preventing enumeration attacks.
- **Role Scoping**: Hospital staff can only modify queue events and doctor availability for their designated hospital.
- **Audit Logging**: All cancellations, queue transitions, and doctor duty toggles are stored with actor identifiers and timestamps.

---

## 📄 License
MIT License. Built for the MediFinder Hackathon 2026.
