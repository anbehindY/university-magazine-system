---
phase: 06-critical-fixes
plan: 01
subsystem: api
tags: [zip-download, closure-guard, tooltip, manager-ui, date-fns, radix-ui]

# Dependency graph
requires:
  - phase: 02-closure-enforcement
    provides: isPastFinalClosure() function in lib/closure-guard.ts
  - phase: 04-manager-and-reports-api
    provides: ZIP download route and manager submissions API
  - phase: 05-ui-layer
    provides: Manager submissions page with Download ZIP button pattern (disabled button in span for Tooltip)
provides:
  - Inverted closure gate (403) in GET /api/manager/submissions/download blocking pre-deadline downloads
  - finalClosureDate field in GET /api/manager/submissions response payload
  - Manager UI Download ZIP button disabled before finalClosureDate with Tooltip showing formatted date
affects:
  - 06-critical-fixes (other plans in this phase)
  - 07-student-comment-thread
  - MGR-02 requirement

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inverted closure gate: !(await isPastFinalClosure()) returns 403 before finalClosureDate (MGR-02 pattern)"
    - "Disabled button wrapped in span with tabIndex=0 for Tooltip to work (pre-existing Phase 5 pattern, applied here)"
    - "Client-side isPastFinalClosure derived as Date.now() > new Date(finalClosureDate).getTime()"

key-files:
  created: []
  modified:
    - app/api/manager/submissions/download/route.ts
    - app/api/manager/submissions/route.ts
    - app/(management)/manager/submissions/page.tsx

key-decisions:
  - "Used new Response(...) not NextResponse.json() in download route to maintain consistency with existing response style"
  - "Added activeYear query to existing Promise.all in submissions route rather than a separate query — avoids extra round-trip"
  - "Client-side isPastFinalClosure derived from finalClosureDate state rather than a separate API call — no extra fetch"

patterns-established:
  - "Inverted closure gate pattern: import isPastFinalClosure, check !(await isPastFinalClosure()), return 403 with clear error message"

requirements-completed: [MGR-02]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 06 Plan 01: Critical Fixes — ZIP Closure Gate Summary

**Inverted closure gate (403) added to ZIP download route and finalClosureDate exposed in manager submissions API with disabled Download ZIP button + Tooltip before final closure date**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T14:54:51Z
- **Completed:** 2026-03-02T14:57:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- ZIP download route now returns 403 with "ZIP download is only available after the final closure date." when called before finalClosureDate (MGR-02 closure gate)
- Manager submissions GET response now includes `finalClosureDate` field from the active academic year
- Manager UI Download ZIP button is disabled before finalClosureDate with a Tooltip showing "Available after DD MMM YYYY"

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inverted closure gate to ZIP download route and extend manager submissions API** - `7a476f8` (feat)
2. **Task 2: Disable Download ZIP button before finalClosureDate with Tooltip** - `dbf8e31` (feat)

## Files Created/Modified

- `app/api/manager/submissions/download/route.ts` - Added import of `isPastFinalClosure` and Guard 3 (inverted closure gate) after the role guard
- `app/api/manager/submissions/route.ts` - Added `activeYear` query to existing `Promise.all`, returned `finalClosureDate` in response payload
- `app/(management)/manager/submissions/page.tsx` - Added Tooltip imports, `finalClosureDate` state, client-side `isPastFinalClosure` derivation, and wrapped Download ZIP button in Tooltip structure

## Decisions Made

- Used `new Response(...)` not `NextResponse.json()` in the download route to maintain consistency with the existing response style already used in that file
- Added `activeYear` query inside the existing `Promise.all` in the submissions route to avoid an extra database round-trip
- Derived `isPastFinalClosure` client-side from the `finalClosureDate` state (no additional API call needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled cleanly on the first attempt. The `--pretty` flag output appeared to show a pre-existing error in `app/(student)/submissions/page.tsx` during initial review, but running `tsc --noEmit` without `--pretty` confirmed exit code 0 (no errors). The student page already had the `title` field in the payload type from a prior plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MGR-02 requirement fulfilled: ZIP download is blocked before finalClosureDate at both API and UI layers
- Phase 06 Plan 02 (COORD-02 title field) can proceed — no dependencies on this plan
- All existing download functionality unchanged after finalClosureDate

---
*Phase: 06-critical-fixes*
*Completed: 2026-03-02*
