# University Magazine Contribution System

## What This Is

A secure, role-based web application for collecting and managing student contributions to a university annual magazine. Students submit Word documents and images through a structured workflow with academic year closure dates and T&C agreement. Marketing Coordinators review, comment, and select contributions for publication. A Marketing Manager oversees all faculties, accesses statistical and exception reports, and downloads selected submissions as a ZIP archive. Guests view selected work for their assigned faculty.

## Core Value

Students can submit and manage their contributions, and coordinators can review, comment, and select work for publication — all within enforced academic year closure windows.

## Requirements

### Validated

- ✓ User authentication with email/password — existing
- ✓ Role-based access control (5 roles) — existing
- ✓ Faculty structure with per-user assignment — existing
- ✓ Administrator user management (create, edit, ban, reactivate) — existing
- ✓ Student submission workflow (DRAFT/SUBMITTED) — existing
- ✓ File upload to Vercel Blob — existing
- ✓ Terms & Conditions agreement — existing
- ✓ Academic year configuration — existing
- ✓ Upload rules configuration — existing
- ✓ Dual closure dates (first blocks new submissions, final blocks all updates) — v1.0
- ✓ Submission model with selection flag, faculty/year snapshots — v1.0
- ✓ Comment threading (submission-level, two-way) — v1.0
- ✓ Email notifications via Nodemailer/Gmail SMTP — v1.0
- ✓ Closure enforcement on all mutation routes — v1.0
- ✓ Coordinator faculty-scoped submission access — v1.0
- ✓ Coordinator email on new submission — v1.0
- ✓ Coordinator selection toggle and notes editing — v1.0
- ✓ Comment system (coordinator + student, role-scoped visibility) — v1.0
- ✓ Manager cross-faculty selected submissions view — v1.0
- ✓ Manager ZIP download (Faculty/Student/files structure) — v1.0
- ✓ Guest read-only selected submissions view — v1.0
- ✓ Guest faculty-scoped reports access — v1.0
- ✓ Statistical reports (per-faculty counts, percentages, contributors) — v1.0
- ✓ Exception reports (no comment, 14-day overdue) — v1.0
- ✓ Reports role-scoped (coordinator/guest see faculty, manager/admin see all) — v1.0
- ✓ Full UI layer for all roles with UAT verification — v1.0
- ✓ Active year validation (cannot activate past academic years) — v1.0
- ✓ Upload rules enforcement (file types, sizes, toggle) at client and server — v1.0
- ✓ Student comment thread with reply and SWR polling — v1.0
- ✓ Coordinator review status tracking (Pending/Reviewing/Commented) — v1.0
- ✓ Coordinator download-before-comment gate — v1.0
- ✓ Server-side pagination for admin users and coordinator submissions — v1.0
- ✓ PDF/Excel report export for managers and coordinators — v1.0
- ✓ Guest multi-year selected submissions with year selector — v1.0
- ✓ Guest summary dashboard (selected articles, percentages, contributors) — v1.0
- ✓ Auto-deactivation of past academic years — v1.0
- ✓ Toast notifications for admin actions — v1.0
- ✓ Student submissions separated by academic year (current editable, archived read-only) — v1.0
- ✓ Manager read-only submission detail slide-over — v1.0

- ✓ First-login password change gate (3 enforcement points) — v1.1
- ✓ Admin-created users flagged with mustChangePassword — v1.1
- ✓ Last login timestamp with welcome message — v1.1
- ✓ Login tracking on successful session creation only — v1.1
- ✓ Immutable audit log for coordinator selection changes — v1.1
- ✓ Admin audit log viewer with pagination and date filtering — v1.1
- ✓ Guest self-registration with hardcoded GUEST role — v1.1
- ✓ Coordinator email notification on guest registration — v1.1
- ✓ Coordinator faculty-scoped guest list — v1.1
- ✓ Admin analytics dashboard (active users, browser usage) via Recharts — v1.1
- ✓ Self-service profile page (name update, password change) — v1.1

### Active

(No active requirements — next milestone not yet defined)

### Out of Scope

| Feature | Reason |
|---------|--------|
| Per-file comments | Comments are submission-level only |
| Coordinator file replacement | Metadata-only editing confirmed |
| Real-time updates (WebSocket/SSE) | Low-frequency use; polling sufficient |
| Production email delivery | Gmail SMTP for testing; config swap |
| Student editing after final closure | Hard stop enforced |
| Comment editing or deletion | Append-only preserves accountability |
| Student-to-student visibility | Per-student isolation required |
| Pre-generated ZIP | On-demand sufficient at scale |
| Native mobile app | Web-first; responsive via Tailwind |
| Rich text comments | Plain text sufficient |
| Password complexity policy engine | Zod min-length validation is sufficient |
| Coordinator guest account management | Read-only list; admin handles user management |
| Client-side analytics (Google Analytics) | Privacy concerns; server-side tracking preferred |
| Audit log entry deletion or editing | Immutable by design for accountability |
| Real-time analytics dashboard | WebSocket/SSE out of scope per constraints |
| Guest approval workflow | Auto-approve with admin ban fallback is sufficient |
| User self-service email change | Email is the login identifier; admin-only change prevents account confusion |

