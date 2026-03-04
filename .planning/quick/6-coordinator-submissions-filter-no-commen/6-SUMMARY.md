---
phase: quick-6
plan: 1
subsystem: ui, api
tags: [prisma, next.js, coordinator, filtering, sorting, comments]

# Dependency graph
requires:
  - phase: 03-coordinator-and-comment-api
    provides: coordinator submissions API and comment model
provides:
  - commentCount field in coordinator submissions API response
  - "No Comments" filter and "No Comments Priority" sort on coordinator submissions page
  - Comments column with amber zero-highlight in submissions table
  - Year selector enabled for coordinators on reports page
affects: [coordinator-submissions, reports]

# Tech tracking
tech-stack:
  added: []
  patterns: [client-side filter/sort extension, Prisma _count relation counting]

key-files:
  created: []
  modified:
    - app/api/coordinator/submissions/route.ts
    - app/(portal)/coordinator/submissions/page.tsx
    - app/(portal)/reports/page.tsx

key-decisions:
  - "Client-side filtering/sorting for no-comments, consistent with existing filter/sort pattern"
  - "Amber highlight on zero-comment count for visual coordinator attention"

patterns-established:
  - "Comment count surfaced via Prisma _count for efficient DB queries"

requirements-completed: [QUICK-6]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Quick-6: Coordinator Submissions No Comments Filter & Reports Year Selector Summary

**commentCount API field with No Comments filter/sort/column on coordinator submissions, plus year selector enabled for coordinators on reports page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T15:11:18Z
- **Completed:** 2026-03-04T15:14:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Coordinator submissions API now returns commentCount alongside fileCount via Prisma _count
- Submissions table has a Comments column with amber-highlighted zero counts for easy identification
- "No Comments" filter shows only uncommented submissions; "No Comments Priority" sort puts oldest uncommented first
- Coordinators can now switch academic years on the reports page via the year dropdown

## Task Commits

Each task was committed atomically:

1. **Task 1: Add commentCount to API and No Comments filter/sort/column** - `cfcb475` (feat)
2. **Task 2: Enable year selector for coordinators on reports page** - `3fb2448` (feat)

## Files Created/Modified
- `app/api/coordinator/submissions/route.ts` - Added comments to _count select, return commentCount in response
- `app/(portal)/coordinator/submissions/page.tsx` - Added commentCount type, No Comments filter/sort, Comments table column with amber zero highlight
- `app/(portal)/reports/page.tsx` - Added MARKETING_COORDINATOR to canSwitchYear role check

## Decisions Made
- Client-side filtering/sorting for no-comments filter, consistent with existing filter/sort approach in the submissions page
- Zero-comment count highlighted in amber (text-amber-600 font-medium) to draw coordinator attention to uncommented submissions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Coordinator submissions page now has full comment awareness
- Reports page year switching available to all three management roles (manager, admin, coordinator)

## Self-Check: PASSED

- [x] `app/api/coordinator/submissions/route.ts` - FOUND
- [x] `app/(portal)/coordinator/submissions/page.tsx` - FOUND
- [x] `app/(portal)/reports/page.tsx` - FOUND
- [x] `6-SUMMARY.md` - FOUND
- [x] Commit `cfcb475` - FOUND
- [x] Commit `3fb2448` - FOUND
- [x] TypeScript check passes (npx tsc --noEmit)

---
*Phase: quick-6*
*Completed: 2026-03-04*
