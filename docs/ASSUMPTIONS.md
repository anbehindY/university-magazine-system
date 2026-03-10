# Assumptions — University Magazine Contribution System

> Documents the original system criteria, assumptions made during development, and how each was addressed across v1.0 and v1.1.

---

## Original System Criteria

The system was built from the following specification:

| # | Criterion | Version | How Addressed |
|---|-----------|---------|---------------|
| 1 | The University has a Marketing Manager to oversee the process | v1.0 | MARKETING_MANAGER role with cross-faculty view of all selected submissions, ZIP download, and statistical/exception reports |
| 2 | All Faculties have a Marketing Coordinator who is responsible for managing the process for their Faculty | v1.0 | MARKETING_COORDINATOR role with faculty-scoped access enforced at API layer |
| 3 | All students have the opportunity to submit one or more articles as Word documents to the magazine | v1.0 | Student submission workflow with Word document uploads to Vercel Blob, DRAFT/SUBMITTED status flow |
| 4 | All students can also upload high quality images, e.g. photographs | v1.0 | Multi-file upload supporting images (JPEG, PNG, GIF, WebP) alongside Word documents, configurable via admin upload rules |
| 5 | All new contributions are disabled after a closure date for new entries, but updates can continue to be done until a final closure date | v1.0 | Dual closure dates — first closure blocks new submissions, final closure blocks all updates including comments |
| 6 | All students must agree to Terms and Conditions before they can submit | v1.0 | T&C agreement checkbox required before submission; `agreed` field on submission model |
| 7 | Once a contribution is submitted the system emails a notification to the Faculty's Marketing Coordinator, who must make a comment within 14 days | v1.0 | Nodemailer/Gmail SMTP notification on submission; 14-day exception report for overdue comments |
| 8 | A Marketing Coordinator can only access contributions by students in their Faculty | v1.0 | Faculty-scoped access enforced at API layer — coordinator queries filter by `user.facultyId` |
| 9 | Each Marketing Coordinator needs to be able to interact with the students in their Faculty in order to edit the contributions and to select those for publication | v1.0 | Comment threading (two-way), selection toggle with optimistic UI, notes editing, review status tracking (Pending/Reviewing/Commented) |
| 10 | The University Marketing Manager can view all the selected contributions but cannot edit any. They need to be able to download all the selected contributions after the final closure date in a ZIP file | v1.0 | Manager read-only cross-faculty view with slide-over detail. ZIP download (Faculty/Student/files structure) via serial blob streaming |
| 11 | An administrator maintains any system data, e.g. closure dates for each academic year | v1.0 | Admin user management (create, edit, ban, reactivate), academic year configuration, upload rules configuration, closure date management |
| 12 | A guest account for each Faculty can be used to view the selected reports | v1.0 | GUEST role with faculty-scoped read-only access to selected submissions, summary dashboard, and reports. Separate route group with own layout |
| 13 | Statistical analysis needs to be available | v1.0 | Per-faculty contribution counts, percentages, contributor counts — with PDF/Excel export |
| 14 | The interface must be suitable for all devices | v1.0 | Responsive via Tailwind CSS 4 utility classes; mobile-first component design with shadcn/ui |

### Additional Requirements (Released Week 6)

| # | Criterion | Version | How Addressed |
|---|-----------|---------|---------------|
| A1 | System reminds every user of the date and time they last logged in (or welcomes them on first login) | v1.1 | Welcome card on dashboard showing last login timestamp via `lastLoginAt` field; "first login" message for new users; recorded on successful session creation only |
| A2 | Administrator can view reports showing which pages are most viewed, which users are most active, which browsers are being used | v1.1 | Admin analytics dashboard with active user counts (7d/30d), cumulative active users AreaChart, browser usage PieChart — all derived from existing session data (userAgent parsing via ua-parser-js) |
| A3 | When a guest account is registered for each faculty, the system emails a notification to the Faculty's Marketing Coordinator | v1.1 | Fire-and-forget coordinator email notification on guest self-registration via Nodemailer |
| A4 | Faculty's Marketing Coordinators can view the list of guests in their faculty | v1.1 | Faculty-scoped guest list page with pagination and search, accessible from coordinator sidebar |

---

## Assumptions Made

Assumptions documented during development, with rationale and outcomes.

### Role & Access Assumptions

