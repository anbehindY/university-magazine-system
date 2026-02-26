---
phase: 04-manager-and-reports-api
plan: "01"
subsystem: api
tags: [nextjs, prisma, archiver, zip, role-based-access]

# Dependency graph
requires:
  - phase: 01-schema-and-infrastructure
    provides: Prisma schema with Submission, Faculty, User models; prisma client
  - phase: 02-closure-enforcement
    provides: Submission isSelected field, MARKETING_MANAGER role exists in auth
  - phase: 03-coordinator-and-comment-api
    provides: coordinator submissions pattern for route structure reference

provides:
  - GET /api/manager/submissions — role-gated, faculty-resolved, sorted submissions list
  - archiver and @types/archiver installed for ZIP download plan

affects:
  - 04-03 (ZIP download endpoint uses archiver installed here)

# Tech tracking
tech-stack:
  added:
    - archiver@7.0.1 (streaming ZIP creation)
    - "@types/archiver@7.0.0 (TypeScript types for archiver)"
  patterns:
    - "Snapshot facultyId resolution: separate prisma.faculty.findMany() + Map<string,string> lookup — no ORM relation on snapshot field"
    - "Application-layer sort for resolved names: Prisma orderBy cannot sort by resolved facultyName"
    - "Nullable snapshot field guard: (s.facultyId ? facultyMap.get(s.facultyId) : undefined) ?? fallback"

key-files:
  created:
    - app/api/manager/submissions/route.ts
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Faculty name resolved via separate query + Map — Submission.facultyId is a snapshot string with no ORM relation to Faculty; this pattern is established in 03-CONTEXT and maintained here"
  - "Application-layer sort (facultyName asc, submittedAt desc) — Prisma orderBy cannot sort by a resolved name from a snapshot field"
  - "facultyId filter uses optional spreading (...facultyId ? { facultyId } : {}) consistent with project patterns"

patterns-established:
  - "Snapshot field resolution: always use separate findMany + Map, never join ORM relation that does not exist"
  - "Manager route structure: auth gate (401) → role gate (403) → query → resolve names → sort → return"

requirements-completed:
  - MGR-01
  - MGR-02

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 4 Plan 01: Manager Submissions List Summary

**GET /api/manager/submissions returning role-gated, faculty-resolved, sorted selected submissions across all faculties, with archiver installed for ZIP download**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T05:04:38Z
- **Completed:** 2026-02-26T05:06:38Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Installed archiver@7.0.1 and @types/archiver@7.0.0 for the upcoming ZIP download endpoint (Plan 03)
- Created GET /api/manager/submissions with MARKETING_MANAGER role gate returning 401 without auth, 403 for non-manager roles
- Faculty name resolution uses separate prisma.faculty.findMany() + Map lookup, correctly handling the snapshot pattern where facultyId has no ORM relation
- Application-layer sort: faculty name ascending, then submittedAt descending within each faculty
- Optional ?facultyId=X filter narrows results to a single faculty
- TypeScript compiles clean with correct handling of nullable facultyId and submittedAt fields on Submission

## Task Commits

Each task was committed atomically:

1. **Task 1: Install archiver and create GET /api/manager/submissions** - `6e49952` (feat)

## Files Created/Modified

- `app/api/manager/submissions/route.ts` - MARKETING_MANAGER-gated submissions list with faculty resolution and application-layer sort
- `package.json` - archiver added to dependencies, @types/archiver added to devDependencies
- `pnpm-lock.yaml` - lockfile updated with new packages

## Decisions Made

- Faculty name resolved via separate `prisma.faculty.findMany()` + `Map<string, string>` — Submission.facultyId is a snapshot string with no Prisma relation to Faculty; this pattern was established in Phase 4 context and is consistent with the coordinator endpoint approach
- Application-layer sort chosen over Prisma `orderBy` because resolved `facultyName` is computed after the DB query; Prisma cannot sort by a field that does not exist on the model
- Nullable `facultyId` handled with guard `(s.facultyId ? facultyMap.get(s.facultyId) : undefined) ?? s.facultyId ?? ""` — prevents `Map.get(null)` type error and falls back gracefully for submissions with no faculty assigned

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript errors from nullable facultyId and submittedAt on Submission model**
- **Found during:** Task 1 (route creation and TypeScript verification)
- **Issue:** `Submission.facultyId` is `String?` (nullable) and `Submission.submittedAt` is `DateTime?` (nullable). `Map.get(null)` is a type error; `localeCompare` on a possibly-null string is also a type error. Initial implementation assumed non-nullable fields.
- **Fix:** Added nullable guard for facultyId (`s.facultyId ? facultyMap.get(s.facultyId) : undefined`), fallback to `s.facultyId ?? ""` for display, and `?? 0` for date comparison
- **Files modified:** `app/api/manager/submissions/route.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `6e49952` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix for nullable schema field types)
**Impact on plan:** Auto-fix required for correctness. No scope creep.

## Issues Encountered

- Previous session had already committed this plan's work (Task 1) bundled with plan 04-02 work in commit `6e49952`. Plan 04-01 work was already complete; verified all artifacts exist and TypeScript passes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GET /api/manager/submissions is live and ready for Plan 02 (exception reports) and Plan 03 (ZIP download)
- archiver installed and available — Plan 03 can use it immediately without package.json conflicts
- Pattern established for snapshot field resolution will apply in Plan 03 when building ZIP from selected submissions

---
*Phase: 04-manager-and-reports-api*
*Completed: 2026-02-26*
