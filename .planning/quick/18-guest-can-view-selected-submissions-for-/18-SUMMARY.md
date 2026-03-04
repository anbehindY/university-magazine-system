---
phase: quick-18
plan: 1
subsystem: guest-portal
tags: [guest, year-selector, api, submissions]
dependency_graph:
  requires: [quick-10, quick-17]
  provides: [year-filtered-guest-submissions]
  affects: [app/(guest)/guest/page.tsx, app/api/guest/submissions/route.ts]
tech_stack:
  added: []
  patterns: [useRef-guard-for-double-fetch, year-aware-api-with-defaults]
key_files:
  created: []
  modified:
    - app/api/guest/submissions/route.ts
    - app/(guest)/guest/page.tsx
decisions:
  - availableYears queried via academicYear.findMany with submissions.some filter — single DB query finds all years with selected submissions for faculty
  - targetYearId falls back to active year then first available then null — graceful degradation with no hardcoded assumptions
  - useRef initialLoadDone prevents double-fetch when selectedYearId is set from initial API response
  - isRefetching derived as loading && availableYears.length > 0 — distinguishes initial skeleton from year-switch overlay
  - submissions query moved after Promise.all to use resolved targetYearId — no sequential DB round-trip on initial load
metrics:
  duration: 10min
  completed: 2026-03-05
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 18: Guest Year Selector for Selected Submissions Summary

**One-liner:** Year-filtered guest API with availableYears response and Select dropdown in hero section, defaulting to active year with opacity overlay on year switch.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add yearId param and availableYears to guest submissions API | bc0f0a4 | app/api/guest/submissions/route.ts |
| 2 | Add year selector dropdown to guest page with year-aware fetching | fbfa228 | app/(guest)/guest/page.tsx |

## What Was Built

### Task 1 — API Changes (app/api/guest/submissions/route.ts)

- Changed signature from `GET()` to `GET(request: NextRequest)` and imported `NextRequest`
- Added `yearId` extraction from `request.nextUrl.searchParams`
- Replaced `activeYear` query with `availableYears` query using `academicYear.findMany` with `submissions.some` filter (only years that have selected submissions for this guest's faculty)
- `targetYearId` resolution: use `yearId` param if valid in `availableYears`, else active year, else first available, else null
- Moved `submissions` findMany after Promise.all, added `academicYearId: targetYearId` to where clause
- Returns `{ submissions, facultyName, academicYearLabel, availableYears, selectedYearId }` — backward-compatible addition of new fields

### Task 2 — UI Changes (app/(guest)/guest/page.tsx)

- Added `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` imports
- Added `availableYears: AvailableYear[]` and `selectedYearId: string` state
- Added `initialLoadDone` useRef flag to prevent double-fetch: first load runs with empty selectedYearId, sets selectedYearId from response, ref prevents re-fetch trigger
- Fetch URL includes `?yearId=${selectedYearId}` when set; `selectedYearId` in useEffect dep array triggers re-fetch on year switch
- Hero section: Select dropdown when `availableYears.length > 1`; static Badge when single year; neither when no year
- Articles grid wrapped with `opacity-50 pointer-events-none` when `isRefetching` (loading after initial load)
- Academic Year stat card subtitle updated from "Current active year" to "Selected year"

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] app/api/guest/submissions/route.ts exists and modified
- [x] app/(guest)/guest/page.tsx exists and modified
- [x] Commit bc0f0a4 exists (Task 1)
- [x] Commit fbfa228 exists (Task 2)
- [x] TypeScript compiles without errors (both tasks verified)
