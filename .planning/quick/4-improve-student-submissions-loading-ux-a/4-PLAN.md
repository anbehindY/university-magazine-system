---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(portal)/student/submissions/page.tsx
autonomous: true
requirements: [UX-SKELETON, COMM-LOCK-ARCHIVED]

must_haves:
  truths:
    - "Page shows skeleton cards (not a spinner or blank space) while submissions load"
    - "Page shows a full-page LoadingScreen while auth session is pending"
    - "Replies are locked on comments belonging to archived-year submissions"
    - "Archived-year comment threads are still readable (comments visible, only reply UI hidden)"
    - "Locked banner message distinguishes between closure-locked and archived-year-locked"
  artifacts:
    - path: "app/(portal)/student/submissions/page.tsx"
      provides: "Skeleton loading states and archived-year comment locking"
      contains: "Skeleton"
  key_links:
    - from: "isLocked derivation"
      to: "selectedSubmission.academicYear.isActive"
      via: "OR condition in isLocked"
      pattern: "isLocked.*academicYear.*isActive"
---

<objective>
Improve the student submissions page loading UX by replacing the jarring LoadingScreen spinner with skeleton cards that match the submission card layout, and lock comment replies on archived-year submissions so students cannot reply to threads from past academic years.

Purpose: Better perceived performance during data loading, and correct comment locking behavior for archived submissions (currently only checks active year's closure date, not whether the submission belongs to an archived year).
Output: Updated student submissions page with skeleton loading states and archived-year reply locking.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/(portal)/student/submissions/page.tsx
@components/ui/skeleton.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace LoadingScreen with skeleton cards and add auth guard</name>
  <files>app/(portal)/student/submissions/page.tsx</files>
  <action>
Three changes to the loading UX in `app/(portal)/student/submissions/page.tsx`:

**1. Add auth pending guard (early return)**
At the top of the render (before the `return <main>` at ~line 744), add an early return:
```tsx
if (isPending) return <LoadingScreen />;
```
This matches the pattern used in `app/(portal)/page.tsx` line 545. Import `LoadingScreen` is already present.

**2. Add a SubmissionCardSkeleton helper component**
Add a small helper function (inside the file, above the main component or as a nested function) that renders a skeleton matching the submission card layout. The card layout is: title + date line, badge, file count line, and action buttons row. Use the existing `Skeleton` component from `@/components/ui/skeleton` (add to imports).

```tsx
function SubmissionCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-sm" />
      </div>
      <Skeleton className="h-3 w-20" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}
```

**3. Replace the LoadingScreen at ~line 1140**
Replace:
```tsx
{submissionsLoading ? <LoadingScreen className="min-h-[20vh]" /> : null}
```
With a 2-column skeleton grid matching the submission cards grid layout:
```tsx
{submissionsLoading ? (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <SubmissionCardSkeleton />
    <SubmissionCardSkeleton />
  </div>
) : null}
```

**4. Initialize submissionsLoading to true (not false)**
At ~line 142, change:
```tsx
const [submissionsLoading, setSubmissionsLoading] = useState(false);
```
to:
```tsx
const [submissionsLoading, setSubmissionsLoading] = useState(true);
```
This ensures skeleton cards show immediately on mount (before the useEffect fires loadSubmissions), instead of briefly flashing the "No submissions" empty state. The loadSubmissions function already sets it to false on completion.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Visit the student submissions page — should see skeleton cards briefly while data loads, not a spinner or blank page. The auth pending state should show a full LoadingScreen before session resolves.</manual>
  </verify>
  <done>Auth pending shows LoadingScreen. Submissions loading shows 2 skeleton cards in a grid matching the real card layout. No jarring spinner or blank flash.</done>
</task>

<task type="auto">
  <name>Task 2: Lock comment replies on archived-year submissions</name>
  <files>app/(portal)/student/submissions/page.tsx</files>
  <action>
Two changes to the comment locking logic in `app/(portal)/student/submissions/page.tsx`:

**1. Update isLocked derivation (~line 241)**
Change:
```tsx
const isLocked: boolean = commentsData?.isLocked ?? false;
```
To:
```tsx
const isArchivedYear = selectedSubmission?.academicYear?.isActive !== true && selectedSubmission !== null;
const isLocked: boolean = (commentsData?.isLocked ?? false) || isArchivedYear;
```

Logic: If the selected submission belongs to an archived year (isActive !== true), force-lock replies regardless of the API's closure-date check. The `selectedSubmission !== null` guard prevents locking when no submission is selected (which would make isActive check truthy on null).

Note: `selectedSubmission` is already defined at ~line 244, but it is used AFTER isLocked at line 241. Move the `selectedSubmission` derivation ABOVE the isLocked derivation so it is available. The current order is:
- Line 241: `const isLocked = ...`
- Line 244: `const selectedSubmission = ...`

Swap so `selectedSubmission` comes first, then `isArchivedYear` and `isLocked` use it.

**2. Update the locked banner message (~lines 1430-1437)**
The current locked banner says "Comments are locked — the final closure date has passed." This is incorrect when the lock is due to an archived year. Update to:
```tsx
{isLocked && (
  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
    <AlertDescription className="text-amber-800">
      {isArchivedYear
        ? "Comments are locked — this submission belongs to a past academic year."
        : "Comments are locked — the final closure date has passed."}
    </AlertDescription>
  </Alert>
)}
```

This requires `isArchivedYear` to be in scope where the JSX is rendered. Since it is defined at the component level (alongside isLocked), it will be accessible.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Open comment sheet on an archived-year submission — Reply buttons should be hidden, locked banner should say "past academic year". Open comment sheet on a current-year submission — Reply buttons should be visible (assuming closure hasn't passed).</manual>
  </verify>
  <done>Archived-year submissions show locked comments with "past academic year" message. Current-year submissions show reply UI normally. Comments are still readable (not hidden) in both cases.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit` passes with no errors
2. Skeleton loading: Page shows skeleton cards (not spinner) while submissions load
3. Auth guard: Page shows LoadingScreen while session is pending (before data loads)
4. Archived lock: Opening comments on an archived submission locks replies with correct message
5. Current year: Opening comments on a current-year submission still allows replies (when not past closure)
</verification>

<success_criteria>
- No TypeScript errors
- Skeleton cards render during submissions loading (matches card layout: title, badge, file count, buttons)
- Auth pending state renders LoadingScreen (not blank page)
- Comment reply UI (Reply button, textarea, send button) hidden for archived-year submissions
- Locked banner shows distinct messages for closure-locked vs archived-year-locked
- Comments remain readable (visible) for archived submissions
</success_criteria>

<output>
After completion, create `.planning/quick/4-improve-student-submissions-loading-ux-a/4-SUMMARY.md`
</output>
