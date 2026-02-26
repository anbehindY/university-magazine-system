# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.
**Current focus:** Phase 5 — UI Layer

## Current Position

Phase: 5 of 5 (UI Layer)
Plan: 1 of 5 in current phase
Status: Plan 05-01 complete
Last activity: 2026-02-26 — Plan 05-01 complete (SWR installed, Tabs component, role-based sidebar, faculty name display, guest submissions API, academic-years id fix; GUEST-01)

Progress: [██████████████] 65%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 2 min
- Total execution time: 0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-schema-and-infrastructure | 4 | 8 min | 2 min |
| 02-closure-enforcement | 3 | 4 min | 1 min |
| 03-coordinator-and-comment-api | 3 | 5 min | 2 min |
| 04-manager-and-reports-api | 3 | 7 min | 2 min |
| 05-ui-layer | 1 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 03-03 (3 min), 04-01 (2 min), 04-02 (3 min), 04-03 (2 min), 05-01 (3 min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 3-phase research recommendation expanded to 5 phases (standard depth) — CLOS split from COORD/COMM to create cleaner, independently verifiable delivery boundaries
- Schema (01-01): closureDate mapped to firstClosureDate; finalClosureDate added as separate field — both nullable DateTime on AcademicYear
- Schema (01-01): isActive flag added to AcademicYear; single-active-year invariant enforced via prisma.$transaction in PUT handler
- Schema (01-01): Public academic-years GET now queries isActive:true — replaces date-ordering heuristics
- Schema (01-01): Prisma DROP+ADD accepted (not RENAME) for dev database — no production data to preserve
- Email (01-02): Nodemailer 6.x required (not 7.x) — ESM-only conflict with Prisma/better-auth CommonJS resolution; globalForMailer singleton pattern; sendMail() fire-and-forget via .catch(console.error)
- Closure guard (01-03): End-of-day cutoff via setHours(23, 59, 59, 999) before Date.now() comparison — avoids midnight UTC boundary issue; no caching, no date-fns; returns false (not throw) for null dates or no active year
- Admin UI (01-04): PATCH handler added for activation-only path — PUT requires full form fields, Activate button sends only {id, isActive:true}; inline warning instead of confirmation modal per CONTEXT.md
- ZIP: Use `archiver` with serial streaming — never `Promise.all()` prefetch of blobs (memory limit risk)
- Submissions (02-01): Two-call pattern in POST — isPastFirstClosure() for gate, getActiveAcademicYear() separately for id; facultyId via prisma.user.findUnique not session
- Submissions (02-01): PUT agreed guard uses effectiveAgreed = body.agreed ?? existing.agreed — consults persisted value when body omits agreed field
- File routes (02-02): DELETE gated on finalClosure only — students can delete drafts after first closure; final closure blocks all file removes per CLOS-02
- Blob gate (02-02): throw in onBeforeGenerateToken (not onUploadCompleted) — token must be refused before CDN upload begins to avoid orphaned blobs
- Comments stub (02-03): Route stub pattern used — auth gate (401) → closure gate (403) → 501 fallback; Phase 3 replaces 501 branch with full SubmissionComment logic
- Schema migration (03-01): self-referential relation uses named string "CommentReplies" with onDelete:SetNull — deleting parent comment nullifies children's parentId rather than cascading delete
- Schema migration (03-01): title field placed after agreed field in Submission as nullable String? @db.Text with no default — existing submissions get NULL
- Comments (03-03): session.user.role cast as string for Prisma authorRole — role guards above ensure non-null at create point; safe cast
- Email (03-03): isFirstSubmission check uses existing.submittedAt === null — deduplication uses already-selected field, no extra query needed; sendMail is fire-and-forget (.catch(console.error))
- Manager submissions (04-01): Faculty name resolved via separate prisma.faculty.findMany() + Map<string, string> — Submission.facultyId is a snapshot string with no ORM relation to Faculty; application-layer sort used because Prisma orderBy cannot sort by resolved names
- Reports (04-02): $queryRaw with Prisma.sql for statistical aggregation — COUNT(DISTINCT) not available in Prisma ORM; BigInt from COUNT converted via Number() before JSON serialization
- Reports (04-02): Prisma findMany with nested none filter for exceptions — comments.none.authorRole=MARKETING_COORDINATOR; native ORM filter preferred over raw SQL when supported
- Reports (04-02): Unified type-routing pattern with shared scopedFacultyId setup — null means unrestricted (manager/admin), string means faculty-scoped (coordinator/guest)
- ZIP download (04-03): Inverted closure gate !(await isPastFinalClosure()) — the single endpoint in the project that blocks BEFORE the date; all others block after. Serial blob fetching via IIFE for-loop, never Promise.all()
- ZIP download (04-03): NodeWebReadableStream import alias (import type { ReadableStream as NodeWebReadableStream } from "stream/web") resolves TypeScript mismatch between global ReadableStream and stream/web types for Readable.fromWeb parameter
- Sidebar (05-01): buildPages() uses switch/case — clean role mapping, no implicit fallthrough, empty array default for unknown roles
- NavUser (05-01): Faculty name fetched via useEffect + /api/faculties, displayed as "role · Faculty Name" inline — fire-and-forget fetch, no spinner
- Tabs (05-01): Uses same radix-ui monorepo import pattern as Switch component: import { Tabs as TabsPrimitive } from "radix-ui"
- Guest API (05-01): Same guard order as coordinator — session → role → prisma.user.findUnique facultyId → isSelected=true query

### Pending Todos

None yet.

### Blockers/Concerns

None — Phase 5 Plan 01 complete. Foundation laid for all Wave 2 UI pages.

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 05-01-PLAN.md — Phase 5 Plan 01 (SWR installed, Tabs component, role-based sidebar, faculty name display, guest submissions API, academic-years id fix; GUEST-01) done.
Resume file: None
