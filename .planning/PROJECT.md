# University Magazine Contribution System

## What This Is

A secure, role-based web application for collecting and managing student contributions to a large university's annual magazine. Students submit Word documents and images through a structured workflow with closure dates, T&C agreement, and coordinator oversight. Coordinators review, comment, and select contributions for publication; a Marketing Manager downloads selected work as a ZIP after final closure.

## Core Value

Students can submit and manage their contributions, and coordinators can review, comment, and select work for publication — all within enforced academic year closure windows.

## Requirements

### Validated

<!-- Already built and confirmed in codebase -->

- ✓ User authentication with email/password — existing
- ✓ Role-based access control (5 roles: ADMINISTRATOR, MARKETING_MANAGER, MARKETING_COORDINATOR, STUDENT, GUEST) — existing
- ✓ Faculty structure with per-user faculty assignment — existing
- ✓ Administrator can create, edit, ban, and reactivate user accounts — existing
- ✓ Student can submit Word documents and images (DRAFT/SUBMITTED workflow) — existing
- ✓ File upload to Vercel Blob (Word .doc/.docx and images) — existing
- ✓ Terms & Conditions agreement field on submission — existing
- ✓ Academic year configuration by administrator — existing
- ✓ Upload rules configuration by administrator — existing

### Active

**Submission workflow:**
- [ ] Student cannot create new submissions after the first closure date
- [ ] Student cannot update any submissions after the final closure date
- [ ] Student must accept Terms & Conditions before submitting (gate enforced, not just stored)

**Coordinator workflow:**
- [ ] Marketing Coordinator can view only submissions from students in their own faculty
- [ ] Marketing Coordinator receives email notification (SMTP/Gmail via Nodemailer) when a student submits
- [ ] Marketing Coordinator can add comments to a submission; student can reply (two-way thread per submission)
- [ ] Marketing Coordinator can edit submission metadata (notes/title)
- [ ] Marketing Coordinator can mark/unmark a submission as "Selected for Publication"

**Marketing Manager workflow:**
- [ ] Marketing Manager can view all selected contributions (read-only, all faculties)
- [ ] Marketing Manager can download a ZIP of all files from selected submissions after the final closure date
- [ ] ZIP is organised by Faculty > Student > files

**Guest access:**
- [ ] Guest can view selected submissions for their assigned faculty (read-only)
- [ ] Guest can view reports for their faculty

**Reports (role-scoped):**
- [ ] Number of contributions per faculty for each academic year
- [ ] Percentage of contributions by each faculty for any academic year
- [ ] Number of contributors (distinct students) per faculty for each academic year
- [ ] Exception report: contributions without a coordinator comment
- [ ] Exception report: contributions submitted more than 14 days ago without a coordinator comment
- [ ] Reports scoped by role: Coordinator sees their faculty only; Manager/Admin see all; Guest sees their faculty

**Infrastructure:**
- [ ] Nodemailer configured with SMTP (Gmail for testing)
- [ ] ZIP generation on-demand for selected submission files

### Out of Scope

| Feature | Reason |
|---------|--------|
| Coordinator replacing/re-uploading student files | Requirements specify metadata edit only |
| Per-file comments | Comments are on the submission level only |
| Production-ready email delivery | SMTP/Gmail for testing purposes |
| Student can edit after final closure | Enforced hard stop |
| Real-time collaboration or live editing | Outside magazine contribution scope |
| Mobile app | Web-first; responsive via Tailwind/shadcn |

## Context

- Built on Next.js 15 App Router (full-stack), Better-Auth, Prisma + PostgreSQL (Neon), Vercel Blob, Tailwind CSS + shadcn/ui
- Codebase is brownfield — core auth, user management, submission flow, and faculty structure already exist
- Academic year model already has first/final closure date fields (partially implemented in admin UI)
- The submission page is the largest file (1,126 lines) — refactoring may be warranted alongside new features

## Constraints

- **Tech stack**: Next.js 15 App Router, TypeScript, Prisma, PostgreSQL — must stay consistent
- **File storage**: Vercel Blob — all uploads stay on this provider
- **Email**: Nodemailer + Gmail SMTP — testing only, not production scale
- **Auth**: Better-Auth admin plugin — role management must work within its constraints
- **Coordinator scope**: Faculty-scoped access is enforced at the API layer, not just the UI

## Assumptions

1. "Editing" by a coordinator means metadata (notes, title) only — not replacing or modifying the student's actual Word doc or image files
2. Comments are a two-way thread at the submission level (not per-file)
3. "Selected for publication" is a simple boolean flag on a submission (not a multi-stage approval workflow)
4. The ZIP download includes all files (Word docs + images) from all submissions flagged as Selected, organised by Faculty > Student > files
5. "First closure date" blocks new submissions; "final closure date" blocks all updates including comments
6. Reports are accessible to all roles but scoped to their access level (coordinators see their faculty; guests see their faculty; manager/admin see everything)
7. Exception report "after 14 days" measures from the student's `submittedAt` timestamp
8. Guest accounts are created by the administrator (same user creation flow, GUEST role)
9. Mobile responsiveness is delivered via existing Tailwind/shadcn responsive utilities — no dedicated mobile redesign needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Comments on submission (not per-file) | Simplifies data model; matches coordinator workflow | — Pending |
| SMTP/Gmail for emails | Testing purposes; easy to swap for production service later | — Pending |
| ZIP generated on-demand | No background jobs needed; files already on Vercel Blob | — Pending |
| Metadata-only coordinator edit | Preserves student file integrity | — Pending |

---
*Last updated: 2026-02-25 after initialization*
