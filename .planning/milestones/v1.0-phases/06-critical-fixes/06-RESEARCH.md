# Phase 6: Critical Fixes — Closure Gate + Submission Title - Research

**Researched:** 2026-03-02
**Domain:** Next.js API route guards, React form state, shadcn/ui Tooltip
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MGR-02 | Marketing Manager can download a ZIP archive of all files from selected submissions, available only after `finalClosureDate` | `isPastFinalClosure()` from `lib/closure-guard.ts` is ready-made; API route is missing 3 lines; UI button needs `finalClosureDate` awareness + Tooltip wrap |
| COORD-02 | Marketing Coordinator receives an email notification when a student submits with subject line including the student-provided title (not "Untitled") | `Submission.title` column exists in schema; API `PUT` handler already reads `title` and embeds it in the email subject; the only gap is the student form sending no `title` in the payload |
</phase_requirements>

---

## Summary

Phase 6 fixes two audit-identified gaps in the v1.0 codebase. Both are small, surgical changes — not new features. The codebase already has all the required infrastructure; the gaps are missing wiring.

**MGR-02** — The ZIP download route (`app/api/manager/submissions/download/route.ts`) has auth and role guards but no closure-date gate. The `isPastFinalClosure()` function in `lib/closure-guard.ts` already implements the required check. Three lines added to the route (import + guard) close the API gap. The manager UI (`app/(management)/manager/submissions/page.tsx`) renders Download ZIP buttons that are only disabled during an active download — no awareness of `finalClosureDate`. The fix requires fetching the active academic year's `finalClosureDate`, computing whether it has passed client-side, and wrapping each button in a Tooltip that explains why download is blocked pre-deadline. The `Tooltip`/`TooltipProvider`/`TooltipTrigger`/`TooltipContent` components exist in `components/ui/tooltip.tsx`.

**COORD-02** — The `Submission.title` column is already in the Prisma schema (`String? @db.Text`). The `PUT /api/submissions` handler already reads `updatedSubmission.title` and uses it in the email subject line (`New submission: ${submissionTitle} — ${studentName}`). The email fires correctly on first SUBMITTED transition. The gap is entirely in the student form: `SubmissionPayload` type has no `title` field, the form state has no `title` state variable, no title input is rendered, and the `saveDraftToDb()` call never sends a title. Adding a `title` state variable + a controlled `Input` to the form + including `title` in `POST`/`PUT` payloads + saving to localStorage closes all gaps in one pass. No schema migration is needed.

**Primary recommendation:** Fix the API route first (1 task), then the manager UI button (1 task), then the student title field (1 task). All three are independent of each other and can be planned as separate wave tasks.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | API route handlers, page components | Project standard — all routes follow this pattern |
| Prisma | 7.3.0 | ORM — Submission model already has `title` column | No migration needed |
| `lib/closure-guard.ts` | project-local | `isPastFinalClosure()` — compares `Date.now()` to active year's `finalClosureDate` | Already used by `PUT /api/submissions` and `POST /api/comments` |
| shadcn/ui Tooltip | project-local | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` from `components/ui/tooltip.tsx` | Radix UI-backed, already in `components/ui/` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns/format` | 3.6.0 | Format `finalClosureDate` into human-readable string for Tooltip message | Manager UI — display "Available after [date]" in Tooltip content |
| `lucide-react/Lock` or `LockKeyhole` | 0.563.0 | Optional icon in disabled button or Tooltip | Only if the design calls for a visual lock indicator |
| `sonner/toast` | 2.0.7 | Already used for download error toasts | No change needed for error case |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `isPastFinalClosure()` server-side check | Re-implementing date logic in download route | Never hand-roll what the existing guard already does correctly |
| `TooltipProvider` + `Tooltip` components | HTML `title` attribute | Native `title` is invisible on mobile, inconsistent across browsers; project uses shadcn/ui components throughout |
| Fetching `finalClosureDate` in a new dedicated API call | Adding `finalClosureDate` to existing `/api/manager/submissions` response | Extending the existing endpoint is simpler and avoids an extra network round-trip |

**Installation:** No new packages needed — all required components are already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. All changes are edits to existing files:

