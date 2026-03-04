---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/submissions/route.ts
  - app/(portal)/student/submissions/page.tsx
autonomous: true
requirements: [QUICK-3]

must_haves:
  truths:
    - "Active-year submissions show in the main 'Your submissions' card with Edit/Delete/Comments buttons"
    - "Archived submissions (non-active or null academicYearId) appear in a separate 'Previous Submissions' card below"
    - "Archived submissions are read-only: no Edit button, no Delete button, only Comments button"
    - "Archived submissions are grouped by year label with a subheading per group"
    - "'New Submission' button hidden with info message when no active academic year"
  artifacts:
    - path: "app/api/submissions/route.ts"
      provides: "GET response includes academicYear relation data"
      contains: "academicYear"
    - path: "app/(portal)/student/submissions/page.tsx"
      provides: "Separated current vs archived submission views"
      contains: "Previous Submissions"
  key_links:
    - from: "app/api/submissions/route.ts"
      to: "prisma.submission.findMany include"
      via: "academicYear select in Prisma include"
      pattern: "academicYear.*select.*yearLabel.*isActive"
    - from: "app/(portal)/student/submissions/page.tsx"
      to: "/api/submissions response"
      via: "submission type includes academicYear field"
      pattern: "academicYear.*isActive"
---

<objective>
Separate student submissions by academic year so active-year submissions are editable in the main card and previous-year submissions appear as read-only archive below.

Purpose: Students currently see all submissions in a flat list with no distinction between years. This change gives clear separation — active year work is editable, past year work is view-only.
Output: Updated API response with academic year data, UI split into current and archived sections.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/api/submissions/route.ts
@app/(portal)/student/submissions/page.tsx
@prisma/schema.prisma
</context>

<tasks>

<task type="auto">
  <name>Task 1: Include academic year data in GET /api/submissions response</name>
  <files>app/api/submissions/route.ts</files>
  <action>
In the GET handler, update the Prisma `findMany` include to add the `academicYear` relation:

```ts
include: {
  files: { orderBy: { createdAt: "desc" } },
  _count: { select: { comments: true } },
  academicYear: { select: { id: true, yearLabel: true, isActive: true } },
}
```

Update the `mapped` transformation to pass through the academic year data. Destructure `_count` as before, and include `academicYearId` and `academicYear` in the returned object:

```ts
const mapped = submissions.map((s) => {
  const { _count, ...rest } = s;
  return {
    ...rest,
    commentCount: _count?.comments ?? 0,
  };
});
```

Since `academicYearId` and `academicYear` are already part of `...rest` from the Prisma result (academicYearId is on the model, academicYear comes from the include), no additional mapping is needed — the spread already includes them. Verify this is the case; if `academicYear` is not in `rest`, add it explicitly.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit app/api/submissions/route.ts 2>&1 | head -20</automated>
    <manual>GET /api/submissions returns each submission with academicYearId and academicYear object</manual>
  </verify>
  <done>GET /api/submissions response includes academicYearId (string|null) and academicYear ({ id, yearLabel, isActive } | null) for each submission</done>
</task>

<task type="auto">
  <name>Task 2: Separate submissions UI into current year and archived sections</name>
  <files>app/(portal)/student/submissions/page.tsx</files>
  <action>
**A. Update the submissions type** (around line 127-139):

Add `academicYearId` and `academicYear` to the submissions state type:

```ts
const [submissions, setSubmissions] = useState<
  {
    id: string;
    status: "DRAFT" | "SUBMITTED";
    title: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    submittedAt: string | null;
    commentCount: number;
    academicYearId: string | null;
    academicYear: { id: string; yearLabel: string; isActive: boolean } | null;
    files: { id: string; url: string; pathname: string; createdAt: string }[];
  }[]
>([]);
```

Also update the `loadSubmissions` payload type to match (around line 419-431).

**B. Derive current and archived lists** after the submissions state (add as useMemo or plain derivation):

