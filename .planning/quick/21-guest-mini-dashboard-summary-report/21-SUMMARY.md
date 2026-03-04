---
phase: quick-21
plan: 01
subsystem: ui, api
tags: [prisma, raw-sql, react, guest, dashboard, statistics]

requires:
  - phase: quick-17
    provides: guest mini-dashboard page structure
  - phase: quick-19
    provides: overview stat cards section with slate-50 wrapper
provides:
  - Guest API returns summaryStats (totalSubmissions, percentageOfTotal, distinctContributors)
  - Guest overview cards show report-style statistics instead of redundant faculty/year info
affects: [guest-dashboard]

tech-stack:
  added: []
  patterns: [raw SQL stats queries in Promise.all alongside Prisma findMany]

key-files:
  created: []
  modified:
    - app/api/guest/submissions/route.ts
    - app/(guest)/guest/page.tsx

key-decisions:
  - "Raw SQL queries run in same Promise.all as submissions findMany -- no extra DB round-trip"
  - "BigInt to Number conversion matches reports API pattern"
  - "Percentage rounded to 1 decimal place using Math.round * 1000 / 10 pattern from reports API"

patterns-established:
  - "Guest API summary stats pattern: faculty-scoped raw SQL + university-total raw SQL in parallel"

requirements-completed: [QUICK-21]

duration: 2min
completed: 2026-03-05
---

# Quick Task 21: Guest Mini Dashboard Summary Report

**Guest overview cards replaced with report-style stats: total submissions with university percentage, distinct contributors count, alongside selected articles**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T19:07:54Z
- **Completed:** 2026-03-04T19:10:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Guest submissions API now returns `summaryStats` with faculty submission count, percentage of university total, and distinct contributor count
- Overview section shows 3 report-style stat cards: Selected Articles, Total Submissions (with percentage subtitle), Contributors (with singular/plural label)
- Faculty and Academic Year stat cards removed from Overview (both are already shown in the hero banner)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add summary stats to guest submissions API** - `f5fc4b3` (feat)
2. **Task 2: Replace Overview stat cards with summary report stats** - `69fa62b` (feat)

## Files Created/Modified
- `app/api/guest/submissions/route.ts` - Added raw SQL queries for faculty stats and university total; returns summaryStats object in response
- `app/(guest)/guest/page.tsx` - Replaced Faculty/Academic Year cards with Total Submissions and Contributors cards; added summaryStats state

## Decisions Made
- Raw SQL queries run in same Promise.all as submissions findMany -- no extra DB round-trip needed
- BigInt to Number conversion matches the reports API pattern for JSON serialization safety
- Percentage rounded to 1 decimal place using Math.round(x * 1000) / 10 matching reports API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

- All source files exist on disk
- All commit hashes verified in git log
- Summary file created at expected path

---
*Quick Task: 21-guest-mini-dashboard-summary-report*
*Completed: 2026-03-05*
