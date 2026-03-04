# Phase 7: Student Comment Thread - Research

**Researched:** 2026-03-03
**Domain:** Next.js 16 / React 19 / SWR / shadcn-ui — student-facing comment thread UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Thread placement**
- Slide-over panel matching the coordinator page pattern (click submission row to open)
- Panel shows: submission title, date, status badge, uploaded files list, then comment thread below
- Status badge (draft/submitted/finalized) visible in the panel header
- Works on both desktop table rows and mobile card views — panel goes full-width on mobile

**Comment display**
- Match coordinator comment styling: author name, role badge ("Coordinator"/"Student"), timestamp, reply indentation with left border
- Contextual empty state: "Your coordinator hasn't commented yet. Comments will appear here when they do."
- Badge-only role differentiation — no alignment shift or tinting for own comments vs coordinator comments
- Comment count badge on the submission row in the main table/card view (e.g., "3 comments")

**Reply interaction**
- Reply button on each coordinator comment (same as coordinator page pattern)
- Students can only reply to existing comments (parentId required) — no top-level comments
- "Replying to [Name]" indicator with cancel button when reply is active
- Ctrl+Enter keyboard shortcut + visible "Reply" button to submit
- SWR mutate revalidation after posting (not optimistic update) — matches coordinator pattern
- 15-second SWR polling interval matching coordinator page

**Closure & locked state**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-02 | Student can reply to comments on their own submission (two-way thread) | Reply input, parentId enforcement in POST /api/comments, SWR polling pattern from coordinator page |
| COMM-03 | Comment thread is visible only to the submission owner (student) and their faculty's coordinator(s) | GET /api/comments already enforces this: student must own the submission, coordinator must be same faculty |
</phase_requirements>

---

## Summary

Phase 7 adds a student-facing comment thread UI to the student submissions page (`/app/(student)/submissions/page.tsx`). The coordinator page (`/app/(management)/coordinator/submissions/page.tsx`) is the authoritative reference — it already implements the complete comment thread pattern with SWR polling, reply-to state, comment rendering, and post-comment flow. The student page must mirror this pattern with two key differences: students see read-only coordinator comments and can only reply (no top-level posting), and after `finalClosureDate` all reply controls are hidden.

The comment API (`POST /api/comments` and `GET /api/comments`) already exists and already enforces the correct role-based access. One API change is required: the GET endpoint must return an `isLocked` boolean (derived from `isPastFinalClosure()`) alongside the comments array. This single flag drives all closure UI decisions on the client, avoiding a separate API call. The current student page has NO comment integration — it uses a Dialog for submission form, Cards for the submissions list, and no Sheet/slide-over panel. The panel + SWR pattern must be added wholesale, modeled on the coordinator page.

The main structural challenge is that the student page is large (1,180 lines) and already complex. The comment panel will be a Sheet component added alongside existing Dialog components, with new SWR + state wiring. The coordinator page provides an exact template — the student page must reuse the same component patterns (Sheet, SWR `useSWR` with 15s refresh, mutate after POST) with student-specific adjustments (no top-level post, isLocked gate, contextual empty state).

**Primary recommendation:** Copy the coordinator's comment panel pattern exactly. Add `isLocked` to GET /api/comments response. Add a "Comments" button on each submission row (table + card) that opens the Sheet. No new packages required.

---

## Standard Stack

### Core (already installed, no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| swr | ^2.4.0 | Comment thread polling + revalidation | Already used on coordinator page; `useSWR` with `refreshInterval: 15000` and `mutate()` after POST |
| radix-ui (Dialog/Sheet) | ^1.4.3 | Slide-over panel for comment thread | `Sheet` from `@/components/ui/sheet` — exact same component as coordinator page |
| sonner | ^2.0.7 | Toast notifications on post success/failure | Already imported in student page; `toast.success` / `toast.error` |
| date-fns | ^3.6.0 | Format comment timestamps | `format(new Date(value), "dd MMM yyyy, HH:mm")` — same helper as coordinator page |
| lucide-react | ^0.563.0 | Icons (FileIcon, Download etc.) | Already imported on both pages |
| tailwindcss | ^4 | Utility CSS for thread layout | Inline utility classes, amber alert, left-border indent |

