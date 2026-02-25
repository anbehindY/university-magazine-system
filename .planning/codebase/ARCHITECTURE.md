# ARCHITECTURE.md

## Overview

**Pattern:** Next.js 15 App Router — full-stack monolith with server components, API routes, and client components
**Domain:** University Magazine Contribution System
**Auth:** Better-Auth with role-based access control (5 roles)
**Data:** PostgreSQL via Prisma ORM
**Storage:** Vercel Blob for file uploads

---

## Architectural Layers

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer                                     │
│  app/(auth)/, app/(management)/, app/(student)/        │
│  - Server components for layouts                        │
│  - Client components ("use client") for interactive UI  │
└─────────────────────────────────────────────────────────┘
           │
┌─────────────────────────────────────────────────────────┐
│  API Layer                                              │
│  app/api/...                                            │
│  - Next.js Route Handlers (GET/POST/PUT/PATCH/DELETE)  │
│  - Auth checked on every request via auth.api.getSession│
└─────────────────────────────────────────────────────────┘
           │
┌─────────────────────────────────────────────────────────┐
│  Data Access Layer                                      │
│  lib/prisma.ts + prisma/schema.prisma                  │
│  - Prisma ORM with generated types                     │
│  - PostgreSQL (Neon serverless)                        │
└─────────────────────────────────────────────────────────┘
           │
┌─────────────────────────────────────────────────────────┐
│  Authentication Layer                                   │
│  lib/auth.ts + lib/auth-client.ts + lib/auth-helpers.ts │
│  - Better-Auth server-side config                       │
│  - admin plugin for role management                    │
│  - Session lifecycle hooks (ban check on session create)│
└─────────────────────────────────────────────────────────┘
```

---

## Route Groups & Access Control

### `app/(auth)/`
- `sign-in/page.tsx` — Public login page
- No auth required

### `app/(management)/`
- Layout: server component, passes user to sidebar
- `layout.tsx` — Shared sidebar + header for management users
- `page.tsx` — Dashboard (redirect/landing)
- `admin/page.tsx` — ADMINISTRATOR only — academic year, closure dates
- `admin/upload-rules/page.tsx` — Upload rule configuration
- `users/page.tsx` — ADMINISTRATOR only — user management

### `app/(student)/`
- Layout: same structure as management (sidebar + header)
- `submissions/page.tsx` — STUDENT submission workflow

### `app/api/`
- All routes validate session via `auth.api.getSession({ headers })`
- Admin routes (`/api/admin/*`) additionally check `role === "ADMINISTRATOR"`

---

## Role System

Defined in `lib/auth.ts` via Better-Auth admin plugin:

| Role | Access |
|------|--------|
| `ADMINISTRATOR` | Full system access, user management, closure dates |
| `MARKETING_MANAGER` | View all contributions, download ZIP after closure |
| `MARKETING_COORDINATOR` | Manage faculty contributions, interact with students |
| `STUDENT` | Submit articles and images |
| `GUEST` | Read-only access to faculty reports |

Faculty-scoped roles (STUDENT, MARKETING_COORDINATOR, GUEST) require a `facultyId` on the user record.

---

## Data Flow

### Submission Workflow
```
Student UI → POST /api/submissions (create DRAFT)
          → POST /api/submissions/upload (get Vercel Blob token)
          → upload files directly to Vercel Blob (client-side)
          → onUploadCompleted hook → creates SubmissionFile record
          → PUT /api/submissions (update status to SUBMITTED)
```

### Authentication Flow
```
sign-in page → better-auth email/password
→ session created (databaseHooks checks banned status)
→ session cookie set
→ server components read session via auth.api.getSession
→ client components use useSession() hook
```

---

## Key Abstractions

### `lib/auth-helpers.ts`
Server-side helper functions:
- `getCurrentUser()` — gets session user, returns null on error
- `requireRole(allowedRoles[])` — checks role authorization
- `isAdmin()`, `isCoordinator()`, `isManager()` — role checks

### `lib/prisma.ts`
Singleton Prisma client (prevents connection exhaustion in dev).

### `components/app-sidebar.tsx`
Shared sidebar navigation, role-aware nav items.

---

## Entry Points

- `app/layout.tsx` — Root HTML shell, fonts, Toaster
- `app/(management)/layout.tsx` — Management shell (sidebar + header)
- `app/(student)/layout.tsx` — Student shell (identical structure)
- `app/api/auth/[...all]/route.ts` — Better-Auth catch-all handler

---

## Configuration

- `next.config.ts` — Next.js config
- `prisma/schema.prisma` — Database schema
- `prisma.config.ts` — Prisma client config (generated output path)
- `.env` — `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `BETTER_AUTH_SECRET`
