# Project Research Summary

**Project:** University Magazine Contribution System — Subsequent Milestone
**Domain:** Academic editorial workflow / document submission and review
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

This project is a brownfield enhancement to an existing Next.js 15 / Prisma / PostgreSQL application that manages student magazine submissions. The subsequent milestone adds the full coordinator review workflow: comment threads between coordinators and students, submission selection for publication, Nodemailer email notifications, server-side ZIP download from Vercel Blob, statistical/exception reports, and two-tier closure date enforcement. Research across all four dimensions confirms this is a well-understood problem domain with established patterns — nothing in the feature set requires novel architecture. The principal decisions (Nodemailer 6.x, `archiver` for streaming ZIP, Prisma `$queryRaw` for multi-table aggregations, SWR polling for comments) are all HIGH confidence and map cleanly onto the existing layered architecture.

The most important finding that cuts across all four research areas is a schema migration prerequisite: the existing `AcademicYear` model has a single `closureDate` field, but the requirements imply two distinct dates (first closure blocks new submissions; final closure blocks all updates). Every feature in this milestone either reads or enforces a closure date. Getting the schema wrong here will cause silent enforcement failures across comment creation, selection flag toggling, ZIP download gating, and submission updates. This migration must be the first task — it is the highest-risk single point of failure in the entire milestone.

The second cross-cutting concern is faculty scope enforcement. Every coordinator-facing mutation route — comments, selection flag, metadata edits — must enforce `submission.user.facultyId === coordinator.facultyId` at the database query level, not the UI level. Research indicates this is the most commonly missed authorization check in systems with role-scoped data access. The remaining risks (ZIP memory/timeout, email fire-and-forget, N+1 report queries) are all well-documented and have clear, standard prevention strategies.

---

## Key Findings

### Recommended Stack

The existing stack requires only four new npm packages. No infrastructure changes are needed. `nodemailer ^6.9.x` handles SMTP email; version 7 is ESM-only and conflicts with the CommonJS/ESM hybrid resolution used by Prisma and better-auth in this project — stay on 6.x. `archiver ^7.0.x` handles streaming ZIP generation from remote Vercel Blob URLs using Node.js streams piped through a `TransformStream` into the HTTP `Response`. `@types/nodemailer` and `@types/archiver` provide TypeScript support. For comment polling, `swr ^2.2.x` is the correct fit: it ships React 19 compatible hooks, handles deduplication and focus-revalidation, and a 15-second `refreshInterval` is adequate for the coordinator-reviewing-submissions workflow — no real-time infrastructure is warranted or required.

All routes using `nodemailer` or `archiver` must explicitly declare `export const runtime = 'nodejs'` to prevent Vercel from deploying them to the Edge Runtime, where Node.js APIs (`net`, `tls`, streams) are unavailable. Prisma's built-in `groupBy`, `aggregate`, and `$queryRaw` handle all reporting requirements without additional libraries.

**Core technologies:**
- `nodemailer ^6.9.x`: SMTP email — spec-mandated; 6.x required for CommonJS compatibility
- `@types/nodemailer ^6.4.x`: TypeScript types — devDependency
- `archiver ^7.0.x`: Streaming ZIP — preferred over jszip for streaming support; no memory buffering of full archive
- `@types/archiver ^6.0.x`: TypeScript types — devDependency (verify exact version)
- `swr ^2.2.x`: Comment polling — lightweight, React 19 compatible, sufficient for low-frequency review workflow
- Prisma `$queryRaw` (existing): Multi-table aggregations — no additional analytics library needed

**Versions to verify before installing** (training data cutoff August 2025):
- `npm view nodemailer version`
- `npm view archiver version`
- `npm view @types/archiver version`
- `npm view swr version`

---

### Expected Features

All 10 table-stakes features, 4 differentiators, and 8 explicit anti-features are documented in detail in `FEATURES.md`. The summary below reflects what the roadmap must deliver.

**Must have (table stakes):**
- Dual closure date enforcement (first closure blocks new submissions; final closure blocks all edits) — institutional systems always enforce hard stops, not warnings
- Coordinator email notification on student submission — without it, coordinators have no reliable trigger to begin review
- Coordinator faculty-scoped submission list (SUBMITTED only, not DRAFT) — the core coordinator job surface
- Two-way comment threads (flat, append-only, coordinator and student only) — mandatory for structured feedback without email
- Selected-for-publication boolean flag on Submission — the editorial decision record; required by ZIP, Manager view, and Guest view
- Marketing Manager read-only view of all selected submissions across all faculties
- On-demand ZIP download of all selected submissions structured as `Faculty/Student/filename` — terminal Manager action
- Guest read-only view of selected submissions for their own faculty
- Statistical reports: contributions per faculty per year, percentage of total, distinct contributors per faculty per year
- Exception reports: submissions with no coordinator comment; submissions >14 days without coordinator comment

