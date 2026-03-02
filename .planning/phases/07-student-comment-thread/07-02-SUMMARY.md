---
phase: 07-student-comment-thread
plan: 02
subsystem: ui
tags: [react, nextjs, typescript, swr, comments, submissions]

# Dependency graph
requires:
  - phase: 07-01
    provides: isLocked in GET /api/comments, selectedCommentSubmissionId state wired to Comments button
  - phase: 03-coordinator-and-comment-api
    provides: POST /api/comments with parentId support
provides:
  - Sheet slide-over comment panel on student submissions page
  - SWR polling every 15s for /api/comments on student page
  - Student reply flow with parentId required
  - isLocked-driven closure UI (amber banner, hidden reply controls)
  - Empty state message for submissions with no coordinator comments
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSWR with null key guard: fetch only when panel open (selectedCommentSubmissionId)"
    - "isLocked from API response as single source of truth for closure UI"
    - "Student reply requires replyToId (parentId) — textarea disabled until Reply button clicked"

key-files:
  created: []
  modified:
    - app/(student)/submissions/page.tsx

key-decisions:
  - "Students can ONLY reply (parentId required) — textarea disabled when replyToId is null, preventing API 400"
  - "handlePostReply uses replyToId guard before fetch — students cannot post top-level comments"
  - "isLocked derived from commentsData?.isLocked ?? false — single source of truth from API"
  - "Sheet opens via existing selectedCommentSubmissionId state from Plan 01"

patterns-established:
  - "SWR null-key pattern: key = selectedId ? url : null prevents fetch when panel closed"
  - "Optimistic UI avoided: mutateComments() called after successful POST (locked decision)"

requirements-completed: [COMM-02, COMM-03]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 07 Plan 02: Student comment thread Sheet panel Summary

**Sheet slide-over panel on student submissions page with SWR-polled comment thread, parentId-required reply flow, isLocked closure enforcement, and empty state messaging**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T21:24:10Z
- **Completed:** 2026-03-02T21:26:17Z
- **Tasks:** 1 (Task 2 is a human-verify checkpoint)
- **Files modified:** 1

## Accomplishments
- Added Sheet comment panel to `app/(student)/submissions/page.tsx` mirroring coordinator page pattern
- SWR polls `/api/comments?submissionId=...` every 15 seconds; key is null when panel closed to prevent unnecessary fetches
- Students can only reply to existing comments (parentId required) — textarea disabled until "Reply" button clicked on a comment
- `isLocked` from commentsData drives all closure UI: reply buttons hidden, reply input section hidden, amber Alert banner shown
- Empty state displays "Your coordinator hasn't commented yet. Comments will appear here when they do."
- Loading skeleton shown while SWR fetch is in-flight (commentsData is undefined)
- Panel header shows submission title, status badge, submitted date, and file count

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Sheet panel with SWR comment thread and reply interaction** - `50a9c8c` (feat)

**Plan metadata:** (pending — checkpoint Task 2 awaiting human verification)

## Files Created/Modified
- `app/(student)/submissions/page.tsx` - Added useSWR import, date-fns format, Sheet component imports; fetcher/formatRole/formatCommentTime helpers; Comment type; commentBody/replyToId/replyToAuthor/commentPosting state; SWR hook + isLocked/comments derived vars; handleCommentPanelClose/handlePostReply handlers; Sheet JSX with full comment thread UI

## Decisions Made
- Students must click "Reply" on a comment to set `replyToId` before the textarea is enabled — this enforces the parentId requirement and prevents the API 400 error for missing parentId
- `isLocked` is derived from `commentsData?.isLocked ?? false` — the API (Plan 01) is the single source of truth, not client-side date comparison
- `mutateComments()` called after successful POST for immediate revalidation (matches coordinator page locked decision)
- `void handlePostReply()` used in JSX event handlers to satisfy TypeScript no-floating-promises

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- COMM-02 (student reply) and COMM-03 (thread visible) satisfied
- Phase 08 (upload rules enforcement) can proceed independently

## Self-Check: PASSED

- FOUND: app/(student)/submissions/page.tsx
- FOUND: .planning/phases/07-student-comment-thread/07-02-SUMMARY.md
- FOUND: commit 50a9c8c (Task 1)
- Build: compiled successfully, no TypeScript errors

---
*Phase: 07-student-comment-thread*
*Completed: 2026-03-03*
