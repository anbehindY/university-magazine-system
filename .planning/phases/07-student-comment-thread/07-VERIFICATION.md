---
phase: 07-student-comment-thread
verified: 2026-03-03T00:00:00Z
status: human_needed
score: 8/8 must-haves verified (automated)
human_verification:
  - test: "Open Sheet panel and read coordinator comments"
    expected: "Clicking Comments on a submission card slides open the Sheet panel; coordinator comments appear chronologically with author name, Coordinator role badge, and timestamp; replies are indented with a left border"
    why_human: "Cannot verify slide-over animation, visual layout, or actual comment data without a running browser session"
  - test: "Post a reply via the reply input"
    expected: "Clicking Reply on a coordinator comment enables the textarea; typing a reply and pressing Ctrl+Enter (or clicking Reply button) posts the reply via POST /api/comments with parentId; the reply appears in the thread after SWR revalidation; a success toast appears"
    why_human: "End-to-end POST flow with database write and SWR revalidation requires a live session"
  - test: "SWR 15-second polling"
    expected: "If a coordinator adds a comment while the panel is open, it appears in the thread within 15 seconds without a full page reload"
    why_human: "Cannot verify real-time polling behaviour without a running app and two concurrent sessions"
  - test: "Closure state (after finalClosureDate)"
    expected: "When finalClosureDate has passed and the panel is opened: reply buttons on each comment are hidden, the reply input section is entirely absent, and an amber Alert banner reads 'Comments are locked — the final closure date has passed.'"
    why_human: "Requires either a test academic year with finalClosureDate in the past or a mocked response; cannot verify from static code alone (though isLocked logic is code-verified)"
  - test: "Empty state message"
    expected: "Clicking Comments on a submission with no coordinator comments shows: 'Your coordinator hasn't commented yet. Comments will appear here when they do.'"
    why_human: "Requires a live submission with zero comments to confirm the empty state renders correctly"
---

# Phase 7: Student Comment Thread Verification Report

**Phase Goal:** Add comment thread display and reply input to the student submissions page so students can read coordinator comments and post replies (COMM-02, COMM-03)
**Verified:** 2026-03-03
**Status:** human_needed — all automated checks passed; 5 items require live-browser verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A student viewing their submission can see all coordinator comments in a chronological thread | VERIFIED | Sheet panel renders `comments.map(...)` ordered by `orderBy: { createdAt: "asc" }` in GET /api/comments; author name, role badge, timestamp shown per comment |
| 2 | A student can post a reply to a coordinator comment using a text input — the reply appears in the thread after submission | VERIFIED | `handlePostReply()` POSTs to `/api/comments` with `parentId: replyToId`; calls `await mutateComments()` on success; textarea disabled until Reply button clicked on a comment |
| 3 | The comment thread updates via SWR polling without full page reload (matching coordinator page pattern) | VERIFIED | `useSWR` at line 171 with `refreshInterval: 15000`; null-key guard (`selectedCommentSubmissionId ? url : null`) prevents fetch when panel closed |
| 4 | After finalClosureDate, the reply input is hidden or disabled (matching COMM-04 enforcement) | VERIFIED | `isLocked` derived from `commentsData?.isLocked ?? false`; `{!isLocked && (<div ...>reply input section</div>)}` hides entire reply section; `{!isLocked && (<button>Reply</button>)}` hides per-comment reply buttons; amber Alert banner shown when `isLocked` |

**Score:** 4/4 success criteria pass automated verification

### Must-Have Truths (from PLAN frontmatter)

| # | Must-Have Truth | Status | Evidence |
|---|----------------|--------|----------|
| 1 | Student can see all coordinator comments in a chronological thread inside a slide-over panel | VERIFIED | Sheet at line 1184; comments list at lines 1229-1262 |
| 2 | Student can post a reply to a coordinator comment using a text input with parentId | VERIFIED | `handlePostReply` at line 196; `parentId: replyToId` in POST body at line 206 |
| 3 | Comment thread updates via SWR polling every 15 seconds without full page reload | VERIFIED | `useSWR` with `{ refreshInterval: 15000 }` at lines 171-177 |
| 4 | After finalClosureDate the reply input and reply buttons are hidden and an amber closure banner is shown | VERIFIED | `isLocked` gates at lines 1248, 1266, 1275; amber Alert at lines 1266-1272 |
| 5 | Empty state shows contextual message: Your coordinator hasn't commented yet | VERIFIED | Line 1225: `Your coordinator hasn&apos;t commented yet. Comments will appear here when they do.` |

**Score:** 5/5 must-have truths verified

---

## Required Artifacts