### Supporting (already in codebase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @/components/ui/alert | local | Amber closure banner | `className="border-amber-200 bg-amber-50 text-amber-900"` pattern already in student page |
| @/components/ui/badge | local | Role badge on comment author | `bg-slate-100 text-slate-500` badge for "Coordinator"/"Student" text |
| @/components/ui/skeleton | local | Loading state while comments fetch | Same skeleton pattern as coordinator page |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sheet (slide-over) | Dialog modal | Locked decision — Sheet matches coordinator |
| SWR mutate revalidation | Optimistic update | Locked decision — coordinator pattern for consistency |
| isLocked from GET /api/comments | Separate /api/academic-years call | Locked decision — single source of truth, avoids race condition |

**Installation:** No new packages. Everything is already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. All changes are within existing files:

```
app/
├── (student)/submissions/page.tsx    # Primary target — add Sheet + SWR + comment state
└── api/comments/route.ts             # Add isLocked to GET response
```

Optionally (Claude's discretion):
```
components/
└── comment-thread.tsx                # Extract shared comment thread component (optional)
```

### Pattern 1: SWR Comment Polling (from coordinator page, lines 198-206)

**What:** SWR fetches comments for the open submission, polling every 15 seconds. Key is null key when no submission selected — SWR does not fetch.

**When to use:** When `selectedSubmissionId` is non-null (panel is open).

**Example:**
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx lines 198-206
const { data: commentsData, mutate: mutateComments } = useSWR(
  selectedSubmissionId
    ? `/api/comments?submissionId=${selectedSubmissionId}`
    : null,
  fetcher,
  { refreshInterval: 15000 }
);

const comments: Comment[] = commentsData?.comments ?? [];
const isLocked: boolean = commentsData?.isLocked ?? false;
```

The `isLocked` field is new — must be added to the GET /api/comments route response.

### Pattern 2: Comment Post with Mutate (from coordinator page, lines 295-325)

**What:** POST to /api/comments with submissionId, content, parentId. On success, clear form and call `mutateComments()` for immediate revalidation. No optimistic update.

**When to use:** Student submits reply text.

**Example:**
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx lines 295-325
async function handlePostReply(submissionId: string) {
  if (!commentBody.trim()) return;
  setCommentPosting(true);
  try {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId,
        content: commentBody.trim(),
        parentId: replyToId ?? undefined,  // REQUIRED for students
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "Failed to post reply.");
      return;
    }
    setCommentBody("");
    setReplyToId(null);
    setReplyToAuthor("");
    await mutateComments();
  } catch {
    toast.error("Failed to post reply.");
  } finally {
    setCommentPosting(false);
  }
}
```

Note for student page: `parentId` is always required (no top-level comments). The API already enforces this with 400 if student posts without `parentId`.

### Pattern 3: Comment Thread Render (from coordinator page, lines 625-713)

**What:** Render comments list with reply indentation (ml-6 border-l-2) for replies (parentId non-null), author name, role badge, timestamp, and Reply button. After thread: sticky textarea input at bottom.

**When to use:** Inside the Sheet panel.

**Example:**
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx lines 631-662
{comments.map((comment) => (
  <div
    key={comment.id}
    className={comment.parentId ? "ml-6 border-l-2 border-slate-200 pl-3" : ""}
  >
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-900">
        {comment.author.name ?? "Unknown"}
      </span>
      <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
        {formatRole(comment.author.role)}
      </span>
      <span className="text-xs text-slate-400">
        {formatCommentTime(comment.createdAt)}
      </span>
    </div>
    <p className="mt-1 text-sm text-slate-700">{comment.body}</p>
    {/* Reply button — hidden when isLocked */}
    {!isLocked && (
      <button
        type="button"
        className="mt-1 text-xs text-slate-400 hover:text-slate-600 underline"
        onClick={() => {
          setReplyToId(comment.id);
          setReplyToAuthor(comment.author.name ?? "this comment");
        }}
      >
        Reply
      </button>
    )}
  </div>
))}
```

### Pattern 4: API isLocked Addition (GET /api/comments)

**What:** Add `isLocked: boolean` to the GET response body. Derived from `isPastFinalClosure()` which is already imported.

**When to use:** GET handler, after comments are fetched.

**Example:**
```typescript
// Source: /app/api/comments/route.ts — modification to existing GET handler
const [comments, locked] = await Promise.all([
  prisma.submissionComment.findMany({
    where: { submissionId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, role: true } } },
  }),
  isPastFinalClosure(),
]);

