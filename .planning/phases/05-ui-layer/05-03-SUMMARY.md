---
phase: 05-ui-layer
plan: "03"
subsystem: ui
tags: [next.js, react, tailwind, date-fns, lucide-react, sonner, radix-ui, select, tooltip, skeleton]

# Dependency graph
requires:
  - phase: 04-manager-and-reports-api
    provides: /api/manager/submissions, /api/manager/submissions/download endpoints
  - phase: 05-ui-layer/05-01
    provides: /api/guest/submissions, role-based sidebar, Select and Tooltip components
affects: [05-ui-layer wave-2 remaining plans]

# Tech tracking
tech-stack:
  added: []
  patterns: [cancelled-fetch pattern with let cancelled = false, blob-download via createObjectURL + anchor.click() + revokeObjectURL, TooltipProvider wrapping disabled button via span tabIndex=0]

key-files:
  created:
    - app/(management)/manager/submissions/page.tsx
    - app/(management)/guest/submissions/page.tsx
  modified: []

key-decisions:
  - "Manager page uses two separate useEffects — one for static data (faculties + academic year) on mount, one for submissions re-fetching on selectedFacultyId change"
  - "Disabled button wrapped in span with tabIndex=0 for Tooltip to work — disabled elements don't fire mouse events"
  - "Guest table has no hover:bg-slate-50 (read-only) — manager table has it (indicates clickable future state)"
  - "Empty string value used for All Faculties SelectItem — avoids null/undefined in Select value state"

patterns-established:
  - "ZIP blob download: fetch → res.blob() → createObjectURL → anchor.click() → revokeObjectURL, downloading state in finally"
  - "Disabled-button tooltip: wrap <Button disabled> in <span tabIndex=0> inside <TooltipTrigger asChild>"

requirements-completed: [GUEST-01]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 5 Plan 03: Manager and Guest Submissions Pages Summary

**Manager page with faculty filter dropdown and ZIP blob download, plus read-only guest page for faculty-scoped selected articles**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T07:14:47Z
- **Completed:** 2026-02-26T07:17:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Manager page at /manager/submissions shows all selected submissions across all faculties with a faculty filter Select dropdown that re-fetches with ?facultyId param
- Download ZIP button disabled before finalClosureDate with Tooltip explanation; when enabled triggers streaming blob download with loading state
- Guest page at /guest/submissions shows read-only table of selected articles for the guest's assigned faculty — no toggle, no notes, no comment input
- Both pages handle loading (Skeleton rows), error (inline message), and empty states

## Task Commits

Each task was committed atomically:

1. **Task 1: Create manager submissions page with faculty filter and ZIP download** - `8a0d402` (feat)
2. **Task 2: Create guest submissions page (read-only selected articles for assigned faculty)** - `579e8ef` (feat)

## Files Created/Modified
- `app/(management)/manager/submissions/page.tsx` - Manager selected submissions with faculty filter Select, ZIP download button (disabled before finalClosureDate with Tooltip), loading/error/empty states
- `app/(management)/guest/submissions/page.tsx` - Read-only selected articles table for guest's faculty, Skeleton loading, error/empty states, GUEST-01 compliance

## Decisions Made
- Two `useEffect` pattern in manager page: one fires on mount (faculties + academic year static data), one fires on `selectedFacultyId` dependency change (submissions refetch) — clean separation of concerns
- Disabled button wrapped in `<span tabIndex={0}>` inside `<TooltipTrigger asChild>` — disabled HTML elements do not fire mouse events so Tooltip would not show without the span wrapper
- Empty string (`""`) used as the value for "All Faculties" SelectItem — using `undefined` or `null` would cause controlled/uncontrolled input warnings in React
- Guest table rows have no `hover:bg-slate-50` class (pure read-only intent) unlike manager table which includes the hover style

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Manager submissions page ready at /manager/submissions with full faculty filter and ZIP download
- Guest submissions page ready at /guest/submissions (GUEST-01 complete)
- Remaining Wave 2 pages: coordinator submissions (05-02), reports pages (05-04, 05-05)

## Self-Check: PASSED

- `app/(management)/manager/submissions/page.tsx` — FOUND
- `app/(management)/guest/submissions/page.tsx` — FOUND
- `.planning/phases/05-ui-layer/05-03-SUMMARY.md` — FOUND
- Commit `8a0d402` (Task 1) — FOUND
- Commit `579e8ef` (Task 2) — FOUND

---
*Phase: 05-ui-layer*
*Completed: 2026-02-26*
