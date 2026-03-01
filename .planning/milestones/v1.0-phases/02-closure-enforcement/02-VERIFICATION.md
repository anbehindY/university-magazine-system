---
phase: 02-closure-enforcement
verified: 2026-02-26T03:08:16Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 2: Closure Enforcement Verification Report

**Phase Goal:** Enforce submission closure rules at the API layer — no new submissions after firstClosureDate, no mutations after finalClosureDate, agreed T&C guard on SUBMITTED transitions, comments locked after finalClosure.
**Verified:** 2026-02-26T03:08:16Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Student creating submission after `firstClosureDate` receives 403; no record created | VERIFIED | `isPastFirstClosure()` called at line 66 of `app/api/submissions/route.ts` POST handler, returns 403 before `prisma.submission.create` at line 86 |
| 2 | Student updating submission after `finalClosureDate` receives 403; record unchanged | VERIFIED | `isPastFinalClosure()` called at line 124 of `app/api/submissions/route.ts` PUT handler before findFirst/update; also guarded in `files/route.ts` POST (line 27), DELETE (line 82), and `upload/route.ts` `onBeforeGenerateToken` (line 36) |
| 3 | Any user POSTing a comment after `finalClosureDate` receives 403 | VERIFIED | `isPastFinalClosure()` called at line 23 of `app/api/comments/route.ts`; returns 403 before any logic |
| 4 | Student transitioning submission to SUBMITTED without `agreed=true` receives 400; status unchanged | VERIFIED | `effectiveAgreed` check at lines 150-156 of `app/api/submissions/route.ts`; evaluates `typeof body.agreed === "boolean" ? body.agreed : existing.agreed`; returns 400 before `prisma.submission.update` |

**Score:** 4/4 ROADMAP success criteria verified

---

### Plan Must-Have Truths

#### Plan 01 Must-Haves (CLOS-01, CLOS-04)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST after firstClosureDate → 403, no record created | VERIFIED | Line 66-71: `isPastFirstClosure()` guard precedes `prisma.submission.create` at line 86 |
| 2 | POST before firstClosureDate → 201, submission carries `academicYearId` and `facultyId` | VERIFIED | `academicYearId: activeYear.id` (line 93), `facultyId: dbUser?.facultyId ?? null` (line 94) in create data block |
| 3 | PUT transitioning to SUBMITTED with `agreed=false` → 400, status unchanged | VERIFIED | Lines 149-157: `effectiveAgreed` check; returns 400 before update |
| 4 | PUT transitioning to SUBMITTED with `agreed=true` → 200, update succeeds | VERIFIED | Guard only fires when `effectiveAgreed` is falsy; truthy path falls through to `prisma.submission.update` |

#### Plan 02 Must-Haves (CLOS-02 — file mutations)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | POST /api/submissions/files after finalClosureDate → 403, no SubmissionFile created | VERIFIED | `isPastFinalClosure()` at line 27 of `files/route.ts`, before `prisma.submissionFile.createMany` at line 52 |
| 6 | DELETE /api/submissions/files after finalClosureDate → 403, no SubmissionFile deleted | VERIFIED | `isPastFinalClosure()` at line 82 of `files/route.ts`, before `prisma.submissionFile.delete` at line 109 |
| 7 | POST /api/submissions/upload after finalClosureDate → 400, no blob token issued | VERIFIED | `isPastFinalClosure()` at line 36 of `upload/route.ts` `onBeforeGenerateToken`; `throw new Error(...)` at line 37; outer catch at line 95 returns `{ error: message }` with status 400 |

#### Plan 03 Must-Haves (CLOS-03 — comments stub)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | POST /api/comments after finalClosureDate → 403 | VERIFIED | `isPastFinalClosure()` at line 23 of `comments/route.ts`; returns 403 with "Comments are locked. The final closure date has passed." |
| 9 | POST /api/comments before finalClosureDate (authenticated) → 501 (route exists, not 404) | VERIFIED | 501 response at lines 30-33 of `comments/route.ts` |

**Score:** 9/9 plan must-have truths verified

---

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `app/api/submissions/route.ts` | POST gate (CLOS-01), PUT gate + agreed guard (CLOS-02 partial, CLOS-04), `academicYearId`/`facultyId` population | Yes | Yes (194 lines, 3 guards) | Yes — imports `isPastFirstClosure`, `isPastFinalClosure`, `getActiveAcademicYear` from `@/lib/closure-guard` | VERIFIED |
| `app/api/submissions/files/route.ts` | POST and DELETE gates (CLOS-02) | Yes | Yes (121 lines, 2 guards) | Yes — imports `isPastFinalClosure` from `@/lib/closure-guard` | VERIFIED |
| `app/api/submissions/upload/route.ts` | `onBeforeGenerateToken` gate (CLOS-02) | Yes | Yes (102 lines, throw in callback) | Yes — imports `isPastFinalClosure` from `@/lib/closure-guard` | VERIFIED |
| `app/api/comments/route.ts` | POST stub with finalClosure gate (CLOS-03) | Yes | Yes (41 lines, auth + gate + 501) | Yes — imports `isPastFinalClosure` from `@/lib/closure-guard` | VERIFIED |
| `lib/closure-guard.ts` | `getActiveAcademicYear`, `isPastFirstClosure`, `isPastFinalClosure` utilities | Yes | Yes (49 lines, 3 substantive functions with DB queries) | Yes — imported by all 4 route files | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Detail |
|------|----|-----|--------|--------|
| `submissions/route.ts` POST | `lib/closure-guard.ts` | `isPastFirstClosure()` import and call | WIRED | Line 4 (import), line 66 (call before create) |
| `submissions/route.ts` POST | `lib/closure-guard.ts` | `getActiveAcademicYear()` import and call | WIRED | Line 3 (import), line 73 (call, result used at lines 93-94) |
| `submissions/route.ts` PUT | `lib/closure-guard.ts` | `isPastFinalClosure()` import and call | WIRED | Line 5 (import), line 124 (call before findFirst/update) |
| `submissions/route.ts` PUT SUBMITTED branch | `existing.agreed` | `body.agreed ?? existing.agreed` pattern | WIRED | Line 150: `typeof body.agreed === "boolean" ? body.agreed : existing.agreed`; `agreed` selected in `findFirst` at line 139 |
| `files/route.ts` POST | `lib/closure-guard.ts` | `isPastFinalClosure()` before `createMany` | WIRED | Line 2 (import), line 27 (call), `createMany` at line 52 |
| `files/route.ts` DELETE | `lib/closure-guard.ts` | `isPastFinalClosure()` before `delete` | WIRED | Line 2 (import), line 82 (call), `delete` at line 109 |
| `upload/route.ts` `onBeforeGenerateToken` | `lib/closure-guard.ts` | `isPastFinalClosure()` throw | WIRED | Line 2 (import), line 36 (call), line 37 (throw), outer catch at line 95 converts to 400 |
| `comments/route.ts` POST | `lib/closure-guard.ts` | `isPastFinalClosure()` before 501 | WIRED | Line 2 (import), line 23 (call before 501 at line 30) |

