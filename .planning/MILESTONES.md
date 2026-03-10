# Milestones

## v1.1 Security, Audit & Guest Self-Registration (Shipped: 2026-03-10)

**Phases completed:** 5 phases (10-14), 7 plans, 19 tasks
**Files modified:** 54 | **LOC:** 39,260 TypeScript (+4,364 from v1.0)
**Timeline:** 1 day (2026-03-09 → 2026-03-10)
**Requirements:** 19/19 v1.1 requirements satisfied (100%)
**Git range:** `03d2803` → `06bbc0e`

**Key accomplishments:**
1. Schema migration — AuditLog model with immutable append-only entries + User mustChangePassword/lastLoginAt fields
2. Security hardening — First-login password change gate enforced in 3 places (portal layout, guest layout, API helper) with login tracking
3. Audit logging — Fire-and-forget audit writes on coordinator selection changes with paginated admin viewer and date filtering
4. Guest self-registration — Public registration with hardcoded GUEST role, faculty validation, and coordinator email notification
5. Coordinator guest list — Faculty-scoped paginated guest list with search for coordinators
6. Admin analytics dashboard — Active user charts (7d/30d AreaChart) and browser usage PieChart from session data via Recharts

**Archives:**
- [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)

---

## v1.0 MVP (Shipped: 2026-03-05)

**Phases completed:** 9 phases, 31 plans + 21 quick tasks
**Commits:** 197 files changed | **LOC:** 34,896 TypeScript (100 files)
**Timeline:** 8 days (2026-02-26 → 2026-03-05)
**Requirements:** 31/31 v1 requirements satisfied (100%)
**Tech Debt:** 2 integration warnings (coordinator filter on page slice, hardcoded file type badges)

**Key accomplishments:**
1. Full role-based web application — 5-role system (Admin, Coordinator, Manager, Student, Guest) with faculty-scoped access control
2. Student submission workflow — Draft/submit with title, file uploads to Vercel Blob, T&C agreement, academic year closure enforcement
3. Coordinator review system — Comment threading, selection toggle, review status tracking, download-before-comment gate
4. Manager oversight — Cross-faculty views, ZIP download, statistical/exception reports with PDF/Excel export
5. Guest magazine portal — Faculty-scoped read-only selected articles with year selector and summary dashboard
6. Upload rules enforcement — Admin-configurable file types, size limits, and upload toggle enforced at client and server
7. Server-side pagination for admin users and coordinator submissions tables

**Archives:**
- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
- [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

---
