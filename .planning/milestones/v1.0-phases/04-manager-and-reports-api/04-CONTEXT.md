# Phase 4: Manager and Reports API - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Marketing Manager can download a ZIP of all selected files after final closure, view a read-only list of selected submissions across all faculties, and all statistical and exception reports return correct role-scoped data. No editing capabilities for the manager — read-only plus download.

</domain>

<decisions>
## Implementation Decisions

### ZIP download behavior
- Archive structure: `Faculty/StudentName/filename` — top-level per faculty, subfolder per student, files inside
- All files from selected submissions included (no type filtering)
- Stream on-the-fly from Vercel Blob Storage — fetch each blob and pipe into ZIP stream for better UX (no buffering/temp files)
- Empty faculty folders included in ZIP even if no submissions were selected for that faculty
- Download endpoint gated behind `finalClosureDate` — returns 403 before final closure
- File storage: Vercel Blob Storage (credentials in .env)

### Report response shape
- Single endpoint with type parameter: `GET /api/reports?type=submissions` or `type=exceptions`
- Optional academic year filter: `?academicYearId=X` — defaults to current active academic year
- All authenticated roles can access, scoped by role:
  - Coordinator/guest: see their faculty only
  - Manager/admin: see all faculties
  - Students: 403

### Exception report criteria
- "No coordinator comment" = zero SubmissionComment records where authorRole is MARKETING_COORDINATOR on that submission
- 14-day threshold: calculated from `submittedAt` — submissions submitted more than 14 days ago with still no coordinator comment
- One report type with optional overdue filter: `GET /api/reports?type=exceptions` for all, add `&overdue=true` for 14-day filter
- Exception row fields: id, title, studentName, facultyName, submittedAt, daysSinceSubmission

### Manager submissions view
- Core fields only: id, title, studentName, facultyName, submittedAt, fileCount — no isSelected/notes (read-only, no editing surface)
- Optional faculty filter: `?facultyId=X` to narrow results
- Flat array, no pagination (consistent with coordinator endpoint)
- Sort: faculty name ascending, then submittedAt descending within each faculty

### Claude's Discretion
- Statistical report field set (minimum: facultyName, submissionCount, percentageOfTotal, distinctContributors)
- ZIP filename convention (e.g. `selected-submissions-2026.zip`)
- Error handling for failed blob fetches during ZIP streaming

</decisions>

<specifics>
## Specific Ideas

- Vercel Blob Storage for file storage and retrieval — credentials provided via .env
- Streaming ZIP for better UX — user sees download start immediately rather than waiting for full buffer

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-manager-and-reports-api*
*Context gathered: 2026-02-26*
