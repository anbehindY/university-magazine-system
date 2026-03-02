---
phase: 06-critical-fixes
verified: 2026-03-03T12:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: true
previous_status: passed
previous_score: 7/7
previous_note: "Previous VERIFICATION.md was written before the UAT session (2026-03-02T15:30:00Z). UAT revealed 3 major and 4 minor issues. Gap closure plans 03-05 were executed to address them. This document supersedes the pre-UAT report."
gaps_closed:
  - "Marketing Manager ZIP download ungated — closure gate removed from API route and UI button"
  - "Title input is the first required field in the student submission form"
  - "Title persists via DB draft saves only, not localStorage"
  - "Closure date Alert has Info icon and blue visual distinction"
  - "Edit form separates previously uploaded files from new file selection — no duplication"
  - "API validates title is present when submitting (not on drafts)"
  - "Submission notification email reaches every coordinator in the student's faculty (confirmed via findMany)"
gaps_remaining: []
regressions: []
human_verification:
  - test: "Submit a submission with a title as a Student and check coordinator inbox"
    expected: "Email subject reads 'New submission: <title> — <student name>'; email arrives at EVERY coordinator in the student's faculty"
    why_human: "SMTP delivery and multi-recipient behaviour require a live mailer environment (Mailpit or production SMTP)"
  - test: "Open the student submission form and verify the Info icon and blue Alert for closure date"
    expected: "A blue info Alert with an Info (i) icon appears before the title input. When closure is past, it switches to the red destructive variant."
    why_human: "Visual style and icon rendering require browser inspection"
  - test: "Edit an existing submission — verify previously uploaded files appear separately from new file selection"
    expected: "'Previously uploaded files' section shows existing files with Download/Delete links. Selecting new files shows a separate 'New files to upload' section. No duplication."
    why_human: "UI state interactions (startEditSubmission, file selection) require browser interaction to confirm"
---

# Phase 06: Critical Fixes Verification Report

**Phase Goal:** Fix ZIP download closure gate (MGR-02) and add submission title field (COORD-02) so managers can only download after final closure and coordinator emails show meaningful submission names
**Verified:** 2026-03-03T12:00:00Z
**Status:** PASSED
**Re-verification:** Yes — after UAT session (2026-03-02) and gap closure plans 03-05 (2026-03-03)

**Note on Goal Evolution:** The original goal text says "managers can only download after final closure." UAT revealed the user explicitly rejected the date gate: "I want the marketing manager to be able to download the zip any time." The ROADMAP success criteria were updated to reflect this. The MGR-02 requirement in v1.0-REQUIREMENTS.md still carries the original wording ("available only after finalClosureDate") but the ROADMAP — as the living contract — supersedes it. This verification checks against the updated ROADMAP success criteria.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| MGR-02 | 06-01-PLAN.md, 06-03-PLAN.md | Marketing Manager ZIP download — originally date-gated, user-revised to always available | SATISFIED (revised) | Download route has auth + role guards only (no `isPastFinalClosure` import or call in `download/route.ts`); manager page button `disabled={downloadingYearId !== null}` only — no date check, no Tooltip wrapper (confirmed at lines 303–320 of manager page) |
| COORD-02 | 06-02-PLAN.md, 06-04-PLAN.md, 06-05-PLAN.md | Coordinator email subject includes student-provided title; title is required first field | SATISFIED | `title?: string \| null` in `SubmissionPayload` (line 15, submissions/route.ts); `title: body.title ?? null` in `prisma.submission.create` (line 99); `updateData.title` set conditionally in PUT (line 195); title input is first form field after closure alerts (line 671–681 of student page); `required` attribute present; `!title.trim()` guard in `onSubmit` (line 415); title NOT in localStorage read/write; `sendMail` called with `to: emails` array from `findMany` (line 234); email subject `"New submission: ${submissionTitle} — ${studentName}"` (line 235) |

No orphaned requirements — both IDs declared in plan frontmatter match the phase goal and appear in v1.0-REQUIREMENTS.md. The MGR-02 requirement description carries legacy wording but the evolved implementation is confirmed by the user-approved ROADMAP success criteria.