| Artifact | Requirement | Status | Details |
|----------|-------------|--------|---------|
| `app/(student)/submissions/page.tsx` | Sheet panel with SWR comment thread, reply input, closure state; min 1200 lines | VERIFIED | 1322 lines; contains `useSWR`, Sheet JSX, reply input, isLocked gates, amber banner, empty state |
| `app/api/comments/route.ts` | isLocked field in GET response | VERIFIED | Line 196: `return NextResponse.json({ comments, isLocked: locked })` |
| `app/api/submissions/route.ts` | Comment count in GET response | VERIFIED | Lines 43-49: `_count: { select: { comments: true } }` mapped to `commentCount` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(student)/submissions/page.tsx` | `/api/comments` | `useSWR` with `refreshInterval: 15000` | WIRED | Line 171-177: `useSWR(selectedCommentSubmissionId ? \`/api/comments?submissionId=...\` : null, fetcher, { refreshInterval: 15000 })` |
| `app/(student)/submissions/page.tsx` | `/api/comments` POST | `fetch` with `parentId` for replies | WIRED | Lines 200-208: `fetch("/api/comments", { method: "POST", body: JSON.stringify({ submissionId, content, parentId: replyToId }) })` |
| `app/(student)/submissions/page.tsx` | `commentsData.isLocked` | `isLocked` from SWR data drives closure UI | WIRED | Line 180: `const isLocked: boolean = commentsData?.isLocked ?? false`; used at lines 1248, 1266, 1275 |
| `app/api/comments/route.ts` | `lib/closure-guard.ts` | `isPastFinalClosure()` in GET handler | WIRED | Line 2: import; line 193: `isPastFinalClosure()` in `Promise.all` |
| `app/api/submissions/route.ts` | `prisma.submission` | `_count select` in findMany | WIRED | Line 43: `_count: { select: { comments: true } }`; line 49: `commentCount: _count?.comments ?? 0` |

---

## Requirements Coverage

| Requirement | Description | Source Plan | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COMM-02 | Student can reply to comments on their own submission (two-way thread) | 07-02-PLAN.md | SATISFIED | `handlePostReply` sends POST with `parentId: replyToId`; student-only reply enforced at API (parentId required for STUDENT role) |
| COMM-03 | Comment thread is visible only to the submission owner and their faculty's coordinator(s) | 07-01-PLAN.md, 07-02-PLAN.md | SATISFIED | GET /api/comments enforces: coordinator checks `dbUser.facultyId === submission.facultyId`; all others check `submission.userId === session.user.id`; student page fetches via SWR and renders thread |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

No TODO/FIXME comments, placeholder implementations, empty handlers, or stub returns found in any modified file.

---

## Notable Deviation from Plan

**Comment count badge styling:** The plan specified using the shadcn `<Badge>` component for the comment count indicator on submission cards. The actual implementation uses a custom `<span>` with amber pill styling (`bg-amber-100 text-amber-700 rounded-full`) placed inside the Comments button alongside a `MessageSquare` icon. This is a cosmetic deviation — the count is visible, correctly conditional on `commentCount > 0`, and functionally equivalent. Not a gap.

---

## Human Verification Required

### 1. Sheet Panel Opens and Displays Thread

**Test:** Log in as a student with at least one SUBMITTED submission that has coordinator comments. Click the Comments button on that card.
**Expected:** The Sheet panel slides open from the right. The panel header shows the submission title, status badge, submitted date, and file count. Comments appear in chronological order — each comment shows the author's name, a role badge (Coordinator or Student), a formatted timestamp, and a Reply button below each comment body.
**Why human:** Cannot verify the slide-over animation, CSS layout, and actual thread data without a running browser session and test data.

### 2. Reply Post Flow

**Test:** In the open Sheet panel, click "Reply" on a coordinator comment. Type a reply message. Click the Reply button (or press Ctrl+Enter).
**Expected:** "Replying to [Name]" indicator appears with a Cancel button. The textarea becomes enabled. After submitting, the reply appears in the thread below the parent comment (indented with a left border). A "Reply posted." success toast appears. The textarea and reply state reset.
**Why human:** End-to-end POST flow with database write and SWR revalidation (`mutateComments()`) requires a live session with real data.

### 3. SWR 15-Second Polling

**Test:** Open the Sheet panel on a submission. In a second browser session as a coordinator, add a comment to that submission. Wait up to 15 seconds.
**Expected:** The new comment appears in the student's open panel without any page refresh.
**Why human:** Real-time polling behaviour requires two concurrent authenticated sessions.

### 4. Closure State Enforcement (After finalClosureDate)

**Test:** Using a test academic year with `finalClosureDate` set in the past, open the Sheet panel on any submission.
**Expected:** All "Reply" buttons on comments are hidden. The reply input section is entirely absent. An amber alert reads "Comments are locked — the final closure date has passed."
**Why human:** Requires a test academic year record with finalClosureDate in the past. The `isLocked` logic is code-verified (API returns the flag, UI gates on it) but the end-to-end rendering needs confirmation.

### 5. Empty State Rendering

**Test:** Click Comments on a submission that has zero coordinator comments.
**Expected:** The panel shows no comment items and instead displays the text "Your coordinator hasn't commented yet. Comments will appear here when they do."
**Why human:** Requires a live submission with an empty comment thread in the database.

---

## Automated Checks Summary

All automated checks passed:

- `app/(student)/submissions/page.tsx`: 1322 lines (exceeds 1200 minimum), contains `useSWR`, `Sheet`, `isLocked`, reply input, amber closure banner, empty state message, `grid grid-cols-1 gap-4 md:grid-cols-2` card layout; no `<table>`, `hidden lg:block`, or `lg:hidden` elements remain
- `app/api/comments/route.ts`: GET returns `{ comments, isLocked: locked }` via `Promise.all([prisma.submissionComment.findMany(), isPastFinalClosure()])` — both wired and substantive
- `app/api/submissions/route.ts`: GET includes `_count: { select: { comments: true } }` and maps to `commentCount` per submission — wired and substantive
- Key links: SWR URL pattern, POST with parentId, isLocked gating, isPastFinalClosure wiring — all confirmed present in source
- No stubs, TODO comments, placeholder text, or empty implementations found

---

_Verified: 2026-03-03_
_Verifier: Claude (gsd-verifier)_
