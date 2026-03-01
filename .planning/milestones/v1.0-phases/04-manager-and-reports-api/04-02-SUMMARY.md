---
phase: 04-manager-and-reports-api
plan: "02"
subsystem: api
tags: [prisma, queryRaw, postgresql, reports, role-scoping, next.js]

# Dependency graph
requires:
  - phase: 01-schema-and-infrastructure
    provides: Submission model with facultyId, academicYearId, status; Faculty model
  - phase: 02-closure-enforcement
    provides: getActiveAcademicYear() from closure-guard
  - phase: 03-coordinator-and-comment-api
    provides: SubmissionComment with authorRole field for exception filter
provides:
  - GET /api/reports?type=submissions — per-faculty statistical reports with count, percentage, distinct contributors
  - GET /api/reports?type=exceptions — submissions with no coordinator comment; optional overdue filter
  - Role-scoped faculty filtering across both report types
affects: [frontend-reports-ui, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - $queryRaw with Prisma.sql template tag for safe parameterized aggregation queries
    - BigInt-to-Number conversion before JSON serialization (COUNT returns bigint in Prisma)
    - Prisma nested none filter for absence-of-relation queries (no coordinator comment)
    - Shared facultyMap built once at handler level; reused by both report type branches

key-files:
  created:
    - app/api/reports/route.ts
  modified: []

key-decisions:
  - "queryRaw with Prisma.sql for statistical aggregation — COUNT(DISTINCT) not available in Prisma ORM syntax"
  - "Prisma findMany with nested none filter for exceptions — native ORM filter preferred over raw SQL where possible"
  - "facultyMap fetched once before type branch — avoids duplicate DB round-trips for both report types"
  - "BigInt converted with Number() before building response — JSON.stringify silently drops BigInt values"
  - "Percentage rounded via Math.round(x*1000)/10 — gives 1 decimal place without floating point drift"

patterns-established:
  - "Unified type-routing pattern: single endpoint with ?type= param dispatches to sub-handlers sharing auth/scope setup"
  - "scopedFacultyId pattern: null means unrestricted (manager/admin), string means scoped to faculty (coordinator/guest)"

requirements-completed: [RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 4 Plan 02: Reports Endpoint Summary

**Unified GET /api/reports route with $queryRaw statistical aggregation and Prisma nested-filter exception queries, role-scoped by faculty**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T05:04:50Z
- **Completed:** 2026-02-26T05:07:06Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Statistical report (type=submissions): per-faculty submission counts, percentage of total (1 decimal), and distinct contributor counts via $queryRaw with COUNT(DISTINCT)
- Exception report (type=exceptions): SUBMITTED submissions with no coordinator comment using Prisma nested none filter; optional ?overdue=true narrows to 14+ days old
- Role scoping: STUDENT gets 403; COORDINATOR/GUEST scoped to their assigned facultyId; MARKETING_MANAGER/ADMINISTRATOR see all faculties
- Defaults to active academic year via getActiveAcademicYear() when academicYearId not specified

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reports route with statistical reports** - `6e49952` (feat)
2. **Task 2: Add exception reports to reports route** - `03770ba` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/api/reports/route.ts` - Unified reports GET handler with type routing, role scoping, statistical and exception report implementations

## Decisions Made
- Used `$queryRaw` with `Prisma.sql` template tag for the statistical report — Prisma ORM cannot express `COUNT(DISTINCT)` natively
- Used Prisma `findMany` with `comments: { none: { authorRole: "MARKETING_COORDINATOR" } }` for exception report — ORM filter preferred over raw SQL when supported
- BigInt values from `$queryRaw` COUNT columns explicitly converted with `Number()` to avoid silent JSON serialization failure
- Percentage computed as `Math.round((count/total)*1000)/10` — yields one decimal with correct rounding, no floating point drift
- Shared `facultyMap` built once before both type branches — single DB round-trip for faculty name resolution regardless of report type

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `app/api/manager/submissions/route.ts` (from plan 04-01) were discovered during tsc verification: `facultyName` type `string | null` fails `localeCompare` overloads. Out of scope for this plan; logged to deferred-items per SCOPE BOUNDARY rule.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All six report requirements (RPT-01 through RPT-06) satisfied
- Reports endpoint ready for frontend consumption
- Phase 4 plan 03 (ZIP download) can proceed independently

## Self-Check: PASSED

- app/api/reports/route.ts: FOUND
- 04-02-SUMMARY.md: FOUND
- Commit 6e49952 (Task 1): FOUND
- Commit 03770ba (Task 2): FOUND

---
*Phase: 04-manager-and-reports-api*
*Completed: 2026-02-26*
