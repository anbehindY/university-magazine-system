---
phase: 05-ui-layer
plan: "02"
subsystem: ui
tags: [react, swr, nextjs, tailwind, radix-ui, date-fns, sonner]

# Dependency graph
requires:
  - phase: 05-01
    provides: SWR installed, Tabs/Switch/Sheet components, role-based sidebar navigation
  - phase: 03-coordinator-and-comment-api
    provides: coordinator submissions API, comments GET/POST endpoints
  - phase: 04-manager-and-reports-api
    provides: coordinator PATCH endpoint for isSelected and notes
provides:
  - Coordinator submissions list page at /coordinator/submissions
  - Clickable data table fetching from /api/coordinator/submissions
  - Sheet slide-over panel with submission details
  - isSelected toggle with optimistic PATCH update
  - Notes textarea with save button via PATCH
  - SWR comment thread with 15-second polling
  - Reply-to comment support with parentId
affects: [05-ui-layer wave 3, 05-03, 05-04, 05-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSWR with refreshInterval for live comment threads — fire-and-forget polling without setInterval"
    - "Optimistic UI update on toggle — instant feedback with revert on API failure"
    - "Sheet panel pattern — right-side slide-over with sticky header + scrollable body + sticky footer"
    - "mutate() after POST — immediate SWR revalidation without waiting for poll cycle"

key-files:
  created:
    - app/(management)/coordinator/submissions/page.tsx
  modified: []

key-decisions:
  - "useSWR refreshInterval preferred over setInterval for comment polling — consistent with plan decision, avoids manual cleanup"
  - "Optimistic isSelected toggle — sets state immediately, reverts on API failure with toast error"
  - "Notes save via explicit button (not debounce/blur) — simpler UX, reduces spurious PATCH calls"
  - "Sticky panel header with overflow-y-auto comment body — Sheet has fixed height, notes/toggle always visible while thread scrolls"

patterns-established:
  - "Sheet slide-over: open={!!selectedId} onOpenChange with null-reset of all panel state"
  - "SWR null key guard: selectedSubmissionId ? url : null — suspends fetch when panel closed"
  - "Ctrl+Enter shortcut on comment textarea for keyboard-driven posting"

requirements-completed: [GUEST-01]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 5 Plan 02: Coordinator Submissions UI Summary

**Coordinator submissions page with SWR-polled comment thread, isSelected toggle with optimistic update, and Sheet slide-over panel for full submission review workflow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T07:14:46Z
- **Completed:** 2026-02-26T07:16:42Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Full-page data table listing SUBMITTED submissions from coordinator's faculty, fetched on mount via useEffect
- Sheet slide-over opens on row click with sticky header (title, student name, isSelected toggle, notes textarea)
- Live comment thread via `useSWR` polling every 15 seconds against `/api/comments?submissionId=`; `mutate()` called after POST for instant display
- Reply flow: clicking Reply on a comment sets `replyToId` state, shows "Replying to [author]" indicator, sends `parentId` in POST body; replies are indented in thread view
- Toast feedback (sonner) on save success and all error paths

## Task Commits

Each task was committed atomically:

1. **Task 1 + 2: Create coordinator submissions list page with slide-over panel** - `8386468` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `app/(management)/coordinator/submissions/page.tsx` - Coordinator submissions list with clickable rows, Sheet slide-over panel, isSelected toggle, notes textarea, SWR comment thread with 15s polling, reply-to support, and post comment functionality (567 lines)

## Decisions Made

- `useSWR` with `refreshInterval: 15000` used for comment polling per plan decision — no `setInterval` usage
- Optimistic update pattern for isSelected toggle: local state updated immediately, reverted on API error with toast
- Notes saved via explicit "Save Notes" button rather than debounce — reduces unnecessary PATCH calls and gives clear user intent signal
- Sheet panel structure: sticky top div (header + toggle + notes), flex-1 overflow-y-auto (comment list), sticky bottom div (comment input)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly on first attempt, all API patterns followed existing conventions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Coordinator submissions workflow complete (COOR-01 through COOR-05 fully covered in UI)
- Pattern established for subsequent Wave 2 pages: Sheet slide-over, useSWR comment polling, optimistic updates
- Ready for Plan 05-03 (student submissions page) and remaining Wave 2 UI pages

---
*Phase: 05-ui-layer*
*Completed: 2026-02-26*