---

## Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A Marketing Manager can download ZIP at any time without date restriction | VERIFIED | `app/api/manager/submissions/download/route.ts`: no `isPastFinalClosure` import, no closure guard — proceeds from role check directly to archiver logic. Confirmed by grep: zero matches for `isPastFinalClosure` or `closure-guard` in the file. Commits `a22446c` (API) and `58abe2b` (UI) in git history. |
| 2 | A student can enter a required title as the first field in the submission form | VERIFIED | Line 671–681 of `app/(student)/submissions/page.tsx`: `<div className="space-y-1">` with `<Label htmlFor="submission-title">Title</Label>` and `<Input id="submission-title" ... required />` appears immediately after closure Alert blocks and before the file upload `<label>` (line 685). Placeholder is "Give your submission a title" (no "(optional)"). |
| 3 | Title persists via DB draft saves only (no localStorage) | VERIFIED | localStorage `useEffect` reads `parsed.agreed`, `parsed.notes`, `parsed.fileNames`, `parsed.savedAt`, `parsed.submissionId` — no `setTitle` call (line 120–140). `localStorage.setItem` in `onSaveDraft` writes `{ agreed, notes, fileNames, savedAt, submissionId }` — no `title` key (lines 345–354). `saveDraftToDb` body still includes `title: title \|\| null` (line 301) so title persists to DB. |
| 4 | Closure date info has an info icon and visual distinction | VERIFIED (automated) | Line 651–668: `<Alert className="border-blue-200 bg-blue-50 text-blue-900">` with `<Info className="h-4 w-4" />` as first child. `Info` imported from `lucide-react` (line 5). Blue styling applied when `!isClosed`; destructive variant when closed. Needs human to confirm visual appearance. |
| 5 | Edit form separates existing files from new file selection cleanly | VERIFIED (automated) | `startEditSubmission` sets `setUploadedBlobs([])` (line 228) — no longer seeds from existing files. Three separate sections at lines 720–811: "Previously uploaded files" (`editingFiles.length > 0`), "New files to upload" (`files.length > 0`), "Draft files" fallback (`!editingSubmissionId && files.length === 0 && draftFileNames.length > 0`). Commit `07fcfa0` in git history. Needs human to confirm in browser. |
| 6 | API validates title is present on submission (not drafts) | VERIFIED | POST handler: `if (body.status === "SUBMITTED" && !body.title?.trim())` returns 400 at line 83–88. PUT handler: `if (!body.title?.trim())` inside `if (nextStatus === "SUBMITTED")` block at lines 168–173. Neither check fires for DRAFT saves. |
| 7 | Submission notification email reaches every coordinator in the student's faculty | VERIFIED | Lines 217–225: `prisma.user.findMany({ where: { role: "MARKETING_COORDINATOR", facultyId: updatedSubmission.facultyId } })` returns all coordinators; `emails = coordinators.map((c) => c.email)` builds array; `sendMail({ to: emails, ... })` at line 233–239 passes array. Comment at line 217 reads "Notify ALL coordinators in the student's faculty (not just one)". Needs human to confirm delivery in live environment. |

**Score: 7/7 truths verified**

---

## Required Artifacts

### Plan 01 + 03 (MGR-02) Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/manager/submissions/download/route.ts` | ZIP download route without closure gate (auth + role only) | VERIFIED | File is 158 lines. No `isPastFinalClosure` import. No closure guard block. After role check at line 20-25, handler proceeds directly to `try { ... }` with archiver logic. |
| `app/api/manager/submissions/route.ts` | `finalClosureDate` field in GET response payload | VERIFIED | `prisma.academicYear.findFirst({ where: { isActive: true }, select: { finalClosureDate: true } })` at lines 50-53; returned at line 85 as `finalClosureDate: activeYear?.finalClosureDate ?? null`. Harmless — UI no longer reads it for gating. |
| `app/(management)/manager/submissions/page.tsx` | Always-enabled Download ZIP button (disabled only during active download) | VERIFIED | Line 303-320: plain `<Button disabled={downloadingYearId !== null}>`. No Tooltip imports, no `finalClosureDate` state, no `isPastFinalClosure` variable — zero grep matches for any of these in the file. |

