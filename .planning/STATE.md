# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.
**Current focus:** v1.0 gap closure — fixing audit-identified issues

## Current Position

Milestone: v1.0 MVP — GAP CLOSURE
Status: Complete (all phases done)
Last activity: 2026-03-05 — Completed quick task 20: Guest year selector glow + publications header

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
- [Quick-4]: SubmissionCardSkeleton as standalone function outside component — keeps main component cleaner
- [Quick-4]: submissionsLoading initialized to true to prevent empty-state flash before useEffect fires
- [Quick-4]: isArchivedYear guards on selectedSubmission !== null to prevent false positive on null check
- [Quick-4]: Locked banner uses ternary to distinguish closure-locked vs archived-year-locked messages
- [Quick-5]: Email only fires on false-to-true isSelected transition -- prevents duplicate emails on re-select and no email on deselect
- [Quick-5]: API response shape preserved (id, isSelected, notes) -- title and user stripped before return to maintain existing contract
- [Quick-5]: .env not committed (contains secrets) -- NEXT_PUBLIC_APP_URL added locally only
- [Phase quick-6]: Client-side filtering/sorting for no-comments, consistent with existing filter/sort pattern
- [Phase quick-6]: Amber highlight on zero-comment count for visual coordinator attention
- [Quick-7]: Reverted MARKETING_COORDINATOR from canSwitchYear — coordinators only see active year reports
- [Quick-9]: Used standalone autoTable(doc, options) function import — cleaner TypeScript types than prototype augmentation pattern
- [Quick-9]: pnpm used instead of npm matching project lock file; jspdf ships own types so @types/jspdf not needed
- [Quick-10]: Separate (guest) route group with own layout isolates guest experience from portal sidebar
- [Quick-10]: Kept GuestDashboard component as dead code in portal page -- removing requires DashboardData type refactor
- [Quick-15]: formatRole helper omitted from manager slide-over -- no comment thread in read-only view so function is unused
- [Quick-15]: Canonical Tailwind classes used: w-120 and sm:max-w-140 instead of arbitrary bracket values
- [Quick-16]: useRef<Set<string>> + useState counter pattern for download tracking — useRef holds Set (no re-render cost on mutation), counter triggers re-render
- [Quick-16]: hasDownloaded derived at top of render using selectedSubmissionId; downloadVersion read implicitly to ensure freshness
- [Quick-17]: Server-side redirect("/guest") in portal layout fires before any HTML sent — eliminates sidebar flash for GUEST role
- [Quick-17]: Stat cards built inline in guest page using Card primitives — StatCard not exported from portal page.tsx
- [Quick-18]: availableYears queried via academicYear.findMany with submissions.some filter — single DB query finds all years with selected submissions for guest's faculty
- [Quick-18]: useRef initialLoadDone prevents double-fetch when selectedYearId is set from initial API response on mount
- [Quick-18]: isRefetching derived as loading && availableYears.length > 0 — distinguishes initial skeleton from year-switch opacity overlay
- [Quick-19]: Stat cards wrapped in bg-slate-50 rounded-xl container with Overview label — creates visual grouping distinct from white article cards without changing Card component structure
- [Quick-19]: border-slate-200/60 opacity tweak reduces visual noise of card borders against the slate-50 wrapper background

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
| 4 | Skeleton loading cards, auth guard, and archived-year comment reply locking | 2026-03-04 | cfdb0cb | [4-improve-student-submissions-loading-ux-a](./quick/4-improve-student-submissions-loading-ux-a/) |
| 5 | Add NEXT_PUBLIC_APP_URL and send selection email to student | 2026-03-04 | 8a365c2 | [5-update-env-with-app-url-and-send-email-t](./quick/5-update-env-with-app-url-and-send-email-t/) |
| 6 | Coordinator submissions no-comments filter/sort/column + reports year selector | 2026-03-04 | cfcb475 | [6-coordinator-submissions-filter-no-commen](./quick/6-coordinator-submissions-filter-no-commen/) |
| 7 | Coordinator should only see report for the active year | 2026-03-04 | 892f6cd | [7-coordinator-should-only-see-report-for-t](./quick/7-coordinator-should-only-see-report-for-t/) |
| 8 | Add coordinator review status to submissions (Pending, Reviewing, Commented) | 2026-03-05 | 8edbd43 | [8-add-coordinator-review-status-to-submiss](./quick/8-add-coordinator-review-status-to-submiss/) |
| 9 | Export reports as PDF or Excel for Marketing Managers and Coordinators | 2026-03-05 | c12de89 | [9-export-reports-as-pdf-or-excel-for-marke](./quick/9-export-reports-as-pdf-or-excel-for-marke/) |
| 10 | Guest single-page magazine view with standalone layout | 2026-03-05 | 0fb900e | [10-guest-single-page-magazine-view-with-sta](./quick/10-guest-single-page-magazine-view-with-sta/) |
| 11 | Rename Statistics tab to Summary, always show multi-faculty view for managers | 2026-03-05 | 7ca7fe2 | [11-rename-statistics-tab-to-summary-and-alw](./quick/11-rename-statistics-tab-to-summary-and-alw/) |
| 12 | Show coordinator review status badges on student submissions page | 2026-03-05 | 25760ce | [12-show-coordinator-review-status-to-studen](./quick/12-show-coordinator-review-status-to-studen/) |
| 13 | Seed data with pending + overdue exception submissions for 2025-2026 | 2026-03-05 | b2bb666 | [13-seed-data-should-have-submissions-that-i](./quick/13-seed-data-should-have-submissions-that-i/) |
| 14 | Realistic seed data: remove 2023-2024 year, clean 2025-2026 (no submissions) | 2026-03-05 | 47e5c0d | [14-realistic-seed-data-closure-dates-and-su](./quick/14-realistic-seed-data-closure-dates-and-su/) |
| 15 | Marketing manager submission detail slide-over (read-only Sheet panel on row click) | 2026-03-05 | 0a64bc0 | [15-marketing-manager-submission-detail-slid](./quick/15-marketing-manager-submission-detail-slid/) |
| 16 | Coordinator must download at least one file before commenting | 2026-03-05 | fa530e3 | [16-coordinator-must-download-at-least-one-f](./quick/16-coordinator-must-download-at-least-one-f/) |
| 17 | Fix guest portal layout flicker on login and add guest mini-dashboard | 2026-03-05 | 692b67e | [17-fix-guest-portal-layout-flicker-on-login](./quick/17-fix-guest-portal-layout-flicker-on-login/) |
| 18 | Guest can view selected submissions for each academic year (year selector) | 2026-03-05 | fbfa228 | [18-guest-can-view-selected-submissions-for-](./quick/18-guest-can-view-selected-submissions-for-/) |
| 19 | Fix guest page padding/spacing issues and add Overview dashboard section | 2026-03-05 | f7c48d2 | [19-fix-guest-page-padding-spacing-issues-an](./quick/19-fix-guest-page-padding-spacing-issues-an/) |
| 20 | Guest year selector silver glow, publications header, smaller article cards | 2026-03-05 | 9ae0793 | — |

## Session Continuity

Last session: 2026-03-05
Stopped at: Quick task 20 complete
Resume file: None
