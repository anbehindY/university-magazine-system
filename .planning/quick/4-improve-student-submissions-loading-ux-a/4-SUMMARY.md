---
phase: quick-4
plan: 01
subsystem: ui
tags: [skeleton, loading-ux, comment-locking, archived-year]

# Dependency graph
requires:
  - phase: 07-student-comment-thread
    provides: Comment thread UI with isLocked derivation
  - phase: quick-3
    provides: academicYear data on submissions, archived year grouping
provides:
  - Skeleton loading cards for student submissions page
  - Auth pending guard (isPending early return)
  - Archived-year comment reply locking with distinct banner message
affects: [student-submissions-ui, comment-threads]

# Tech tracking
tech-stack:
  added: []
  patterns: [skeleton-card-loading, archived-year-locking]

key-files:
  created: []
  modified:
    - app/(portal)/student/submissions/page.tsx

key-decisions:
  - "SubmissionCardSkeleton as standalone function outside component -- keeps main component cleaner"
  - "submissionsLoading initialized to true to prevent empty-state flash before useEffect fires"
  - "isArchivedYear guards on selectedSubmission !== null to prevent false positive on null check"
  - "Locked banner uses ternary to distinguish closure-locked vs archived-year-locked messages"

patterns-established:
  - "Skeleton cards matching real card layout for perceived performance"
  - "isPending auth guard as early return before main render"

requirements-completed: [UX-SKELETON, COMM-LOCK-ARCHIVED]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Quick Task 4: Improve Student Submissions Loading UX Summary

**Skeleton loading cards replacing spinner, auth pending guard, and archived-year comment reply locking with distinct banner messages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T14:25:49Z
- **Completed:** 2026-03-04T14:27:54Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Replaced jarring LoadingScreen spinner with 2-column skeleton card grid matching submission card layout
- Added auth pending guard (isPending early return) to prevent blank page before session resolves
- Initialized submissionsLoading to true so skeletons show immediately on mount
- Archived-year submissions now force-lock comment replies regardless of closure date
- Locked banner distinguishes between closure-locked ("final closure date has passed") and archived-year-locked ("past academic year")

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace LoadingScreen with skeleton cards and add auth guard** - `04b8d05` (feat)
2. **Task 2: Lock comment replies on archived-year submissions** - `cfdb0cb` (feat)

## Files Created/Modified
- `app/(portal)/student/submissions/page.tsx` - Added SubmissionCardSkeleton component, auth guard, skeleton grid, archived-year locking

## Decisions Made
- SubmissionCardSkeleton placed as standalone function outside the main component for cleaner separation
- submissionsLoading initialized to `true` (not `false`) to prevent brief empty-state flash before useEffect fires loadSubmissions
- isArchivedYear guards on `selectedSubmission !== null` to prevent false positive when no submission is selected
- Locked banner uses ternary for distinct messages: closure-locked vs archived-year-locked

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Student submissions page now has proper skeleton loading UX
- Archived-year comment locking is complete
- All TypeScript checks pass cleanly

## Self-Check: PASSED

- [x] `app/(portal)/student/submissions/page.tsx` exists
- [x] Commit `04b8d05` exists (Task 1)
- [x] Commit `cfdb0cb` exists (Task 2)

---
*Quick Task: 4-improve-student-submissions-loading-ux-a*
*Completed: 2026-03-04*
