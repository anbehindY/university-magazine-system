---
phase: quick-15
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/manager/submissions/route.ts
  - app/(portal)/manager/submissions/page.tsx
autonomous: true
requirements: [QUICK-15]

must_haves:
  truths:
    - "Marketing manager can click a submission row to open a slide-over panel"
    - "Slide-over displays title, student name, faculty, submission date, files list with download links, notes, review status, and selection status"
    - "Slide-over is read-only — no edit controls, no toggle switches, no save buttons"
    - "Closing the slide-over returns to the table view"
  artifacts:
    - path: "app/api/manager/submissions/route.ts"
      provides: "Expanded submission data including files, notes, reviewStatus, isSelected"
    - path: "app/(portal)/manager/submissions/page.tsx"
      provides: "Sheet slide-over showing submission details on row click"
  key_links:
    - from: "app/(portal)/manager/submissions/page.tsx"
      to: "app/api/manager/submissions/route.ts"
      via: "fetch /api/manager/submissions"
      pattern: "files.*url.*pathname"
---

<objective>
Add a read-only submission detail slide-over to the marketing manager submissions page. When a manager clicks a submission row, a Sheet panel slides open from the right showing full submission details: title, student name, faculty, submission date, files list with download links, coordinator notes, review status badge, and selection status badge. This is purely read-only (managers do not edit submissions). Pattern follows the existing coordinator submissions slide-over.

Purpose: Managers currently see only a summary table with no way to inspect individual submissions. The slide-over gives them visibility into the full submission without leaving the page.
Output: Updated API route and page component with functional slide-over.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/api/manager/submissions/route.ts
@app/(portal)/manager/submissions/page.tsx
@app/(portal)/coordinator/submissions/page.tsx (reference pattern for slide-over)
@components/ui/sheet.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand manager submissions API to include file details, notes, reviewStatus, isSelected</name>
  <files>app/api/manager/submissions/route.ts</files>
  <action>
Update the Prisma select in the manager submissions GET handler to include:
- `notes: true`
- `isSelected: true` (already in where clause as filter, but not returned in select)
- `reviewStatus: true`
- `files` with select: `{ id, url, pathname, contentType, size }` ordered by `createdAt: "asc"`

Update the result mapping to include:
- `notes: s.notes`
- `isSelected: s.isSelected` (already filtered to true, but include for consistency)
- `reviewStatus: s.reviewStatus`
- `files: s.files.map(f => ({ id: f.id, url: f.url, filename: f.pathname.split("/").pop() ?? f.id, contentType: f.contentType, size: f.size }))`

Keep the existing `fileCount: s._count.files` as well for the table column.

Follow the exact same mapping pattern used in `app/api/coordinator/submissions/route.ts` for files (pathname split to get filename).

Update the SubmissionRow type to change `_count: { select: { files: true } }` to include both `_count` and direct `files` select. The `_count.files` remains for the table's file count column.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>curl the API as a manager user and confirm files array, notes, reviewStatus, isSelected are present in response</manual>
  </verify>
  <done>API response for each submission includes files array (with id, url, filename, contentType, size), notes string, reviewStatus string, and isSelected boolean alongside existing fields</done>
</task>

<task type="auto">
  <name>Task 2: Add read-only Sheet slide-over to manager submissions page</name>
  <files>app/(portal)/manager/submissions/page.tsx</files>
  <action>
Add a read-only detail slide-over to the manager submissions page, following the coordinator slide-over pattern but WITHOUT any edit controls.

1. **Update SubmissionRow type** to include the new fields from the expanded API:
   - `notes: string | null`
   - `isSelected: boolean`
   - `reviewStatus: string`
   - `files: Array<{ id: string; url: string; filename: string; contentType: string | null; size: number | null }>`

2. **Add state** for selected submission:
   - `selectedSubmissionId: string | null` (default null)

3. **Make table rows clickable:**
   - Add `cursor-pointer` class and `onClick={() => setSelectedSubmissionId(submission.id)}` to each `<tr>` in the year-grouped tables.

4. **Add imports** for Sheet components:
   ```
   import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
   import { FileIcon } from "lucide-react";
   ```

5. **Add helper functions** (copy from coordinator page pattern):
   - `formatFileSize(bytes: number | null)` — returns human-readable file size
   - `formatRole(role: string | null)` — maps role enum to display name

6. **Add Sheet component** after the closing `</main>` but inside the return, or inside `<main>`. The Sheet should contain:

   **Header (sticky top):**
   - SheetTitle: submission title (or italic "Untitled" fallback)
   - SheetDescription: student name + faculty name

   **Details section:**
   - Submission date: formatted with `format(new Date(value), "dd MMM yyyy, HH:mm")`
   - Review status: Badge with color coding (COMMENTED = emerald, REVIEWING = blue, PENDING = slate) — same pattern as coordinator table
   - Selection status: Badge (Selected = emerald, or dash)

   **Notes section** (only if notes is non-null and non-empty):
   - Label "Notes" with the notes text displayed as read-only paragraph (NOT a textarea, NOT editable)

   **Files section** (if files.length > 0):
   - Section header "Files ({count})"
   - List of file links as `<a>` tags opening in new tab, each showing FileIcon, filename, file size, Download icon — same layout as coordinator slide-over

   **No comment thread, no edit controls, no switches, no save buttons.** This is purely read-only.

7. **Sheet props:**
   - `open={!!selectedSubmissionId}`
   - `onOpenChange={(open) => { if (!open) setSelectedSubmissionId(null); }}`
   - SheetContent: `side="right"` with `className="w-[480px] sm:max-w-[560px] overflow-y-auto p-0"`

8. **Derive selectedSubmission** from submissions array:
   ```
   const selectedSubmission = submissions.find(s => s.id === selectedSubmissionId) ?? null;
   ```

Use Tailwind classes consistent with the coordinator slide-over: `text-slate-*` palette, `border-slate-200`, `bg-slate-50` for file items, etc.

Do NOT add any write functionality — no PATCH calls, no state mutation, no form controls. This is view-only.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Visit /manager/submissions as a marketing manager, click a row, verify slide-over opens with title, student name, faculty, date, files with download links, notes, review status badge, selection badge. Verify no edit controls are present. Close slide-over and verify it closes cleanly.</manual>
  </verify>
  <done>Clicking a submission row opens a right-side Sheet slide-over showing all submission details in read-only format. Files have working download links (open in new tab). No edit controls present. Panel closes on X or clicking outside.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no type errors
2. Manager submissions page loads and displays table as before
3. Clicking any row opens Sheet slide-over from the right
4. Slide-over shows: title, student name, faculty, submission date, review status badge, selection status badge, notes (if present), files list with download links
5. No edit controls visible (no switches, textareas, save buttons)
6. Closing slide-over (X button or overlay click) returns to table
</verification>

<success_criteria>
Marketing managers can click any submission row to view full details in a slide-over panel. All fields (title, student, faculty, date, files, notes, review status, selection status) are displayed read-only. Files have working download links. No edit capability exposed.
</success_criteria>

<output>
After completion, create `.planning/quick/15-marketing-manager-submission-detail-slid/15-SUMMARY.md`
</output>