return NextResponse.json({ comments, isLocked: locked });
```

This avoids an extra DB round-trip — `isPastFinalClosure()` is already called in the POST handler and uses the same cached `getActiveAcademicYear()` under the hood.

### Pattern 5: Comment Count Badge on Submission Row

**What:** Add a "N comments" badge to each submission row in the table and mobile card views. Requires the student submissions API (`GET /api/submissions`) to include `_count.comments` (or a top-level `commentCount`) in the response.

**When to use:** Student submissions list (both table `hidden lg:block` and mobile card `lg:hidden` views).

**Example — API change:**
```typescript
// Source: /app/api/submissions/route.ts — modification to GET include
const submissions = await prisma.submission.findMany({
  where: { userId: session.user.id },
  orderBy: { updatedAt: "desc" },
  include: {
    files: { orderBy: { createdAt: "desc" } },
    _count: { select: { comments: true } },  // ADD THIS
  },
});
// Map to include commentCount: s._count.comments
```

**Example — UI badge:**
```typescript
// On each row in table and mobile card
{submission.commentCount > 0 && (
  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 text-xs">
    {submission.commentCount} {submission.commentCount === 1 ? "comment" : "comments"}
  </Badge>
)}
```

### Pattern 6: Amber Closure Banner (matching existing style)

**What:** After `isLocked` is true, show amber alert at bottom of thread and hide all reply controls.

**When to use:** `isLocked === true` from GET /api/comments response.

**Example:**
```typescript
// Matches existing amber alert style in student page (lines 651-669)
{isLocked && (
  <Alert className="border-amber-200 bg-amber-50 text-amber-900 mx-5 mb-4">
    <AlertDescription className="text-amber-800">
      Comments are locked — the final closure date has passed.
    </AlertDescription>
  </Alert>
)}
```

Note: The existing `Alert` component in this project uses `className` override for amber styling (the default variant uses `bg-card`). The amber style is `border-amber-200 bg-amber-50 text-amber-900` — already established in the student page's closure alert.

### Pattern 7: Panel Open State (student page adaptation)

**What:** State variable `selectedCommentSubmissionId` (distinct from any edit state) tracks which submission's comment panel is open. Click on "Comments" button (not the whole row) to avoid conflict with existing "Edit" / "Delete" row buttons.

**When to use:** Student submissions table and mobile card views.

**Example:**
```typescript
const [selectedCommentSubmissionId, setSelectedCommentSubmissionId] = useState<string | null>(null);

function handleCommentPanelClose(open: boolean) {
  if (!open) {
    setSelectedCommentSubmissionId(null);
    setCommentBody("");
    setReplyToId(null);
    setReplyToAuthor("");
  }
}
```

Key difference from coordinator page: the coordinator opens the panel by clicking anywhere on the row (submissions list is read-only from their perspective). The student page has "Edit"/"Delete" action buttons on each row, so the "Comments" button must be a separate explicit trigger, not a row-level click.

### Anti-Patterns to Avoid

- **Separate API call for isLocked:** Don't fetch `/api/academic-years` just for closure status. The `isLocked` flag from GET /api/comments is the single source of truth (locked decision).
- **Optimistic update on reply post:** Don't update comments state client-side before server confirms. Use `await mutateComments()` (locked decision).
- **Top-level comment input for students:** The API returns 400 if a student posts without `parentId`. Don't show a general "Add comment" input — only show the textarea when `replyToId` is set (or always show it but always send `parentId`). See API enforcement.
- **Opening panel on full row click:** The student page has Edit/Delete buttons per row. Clicking a row would conflict. Use an explicit "Comments" button per row.
- **Polling while panel is closed:** SWR with `null` key does not fetch. Always guard: `selectedCommentSubmissionId ? \`/api/comments?submissionId=${selectedCommentSubmissionId}\` : null`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-over panel | Custom positioned div | `Sheet` from `@/components/ui/sheet` | Already in project, handles animations, portal, overlay, close-on-outside-click |
| Polling with revalidation | `setInterval` + fetch | `useSWR` with `refreshInterval: 15000` | Already in coordinator page; handles deduplication, focus revalidation, cleanup |
| Toast notifications | Alert div state | `toast` from `sonner` | Already imported on student page; `toast.success` / `toast.error` |
| Closure time check | Client-side date comparison | `isLocked` from GET /api/comments | Server is authoritative; avoids timezone bugs and race with page-load time |
| Role label formatting | Switch in JSX | `formatRole()` helper (already in coordinator page) | Copy or extract the existing function |

**Key insight:** The coordinator page is the complete reference implementation. Copy its comment section patterns directly — don't invent alternatives.

---

## Common Pitfalls

### Pitfall 1: Student Cannot Post Top-Level Comments

