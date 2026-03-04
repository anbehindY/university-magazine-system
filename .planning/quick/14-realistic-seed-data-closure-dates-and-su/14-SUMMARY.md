---
phase: quick-14
plan: 14
subsystem: seed-data
tags: [seed, academic-years, data-cleanup]
dependency_graph:
  requires: []
  provides: [realistic-seed-data]
  affects: [prisma/seed.ts]
tech_stack:
  added: []
  patterns: [idempotent-upsert-seeding]
key_files:
  created: []
  modified:
    - prisma/seed.ts
decisions:
  - "Kept randomDate helper — still used by 2024-2025 submission seeding block"
  - "2025-2026 year definition kept in academicYears array so admin can activate via Closure Dates page"
  - "Section numbers renumbered: old Section 8 became Section 7, old Section 9 removed, Summary moved to Section 8"
metrics:
  duration: "2 minutes"
  completed: "2026-03-05"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 14: Realistic Seed Data — Closure Dates and Clean Current Year Summary

Removed 2023-2024 academic year entirely and stripped all 2025-2026 submission seeding so the current year starts as a clean slate for demo users.

## What Was Done

### Task 1: Remove 2023-2024 year and current year submissions from seed data

- Removed 2023-2024 from the `academicYears` array (lines 324-331 in original)
- Deleted entire Section 7 (2023-2024 submission seeding loop) — ~57 lines removed
- Deleted entire Section 9 (2025-2026 submission seeding loop) — ~99 lines removed
- Removed `prevCount2`, `y2526`, `submissionWindow2526` variables (were only used in the removed section)
- Updated all console.log references from "3 academic years" to "2 academic years"
- Renumbered summary section from 9 to 8
- Kept `randomDate` helper — still referenced by the 2024-2025 submission loop

## Verification Results

- `grep "2023-2024" prisma/seed.ts` — 0 matches
- `grep "prevCount2" prisma/seed.ts` — 0 matches
- `grep "2025-2026" prisma/seed.ts` — 2 matches: academicYears array definition only + comment template string
- `npx tsc --noEmit prisma/seed.ts` — 0 errors in seed.ts (only pre-existing node_modules type issues unrelated to seed)

## Seed State After This Change

| Academic Year | isActive | Has Submissions | firstClosureDate | finalClosureDate |
|---------------|----------|-----------------|------------------|------------------|
| 2024-2025 | false | Yes (~70% of students) | 2025-03-15 | 2025-04-15 |
| 2025-2026 | false | No (clean slate) | 2026-03-15 | 2026-04-15 |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 47e5c0d | chore(quick-14): remove 2023-2024 year and 2025-2026 submissions from seed |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `prisma/seed.ts` exists and modified: FOUND
- Commit 47e5c0d exists: FOUND
- 2023-2024 removed: VERIFIED (0 grep matches)
- prevCount2 removed: VERIFIED (0 grep matches)
- 2025-2026 only in academicYears definition: VERIFIED
