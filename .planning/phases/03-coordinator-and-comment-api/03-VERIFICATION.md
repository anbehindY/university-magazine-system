---
phase: 03-coordinator-and-comment-api
verified: 2026-02-26T00:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 3: Coordinator and Comment API Verification Report

**Phase Goal:** Coordinators can access only their faculty's submitted work, receive email on new submissions, comment on submissions, and mark selections — all enforced at the API layer with faculty scope
**Verified:** 2026-02-26
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                  | Status     | Evidence                                                                                                         |
|----|--------------------------------------------------------------------------------------------------------|------------|------------------------------------------------------------------------------------------------------------------|
| 1  | Submission model has a nullable title field accessible via Prisma client                               | VERIFIED   | `title String? @db.Text` in schema.prisma line 157; generated model confirms `title: string \| null`            |
| 2  | SubmissionComment model has a nullable parentId field with self-referential relation                    | VERIFIED   | `parentId String? @map("parent_id")`, `parent` and `replies` with `"CommentReplies"` relation in schema line 184-186 |
| 3  | Prisma migration has been applied without errors                                                       | VERIFIED   | Migration `20260226034643_phase3_title_and_parent_id` present; `tsc --noEmit` exits 0                           |
| 4  | Coordinator calling GET /api/coordinator/submissions receives only SUBMITTED submissions from their faculty | VERIFIED   | Query at route.ts line 37-53 filters `status: "SUBMITTED"` AND `facultyId: coordinatorFacultyId`                |
| 5  | Coordinator calling PATCH /api/coordinator/submissions/[id] toggles isSelected or updates notes       | VERIFIED   | `prisma.submission.update` at line 90 with partial `updateData`; both fields handled                            |
| 6  | Cross-faculty coordinator receives 403 on both GET and PATCH                                          | VERIFIED   | GET line 28-33: 403 if no facultyId; PATCH line 61-65: 403 if `submission.facultyId !== coordinatorFacultyId`  |
| 7  | PATCH operations are blocked after finalClosureDate with 403                                          | VERIFIED   | `isPastFinalClosure()` guard at PATCH line 39-43                                                                |
| 8  | Coordinator can POST a comment on a submission in their faculty and it is persisted                    | VERIFIED   | `prisma.submissionComment.create` at comments/route.ts line 110; faculty check at lines 67-77                  |
| 9  | Student can POST a reply (with parentId) on their own submission and it is persisted                  | VERIFIED   | Student path at lines 78-91; ownership check + parentId required                                               |
| 10 | Student without parentId receives 400                                                                 | VERIFIED   | `if (!parentId)` check at line 86 returns 400 "Students can only reply to existing comments"                   |
| 11 | GET /api/comments?submissionId=X returns thread to owner or same-faculty coordinator only             | VERIFIED   | `prisma.submissionComment.findMany` at line 187; coordinator faculty check lines 171-183; owner check line 183  |
| 12 | On first DRAFT-to-SUBMITTED transition, faculty coordinators receive an email; re-submit does not re-trigger | VERIFIED   | `isFirstSubmission = nextStatus === "SUBMITTED" && existing.submittedAt === null` (submissions/route.ts line 188); `sendMail({...}).catch(console.error)` fire-and-forget at lines 211-217 |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact                                              | Provides                                               | Status     | Details                                                                                   |
|-------------------------------------------------------|--------------------------------------------------------|------------|-------------------------------------------------------------------------------------------|
| `prisma/schema.prisma`                                | title on Submission, parentId/parent/replies on SubmissionComment | VERIFIED   | Both fields present; schema is valid; `tsc --noEmit` exits 0                            |
| `prisma/migrations/20260226034643_phase3_title_and_parent_id/` | Migration adding title and parent_id columns      | VERIFIED   | Directory exists; SQL adds `title TEXT` and `parent_id TEXT` with FK `ON DELETE SET NULL` |
| `app/api/coordinator/submissions/route.ts`            | Faculty-scoped coordinator submissions list (GET)      | VERIFIED   | Exports GET; substantive auth/role/faculty/query logic; 75 lines                         |
| `app/api/coordinator/submissions/[id]/route.ts`       | isSelected toggle and notes update (PATCH)            | VERIFIED   | Exports PATCH; full 4-layer guard + ownership + update logic; 105 lines                  |
| `app/api/comments/route.ts`                           | Full comment POST and GET replacing Phase 2 stub       | VERIFIED   | Exports POST and GET; no 501 branch; role-scoped logic; 201 lines                        |
| `app/api/submissions/route.ts`                        | Email trigger added to PUT handler                     | VERIFIED   | Imports `sendMail` at line 7; email block at lines 186-220 within PUT handler            |

---

### Key Link Verification