### Plan 02 + 04 + 05 (COORD-02) Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/submissions/route.ts` | `SubmissionPayload` with `title`; title in create/update; title validation on SUBMITTED; all-coordinator email | VERIFIED | `title?: string \| null` at line 15; `title: body.title ?? null` at line 99; `updateData.title` at lines 194-196; POST title check at lines 83-88; PUT title check at lines 168-173; `findMany` for all coordinators at lines 217-225; `sendMail({ to: emails })` at line 233. |
| `app/(student)/submissions/page.tsx` | Title as first required input; no localStorage for title; Info Alert; separate file sections | VERIFIED | `const [title, setTitle] = useState("")` at line 49; title `<Input required>` at lines 671-681 (before file upload at line 685); localStorage useEffect reads no `title` (lines 120-140); localStorage write excludes `title` (lines 345-354); `<Info className="h-4 w-4" />` at line 655; `<Alert className="border-blue-200 bg-blue-50">` at line 651; three-section file display at lines 720-811; `setUploadedBlobs([])` in `startEditSubmission` at line 228. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(management)/manager/submissions/page.tsx` | `/api/manager/submissions/download` | `fetch` in `handleDownloadZip` | WIRED | `fetch(url)` at line 161; URL pattern includes `/api/manager/submissions/download`; no closure gate on either side |
| `app/(student)/submissions/page.tsx` | `/api/submissions` | `title: title \|\| null` in `saveDraftToDb` body | WIRED | `JSON.stringify({ ..., title: title \|\| null, ... })` at line 301; `SubmissionPayload` accepts `title` at line 15 |
| `app/api/submissions/route.ts` | `prisma.submission.create` | `body.title` passed to create data | WIRED | `title: body.title ?? null` at line 99 inside `data:` object |
| `app/api/submissions/route.ts` | `sendMail` | `to: emails` array from `findMany` | WIRED | `emails = coordinators.map((c) => c.email)` at line 227; `sendMail({ to: emails })` at line 233 |
| `app/(student)/submissions/page.tsx` | `startEditSubmission` | `setTitle(submission.title ?? "")` | WIRED | Line 215: `setTitle(submission.title ?? "")` in `startEditSubmission`; `setUploadedBlobs([])` at line 228 confirms de-duplication fix |

---

## Commit Verification

All six gap closure commits from SUMMARY files verified in git history:

| Commit | Plan | Description |
|--------|------|-------------|
| `7a476f8` | 06-01 | feat: add closure gate to ZIP download route (later reversed) |
| `dbf8e31` | 06-01 | feat: disable Download ZIP button before finalClosureDate (later reversed) |
| `8e1d369` | 06-02 | feat: add title to SubmissionPayload type and wire to Prisma |
| `b633e27` | 06-02 | feat: add title input to student submission form |
| `a22446c` | 06-03 | fix: remove closure gate from ZIP download API route |
| `58abe2b` | 06-03 | fix: remove Tooltip gate and closure disabled state from Download ZIP button |
| `782a1e7` | 06-04 | feat: move title to first field, make required, remove localStorage |
| `cf049ea` | 06-04 | feat: add info icon and visual distinction to closure date Alert |
| `07fcfa0` | 06-05 | fix: fix edit mode file sections to eliminate duplication |
| `0582886` | 06-05 | feat: add API title validation on submission and confirm coordinator email |

---

## Anti-Patterns Scan

Files reviewed: `app/api/manager/submissions/download/route.ts`, `app/api/manager/submissions/route.ts`, `app/(management)/manager/submissions/page.tsx`, `app/api/submissions/route.ts`, `app/(student)/submissions/page.tsx`

No blocker anti-patterns found.

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `app/api/submissions/route.ts` | `sendMail(...)` is fire-and-forget with `.catch(console.error)` | Info | Pre-existing intentional decision documented in Phase 3; not introduced in Phase 6. SMTP failures are logged but not surfaced to the user — consistent with the existing pattern. |
| `app/(student)/submissions/page.tsx` | `uploadedBlobs` section (lines 844-857) shows post-upload blobs; in edit mode `uploadedBlobs` starts empty so section is hidden until new files are uploaded | Info | Correct behaviour — this is intentional. Newly uploaded blobs are appended; existing files are in `editingFiles`. No duplication. |
| `app/api/submissions/route.ts` | Title validation in PUT is inside the `if (nextStatus === "SUBMITTED")` block, which means the explicit `if (!body.title?.trim())` at line 168 runs after the `effectiveAgreed` check at line 160 | Info | Order is correct: agreed check runs first, then title check. Both are inside the `SUBMITTED` guard. No issue. |

---

## Human Verification Required

### 1. Coordinator email delivery and subject line

**Test:** As a Student, open the submission form, enter a title (e.g. "Climate Change Essay"), attach a file, agree to T&C, and click Submit. Check the coordinator inbox for the student's faculty.
**Expected:** Email subject reads "New submission: Climate Change Essay — Student Name". Email arrives for EVERY coordinator assigned to that faculty (not just one).
**Why human:** SMTP delivery and multi-recipient routing require a live mailer environment (Mailpit or production SMTP).

### 2. Info icon and blue Alert visual appearance

**Test:** Open the student submission form as a Student. Observe the Alert block before the Title input.
**Expected:** A blue info Alert (border-blue-200, bg-blue-50) with an Info (i) icon appears on the left. When the final closure date has passed, it switches to a red destructive variant.
**Why human:** Visual style and icon rendering require browser inspection to confirm correct Radix/shadcn Alert layout with the icon.

### 3. Edit mode file section separation

**Test:** As a Student, edit an existing submission that has at least one uploaded file. Select one or more new files to add.
**Expected:** Two distinct sections appear: "Previously uploaded files" showing existing files with Download and Delete links; "New files to upload" showing the newly selected files with a Remove button. The sections are separate with no duplicated file entries.
**Why human:** UI state interactions (startEditSubmission, file selection, uploadedBlobs lifecycle) require browser interaction to confirm no visual duplication remains.

---

## Re-Verification Summary

The previous VERIFICATION.md (2026-03-02T15:30:00Z, status: passed) was written before the UAT session. UAT identified seven gaps — three major, four minor. Gap closure plans 03-05 resolved all seven:

**Gaps from UAT — all closed:**

1. **ZIP download ungated (major):** User rejected the closure gate. Plans 06-03 removed `isPastFinalClosure` from the API route and the Tooltip/disabled state from the UI button. Confirmed: zero references to `isPastFinalClosure` or `TooltipProvider` remain in either file.

2. **Title required and at top of form (major):** Plan 06-04 moved the title `<Input>` to first position in the form (after closure alerts, before file upload), added `required` attribute, and added `!title.trim()` guard in `onSubmit`. Confirmed at lines 671–681.

3. **Title localStorage persistence removed (major):** Plan 06-04 removed `setTitle` from the localStorage read effect and `title` from the localStorage write. Confirmed: neither localStorage path touches title; DB draft via `saveDraftToDb` is the sole persistence mechanism.

4. **Closure date info icon and visual distinction (minor):** Plan 06-04 added `<Info className="h-4 w-4" />` and `border-blue-200 bg-blue-50 text-blue-900` classes to the non-closed Alert. Confirmed at lines 651–668.

5. **Edit form file duplication (major):** Plan 06-05 removed `setUploadedBlobs` seeding from `startEditSubmission` and restructured the file display into three independent sections. Confirmed at lines 720–811.

6. **API title validation on submission (major):** Plan 06-05 added title checks in both POST (line 83) and PUT (line 168) handlers. Confirmed: both return 400 when submitting without a title; drafts are unaffected.

7. **Email to all coordinators (major, was already working):** Plan 06-05 confirmed that `prisma.user.findMany` with faculty filter returns all coordinators; email sends to an array. No code change was needed — a clarifying comment was added.

All seven gaps are closed. No regressions were detected. Seven automated truths verified. Three items flagged for human verification are behavioural confirmations (email delivery, visual styling, UI interaction), not gaps.

---

_Verified: 2026-03-03T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
