---
phase: 02-closure-enforcement
plan: "03"
subsystem: api
tags: [next.js, closure-guard, route-stub, rest-api]

# Dependency graph
requires:
  - phase: 02-closure-enforcement/02-01
    provides: closure-guard functions (isPastFinalClosure) in lib/closure-guard.ts
provides:
  - POST /api/comments endpoint stub enforcing finalClosure gate (403) and returning 501 for pre-closure requests
affects:
  - 03-comments (will replace the 501 stub with full comment creation logic)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route stub pattern: auth gate (401) → closure gate (403) → 501 fallback for deferred Phase 3 work"

key-files:
  created:
    - app/api/comments/route.ts
  modified: []

key-decisions:
  - "Stub approach chosen over full implementation: avoids dead code risk, keeps CLOS-03 verifiable now, Phase 3 replaces the 501 branch"
  - "Guard order: auth check (401) first, then isPastFinalClosure (403), then 501 fallback — consistent with all other route handlers in project"

patterns-established:
  - "Route stub: auth → closure-gate → 501 (use when full logic belongs to a future phase but the route must be verifiable now)"

requirements-completed: [CLOS-03]

# Metrics
duration: 1min
completed: 2026-02-26
---

# Phase 2 Plan 03: Comments Route Stub Summary

**POST /api/comments stub with finalClosure gate returning 403 if past finalClosureDate, 501 otherwise — satisfies CLOS-03 without pre-building Phase 3 comment logic**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T08:42:30Z
- **Completed:** 2026-02-26T08:43:43Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `app/api/comments/route.ts` with the auth + finalClosure guard pattern matching all existing route handlers
- POST requests from unauthenticated users → 401
- POST requests past finalClosureDate → 403 with "Comments are locked. The final closure date has passed."
- POST requests pre-closure from authenticated users → 501 (Phase 3 stub)
- TypeScript build passes cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create app/api/comments/route.ts stub with finalClosure gate** - `5c51340` (feat)

**Plan metadata:** committed with docs commit (see below)

## Files Created/Modified

- `app/api/comments/route.ts` - Phase 2 stub: auth guard (401), isPastFinalClosure gate (403), 501 fallback for Phase 3

## Decisions Made

- Stub approach over full implementation: ROADMAP requires a testable route for CLOS-03, but full comment logic (thread model, faculty scope, SubmissionComment insert) belongs to Phase 3. The stub satisfies the verification criterion without creating dead code.
- Guard order unchanged from project convention: auth first, closure second, feature logic last.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CLOS-03 is fully satisfied: POST /api/comments returns 403 after finalClosureDate and 501 before it (not 404)
- Phase 3 must replace the 501 branch in `app/api/comments/route.ts` with: parse body, validate submissionId, check faculty scope, insert SubmissionComment record
- No blockers for Phase 3

---
*Phase: 02-closure-enforcement*
*Completed: 2026-02-26*
