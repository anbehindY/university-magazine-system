---
phase: 08-upload-rules-enforcement
plan: 02
subsystem: ui
tags: [upload, config, swr, react, nextjs, student-page]

# Dependency graph
requires:
  - phase: 08-upload-rules-enforcement
    provides: Public GET /api/config/upload-rules endpoint returning parsed upload config
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSWR fetches /api/config/upload-rules on page load with permissive safe defaults while loading"
    - "validateFiles standalone helper function validates type/size/count before setFiles — toast.error on violation"
    - "uploadsEnabled derived from uploadConfig?.enableUploads ?? true — server is authoritative gate"

key-files:
  created: []
  modified:
    - app/(student)/submissions/page.tsx

key-decisions:
  - "Safe defaults while loading are permissive (uploadsEnabled=true, maxSizeMb=25, maxFiles=10, allowedExts=[DOC,DOCX]) — server is the authoritative enforcement gate"
  - "validateFiles called at file selection time (onFilesChange, onDropFiles) not at submit time — provides immediate feedback"
  - "useMemo removed alongside invalidFiles — no longer needed now validation happens at selection"

patterns-established:
  - "Config-driven UI: derive acceptAttr, uploadHintText, uploadsEnabled from SWR config data with safe defaults"
  - "Client pre-validation pattern: validateFiles(newFiles, existingCount, config) returns string|null for toast.error"

requirements-completed: [UPLOAD-01, UPLOAD-03]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 08 Plan 02: Upload Rules Enforcement Summary

**Config-driven student upload UI with SWR fetch, amber Alert for disabled state, dynamic accept attribute, config hint text, and client pre-validation via validateFiles()**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T07:09:28Z
- **Completed:** 2026-03-03T07:12:10Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Removed hardcoded ACCEPTED_MIME_TYPES constant and isAcceptedFile function from student page
- Added UploadConfig type and useSWR hook fetching /api/config/upload-rules on page load
- Added validateFiles standalone helper with type/size/count validation; toast.error on violation
- Added amber Alert banner visible when enableUploads is false
- Updated file Input accept attribute to dynamic acceptAttr derived from config allowedFileTypes
- Added config-driven uploadHintText below dropzone showing limits
- Disabled file input and submit button when !uploadsEnabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SWR upload config fetch and derived state to student page** - `7caa55d` (feat)
2. **Task 2: Add amber Alert, hint text, disabled state, and dynamic accept attr to upload UI** - `54733d4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/(student)/submissions/page.tsx` - Removed hardcoded file validation, added UploadConfig type, useSWR hook for /api/config/upload-rules, validateFiles helper, uploadsEnabled/acceptAttr/uploadHintText derived state; amber Alert, dynamic accept, hint text, and disabled states wired into upload dialog UI

## Decisions Made
- Safe defaults while loading are permissive (uploadsEnabled=true, maxSizeMb=25, maxFiles=10) so the UI does not block legitimate uploads when the config endpoint is slow — the server API enforces the authoritative rules
- validateFiles is called at file selection time (onFilesChange, onDropFiles) not at onSubmit, giving students immediate feedback before they attempt to upload
- useMemo import removed alongside invalidFiles useMemo — no remaining usages in the file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Upload enforcement is fully config-driven end-to-end: server enforces via 403 gate and Blob token constraints (Phase 08 Plan 01), client reflects the same config via UI hints and pre-validation (this plan)
- UPLOAD-01 (enable gate) and UPLOAD-03 (client-side enforcement) requirements fulfilled
- Phase 09 (Pagination) can proceed

---
*Phase: 08-upload-rules-enforcement*
*Completed: 2026-03-03*
