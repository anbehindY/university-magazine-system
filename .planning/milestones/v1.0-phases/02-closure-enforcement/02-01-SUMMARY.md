---
phase: 02-closure-enforcement
plan: 01
subsystem: api
tags: [closure-guard, submissions, next-js, prisma, academic-year]

# Dependency graph
requires:
  - phase: 01-schema-and-infrastructure
    provides: isPastFirstClosure, isPastFinalClosure, getActiveAcademicYear from lib/closure-guard.ts; Submission.academicYearId, Submission.facultyId schema fields; AcademicYear.isActive flag
provides:
  - POST /api/submissions blocked after firstClosureDate with 403
  - POST /api/submissions populates academicYearId and facultyId on created submission records
  - PUT /api/submissions blocked after finalClosureDate with 403
  - PUT /api/submissions SUBMITTED transition blocked when agreed is false with 400
affects:
  - 02-02-files (file mutation routes in same submission domain)
  - 03-coordinator (submission scoping by academicYearId and facultyId)
  - 04-reporting (academicYearId needed for year-scoped reports)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closure guard wiring: import isPastFirstClosure/isPastFinalClosure/getActiveAcademicYear from @/lib/closure-guard; call before any DB write; return 403 before findFirst/create/update"
    - "Guard order: auth (401) -> body validation (400) -> closure check (403) -> DB read -> business rule check (400) -> DB write"
    - "academicYearId/facultyId population: call getActiveAcademicYear() for id, prisma.user.findUnique for facultyId (not session.user.facultyId — reliability)"
    - "Agreed guard: effectiveAgreed = typeof body.agreed === 'boolean' ? body.agreed : existing.agreed — consults persisted value when body omits it"

key-files:
  created: []
  modified:
    - app/api/submissions/route.ts

key-decisions:
  - "Two-call pattern for POST: isPastFirstClosure() first (gate, returns bool), then getActiveAcademicYear() separately for the id — extra indexed PK lookup is negligible"
  - "facultyId fetched via prisma.user.findUnique rather than session.user.facultyId — session field availability not guaranteed for custom user fields in better-auth"
  - "finalClosure guard in PUT placed after body.id validation but before prisma.submission.findFirst — avoids unnecessary DB read when locked"
  - "agreed guard uses existing.agreed as fallback — prevents status-only updates (body.agreed absent) from being incorrectly blocked when user previously agreed"

patterns-established:
  - "Pattern: Inline closure guard at top of handler body after auth check — middleware cannot access Prisma (Edge runtime limitation)"
  - "Pattern: findFirst select must include all fields needed for business rule checks (agreed added for SUBMITTED guard)"

requirements-completed: [CLOS-01, CLOS-04]

# Metrics
duration: 1min
completed: 2026-02-26
---

# Phase 2 Plan 01: Closure Enforcement on Submissions Route Summary

**POST /api/submissions gated by firstClosureDate with academicYearId/facultyId population; PUT gated by finalClosureDate with T&C agreed guard on SUBMITTED transitions**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T03:02:29Z
- **Completed:** 2026-02-26T03:03:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- POST handler: returns 403 with human-readable message when isPastFirstClosure(); all new submissions carry academicYearId (active year) and facultyId (from DB user lookup)
- PUT handler: returns 403 when isPastFinalClosure() — placed after body.id check but before findFirst to avoid unnecessary DB reads when locked
- PUT SUBMITTED transition: checks effectiveAgreed (body.agreed ?? existing.agreed) and returns 400 if false; existing.agreed fetched by adding agreed to findFirst select

## Task Commits

Each task was committed atomically:

1. **Task 1: Add firstClosure gate and academicYearId/facultyId population to POST handler** - `6eaed50` (feat)
2. **Task 2: Add finalClosure gate and agreed guard to PUT handler** - `ef4ff2f` (feat)

## Files Created/Modified

- `app/api/submissions/route.ts` - Added isPastFirstClosure/isPastFinalClosure/getActiveAcademicYear imports; POST gate + academicYearId/facultyId population; PUT finalClosure gate + agreed guard on SUBMITTED transition

## Decisions Made

- Two-call pattern for POST (isPastFirstClosure for gate, separate getActiveAcademicYear for id) chosen for clarity — extra indexed PK lookup is negligible
- facultyId fetched via separate prisma.user.findUnique rather than relying on session.user.facultyId — custom user fields in better-auth session not guaranteed without explicit config
- PUT's finalClosure guard placed after body.id check (400) but before findFirst — consistent guard order: auth (401) -> validation (400) -> closure (403) -> DB read -> business rules (400) -> write
- effectiveAgreed uses `typeof body.agreed === 'boolean' ? body.agreed : existing.agreed` — handles status-only updates where body omits agreed but user previously agreed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CLOS-01 and CLOS-04 complete: POST and PUT on main submissions route are enforcement-ready
- Plan 02 (files routes) and Plan 03 (upload route) apply the same finalClosure pattern to file mutation handlers
- Phase 3 coordinator work can rely on academicYearId and facultyId being populated on all submissions created from this point forward

## Self-Check: PASSED

- `app/api/submissions/route.ts` - FOUND
- Commit `6eaed50` (Task 1) - FOUND
- Commit `ef4ff2f` (Task 2) - FOUND
- TypeScript build: clean (npx tsc --noEmit exits 0)

---
*Phase: 02-closure-enforcement*
*Completed: 2026-02-26*