| From                                               | To                              | Via                                                    | Status   | Details                                                                                          |
|----------------------------------------------------|---------------------------------|--------------------------------------------------------|----------|--------------------------------------------------------------------------------------------------|
| `app/api/coordinator/submissions/route.ts`         | `prisma.submission.findMany`    | Faculty-scoped query with SUBMITTED filter             | WIRED    | Lines 37-53: `where: { status: "SUBMITTED", facultyId: coordinatorFacultyId }`                  |
| `app/api/coordinator/submissions/[id]/route.ts`    | `prisma.submission.update`      | PATCH with faculty ownership check                     | WIRED    | Line 90: `prisma.submission.update` after ownership verified at line 61                         |
| `app/api/coordinator/submissions/[id]/route.ts`    | `isPastFinalClosure`            | Closure gate before any write                          | WIRED    | Import at line 2; called at line 39 before any DB mutation                                      |
| `app/api/comments/route.ts`                        | `prisma.submissionComment.create` | Comment creation with role-based scope enforcement   | WIRED    | Line 110: `prisma.submissionComment.create` after role guards at lines 66-94                    |
| `app/api/comments/route.ts`                        | `prisma.submissionComment.findMany` | Comment retrieval with visibility enforcement       | WIRED    | Line 187: `prisma.submissionComment.findMany` after coordinator/owner check at lines 171-185    |
| `app/api/submissions/route.ts`                     | `sendMail`                      | Fire-and-forget email on first SUBMITTED transition    | WIRED    | Import at line 7; `sendMail({...}).catch(console.error)` (not awaited) at lines 211-217        |
| `app/api/comments/route.ts`                        | `isPastFinalClosure`            | Closure gate preserved from Phase 2 stub               | WIRED    | Import at line 2; called at line 32 — first guard after auth                                   |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                          | Status    | Evidence                                                                                           |
|-------------|-------------|------------------------------------------------------------------------------------------------------|-----------|----------------------------------------------------------------------------------------------------|
| COORD-01    | 03-01, 03-02 | Marketing Coordinator can view only SUBMITTED submissions belonging to students in their faculty     | SATISFIED | GET /api/coordinator/submissions filters by `status: SUBMITTED` and coordinator's `facultyId`     |
| COORD-02    | 03-03       | Marketing Coordinator receives email notification when a student submits (DRAFT → SUBMITTED)         | SATISFIED | `isFirstSubmission` guard + `sendMail` fire-and-forget in PUT handler; deduplication via `submittedAt === null` |
| COORD-03    | 03-02       | Marketing Coordinator can mark/unmark a submission as "Selected for Publication"                     | SATISFIED | PATCH handler accepts `isSelected: boolean` and calls `prisma.submission.update`                  |
| COORD-04    | 03-02       | Marketing Coordinator can edit the notes field on a submission                                       | SATISFIED | PATCH handler accepts `notes` field and updates via `prisma.submission.update`                    |
| COMM-01     | 03-03       | Marketing Coordinator can add a comment to any submission in their faculty                           | SATISFIED | POST /api/comments: coordinator path checks faculty match, then creates comment                   |
| COMM-02     | 03-01, 03-03 | Student can reply to comments on their own submission (two-way thread via parentId)                 | SATISFIED | `parentId` field added to schema; student POST path enforces ownership + parentId required        |
| COMM-03     | 03-03       | Comment thread is visible only to submission owner and their faculty's coordinator(s)                | SATISFIED | GET /api/comments enforces coordinator faculty check or owner identity check before returning      |
| COMM-04     | 03-03       | No new comments can be added after finalClosureDate                                                  | SATISFIED | `isPastFinalClosure()` is the second guard in POST /api/comments, before any role check          |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps COORD-01 through COORD-04 and COMM-01 through COMM-04 all to Phase 3. All 8 appear in plan frontmatter. No orphaned requirements.

---

### Anti-Patterns Found

None. No TODO/FIXME/XXX/PLACEHOLDER comments, no 501 responses, no empty return stubs, no console-log-only handlers in any of the four modified files.

---

### Human Verification Required

#### 1. Email Delivery to Coordinators

**Test:** With valid SMTP credentials configured (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM), transition a student submission from DRAFT to SUBMITTED for the first time.
**Expected:** Coordinator(s) assigned to that student's faculty receive an email with subject "New submission: {title} — {studentName}" and a link to /coordinator/submissions.
**Why human:** Fire-and-forget pattern means the route returns 200 before email completes; email delivery depends on live SMTP configuration which cannot be tested via code inspection.

#### 2. Re-submission Does Not Trigger Second Email

**Test:** With the same submission already SUBMITTED, call PUT again with `status: "SUBMITTED"`.
**Expected:** No additional email is sent.
**Why human:** Deduplication logic (`existing.submittedAt === null`) is code-verified, but confirming the email is truly not sent requires a live SMTP trace.

#### 3. Comment Thread Pagination Absent (Informational)

**Test:** With a submission having many comments, call GET /api/comments?submissionId=X.
**Expected:** All comments returned in a single payload ordered by createdAt ascending.
**Why human:** No pagination is implemented (by design for Phase 3). This is acceptable per scope but should be noted for Phase 4 if comment volume grows.

---

### Gaps Summary

No gaps. All 12 must-have truths verified, all 6 artifacts substantive and wired, all 7 key links confirmed, all 8 required requirements satisfied.

---

## Commit Verification

All commits documented in SUMMARYs confirmed present in git log:

| Commit   | Description                                                    |
|----------|----------------------------------------------------------------|
| a32e188  | feat(03-01): add title to Submission and parentId self-relation |
| bb4edc5  | feat(03-02): create GET /api/coordinator/submissions            |
| 37ec6c9  | feat(03-02): create PATCH /api/coordinator/submissions/[id]    |
| 252c475  | feat(03-03): replace Phase 2 comment stub with full POST/GET   |
| f1960fc  | feat(03-03): add email notification trigger to PUT handler     |

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-verifier)_
