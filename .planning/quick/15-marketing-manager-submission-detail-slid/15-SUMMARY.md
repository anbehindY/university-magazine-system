---
phase: quick-15
plan: 01
subsystem: manager-submissions-ui
tags: [slide-over, read-only, sheet, manager, submissions]
dependency_graph:
  requires: []
  provides: [manager-submission-detail-view]
  affects: [app/(portal)/manager/submissions/page.tsx, app/api/manager/submissions/route.ts]
tech_stack:
  added: []
  patterns: [sheet-slide-over, read-only-detail-panel]
key_files:
  created: []
  modified:
    - app/api/manager/submissions/route.ts
    - app/(portal)/manager/submissions/page.tsx
decisions:
  - "formatRole helper omitted from manager page — no comment thread in read-only view, function would be unused"
  - "Canonical Tailwind classes used: w-120 and sm:max-w-140 instead of arbitrary w-[480px] and sm:max-w-[560px]"
  - "notes section guarded by non-null and non-empty trim check — avoids rendering empty whitespace block"
metrics:
  duration: "~5 minutes"
  completed: "2026-03-05"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 15: Marketing Manager Submission Detail Slide-Over Summary

One-liner: Read-only Sheet slide-over for marketing managers showing full submission details (title, student, faculty, date, review status, selection status, notes, files with download links) on row click.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Expand manager submissions API with files, notes, reviewStatus, isSelected | 79dc592 | app/api/manager/submissions/route.ts |
| 2 | Add read-only Sheet slide-over to manager submissions page | 0a64bc0 | app/(portal)/manager/submissions/page.tsx |

## What Was Built

**API changes (Task 1):**
- Added `files` select to Prisma query with `{ id, url, pathname, contentType, size }` ordered by `createdAt asc`
- Added `notes`, `isSelected`, `reviewStatus` to Prisma select
- Mapped files to `{ id, url, filename, contentType, size }` using `pathname.split("/").pop()` for filename
- Kept `_count.files` as `fileCount` for the existing table column
- Pattern matches coordinator submissions API exactly

**Page changes (Task 2):**
- Updated `SubmissionRow` type to include `files`, `notes`, `isSelected`, `reviewStatus`
- Added `selectedSubmissionId` state (null by default)
- Added `cursor-pointer` class and `onClick={() => setSelectedSubmissionId(submission.id)}` to each `<tr>`
- Added Sheet slide-over with `open={!!selectedSubmissionId}` and close on `onOpenChange`
- Slide-over content: sticky header (title + student/faculty), details section (date, review status badge, selection badge), notes paragraph (guarded by non-empty check), files list with download links
- Imported `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` from `@/components/ui/sheet`
- Imported `FileIcon` from `lucide-react`
- Added `formatFileSize` helper
- No edit controls anywhere — purely read-only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing cleanup] Removed unused `formatRole` helper**
- Found during: Task 2 post-implementation review
- Issue: `formatRole` was copied from coordinator pattern but is only needed for comment thread author labels; manager slide-over has no comment section
- Fix: Removed the function to avoid dead code / lint warnings
- Files modified: app/(portal)/manager/submissions/page.tsx

**2. [Rule 1 - Style] Applied canonical Tailwind classes**
- Found during: Task 2 (IDE diagnostics)
- Issue: `w-[480px]` and `sm:max-w-[560px]` trigger `suggestCanonicalClasses` warnings
- Fix: Replaced with `w-120` and `sm:max-w-140`
- Files modified: app/(portal)/manager/submissions/page.tsx

## Self-Check: PASSED

- FOUND: app/api/manager/submissions/route.ts
- FOUND: app/(portal)/manager/submissions/page.tsx
- FOUND commit 79dc592: feat(quick-15): expand manager submissions API
- FOUND commit 0a64bc0: feat(quick-15): add read-only slide-over to manager submissions page