```
app/
├── api/manager/submissions/
│   ├── download/route.ts         ← ADD isPastFinalClosure() guard (3 lines)
│   └── route.ts                  ← ADD finalClosureDate to response payload
├── (management)/manager/submissions/
│   └── page.tsx                  ← ADD finalClosureDate state + Tooltip wrap
└── (student)/submissions/
    └── page.tsx                  ← ADD title state + input field + payload field
```

### Pattern 1: Inverted Closure Gate (API Route)

**What:** API routes that should only work AFTER `finalClosureDate` check `isPastFinalClosure()` and return 403 if it returns `false` (meaning we are still before the deadline).
**When to use:** Any route that is date-gated as a post-closure action (ZIP download is the canonical case).

**Example — how other routes use closure-guard:**
```typescript
// Source: app/api/submissions/route.ts (existing pattern)
import { isPastFinalClosure } from "@/lib/closure-guard";

// EXISTING pattern (blocks edits AFTER closure):
if (await isPastFinalClosure()) {
  return NextResponse.json(
    { error: "Submissions are locked. The final closure date has passed." },
    { status: 403 }
  );
}

// INVERTED pattern (blocks downloads BEFORE closure):
if (!(await isPastFinalClosure())) {
  return new Response(
    JSON.stringify({ error: "ZIP download is only available after the final closure date." }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
```

Note: The download route uses `new Response(...)` not `NextResponse.json(...)` — maintain consistency with the existing response style in that file.

### Pattern 2: Client-Side Closure Date Awareness (Manager UI)

**What:** The manager UI needs `finalClosureDate` to compute whether download is available. The data flows from the API via the existing `/api/manager/submissions` fetch.
**When to use:** When a UI button's enabled/disabled state depends on a date boundary.

The cleanest approach is to extend the existing `GET /api/manager/submissions` response to include `finalClosureDate` from the active academic year. The manager page already fetches from this endpoint on mount; no new fetch needed.

```typescript
// Source: app/api/manager/submissions/route.ts (extend existing query)
const [faculties, academicYears, activeYear] = await Promise.all([
  prisma.faculty.findMany({ select: { id: true, name: true } }),
  prisma.academicYear.findMany({
    select: { id: true, yearLabel: true, isActive: true },
    orderBy: { yearLabel: "desc" },
  }),
  prisma.academicYear.findFirst({
    where: { isActive: true },
    select: { finalClosureDate: true },
  }),
]);

return NextResponse.json({
  submissions: result,
  academicYears,
  finalClosureDate: activeYear?.finalClosureDate ?? null,
});
```

The manager page then computes `isPastFinalClosure` client-side:
```typescript
const [finalClosureDate, setFinalClosureDate] = useState<string | null>(null);
const isPastFinalClosure = finalClosureDate
  ? Date.now() > new Date(finalClosureDate).getTime()
  : false;
```

### Pattern 3: Tooltip Wrap for Disabled Button

**What:** When a button is disabled due to a business rule, wrap it in a `Tooltip` that explains why. `TooltipTrigger` must receive `asChild` and the wrapped element must be a `span` when the button is disabled (disabled buttons do not fire mouse events in some browsers, preventing the tooltip from showing).
**When to use:** Any disabled-state button that needs user-visible explanation.

