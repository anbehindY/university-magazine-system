---
phase: quick-6
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/coordinator/submissions/route.ts
  - app/(portal)/coordinator/submissions/page.tsx
  - app/(portal)/reports/page.tsx
autonomous: true
requirements: [QUICK-6]
must_haves:
  truths:
    - "Coordinator can filter submissions to show only those with no comments"
    - "When 'No Comments' filter is active with oldest-first sort, uncommented submissions appear oldest-first (highest priority)"
    - "Comment count is visible in the submissions table"
    - "Coordinator can switch academic years on the reports page"
  artifacts:
    - path: "app/api/coordinator/submissions/route.ts"
      provides: "commentCount in API response"
      contains: "_count.*comments"
    - path: "app/(portal)/coordinator/submissions/page.tsx"
      provides: "No Comments filter option and commentCount column"
      contains: "no-comments"
    - path: "app/(portal)/reports/page.tsx"
      provides: "Year selector enabled for coordinators"
      contains: "MARKETING_COORDINATOR"
  key_links:
    - from: "app/api/coordinator/submissions/route.ts"
      to: "app/(portal)/coordinator/submissions/page.tsx"
      via: "commentCount field in API response consumed by SubmissionRow type"
      pattern: "commentCount"
---

<objective>
Add "No Comments" filter and comment count display to coordinator submissions page, and enable year selector for coordinators on the reports page.

Purpose: Coordinators need to prioritize submissions that have received no comments yet (oldest first = highest priority). They also need access to previous year reports data.
Output: Updated API route, submissions page with new filter/sort/column, reports page with coordinator year switching.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/api/coordinator/submissions/route.ts
@app/(portal)/coordinator/submissions/page.tsx
@app/(portal)/reports/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add commentCount to API and "No Comments" filter/sort/column to coordinator submissions UI</name>
  <files>app/api/coordinator/submissions/route.ts, app/(portal)/coordinator/submissions/page.tsx</files>
  <action>
**API changes** (`app/api/coordinator/submissions/route.ts`):

1. In the `select` object of `prisma.submission.findMany` (line ~76), add comments count to the existing `_count`:
   - Change `_count: { select: { files: true } }` to `_count: { select: { files: true, comments: true } }`

2. In the `result` mapping (line ~81), add `commentCount` to the returned object:
   - Add `commentCount: s._count.comments,` alongside the existing `fileCount: s._count.files`

**UI changes** (`app/(portal)/coordinator/submissions/page.tsx`):

3. Add `commentCount: number` to the `SubmissionRow` type (after `fileCount: number` on line 59)

4. Expand `filterStatus` type (line 139):
   - Change `"all" | "selected" | "not-selected"` to `"all" | "selected" | "not-selected" | "no-comments"`

5. Expand `sortBy` type (line 140):
   - Change `"date-desc" | "date-asc" | "selected"` to `"date-desc" | "date-asc" | "selected" | "no-comments-priority"`

6. Add "No Comments" option to the filter `<Select>` dropdown (after line 415, the "Not Selected" SelectItem):
   - `<SelectItem value="no-comments" className="text-slate-900">No Comments</SelectItem>`

7. Add "No Comments Priority" option to the sort `<Select>` dropdown (after line 429, the "Selected First" SelectItem):
   - `<SelectItem value="no-comments-priority" className="text-slate-900">No Comments Priority</SelectItem>`
   - This sort puts submissions with commentCount === 0 first, sorted oldest-first among those, then submissions with comments sorted oldest-first

8. Update the filter logic (line ~362) to handle the new filter value:
   - Add: `if (filterStatus === "no-comments") return s.commentCount === 0;`

9. Update the sort logic (line ~367) to handle the new sort value:
   - Add before the existing `if (sortBy === "selected")` block:
   ```
   if (sortBy === "no-comments-priority") {
     const aNoComment = a.commentCount === 0 ? 0 : 1;
     const bNoComment = b.commentCount === 0 ? 0 : 1;
     if (aNoComment !== bNoComment) return aNoComment - bNoComment;
     return new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
   }
   ```

10. Add a "Comments" column to the table header (between "Files" and "Selected" columns, around line 503):
    - `<th className="px-4 py-3 text-sm font-medium text-center">Comments</th>`

11. Add the comment count cell in the table body (between the Files cell and Selected cell, around line 529):
    ```
    <td className="px-4 py-3 text-center text-sm text-slate-700">
      {submission.commentCount === 0 ? (
        <span className="text-amber-600 font-medium">0</span>
      ) : (
        submission.commentCount
      )}
    </td>
    ```
    - Zero comments shown in amber to draw coordinator attention

12. Add the same "Comments" column to the loading skeleton table header and a skeleton cell to each skeleton row (around lines 450-451).
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Visit coordinator submissions page: verify "No Comments" appears in filter dropdown, "No Comments Priority" in sort dropdown, comment count column visible in table, filtering by "No Comments" shows only 0-comment submissions, sorting by priority puts oldest uncommented first</manual>
  </verify>
  <done>API returns commentCount for each submission. UI has "No Comments" filter option, "No Comments Priority" sort option, and a Comments column in the table. Zero-comment submissions are visually highlighted in amber.</done>
</task>

<task type="auto">
  <name>Task 2: Enable year selector for coordinators on reports page</name>
  <files>app/(portal)/reports/page.tsx</files>
  <action>
**Single-line change** (`app/(portal)/reports/page.tsx`):

1. On line 131, change:
   ```
   const canSwitchYear = role === "MARKETING_MANAGER" || role === "ADMINISTRATOR";
   ```
   To:
   ```
   const canSwitchYear = role === "MARKETING_MANAGER" || role === "ADMINISTRATOR" || role === "MARKETING_COORDINATOR";
   ```

This enables the `<Select>` year dropdown (line 331-351) for coordinators instead of showing the static text label. No other changes needed -- the reports API already supports arbitrary academicYearId parameters from any authorized role.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && grep -n "MARKETING_COORDINATOR" app/\(portal\)/reports/page.tsx</automated>
    <manual>Log in as coordinator, visit reports page, verify year selector dropdown appears and switching years loads different data</manual>
  </verify>
  <done>Coordinators see the academic year dropdown on the reports page and can switch between years to view historical report data.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no type errors
- Coordinator submissions API response includes `commentCount` field
- Submissions table shows Comments column
- Filter dropdown has "No Comments" option that filters to commentCount === 0
- Sort dropdown has "No Comments Priority" that sorts uncommented oldest-first
- Reports page year selector visible for MARKETING_COORDINATOR role
</verification>

<success_criteria>
1. Coordinator can filter submissions to only see those with zero comments
2. "No Comments Priority" sort puts uncommented submissions oldest-first (highest priority)
3. Comment count is visible as a table column with amber highlight on zero
4. Coordinator can switch academic years on the reports page
</success_criteria>

<output>
After completion, create `.planning/quick/6-coordinator-submissions-filter-no-commen/6-SUMMARY.md`
</output>
