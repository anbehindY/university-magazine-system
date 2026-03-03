---
phase: 08-upload-rules-enforcement
plan: 01
subsystem: api
tags: [upload, config, prisma, vercel-blob, nextjs]

# Dependency graph
requires:
  - phase: 01-schema-and-infrastructure
    provides: ConfigSetting and SubmissionFile Prisma models
provides:
  - Public GET /api/config/upload-rules endpoint returning parsed upload config with safe defaults
  - Config-aware upload handler enforcing enable_uploads, max file size, file count, and allowed MIME types
  - Dynamic MIME type resolution from admin-configured file extension list
affects: [09-pagination, client upload components that read upload-rules endpoint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config once before handleUpload, captured in closure — avoids second DB query inside onBeforeGenerateToken"
    - "403 returned from outer POST handler for feature-gate errors (handleUpload converts all throws to 400)"
    - "EXT_TO_MIME map converts admin-configured extension strings to MIME types for Vercel Blob token"

key-files:
  created:
    - app/api/config/upload-rules/route.ts
  modified:
    - app/api/submissions/upload/route.ts

key-decisions:
  - "enable_uploads 403 gate must be in outer POST handler, not onBeforeGenerateToken — handleUpload converts all throws to 400"
  - "Config loaded once before handleUpload and captured in closure — no second DB query inside token callback"
  - "allowedFileTypes defaults to [DOC, DOCX] when ConfigSetting row is absent or results in empty array after filter"
  - "EXT_TO_MIME fallback to doc/docx MIME types when no extension maps resolve, matching the allowedFileTypes default"

patterns-established:
  - "getUploadConfig() defined inline in upload route (not imported from config route) to keep the file self-contained"
  - "enable_uploads !== 'false' pattern: absent row defaults to enabled (safe default for unset config)"

requirements-completed: [UPLOAD-01, UPLOAD-02]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 08 Plan 01: Upload Rules Enforcement Summary

**Config-aware upload enforcement via dynamic ConfigSetting queries: 403 gate for disabled uploads, file count limit, dynamic MIME types and max size from admin settings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T07:04:18Z
- **Completed:** 2026-03-03T07:06:13Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created public GET /api/config/upload-rules endpoint with typed response and safe defaults (no auth required)
- Removed hardcoded ALLOWED_CONTENT_TYPES constant from upload route
- Added getUploadConfig() helper that reads 4 ConfigSetting keys with safe defaults (enableUploads, maxUploadSizeMb, maxFilesPerUpload, allowedFileTypes)
- Added EXT_TO_MIME map and extToMimeTypes() for dynamic MIME type resolution from admin-configured extension list
- Wired 403 early-return for disabled uploads before handleUpload is called (prevents 400-only error from Vercel Blob)
- Added submissionFile.count check against maxFilesPerUpload before issuing Blob token

## Task Commits

Each task was committed atomically:

1. **Task 1: Create public GET /api/config/upload-rules endpoint** - `e74a7ef` (feat)
2. **Task 2: Wire upload config enforcement into POST /api/submissions/upload** - `504c5d4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/api/config/upload-rules/route.ts` - Public GET endpoint returning parsed upload config (enableUploads, maxUploadSizeMb, maxFilesPerUpload, allowedFileTypes) with safe defaults when ConfigSetting rows absent
- `app/api/submissions/upload/route.ts` - Config-aware upload handler: ALLOWED_CONTENT_TYPES removed, getUploadConfig() inline helper, 403 gate for disabled uploads, file count enforcement, dynamic MIME types and max size

## Decisions Made
- 403 returned from outer POST handler for the enable_uploads gate — handleUpload converts all throws inside onBeforeGenerateToken to 400 status, making it the only place to return the correct 403
- Config loaded once before handleUpload and captured in closure to avoid a redundant DB query inside the token callback
- allowedFileTypes defaults to ["DOC", "DOCX"] when the ConfigSetting row is absent or results in an empty array after filtering
- EXT_TO_MIME fallback to doc/docx MIME types ensures token always has valid allowedContentTypes even when extension mapping resolves empty

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Upload enforcement is now fully server-side and config-driven; admin settings in ConfigSetting are the authoritative source
- UPLOAD-01 (enable gate) and UPLOAD-02 (file count, size, type) requirements fulfilled
- Public /api/config/upload-rules endpoint available for client-side UI hints (Phase 08 Plan 02 or later)
- Phase 09 (Pagination) can proceed independently

---
*Phase: 08-upload-rules-enforcement*
*Completed: 2026-03-03*