**Should have (differentiators — include in milestone, not blockers):**
- Inline exception highlighting in coordinator list view — surfacing exception state without navigation away
- Comment read/unread indicator for students — avoids students missing coordinator feedback
- Coordinator metadata edit (notes/title fields only — no file replacement) — annotating submissions for internal organisation
- Multi-coordinator email (all coordinators for a faculty receive notification) — robustness against staff changes

**Defer (explicitly out of scope — do not build):**
- Per-file comments (submission-level is correct)
- Coordinator file replacement (chain of custody integrity)
- Comment editing or deletion (audit trail integrity)
- Real-time WebSocket/SSE notifications
- Late submission bypass paths
- Pre-generated or scheduled ZIP archives
- Student-to-student visibility
- Rich text (markdown/HTML) comments

---

### Architecture Approach

The new features slot cleanly into the existing layered pattern (Presentation → API → Data Access → Auth) without disrupting existing component boundaries. New components are additive: `lib/mailer.ts` (Nodemailer singleton), `lib/closure-guard.ts` (shared closure date helper), and a new set of Route Handlers under `/api/coordinator/`, `/api/manager/`, and `/api/reports/`. The key architectural decisions are: email is fire-and-forget after DB write (SMTP failure must not fail the submission response); ZIP streaming uses `archiver` piped through a `TransformStream` to avoid buffering the full archive in memory; closure checks are centralised in a single shared utility called by every mutating route handler; faculty scope is enforced at the Prisma query level, not middleware or UI.

**Major components:**
1. `lib/closure-guard.ts` — Shared helper returning `{ firstClosed, finalClosed }` per active AcademicYear; called by all write routes
2. `lib/mailer.ts` — Nodemailer transporter singleton + `sendMail()` helper; fire-and-forget call pattern
3. `app/api/coordinator/submissions/[id]/comments/route.ts` — GET thread / POST comment; enforces faculty scope + final closure
4. `app/api/coordinator/submissions/[id]/select/route.ts` — PATCH `isSelected`; enforces faculty scope + final closure
5. `app/api/manager/submissions/download/route.ts` — ZIP streaming; MARKETING_MANAGER only; post-final-closure gate
6. `app/api/reports/route.ts` — Aggregation queries; role-scoped faculty filtering at Prisma query level

**New schema additions (one migration):**
- `AcademicYear.firstClosureDate DateTime?` and `AcademicYear.finalClosureDate DateTime?` — replace ambiguous single `closureDate`
- `Submission.isSelected Boolean @default(false)` — publication flag
- `Submission.facultyId String?` — snapshot at submission time for `groupBy` report queries (avoids raw SQL)
- `Submission.selectedAt DateTime?` and `Submission.selectedById String?` — audit trail
- `SubmissionComment` model — flat thread with `submissionId`, `authorId`, `body`, `createdAt` index on `submissionId`

---

### Critical Pitfalls

1. **Schema has one closure date, requirements need two** — add `firstClosureDate` and `finalClosureDate` to `AcademicYear` before writing any closure-gated code; one overloaded field causes silent enforcement failures across all new routes. This is the highest priority fix.

2. **Faculty scope not enforced on coordinator mutations** — every coordinator POST/PATCH route (comments, selection flag) must include `user: { facultyId: session.user.facultyId }` in the Prisma `where` clause; role check alone is insufficient. A coordinator can otherwise read or modify submissions from other faculties.

3. **Email sent synchronously, failure breaks submission** — always persist the submission first, return 200 to the student, then call `sendCoordinatorEmail().catch(console.error)` in a fire-and-forget pattern; never `await` email before the response.

4. **ZIP assembled in memory for all files simultaneously** — use `archiver` with serial fetching and streaming pipeline (fetch each blob serially, pipe to archive, pipe to `TransformStream`, return `Response(readable)`); a `Promise.all()` prefetch of all blobs will exhaust the Vercel 1 GB function memory limit on any substantial submission set.

5. **Report queries not role-scoped at the database level** — the faculty filter (`{ facultyId: session.user.facultyId }`) must be in the Prisma `where` clause for every coordinator and guest report query; never return a full dataset and filter client-side for access control. Also avoid N+1 patterns for exception reports — use `comments: { none: {} }` in the Prisma `where`, not a per-submission loop.

