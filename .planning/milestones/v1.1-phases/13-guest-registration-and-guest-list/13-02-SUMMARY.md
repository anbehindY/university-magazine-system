---
phase: 13-guest-registration-and-guest-list
plan: 02
subsystem: api, ui
tags: [prisma, next-api, pagination, coordinator, guest-list, sidebar]

# Dependency graph
requires:
  - phase: 10-schema-migration
    provides: User model with role and facultyId fields
provides:
  - GET /api/coordinator/guests endpoint (faculty-scoped, paginated, searchable)
  - Coordinator guest list page at /coordinator/guests
  - Sidebar navigation entry for MARKETING_COORDINATOR
affects: [13-guest-registration-and-guest-list]

# Tech tracking
tech-stack:
  added: []
  patterns: [coordinator faculty-scoped guest query, debounced search input]

key-files:
  created:
    - app/api/coordinator/guests/route.ts
    - app/(portal)/coordinator/guests/page.tsx
  modified:
    - components/app-sidebar.tsx

key-decisions:
  - "Reused PaginationControls component for consistent pagination UI across coordinator pages"
  - "Used useEffect+fetch with debounced search instead of SWR (matching coordinator submissions pattern)"

patterns-established:
  - "Guest list read-only pattern: faculty-scoped query with role filter and pagination"

requirements-completed: [GUEST-05, GUEST-06]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 13 Plan 02: Coordinator Guest List Summary

**Faculty-scoped guest list API and page with paginated table, search, and sidebar navigation for coordinators**

## Performance

- **Duration:** 2 min 28s
- **Started:** 2026-03-09T15:29:45Z
- **Completed:** 2026-03-09T15:32:13Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GET /api/coordinator/guests endpoint with role-based auth, faculty scoping, pagination, and search
- Guest list page displaying name, email, registration date, and faculty badge columns
- Guest List sidebar navigation item for MARKETING_COORDINATOR role

## Task Commits

Each task was committed atomically:

1. **Task 1: Create guest list API endpoint** - `279a0d6` (feat)
2. **Task 2: Create guest list page and add sidebar entry** - `ab3fe0f` (feat)

## Files Created/Modified
- `app/api/coordinator/guests/route.ts` - GET endpoint for faculty-scoped paginated guest list with search
- `app/(portal)/coordinator/guests/page.tsx` - Client-side guest list table page with debounced search, loading/error/empty states
- `components/app-sidebar.tsx` - Added Guest List nav item for MARKETING_COORDINATOR between Submissions and Reports

## Decisions Made
- Reused PaginationControls component for consistent pagination UI across coordinator pages
- Used useEffect+fetch with debounced search (300ms) matching the coordinator submissions page pattern
- Used toLocaleDateString for date formatting (simpler than importing date-fns for a read-only list)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Guest list API and page are ready for use once guest registration (Plan 01) creates guest accounts
- Sidebar navigation is in place for coordinators

---
*Phase: 13-guest-registration-and-guest-list*
*Completed: 2026-03-09*
