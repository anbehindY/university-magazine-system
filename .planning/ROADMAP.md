# Roadmap: University Magazine Contribution System

## Overview

This milestone completes the full coordinator review workflow on top of the existing brownfield codebase. Work proceeds in five strict phases: schema and infrastructure first (everything else blocks on the data model), then closure enforcement on existing routes, then the coordinator and comment API layer, then the manager and reporting API, and finally all UI surfaces built against real endpoints. Each phase delivers a verifiable, independently testable capability.k

## Phases

- [x] **Phase 1: Schema and Infrastructure** - Migrate the database and build shared utilities that every subsequent phase depends on (completed 2026-02-25)
- [x] **Phase 2: Closure Enforcement** - Enforce first and final closure dates on all submission-mutating routes (completed 2026-02-26)
- [ ] **Phase 3: Coordinator and Comment API** - Coordinator submission access, email notifications, comment threads, and selection flag
- [ ] **Phase 4: Manager and Reports API** - ZIP download endpoint and all role-scoped statistical and exception reports
- [ ] **Phase 5: UI Layer** - All end-user-facing views for coordinators, managers, guests, and reports

## Phase Details

### Phase 1: Schema and Infrastructure

**Goal**: The database has the correct shape for all new features and two shared utility modules are in place and verified
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):

1. A Prisma migration has been applied that adds `firstClosureDate` and `finalClosureDate` to `AcademicYear`, `isSelected` / `selectedAt` / `selectedById` / `facultyId` / `academicYearId` to `Submission`, and a `SubmissionComment` model with an index on `submissionId`
2. `lib/closure-guard.ts` exports `getActiveAcademicYear()`, `isPastFirstClosure()`, and `isPastFinalClosure()` and each function returns correct results when called with known date fixtures
3. `lib/mailer.ts` exports a `sendMail()` helper backed by a Nodemailer 6.x singleton, reads SMTP credentials from environment variables, and does not throw when called in a fire-and-forget pattern
4. `.env.example` contains `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` entries with placeholder values
   **Plans**: 4 plans

Plans:

- [ ] 01-01-PLAN.md — Prisma schema migration: rename closureDate, add new AcademicYear/Submission fields, create SubmissionComment model
- [x] 01-02-PLAN.md — Mailer utility: install Nodemailer 6.x, create lib/mailer.ts singleton, document SMTP env vars in .env.example
- [ ] 01-03-PLAN.md — Closure guard utility: create lib/closure-guard.ts with getActiveAcademicYear, isPastFirstClosure, isPastFinalClosure
- [ ] 01-04-PLAN.md — Admin UI: add DatePicker fields for both closure dates, add isActive activation with badge

### Phase 2: Closure Enforcement

**Goal**: Students are hard-blocked by closure dates at the API level — no new submissions after first closure, no updates or comments after final closure, and Terms and Conditions is enforced before submission
**Depends on**: Phase 1
**Requirements**: CLOS-01, CLOS-02, CLOS-03, CLOS-04
**Success Criteria** (what must be TRUE):

1. A student attempting to create a new submission when the active academic year's `firstClosureDate` has passed receives a 403 response with a clear error message; no record is created
2. A student attempting to update any existing submission when `finalClosureDate` has passed receives a 403 response; the submission record is unchanged
3. Any user attempting to POST a new comment when `finalClosureDate` has passed receives a 403 response
4. A student attempting to transition a submission to SUBMITTED status without `agreed = true` receives a 400 response; the status does not change
   **Plans**: 3 plans

Plans:

- [ ] 02-01-PLAN.md — Submissions route gates: firstClosure guard on POST (CLOS-01), finalClosure guard on PUT (CLOS-02 partial), agreed guard on SUBMITTED transition (CLOS-04), populate academicYearId/facultyId on create
- [ ] 02-02-PLAN.md — File mutation route gates: finalClosure guard on POST/DELETE /api/submissions/files and onBeforeGenerateToken in /api/submissions/upload (CLOS-02)
- [ ] 02-03-PLAN.md — Comments stub route: create /api/comments POST stub enforcing finalClosure gate (CLOS-03), returns 501 for pre-closure requests until Phase 3 implements full thread

### Phase 3: Coordinator and Comment API

