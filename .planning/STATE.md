# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.
**Current focus:** Phase 3 — Coordinator and Comment API

## Current Position

Phase: 3 of 5 (Coordinator and Comment API)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-26 — Plan 03-03 complete (Full comment POST/GET with role-scoped enforcement; coordinator email notification on first SUBMITTED transition)

Progress: [█████████░] 48%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 2 min
- Total execution time: 0.20 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-schema-and-infrastructure | 4 | 8 min | 2 min |
| 02-closure-enforcement | 3 | 4 min | 1 min |
| 03-coordinator-and-comment-api | 3 | 5 min | 2 min |

**Recent Trend:**
- Last 5 plans: 02-02 (1 min), 02-03 (1 min), 03-01 (1 min), 03-02 (1 min), 03-03 (3 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- **Blob URL expiry**: Verify whether stored `SubmissionFile.url` values have expiry before Phase 4 ZIP work. May need `generateSignedUrl()` at assembly time.
- **Comment visibility**: Manager and Guest views must explicitly exclude comment data even though comments sit on the same Submission record — enforce at API query level in Phase 4.

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 03-03-PLAN.md — Phase 3 Plan 03 (Full comment POST/GET with role-scoped enforcement; coordinator email notification on first SUBMITTED transition) done.
Resume file: None
