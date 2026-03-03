# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.
**Current focus:** v1.0 gap closure — fixing audit-identified issues

## Current Position

Milestone: v1.0 MVP — GAP CLOSURE
Status: In Progress (Phases 6-9 pending)
Last activity: 2026-03-03 — Phase 08-02 complete (config-driven student upload UI: SWR fetch, amber Alert, dynamic accept, validateFiles)

Progress: [█████████████░░░░░░░] 65% (6/9 phases complete, 08 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Total commits: 111
- Total files modified: 134
- Lines of code: 32,675 TypeScript
- Timeline: 11 days (2026-02-19 → 2026-03-02)

**By Phase:**

| Phase | Plans | Completed |
|-------|-------|-----------|
| 01-schema-and-infrastructure | 4 | 2026-02-25 |
| 02-closure-enforcement | 3 | 2026-02-26 |
| 03-coordinator-and-comment-api | 3 | 2026-02-26 |
| 04-manager-and-reports-api | 3 | 2026-02-26 |
| 05-ui-layer | 5 | 2026-03-02 |
| Phase 06-critical-fixes P01 | 3 | 2 tasks | 3 files |
| Phase 06-critical-fixes P02 | 3 | 2 tasks | 2 files |
| Phase 06-critical-fixes P03 | 5 | 2 tasks | 2 files |
| Phase 06-critical-fixes P04 | 2 | 2 tasks | 1 file |
| Phase 06-critical-fixes P05 | 2 | 2 tasks | 2 files |
| Phase 07-student-comment-thread P01 | 4 | 2 tasks | 3 files |
| Phase 07-student-comment-thread P02 | 2 | 1 task | 1 file |
| Phase 08-upload-rules-enforcement P01 | 2 | 2 tasks | 2 files |
| Phase 08-upload-rules-enforcement P02 | 3 | 2 tasks | 1 files |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.
- [Phase 06-critical-fixes]: Used new Response() not NextResponse.json() in download route to maintain existing response style consistency
- [Phase 06-critical-fixes]: Added activeYear query to existing Promise.all in submissions route to avoid extra DB round-trip
- [Phase 06-critical-fixes]: Client-side isPastFinalClosure derived from finalClosureDate state — no additional API call needed
- [Phase 06-critical-fixes]: Use title || null normalization so empty string becomes null, preserving Untitled fallback in email template
- [Phase 06-critical-fixes]: Removed Guard 3 inverted closure gate from download route; Download ZIP always available to Marketing Managers
- [Phase 06-critical-fixes]: Removed finalClosureDate state and Tooltip gate from manager submissions UI; button disabled only during active download
- [Phase 06-critical-fixes]: Title required validation added to onSubmit only — drafts intentionally allow empty titles
- [Phase 06-critical-fixes]: Title removed from localStorage entirely — DB draft is sole persistence mechanism for title
- [Phase 06-critical-fixes]: Blue styling only on non-closed closure Alert; destructive state retains default red styling
- [Phase 06-critical-fixes]: Remove setUploadedBlobs seeding from startEditSubmission — uploadedBlobs only tracks current-session uploads; editingFiles holds pre-existing files
- [Phase 06-critical-fixes]: API title validation on SUBMITTED status only — POST and PUT handlers return 400; drafts intentionally exempt
- [Phase 06-critical-fixes]: Email already correct (findMany returns all faculty coordinators, array passed to sendMail); clarifying comment added
- [Phase 07-student-comment-thread]: Promise.all runs findMany and isPastFinalClosure in parallel in comments GET — no extra DB round-trip
- [Phase 07-student-comment-thread]: Destructure _count from submission mapping before returning to keep response shape clean
- [Phase 07-student-comment-thread]: Students must click Reply on a comment to set replyToId before textarea is enabled — enforces parentId requirement, prevents API 400
- [Phase 07-student-comment-thread]: isLocked derived from commentsData?.isLocked ?? false — API is single source of truth, not client-side date comparison
- [Phase 08-upload-rules-enforcement]: 403 returned from outer POST handler for enable_uploads gate — handleUpload converts all throws inside onBeforeGenerateToken to 400
- [Phase 08-upload-rules-enforcement]: Config loaded once before handleUpload and captured in closure — no second DB query inside token callback
- [Phase 08-upload-rules-enforcement]: allowedFileTypes defaults to [DOC, DOCX] when ConfigSetting row absent or empty after filter
- [Phase 08-upload-rules-enforcement]: Safe defaults while loading are permissive (uploadsEnabled=true) — server is authoritative gate; client gives immediate feedback via validateFiles at selection time

### Pending Todos

- Phase 6: Critical Fixes COMPLETE (all 5 plans done)
- Phase 7: Student Comment Thread (COMM-02 + COMM-03)
- Phase 8: Upload Rules Enforcement COMPLETE (all plans done: UPLOAD-01, UPLOAD-02, UPLOAD-03 fulfilled)
- Phase 9: Pagination (UX-01 + UX-02)

### Blockers/Concerns

- RESOLVED: MGR-02 ZIP closure gate now added (06-01-PLAN.md complete)
- Phase 4 VERIFICATION.md incorrectly claims closure gate is verified — SUMMARY diverges from code (historical note, now resolved)

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed Phase 08-upload-rules-enforcement/08-02-PLAN.md
Resume file: None
