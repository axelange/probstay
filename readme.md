# BSTAY ERP

> Internal ERP & Document Management System for BSTAY Luxury Real Estate.

---

# Overview

BSTAY ERP is the internal application used by BSTAY to manage:

- Luxury rental properties
- Property owners
- Rental agents
- Seasonal rentals
- Property documents
- KYC
- Expenses
- Contracts
- Invoices
- Property Management
- Availability Calendar
- Financial workflows

Unlike the public website, this application stores sensitive information and is intended only for authenticated collaborators.

---

# Main Features

## Authentication

- Secure Login
- Multi-Factor Authentication (MFA)
- Role Based Access Control (RBAC)
- Row Level Security (RLS)

---

## APIMO Synchronization

The application synchronizes with APIMO to retrieve:

- Properties
- Contacts
- Owners
- Agents
- Providers

APIMO remains the source of truth for CRM data.

---

## Property Management

- Property Details
- Owners
- Documents
- Availability
- Expenses
- Maintenance
- Calendar

---

## Rental Management

- Inquiry
- Proposal
- Contract
- KYC
- Deposit
- Balance
- Security Deposit
- Check-In
- Check-Out
- Closed

---

## Document Management (GED)

- Contracts
- Mandates
- KYC
- Passports
- IBAN
- Property Documents
- Invoices
- Signed Documents

Documents are stored securely inside Supabase Storage.

---

## Financial Management

- Rental Breakdown
- Expenses
- Owner Statements
- Agency Fees
- Security Deposits
- Tax
- Cleaning
- Repairs

---

## PDF Generation

Generate documents directly from the application.

Examples:

- Rental Mandate
- Sales Mandate
- Seasonal Contract
- Invoice
- Owner Statement

---

# Technology Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Table

---

## Backend

- Next.js Server Actions
- Route Handlers
- PostgreSQL Functions

---

## Database

- Supabase
- PostgreSQL
- Row Level Security
- Supabase Auth
- Supabase Storage

---

## External APIs

- APIMO API

---

## Infrastructure

- GitHub
- Vercel
- Supabase
- Sentry
- Resend

---

# Project Architecture

```
app/
│
├── (auth)
├── dashboard
├── properties
├── rentals
├── contacts
├── expenses
├── documents
├── invoices
├── calendar
├── settings
└── api

components/

lib/

services/

hooks/

types/

utils/

supabase/

public/
```

---

# Database

Main entities:

- Users
- Roles
- Properties
- Contacts
- Rentals
- Expenses
- Documents
- Payments
- Invoices
- Audit Logs

---

# Security

The application stores sensitive information.

Security principles:

- MFA required
- Row Level Security
- Private Storage
- Signed URLs
- Audit Logs
- Least Privilege
- Server-side API calls
- No APIMO credentials exposed to the client

---

# User Roles

- Super Admin
- Admin
- Manager
- Agent
- Accounting
- Viewer

---

# Development

## Requirements

- Node.js 22+
- npm
- Git
- Supabase CLI

---

## Installation

```bash
git clone https://github.com/your-org/bstay-erp.git

cd bstay-erp

npm install
```

---

## Environment

Create:

```
.env.local
```

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

APIMO_API_URL=

APIMO_API_TOKEN=

RESEND_API_KEY=

SENTRY_AUTH_TOKEN=
```

Never commit secrets.

---

## Run locally

```bash
npm run dev
```

---

## Build

```bash
npm run build
```

---

## Lint

```bash
npm run lint
```

---

## Folder Philosophy

Business logic must never be placed inside components.

Components should only display data.

Database access must go through dedicated services.

---

# Workflow

```
APIMO
    │
    ▼
Synchronization
    │
    ▼
Supabase Database
    │
    ├────────► Internal ERP
    │
    └────────► Public Website API
```

---

# Roadmap

## Phase 1

- Authentication
- Users
- Roles
- APIMO Sync
- Properties

---

## Phase 2

- Rentals
- Calendar
- Expenses
- Documents

---

## Phase 3

- Contracts
- PDF Generator
- Invoices

---

## Phase 4

- Accounting
- Owner Statements
- Notifications

---

## Phase 5

- Dashboard
- Analytics
- Automation

---

# Coding Standards

- TypeScript Strict Mode
- ESLint
- Prettier
- Feature-based architecture
- Small reusable components
- Server Components by default
- Client Components only when required

---

# Git Branches

```
main
dev
```

---

# License

Private project.

Copyright © BSTAY.

All rights reserved.