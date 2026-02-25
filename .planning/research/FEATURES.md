# FEATURES.md — University Document Submission/Review Systems

**Research type:** Project Research — Features dimension
**Milestone context:** Subsequent (coordinator review, email notifications, closure enforcement, ZIP download, guest access, statistical/exception reports)
**Date:** 2026-02-25

---

## What This Research Covers

This document analyses what features university document submission and review systems typically ship, drawn from editorial management systems (Open Journal Systems, ScholarOne, Editorial Manager), institutional repositories (DSpace, ePrints), LMS assignment submission (Canvas SpeedGrader, Turnitin), and magazine/publication workflow tools.

The goal is to identify what is table stakes for this kind of system, what is genuinely differentiating within the scope defined, and what to deliberately avoid building.

---

## Table Stakes

These are features users expect by default. Their absence creates friction or breaks trust. Not having them causes users to work around the system or lose confidence in it.

### 1. Closure date enforcement — hard stops, not warnings

**What it is:** Preventing submission creation after the first closure date, and preventing all edits (including comments) after the final closure date. The system enforces the rule rather than just displaying a warning.

**Why it is table stakes:** Every institutional submission system enforces submission windows. Soft warnings that users can ignore are not acceptable in graded or contractual contexts. A hard stop that shows a clear, contextual message (e.g. "Submissions closed on 15 March 2026") is the minimum. The two-date model (new submissions blocked, then all edits blocked) is standard in academic publishing.

**Complexity:** Low to medium. The logic is a date comparison at the API layer. The complexity is in getting the UX messaging right — students need to know *which* window has closed and *why* their action is blocked, not just see a generic 403.

**Dependencies:** AcademicYear model must have both closure dates reliably set. The `closureDate` field currently exists but the schema does not show a separate `finalClosureDate` — this is a schema gap to resolve before implementation.

**Current schema note:** `AcademicYear` has a single `closureDate` field. The PROJECT.md references two dates ("first closure date" and "final closure date"). The schema needs a second date field before closure enforcement can be built correctly.

---

### 2. Coordinator notification on student submission

**What it is:** An email sent to the relevant faculty's coordinator when a student moves a submission from DRAFT to SUBMITTED.

**Why it is table stakes:** Without notification, coordinators must poll the system. In editorial contexts, email notification on receipt is so standard that its absence is a workflow failure. The coordinator has no reliable trigger to begin their review.

**Complexity:** Low. Nodemailer + Gmail SMTP is already planned. The trigger point is the `PUT /api/submissions` route when status transitions from DRAFT to SUBMITTED. The email content is simple: student name, faculty, submission timestamp, link to review. The main concern is reliably looking up the coordinator for the submitting student's faculty.

