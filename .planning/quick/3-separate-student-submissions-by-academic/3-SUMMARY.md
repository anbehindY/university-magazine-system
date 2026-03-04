---
phase: quick-3
plan: 01
subsystem: student-portal
tags: [submissions, academic-year, ui, api]
dependency-graph:
  requires: [prisma-schema-academicYear-relation]
  provides: [separated-submission-views]
  affects: [student-submissions-page, submissions-api]
tech-stack:
  added: []
  patterns: [derived-state-filtering, ternary-conditional-render, reduce-grouping]
key-files:
  created: []
  modified:
    - app/api/submissions/route.ts
    - app/(portal)/student/submissions/page.tsx
decisions:
  - "academicYear included via Prisma include select — no extra DB call, passes through ...rest spread in mapped"
  - "currentSubmissions and archivedByYear derived inline (no useMemo) — submissions array is small per-user"
  - "archivedYearLabels sorted descending so most recent past year appears first"
  - "New Submission button hidden (not just disabled) when closureYearLabel=null — avoids misleading UI state"
  - "selectedSubmission lookup remains on full submissions array — comment sheet works for archived cards"
metrics:
  duration: ~15 minutes
  completed: 2026-03-04
  tasks-completed: 2
  files-modified: 2
---

# Quick Task 3: Separate Student Submissions by Academic Year Summary

**One-liner:** Split student submissions page into editable current-year card and read-only archived-years card grouped by yearLabel, with API returning academicYear relation data.

## What Was Built

### Task 1: API — Include academicYear in GET /api/submissions

Added `academicYear: { select: { id: true, yearLabel: true, isActive: true } }` to the Prisma `findMany` include in the GET handler at `app/api/submissions/route.ts`. Since `academicYearId` and `academicYear` are already in the Prisma result, they pass through the `...rest` spread in `mapped` with no additional mapping required.

**Commit:** `fbbac69`

### Task 2: UI — Separate submissions into current and archived sections

Updated `app/(portal)/student/submissions/page.tsx` with six coordinated changes:

**A. Type updates:** Added `academicYearId: string | null` and `academicYear: { id, yearLabel, isActive } | null` to both the `submissions` useState type and the `loadSubmissions` payload type.

**B. Derived state:** Added `currentSubmissions` (filter where `isActive === true`), `archivedByYear` (reduce non-active submissions by yearLabel), `archivedYearLabels` (sorted descending), and `hasArchived` (boolean).

**C. New Submission conditional:** Wrapped the entire `<Dialog>` (including trigger and upload content) in a ternary — when `!closureLoading && closureYearLabel === null`, shows an info Alert ("No active academic year. Submissions are currently closed.") instead. The Dialog only renders when there is an active year.

**D. Main card rename:** Changed card title from "Your submissions" to "Current Year". Changed empty state text to "No submissions for the current academic year." Map now iterates `currentSubmissions` instead of `submissions`. Edit, Delete, and Comments buttons preserved.

**E. Previous Submissions card:** Added below the main Card, guarded by `hasArchived && !submissionsLoading`. Groups archived submissions by `yearLabel` with a `<h3>` subheading per group. Each archived submission card shows only the Comments button (no Edit, no Delete). Same card styling as current submissions for visual consistency.

**F. selectedSubmission lookup:** Verified it still searches the full `submissions` state — comment Sheet works correctly from both current and archived cards.

**Commit:** `4b6254b`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unicode curly quotes introduced during edit**
- **Found during:** Task 2 verification (TypeScript compile)
- **Issue:** The Edit tool introduced Unicode left/right double-quote characters (`\u201C` `\u201D`) in className attributes on lines 1150 and 1156, causing TypeScript JSX parser to fail with "Invalid character" errors
- **Fix:** Used `sed` to replace all UTF-8 curly quote bytes (`\xe2\x80\x9c` / `\xe2\x80\x9d`) with ASCII straight quotes `"`
- **Files modified:** `app/(portal)/student/submissions/page.tsx`
- **Commit:** Included in task 2 commit `4b6254b`

## Verification

- TypeScript: `npx tsc --noEmit` — clean, no errors
- API: GET /api/submissions now includes `academicYear` relation with `id`, `yearLabel`, `isActive`
- UI: Main card shows current-year submissions with Edit/Delete/Comments
- UI: Previous Submissions card shows archived submissions grouped by year, Comments only
- UI: New Submission button/dialog hidden with info message when `closureYearLabel === null`
- Comment Sheet: Works from both current and archived submission cards

## Self-Check: PASSED

Files exist:
- `app/api/submissions/route.ts` — FOUND (modified)
- `app/(portal)/student/submissions/page.tsx` — FOUND (modified)

Commits exist:
- `fbbac69` — FOUND (feat: API academicYear include)
- `4b6254b` — FOUND (feat: UI separation)