## Context

Shipped v1.1 with 39,260 LOC TypeScript. Cumulative: 14 phases, 38 plans + 21 quick tasks.
Tech stack: Next.js 16, React 19, Prisma 7, PostgreSQL (Neon), Better Auth, Vercel Blob, Nodemailer, Tailwind CSS 4, shadcn/ui, jsPDF + jspdf-autotable, xlsx, Recharts, ua-parser-js.
v1.0: 9 phases (31 plans) + 21 quick tasks over 8 days. 31/31 requirements satisfied.
v1.1: 5 phases (7 plans) in 1 day. 19/19 requirements satisfied. All UAT passed.
2 v1.0 tech debt items still open (coordinator filter on page slice, hardcoded file type badges).

## Constraints

- **Tech stack**: Next.js 16 App Router, TypeScript, Prisma, PostgreSQL — must stay consistent
- **File storage**: Vercel Blob — all uploads stay on this provider
- **Email**: Nodemailer + Gmail SMTP — testing only, not production scale
- **Auth**: Better Auth admin plugin — role management within its constraints
- **Coordinator scope**: Faculty-scoped access enforced at API layer

## Assumptions

1. "Editing" by a coordinator means metadata (notes, title) only
2. Comments are two-way threads at the submission level (not per-file)
3. "Selected for publication" is a simple boolean flag
4. ZIP includes all files from selected submissions, organised by Faculty > Student > files
5. First closure blocks new submissions; final closure blocks all updates including comments
6. Reports are role-scoped (coordinator/guest see their faculty; manager/admin see all)
7. Exception "14 days" measures from student's submittedAt to finalClosureDate
8. Guest accounts created by administrator or via self-registration (GUEST role)
9. Users can self-service their display name and password; email, role, and faculty are read-only (admin-managed)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Comments on submission (not per-file) | Simpler model; matches workflow | ✓ Good |
| SMTP/Gmail for emails | Testing only; easy to swap | ✓ Good |
| ZIP on-demand (not pre-generated) | No background jobs; files on Blob | ✓ Good |
| Metadata-only coordinator edit | Preserves student file integrity | ✓ Good |
| Serial blob streaming for ZIP | Avoids memory exhaustion from Promise.all | ✓ Good |
| SWR with 15s polling for comments | Simple; avoids WebSocket complexity | ✓ Good |
| Closure guard returns false (not throws) | Callers decide response; cleaner API | ✓ Good |
| Single-active-year via $transaction | Prevents data inconsistency | ✓ Good |
| Optimistic UI for selection toggle | Immediate feedback; rollback on error | ✓ Good |
| Raw SQL for statistical reports | COUNT(DISTINCT) not in Prisma ORM | ✓ Good |
| Active year validation (current/future only) | Prevents accidental past-year activation | ✓ Good |
| Server-side redirect for GUEST role | Eliminates portal sidebar flash on login | ✓ Good |
| useRef + useState counter for download tracking | Avoids re-render cost; counter triggers freshness | ✓ Good |
| Raw SQL for guest summary stats | Matches reports API pattern; runs in Promise.all | ✓ Good |
| Session-scoped download gate (not server-side) | Simple UX enforcement; no DB schema change | ✓ Good |
| Separate (guest) route group with own layout | Isolates guest experience from portal sidebar | ✓ Good |
| AuditLog action as String (not enum) | Flexible action types without migration per new action | ✓ Good |
| Immutable audit entries (no updatedAt) | Append-only preserves accountability (AUDIT-02) | ✓ Good |
| mustChangePassword default false | Safe migration; existing users unaffected | ✓ Good |
| Password change gate in 3 places | Portal layout, guest layout, requireRole API helper — no bypass | ✓ Good |
| Fire-and-forget audit writes | .catch(console.error) avoids blocking selection toggle | ✓ Good |
| GUEST role hardcoded server-side | First public write endpoint; never reads role from request body | ✓ Good |
| No auto-sign-in after registration | Redirect to sign-in page; simpler and more secure | ✓ Good |
| UAParser named import | Turbopack ESM compatibility (default import fails at build) | ✓ Good |
| Cumulative daily count in-memory | Single session query, no N+1; computed in-memory | ✓ Good |
| additionalFields with input:false | Prevents client-side manipulation of mustChangePassword/lastLoginAt | ✓ Good |
| Profile: name-only self-service, email read-only | Email is the login identifier; name is safe to self-service | ✓ Good |
| Current password required for profile password change | Prevents changes on unattended sessions | ✓ Good |

---
*Last updated: 2026-03-10 after v1.1 milestone*
