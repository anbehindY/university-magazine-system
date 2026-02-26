---
phase: 04-manager-and-reports-api
plan: "03"
subsystem: api
tags: [nextjs, archiver, zip, streaming, role-based-access, vercel-blob]

# Dependency graph
requires:
  - phase: 04-01
    provides: archiver installed, manager route pattern, facultyId snapshot resolution pattern
  - phase: 01-03
    provides: isPastFinalClosure, getActiveAcademicYear from closure-guard.ts
  - phase: 02-01
    provides: Submission isSelected field, SubmissionFile with url/pathname fields

provides:
  - GET /api/manager/submissions/download — streaming ZIP endpoint gated behind final closure date

affects:
  - Phase 5 (if any frontend integration for ZIP download trigger)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inverted closure gate: !(await isPastFinalClosure()) blocks before final closure — the single exception to the project's post-deadline block pattern; documented with inline comment"
    - "IIFE serial blob streaming: async IIFE feeds archiver entries one-by-one; never Promise.all() to avoid memory exhaustion with large blob sets"
    - "Node stream to Web ReadableStream bridge: Readable.toWeb(archive) as unknown as ReadableStream — Node.js v24 native, no polyfill needed"
    - "Failed blob graceful degradation: .error.txt marker files written into ZIP instead of corrupting the archive"
    - "Empty faculty folder placeholder: archive.append('', { name: fName/.gitkeep }) ensures all faculty directories appear even with no selected submissions"
    - "stream/web type import: import type { ReadableStream as NodeWebReadableStream } from 'stream/web' resolves TS mismatch between Web ReadableStream global and Readable.fromWeb parameter type"

key-files:
  created:
    - app/api/manager/submissions/download/route.ts
  modified: []

key-decisions:
  - "Inverted closure gate !(await isPastFinalClosure()) is the single endpoint in the project that blocks BEFORE the date — documented with clear inline comment explaining the business rationale (ZIP is a publication-ready export that should only be generated post-deadline)"
  - "Serial blob fetching via IIFE for-loop — plan specified this explicitly; never Promise.all() to prevent memory exhaustion when fetching potentially large numbers of blobs"
  - "NodeWebReadableStream import alias resolves TypeScript mismatch: Readable.fromWeb expects stream/web ReadableStream but fetch().body is a global Web ReadableStream; import type alias enables clean typing without runtime cost"
  - "as unknown as ReadableStream double-cast for Readable.toWeb return value — necessary because Node.js stream/web and global ReadableStream types diverge in TypeScript definitions even though they are the same runtime object"

patterns-established:
  - "Inverted closure gate pattern: !(await isPastFinalClosure()) with clear comment — use when endpoint should only be available AFTER a date rather than blocked by it"
  - "Archive IIFE pattern: (async () => { for...of serial fetches; archive.finalize() })() started before Readable.toWeb — archiver buffers internally, web stream reads as data arrives"

requirements-completed:
  - MGR-02

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 4 Plan 03: Streaming ZIP Download Endpoint Summary

**Streaming GET /api/manager/submissions/download with serial blob fetching, Faculty/Student/filename ZIP structure, inverted closure gate, and graceful error marker files for failed fetches**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T05:11:05Z
- **Completed:** 2026-02-26T05:12:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created GET /api/manager/submissions/download with auth gate (401), role gate (403), and inverted closure gate (403 before finalClosureDate)
- ZIP assembled via archiver with serial blob fetching in an async IIFE — no Promise.all to prevent memory exhaustion
- ZIP structured as Faculty/StudentName/filename using the snapshot facultyId -> Map resolution pattern established in Plan 01
- Empty faculty folders included via .gitkeep placeholder entries for faculties with no selected submissions
- Failed blob fetches degrade gracefully by writing .error.txt marker files into the ZIP instead of corrupting the archive
- Node.js v24 Readable.toWeb bridge converts archiver Node stream to Web ReadableStream for Response body
- ZIP filename derived from active academic year label (selected-submissions-{yearLabel}.zip)
- TypeScript compiles clean — resolved stream/web vs global ReadableStream type mismatch with import type alias

## Task Commits

Each task was committed atomically:

1. **Task 1: Create streaming ZIP download endpoint** - `832a166` (feat)

## Files Created/Modified

- `app/api/manager/submissions/download/route.ts` - MARKETING_MANAGER-gated streaming ZIP endpoint with inverted closure gate, serial blob fetching, and Faculty/Student/filename ZIP structure

## Decisions Made

- Inverted closure gate `!(await isPastFinalClosure())` is the single endpoint in the project that blocks BEFORE the date rather than after. This is intentional and documented with a clear inline comment: the ZIP is a publication-ready export that should only be generated once all selection windows have closed.
- Serial blob fetching via for-loop IIFE — plan specified this explicitly to prevent memory exhaustion; no Promise.all anywhere in the file.
- TypeScript required import type alias for `NodeWebReadableStream` from `stream/web` to type `Readable.fromWeb()` parameter correctly (global `ReadableStream` and `stream/web.ReadableStream` diverge in TS definitions despite being the same runtime object). Double cast `as unknown as ReadableStream` used for `Readable.toWeb()` return for the same reason.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type mismatch between stream/web and global ReadableStream**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** `res.body as ReadableStream` passed to `Readable.fromWeb()` caused TS2345 — `Readable.fromWeb` expects `import("stream/web").ReadableStream` but fetch response body is the global Web API `ReadableStream`; the types diverge in TypeScript definitions even though they are the same at runtime.
- **Fix:** Added `import type { ReadableStream as NodeWebReadableStream } from "stream/web"` and used `res.body as NodeWebReadableStream` for `Readable.fromWeb()`. Added `as unknown as ReadableStream` double-cast for `Readable.toWeb()` return.
- **Files modified:** `app/api/manager/submissions/download/route.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `832a166` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 TypeScript type system mismatch)
**Impact on plan:** Auto-fix required for TypeScript correctness. No behavior change — same runtime types. No scope creep.

## Issues Encountered

None beyond the TypeScript type mismatch documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GET /api/manager/submissions/download is live and production-ready
- Phase 4 is complete: Manager submissions list (04-01), exception reports (04-02), and ZIP download (04-03) all delivered
- MGR-01 and MGR-02 requirements satisfied
- Phase 5 (if any) can integrate the download endpoint via a button/link that navigates to this URL post-finalClosureDate

---
*Phase: 04-manager-and-reports-api*
*Completed: 2026-02-26*
