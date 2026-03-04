---
phase: 07-student-comment-thread
plan: 01
subsystem: api, ui
tags: [prisma, nextjs, react, typescript, comments, submissions]

# Dependency graph
requires:
  - phase: 03-coordinator-and-comment-api
    provides: submissionComment model and comments API route
  - phase: 06-critical-fixes
    provides: isPastFinalClosure in lib/closure-guard.ts, submission title/status fixes
provides:
  - isLocked boolean in GET /api/comments response (Promise.all with isPastFinalClosure)
  - commentCount number per submission in GET /api/submissions response
  - Card-based student submissions list on all screen sizes with comment count badges
  - selectedCommentSubmissionId state wired to Comments button for Plan 02 Sheet
affects:
  - 07-02 (comment Sheet panel attaches to selectedCommentSubmissionId and isLocked)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.all for parallel DB query + closure check in GET handlers"
    - "Prisma _count select destructured off response before returning to client"
    - "Unified card grid (grid-cols-1 md:grid-cols-2) replacing table/mobile split"

key-files:
  created: []
  modified:
    - app/api/comments/route.ts
    - app/api/submissions/route.ts
    - app/(student)/submissions/page.tsx

key-decisions:
  - "Promise.all runs findMany and isPastFinalClosure in parallel — no extra DB round-trip"
  - "Destructure _count from submission before returning to keep response shape clean"
  - "Card grid uses md:grid-cols-2 breakpoint per CONTEXT.md locked decision"
  - "Comments button visible on all submissions (DRAFT + SUBMITTED); API handles scope"

patterns-established:
  - "Parallel DB + closure check: Promise.all([prisma.model.findMany(), isPastFinalClosure()])"
  - "Clean _count mapping: const { _count, ...rest } = s; return { ...rest, count: _count?.field ?? 0 }"

requirements-completed: [COMM-03]

# Metrics
duration: 4min
completed: 2026-03-03
---

# Phase 07 Plan 01: isLocked flag, commentCount, and student card layout Summary

**GET /api/comments returns isLocked via Promise.all; GET /api/submissions returns commentCount per submission; student submissions page rewritten from table+mobile-cards to unified card grid with comment count badges**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-03T21:18:45Z
- **Completed:** 2026-03-03T21:22:57Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `isLocked: boolean` to GET /api/comments response using Promise.all with `isPastFinalClosure()` — parallel execution avoids extra DB round-trip
- Added `commentCount: number` per submission to GET /api/submissions by including `_count: { select: { comments: true } }` and destructuring before return
- Replaced `hidden lg:block` table + `space-y-3 lg:hidden` mobile card split with a single `grid grid-cols-1 md:grid-cols-2` card layout visible on all screen sizes
- Each card shows: title (Untitled fallback), status badge, submission date, file count + first 2 filenames, comment count badge (hidden when 0), and Edit/Comments/Delete buttons
- Added `selectedCommentSubmissionId` state wired to Comments button click — ready for Plan 02 Sheet panel

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isLocked to GET /api/comments and commentCount to GET /api/submissions** - `6d52a7a` (feat)
2. **Task 2: Replace student submissions table+mobile-cards with unified card layout** - `e9ae984` (feat)

## Files Created/Modified
- `app/api/comments/route.ts` - GET handler now uses Promise.all for findMany + isPastFinalClosure; returns `{ comments, isLocked: boolean }`
- `app/api/submissions/route.ts` - GET handler adds `_count: { select: { comments: true } }` to findMany include; maps to `commentCount` field
- `app/(student)/submissions/page.tsx` - Submissions type updated with `commentCount`; `selectedCommentSubmissionId` state added; table/mobile split replaced with unified card grid

## Decisions Made
- Promise.all pattern for parallel DB query + closure check — avoids sequential round-trip since `isPastFinalClosure` is already imported
- `_count` destructured off each mapped submission — keeps response shape clean without raw Prisma internal field
- Card grid breakpoint `md:grid-cols-2` — per CONTEXT.md locked decision giving Claude discretion on breakpoint
- Comments button visible on all submissions regardless of status — API handles authorization scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `isLocked` flag available from GET /api/comments for Plan 02 to gate the reply input
- `commentCount` available on each submission card for Plan 02 to refresh after posting
- `selectedCommentSubmissionId` state and setter wired — Plan 02 can attach Sheet panel directly

## Self-Check: PASSED

- FOUND: app/api/comments/route.ts
- FOUND: app/api/submissions/route.ts
- FOUND: app/(student)/submissions/page.tsx
- FOUND: .planning/phases/07-student-comment-thread/07-01-SUMMARY.md
- FOUND: commit 6d52a7a (Task 1)
- FOUND: commit e9ae984 (Task 2)
- Build: compiled successfully, no TypeScript errors

---
*Phase: 07-student-comment-thread*
*Completed: 2026-03-03*
