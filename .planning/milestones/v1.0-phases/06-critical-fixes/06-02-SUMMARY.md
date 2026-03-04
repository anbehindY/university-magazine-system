---
phase: 06-critical-fixes
plan: 02
subsystem: ui, api
tags: [submission, title, prisma, next.js, localStorage, react, typescript]

# Dependency graph
requires:
  - phase: 01-schema-and-infrastructure
    provides: Prisma Submission model with title?: String? @db.Text column
  - phase: 05-ui-layer
    provides: Student submissions page with notes, file upload, and form state patterns
provides:
  - SubmissionPayload type includes title field for POST and PUT handlers
  - Prisma create and update operations persist title to database
  - Student submission form has working title input with state, localStorage, and edit restoration
  - Coordinator email notifications receive student-provided titles (existing wiring now fed by real data)
affects: [07-student-comment-thread, coordinator-submissions-view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Title follows notes pattern: state, localStorage, fetch body, edit restoration, and reset all wired in parallel"
    - "title || null normalization — empty string becomes null so Untitled fallback in email template applies"

key-files:
  created: []
  modified:
    - app/api/submissions/route.ts
    - app/(student)/submissions/page.tsx

key-decisions:
  - "Use title || null (not title.trim() || null) to normalize empty string to null consistently with how notes are handled"
  - "Title is optional — no validation required beyond empty-to-null normalization"
  - "Display Untitled placeholder in submission list when title is null, matching email template fallback"

patterns-established:
  - "New optional fields follow the notes pattern: add to SubmissionPayload type, wire to Prisma create data with ?? null, conditionally include in updateData, then mirror in UI: state, localStorage, fetch body, edit restoration, reset"

requirements-completed: [COORD-02]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 06 Plan 02: Submission Title Field Summary

**End-to-end submission title wiring: SubmissionPayload type extended, Prisma create/update writes title to DB, student form adds title input with localStorage draft persistence and edit restoration, coordinator emails now include student-provided titles**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T14:55:22Z
- **Completed:** 2026-03-02T14:58:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `title?: string | null` to `SubmissionPayload` type, `prisma.submission.create()` data, and `updateData` in PUT handler
- Student form now renders a labeled `Input` for title above the notes textarea, with state, localStorage restore, edit restore, and form reset
- Title is included in the fetch body (`title: title || null`) for all POST and PUT calls via `saveDraftToDb()`
- Title is displayed in both the desktop table (new Title column) and mobile card view of the submissions list

## Task Commits

Each task was committed atomically:

1. **Task 1: Add title to SubmissionPayload type and wire to Prisma create/update** - `8e1d369` (feat)
2. **Task 2: Add title input to student submission form with state, localStorage, and edit restoration** - `b633e27` (feat)

## Files Created/Modified
- `app/api/submissions/route.ts` - Added title to SubmissionPayload type, prisma.submission.create data, updateData type and conditional assignment in PUT handler
- `app/(student)/submissions/page.tsx` - Added title state, localStorage parse/restore, startEditSubmission title parameter, resetSubmissionForm reset, saveDraftToDb body inclusion, localStorage save inclusion, UI input field, and list display (desktop table + mobile cards)

## Decisions Made
- Used `title: title || null` normalization (empty string becomes null) so the existing `"Untitled"` fallback in the email template applies when no title is given
- No title validation beyond empty-to-null normalization — title is optional per the schema (`String?`)
- Added a Title column to the desktop submissions table and a title display in mobile cards so students have visual confirmation their title was saved

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

All created files found. All task commits verified.

## Next Phase Readiness
- COORD-02 gap fully closed: student-provided titles now flow from form input to database to coordinator email subject line
- Phase 7 (Student Comment Thread) can proceed — no blocking issues from this plan
- The title field is available in all submission list views for coordinators and managers to see (they query the same submission records)

---
*Phase: 06-critical-fixes*
*Completed: 2026-03-02*
