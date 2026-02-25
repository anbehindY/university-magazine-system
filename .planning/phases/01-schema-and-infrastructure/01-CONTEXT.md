# Phase 1: Schema and Infrastructure - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the database schema to support all new features (two closure dates, submission-year linkage, selection flag, comment threads, faculty snapshot) and build two shared utility modules (`lib/closure-guard.ts` and `lib/mailer.ts`). Also update the admin UI to expose both closure date fields. No other user-facing UI in this phase.

</domain>

<decisions>
## Implementation Decisions

### Closure Date Migration
- Existing `closureDate` field on `AcademicYear` maps to `firstClosureDate` (the date that blocks new submissions)
- `finalClosureDate` is a new nullable field added alongside it
- The old `closureDate` column is removed — clean schema, no legacy column kept
- Both `firstClosureDate` and `finalClosureDate` are nullable; admin can set them separately after year creation
- Academic year opens for submissions immediately when created by admin (no separate start date)
- Admin UI updated in this phase to show both date fields, labelled **"First Closure Date"** and **"Final Closure Date"**

### Active Academic Year Detection
- `AcademicYear` gets a boolean `isActive` field; admin explicitly marks one year as active
- System enforces only one active year at a time (new activation deactivates the previous)
- If no academic year is active: student submission attempts return a clear error ("No active academic year — submissions are currently closed")
- Admin can change the active year even if submissions exist against it, but the system warns before allowing

### Historical Submissions
- Existing submissions (pre-migration) have `academicYearId = null` and are left as-is — they predate the year system
- `academicYearId` on `Submission` is nullable in the Prisma schema
- All new submissions must have `academicYearId` set (enforced at API level, not schema level)
- Reports filter to `academicYearId IS NOT NULL` — historical null-year submissions are excluded from reporting

### Mailer Configuration
- `SMTP_FROM` env var holds the From email address (e.g. `noreply@university.ac.uk`)
- Display name hardcoded as **"University Magazine System"** (no env var needed)
- Email failure handling: `console.error` only — fire-and-forget, no database log table
- `lib/mailer.ts` built as a general-purpose utility (not coordinator-only), suitable for future notification types

### Claude's Discretion
- Exact Prisma migration file naming and transaction strategy
- How `isActive` uniqueness is enforced (DB constraint vs application logic)
- `lib/closure-guard.ts` internal implementation details (caching strategy, etc.)
- `.env.example` comment copy

</decisions>

<specifics>
## Specific Ideas

- Both closure date fields should use a date picker in the admin UI (consistent with existing date picker component in `components/ui/date-picker.tsx`)
- The admin page for academic years already exists at `app/(management)/admin/page.tsx` — the two new fields should be added to the existing form, not a new page
- Warning when changing active year should appear inline in the admin UI (not a separate confirmation modal), using the existing alert/badge pattern

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-schema-and-infrastructure*
*Context gathered: 2026-02-26*