```tsx
// Source: components/ui/tooltip.tsx (project's Radix UI Tooltip implementation)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Wrap just the button that needs the tooltip:
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span>  {/* span wrapper required when button is disabled */}
        <Button
          size="sm"
          onClick={() => handleDownloadZip(yearId, label)}
          disabled={!isPastFinalClosure || downloadingYearId !== null}
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {downloadingYearId === yearId ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Downloading...</>
          ) : (
            <><Download className="h-3.5 w-3.5" />Download ZIP</>
          )}
        </Button>
      </span>
    </TooltipTrigger>
    {!isPastFinalClosure && (
      <TooltipContent>
        Available after{" "}
        {finalClosureDate
          ? format(new Date(finalClosureDate), "dd MMM yyyy")
          : "the final closure date"}
      </TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

### Pattern 4: Adding a Form Field to the Student Submission Form

**What:** The student form uses local state (`useState`) + a controlled `Input` component + `localStorage` persistence. Adding `title` follows the same pattern already used for `notes`.
**When to use:** Any new field in the student submission form.

The existing flow for `notes`:
1. `const [notes, setNotes] = useState("")` — state variable
2. `notes` included in `saveDraftToDb()` POST/PUT body
3. `notes` saved in `localStorage` under `DRAFT_STORAGE_KEY`
4. `notes` loaded from localStorage in `useEffect` on mount
5. `setNotes(submission.notes ?? "")` called in `startEditSubmission()`
6. `<Input value={notes} onChange={e => setNotes(e.target.value)} />` rendered in form

**Title follows the identical pattern.** Key differences to account for:
- `title` is a shorter single-line field, while `notes` is a `<textarea>` — use `<Input>` not `<Textarea>` for title
- The submission list displays `submission.title` — the student's own list view should also show the title after it's added
- The `SubmissionPayload` type in `app/api/submissions/route.ts` needs `title?: string | null` added

The `Submission` model type in the student page's `useState` definition also needs `title: string | null`:
```typescript
const [submissions, setSubmissions] = useState<{
  id: string;
  title: string | null;  // ← add this
  status: "DRAFT" | "SUBMITTED";
  notes: string | null;
  // ...
}[]>([]);
```

### Anti-Patterns to Avoid

- **Checking closure date in the UI instead of the API:** The API guard is the authoritative enforcement point. The UI is enhancement only — the API must always validate independently.
- **Awaiting email send in the `PUT` handler:** Email sending is already correctly fire-and-forget (`.catch(console.error)`) — do not change this.
- **Creating a new API endpoint for `finalClosureDate`:** The existing `/api/manager/submissions` endpoint is the right place to add it — avoids an extra roundtrip.
- **Placing `TooltipProvider` deep in JSX:** `TooltipProvider` must be an ancestor of all `Tooltip` usages. Placing it at the button level is safe (it wraps a single tooltip), but if multiple buttons need tooltips on the same page, a single provider higher up is cleaner.
- **Forgetting to update the localStorage draft schema:** The `localStorage` key `studentSubmissionDraft` stores `{ agreed, notes, fileNames, savedAt, submissionId }` — must add `title` to this structure so draft restoration also restores the title.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date comparison for closure check | Custom date logic in route | `isPastFinalClosure()` from `lib/closure-guard.ts` | Already handles null safety, no active year, and timezone-agnostic `Date.now()` comparison |
| Tooltip for disabled button | Custom CSS popover | `TooltipProvider/Tooltip/TooltipTrigger/TooltipContent` from `components/ui/tooltip.tsx` | Already installed (Radix UI), consistent with project UI system |
| Form field validation for title | Custom validation logic | Zod or simple `string.trim()` check | Title is optional — no validation needed beyond trimming whitespace before send |

**Key insight:** Both fixes are wiring existing infrastructure, not building new infrastructure. `isPastFinalClosure()` is tested and correct. `Submission.title` column exists in the DB. The email template already uses `title`. The Tooltip component is already installed.

---

## Common Pitfalls

### Pitfall 1: Disabled Button Swallows Mouse Events, Breaking Tooltip

**What goes wrong:** A disabled `<button>` does not fire `mouseenter`/`mouseleave`, so hovering a disabled button shows no Tooltip.
**Why it happens:** HTML spec — disabled form elements do not participate in pointer events.
**How to avoid:** Wrap the `<Button>` in a `<span>` and use `TooltipTrigger asChild` pointing at the span, not the button directly. The span receives the mouse event and triggers the tooltip.
**Warning signs:** Tooltip works when button is enabled but disappears when button is disabled.

### Pitfall 2: `isPastFinalClosure` Returns `false` When No Active Year

**What goes wrong:** If no academic year is active (e.g. between years), `isPastFinalClosure()` returns `false` — meaning the download is blocked even though there is no active cycle with a pending deadline.
**Why it happens:** The function is designed conservatively — when in doubt, block. This matches the student closure enforcement pattern already in the codebase.
**How to avoid:** Accept this behavior as correct. Document it in the route comment. If needed in the future, the guard function can be extended.
**Warning signs:** Manager cannot download in a period with no active year.

### Pitfall 3: Title Not Sent on Edit (PUT) When User Doesn't Change It

**What goes wrong:** If a student opens an existing draft for editing but does not touch the title field, the `title` state initialises to the stored value but is also sent on PUT — this is correct. The risk is if `startEditSubmission()` does not restore `title` from the submission, causing an empty PUT that overwrites a previously saved title with `""` or `null`.
**Why it happens:** `startEditSubmission()` sets `notes` from `submission.notes` but currently does not set `title` because the field does not exist yet. Forgetting to add `setTitle(submission.title ?? "")` in that function would cause title regression.
**How to avoid:** Add `setTitle(submission.title ?? "")` to `startEditSubmission()` alongside the existing `setNotes()` call.
**Warning signs:** Title is saved on first create but disappears when the student edits the submission later.

### Pitfall 4: localStorage Draft Deserialisation Missing `title`

**What goes wrong:** Existing saved drafts in localStorage will not have a `title` key. If the load code does `parsed.title` without a null default, it will be `undefined`, which could cause the input to be in an uncontrolled state.
**Why it happens:** localStorage drafts were saved before `title` was added to the schema.
**How to avoid:** Use `parsed.title ?? ""` when reading from localStorage. This also handles the pre-existing drafts gracefully.
**Warning signs:** Console warning about uncontrolled/controlled input switching.

### Pitfall 5: `SubmissionPayload` Type Missing `title` in API Route

**What goes wrong:** The `POST` and `PUT` handlers in `app/api/submissions/route.ts` destructure the body as `SubmissionPayload`. If `title` is not added to that type, TypeScript will produce an error and the field will be ignored even if the client sends it.
**Why it happens:** The type was defined before `title` was planned. The `Submission.title` DB column exists but the API route type was never updated.
**How to avoid:** Add `title?: string | null` to `SubmissionPayload` and pass it to `prisma.submission.create()` and `prisma.submission.update()`.
**Warning signs:** TypeScript error `Property 'title' does not exist on type 'SubmissionPayload'`, or title is never written to DB.

---

## Code Examples

Verified patterns from official project sources:

### Closure Gate (API — inverted, POST-deadline permit)
```typescript
// Source: app/api/manager/submissions/download/route.ts (to be added)
// Pattern mirrors the existing gate in app/api/submissions/route.ts but inverted