| # | Assumption | Rationale | Outcome |
|---|-----------|-----------|---------|
| A-01 | 5 fixed roles: ADMINISTRATOR, MARKETING_MANAGER, MARKETING_COORDINATOR, STUDENT, GUEST | Specification lists exactly these roles with distinct permissions | ✓ Correct — no additional roles needed |
| A-02 | Each user belongs to exactly one faculty (except Admin and Manager who are cross-faculty) | Coordinators manage "their Faculty"; students submit to "their Faculty" | ✓ Correct — facultyId on User model, nullable for admin/manager |
| A-03 | Admin creates user accounts (v1.0); guests can also self-register (v1.1) | v1.0 spec says "a guest account for each Faculty"; v1.1 adds self-registration | ✓ Both paths implemented |
| A-04 | Guest accounts are immediately active after registration (no approval gate) | Spec does not mention approval workflow; admin can ban if needed | ✓ Sufficient — auto-approve with admin ban fallback |

### Submission Workflow Assumptions

| # | Assumption | Rationale | Outcome |
|---|-----------|-----------|---------|
| A-05 | "Editing" by a coordinator means metadata (notes, title) only — not replacing student files | Spec says coordinators "edit the contributions" but replacing student files undermines integrity | ✓ Good — preserves student file integrity |
| A-06 | Comments are two-way threads at the submission level (not per-file) | Spec says coordinator must "make a comment" on a contribution, not on individual files | ✓ Good — simpler model matches workflow |
| A-07 | "Selected for publication" is a simple boolean flag, not a multi-stage workflow | Spec says coordinators "select those for publication" — binary decision | ✓ Good — coordinator toggles selection on/off |
| A-08 | ZIP includes all files from selected submissions, organised by Faculty > Student > files | Spec says manager downloads "all the selected contributions" — natural folder hierarchy | ✓ Good — clear organisation for transfer out of system |
| A-09 | First closure blocks new submissions; final closure blocks ALL updates including comments | Spec says "new contributions are disabled" then "updates can continue until final closure" | ✓ Good — enforced on all mutation routes |

### Reports Assumptions

| # | Assumption | Rationale | Outcome |
|---|-----------|-----------|---------|
| A-10 | Reports are role-scoped: coordinator/guest see their faculty; manager/admin see all faculties | Coordinators can only access their faculty's data; managers oversee all | ✓ Good — consistent with access control |
| A-11 | Exception "14 days" measures from student's `submittedAt` to `finalClosureDate` | Spec says coordinator "must make a comment within 14 days" of submission | ✓ Good — clear measurement window |
| A-12 | "Which pages are most viewed" (A2) is satisfied by active user analytics from session data rather than per-page tracking | Adding a PageView model and client-side tracking increases complexity significantly; session-based analytics shows user activity patterns | ✓ Sufficient — active users and browser usage cover the intent without extra infrastructure |

### Technical Assumptions

| # | Assumption | Rationale | Outcome |
|---|-----------|-----------|---------|
| A-13 | Gmail SMTP is for testing/development only, not production email delivery | Spec does not specify email provider; Gmail has sending limits | ✓ Correct — easy to swap via env config |
| A-14 | On-demand ZIP generation (no pre-generated archives) | Spec does not require instant download; files are on Vercel Blob | ✓ Good — no background job infrastructure needed |
| A-15 | SWR with 15s polling is sufficient for comment updates (no WebSocket/SSE) | Low-frequency use case; real-time not specified | ✓ Good — avoids WebSocket complexity |
| A-16 | Responsive design via Tailwind CSS satisfies "suitable for all devices" | Spec says interface must work on mobile, tablets, desktops | ✓ Good — utility-first CSS handles responsive layouts |

### Security Assumptions (v1.1)

| # | Assumption | Rationale | Outcome |
|---|-----------|-----------|---------|
| A-17 | Only admin-created users need forced password change; self-registered guests chose their own password | Admin sets temporary passwords; guests choose during registration | ✓ Good — `mustChangePassword` defaults to false |
| A-18 | Password change gate must be enforced in 3 places to prevent bypass | Portal layout, guest layout, and API route helper — covering all access paths | ✓ Good — no bypass via direct URL |
| A-19 | Audit log is append-only (no update or delete operations) | Immutability ensures accountability for publication decisions | ✓ Good — AUDIT-02 requirement met |
| A-20 | Guest self-registration hardcodes GUEST role server-side | First public write endpoint — must prevent privilege escalation | ✓ Good — never reads role from request body |

---

## Reports Implemented

### Statistical Reports (v1.0)

- Number of contributions within each Faculty for each academic year
- Percentage of contributions by each Faculty for any academic year
- Number of contributors within each Faculty for each academic year
- Export to PDF and Excel

### Exception Reports (v1.0)

- Contributions without a comment
- Contributions without a comment after 14 days

### Analytics Reports (v1.1)

- Active user counts for the last 7 days and 30 days
- Active users trend chart (cumulative AreaChart)
- Browser usage breakdown chart (PieChart via ua-parser-js)
- All derived from existing session data (no separate page view tracking)

---

*Last updated: 2026-03-10 after v1.1 milestone*
