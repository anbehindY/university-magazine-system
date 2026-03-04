---
phase: quick-13
plan: 13
subsystem: database
tags: [seed, prisma, exceptions, reports]

# Dependency graph
requires:
  - phase: quick-6
    provides: Exceptions report with pending/overdue distinction based on daysSinceSubmission
provides:
  - Seed data with 10 pending + 15 overdue no-comment exceptions for 2025-2026 academic year
affects: [reports, exceptions-report, seed]

# Tech tracking
tech-stack:
  added: []
  patterns: [Fixed dates for deterministic test states in seed data]

key-files:
  created: []
  modified:
    - prisma/seed.ts

key-decisions:
  - "Students i=13,14 in the 2025-2026 loop get fixed submittedAt dates (2026-04-05, 2026-04-10) instead of random Oct-Feb dates — creates pending exceptions (< 14 days from finalClosureDate 2026-04-15)"
  - "No new students added — reused existing loop indices that already have hasComment=false; only the submittedAt changed"

patterns-established:
  - "Use fixed anchor dates for seed data test states that depend on time-relative comparisons"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-05
---

# Quick Task 13: Seed Data Pending Exceptions Summary

**Seed data updated so exceptions report shows both pending (< 14 days, 10 total) and overdue (14+ days, 15 total) no-comment submissions across 5 faculties for 2025-2026**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-05T17:50:00Z
- **Completed:** 2026-03-05T17:55:04Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Modified `prisma/seed.ts` so students at loop index 13 and 14 (per faculty) receive fixed recent submittedAt dates
- `i=13` gets `2026-04-05T12:00:00Z` (10 days before finalClosureDate) — pending exception
- `i=14` gets `2026-04-10T12:00:00Z` (5 days before finalClosureDate) — pending exception
- Students at i=10, 11, 12 retain random Oct 2025 - Feb 2026 dates — overdue exceptions (40-170+ days)
- Added console.log noting `"(includes 2 pending + 3 overdue exceptions per faculty)"` after 2025-2026 seed block

## Task Commits

1. **Task 1: Add pending-exception submissions to 2025-2026 seed data** - `b2bb666` (feat)

## Files Created/Modified

- `prisma/seed.ts` - Changed submittedAt assignment inside i<15 SUBMITTED block to use fixed dates for i=13,14; added console.log note

## Decisions Made

- Used fixed anchor dates (`2026-04-05`, `2026-04-10`) rather than adding new students — cleanest change, no schema impact, reuses the existing no-comment student slots (i=10..14 already have `hasComment=false`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The plan's automated verification snippet used escaped `\!` which caused a shell syntax error when passed via `-e`, but the verification was re-run correctly using a non-negated syntax. The seed.ts file compiles cleanly with `tsc --noEmit`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Run `pnpm db:seed` against a fresh database to apply the updated seed
- Exceptions report at `/reports` (Exceptions tab) will now show both "Pending" (< 14 days) and "Overdue" (14+ days) entries
- 10 pending exceptions (2 per faculty) + 15 overdue exceptions (3 per faculty) = 25 total exceptions visible in the report

---
*Phase: quick-13*
*Completed: 2026-03-05*