**What goes wrong:** The API returns 400 if a student posts without `parentId`. If the UI allows submitting with no `parentId`, users see a confusing error.

**Why it happens:** The POST handler explicitly checks: `if (!parentId) return 400`. This is intentional (COMM-02: reply-only).

**How to avoid:** The reply textarea should only be submittable when `replyToId` is non-null. Either: (a) only show the textarea when a Reply button has been clicked, or (b) always show the textarea but disable the submit button until `replyToId` is set. The "Replying to [Name]" indicator pattern from the coordinator page makes this natural.

**Warning signs:** "Students can only reply to existing comments" error toast appearing on submit.

### Pitfall 2: Stale isLocked State After Panel Open

**What goes wrong:** The `isLocked` flag comes from SWR data. If the page loads before `finalClosureDate` passes but the panel stays open past it, the 15s poll will refresh `isLocked` automatically. No manual tracking needed.

**Why it happens:** SWR manages this correctly. The pitfall is trying to derive `isLocked` from a separate source (like a prop from page load) that won't update.

**How to avoid:** Always derive `isLocked` from `commentsData?.isLocked ?? false` — not from closure state cached at page mount.

**Warning signs:** Reply input still showing after closure date has passed without refresh.

### Pitfall 3: Comment Count Not Available in Current Student API

**What goes wrong:** The current `GET /api/submissions` does NOT include `_count.comments`. The student submissions list has no comment count data.

**Why it happens:** The student submissions API was built before COMM-02/COMM-03 were in scope.

**How to avoid:** Add `_count: { select: { comments: true } }` to the Prisma `include` in `GET /api/submissions`. Map to `commentCount: s._count.comments` in the response. Update the TypeScript type on the student page.

**Warning signs:** TypeScript error when trying to read `submission.commentCount`.

### Pitfall 4: Sheet Panel Conflicts with Edit Dialog

**What goes wrong:** The student page uses a `Dialog` for the submission form (new/edit) and another `Dialog` for delete confirmation. Adding a Sheet panel requires careful state management so opening one doesn't interfere with others.

**Why it happens:** React state for `isDialogOpen`, `deleteTarget`, and new `selectedCommentSubmissionId` are independent — but both the Sheet and the Dialog use radix-ui portals, which can conflict visually if both open simultaneously.

**How to avoid:** Open comment Sheet via a dedicated "Comments" button. The Sheet's `onOpenChange` clears `selectedCommentSubmissionId` on close. The Dialog's `onOpenChange` resets form state. These are naturally independent because different buttons trigger them.

**Warning signs:** Sheet and Dialog both visible simultaneously.

### Pitfall 5: Alert Component Amber Styling

**What goes wrong:** The project's Alert component has two built-in variants: `default` (uses `bg-card`) and `destructive` (red). There is no built-in `amber` variant.

**Why it happens:** The amber alert style used elsewhere in the student page overrides via `className`. The coordinator page (Phase 6 fixed) uses a similar pattern for the closure alert.

**How to avoid:** Use `<Alert className="border-amber-200 bg-amber-50 text-amber-900">` — no `variant` prop, just className override. This matches the existing pattern on lines 651-669 of the student page.

**Warning signs:** Amber banner appearing with white or card background instead of amber.

### Pitfall 6: Mobile Card View Needs Comment Count AND Panel Trigger

**What goes wrong:** The student page has TWO submission list views: a table (`hidden lg:block`) and mobile cards (`space-y-3 lg:hidden`). Both need the comment count badge AND a "Comments" button. It's easy to add only to the table.

**Why it happens:** Both views are inside the same component but are conditionally rendered by screen size.

**How to avoid:** Add comment badge and "Comments" button to BOTH the `<table>` rows AND the mobile card `<div>` blocks. The Sheet panel itself is a single portal and works for both.

**Warning signs:** Comment count visible on desktop but not mobile, or vice versa.

---

## Code Examples

Verified patterns from the existing codebase:

### Fetcher helper (coordinator page pattern)
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx line 74
const fetcher = (url: string) => fetch(url).then((r) => r.json());
```

### SWR hook with panel-conditional key
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx lines 198-206
const { data: commentsData, mutate: mutateComments } = useSWR(
  selectedCommentSubmissionId
    ? `/api/comments?submissionId=${selectedCommentSubmissionId}`
    : null,
  fetcher,
  { refreshInterval: 15000 }
);

const comments: Comment[] = commentsData?.comments ?? [];
const isLocked: boolean = commentsData?.isLocked ?? false;
```