import { isPastFinalClosure } from "@/lib/closure-guard";

// Place immediately after role guard, before any DB query:
if (!(await isPastFinalClosure())) {
  return new Response(
    JSON.stringify({ error: "ZIP download is only available after the final closure date." }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
```

### Extend Manager Submissions API Response
```typescript
// Source: app/api/manager/submissions/route.ts (to be modified)

const [faculties, academicYears, activeYear] = await Promise.all([
  prisma.faculty.findMany({ select: { id: true, name: true } }),
  prisma.academicYear.findMany({
    select: { id: true, yearLabel: true, isActive: true },
    orderBy: { yearLabel: "desc" },
  }),
  prisma.academicYear.findFirst({
    where: { isActive: true },
    select: { finalClosureDate: true },
  }),
]);

return NextResponse.json({
  submissions: result,
  academicYears,
  finalClosureDate: activeYear?.finalClosureDate ?? null,
});
```

### Manager UI — Closure Date State and Derived Boolean
```typescript
// Source: app/(management)/manager/submissions/page.tsx (to be added)

const [finalClosureDate, setFinalClosureDate] = useState<string | null>(null);

// Derive isPastFinalClosure from the date:
const isPastFinalClosure = finalClosureDate
  ? Date.now() > new Date(finalClosureDate).getTime()
  : false;

// In fetch handler (existing useEffect):
const data = await res.json() as {
  submissions: SubmissionRow[];
  academicYears?: AcademicYear[];
  finalClosureDate?: string | null;
};
if (!cancelled) {
  setSubmissions(data.submissions ?? []);
  if (data.academicYears?.length) setAcademicYears(data.academicYears);
  if (data.finalClosureDate !== undefined) setFinalClosureDate(data.finalClosureDate);
}
```

### Student Title Field State Pattern
```typescript
// Source: app/(student)/submissions/page.tsx (to be added — mirrors notes pattern)

const [title, setTitle] = useState("");

// In localStorage load useEffect:
setTitle(parsed.title ?? "");

// In startEditSubmission():
setTitle(submission.title ?? "");

// In resetForm():
setTitle("");

// In saveDraftToDb() body:
body: JSON.stringify({
  id: shouldCreate ? undefined : targetId ?? undefined,
  agreed,
  title,
  notes,
  status: nextStatus,
}),

// In localStorage save:
window.localStorage.setItem(
  DRAFT_STORAGE_KEY,
  JSON.stringify({ agreed, title, notes, fileNames, savedAt, submissionId })
);
```

### SubmissionPayload Type Extension
```typescript
// Source: app/api/submissions/route.ts (to be modified)

type SubmissionPayload = {
  id?: string;
  agreed?: boolean;
  title?: string | null;  // ← add this
  notes?: string | null;
  status?: "DRAFT" | "SUBMITTED";
};
```

### Prisma Create/Update Including Title
```typescript
// Source: app/api/submissions/route.ts POST handler (to be modified)
const submission = await prisma.submission.create({
  data: {
    userId: session.user.id,
    agreed: Boolean(body.agreed),
    title: body.title ?? null,  // ← add this
    notes: body.notes ?? null,
    status: body.status ?? "DRAFT",
    submittedAt: body.status === "SUBMITTED" ? new Date() : null,
    academicYearId: activeYear.id,
    facultyId: dbUser?.facultyId ?? null,
  },
});

// PUT updateData object (to be modified):
if (body.title !== undefined) {
  updateData.title = body.title ?? null;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No closure gate on download route | `isPastFinalClosure()` gate (to add) | Phase 6 | Blocks pre-deadline downloads with 403 |
| Download button always enabled | Button disabled before `finalClosureDate`, Tooltip explains (to add) | Phase 6 | UX communicates the post-deadline availability |
| No title field in student form | Title input + persisted to DB (to add) | Phase 6 | Coordinator emails show real submission names |

**No deprecated patterns involved** — this phase uses the same patterns as the rest of the codebase.

---

## Open Questions

1. **What if `finalClosureDate` is null on the active academic year?**
   - What we know: `isPastFinalClosure()` returns `false` if `finalClosureDate === null`, which means the gate blocks the download (conservative default)
   - What's unclear: Is this the right UX? A manager could be blocked from downloading even when the admin hasn't set a deadline
   - Recommendation: Accept the conservative behaviour — it is consistent with the existing `isPastFirstClosure()` pattern. Add a comment in the route.

2. **Should the manager UI show the `finalClosureDate` value in the Tooltip?**
   - What we know: `finalClosureDate` will be passed from the API in the response
   - What's unclear: Whether to format it as "Available after 15 Apr 2026" or a vaguer "Available after the final closure date"
   - Recommendation: Include the formatted date when available — it gives the manager actionable information. Use `format(new Date(finalClosureDate), "dd MMM yyyy")` from `date-fns` (already installed).

3. **Is `title` required or optional in the student form?**
   - What we know: `Submission.title` is `String?` (nullable) in the schema — title is optional at the DB level
   - What's unclear: Should the form enforce a non-empty title before saving/submitting?
   - Recommendation: Make it optional (matching the schema). A student without a title defaults to "Untitled" in the email, which is the same as today — but now they have the option to provide one.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `lib/closure-guard.ts` — verified `isPastFinalClosure()` signature and return semantics
- Codebase direct inspection — `app/api/manager/submissions/download/route.ts` — verified no closure guard exists (lines 1-158)
- Codebase direct inspection — `app/api/submissions/route.ts` — verified `SubmissionPayload` type, `title` field already referenced in email send (line 206), no `title` in POST/PUT body handling
- Codebase direct inspection — `prisma/schema.prisma` — verified `Submission.title String? @db.Text` at line 157
- Codebase direct inspection — `components/ui/tooltip.tsx` — verified `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` exports
- Codebase direct inspection — `app/(management)/manager/submissions/page.tsx` — verified Download button at line 303-320, no `finalClosureDate` state, `disabled={downloadingYearId !== null}` only
- Codebase direct inspection — `app/(student)/submissions/page.tsx` — verified no `title` state, no title input, no `title` in POST/PUT payload

### Secondary (MEDIUM confidence)

- HTML spec (known behaviour) — disabled `<button>` does not fire pointer events; confirmed by Radix UI Tooltip docs recommending `<span>` wrapper for disabled triggers

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct file inspection; no new packages required
- Architecture: HIGH — both changes follow existing patterns exactly (closure guard, form state, Tooltip)
- Pitfalls: HIGH — verified by reading the actual code that would cause each pitfall

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable codebase, no moving dependencies)
