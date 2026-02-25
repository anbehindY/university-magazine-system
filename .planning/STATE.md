# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.
**Current focus:** Phase 1 — Schema and Infrastructure

## Current Position

Phase: 1 of 5 (Schema and Infrastructure)
Plan: 2 of TBD in current phase
Status: In progress
Last activity: 2026-02-25 — Plan 01-02 complete (Nodemailer 6.x mailer singleton, .env.example documentation)

Progress: [██░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 2 min
- Total execution time: 0.07 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-schema-and-infrastructure | 2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (2 min)
- Trend: —

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
- ZIP: Use `archiver` with serial streaming — never `Promise.all()` prefetch of blobs (memory limit risk)

### Pending Todos

None yet.

### Blockers/Concerns

- **Blob URL expiry**: Verify whether stored `SubmissionFile.url` values have expiry before Phase 4 ZIP work. May need `generateSignedUrl()` at assembly time.
- **Comment visibility**: Manager and Guest views must explicitly exclude comment data even though comments sit on the same Submission record — enforce at API query level in Phase 4.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 01-02-PLAN.md — Phase 1 Plan 02 (Nodemailer mailer singleton) done. Ready for Plan 03.
Resume file: None
