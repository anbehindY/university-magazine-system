---
phase: 05-ui-layer
plan: "04"
subsystem: ui
tags: [reports, tabs, statistics, exceptions, sortable-table, color-coding]
dependency_graph:
  requires: ["05-01"]
  provides: ["reports-page-ui"]
  affects: ["app/(management)/reports/page.tsx"]
tech_stack:
  added: []
  patterns:
    - "Tabs component with lazy exception fetch on tab switch"
    - "Client-side sortable table via useState sort column + direction"
    - "Conditional row class based on daysSinceSubmission threshold"
    - "Two-button overdue toggle pattern (active/inactive styling)"
key_files:
  created:
    - "app/(management)/reports/page.tsx"
  modified: []
decisions:
  - "Implemented both Statistics and Exceptions tabs in a single pass — no separate file changes for Task 2"
  - "Exceptions lazy-loaded on first tab switch (not on mount) to avoid unnecessary API call"
  - "Exception rows sorted descending by daysSinceSubmission (most overdue first) as specified"
  - "Overdue toggle refetches with/without ?overdue=true param rather than client-side filter"
metrics:
  duration: "2 min"
  completed: "2026-02-26"
  tasks_completed: 2
  files_created: 1
  files_modified: 0
requirements_satisfied: [GUEST-02]
---

# Phase 5 Plan 04: Reports Page Summary

**One-liner:** Reports page with Statistics/Exceptions tabs, sortable faculty breakdown table, color-coded exception rows (amber/red), and academic year selector.

## What Was Built

A fully functional `/reports` page (`app/(management)/reports/page.tsx`) accessible to coordinator, manager, admin, and guest roles, fulfilling GUEST-02.

### Statistics Tab

- Three summary cards: Total Submissions, Total Contributors, Faculties
- Sortable data table with four columns: Faculty Name, Submissions, % of Total, Contributors
- Click any column header to sort ascending/descending (chevron icons indicate direction)
- Skeleton loading placeholders, inline error message, and empty state
- Fetches from `/api/reports?type=submissions&academicYearId=X`

### Exceptions Tab

- Lazy-loaded on first tab switch (not on mount)
- Two-button toggle: "All Exceptions" vs "Overdue Only (14+ days)"
- Color-coded table rows:
  - `bg-red-50 text-red-900` — 14+ days since submission (overdue)
  - `bg-amber-50 text-amber-900` — under 14 days (no coordinator comment)
- Default sort: `daysSinceSubmission` descending (most overdue first)
- Color legend displayed above the table
- Fetches from `/api/reports?type=exceptions&academicYearId=X[&overdue=true]`
- Empty state: "No exceptions found — all submissions have coordinator comments"

### Academic Year Selector

- Fetches `/api/academic-years` on mount
- Defaults to active year (single-active-year invariant from Phase 1)
- Select component using existing `components/ui/select.tsx`
- Changing selection triggers re-fetch of both statistics and exceptions data

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create reports page with Statistics tab | 95fc3f7 | app/(management)/reports/page.tsx (created) |
| 2 | Add Exceptions tab with color-coded rows | 95fc3f7 | (included in Task 1 commit — same file) |

## Deviations from Plan

### Implementation Approach

Tasks 1 and 2 were implemented in a single pass into one file, resulting in a single commit covering both. This is correct behavior — both tasks modify the same file and the plan was fully satisfied without a separate staged commit for Task 2.

### Auto-fixed Issues

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with zero errors
- `app/(management)/reports/page.tsx` exists at 540 lines (>150 minimum)
- Imports `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- Fetches from `/api/reports?type=submissions` (statistics)
- Fetches from `/api/reports?type=exceptions` (exceptions, with optional `&overdue=true`)
- Fetches from `/api/academic-years` for year selector
- Statistics tab has summary cards using `Card`, `CardHeader`, `CardTitle`, `CardContent`
- Statistics tab has sortable table with `onClick` handlers on `<th>` elements
- Exceptions tab has `bg-red-50` (14+ days) and `bg-amber-50` (under 14 days)
- Exceptions tab has toggle buttons for All vs Overdue Only

## Self-Check: PASSED

- `app/(management)/reports/page.tsx`: FOUND (540 lines)
- Commit 95fc3f7: FOUND