**Additional pitfalls to address by phase (see `PITFALLS.md` for full detail):**
- Time zone confusion on date-only `closureDate` comparisons (use full DateTime or combine with time fields)
- Comment route does not validate thread ownership on student replies
- No input validation (Zod is installed — use it on every new route's request body)
- No pagination on coordinator submission list (add `take`/`skip` from the start)
- ZIP available before final closure date (gate the download route server-side)
- Blob URL expiry during ZIP assembly (check `response.ok` before appending; re-generate URLs via SDK if needed)
- Email sent on every re-submission rather than only on first DRAFT → SUBMITTED transition

---

## Implications for Roadmap

Based on the feature dependency map in FEATURES.md and the build order in ARCHITECTURE.md, the natural phase structure is three phases with a strict dependency boundary between each.

### Phase 1: Schema Migration and Shared Infrastructure

**Rationale:** Every single feature in this milestone depends on schema changes that do not yet exist. Building any feature before the schema is in place means migrating mid-development with data already in non-test tables. The shared utilities (`closure-guard.ts`, `mailer.ts`) have no UI and can be verified with unit tests before any UI work begins.

**Delivers:** A complete, correct data model and two zero-UI utility modules that unlock all subsequent development. Developers can work on later phases with confidence the foundation is correct.

**Addresses:** All 10 table-stakes features depend on this phase.

**Implements schema additions:**
- `AcademicYear.firstClosureDate` + `finalClosureDate` (replaces ambiguous `closureDate`)
- `Submission.isSelected`, `selectedAt`, `selectedById`
- `Submission.facultyId` (snapshot for report groupBy)
- `SubmissionComment` model with index on `submissionId`

**Implements utilities:**
- `lib/closure-guard.ts` — `getActiveAcademicYear()`, `isPastFirstClosure()`, `isPastFinalClosure()`
- `lib/mailer.ts` — `sendMail()` with Nodemailer 6.x transporter singleton

**Avoids:** Pitfall 6.4 (ambiguous closure dates), Pitfall 2.3 (SMTP credentials in version control — set up env vars and `.env.example` here)

**Research flag:** Standard patterns — skip research-phase.

---

### Phase 2: API Layer — Coordinator and Closure Features

**Rationale:** With schema and shared utilities in place, the API layer can be built and tested independently of UI. Building API-first means the coordinator and manager views in Phase 3 can be built against real endpoints, not mocks.

**Delivers:** All server-side business logic: closure enforcement on existing submission routes, comment CRUD, selection flag, email notification trigger, ZIP generation endpoint, and the reports endpoint.

**Addresses (from FEATURES.md):**
- Hard closure enforcement (first + final)
- Coordinator notification email (including transition guard to prevent re-notification)
- Comment thread API (GET + POST, faculty-scoped, final-closure-gated)
- Selection flag API (PATCH, faculty-scoped, final-closure-gated)
- ZIP download API (MARKETING_MANAGER only, post-final-closure)
- Reports API (role-scoped at query level, single query for each report type)

**Uses (from STACK.md):**
- `nodemailer ^6.9.x` via `lib/mailer.ts`
- `archiver ^7.0.x` in ZIP route
- Prisma `$queryRaw` for multi-table aggregations in reports route

**Avoids:**
- Pitfall 1.1 + 6.2 (faculty scope on every coordinator mutation)
- Pitfall 2.1 (fire-and-forget email pattern)
- Pitfall 2.2 (faculty-scoped coordinator lookup)
- Pitfall 2.4 (transition guard for email deduplication)
- Pitfall 3.1 (streaming ZIP, not buffered)
- Pitfall 3.2 (final closure gate on ZIP route)
- Pitfall 3.3 (blob fetch response.ok check)
- Pitfall 5.1 + 5.4 (role scope enforced in Prisma query, not UI)
- Pitfall 5.2 (single `comments: { none: {} }` query, not N+1 loop)
- Pitfall 5.3 (date filter in Prisma `where`, not application-layer)
- Pitfall 6.1 (Zod validation on every route body)
- Pitfall 6.3 (pagination on coordinator submission list from the start)

**Research flag:** Standard patterns — skip research-phase. All patterns are well-documented in STACK.md and ARCHITECTURE.md.

---

### Phase 3: UI Layer — Coordinator, Manager, Reports, and Guest Views

**Rationale:** UI is built last, against real API endpoints. Each view is a thin presentation layer over already-tested business logic. The SWR polling for comment threads is configured here.

**Delivers:** All end-user-facing surfaces:
- Coordinator submission list (faculty-scoped, SUBMITTED only, with inline exception highlighting)
- Comment thread UI (`<CommentThread submissionId={id} />` extracted client component with SWR polling)
- Selected-for-publication toggle within coordinator view
- Marketing Manager selected-submissions view + ZIP download button with loading state
- Reports page (statistical + exception, role-scoped)
- Guest view (selected submissions, their faculty only)

**Addresses (differentiators from FEATURES.md):**
- Inline exception highlighting (D1) — fold into coordinator list, same query
- Comment read/unread state (D2) — add `readByStudent` to `SubmissionComment` if time permits
- Coordinator metadata edit (D3) — notes/title fields in coordinator view
- Multi-coordinator email (D4) — `findMany` in the email lookup, already correct pattern

**Uses (from STACK.md):**
- `swr ^2.2.x` for comment thread polling (`refreshInterval: 15000`, `mutate()` on POST)

**Avoids:**
- Pitfall 1.4 (extract `<CommentThread>` component, do not bolt comments onto existing 1,126-line submissions page)
- Pitfall 4.3 (server-side enforcement is the real gate; UI state is display-only)

**Research flag:** Standard patterns — skip research-phase. Component structure follows existing Next.js App Router route group patterns.

---

### Phase Ordering Rationale

- Phase 1 before everything: four separate schema gaps (closure dates, isSelected, facultyId snapshot, SubmissionComment) block all ten table-stakes features. A schema migration mid-development risks data integrity issues. Doing it first also forces the two-closure-date ambiguity to be resolved explicitly before any enforcement code is written.
- Phase 2 before Phase 3: API-first development means UI components are built against real data contracts. It also allows backend testing (curl/Postman) without any frontend complexity, isolating bugs to either layer.
- Phase 3 last: UI is the thinnest layer here. All access control, business logic, and data shaping happens server-side. Phase 3 is wiring components to endpoints.
- Differentiators (D1-D4) are folded into Phase 3 rather than a separate phase because they share the same UI surfaces as their table-stakes counterparts and add minimal extra scope.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library choices are well-established; the only uncertainty is exact patch versions (npm view to verify before install). Nodemailer 6.x / archiver / SWR are canonical choices for their respective problems. |
| Features | HIGH | Feature set derived from editorial management system conventions (OJS, Canvas SpeedGrader, ScholarOne) plus explicit project spec. Table stakes and anti-features are clear and non-controversial. |
| Architecture | HIGH | All patterns (fire-and-forget email, streaming ZIP, shared closure guard, faculty scope at query level) are standard Next.js App Router patterns with no novel integration risk. |
| Pitfalls | HIGH | Pitfall catalogue is specific and concrete, drawn from the actual codebase structure (CONCERNS.md referenced, existing 1,126-line submissions page noted). Prevention strategies are implementation-ready. |

**Overall confidence: HIGH**

### Gaps to Address

- **Exact npm versions:** Training data cutoff is August 2025. Run `npm view <package> version` for nodemailer, archiver, @types/archiver, and swr before installing. The version constraints in STACK.md are reliable for major version targeting but patch versions may have advanced.

- **`AcademicYear` schema migration strategy:** The existing `closureDate` field must be mapped to one of the two new closure date fields (`firstClosureDate` or `finalClosureDate`) or the existing field must be repurposed. The correct mapping depends on how the admin UI currently sets this date and what the university operations team expects. Clarify with the product owner before writing the migration.

- **Vercel Blob URL signing:** STACK.md notes that Blob URLs are direct HTTP (no per-request auth). PITFALLS.md notes they may be signed/time-limited. Verify whether stored `SubmissionFile.url` values have expiry, and if so whether the Vercel Blob SDK `generateSignedUrl()` or equivalent is needed at ZIP generation time. This is a moderate risk if files were uploaded months before ZIP generation.

- **Existing `closureDate` field usage:** If any existing UI or API code reads `AcademicYear.closureDate` by name, those references must be updated as part of the Phase 1 migration. A grep of the codebase for `closureDate` references is required before writing the migration.

- **Comment visibility for Marketing Manager:** FEATURES.md states comments are visible to coordinator and student only, not Marketing Manager or Guest. The Manager view must explicitly exclude comment data even though comments are on the same Submission record. This access control rule should be documented in the API layer.

---

## Sources

### Primary (HIGH confidence)
- `STACK.md` (2026-02-25) — Nodemailer, archiver, SWR, Prisma reporting patterns with code examples
- `FEATURES.md` (2026-02-25) — Feature classification, behavioural expectations, schema gap analysis
- `ARCHITECTURE.md` (2026-02-25) — Component boundaries, data flow, schema additions, build order
- `PITFALLS.md` (2026-02-25) — 18 specific pitfalls with prevention code patterns

### Secondary (MEDIUM confidence)
- Existing `package.json` — confirms Zod 4.3.6 installed, Prisma 7.3.0, Next.js 15; informs library compatibility decisions
- Existing `prisma/schema.prisma` — confirms single `closureDate` field, confirms no `Comment` model, confirms no `isSelected` field
- CONCERNS.md (referenced in PITFALLS.md) — confirms existing issues including 1,126-line submissions page and missing pagination

### Tertiary (LOW confidence)
- npm version data in STACK.md — training data cutoff August 2025; patch versions may be outdated; verify before installing
- Vercel Blob URL signing behaviour — not directly verified; noted as a risk requiring validation during implementation

---

*Research completed: 2026-02-25*
*Ready for roadmap: yes*
