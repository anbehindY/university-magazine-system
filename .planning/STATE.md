# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.
**Current focus:** v1.0 gap closure — fixing audit-identified issues

## Current Position

Milestone: v1.0 MVP — GAP CLOSURE
Status: Complete (all phases done)
Last activity: 2026-03-04 — Quick task 1 complete (Remove Status column from Previous Years table and add auto-deactivation)

Progress: [████████████████████] 100% (9/9 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 21
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
| Phase 09-pagination P01 | 3min | 2 tasks | 2 files |
| Phase 09-pagination P03 | 2min | 2 tasks | 1 file |
| Phase 09-pagination P04 | 1 | 2 tasks | 1 files |

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
- [Phase 09-pagination]: PaginationControls returns null when total <= pageSize — no pagination chrome for single-page results
- [Phase 09-pagination]: Admin users API uses [createdAt desc, id asc] orderBy — id tiebreaker ensures stable page cursors
- [Phase 09-pagination]: Paginated API pattern: Promise.all([count(), findMany({ skip, take })]) — no sequential DB round-trips
- [Phase 09-pagination]: Skeleton rows (4 max) replace LoadingScreen for table data loading; LoadingScreen retained only for auth guard in admin users page
- [Phase 09-pagination]: PaginationControls placed below coordinator submissions table, guarded by !loading && !error — consistent with admin users page pattern
- [Phase 09-pagination]: handlePageSizeChange resets page to 1 before updating pageSize — prevents out-of-bounds navigation on coordinator submissions page
- [Quick-1]: useRef hasAutoDeactivated guard prevents re-triggering after first deactivation call; separate useEffect resets guard on activeYear.id change
- [Quick-1]: Silent failure on auto-deactivation (console.error only) — avoids confusing UI errors on page load; admin can still manage manually
- [Quick-3]: academicYear included via Prisma include select — no extra DB call, passes through ...rest spread in mapped
- [Quick-3]: currentSubmissions and archivedByYear derived inline (no useMemo) — submissions array is small per-user
- [Quick-3]: archivedYearLabels sorted descending so most recent past year appears first
- [Quick-3]: New Submission button hidden (not just disabled) when closureYearLabel=null — avoids misleading UI state
- [Quick-3]: selectedSubmission lookup remains on full submissions array — comment sheet works for archived cards

### Pending Todos

- Phase 6: Critical Fixes COMPLETE (all 5 plans done)
- Phase 7: Student Comment Thread (COMM-02 + COMM-03)
- Phase 8: Upload Rules Enforcement COMPLETE (all plans done: UPLOAD-01, UPLOAD-02, UPLOAD-03 fulfilled)
- Phase 9: Pagination — COMPLETE (all 4 plans done: UX-01 admin users, UX-02 coordinator submissions fully paginated)

### Blockers/Concerns

- RESOLVED: MGR-02 ZIP closure gate now added (06-01-PLAN.md complete)
- Phase 4 VERIFICATION.md incorrectly claims closure gate is verified — SUMMARY diverges from code (historical note, now resolved)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Remove status from Previous Years and auto-deactivate years past final closure | 2026-03-04 | 029146d | [1-remove-status-from-previous-years-and-au](./quick/1-remove-status-from-previous-years-and-au/) |
| 2 | Add success toast notifications to all 8 admin actions (closure-dates, upload-rules, users) | 2026-03-04 | a20c584 | [2-add-success-toasters-to-all-admin-action](./quick/2-add-success-toasters-to-all-admin-action/) |
| 3 | Separate student submissions by academic year — current editable, archived read-only | 2026-03-04 | 4b6254b | [3-separate-student-submissions-by-academic](./quick/3-separate-student-submissions-by-academic/) |

## Session Continuity

Last session: 2026-03-04
Stopped at: Quick task 3 complete
Resume file: None
