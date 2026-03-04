---
phase: 06-critical-fixes
plan: 03
subsystem: api, ui
tags: [zip-download, manager, closure-gate, tooltip, react, nextjs]

# Dependency graph
requires:
  - phase: 06-critical-fixes
    provides: ZIP download route with closure gate (06-01) and manager submissions UI with Tooltip (06-01)
provides:
  - ZIP download route with no closure gate (auth + role only)
  - Manager submissions page with always-enabled Download ZIP button
affects: [phase-07, phase-08, phase-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reverting closure-gated feature: remove guard from API route + disabled state from UI"

key-files:
  created: []
  modified:
    - app/api/manager/submissions/download/route.ts
    - app/(management)/manager/submissions/page.tsx

key-decisions:
  - "Removed Guard 3 (inverted closure gate) from download route leaving only auth + role guards"
  - "Removed finalClosureDate state/setter and isPastFinalClosure derived boolean from manager page"
  - "Kept finalClosureDate in API response from submissions route (harmless, no removal needed)"
  - "Button disabled prop now only references downloadingYearId (active download in progress)"

patterns-established:
  - "Closure gates must be confirmed with business requirements before adding — reverting costs extra work"

requirements-completed: [MGR-02]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 6 Plan 03: ZIP Download Closure Gate Removal Summary

**Reversed MGR-02 closure gate: ZIP download route now has auth+role only, manager UI Download ZIP button always enabled without Tooltip gate**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T19:11:08Z
- **Completed:** 2026-03-02T19:13:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed `isPastFinalClosure` import and Guard 3 block from the download route so Marketing Managers can download at any time
- Removed `finalClosureDate` state, `isPastFinalClosure` derived boolean, Tooltip imports, and TooltipProvider wrapper from manager submissions page
- Button `disabled` prop now only blocks during active download (`downloadingYearId !== null`), never due to date

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove closure gate from ZIP download API route** - `a22446c` (fix)
2. **Task 2: Remove disabled state and Tooltip gate from manager UI Download ZIP button** - `58abe2b` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/api/manager/submissions/download/route.ts` - Removed `isPastFinalClosure` import and Guard 3 closure check; route now auth + role + ZIP assembly only
- `app/(management)/manager/submissions/page.tsx` - Removed `finalClosureDate` state, `isPastFinalClosure` boolean, TooltipProvider block, Tooltip imports; replaced with plain always-enabled Button

## Decisions Made
- Kept `finalClosureDate` in API response from `app/api/manager/submissions/route.ts` — it is harmless and no UI consumer reads it after this change
- Retained `format` import from `date-fns` as it is still used in the `formatDate` helper function

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ZIP download is fully ungated for Marketing Managers
- Plans 04 and 05 (remaining gap closure items) can proceed independently
- Phase 7 (Student Comment Thread) unblocked

---
*Phase: 06-critical-fixes*
*Completed: 2026-03-03*
