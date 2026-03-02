# Phase 7: Student Comment Thread - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add comment thread display and reply input to the student submissions page so students can read coordinator comments and post replies (COMM-02, COMM-03). The comment API (POST + GET) already exists and supports student reads/replies. This phase adds the student-facing UI only. No changes to the comment data model or API authorization logic.

</domain>

<decisions>
## Implementation Decisions

### Thread placement
- Slide-over panel matching the coordinator page pattern (click submission row to open)
- Panel shows: submission title, date, status badge, uploaded files list, then comment thread below
- Status badge (draft/submitted/finalized) visible in the panel header
- Works on both desktop table rows and mobile card views — panel goes full-width on mobile

### Comment display
- Match coordinator comment styling: author name, role badge ("Coordinator"/"Student"), timestamp, reply indentation with left border
- Contextual empty state: "Your coordinator hasn't commented yet. Comments will appear here when they do."
- Badge-only role differentiation — no alignment shift or tinting for own comments vs coordinator comments
- Comment count badge on the submission row in the main table/card view (e.g., "3 comments")

### Reply interaction
- Reply button on each coordinator comment (same as coordinator page pattern)
- Students can only reply to existing comments (parentId required) — no top-level comments
- "Replying to [Name]" indicator with cancel button when reply is active
- Ctrl+Enter keyboard shortcut + visible "Reply" button to submit
- SWR mutate revalidation after posting (not optimistic update) — matches coordinator pattern
- 15-second SWR polling interval matching coordinator page

### Closure & locked state
- After finalClosureDate: reply input hidden entirely, reply buttons on comments also hidden
- Thread becomes fully read-only — no interactive elements remaining
- Amber closure banner at bottom of thread: "Comments are locked — the final closure date has passed." (matching existing amber alert styling)
- Closure status determined via `isLocked` flag included in GET /api/comments response (single source of truth)

### Claude's Discretion
- Exact panel width and responsive breakpoints
- Loading skeleton design while comments fetch
- Error state handling (API failures, network issues)
- Toast messages for post success/failure
- Whether to extract shared comment components or keep inline

</decisions>

<specifics>
## Specific Ideas

- Match coordinator slide-over panel pattern exactly — consistency across roles is the priority
- Comment count badge on submission rows gives students a reason to check without opening the panel
- Contextual empty state explains WHY there are no comments (coordinator hasn't commented yet) rather than just "no comments"
- Closure state should use the same amber alert component already used elsewhere in the app

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-student-comment-thread*
*Context gathered: 2026-03-03*
