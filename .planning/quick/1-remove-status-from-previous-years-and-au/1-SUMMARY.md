---
phase: quick
plan: 1
subsystem: admin-closure-dates
tags: [ui, ux, academic-year, auto-deactivation]
dependency_graph:
  requires: []
  provides: [clean-previous-years-table, auto-deactivation-lifecycle]
  affects: [app/(portal)/admin/closure-dates/page.tsx]
tech_stack:
  added: []
  patterns: [useRef-guard-pattern, silent-fail-fetch]
key_files:
  created: []
  modified:
    - app/(portal)/admin/closure-dates/page.tsx
decisions:
  - "useRef hasAutoDeactivated guard prevents re-triggering after first deactivation call; separate useEffect resets guard on activeYear.id change so new active years get a fresh deactivation check"
  - "Silent failure on auto-deactivation (console.error only) — admin can still manually manage; avoids surfacing confusing UI errors on page load"
  - "Badge import retained (still used for Active badge on Current Academic Year card); isPastYear retained (used in auto-deactivation guard)"
metrics:
  duration: "< 10 minutes"
  completed: 2026-03-04
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 1: Remove Status Column from Previous Years and Add Auto-Deactivation — Summary

**One-liner:** Cleaned Previous Years table to show Year/First Closure/Final Closure only; added useRef-guarded auto-deactivation PATCH on page load when active year's final closure date has passed.

## What Was Built

Three targeted changes to `app/(portal)/admin/closure-dates/page.tsx`:

**1. Desktop table — Status column removed**
- Removed `<th className="px-4 py-3">Status</th>` header
- Removed `const past = isPastYear(item)` and the entire Status `<td>` containing Past/Upcoming badges from the tbody map
- Table now renders exactly 3 columns: Year, First Closure, Final Closure

**2. Mobile cards — Badges removed**
- Removed `const past = isPastYear(item)` from the mobile card map
- Removed the `flex items-center justify-between` wrapper and both badge variants
- Card header is now just `<p className="text-base font-semibold text-slate-900">{item.yearLabel}</p>`

**3. Auto-deactivation useEffect added**
- Added `useRef<boolean>` (`hasAutoDeactivated`) initialized to `false`
- Primary useEffect depends on `[activeYear?.id, activeYear?.finalClosureDate]`
- Guards: skips if no activeYear, if `isPastYear(activeYear)` is false, or if ref is already `true`
- Calls `PATCH /api/admin/academic-years` with `{ id: activeYear.id, isActive: false }` on success calls `loadHistory()` to refresh; on error logs to console
- Secondary useEffect depends on `[activeYear?.id]` only — resets the ref to `false` so a newly activated year gets a fresh deactivation check

## Verification

- TypeScript: `npx tsc --noEmit` passes with no errors
- Badge import retained and used on line 272 (Active badge for Current Academic Year card)
- isPastYear function retained and used in auto-deactivation guard
- No Status `<th>` or `<td>` in desktop table
- No Badge in mobile card rendering for otherYears

## Deviations from Plan

None — plan executed exactly as written. Added `useRef` import alongside existing `useEffect` and `useState` as required by the auto-deactivation implementation.

## Self-Check

- [x] `app/(portal)/admin/closure-dates/page.tsx` — FOUND (committed 2aa30cc)
- [x] TypeScript compiles without errors
- [x] Badge import present (line 4)
- [x] isPastYear function present (line 42)
- [x] No Status th/td in table
- [x] No Badge in mobile cards for otherYears

## Self-Check: PASSED
