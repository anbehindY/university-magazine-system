---
phase: quick-8
plan: 1
subsystem: coordinator-submissions
tags: [review-status, coordinator, prisma, api, ui]
dependency_graph:
  requires: []
  provides: [ReviewStatus enum, reviewStatus field on Submission, review status badges in coordinator UI]
  affects: [coordinator submissions page, coordinator submissions API, comments API]
tech_stack:
  added: []
  patterns: [forward-only state transitions, optimistic UI updates]
key_files:
  created:
    - prisma/migrations/20260304170530_add_review_status/migration.sql
  modified:
    - prisma/schema.prisma
    - app/api/coordinator/submissions/route.ts
    - app/api/coordinator/submissions/[id]/route.ts
    - app/api/comments/route.ts
    - app/(portal)/coordinator/submissions/page.tsx
decisions:
  - Forward-only transitions enforced via numeric ordering (PENDING=0 < REVIEWING=1 < COMMENTED=2)
  - Optimistic UI updates for both REVIEWING and COMMENTED transitions
  - Auto-transition to COMMENTED on any coordinator comment (not just first)
metrics:
  duration: 243s
  completed: 2026-03-04T17:09:03Z
---

# Quick-8 Plan 1: Add Coordinator Review Status to Submissions Summary

ReviewStatus lifecycle (PENDING -> REVIEWING -> COMMENTED) for coordinator submission tracking with forward-only transitions, color-coded badges, and optimistic UI updates.

## What Was Done

### Task 1: Schema + Migration (213c94a)
- Added `ReviewStatus` enum with `PENDING`, `REVIEWING`, `COMMENTED` values to Prisma schema
- Added `reviewStatus` field on `Submission` model defaulting to `PENDING`, mapped to `review_status` column
- Ran migration `20260304170530_add_review_status` and regenerated Prisma client

### Task 2: API Changes (0274a20)
- **GET coordinator submissions**: Added `reviewStatus` to Prisma select and response mapping
- **PATCH coordinator submissions**: Added `reviewStatus` to submission lookup select, body type, and update data. Implemented forward-only transition validation using numeric ordering (PENDING=0, REVIEWING=1, COMMENTED=2). Invalid or backward transitions are silently ignored.
- **POST comments**: Added auto-transition of `reviewStatus` to `COMMENTED` when a `MARKETING_COORDINATOR` posts a comment

### Task 3: UI Changes (8edbd43)
- Added `reviewStatus: string` to `SubmissionRow` type
- Added "Review" column header to both loading skeleton and data table
- Added color-coded review status badges: gray `Pending`, blue `Reviewing`, green `Commented`
- Created `handleOpenPanel` function that auto-transitions PENDING -> REVIEWING via PATCH when opening a submission panel
- Added optimistic update of `reviewStatus` to COMMENTED after posting a comment (also increments `commentCount`)
- Added skeleton cell for new Review column in loading state

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx prisma validate` -- PASSED
- `npx tsc --noEmit` -- PASSED (zero errors)
- All must-have artifacts confirmed present via grep verification

## Self-Check: PASSED

All 7 files verified present. All 3 commit hashes (213c94a, 0274a20, 8edbd43) verified in git log.