**Goal**: Coordinators can access only their faculty's submitted work, receive email on new submissions, comment on submissions, and mark selections — all enforced at the API layer with faculty scope
**Depends on**: Phase 2
**Requirements**: COORD-01, COORD-02, COORD-03, COORD-04, COMM-01, COMM-02, COMM-03, COMM-04
**Success Criteria** (what must be TRUE):

1. A coordinator calling `GET /api/coordinator/submissions` receives only SUBMITTED submissions belonging to students in their own faculty; submissions from other faculties are not present in the response
2. When a student transitions a submission from DRAFT to SUBMITTED, the coordinator(s) for that student's faculty receive an email notification; re-submitting the same submission does not send a second email
3. A coordinator can POST a comment to a submission in their faculty and the comment appears in the thread; a student can POST a reply to that comment on their own submission; a coordinator from a different faculty receives a 403
4. A coordinator can PATCH `isSelected` to toggle the publication flag on a submission in their faculty; a coordinator from a different faculty receives a 403
5. A coordinator can PATCH the `notes` field on a submission in their faculty; the updated value is returned in subsequent GET responses
   **Plans**: 3 plans

Plans:

- [ ] 03-01-PLAN.md — Schema migration: add title to Submission and parentId self-relation to SubmissionComment
- [ ] 03-02-PLAN.md — Coordinator submissions API: GET faculty-scoped list (COORD-01), PATCH isSelected + notes (COORD-03, COORD-04)
- [ ] 03-03-PLAN.md — Comment API: full POST/GET replacing stub (COMM-01-04), email trigger on first SUBMITTED transition (COORD-02)

### Phase 4: Manager and Reports API

**Goal**: Marketing Manager can download a ZIP of all selected files after final closure, and all statistical and exception reports return correct role-scoped data
**Depends on**: Phase 3
**Requirements**: MGR-01, MGR-02, RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06
**Success Criteria** (what must be TRUE):

1. A Marketing Manager calling `GET /api/manager/submissions` receives all submissions where `isSelected = true` across all faculties with no editing capability surfaced; a student or coordinator calling the same route receives a 403
2. A Marketing Manager calling `GET /api/manager/submissions/download` after `finalClosureDate` receives a streaming ZIP archive structured as `Faculty/StudentName/filename`; calling the same route before `finalClosureDate` returns a 403
3. The reports endpoint returns correct counts for submissions per faculty per academic year, percentage of total, and distinct student contributors per faculty — with coordinator and guest requests filtered to their faculty and manager/admin requests returning all faculties
4. The exception report returns all SUBMITTED contributions with no coordinator comment, and the 14-day exception report returns only those submitted more than 14 days ago without a comment — both scoped correctly by role
   **Plans**: TBD

### Phase 5: UI Layer

**Goal**: All roles can access their respective views and complete their workflows entirely through the UI — coordinators review and select submissions, managers download ZIPs, guests view selected work, and reports are accessible to all authorized roles
**Depends on**: Phase 4
**Requirements**: GUEST-01, GUEST-02
**Success Criteria** (what must be TRUE):

1. A coordinator navigating to their submissions view sees only SUBMITTED submissions from their faculty, can open a submission to read and post comments (thread updates without full page reload via SWR polling), can toggle the Selected flag, and can edit the notes field
2. A Marketing Manager can navigate to a selected submissions view showing all selected contributions across all faculties and, after final closure, can click a Download ZIP button that streams the archive to their browser
3. A guest user navigating to their faculty view sees selected submissions for their assigned faculty only and can navigate to a reports page showing faculty-scoped statistics and exception data
4. The reports page renders correct data for each role — coordinators and guests see their faculty, managers and admins see all faculties — and the exception report visually distinguishes submissions with no comment from those over 14 days without a comment
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase                          | Plans Complete | Status      | Completed  |
| ------------------------------ | -------------- | ----------- | ---------- |
| 1. Schema and Infrastructure   | 4/4            | Complete    | 2026-02-25 |
| 2. Closure Enforcement         | 3/3 | Complete   | 2026-02-26 |
| 3. Coordinator and Comment API | 0/3            | Not started | -          |
| 4. Manager and Reports API     | 0/TBD          | Not started | -          |
| 5. UI Layer                    | 0/TBD          | Not started | -          |
