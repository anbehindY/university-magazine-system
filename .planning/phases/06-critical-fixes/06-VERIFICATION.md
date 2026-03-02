---
phase: 06-critical-fixes
verified: 2026-03-02T15:30:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Before finalClosureDate — navigate to /manager/submissions as a Marketing Manager and observe Download ZIP buttons"
    expected: "Each Download ZIP button is disabled; hovering (or focusing) the button reveals a Tooltip reading 'Available after DD MMM YYYY'"
    why_human: "Client-side date derivation (Date.now() > new Date(finalClosureDate).getTime()) and Tooltip display require browser interaction to confirm"
  - test: "After finalClosureDate — click Download ZIP button for a year that has selected submissions"
    expected: "A ZIP file is downloaded; API returns 200 with streaming content, no 403"
    why_human: "Date-gated behaviour requires a real or mocked time context; cannot be confirmed statically"
  - test: "Create a submission with a title as a Student, then trigger SUBMITTED status"
    expected: "Coordinator receives an email whose subject line reads 'New submission: <title> — <student name>' rather than 'New submission: Untitled — <student name>'"
    why_human: "SMTP email delivery and subject-line content require a live mailer environment to confirm"
---

# Phase 06: Critical Fixes Verification Report

**Phase Goal:** Fix ZIP download closure gate (MGR-02) and add submission title field (COORD-02) so managers can only download after final closure and coordinator emails show meaningful submission names
**Verified:** 2026-03-02T15:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| MGR-02 | 06-01-PLAN.md | Marketing Manager can download ZIP only after `finalClosureDate` — organised Faculty > Student > files | SATISFIED | `isPastFinalClosure()` gate at line 29 of download/route.ts; disabled button + Tooltip in manager page |
| COORD-02 | 06-02-PLAN.md | Coordinator email notification subject includes student-provided title (not "Untitled") | SATISFIED | `title: body.title ?? null` in prisma.create (line 92, submissions/route.ts); title input in student form (line 786); email subject uses `updatedSubmission.title ?? "Untitled"` (line 213) |

No orphaned requirements — both IDs declared in plan frontmatter match the phase goal and appear in v1.0-REQUIREMENTS.md.

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A Marketing Manager calling GET /api/manager/submissions/download BEFORE finalClosureDate receives a 403 response | VERIFIED | `if (!(await isPastFinalClosure()))` guard at line 29 of `app/api/manager/submissions/download/route.ts` returns `{ status: 403 }` with message "ZIP download is only available after the final closure date." |
| 2 | The manager UI Download ZIP button is disabled before finalClosureDate with a Tooltip explaining why | VERIFIED | `disabled={!isPastFinalClosure \|\| downloadingYearId !== null}` on Button (line 323 of manager page); `TooltipContent` renders "Available after DD MMM YYYY" when `!isPastFinalClosure` (line 341–347) |
| 3 | After finalClosureDate the Download ZIP button is enabled and functions normally | VERIFIED (automated) | When `isPastFinalClosure` is true the `disabled` prop becomes `downloadingYearId !== null` only, restoring normal behaviour; download logic unchanged; NEEDS HUMAN to confirm at runtime |
| 4 | A student can enter a title when creating or editing a submission and the title is persisted to the database | VERIFIED | `title` state + `Input` UI at line 784–793; `title: title \|\| null` in `saveDraftToDb` fetch body (line 306); `prisma.submission.create({ data: { title: body.title ?? null } })` at line 92 in submissions/route.ts |
| 5 | When a coordinator receives an email for a new submission the subject line includes the student-provided title | VERIFIED (wiring complete) | PUT handler re-fetches `updatedSubmission.title`, uses `submissionTitle ?? "Untitled"` in `subject: "New submission: ${submissionTitle} — ${studentName}"` (lines 197–220); now fed with real title from DB; NEEDS HUMAN to confirm email delivery |
| 6 | Editing an existing submission restores the previously saved title in the input field | VERIFIED | `startEditSubmission()` at line 204 calls `setTitle(submission.title ?? "")` (line 215) |
| 7 | Draft title is preserved in localStorage and restored on page reload | VERIFIED | localStorage save includes `title` in JSON at line 354; `useEffect` restore reads `parsed.title ?? ""` and calls `setTitle` at line 132 |

**Score: 7/7 truths verified**

---

## Required Artifacts

### Plan 01 (MGR-02) Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/manager/submissions/download/route.ts` | Inverted closure gate blocking pre-deadline ZIP downloads | VERIFIED | Contains `isPastFinalClosure` import (line 2) and guarded return at line 29–34 with comment "Inverted closure gate: block downloads BEFORE finalClosureDate (MGR-02)" |
| `app/api/manager/submissions/route.ts` | `finalClosureDate` field in GET response payload | VERIFIED | `prisma.academicYear.findFirst` for `finalClosureDate` inside `Promise.all` (lines 50–53); returned at line 85 as `finalClosureDate: activeYear?.finalClosureDate ?? null` |
| `app/(management)/manager/submissions/page.tsx` | Disabled button state + Tooltip showing closure date | VERIFIED | Tooltip imports at lines 19–23; `finalClosureDate` state at line 54; `isPastFinalClosure` derived at lines 57–59; `TooltipContent` at lines 341–347 |

