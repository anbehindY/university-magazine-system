---
phase: 03-coordinator-and-comment-api
plan: "03"
subsystem: api
tags: [comments, email, nodemailer, prisma, next.js, role-based-access]

# Dependency graph
requires:
  - phase: 03-01
    provides: "SubmissionComment.parentId self-relation and Submission.title schema migration"
  - phase: 02-03
    provides: "Phase 2 comment stub with auth + final-closure gate"
provides:
  - "Full POST /api/comments handler with role-based scope enforcement (COMM-01, COMM-02, COMM-04)"
  - "Full GET /api/comments handler with visibility enforcement (COMM-03)"
  - "Email notification trigger in PUT /api/submissions on first SUBMITTED transition (COORD-02)"
affects:
  - phase-04-magazine-and-zip
  - coordinator-submissions-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "role field cast to string for Prisma create when session.user.role is string | null | undefined"
    - "Fire-and-forget email: sendMail(...).catch(console.error) — not awaited"
    - "First-submission deduplication: existing.submittedAt === null check prevents re-trigger"

key-files:
  created: []
  modified:
    - app/api/comments/route.ts
    - app/api/submissions/route.ts

key-decisions:
  - "authorRole cast to string for Prisma: session.user.role is string | null | undefined; role validation above ensures non-null at create point"
  - "isFirstSubmission check uses existing.submittedAt (already selected in findFirst) — no extra query needed for deduplication"
  - "GET /api/comments allows submission owner regardless of role — any authenticated user who owns the submission can read the thread"

patterns-established:
  - "Comment scope enforcement: COORDINATOR gets faculty-match check; STUDENT gets ownership + parentId-required check; all other roles 403"
  - "Parent comment validation: parentId existence AND same-submission check before create"

requirements-completed: [COORD-02, COMM-01, COMM-02, COMM-03, COMM-04]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 3 Plan 03: Comment API and Email Notification Summary

**Full role-scoped comment POST/GET replacing Phase 2 stub, plus fire-and-forget coordinator email on first student SUBMITTED transition**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T03:50:18Z
- **Completed:** 2026-02-26T03:52:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced Phase 2 501 comment stub with full POST handler: coordinator faculty-scoped, student ownership + reply-only (parentId required), closure gate preserved
- Implemented GET /api/comments with visibility enforcement: owner or same-faculty coordinator
- Added email trigger to PUT /api/submissions: fires once on first SUBMITTED transition, never re-triggers on re-submission

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace comment stub with full POST and GET handlers** - `252c475` (feat)
2. **Task 2: Add email notification trigger to student PUT handler** - `f1960fc` (feat)

**Plan metadata:** committed with docs commit after summary creation

## Files Created/Modified

- `app/api/comments/route.ts` - Full POST + GET handlers replacing Phase 2 stub; role-based scope enforcement, closure gate, parent validation
- `app/api/submissions/route.ts` - sendMail import added; COORD-02 email trigger block in PUT handler

## Decisions Made

- `session.user.role` is typed `string | null | undefined` by better-auth; after guard branches (only STUDENT or MARKETING_COORDINATOR reach create), cast `role as string` is safe — avoids Prisma type error on `authorRole: string`
- `existing.submittedAt === null` is the correct deduplication predicate — the `submittedAt` field is set on first SUBMITTED and preserved on subsequent updates (existing code: `existing.submittedAt ?? new Date()`)
- GET endpoint allows submission owners of any role to view the thread — plan specifies "submission owner" without role restriction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type cast for authorRole field in Prisma create**
- **Found during:** Task 1 (comment POST handler)
- **Issue:** `session.user.role` is `string | null | undefined` per better-auth types; Prisma `authorRole: string` create input rejects the union type
- **Fix:** Cast `role as string` at point of `prisma.submissionComment.create` — role guards above ensure it is non-null and a valid role string at this point
- **Files modified:** app/api/comments/route.ts
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** `252c475` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 type bug)
**Impact on plan:** Type cast necessary for TypeScript correctness. No scope creep.

## Issues Encountered

None beyond the authorRole type cast described above.

## Next Phase Readiness

- Comment API fully operational; Phase 4 magazine/ZIP work can reference comments if needed
- Coordinator email notification fires on first submission; SMTP configuration must be present in environment for emails to deliver
- Remaining concern from STATE.md: Blob URL expiry verification needed before Phase 4 ZIP assembly

---
*Phase: 03-coordinator-and-comment-api*
*Completed: 2026-02-26*

## Self-Check: PASSED

- app/api/comments/route.ts — FOUND
- app/api/submissions/route.ts — FOUND
- .planning/phases/03-coordinator-and-comment-api/03-03-SUMMARY.md — FOUND
- Commit 252c475 — FOUND
- Commit f1960fc — FOUND
