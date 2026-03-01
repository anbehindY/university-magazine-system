---
phase: 01-schema-and-infrastructure
plan: "04"
subsystem: ui
tags: [react, nextjs, datepicker, prisma, admin, academic-year]

# Dependency graph
requires:
  - phase: 01-01
    provides: AcademicYear schema with firstClosureDate, finalClosureDate, isActive fields
  - phase: 01-03
    provides: getActiveAcademicYear() which depends on isActive flag
provides:
  - Admin form with DatePicker fields for firstClosureDate and finalClosureDate
  - Active year badge and Activate button per row in admin table
  - PATCH handler on /api/admin/academic-years for activation-only updates
  - Full isActive activation flow via prisma.$transaction in API
affects:
  - Phase 2 closure enforcement (depends on isActive being set correctly)
  - All coordinators/managers who check active academic year

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DatePicker component used for optional nullable date fields (no required validation)
    - PATCH handler pattern for partial-update activation (no full form fields required)
    - prisma.$transaction for single-active-year invariant enforcement

key-files:
  created: []
  modified:
    - app/(management)/admin/page.tsx
    - app/api/admin/academic-years/route.ts

key-decisions:
  - "Admin UI uses PATCH (not PUT) for isActive-only activation to avoid requiring full form re-submission"
  - "Inline warning text used instead of confirmation modal for activation (per CONTEXT.md requirement)"
  - "DatePicker fields are optional with no required validation — form submits without them"

patterns-established:
  - "Activation-only PATCH: separate handler accepting {id, isActive} without full payload validation"
  - "Active badge pattern: emerald-100/emerald-800 Badge for active state, Activate button + inline warning for inactive"

requirements-completed: [INFRA-01]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 1 Plan 04: Admin UI DatePicker Fields and Active Year Badge Summary

**Admin academic year form with DatePicker fields for firstClosureDate/finalClosureDate, active-year badge, Activate button per row, and PATCH API handler for single-active-year transaction**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T17:52:09Z
- **Completed:** 2026-02-26T17:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `DatePicker` component for First Closure Date and Final Closure Date fields in the academic year create/edit form
- Added emerald Active badge and Activate button per row (with inline warning) to both desktop table and mobile card views
- Added PATCH handler to `/api/admin/academic-years` for activation-only updates without requiring full form re-submission
- Closure dates now included in form submit payload and pre-populated when editing existing years

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Admin API Route for New Fields** - `e48210e` (feat)
2. **Task 2: Update Admin UI with DatePicker Fields and Active Year Badge** - `cfdf63c` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `app/(management)/admin/page.tsx` - Added Badge/DatePicker imports, firstClosureDate/finalClosureDate state, DatePicker fields in form, Active badge and Activate button in rows, handleActivate() handler
- `app/api/admin/academic-years/route.ts` - Added PATCH handler for activation-only updates with prisma.$transaction

## Decisions Made
- Used PATCH handler (separate from PUT) for activation-only path: PUT requires all form fields, but "Activate" button only sends `{ id, isActive: true }` without form data. A PATCH handler accepting partial payload was the correct approach.
- Inline warning text ("Activating will deactivate the currently active year.") below the Activate button, matching CONTEXT.md requirement to avoid confirmation modals.
- DatePicker fields placed in the 2-column grid alongside Start/End Time fields for visual consistency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added PATCH handler for activation-only API path**
- **Found during:** Task 1 (Update Admin API Route)
- **Issue:** The plan's `handleActivate` function uses `method: "PATCH"` with only `{ id, isActive: true }` in the body. The existing PUT handler requires yearLabel, startDate, endDate, startTime, endTime, notiMessage — all required fields. An Activate-only request would fail validation.
- **Fix:** Added a new `PATCH` export to `route.ts` that accepts `{ id, isActive }` without full form field validation, using `prisma.$transaction` for the single-active-year invariant.
- **Files modified:** `app/api/admin/academic-years/route.ts`
- **Verification:** TypeScript clean, PATCH handler matches UI's activation call signature
- **Committed in:** `e48210e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Auto-fix necessary for correct operation — without PATCH handler, the Activate button would receive HTTP 400 from PUT's required-field validation.

## Issues Encountered
- None — API route already had firstClosureDate, finalClosureDate, isActive, and $transaction from Plan 01 execution. Task 1 only required adding the missing PATCH handler.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin can now configure firstClosureDate and finalClosureDate via DatePicker fields
- Admin can activate any academic year which deactivates others atomically via transaction
- `getActiveAcademicYear()` (Plan 03) will return the correct year once an admin activates one
- Phase 2 closure enforcement can proceed — all isActive mechanics are in place

---
*Phase: 01-schema-and-infrastructure*
*Completed: 2026-02-26*
