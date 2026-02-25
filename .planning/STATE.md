# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.
**Current focus:** Phase 1 — Schema and Infrastructure

## Current Position

Phase: 1 of 5 (Schema and Infrastructure)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-25 — Roadmap created, requirements mapped to 5 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 3-phase research recommendation expanded to 5 phases (standard depth) — CLOS split from COORD/COMM to create cleaner, independently verifiable delivery boundaries
- Schema: Existing `closureDate` on `AcademicYear` must be mapped to `firstClosureDate` or `finalClosureDate` before migration — verify with product owner which date it represents
- Email: Nodemailer 6.x required (not 7.x) — ESM-only conflict with Prisma/better-auth CommonJS resolution
- ZIP: Use `archiver` with serial streaming — never `Promise.all()` prefetch of blobs (memory limit risk)

### Pending Todos

None yet.

### Blockers/Concerns

- **Schema gap**: Existing `AcademicYear.closureDate` field — must determine if it maps to `firstClosureDate` or `finalClosureDate` before writing Phase 1 migration. Grep codebase for `closureDate` references first.
- **Blob URL expiry**: Verify whether stored `SubmissionFile.url` values have expiry before Phase 4 ZIP work. May need `generateSignedUrl()` at assembly time.
- **Comment visibility**: Manager and Guest views must explicitly exclude comment data even though comments sit on the same Submission record — enforce at API query level in Phase 4.

## Session Continuity

Last session: 2026-02-25
Stopped at: Roadmap created, STATE.md initialized. No plans written yet.
Resume file: None