### Plan 02 (COORD-02) Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/submissions/route.ts` | `SubmissionPayload` type with `title` field; title wired to prisma create and update | VERIFIED | `title?: string \| null` in `SubmissionPayload` type (line 15); `title: body.title ?? null` in `prisma.submission.create` (line 92); `if (body.title !== undefined) { updateData.title = body.title ?? null; }` in PUT (lines 180–182) |
| `app/(student)/submissions/page.tsx` | Title input field in form with state, localStorage persistence, edit restoration | VERIFIED | `const [title, setTitle] = useState("")` (line 48); `Input` rendered at lines 784–793; `setTitle(parsed.title ?? "")` in localStorage useEffect (line 132); `setTitle(submission.title ?? "")` in `startEditSubmission` (line 215); `setTitle("")` in `resetSubmissionForm` (line 191) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/manager/submissions/download/route.ts` | `lib/closure-guard.ts` | `isPastFinalClosure()` import and inverted check | WIRED | Import at line 2; pattern `!(await isPastFinalClosure())` at line 29 confirmed |
| `app/(management)/manager/submissions/page.tsx` | `app/api/manager/submissions/route.ts` | `finalClosureDate` read from fetch response | WIRED | `data.finalClosureDate !== undefined` check at line 122; `setFinalClosureDate(data.finalClosureDate)` wired; API returns `finalClosureDate` at line 85 |
| `app/(student)/submissions/page.tsx` | `app/api/submissions/route.ts` | `title` field sent in POST/PUT fetch body | WIRED | `title: title \|\| null` in `JSON.stringify` body at line 306; `SubmissionPayload` type accepts it at line 15 |
| `app/api/submissions/route.ts` | `prisma.submission.create` | `body.title` passed to prisma create data | WIRED | `title: body.title ?? null` at line 92 inside `data:` object of `prisma.submission.create` call |

---

## Commit Verification

All four task commits from SUMMARY files exist in the git history:

| Commit | Description |
|--------|-------------|
| `7a476f8` | feat(06-01): add closure gate to ZIP download route and expose finalClosureDate in manager submissions API |
| `dbf8e31` | feat(06-01): disable Download ZIP button before finalClosureDate with Tooltip |
| `8e1d369` | feat(06-02): add title to SubmissionPayload type and wire to Prisma create/update |
| `b633e27` | feat(06-02): add title input to student submission form with state, localStorage, and edit restoration |

---

## Anti-Patterns Scan

Files reviewed: `app/api/manager/submissions/download/route.ts`, `app/api/manager/submissions/route.ts`, `app/(management)/manager/submissions/page.tsx`, `app/api/submissions/route.ts`, `app/(student)/submissions/page.tsx`

No blocker anti-patterns found. No placeholder returns, no TODO/FIXME stubs in the modified sections, no console-log-only implementations.

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `app/(management)/manager/submissions/page.tsx` | `isPastFinalClosure` is `false` when `finalClosureDate` is `null` (buttons always disabled if no active year) | Info | Intentional safe default — no active year means no closure date is known; buttons are correctly blocked |
| `app/api/submissions/route.ts` | `sendMail(...)` is fire-and-forget with `.catch(console.error)` | Info | Pre-existing intentional decision documented in Phase 3; not introduced in Phase 6 |

---

## Human Verification Required

### 1. Download ZIP button Tooltip before finalClosureDate

**Test:** Log in as a Marketing Manager. Navigate to `/manager/submissions`. If the active academic year's `finalClosureDate` is in the future (or is null), hover or keyboard-focus the Download ZIP button.
**Expected:** Button is visually disabled; a Tooltip appears reading "Available after DD MMM YYYY" (or "Available after the final closure date" if date is null).
**Why human:** Tooltip visibility depends on browser mouse/focus events and Radix UI Tooltip component behaviour — cannot be confirmed from static code analysis.

### 2. Download ZIP succeeds after finalClosureDate

**Test:** Set `finalClosureDate` to a past date for the active academic year (via admin UI or direct DB update). Navigate to `/manager/submissions` and click Download ZIP.
**Expected:** A `.zip` file downloads; no error toast; API returns 200.
**Why human:** Date-gated logic requires a controlled time context or data setup; static analysis confirms the gate is inverted correctly but not that the download pipeline functions end-to-end.

### 3. Coordinator email subject includes student-provided title

**Test:** As a Student, open the submission form, enter a title (e.g. "My Article"), agree to terms, and click Submit. Check the coordinator's inbox.
**Expected:** Email subject reads "New submission: My Article — Student Name" (not "New submission: Untitled — Student Name").
**Why human:** SMTP delivery and subject-line content require a live mailer environment (Mailpit or production SMTP).

---

## Gaps Summary

No gaps found. Both requirements are fully implemented and wired end-to-end:

- **MGR-02:** The ZIP download API route correctly calls `isPastFinalClosure()` and returns 403 before the final closure date. The manager submissions API exposes `finalClosureDate` in its response. The manager UI derives `isPastFinalClosure` client-side from that date and disables the Download ZIP button with a Tooltip showing the formatted date.

- **COORD-02:** The `SubmissionPayload` type now includes `title`. The POST handler persists `title` to the database via `prisma.submission.create`. The PUT handler conditionally updates `title` via `updateData`. The student form renders a controlled `Input` for title, saves it to localStorage, restores it on page reload, pre-populates it when editing an existing submission, and clears it on form reset. The email notification path in the PUT handler already read `submission.title` — it now receives real student-provided values instead of always getting `null`/`"Untitled"`.

Three items flagged for human verification are behavioural confirmations, not gaps — all automated evidence is present and wired.

---

_Verified: 2026-03-02T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