```ts
const currentSubmissions = submissions.filter(
  (s) => s.academicYear?.isActive === true
);

const archivedByYear = submissions
  .filter((s) => s.academicYear?.isActive !== true)
  .reduce<Record<string, typeof submissions>>((groups, s) => {
    const label = s.academicYear?.yearLabel ?? "Unknown Year";
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
    return groups;
  }, {});

const archivedYearLabels = Object.keys(archivedByYear).sort().reverse();
const hasArchived = archivedYearLabels.length > 0;
```

**C. Modify the "New Submission" button area** (around line 742-757):

When `closureYearLabel` is null AND `closureLoading` is false, replace the DialogTrigger button with an info alert:

```tsx
{!closureLoading && closureYearLabel === null ? (
  <Alert className="border-slate-200 bg-slate-50">
    <Info className="h-4 w-4" />
    <AlertDescription className="text-slate-600">
      No active academic year. Submissions are currently closed.
    </AlertDescription>
  </Alert>
) : (
  <Dialog ...> {/* existing dialog trigger and content */} </Dialog>
)}
```

Move the Dialog wrapper (lines ~742-1107) inside this conditional so it only renders when there IS an active year. The Dialog itself stays the same internally.

**D. Update the main card to show only current submissions** (around line 1109-1211):

- Change the header text from "Your submissions" to "Current Year" (keep the CardDescription).
- Replace `submissions` with `currentSubmissions` in the rendering block:
  - Empty state: `currentSubmissions.length === 0` -> "No submissions for the current academic year."
  - Grid: map over `currentSubmissions` instead of `submissions`

**E. Add the "Previous Submissions" card below the main card** (after line 1212):

Only render when `hasArchived && !submissionsLoading`:

```tsx
{hasArchived && !submissionsLoading && (
  <Card className="border-slate-200 bg-white">
    <CardHeader>
      <CardTitle>Previous Submissions</CardTitle>
      <CardDescription className="text-slate-500">
        Read-only archive of submissions from past academic years.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {archivedYearLabels.map((yearLabel) => (
        <div key={yearLabel} className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">{yearLabel}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {archivedByYear[yearLabel].map((submission) => (
              <div
                key={submission.id}
                className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {submission.title || <span className="text-slate-400">Untitled</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {submission.submittedAt
                        ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`
                        : "Not submitted"}
                    </p>
                  </div>
                  <Badge className={getStatusBadgeClass(submission.status)} variant="secondary">
                    {submission.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{submission.files.length} file{submission.files.length === 1 ? "" : "s"}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedCommentSubmissionId(submission.id)}
                  >
                    <MessageSquare className="size-3.5" />
                    Comments
                    {submission.commentCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold min-w-[18px] h-[18px] px-1.5">
                        {submission.commentCount}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

Key points for archived cards:
- NO Edit button, NO Delete button, NO Resubmit — only Comments button
- Comments button works the same way (opens the Sheet, reply controlled by isLocked from API)
- Same card styling as current submissions for visual consistency

**F. Fix the `selectedSubmission` lookup** (around line 225-227):

The `selectedSubmission` find must search ALL submissions (not just current), since the user can open comments from archived cards too. This already works since it searches `submissions` state. Verify it still does.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit app/\(portal\)/student/submissions/page.tsx 2>&1 | head -30</automated>
    <manual>Visit /student/submissions — current year submissions appear in top card with Edit/Delete, archived appear below with only Comments button, "New Submission" hidden when no active year</manual>
  </verify>
  <done>Student submissions page shows current-year submissions in main card (editable) and previous-year submissions in a separate read-only archive card grouped by year label. "New Submission" button hidden with info message when no active academic year.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. GET /api/submissions returns academicYear data for each submission
3. Current-year submissions show Edit, Delete (for drafts), Comments buttons
4. Archived submissions show only Comments button — no Edit, no Delete
5. Archives grouped by year label with subheading
6. "New Submission" button hidden when closureYearLabel is null
7. Comment Sheet still works from archived submission cards
</verification>

<success_criteria>
- API includes academicYear relation in GET response
- UI splits submissions into current (editable) and archived (read-only) sections
- No Edit/Delete on archived submissions
- "New Submission" hidden with info message when no active year
- All existing functionality preserved for current-year submissions
</success_criteria>

<output>
After completion, create `.planning/quick/3-separate-student-submissions-by-academic/3-SUMMARY.md`
</output>
