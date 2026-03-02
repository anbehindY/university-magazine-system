---
status: complete
phase: 06-critical-fixes
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md]
started: 2026-03-02T15:10:00Z
updated: 2026-03-03T00:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Download ZIP button disabled before finalClosureDate
expected: Navigate to /manager/submissions as a Marketing Manager. The Download ZIP button should be disabled (greyed out, not clickable). Hovering over it should show a Tooltip with "Available after DD MMM YYYY" showing the final closure date.
result: issue
reported: "I want the marketing manager to be able to download the zip any time."
severity: major

### 2. Download ZIP works after finalClosureDate
expected: With the finalClosureDate set to a past date, navigate to /manager/submissions. The Download ZIP button should be enabled and clicking it should download a ZIP file of submissions.
result: skipped
reason: Closure gate not wanted — manager should be able to download any time

### 3. ZIP download API returns 403 before finalClosureDate
expected: Before finalClosureDate, calling the download endpoint directly (or clicking when enabled via dev tools) returns a 403 error with "ZIP download is only available after the final closure date."
result: skipped
reason: Closure gate not wanted — manager should be able to download any time

### 4. Title input appears in student submission form
expected: Navigate to /submissions as a Student. Open the submission form (create new or edit). A "Title" input field should appear above the notes field with placeholder "Give your submission a title (optional)".
result: issue
reported: "Title should be required, not optional. In the edit form, existing files and uploaded files seem duplicated — Existing files should show previously uploaded files with download/delete options."
severity: major

### 5. Title persists when saving a submission
expected: Enter a title in the submission form and save. The title should appear in the submissions list — visible in the Title column on desktop or in the card on mobile.
result: pass
notes: "Title persists, but user wants title input moved to the very top of the form as the first user input. Also, final closure date info should have an info icon and be visually distinct from other elements."

### 6. Title restores from localStorage on page reload
expected: Enter a title in the draft form, then reload the page without saving to the server. The title should be restored from localStorage and still appear in the input field.
result: issue
reported: "Don't need localStorage for title — just save as draft to the database."
severity: major

### 7. Editing a submission restores saved title
expected: Edit an existing submission that has a title. The title input should be pre-populated with the previously saved title.
result: pass

### 8. Coordinator email includes submission title
expected: Submit a submission with a title. The coordinator should receive an email notification where the subject line includes the student-provided title (not "Untitled").
result: pass
notes: "Email should be sent to every coordinator under the faculty of that student."

## Summary

total: 8
passed: 3
issues: 3
pending: 0
skipped: 2

## Gaps

- truth: "Download ZIP button should be available to Marketing Manager at any time without date restriction"
  status: failed
  reason: "User reported: I want the marketing manager to be able to download the zip any time."
  severity: major
  test: 1
  artifacts:
    - path: "app/api/manager/submissions/download/route.ts"
      issue: "Inverted closure gate blocks downloads before finalClosureDate — user wants no restriction"
    - path: "app/(management)/manager/submissions/page.tsx"
      issue: "Download ZIP button disabled before finalClosureDate with Tooltip — user wants always enabled"
  missing: []
  debug_session: ""
- truth: "Title input should be the first field at the top of the submission form"
  status: failed
  reason: "User reported: title input should be the first user input and it should be at the top."
  severity: minor
  test: 5
  artifacts:
    - path: "app/(student)/submissions/page.tsx"
      issue: "Title input is placed above notes but not at the very top of the form"
  missing: []
  debug_session: ""
- truth: "Final closure date info should have an info icon and be visually distinct from other elements"
  status: failed
  reason: "User reported: Info about final closure date should include an info icon and it must be distinct from others."
  severity: minor
  test: 5
  artifacts:
    - path: "app/(student)/submissions/page.tsx"
      issue: "Closure date display lacks info icon and visual distinction"
  missing: []
  debug_session: ""
- truth: "Title field should be required when creating or editing a submission"
  status: failed
  reason: "User reported: Title should be required, not optional."
  severity: major
  test: 4
  artifacts:
    - path: "app/(student)/submissions/page.tsx"
      issue: "Title input has no required validation — user wants it mandatory"
    - path: "app/api/submissions/route.ts"
      issue: "SubmissionPayload has title as optional (title?: string | null) — needs to be required"
  missing: []
  debug_session: ""
- truth: "Title should persist via database draft save, not localStorage"
  status: failed
  reason: "User reported: Don't need localStorage for title — just save as draft to the database."
  severity: major
  test: 6
  artifacts:
    - path: "app/(student)/submissions/page.tsx"
      issue: "Title is saved to localStorage for draft persistence — user wants DB-only draft saves"
  missing: []
  debug_session: ""
- truth: "Edit form should clearly show previously uploaded files with download/delete options, not duplicate them with the upload section"
  status: failed
  reason: "User reported: In the edit form, existing files and uploaded files seem duplicated. Existing files should show uploaded files with download/delete options."
  severity: major
  test: 4
  artifacts:
    - path: "app/(student)/submissions/page.tsx"
      issue: "Edit form shows both existing files section and uploaded files section causing confusion"
  missing: []
  debug_session: ""
- truth: "Submission notification email should be sent to every coordinator under the faculty of that student"
  status: failed
  reason: "User reported: the email should be sent to every coordinator under the faculty of that student."
  severity: major
  test: 8
  artifacts:
    - path: "app/api/submissions/route.ts"
      issue: "Email may not be targeting all coordinators under the student's faculty"
  missing: []
  debug_session: ""
