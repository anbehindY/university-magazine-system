---
status: complete
phase: 03-coordinator-and-comment-api
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-02-26T09:00:00Z
updated: 2026-02-26T09:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Coordinator views faculty submissions
expected: Calling GET /api/coordinator/submissions as a logged-in coordinator returns a JSON array of only SUBMITTED submissions from the coordinator's own faculty. Each entry includes: id, title, status, studentName, submittedAt, isSelected, notes, fileCount. Submissions from other faculties are not present.
result: pass

### 2. Cross-faculty coordinator blocked
expected: A coordinator trying to access submissions from a different faculty (via GET or PATCH) receives a 403 Forbidden response. The coordinator only sees their own faculty's work.
result: pass

### 3. Coordinator toggles isSelected
expected: Calling PATCH /api/coordinator/submissions/[id] with `{ "isSelected": true }` on a submission in the coordinator's faculty succeeds and returns the updated submission with isSelected set to true. Sending `{ "isSelected": false }` toggles it back.
result: pass

### 4. Coordinator updates notes
expected: Calling PATCH /api/coordinator/submissions/[id] with `{ "notes": "Some feedback" }` on a submission in the coordinator's faculty succeeds and the updated notes value is returned. Subsequent GET requests reflect the change.
result: pass

### 5. PATCH blocked after final closure
expected: After the finalClosureDate has passed, calling PATCH /api/coordinator/submissions/[id] with isSelected or notes returns 403 with a message about submissions being locked.
result: pass

### 6. Coordinator posts comment on submission
expected: Calling POST /api/comments with `{ "submissionId": "...", "content": "Great work" }` as a coordinator for that faculty succeeds with 201 and returns the created comment with author info. The comment is persisted and visible in the thread.
result: pass

### 7. Student posts reply to comment
expected: Calling POST /api/comments with `{ "submissionId": "...", "content": "Thank you", "parentId": "..." }` as the student who owns the submission succeeds with 201 and returns the created reply. The parentId links it to the coordinator's comment.
result: pass

### 8. Student top-level comment blocked
expected: Calling POST /api/comments without a parentId as a student returns 400 with a message like "Students can only reply to existing comments". Students cannot initiate new comment threads.
result: pass

### 9. Comment thread visible to authorized users
expected: Calling GET /api/comments?submissionId=X as the submission owner or a same-faculty coordinator returns the full comment thread ordered by createdAt ascending. A user who is neither the owner nor a same-faculty coordinator receives 403.
result: pass

### 10. Email sent on first submission
expected: When a student transitions a submission from DRAFT to SUBMITTED for the first time, the coordinator(s) for that student's faculty receive an email notification with the student name, submission title, and a link to /coordinator/submissions. Re-submitting the same submission does not send a second email.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
