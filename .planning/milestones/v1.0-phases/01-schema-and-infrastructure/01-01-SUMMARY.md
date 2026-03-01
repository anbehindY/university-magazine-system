---
phase: 01-schema-and-infrastructure
plan: 01
subsystem: database
tags: [prisma, postgresql, schema, migration, typescript]

# Dependency graph
requires: []
provides:
  - "AcademicYear model with firstClosureDate, finalClosureDate, isActive fields"
  - "Submission model with isSelected, selectedAt, selectedById, facultyId, academicYearId fields"
  - "SubmissionComment model with submissionId index and cascade delete"
  - "User back-references: selectedSubmissions and submissionComments"
  - "Migration 20260225174304_phase1_schema applied to database"
  - "Public academic-years API returns isActive year only"
  - "Admin academic-years API supports full field CRUD with single-active-year transaction"
affects:
  - "02-closure-guard"
  - "03-coordinator-and-communication"
  - "04-download-and-reporting"
  - "05-ux-and-polish"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-active-year invariant via prisma.$transaction with updateMany+update"
    - "isActive flag on AcademicYear used for active year query instead of date heuristics"

key-files:
  created:
    - "prisma/migrations/20260225174304_phase1_schema/migration.sql"
  modified:
    - "prisma/schema.prisma"
    - "app/api/admin/academic-years/route.ts"
    - "app/api/academic-years/route.ts"
    - "app/(management)/admin/page.tsx"
    - "app/(student)/submissions/page.tsx"

key-decisions:
  - "Prisma generated DROP+ADD for closure_date->first_closure_date instead of RENAME COLUMN; accepted since dev database has no production data to preserve"
  - "Public academic-years GET now queries isActive:true instead of date-ordering heuristics — cleaner and deterministic"
  - "Single-active-year invariant enforced in PUT handler via prisma.$transaction — deactivates all other years before activating target"
  - "Local variable named closureDate in submissions/page.tsx retained as internal JS variable; no schema field reference remains"

patterns-established:
  - "isActive flag pattern: only one AcademicYear has isActive:true at any time, enforced transactionally in PUT"
  - "Named relation pattern: SubmissionSelector used bidirectionally on User.selectedSubmissions and Submission.selectedBy"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 1 Plan 01: Schema and Infrastructure Summary

**Prisma Phase 1 migration applying firstClosureDate/finalClosureDate/isActive on AcademicYear, isSelected/selectedAt/selectedById/facultyId/academicYearId on Submission, and new SubmissionComment model with zero TypeScript errors**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T17:42:16Z
- **Completed:** 2026-02-25T17:44:45Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Schema updated with all Phase 1 fields across AcademicYear, Submission, User models and new SubmissionComment model
- Migration `20260225174304_phase1_schema` applied to Neon PostgreSQL database with Prisma client regenerated
- All five TypeScript files updated — zero remaining `.closureDate` property accesses, `npx tsc --noEmit` exits clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Prisma Schema** - `65dc727` (feat)
2. **Task 2: Run Migration and Update All closureDate References** - `86fa0a0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `prisma/schema.prisma` - Added firstClosureDate, finalClosureDate, isActive to AcademicYear; added selection/year fields to Submission; added SubmissionComment model; added User back-references
- `prisma/migrations/20260225174304_phase1_schema/migration.sql` - Migration SQL applying all schema changes to the database
- `app/api/admin/academic-years/route.ts` - Updated to use firstClosureDate/finalClosureDate/isActive; added transaction-based single-active-year enforcement in PUT
- `app/api/academic-years/route.ts` - Rewritten to query `isActive: true` instead of date-ordering heuristics; returns firstClosureDate and finalClosureDate
- `app/(management)/admin/page.tsx` - Updated AcademicYearItem type with new fields; replaced closureDate display with firstClosureDate
- `app/(student)/submissions/page.tsx` - Updated API payload type and field access from closureDate to firstClosureDate

## Decisions Made

- **DROP + ADD vs RENAME:** Prisma generated `DROP COLUMN "closure_date" / ADD COLUMN "first_closure_date"` instead of `RENAME COLUMN`. Accepted for dev database since no production data exists to preserve. Plan noted this risk and said to stop and manually edit if data loss mattered — it does not in this context.
- **isActive query:** Public `GET /api/academic-years` now returns `findFirst({ where: { isActive: true } })` instead of the previous chained date-ordering heuristic. This is deterministic and matches the new schema invariant.
- **Single-active-year transaction:** The admin PUT handler uses `prisma.$transaction([updateMany(deactivate all others), update(activate target)])` to enforce exactly one active year at all times.

## Deviations from Plan

None - plan executed exactly as written. The `prisma migrate dev` output was reviewed; DROP+ADD behaviour was a documented risk in the plan and accepted for dev database.

## Issues Encountered

None - schema validated cleanly, migration applied without rollback, TypeScript build clean on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema foundation is complete and all downstream plans can rely on: firstClosureDate, finalClosureDate, isActive on AcademicYear; isSelected, selectedAt, selectedById, facultyId, academicYearId on Submission; SubmissionComment model
- Plan 02 (seed/fixtures) and Plan 03 (closure guard) can proceed immediately
- The isActive flag is the authoritative source for "current academic year" — no date heuristics needed in any future plan

## Self-Check: PASSED

- FOUND: prisma/schema.prisma
- FOUND: prisma/migrations/20260225174304_phase1_schema/migration.sql
- FOUND: app/api/admin/academic-years/route.ts
- FOUND: app/api/academic-years/route.ts
- FOUND: .planning/phases/01-schema-and-infrastructure/01-01-SUMMARY.md
- FOUND commit: 65dc727 (Task 1)
- FOUND commit: 86fa0a0 (Task 2)

---
*Phase: 01-schema-and-infrastructure*
*Completed: 2026-02-25*
