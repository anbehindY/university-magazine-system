---
phase: quick-7
plan: 01
subsystem: ui
tags: [reports, year-selector, coordinator]

requires:
  - phase: quick-6
    provides: Year selector was incorrectly extended to coordinators
provides:
  - Coordinators see only active year in reports (no year picker)
affects: [reports-page]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - app/(portal)/reports/page.tsx

key-decisions:
  - "Reverted MARKETING_COORDINATOR from canSwitchYear — coordinators only see active year reports"

patterns-established: []

requirements-completed: []

duration: 1min
completed: 2026-03-04
---

# Quick Task 7: Coordinator should only see report for the active year

**Reverted the year selector extension for coordinators on the reports page.**

## Performance

- **Duration:** 1 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed `|| role === "MARKETING_COORDINATOR"` from the `canSwitchYear` condition
- Coordinators now see only the active year label (not a dropdown) in reports, consistent with the original design

## Task Commits

1. **Restrict reports year selector to managers and admins** - `892f6cd` (fix)

## Files Modified
- `app/(portal)/reports/page.tsx` — Line 131: reverted `canSwitchYear` to managers/admins only

## Deviations from Plan
None — single-line revert.

## Issues Encountered
None

---
*Quick Task: 7-coordinator-should-only-see-report-for-t*
*Completed: 2026-03-04*
