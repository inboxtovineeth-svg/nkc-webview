# PRD — Nellai Karupatti Coffee · Manager Console

_Last updated: 2026-05-01_

## Original problem statement
> I wanted to build an employee management website … for a coffee shop named "Nellai Karupatti Coffee".
> Modules requested: Employee management (name, salary, address, mobile, emergency contact, address proof,
> toggle between current/ex-employee), Leave Management (month + per-employee text box, save to DB),
> Advance Entry (date selector + bulk amount + per-employee text box, save to DB), Salary Management
> (display current salary, leave taken, advance taken). Modern, elegant design with proper alignment.

## User personas
- **Shop Owner / Manager** — single admin user. Adds & manages staff, logs leaves and advances, views
  monthly salary statement. Runs the app locally on their own machine.

## Architecture
- **Backend**: FastAPI + MongoDB + JWT (httpOnly cookie) + bcrypt. UUID-based ids. Cascades leave and
  advance records on employee delete.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn primitives + Sonner toasts.
  Fonts: Fraunces (display) + DM Sans (body) + JetBrains Mono (numerics). Warm cream / espresso /
  amber palette.

## What's been implemented

### 2026-05-01 · Initial MVP
- Auth: login / logout / me; admin seeded from `backend/.env`.
- Employees: CRUD with mobile, emergency contact, address, address-proof type & number, salary, joining date, notes, status (current/ex). Per-row status toggle, filter chips, search.
- Leave Management: pick a month + per-employee days input + bulk save.
- Advance Entry: pick a date + optional bulk amount + per-employee input + save.
- Salary Management: pick a month → table + CSV export.
- Dashboard KPIs + landing page + elegant coffee-shop branding.

### 2026-05-01 · Enhancements (request 2)
- Employees: added `employment_type` toggle (Regular / Contract). Regular shows an amber badge, Contract a neutral badge.
- Salary rules:
  - Regular employees → first 2 leave days free, charge per-day from day 3 onward.
  - Contract employees → every leave day is deducted.
- New "Previous Month Due" column in Salary Management — if last month's net was negative, that negative amount is carried over and subtracted from this month's net (1-level lookup, no deep chain).
- Per-row "View Breakup" button → BreakupModal with: employee meta, figures breakdown, advance-entry sub-table for the month, Download CSV + Print actions.

## P0 backlog (next, suggested)
- Employee photo upload + ID-proof scan upload (object storage).
- Per-day attendance / shift logging (currently only monthly leave totals exist).
- Pay-slip PDF download per employee per month.
- Multi-shop / multi-location support.

## P1 backlog
- WhatsApp / SMS notification when salary is finalised for the month.
- Closeable advance-ledger view (per-employee history of advances given).
- Lockable months — once finalised, salary statement becomes read-only.
- Audit log of all edits.

## P2 backlog
- Tamil language toggle (UI is English today).
- Dark theme.
- iOS / Android wrapper for the manager console.

## Test credentials
See `/app/memory/test_credentials.md`.
