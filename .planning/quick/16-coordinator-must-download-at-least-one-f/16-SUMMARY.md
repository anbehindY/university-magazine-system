---
phase: quick-16
plan: 01
subsystem: coordinator-submissions-ui
tags: [ux-gate, client-side, download-tracking, coordinator]
dependency_graph:
  requires: []
  provides: [download-gated-comment-ux]
  affects: [app/(portal)/coordinator/submissions/page.tsx]
tech_stack:
  added: []
  patterns: [useRef-with-useState-counter-for-Set-re-rendering]
key_files:
  created: []
  modified:
    - app/(portal)/coordinator/submissions/page.tsx
decisions:
  - "useRef<Set<string>> + useState counter pattern: useRef holds the Set (no re-render cost on mutation), useState counter triggers re-render when Set changes"
  - "hasDownloaded derived before return statement using selectedSubmissionId — reads downloadVersion implicitly to ensure freshness"
  - "Session-scoped per-submission tracking: once a submission's file is downloaded, commenting remains enabled across panel open/close for that session"
  - "No e.preventDefault() on file links — opens in new tab as before, download tracking is purely additive"
metrics:
  duration: ~2min
  completed: 2026-03-05
  tasks: 1
  files_modified: 1
---

# Quick Task 16: Coordinator Must Download at Least One File Before Commenting

**One-liner:** Download-gated comment UX using useRef Set + useState counter pattern, disabled textarea/button until coordinator clicks a file link.

## What Was Built

Added a client-side session-scoped UX gate to the coordinator submissions slide-over panel. The comment textarea and Post Comment button are disabled until the coordinator clicks at least one file download link for the currently open submission.

**Mechanism:**
- `downloadedSubmissionsRef` (useRef<Set<string>>) tracks which submission IDs have been downloaded this session
- `downloadVersion` (useState<number>) is incremented when the Set changes, triggering React re-renders
- `handleFileClick(submissionId)` adds the ID to the Set and increments the counter
- `hasDownloaded` boolean is derived before `return` — reads `downloadVersion` implicitly so it stays fresh
- All 9 plan points implemented: state, handler, onClick on file links, hasDownloaded derivation, disabled textarea, disabled button, dynamic placeholder, dynamic hint text, Ctrl+Enter guard

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add download-tracking state and gate comment UI | fa530e3 | app/(portal)/coordinator/submissions/page.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `app/(portal)/coordinator/submissions/page.tsx` modified (fa530e3)
- [x] TypeScript compiles without errors (`npx tsc --noEmit` exits 0)
- [x] `downloadedSubmissionsRef` present in file
- [x] `downloadVersion` present in file
- [x] `handleFileClick` handler present in file
- [x] `hasDownloaded` derived before render
- [x] `disabled={!hasDownloaded}` on textarea
- [x] `disabled={commentPosting || !commentBody.trim() || !hasDownloaded}` on button
- [x] Dynamic placeholder and hint text present
- [x] `onClick={() => handleFileClick(selectedSubmission.id)}` on file links
