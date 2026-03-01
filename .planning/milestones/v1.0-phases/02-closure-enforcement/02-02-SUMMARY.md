---
phase: 02-closure-enforcement
plan: 02
subsystem: api
tags: [nextjs, prisma, vercel-blob, closure-guard, submissions]

# Dependency graph
requires:
  - phase: 01-schema-and-infrastructure
    provides: isPastFinalClosure from lib/closure-guard.ts
  - phase: 02-closure-enforcement
    plan: 01
    provides: PUT /api/submissions guard pattern with 403 response shape
provides:
  - POST /api/submissions/files returns 403 after finalClosureDate
  - DELETE /api/submissions/files returns 403 after finalClosureDate
  - POST /api/submissions/upload (Vercel Blob token) returns 400 after finalClosureDate
affects:
  - phase 03-coordinator-workflow
  - phase 04-zip-and-delivery
  - any UI that calls /api/submissions/files or /api/submissions/upload

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vercel Blob gate: throw inside onBeforeGenerateToken causes handleUpload to reject, outer catch returns 400"
    - "Consistent 403 shape for direct route guards, 400 for blob token callback throws"

key-files:
  created: []
  modified:
    - app/api/submissions/files/route.ts
    - app/api/submissions/upload/route.ts

key-decisions:
  - "DELETE /api/submissions/files is gated on finalClosure (not firstClosure) — students can delete drafts after first closure but file removes are fully blocked after final closure per CLOS-02"
  - "Blob gate placed in onBeforeGenerateToken (not onUploadCompleted) — token must be blocked before CDN upload begins; post-upload gate would leave blobs orphaned on CDN"
  - "throw new Error() used in onBeforeGenerateToken callback (not NextResponse) — handleUpload propagates thrown errors to outer catch block which serializes them as {error: message} with status 400"

patterns-established:
  - "isPastFinalClosure pattern: import, await check, return 403 — same shape in all direct route handlers"
  - "onBeforeGenerateToken closure gate: throw before submissionId validation — earliest safe rejection point in blob token flow"

requirements-completed: [CLOS-02]

# Metrics
duration: 1min
completed: 2026-02-26
---

# Phase 02 Plan 02: File Route Closure Enforcement Summary

**finalClosure gate added to POST/DELETE /api/submissions/files (403) and Vercel Blob token generation in /api/submissions/upload (400 via throw), blocking all file mutations after finalClosureDate**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T09:02:31Z
- **Completed:** 2026-02-26T09:03:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- POST /api/submissions/files now returns 403 after finalClosureDate — no SubmissionFile records can be created
- DELETE /api/submissions/files now returns 403 after finalClosureDate — no SubmissionFile records can be deleted
- POST /api/submissions/upload onBeforeGenerateToken now throws when past finalClosureDate — Vercel Blob token is never issued, upload cannot proceed, outer catch returns 400

## Task Commits

Each task was committed atomically:

1. **Task 1: Add finalClosure gate to POST and DELETE handlers in files/route.ts** - `90f1569` (feat)
2. **Task 2: Add finalClosure gate to onBeforeGenerateToken in upload/route.ts** - `7369950` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `app/api/submissions/files/route.ts` - POST and DELETE handlers now check isPastFinalClosure() after 401 guard, returning 403 before any DB access
- `app/api/submissions/upload/route.ts` - onBeforeGenerateToken now throws "Submissions are locked..." as first check after submissionId extraction

## Decisions Made
- DELETE is gated on finalClosure only (not firstClosure) — students may delete drafts between first and final closure; only final closure fully locks file removes
- Blob gate goes in onBeforeGenerateToken (not onUploadCompleted) — token must be refused before the CDN upload starts; blocking at completion point would leave orphaned blobs on Vercel CDN
- throw vs return: onBeforeGenerateToken is a callback inside handleUpload, so NextResponse cannot be returned — throwing propagates through handleUpload's own error handling and the outer POST catch serializes it as { error: message } with status 400

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CLOS-02 fully satisfied: file adds, file removes, and blob upload tokens are all blocked after finalClosureDate
- Remaining closure enforcement tasks in Phase 02 can proceed (if any)
- Phase 03 coordinator workflow can rely on finalClosure enforcement being complete for the submission mutation surface

---
*Phase: 02-closure-enforcement*
*Completed: 2026-02-26*

## Self-Check: PASSED

- app/api/submissions/files/route.ts: FOUND
- app/api/submissions/upload/route.ts: FOUND
- .planning/phases/02-closure-enforcement/02-02-SUMMARY.md: FOUND
- Commit 90f1569: FOUND
- Commit 7369950: FOUND
- isPastFinalClosure in files/route.ts: FOUND
- isPastFinalClosure in upload/route.ts: FOUND
- TypeScript: CLEAN (npx tsc --noEmit exits 0)