**Dependencies:** Submission must carry a facultyId (inherited from the student's user record). The coordinator lookup requires querying users by `role = MARKETING_COORDINATOR AND facultyId = X`. There may be more than one coordinator per faculty — the system should email all of them.

---

### 3. Coordinator review view — faculty-scoped list

**What it is:** A page where the coordinator sees all SUBMITTED submissions from students in their own faculty. Not a global view.

**Why it is table stakes:** This is the core coordinator job. Without a review interface there is nothing to do. Faculty scoping is required both because coordinators are accountable only for their faculty and because a global view would expose student work across faculties, which is a privacy concern.

**Complexity:** Low. It is a filtered query: `submission WHERE user.facultyId = coordinator.facultyId AND status = SUBMITTED`. The complexity increases slightly when adding sort/filter controls (by date, by selection status).

**Dependencies:** Faculty scoping must be enforced at the API layer (already noted as a project constraint). The coordinator view page is in `(management)` route group.

---

### 4. Comment threads — two-way, submission-level

**What it is:** A coordinator can add a comment on a submission; the student can reply. A simple thread (not a nested tree). All parties can see the full thread.

**Why it is table stakes:** Without a comment mechanism, coordinators have no structured way to give feedback and students have no way to respond in context. Email-based feedback is error-prone and untracked. Every editorial system from basic LMS assignments to full peer-review platforms provides in-system commenting.

**Complexity:** Medium. Requires a new `Comment` model with `submissionId`, `authorId`, `body`, `createdAt`. The UI needs to display a thread and allow either party to post. Access control: coordinator can comment on any submission in their faculty; student can comment only on their own submissions; neither can edit or delete comments (this is standard in editorial systems — the record must remain intact).

**Key behaviour expectations:**
- Comments are append-only (no edit, no delete) — this is table stakes in any system where comments feed into an exception report
- Both parties see the full thread
- Comments are visible to coordinator and student only — not to Marketing Manager or Guest (they see the submission, not the internal communication thread)
- Timestamp and author name displayed on each comment

**Dependencies:** New `Comment` table. The 14-day exception report depends on `submittedAt` vs the existence of any coordinator comment — so coordinator comment authorship must be queryable separately from student replies.

---

### 5. Selected-for-publication flag

**What it is:** A boolean on the submission that the coordinator can toggle to mark work as selected.

**Why it is table stakes:** This is the editorial decision record. Without it, the Marketing Manager has no way to know which submissions are approved for publication, and the ZIP download feature has nothing to filter on.

**Complexity:** Low. One boolean field (`selectedForPublication`) on the `Submission` model. A toggle button in the coordinator UI. The Marketing Manager view filters on this flag.

**Dependencies:** Required before the ZIP download feature and the Marketing Manager view can be built. The flag should only be settable by coordinators for their faculty's submissions — not by students.

---

### 6. Marketing Manager selected-submission view

**What it is:** A read-only view of all submissions flagged as selected, across all faculties. The Manager sees metadata (student name, faculty, files list) but cannot comment or change selections.

**Why it is table stakes:** The Marketing Manager's job is to compile the magazine. They need to see what has been selected. Without this view they are dependent on coordinators communicating selections by other means.

**Complexity:** Low. A filtered query across all faculties: `submission WHERE selectedForPublication = true`. Read-only access. No commenting.

**Dependencies:** Selected-for-publication flag must exist. Manager role already defined.

---

### 7. ZIP download — all selected files, structured

**What it is:** On demand, the Marketing Manager downloads a ZIP archive containing all files (Word docs + images) from all selected submissions. Organised as `Faculty / StudentName / filename`.

**Why it is table stakes:** The Marketing Manager's terminal action in this system is to hand off content to production. A ZIP download is the standard delivery mechanism for document collections. Without it, the Manager must download files individually, which is impractical.

**Complexity:** Medium-high. This is the most technically complex table-stakes item. The files are stored on Vercel Blob — each file must be fetched by URL, then assembled into a ZIP archive in memory or on-disk before sending to the client. The `archiver` or `jszip` npm package handles in-memory ZIP creation. The main concern is memory: if many large files are selected, streaming the ZIP response is preferable to buffering it all in memory. For this system's scale (university magazine, not thousands of submissions) buffering is acceptable but the implementation should note the limitation.

**Expected behaviour:**
- Only available after the final closure date (enforced server-side)
- Organised as `FacultyName/StudentName/filename`
- File names should not collide (two students with the same name should be disambiguated by student ID or username)
- A loading state in the UI is needed because the operation takes time

**Dependencies:** Selected-for-publication flag. Final closure date enforcement. Vercel Blob URLs accessible server-side (they are — Blob URLs are direct HTTP, not authenticated per-request).

---

### 8. Guest read-only view — selected submissions for their faculty

**What it is:** A Guest (assigned to a faculty) can see the selected submissions from that faculty. Read-only. No comments, no downloads.

**Why it is table stakes:** The Guest role exists specifically for this purpose. Without this view the role has no utility.

**Complexity:** Low. Same query as coordinator view but filtered to `selectedForPublication = true` and with no action buttons.

**Dependencies:** Selected-for-publication flag. Faculty assignment on Guest user record.

---

### 9. Statistical reports — contributions, contributors, percentages

**What it is:**
- Count of submitted contributions per faculty per academic year
- Percentage of total contributions each faculty represents in a given year
- Count of distinct contributing students per faculty per academic year

**Why it is table stakes:** Academic administrators expect participation metrics. These three metrics are the minimum reporting suite for any institutional submission system. Without them, the system cannot demonstrate faculty engagement.

**Complexity:** Low-medium. These are aggregation queries on the `Submission` table joined to `User` (for faculty) and filtered by `AcademicYear`. The percentage calculation is derived from the total across all faculties. Prisma `groupBy` handles these well. The challenge is that submissions do not currently carry a direct `academicYearId` — they need to be linked to an academic year, either by a foreign key or by matching `submittedAt` against the year's date range.

**Current schema gap:** `Submission` has no `academicYearId`. Reports cannot be generated by academic year without this link or a date-range join. This is a schema change required before reporting can be built.

**Role scoping:**
- Coordinator: their faculty only
- Marketing Manager, Administrator: all faculties
- Guest: their faculty only

**Dependencies:** Academic year linkage on Submission. Selected submissions are not the only metric — the reports cover all SUBMITTED contributions, not just selected ones.

---

### 10. Exception reports

**What it is:**
- All submitted contributions that have no coordinator comment at all
- All submitted contributions submitted more than 14 days ago that still have no coordinator comment

**Why it is table stakes:** Exception reports are the quality-control mechanism. Without them, the system has no way to surface neglected submissions. In any editorial workflow with reviewer accountability, "no response after N days" reporting is standard.

**Complexity:** Low-medium. These are filtered queries: `submissions WHERE status = SUBMITTED AND no Comment from a COORDINATOR`. The 14-day variant adds `AND submittedAt < NOW() - 14 days`. The challenge is the join — to determine whether a submission has a coordinator comment, the query must check the Comment table for records where `authorId` maps to a user with role `MARKETING_COORDINATOR`.

**Expected behaviour:**
- 14 days is measured from `submittedAt`, not from the creation date
- Only coordinator comments count — student replies do not clear the flag
- Exception reports respect the same role scoping as statistical reports

**Dependencies:** Comment model. Submission must be linkable to coordinator authorship.

---

## Differentiators

These features go beyond minimum expectations and provide genuine workflow improvement within the scope of this system.

### D1. Inline exception highlighting in coordinator view

**What it is:** In the coordinator's submissions list, submissions that appear on the exception report (no comment, or no comment after 14 days) are visually flagged — e.g. a coloured badge or row highlight.

**Why it differentiates:** Most document systems make exception reports a separate page. Surfacing the information inline in the primary work view means coordinators act on it without having to navigate away. It turns a passive report into an active prompt.

**Complexity:** Low. The same query logic that generates the exception report is applied to decorate list items. One additional boolean per row computed at query time.

**Dependencies:** Comment model. Coordinator view list.

---

### D2. Comment read/unread state for students

**What it is:** When a coordinator adds a comment, the student sees a visual indicator (badge count, "new" label) that there is an unread comment on their submission.

**Why it differentiates:** Without this, students must visit each submission to check for feedback. Read receipts or unread indicators are common in LMS systems but not always present in simpler document systems.

**Complexity:** Medium. Requires either a `readAt` timestamp per user per comment, or a simpler "last read" timestamp per submission per user. The simpler approach is a `Comment` field `readByStudent Boolean @default(false)` that is set when the student views the submission detail. This introduces statefulness in the comment model.

**Dependencies:** Comment model. Student submission detail view.

---

### D3. Coordinator metadata edit — notes and title

**What it is:** The coordinator can add or edit a notes field and/or a title on a submission (not the student's file — just administrative metadata).

**Why it differentiates:** Coordinators sometimes need to tag or annotate submissions for internal organisation. This is already called out in the requirements but is worth noting as differentiating relative to pure read-only reviewer access, which is what most simple systems provide.

**Complexity:** Low. The `Submission` model already has a `notes` field. A title field may need to be added. The coordinator edit form is restricted to these metadata fields — the student's uploaded files are not touched.

**Dependencies:** None beyond the existing schema.

---

### D4. Per-faculty coordinator email — multiple coordinators

**What it is:** If more than one user has the `MARKETING_COORDINATOR` role for a faculty, all of them receive the notification email.

**Why it differentiates:** Most simple notification systems only handle a 1:1 relationship. Supporting multiple coordinators per faculty makes the system robust against staff turnover and makes it usable in larger faculties.

**Complexity:** Low. The coordinator lookup query returns all matching users. The email loop sends to each.

**Dependencies:** Email notification (table stakes item 2).

---

## Anti-Features

These are features to deliberately not build. They are either out of scope by design, introduce complexity that exceeds value, or would compromise the integrity of the system.

### A1. Per-file comments

**Do not build.** Comments are at the submission level. Per-file commenting requires a more complex data model, a more complex UI, and produces a fragmented review record. The coordinator's job is to accept or reject the submission as a whole. File-level annotation is an MS Word reviewer feature, not a submission system feature.

---

### A2. Coordinator can replace or re-upload student files

**Do not build.** The system's integrity depends on the student's submitted files being exactly what the student uploaded. Allowing coordinators to replace files would break the chain of custody and could expose the university to academic integrity disputes. Coordinators edit metadata only.

---

### A3. Comment editing or deletion

**Do not build.** Comments feed into exception reports and accountability tracking. An editable comment record can be manipulated to hide the fact that a coordinator never responded within 14 days. Append-only is the correct model for audit-sensitive workflows.

---

### A4. Real-time notifications / WebSocket updates

**Do not build.** The system uses email for notifications and page refresh for viewing updates. Adding WebSocket or SSE infrastructure for live updates is disproportionate for a system with low concurrent usage (one university, one annual cycle, limited simultaneous sessions). Email is sufficient as the notification channel.

---

### A5. Student can submit after final closure date

**Do not build.** The final closure date is a hard stop. There must be no override path for students, no extension request workflow, and no admin bypass that operates through the student interface. If an administrator needs to accept a late submission, that is an out-of-band process (direct database operation). Building a soft bypass in the UI creates pressure to use it.

---

### A6. ZIP generation on a schedule or background job

**Do not build.** ZIP generation is on-demand by the Marketing Manager after final closure. There is no need for pre-generation, caching, or background jobs. The file count for a university magazine is bounded (hundreds of files at most). On-demand generation keeps the architecture simple and eliminates a class of stale-cache bugs.

---

### A7. Student-to-student visibility

**Do not build.** Students must not see each other's submissions. The submission API is scoped strictly to `userId = currentUser.id`. No "class view" or "peer review" mode is in scope.

---

### A8. Rich text comments (markdown, HTML)

**Do not build.** Plain text comments are sufficient and safer. Rich text input requires sanitisation to prevent XSS, adds editor complexity, and is not needed for the brief coordinator-student feedback loop in this context.

---

## Feature Dependencies Map

```
AcademicYear (two closure dates)
  └── Closure date enforcement
        └── ZIP download (blocked until final closure)

Submission.selectedForPublication flag
  └── Coordinator review view (toggle)
  └── Marketing Manager view (filter)
  └── ZIP download (filter)
  └── Guest view (filter)

Comment model
  └── Two-way comment threads
  └── Exception report — no comment
  └── Exception report — no comment after 14 days
  └── Inline exception highlighting (D1)
  └── Comment read state (D2)

Submission.academicYearId (schema gap)
  └── Statistical reports by year
  └── Exception reports scoped to year

Email (Nodemailer)
  └── Coordinator notification on submission
  └── Multi-coordinator support (D4)
```

---

## Schema Gaps Identified

The following gaps between the current schema and the features above must be resolved before implementation:

| Gap | Impact | Feature blocked |
|-----|--------|----------------|
| `AcademicYear` has only one `closureDate` field; two are needed (`firstClosureDate`, `finalClosureDate`) | Closure enforcement cannot distinguish between blocking new submissions vs blocking all edits | Closure enforcement, ZIP download gating |
| `Submission` has no `academicYearId` or equivalent academic year linkage | Reports cannot be scoped to a year without a date-range join, which is fragile | Statistical reports, exception reports |
| No `Comment` model | Comments, exception reports, and comment read state all require this table | Comment threads, all exception reports |
| `Submission` has no `selectedForPublication` boolean | Cannot identify selected work | Coordinator review, Manager view, ZIP download, Guest view |

---

## Complexity Summary

| Feature | Category | Complexity |
|---------|----------|------------|
| Closure date enforcement | Table stakes | Low-medium |
| Coordinator email notification | Table stakes | Low |
| Coordinator faculty-scoped list | Table stakes | Low |
| Comment threads (two-way) | Table stakes | Medium |
| Selected-for-publication flag | Table stakes | Low |
| Marketing Manager selected view | Table stakes | Low |
| ZIP download | Table stakes | Medium-high |
| Guest read-only view | Table stakes | Low |
| Statistical reports | Table stakes | Low-medium |
| Exception reports | Table stakes | Low-medium |
| Inline exception highlighting | Differentiator | Low |
| Comment read/unread state | Differentiator | Medium |
| Coordinator metadata edit | Differentiator | Low |
| Multi-coordinator email | Differentiator | Low |

---

## Behavioural Expectations — Detail

### Comment threads

- **Who can comment:** Coordinator on any submission in their faculty. Student on their own submissions. No other role.
- **Visibility:** Only the coordinator assigned to the faculty and the submitting student. Marketing Manager and Guest do not see comment threads.
- **Ordering:** Chronological ascending. Newest comment at the bottom (conversation convention).
- **No edit, no delete.** Thread is append-only.
- **Threading model:** Flat thread (not nested replies). A reply is just another comment on the same submission with the same thread. This is sufficient for the two-party use case.
- **Empty state:** "No comments yet" with a prompt for the coordinator to add feedback.
- **After final closure:** New comments should also be blocked after the final closure date. The coordinator should not be able to add new feedback once all edits are frozen.

### Coordinator review workflow

- **Entry point:** Coordinator lands on a submissions list filtered to their faculty, showing only SUBMITTED status (DRAFT submissions are the student's private working area — coordinators do not see drafts).
- **Sort default:** Most recently submitted first. This surfaces the newest work and the oldest unreviewed items depend on the exception report, not the sort order.
- **Actions available per submission:** View files (read-only), add comment, toggle selected-for-publication, edit metadata (notes/title).
- **Selection is not final until the system is closed:** The coordinator can select and deselect up to the final closure date. After final closure, selections are frozen.
- **The coordinator does not approve or reject in a workflow sense.** There is no APPROVED/REJECTED status. "Selected for publication" is the only binary decision. Submissions that are not selected simply remain in the system unselected.

### Statistical reporting

- **Scope of "contributions":** This counts SUBMITTED submissions, not DRAFT. A student with a DRAFT that was never submitted does not count.
- **Scope of "contributors":** Distinct students who have at least one SUBMITTED submission in the given academic year.
- **Percentage calculation:** Faculty count divided by total count across all faculties for the same academic year. If total is zero, percentage is zero (avoid divide-by-zero).
- **Academic year linkage:** Reports must be filterable by academic year. This requires either a `academicYearId` foreign key on `Submission` or a reliable date-range match. The foreign key is strongly preferable — date-range joins are fragile if academic years overlap or have gaps.
- **Display format:** A table per academic year showing faculty rows with count, contributor count, and percentage columns. A summary row for totals.

---

*Research complete. Feeds into requirements definition and schema planning.*