All 8 key links: WIRED.

---

### Requirements Coverage

| Requirement | Description | Plans | Status | Evidence |
|-------------|-------------|-------|--------|----------|
| CLOS-01 | Student cannot create new submissions after `firstClosureDate` | 02-01 | SATISFIED | `isPastFirstClosure()` guard in POST handler; `academicYearId`/`facultyId` populated on create |
| CLOS-02 | Student cannot update any existing submission after `finalClosureDate` | 02-01 (PUT), 02-02 (files/upload) | SATISFIED | `isPastFinalClosure()` guards in PUT `/api/submissions`, POST/DELETE `/api/submissions/files`, and `onBeforeGenerateToken` in `/api/submissions/upload` |
| CLOS-03 | No new comments can be added after `finalClosureDate` | 02-03 | SATISFIED | `isPastFinalClosure()` guard in POST `/api/comments` stub returns 403; route is reachable (not 404) |
| CLOS-04 | Student must have `agreed = true` before submission transitions to SUBMITTED (API-enforced) | 02-01 | SATISFIED | `effectiveAgreed` check in PUT handler's SUBMITTED branch; uses persisted `agreed` as fallback when body omits field |

All 4 requirements: SATISFIED. No orphaned requirements.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `app/api/comments/route.ts` | Returns 501 for all pre-closure requests | INFO | Intentional stub — Phase 3 will replace the 501 branch. Plan 03 explicitly documents this design. Not a blocker for Phase 2 goals. |

No TODO/FIXME/PLACEHOLDER/HACK comments found in any modified file. No empty implementations or return-null stubs.

---

### Guard Ordering Verification

All handlers follow the documented guard order:

**POST /api/submissions:** auth (401) → `isPastFirstClosure` (403) → `getActiveAcademicYear` (403 if null) → DB user lookup → `prisma.submission.create`

**PUT /api/submissions:** auth (401) → body.id validation (400) → `isPastFinalClosure` (403) → `prisma.submission.findFirst` → not-found check (404) → `nextStatus === "SUBMITTED"` agreed guard (400) → `prisma.submission.update`

**POST /api/submissions/files:** auth (401) → `isPastFinalClosure` (403) → body validation (400) → ownership check → `prisma.submissionFile.createMany`

**DELETE /api/submissions/files:** auth (401) → `isPastFinalClosure` (403) → body.id validation (400) → ownership check → `prisma.submissionFile.delete`

**POST /api/submissions/upload `onBeforeGenerateToken`:** submissionId extraction → `isPastFinalClosure` throw → submissionId validation → path check → ownership check → token return

**POST /api/comments:** auth (401) → `isPastFinalClosure` (403) → 501

---

### Commit Verification

All 5 commits claimed in SUMMARYs verified to exist in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| `6eaed50` | 02-01 Task 1 | feat(02-01): add firstClosure gate and academicYearId/facultyId population to POST handler |
| `ef4ff2f` | 02-01 Task 2 | feat(02-01): add finalClosure gate and agreed guard to PUT handler |
| `90f1569` | 02-02 Task 1 | feat(02-02): add finalClosure gate to POST and DELETE in files/route.ts |
| `7369950` | 02-02 Task 2 | feat(02-02): add finalClosure gate to onBeforeGenerateToken in upload/route.ts |
| `5c51340` | 02-03 Task 1 | feat(02-03): add comments POST stub with finalClosure gate (CLOS-03) |

---

### TypeScript Build

`npx tsc --noEmit` exits 0 with no errors. All modified files type-check cleanly.

---

### Human Verification Required

None. All enforcement logic is verifiable statically: guards are in the correct positions, all return/throw paths produce the correct HTTP status codes, and wiring from route handlers to closure-guard functions is confirmed by import + call-site inspection.

---

### Gaps Summary

No gaps. All 4 ROADMAP success criteria verified. All 9 plan must-have truths verified. All 8 key links wired. All 4 requirements satisfied with evidence.

The one intentional stub — `comments/route.ts` returning 501 for pre-closure requests — is correct per Plan 03's explicit design: Phase 3 replaces the 501 branch with full comment logic. The 403 path (the Phase 2 deliverable for CLOS-03) is fully implemented.

---

_Verified: 2026-02-26T03:08:16Z_
_Verifier: Claude (gsd-verifier)_
