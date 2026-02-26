# Requirements: University Magazine Contribution System

**Defined:** 2026-02-25
**Core Value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.

## v1 Requirements

### Infrastructure & Schema

- [x] **INFRA-01**: Administrator can configure two closure dates per academic year — `firstClosureDate` (blocks new submissions) and `finalClosureDate` (blocks all updates)
- [x] **INFRA-02**: `Submission` model stores `isSelected`, `selectedAt`, `selectedById`, `academicYearId`, and `facultyId` snapshot to support reporting and selection workflow
- [x] **INFRA-03**: `SubmissionComment` model exists with fields: submissionId, authorId, authorRole, body, createdAt — enabling two-way threads per submission
- [x] **INFRA-04**: Email service (`lib/mailer.ts`) configured with Nodemailer and Gmail SMTP for sending transactional notifications

### Closure Enforcement

- [x] **CLOS-01**: Student cannot create new submissions after `firstClosureDate` for the active academic year
- [x] **CLOS-02**: Student cannot update any existing submission after `finalClosureDate`
- [x] **CLOS-03**: No new comments can be added to any submission after `finalClosureDate`
- [x] **CLOS-04**: Student must have `agreed = true` before a submission transitions to SUBMITTED status (enforced at API level, not just stored)

### Coordinator Workflow

- [x] **COORD-01**: Marketing Coordinator can view only SUBMITTED submissions belonging to students in their assigned faculty
- [ ] **COORD-02**: Marketing Coordinator receives an email notification (via SMTP) when a student submits (transitions DRAFT → SUBMITTED)
- [ ] **COORD-03**: Marketing Coordinator can mark or unmark a submission as "Selected for Publication" (toggleable boolean flag)
- [ ] **COORD-04**: Marketing Coordinator can edit the notes field on a submission

### Comment System

- [ ] **COMM-01**: Marketing Coordinator can add a comment to any submission in their faculty
- [x] **COMM-02**: Student can reply to comments on their own submission (two-way thread)
- [ ] **COMM-03**: Comment thread is visible only to the submission owner (student) and their faculty's coordinator(s)
- [ ] **COMM-04**: No new comments can be added to a submission after `finalClosureDate`

### Marketing Manager

- [ ] **MGR-01**: Marketing Manager can view all submissions flagged as "Selected for Publication" across all faculties (read-only, no editing or commenting)
- [ ] **MGR-02**: Marketing Manager can download a ZIP archive of all files (Word docs + images) from selected submissions, available only after `finalClosureDate` — ZIP organised by Faculty > Student > files

### Guest Access

- [ ] **GUEST-01**: Guest user can view submissions flagged as "Selected for Publication" for their assigned faculty (read-only, no editing or commenting)
- [ ] **GUEST-02**: Guest user can view statistical and exception reports scoped to their assigned faculty

### Reports

- [ ] **RPT-01**: Report shows number of submissions per faculty for each academic year
- [ ] **RPT-02**: Report shows percentage of total submissions contributed by each faculty for any academic year
- [ ] **RPT-03**: Report shows number of distinct student contributors per faculty per academic year
- [ ] **RPT-04**: Exception report: all submitted contributions that have received no coordinator comment
- [ ] **RPT-05**: Exception report: all submitted contributions with no coordinator comment where submission date is more than 14 days ago
- [ ] **RPT-06**: All reports are role-scoped — Coordinator and Guest see their faculty only; Marketing Manager and Administrator see all faculties

## v2 Requirements

### Enhanced Coordinator Experience

- **COORD-V2-01**: Inline exception highlighting in coordinator list (e.g. submissions past 14 days without comment shown with visual indicator)
- **COORD-V2-02**: Multi-coordinator support — email sent to all coordinators assigned to a faculty when a student submits

### Student Experience

- **STU-V2-01**: Comment read/unread state — student sees when coordinator has added a new comment since last viewed

### Audit & Traceability

- **AUDIT-V2-01**: Selection audit trail — `selectedAt` timestamp and `selectedById` recorded when a coordinator selects a submission

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-file comments | Scope confirmed as submission-level only |
| Coordinator file replacement | Confirmed metadata-only edit |
| Real-time comment updates (WebSocket/SSE) | Low-frequency use case; polling sufficient |
| Production email delivery | Gmail SMTP for testing; swap is a config change |
| Student editing after final closure | Hard stop — enforced in requirements |
| Comment editing or deletion | Append-only thread preserves accountability |
| Student-to-student visibility of contributions | Isolation per student is required |
| Pre-generated ZIP | On-demand sufficient at this scale |
| Native mobile app | Web-first; responsive via Tailwind/shadcn |
| Rich text comments | Plain text sufficient for coordinator interaction |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| CLOS-01 | Phase 2 | Complete |
| CLOS-02 | Phase 2 | Complete |
| CLOS-03 | Phase 2 | Complete |
| CLOS-04 | Phase 2 | Complete |
| COORD-01 | Phase 3 | Complete |
| COORD-02 | Phase 3 | Pending |
| COORD-03 | Phase 3 | Pending |
| COORD-04 | Phase 3 | Pending |
| COMM-01 | Phase 3 | Pending |
| COMM-02 | Phase 3 | Complete |
| COMM-03 | Phase 3 | Pending |
| COMM-04 | Phase 3 | Pending |
| MGR-01 | Phase 4 | Pending |
| MGR-02 | Phase 4 | Pending |
| RPT-01 | Phase 4 | Pending |
| RPT-02 | Phase 4 | Pending |
| RPT-03 | Phase 4 | Pending |
| RPT-04 | Phase 4 | Pending |
| RPT-05 | Phase 4 | Pending |
| RPT-06 | Phase 4 | Pending |
| GUEST-01 | Phase 5 | Pending |
| GUEST-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 — traceability populated after roadmap creation*
