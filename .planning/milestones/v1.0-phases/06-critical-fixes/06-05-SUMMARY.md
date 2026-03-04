---
phase: 06-critical-fixes
plan: 05
subsystem: ui
tags: [react, nextjs, typescript, form, file-upload, api-validation]

# Dependency graph
requires:
  - phase: 06-critical-fixes
    provides: Phase 06 plans 01-04 — MGR-02 closure gate, COORD-02 title field, UAT gap fixes

provides:
  - Clean edit mode file display with "Previously uploaded files" and "New files to upload" as separate sections
  - API-level title validation on SUBMITTED status in both POST and PUT handlers
  - Confirmed coordinator email uses findMany to target all coordinators in faculty

affects: [student-ui, submissions-api, coordinator-email]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate state arrays for editingFiles (existing) vs files (new selections) vs uploadedBlobs (just-uploaded) to avoid duplication"
    - "API validates title only on SUBMITTED status, not on DRAFT saves"

key-files:
  created: []
  modified:
    - app/(student)/submissions/page.tsx
    - app/api/submissions/route.ts

key-decisions:
  - "Remove setUploadedBlobs seeding from startEditSubmission — uploadedBlobs only ever holds blobs from current session uploads"
  - "Three-section file display replaces single ternary: Previously uploaded / New to upload / Draft fallback"
  - "Title validation placed in POST handler after activeYear check, in PUT handler inside nextStatus === SUBMITTED block"
  - "Email code already correct — findMany returns all coordinators, array passed to sendMail; added comment confirming intent"

patterns-established:
  - "Submit button disabled check mirrors onSubmit hasExistingFiles validation for consistency"

requirements-completed: [COORD-02]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 06 Plan 05: Edit Form File Sections and API Validation Summary

**Edit mode file duplication fixed with three separate sections (existing/new/draft), title required on SUBMIT enforced at API level in both POST and PUT handlers**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-02T19:19:02Z
- **Completed:** 2026-03-03T19:22:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Eliminated duplication in edit mode: existing files now always visible as "Previously uploaded files" with download/delete; newly selected files appear separately as "New files to upload"
- Stopped seeding `uploadedBlobs` from existing submission files in `startEditSubmission` (root cause of duplication)
- Added API title validation: POST and PUT return 400 when `status === "SUBMITTED"` and title is empty — drafts intentionally exempt
- Updated `hasExistingFiles` and submit button disabled check to include `editingFiles.length > 0` (was broken after uploadedBlobs seeding removed)
- Confirmed email sends to ALL coordinators via `findMany` with faculty filter; added comment confirming intent

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix edit mode file sections to eliminate duplication** - `07fcfa0` (fix)
2. **Task 2: Add API title validation on submission and verify email targets all faculty coordinators** - `0582886` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `app/(student)/submissions/page.tsx` - Restructured file display sections, fixed uploadedBlobs seeding, updated validation checks
- `app/api/submissions/route.ts` - Title required validation on SUBMITTED in POST and PUT, coordinator email comment

## Decisions Made
- Remove `setUploadedBlobs` seeding from `startEditSubmission` — `uploadedBlobs` should only track blobs uploaded in the current session, not pre-existing files; `editingFiles` already holds that data
- Three separate display sections (not a single ternary) so existing files and new files are always independently visible in edit mode
- Title validation placed in POST after activeYear check and in PUT inside `nextStatus === "SUBMITTED"` block — drafts intentionally skip this check
- Email code was already correct; clarifying comment added, no functional change needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Submit button disabled check missing editingFiles guard**
- **Found during:** Task 1 (fixing edit mode file sections)
- **Issue:** After removing uploadedBlobs seeding, the submit button disabled check `(files.length === 0 && draftFileNames.length === 0 && uploadedBlobs.length === 0)` would incorrectly enable submit only when uploadedBlobs was populated. In edit mode with existing files, uploadedBlobs is now always empty, so the button would stay disabled even with valid existing files.
- **Fix:** Added `&& editingFiles.length === 0` to the disabled condition to mirror the `hasExistingFiles` check in `onSubmit`
- **Files modified:** app/(student)/submissions/page.tsx
- **Verification:** TypeScript compiles cleanly, logic consistent with onSubmit validation
- **Committed in:** 07fcfa0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — submit button guard)
**Impact on plan:** Auto-fix essential for correctness after removing uploadedBlobs seeding. No scope creep.

## Issues Encountered
None — all changes applied cleanly per plan specification.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 06 complete — all 5 plans done (MGR-02 closure gate, COORD-02 title field, edit duplication, API validation, email confirmation)
- Ready for Phase 07: Student Comment Thread (COMM-02 + COMM-03)

---
*Phase: 06-critical-fixes*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: app/(student)/submissions/page.tsx
- FOUND: app/api/submissions/route.ts
- FOUND: .planning/phases/06-critical-fixes/06-05-SUMMARY.md
- FOUND commit: 07fcfa0 (fix(06-05): fix edit mode file sections)
- FOUND commit: 0582886 (feat(06-05): add API title validation)