### formatRole helper (copy from coordinator page)
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx lines 100-116
function formatRole(role: string | null) {
  if (!role) return "";
  switch (role) {
    case "MARKETING_COORDINATOR": return "Coordinator";
    case "STUDENT": return "Student";
    default: return role;
  }
}
```

### formatCommentTime helper (copy from coordinator page)
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx lines 92-97
function formatCommentTime(value: string) {
  try {
    return format(new Date(value), "dd MMM yyyy, HH:mm");
  } catch {
    return value;
  }
}
```

### Comment type definition
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx lines 61-68
type Comment = {
  id: string;
  body: string;
  authorRole: string;
  parentId: string | null;
  createdAt: string;
  author: { name: string | null; role: string | null };
};
```

### GET /api/comments — isLocked addition
```typescript
// Source: /app/api/comments/route.ts — modification
const [comments, locked] = await Promise.all([
  prisma.submissionComment.findMany({
    where: { submissionId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, role: true } } },
  }),
  isPastFinalClosure(),
]);

return NextResponse.json({ comments, isLocked: locked });
```

### Student submissions API — comment count addition
```typescript
// Source: /app/api/submissions/route.ts — modification to GET include
include: {
  files: { orderBy: { createdAt: "desc" } },
  _count: { select: { comments: true } },
},
// In the response mapping:
// commentCount: s._count.comments
```

### Amber alert (matching existing student page style)
```typescript
// Source: /app/(student)/submissions/page.tsx lines 651-669 (reference for amber pattern)
<Alert className="border-amber-200 bg-amber-50 text-amber-900">
  <AlertDescription className="text-amber-800">
    Comments are locked — the final closure date has passed.
  </AlertDescription>
</Alert>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct fetch + useState for polling | SWR with refreshInterval | Phase 3 (coordinator) | No manual setInterval cleanup, handles focus revalidation |
| Separate closure API call | isLocked from comments GET | Phase 7 (new) | Single round-trip, no race condition |

**Current patterns in this project:**
- Student submissions page uses direct `fetch` + `useEffect` for data loading (not SWR) — this is fine for the submissions list which loads once on mount. The comment thread SHOULD use SWR for polling, matching the coordinator page.
- Coordinator page mixes patterns: submissions list via `fetch` + `useEffect`, comments via `useSWR`. Same pattern is appropriate for student page.

---

## Open Questions

1. **Should reply textarea be always visible or only after clicking Reply?**
   - What we know: Coordinator page always shows textarea (free-form posting). Student page can only reply (must have `replyToId`).
   - What's unclear: UX preference — show textarea always (disabled submit until reply selected) vs. show only after Reply click.
   - Recommendation: Show textarea always (matches coordinator layout). Disable submit button when `replyToId` is null. Placeholder text: "Click Reply on a comment to respond." This is the most transparent UX.

2. **Comment count badge: show 0 or hide when no comments?**
   - What we know: Locked decision says "e.g., '3 comments'" — implies a count badge.
   - What's unclear: Whether to show "0 comments" or hide badge entirely when count is zero.
   - Recommendation: Hide badge when `commentCount === 0` to reduce visual clutter. Show when `> 0`. This matches standard notification badge conventions.

---

## Sources

### Primary (HIGH confidence)

- `/app/(management)/coordinator/submissions/page.tsx` — authoritative pattern reference; SWR setup, comment render, post-comment flow
- `/app/api/comments/route.ts` — existing GET/POST handlers; authorization logic, current response shape
- `/app/(student)/submissions/page.tsx` — current state of student page; what exists, what needs adding
- `/app/api/submissions/route.ts` — student submissions GET handler; where `_count.comments` must be added
- `/lib/closure-guard.ts` — `isPastFinalClosure()` function; called in GET handler to derive `isLocked`
- `prisma/schema.prisma` — `SubmissionComment` model; `parentId`, `authorRole`, `body`, `createdAt` fields confirmed
- `package.json` — confirms swr ^2.4.0, sonner ^2.0.7, date-fns ^3.6.0 all already installed

### Secondary (MEDIUM confidence)

- SWR docs pattern: `null` key stops fetching — standard SWR behavior, consistent with coordinator page usage

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in package.json; no new dependencies
- Architecture: HIGH — coordinator page provides exact reference implementation; student page structure well understood
- API changes: HIGH — both API modifications are small and well-defined (isLocked in GET comments, _count.comments in submissions GET)
- Pitfalls: HIGH — identified from direct code inspection, not speculation

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack; valid for 30 days)
