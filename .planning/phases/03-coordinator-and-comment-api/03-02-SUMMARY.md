---
phase: 03-coordinator-and-comment-api
plan: "02"
subsystem: api
tags: [nextjs, prisma, coordinator, submissions, role-based-access, closure-guard]

# Dependency graph
requires:
  - phase: 03-01
    provides: "title field on Submission model, parentId self-relation on SubmissionComment"
  - phase: 02-01
    provides: "isPastFinalClosure closure guard, faculty-scoped submission ownership pattern"
provides:
  - "GET /api/coordinator/submissions — faculty-scoped SUBMITTED submissions list"
  - "PATCH /api/coordinator/submissions/[id] — isSelected toggle and notes update with faculty ownership and finalClosure gate"
affects:
  - "03-03-comments-api"
  - "04-manager-and-public-views"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Faculty-scoped coordinator guard: auth → role → facultyId → isPastFinalClosure → ownership"
    - "Partial update pattern: only update fields explicitly present in request body"

key-files:
  created:
    - app/api/coordinator/submissions/route.ts
    - app/api/coordinator/submissions/[id]/route.ts
  modified: []

key-decisions:
  - "Guard order for PATCH: auth → role → faculty → finalClosure → ownership — closure check before DB fetch to fail fast"
  - "isSelected and notes only updated when explicitly present in body — undefined means 'no change', not 'clear'"
  - "selectedAt and selectedById NOT populated (AUDIT-V2-01 deferred)"

patterns-established:
  - "Coordinator faculty guard: prisma.user.findUnique({ select: { facultyId } }) then 403 if null"
  - "Faculty ownership: submission.facultyId !== coordinatorFacultyId → 403 after finding submission"
  - "Partial update guard: Object.keys(updateData).length === 0 → 400 if no valid fields"

requirements-completed:
  - COORD-01
  - COORD-03
  - COORD-04

# Metrics
duration: 1min
completed: 2026-02-26
---

# Phase 3 Plan 02: Coordinator Submissions API Summary

**Faculty-scoped coordinator submissions GET and PATCH endpoints with role/faculty/closure guards, isSelected toggle, and notes editing**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T08:10:17Z
- **Completed:** 2026-02-26T08:11:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- GET /api/coordinator/submissions returns only SUBMITTED submissions from the coordinator's own faculty with flat response shape (id, title, status, studentName, submittedAt, isSelected, notes, fileCount)
- PATCH /api/coordinator/submissions/[id] enforces four-layer guard (auth, role, faculty, finalClosure) before checking submission ownership, then updates isSelected and/or notes selectively
- Cross-faculty coordinators receive 403 on both endpoints; requests after finalClosureDate receive 403 on PATCH

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GET /api/coordinator/submissions** - `bb4edc5` (feat)
2. **Task 2: Create PATCH /api/coordinator/submissions/[id]** - `37ec6c9` (feat)

## Files Created/Modified

- `app/api/coordinator/submissions/route.ts` - Faculty-scoped coordinator submissions list (GET), filters by SUBMITTED status and coordinator's facultyId
- `app/api/coordinator/submissions/[id]/route.ts` - isSelected toggle and notes update (PATCH), enforces faculty ownership and finalClosure gate

## Decisions Made

- Guard order for PATCH puts finalClosure check before submission fetch: auth → role → faculty → finalClosure → fetch → ownership. This fails fast on the most common locked state without an unnecessary DB query.
- isSelected and notes are only written when explicitly present in the request body (undefined = no change, not clear). This allows callers to update one field without affecting the other.
- selectedAt and selectedById are NOT populated per AUDIT-V2-01 — those are v2 audit fields, deferred.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Coordinator submission list and mutation endpoints are complete and compile cleanly
- Plan 03-03 (comments API) can proceed — it builds on the same faculty guard pattern established here
- The app/api/comments/route.ts was observed in a "modified" state (pre-existing uncommitted changes from a prior session) — this is the Plan 03-03 scope and is handled there

---
*Phase: 03-coordinator-and-comment-api*
*Completed: 2026-02-26*
