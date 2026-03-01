---
phase: 01-schema-and-infrastructure
plan: 03
subsystem: infra
tags: [typescript, prisma, date-comparison, closure-guard]

# Dependency graph
requires:
  - phase: 01-01
    provides: "AcademicYear model with firstClosureDate, finalClosureDate, isActive fields"
provides:
  - "getActiveAcademicYear(): queries prisma.academicYear where isActive:true, returns typed object or null"
  - "isPastFirstClosure(): returns false for null date or no active year; end-of-day cutoff comparison"
  - "isPastFinalClosure(): same pattern as isPastFirstClosure but using finalClosureDate"
affects:
  - "02-closure-enforcement"
  - "03-coordinator-and-communication"
  - "04-download-and-reporting"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "End-of-day cutoff pattern: setHours(23, 59, 59, 999) on closure date before Date.now() comparison"
    - "Nullable guard pattern: return false early when closureDate is null (not throw)"
    - "No-active-year guard pattern: return false when getActiveAcademicYear() returns null"

key-files:
  created:
    - "lib/closure-guard.ts"
  modified: []

key-decisions:
  - "End-of-day cutoff via setHours(23, 59, 59, 999): treats closure date as end-of-day to avoid midnight UTC boundary issues for users in eastern timezones — consistent with existing pattern in app/(student)/submissions/page.tsx"
  - "No caching added: functions query DB directly on every call — simple and correct; Phase 2 can add caching if needed"
  - "No date-fns dependency: native Date comparison is sufficient, avoids adding a new library"

patterns-established:
  - "Closure guard pattern: getActiveAcademicYear() -> null check -> null date check -> end-of-day cutoff -> Date.now() comparison"

requirements-completed: [INFRA-01]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Phase 1 Plan 03: Closure Guard Summary

**Three async date-gate utilities in lib/closure-guard.ts: getActiveAcademicYear, isPastFirstClosure, isPastFinalClosure with end-of-day cutoff and full nullable/no-active-year guards**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-25T17:52:08Z
- **Completed:** 2026-02-25T17:53:04Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `lib/closure-guard.ts` created with all three exported async functions
- End-of-day cutoff (`setHours(23, 59, 59, 999)`) applied to both closure date comparisons
- Full nullable and no-active-year guards (return false, never throw) confirmed by inline fixture test
- TypeScript compilation clean with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/closure-guard.ts** - `445b5ca` (feat)
2. **Task 2: Verify Closure Guard Correctness with Inline Fixture Test** - no file changes (test at /tmp, passed)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `lib/closure-guard.ts` - Three async closure date gate utilities: getActiveAcademicYear (queries isActive:true), isPastFirstClosure, isPastFinalClosure (both with end-of-day cutoff and null/no-year guards)

## Decisions Made

- **End-of-day cutoff:** `setHours(23, 59, 59, 999)` applied before comparison, treating closure date as "end of that calendar day." Rationale: avoids midnight UTC boundary edge case for users in eastern timezones. Consistent with existing pattern in `app/(student)/submissions/page.tsx`.
- **No caching:** Functions query DB directly on every call. Simple, correct, and unblocking. Phase 2 can add caching if performance profiling warrants it.
- **No date-fns:** Native `Date` API is sufficient for end-of-day manipulation. Avoids adding a library for one-line operations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation matched plan specification, TypeScript build clean on first attempt, all three fixture test cases passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/closure-guard.ts` is fully ready for import by Phase 2 closure enforcement route handlers
- All three functions handle every edge case: null dates, no active year — return false (not throw)
- The `getActiveAcademicYear()` function also provides `id` field needed for Phase 3+ submission creation (academicYearId FK)

## Self-Check: PASSED

- FOUND: lib/closure-guard.ts
- FOUND commit: 445b5ca (Task 1)
- Export count: 3 (grep -c "export async function" = 3)
- End-of-day pattern present: setHours(23, 59, 59, 999) appears twice (once per closure date function)
- TypeScript build: CLEAN (npx tsc --noEmit exits 0)
- Fixture test: 3/3 PASS (null->false, past->true, future->false)

---
*Phase: 01-schema-and-infrastructure*
*Completed: 2026-02-25*
