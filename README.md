# Agents Portal

Agents Portal is an internal operations platform for an insurance sales and retention team.

It is designed to manage the full lifecycle of a lead, from intake and verification through call-result updates, transfer/submission workflows, retention handling, and agent/vendor performance reporting.

## What This Project Is Designed For

This system centralizes day-to-day insurance operations that are often split across multiple tools (forms, spreadsheets, CRMs, Slack, and carrier workflows).

Core use cases:
- Receive and store inbound lead data from external systems (including Zapier/JotForm-style payloads).
- Let teams update call outcomes with structured policy and disposition data.
- Operate a Daily Deal Flow board with filtering, editing, and export/reporting.
- Route work by role (center users, licensed agents, retention/buffer agents, admins).
- Manage callback and retention handoffs between agents with notifications.
- Provide analytics and performance views by agent, carrier, vendor, and day.

## Primary Roles and Access Model

The app enforces role-aware navigation and route protection with Supabase auth plus DB-backed role checks.

Primary role patterns implemented in code:
- `Center user` (lead vendor): access to center-specific lead pages and callback/Medalert flows.
- `Licensed agent`: access to commission portal, inbox/tasks, policy lookup, and dashboard.
- `Buffer/retention agent`: access to retention task and lookup workflows.
- `Admin/authorized ops users`: access to management/reporting utilities and admin analytics.
- `Restricted users`: redirected to limited workflow access (primarily Daily Deal Flow).

Role checks are implemented through:
- `agent_status` table lookups for licensed agents.
- `centers` table lookups for center users.
- `profiles`-based checks for buffer/retention agent behavior.
- Route guards in protected React components.

## End-to-End Workflow Overview

### 1) Lead Intake and Storage
- External systems post lead payloads into Supabase Edge Functions (e.g., `process-lead`).
- Function validates required identifiers (`submission_id`), deduplicates, and writes to `leads`.
- Leads become available in dashboard, center portal, and downstream call workflows.

### 2) Daily Operations Dashboard
- Authenticated users access dashboard views of leads and statuses.
- Dashboard reads leads + related call results + verification session state.
- Teams can filter/search leads, monitor pipeline health, and handle claim/handoff actions.

### 3) Call Result Update and Verification
- Agents open call-result pages per submission.
- The app fetches lead details, call state, and verification session state.
- Verification can be started/resumed; call outcomes are recorded and linked to lead records.

### 4) Daily Deal Flow Management
- `daily_deal_flow` is treated as an operational board with server-side filters and paging.
- Teams can track status, carrier/product details, premium/face amount, callback/retention markers, and notes.
- Export/reporting helpers support EOD/weekly reporting and downstream sync needs.

### 5) Retention and Agent Handoff
- Retention workflow coordinates callback and LA-ready handoff between retention and licensed agents.
- Edge functions send/record notifications (including Slack integrations).
- Duplicate protections and verification-session linkage are implemented for reliability.

### 6) Center (Lead Vendor) Portal
- Center users are scoped to vendor-specific leads.
- They can review their lead inventory, request callbacks, and create leads (where enabled).
- Medalert views are available only to approved lead vendors.

### 7) Analytics and Admin Operations
- Admin analytics surfaces performance by agents/vendors/carriers/daily outcomes.
- Monday.com board data is pulled and cached for analytics pages.
- User management edge function supports listing users and ban/unban operations.

## Architecture

### Frontend
- React + TypeScript + Vite
- UI with shadcn/Radix components
- Routing with `react-router-dom`
- Data fetching/caching with React Query

### Backend (Supabase)
- Supabase Auth for authentication/session handling
- PostgreSQL tables + RLS policies
- SQL migrations under `supabase/migrations`
- Supabase Edge Functions for business logic and integrations

### Integrations
- Monday.com (policy/analytics data)
- Slack (notifications, retention/callback workflows)
- Google Sheets / Google Drive flows
- USPS address validation
- Additional workflow helper functions (GHL sync, notifications, transfer/callback utilities)

## Key Routes (High-Level)

Public:
- `/`
- `/auth`
- `/center-auth`

Operational protected pages include:
- `/dashboard`
- `/call-result-update`
- `/daily-deal-flow`
- `/transfer-portal`
- `/submission-portal`
- `/agent-licensing`
- `/licensed-agent-inbox`
- `/retention-tasks`
- `/admin-analytics/*`

Center-specific protected pages include:
- `/center-lead-portal`
- `/center-calendar-view`
- `/center-callback-request`
- `/medalert-leads`
- `/medalert-quote`

## Repository Structure

Top-level directories of note:
- `src/`: React frontend pages, components, hooks, and libs.
- `supabase/`: migrations, function source, and Supabase config.
- `Doc/`: legacy and feature-specific project documentation.
- `Doc/root-level-docs/`: moved root markdown documents.
- `sql/`: moved root SQL helper/test scripts.
- `ps1/`: moved root PowerShell helper/test scripts.
- `scripts/`: Node/TS helper scripts (e.g., CSV import).

## Local Development

### Prerequisites
- Node.js 18+
- npm
- Supabase project access (for API keys/functions)

### Install
```bash
npm install
```

### Run
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

## Environment Variables

Use `.env` based on `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MONDAY_API_TOKEN`
- `VITE_MONDAY_BOARD_ID` (optional override)

Edge Functions additionally rely on server-side secrets in Supabase (examples in function code):
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_BOT_TOKEN`
- Other provider credentials as required by each function

## Supabase Functions (Examples)

The project contains a broad set of edge functions under `supabase/functions`, including:
- lead ingestion and processing (`process-lead`, `create-lead`)
- call/deal-flow updates (`create-daily-deal-flow-entry`, `update-daily-deal-flow-entry`)
- retention/callback notifications (`retention-call-notification`, `callback-notification`)
- vendor/center notifications (`center-notification`, `center-transfer-notification`)
- enrichment/utility functions (`validate-usps-address`, `dnc-lookup`, Monday helpers)
- administrative endpoints (`user-management`)

## Operational Notes

- Access control is a major part of application behavior; role checks directly affect route availability and menu visibility.
- A substantial part of business logic lives in Supabase functions and SQL migrations, not only in frontend code.
- The project has many workflow-specific docs and scripts; reference `Doc/` and `Doc/root-level-docs/` when tracing historical implementation decisions.

## Suggested Next Step

If you want, I can generate a second file (`ARCHITECTURE.md`) with:
- exact table-level data flow
- route-to-role matrix
- function-by-function integration map
- sequence diagrams for lead intake and retention handoff.
