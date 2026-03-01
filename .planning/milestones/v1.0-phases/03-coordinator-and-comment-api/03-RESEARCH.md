# Phase 3: Coordinator and Comment API - Research

**Researched:** 2026-02-26
**Domain:** Next.js App Router API routes, faculty-scoped access control, Nodemailer email triggers, comment thread data model
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Email notification design**
- Trigger: fire once on the **first** SUBMITTED transition only — when `submittedAt` is null before the PUT and becomes set
- Deduplication: check `submittedAt` field — if already set, the submission was previously submitted, skip the email
- Content: link + student name + submission title (minimal, enough to act on)
- Link target: coordinator dashboard (`/coordinator/submissions`) — generic, always valid regardless of Phase 5 routing

**Comment thread model**
- Structure: flat list with optional `parentId` — replies supported at data level, UI rendering is Phase 5's responsibility
- Authors: coordinators can POST a comment on any submission in their faculty; students can POST a reply on their own submission only; cross-faculty coordinators receive 403
- Mutability: immutable once posted — no edit or delete
- Schema fields: `content`, `authorId`, `submissionId`, `parentId` (nullable), `createdAt` — no additional fields needed for Phase 3

**Selection semantics (isSelected)**
- Multiple selections allowed per faculty — `isSelected` is a simple boolean per submission, any number can be true simultaneously
- Toggle: free toggle in both directions
- Lock: both `isSelected` and `notes` PATCH operations blocked after `finalClosureDate` (consistent with CLOS-02 closure model)
- Notes field: free-text string, no format constraints, no length limit imposed at API level

**Coordinator GET response shape**
- Filter: SUBMITTED status only — drafts are not visible to coordinators
- Fields per submission: `id`, `title`, `status`, `studentName`, `submittedAt`, `isSelected`, `notes`, `fileCount` (metadata only — no files array)
- Pagination: none — return all matching submissions as a flat array
- Sort: `submittedAt` descending — newest submissions first

**Implementation details (from Specifics)**
- Email triggered synchronously inside the same PUT handler that transitions to SUBMITTED status
- Faculty scoping must be enforced server-side on every request — coordinator's `facultyId` from session or DB lookup, never from request body

### Claude's Discretion

- Email link target implementation detail (coordinator dashboard URL format)
- Toggle direction for `isSelected` (free toggle chosen as most practical)
- Error message wording for 403 responses on cross-faculty access
- How `fileCount` is computed (join vs count aggregation)
- Whether comment GET is a sub-resource on submissions or a standalone `/api/comments?submissionId=...` endpoint

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COORD-01 | Marketing Coordinator can view only SUBMITTED submissions belonging to students in their assigned faculty | `GET /api/coordinator/submissions` — faculty-scoped Prisma query via coordinator's `facultyId`; status filter `SUBMITTED` only |
| COORD-02 | Marketing Coordinator receives an email notification (via SMTP) when a student submits (transitions DRAFT → SUBMITTED) | Fire `sendMail()` in the student PUT handler when `existing.submittedAt` is null; deduplicated by `submittedAt` check |
| COORD-03 | Marketing Coordinator can mark or unmark a submission as "Selected for Publication" (toggleable boolean flag) | `PATCH /api/coordinator/submissions/[id]` — toggle `isSelected` with `finalClosureDate` gate; faculty ownership check |
| COORD-04 | Marketing Coordinator can edit the notes field on a submission | `PATCH /api/coordinator/submissions/[id]` — update `notes` field with `finalClosureDate` gate; faculty ownership check |
| COMM-01 | Marketing Coordinator can add a comment to any submission in their faculty | `POST /api/comments` — replace the Phase 2 stub; faculty-scope check; `authorRole: "MARKETING_COORDINATOR"` |
| COMM-02 | Student can reply to comments on their own submission (two-way thread) | `POST /api/comments` — student author path; ownership check (submission.userId === session.user.id); `parentId` supplied |
| COMM-03 | Comment thread is visible only to the submission owner (student) and their faculty's coordinator(s) | GET on comments requires ownership or coordinator-of-faculty check; exposed via coordinator GET or a `/api/comments?submissionId=` sub-resource |
| COMM-04 | No new comments can be added to a submission after `finalClosureDate` | Already stubbed in Phase 2 as the first gate in `POST /api/comments`; stub is replaced with full implementation in Phase 3 |

</phase_requirements>

---

## Summary

Phase 3 builds four capabilities on top of the existing route infrastructure: a coordinator-scoped submissions list, an email trigger on first SUBMITTED transition, a full comment thread API replacing the Phase 2 stub, and coordinator-only PATCH endpoints for `isSelected` and `notes`. All enforcement is at the API layer.

Two schema gaps must be addressed before any implementation begins. The `Submission` model is missing a `title` field (required by the coordinator GET response shape and the email content per CONTEXT decisions), and the `SubmissionComment` model is missing a `parentId` column (required by the flat-with-replies thread model). Both require a Prisma migration. These are non-negotiable Wave 0 tasks — all other plans depend on them.

The established codebase patterns are consistent and should be followed exactly. Auth uses `auth.api.getSession({ headers: await headers() })`. Faculty scoping for coordinators follows the same DB-lookup pattern already present in the student submission POST handler (`prisma.user.findUnique` to get `facultyId`). Email is `sendMail().catch(console.error)` fire-and-forget, already established in `lib/mailer.ts`. The coordinator routes live under a new `/api/coordinator/` prefix to separate them cleanly from student routes.

**Primary recommendation:** Start with the schema migration (Wave 0), then build coordinator GET and the PATCH endpoints, then replace the comments stub with full POST/GET logic. The email trigger is added inside the existing student PUT handler.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lib/mailer.ts` | project-local | `sendMail()` — Nodemailer 6.x singleton for SMTP email | Already built and verified in Phase 1; fire-and-forget pattern documented in STATE.md |
| `lib/closure-guard.ts` | project-local | `isPastFinalClosure()` for PATCH and comment POST gates | Already built and used in Phase 2; import as-is |
| `auth.api.getSession()` | better-auth 1.4.18 | Session retrieval in route handlers | Established project pattern in every existing handler |
| `prisma` | 7.3.x | DB queries for faculty-scoped lookups, comment creation, submission PATCH | Project ORM |
| Next.js App Router | 16.1.6 | Route handlers at `app/api/coordinator/...` and `app/api/comments/route.ts` | Project framework |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/auth-helpers.ts` | project-local | `isCoordinator()` helper | Available; Phase 3 may use it for coordinator-role guard readability |
| Prisma `$count` aggregation | 7.3.x | Computing `fileCount` without loading file records | For the `fileCount` field in coordinator GET response |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Synchronous `sendMail().catch()` in route handler | Background queue / webhook | Queue adds infra complexity; synchronous is fine for low-volume faculty submissions and matches the STATE.md decision |
| Separate `/api/comments?submissionId=` GET | Comments included in coordinator submissions GET | Sub-resource is more RESTful and separates concerns; both workable. Recommendation below. |
| Prisma `_count` in `include` | Raw SQL COUNT | `_count` is idiomatic Prisma and avoids raw SQL |

**Installation:** No new packages required. All libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files and modifications for Phase 3:

```
app/api/
├── coordinator/
│   └── submissions/
│       ├── route.ts               # GET — faculty-scoped SUBMITTED list (COORD-01)
│       └── [id]/
│           └── route.ts           # PATCH — isSelected + notes (COORD-03, COORD-04)
├── comments/
│   └── route.ts                   # POST (replace stub) + GET (COMM-01, COMM-02, COMM-03, COMM-04)
└── submissions/
    └── route.ts                   # Existing — PUT handler gets email trigger (COORD-02)
```

The `/api/coordinator/submissions` prefix is clean, mirrors the established `/api/admin/` prefix pattern, and makes role intent explicit. The comment GET belongs on `GET /api/comments?submissionId=X` — a sub-resource approach that stays separate from the coordinator submissions list.

### Pattern 1: Faculty-Scoped Coordinator Guard

**What:** Every coordinator route must verify: (1) authenticated, (2) role is MARKETING_COORDINATOR, (3) fetch coordinator's `facultyId` from DB — never from request body.
**When to use:** Start of every handler in `/api/coordinator/`

```typescript
// Source: established project pattern (app/api/submissions/route.ts POST handler)
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
if (session.user.role !== "MARKETING_COORDINATOR") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
// NEVER trust facultyId from request body — always fetch from DB
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { facultyId: true },
});
if (!dbUser?.facultyId) {
  return NextResponse.json({ error: "Coordinator has no assigned faculty" }, { status: 403 });
}
const coordinatorFacultyId = dbUser.facultyId;
```

**Key insight:** `session.user.role` IS available from better-auth without a DB lookup — confirmed by existing admin routes that all check `session.user.role !== "ADMINISTRATOR"`. `facultyId` is NOT on the session type — it requires the `prisma.user.findUnique` call, consistent with the established two-call pattern in the student submission POST handler.

### Pattern 2: Coordinator Submissions GET (COORD-01)

**What:** Query submissions filtered by `status: SUBMITTED` and `facultyId: coordinatorFacultyId`, sorted by `submittedAt` descending. Return response shape with computed `fileCount` using Prisma `_count`.
**When to use:** `GET /api/coordinator/submissions`

```typescript
// Source: Prisma _count pattern — idiomatic for counting relations without loading records
const submissions = await prisma.submission.findMany({
  where: {
    status: "SUBMITTED",
    facultyId: coordinatorFacultyId,
  },
  orderBy: { submittedAt: "desc" },
  select: {
    id: true,
    title: true,          // NOTE: requires schema migration (title field does not exist yet)
    status: true,
    submittedAt: true,
    isSelected: true,
    notes: true,
    user: {
      select: { name: true },  // studentName
    },
    _count: {
      select: { files: true }, // fileCount
    },
  },
});
// Map to response shape
const result = submissions.map((s) => ({
  id: s.id,
  title: s.title,
  status: s.status,
  studentName: s.user.name,
  submittedAt: s.submittedAt,
  isSelected: s.isSelected,
  notes: s.notes,
  fileCount: s._count.files,
}));
```

### Pattern 3: Email Trigger on First SUBMITTED Transition (COORD-02)

**What:** Inside the student's `PUT /api/submissions` handler, after the submission update succeeds, check if this was the first SUBMITTED transition and fire email to all coordinators in the faculty.
**When to use:** In the existing `PUT /api/submissions` handler, after `prisma.submission.update()`

```typescript
// Source: STATE.md — "sendMail() fire-and-forget via .catch(console.error)"
// Source: lib/mailer.ts (confirmed sendMail signature)

// After prisma.submission.update(...)
// Only fire if this is the FIRST submission (existing.submittedAt was null before)
if (nextStatus === "SUBMITTED" && existing.submittedAt === null) {
  // Fetch coordinators for this faculty (submission.facultyId)
  const coordinators = await prisma.user.findMany({
    where: {
      role: "MARKETING_COORDINATOR",
      facultyId: submission.facultyId,
    },
    select: { email: true },
  });

  if (coordinators.length > 0) {
    const emails = coordinators.map((c) => c.email);
    sendMail({
      to: emails,
      subject: `New submission: ${submission.title ?? "Untitled"} — ${session.user.name}`,
      html: `<p>${session.user.name} has submitted a contribution.</p>
             <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/coordinator/submissions">View submissions</a></p>`,
      text: `${session.user.name} has submitted a contribution. Visit /coordinator/submissions.`,
    }).catch(console.error); // fire-and-forget: do not await
  }
}
```

**Critical detail:** `sendMail` must NOT be awaited — the route handler returns before the email resolves. Errors are swallowed via `.catch(console.error)` per the established decision in STATE.md.

**Deduplication:** `existing.submittedAt` is fetched in the PUT handler's `findFirst` call. If it is non-null, the submission was already submitted — skip the email entirely. The updated row already handles setting `submittedAt: existing.submittedAt ?? new Date()`.

### Pattern 4: Comment POST — Full Implementation Replacing Stub (COMM-01, COMM-02, COMM-04)

**What:** Replace the Phase 2 stub in `app/api/comments/route.ts`. The full POST handler determines author type (coordinator or student), enforces faculty/ownership scope, creates the SubmissionComment record.
**When to use:** `POST /api/comments`

```typescript
// Gate order: auth → finalClosure (COMM-04) → body validation → scope check → create

const body = await req.json();
const { submissionId, content, parentId } = body;

// Fetch the submission to check faculty and ownership
const submission = await prisma.submission.findUnique({
  where: { id: submissionId },
  select: { userId: true, facultyId: true },
});
if (!submission) {
  return NextResponse.json({ error: "Submission not found" }, { status: 404 });
}

const userRole = session.user.role;

if (userRole === "MARKETING_COORDINATOR") {
  // Coordinator: must belong to the same faculty
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { facultyId: true },
  });
  if (dbUser?.facultyId !== submission.facultyId) {
    return NextResponse.json({ error: "Forbidden: cross-faculty access" }, { status: 403 });
  }
} else if (userRole === "STUDENT") {
  // Student: can only reply on their own submission
  if (submission.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden: not your submission" }, { status: 403 });
  }
} else {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

const comment = await prisma.submissionComment.create({
  data: {
    submissionId,
    authorId: session.user.id,
    authorRole: userRole,
    body: content,
    parentId: parentId ?? null,  // NOTE: requires schema migration (parentId does not exist yet)
  },
});
```

**Note on schema field naming:** CONTEXT.md uses the field name `content` in the schema decisions, but the existing `SubmissionComment` model uses `body`. The existing `body` field should be kept. The request body field can be called `content` at the API layer and mapped to `body` in the Prisma write. Alternatively, keep `body` throughout. The planner should decide and be consistent.

### Pattern 5: Comment GET — Visibility Enforcement (COMM-03)

**What:** Comments are visible only to the submission owner (student) and their faculty's coordinator(s). A separate `GET /api/comments?submissionId=X` handler enforces this.
**When to use:** `GET /api/comments?submissionId=X`

```typescript
// GET /api/comments?submissionId=...
const { searchParams } = new URL(req.url);
const submissionId = searchParams.get("submissionId");

const submission = await prisma.submission.findUnique({
  where: { id: submissionId },
  select: { userId: true, facultyId: true },
});

// Authorize: owner or coordinator of same faculty
const isOwner = submission.userId === session.user.id;
const isCoordinator = session.user.role === "MARKETING_COORDINATOR";
if (isCoordinator) {
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { facultyId: true },
  });
  if (dbUser?.facultyId !== submission.facultyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
} else if (!isOwner) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

const comments = await prisma.submissionComment.findMany({
  where: { submissionId },
  orderBy: { createdAt: "asc" },
  include: { author: { select: { name: true, role: true } } },
});
```

### Pattern 6: Coordinator PATCH — isSelected and notes (COORD-03, COORD-04)

**What:** A single PATCH endpoint handles both `isSelected` toggle and `notes` update. Both require faculty ownership and `finalClosureDate` gate.
**When to use:** `PATCH /api/coordinator/submissions/[id]`

```typescript
// After coordinator guard (Pattern 1) and finalClosure check:
const submission = await prisma.submission.findUnique({
  where: { id: params.id },
  select: { facultyId: true, isSelected: true },
});
if (!submission) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
if (submission.facultyId !== coordinatorFacultyId) {
  return NextResponse.json({ error: "Forbidden: not your faculty" }, { status: 403 });
}

const updateData: { isSelected?: boolean; notes?: string | null } = {};
if (typeof body.isSelected === "boolean") {
  updateData.isSelected = body.isSelected;
}
if (body.notes !== undefined) {
  updateData.notes = body.notes ?? null;
}

const updated = await prisma.submission.update({
  where: { id: params.id },
  data: updateData,
});
```

**Selection audit trail (v2, not Phase 3):** `selectedAt` and `selectedById` are in the schema (from Phase 1) but populating them is a v2 concern (AUDIT-V2-01). Phase 3 does NOT need to set them. Planner should confirm this is correct based on REQUIREMENTS.md.

### Anti-Patterns to Avoid

- **Trusting facultyId from request body:** Faculty scope must always come from a DB lookup of the authenticated user. Never use `body.facultyId` or `req.headers` for this.
- **Awaiting sendMail():** The email call must be fire-and-forget. Awaiting it makes the coordinator email block the student's submission response time and risks timeout errors.
- **Fetching all submissions then filtering in JS:** Always filter at the Prisma query level (`where: { facultyId: coordinatorFacultyId, status: "SUBMITTED" }`). Never load all submissions and filter in memory.
- **Allowing student to POST a top-level comment (not reply):** Students can only POST replies (`parentId` must be non-null and point to an existing comment on their submission). Coordinators can POST top-level or reply. The API must validate this distinction.
- **Skipping the faculty check when coordinator patches:** A coordinator who knows a submission ID from another faculty could PATCH it without the faculty check. Always verify `submission.facultyId === coordinatorFacultyId` before any write.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Custom SMTP client or fetch-to-API | `sendMail()` from `lib/mailer.ts` | Already built with singleton, env config, and fire-and-forget pattern |
| Date closure check | Inline date comparison | `isPastFinalClosure()` from `lib/closure-guard.ts` | Handles null-safe, no-active-year, and end-of-day cutoff edge cases |
| Role checking | Inline `session.user.role === ...` everywhere | Check pattern is simple enough inline; `lib/auth-helpers.ts` has `isCoordinator()` available | Existing codebase uses inline checks — stay consistent |
| Comment visibility filter | Complex SQL join | Prisma `findMany` with `where: { submissionId }` after auth check | Prisma handles join; auth is the scope control |

**Key insight:** Phase 3 is a wiring exercise, not an implementation exercise — `lib/mailer.ts` and `lib/closure-guard.ts` are the full email and closure implementations. Phase 3 routes call them.

---

## Common Pitfalls

### Pitfall 1: Schema migration skipped — `title` and `parentId` do not exist

**What goes wrong:** The `Submission` model has no `title` field. The `SubmissionComment` model has no `parentId`. Both are required by CONTEXT.md decisions and the phase success criteria. Any implementation that references these fields will fail at compile time with Prisma generated types.

**Why it happens:** The CONTEXT.md decisions describe the desired state, not the current schema. The Phase 1 migration created `SubmissionComment` without `parentId` (it wasn't in scope at the time), and `Submission` was never given a `title` field.

**How to avoid:** The first plan in Phase 3 MUST be a schema migration plan that adds `title String? @db.Text` (nullable, dev data not critical) to `Submission` and `parentId String? @map("parent_id")` to `SubmissionComment`. Run `prisma migrate dev` before any route implementation plans.

**Warning signs:** TypeScript errors referencing `Property 'title' does not exist on type 'Submission'` or `Property 'parentId' does not exist on type 'SubmissionComment'`.

### Pitfall 2: Email fires on re-submission

**What goes wrong:** A student who submits, reverts to DRAFT (if permitted), then submits again triggers a second coordinator email. The coordinator receives duplicate notifications.

**Why it happens:** If the email trigger only checks `nextStatus === "SUBMITTED"` without also checking `existing.submittedAt === null`, every SUBMITTED transition fires an email.

**How to avoid:** Gate the email on `existing.submittedAt === null` — this is the first-submission condition. The existing PUT handler already selects `submittedAt` from the `findFirst` call; the check is a one-line addition.

### Pitfall 3: Student posts top-level comments (not replies)

**What goes wrong:** The CONTEXT decision is: "students can POST a reply on their own submission only." A student posting a top-level comment (no `parentId`) on their own submission should be rejected. But if the API only checks ownership and not `parentId`, students can create top-level comments.

**Why it happens:** Ownership check (`submission.userId === session.user.id`) is necessary but not sufficient for the student author path.

**How to avoid:** In the comment POST handler, when `session.user.role === "STUDENT"`, require that `parentId` is provided and is non-null. Return 400 if `parentId` is missing.

**Warning signs:** Success criterion 3 says "a student can POST a reply" — the word "reply" implies `parentId` required.

### Pitfall 4: facultyId is null for the coordinator

**What goes wrong:** A MARKETING_COORDINATOR user whose `facultyId` is null (misconfigured by admin) bypasses the faculty scope check because `null !== null` evaluates as `false` in JS strict equality, but `submission.facultyId !== null` could match all submissions if `coordinatorFacultyId` is also null.

**Why it happens:** Both coordinator and submission could have `facultyId: null`, and `null === null` is `true` in JavaScript — a coordinator with null facultyId would see all null-facultyId submissions.

**How to avoid:** After fetching `coordinatorFacultyId`, explicitly check `if (!coordinatorFacultyId)` and return 403 ("Coordinator has no assigned faculty"). Never proceed with a null `coordinatorFacultyId`.

### Pitfall 5: Comment GET is missing from API surface

**What goes wrong:** COMM-03 requires comment visibility to be enforced. If Phase 3 only implements `POST /api/comments` without a GET endpoint, there is no way for the student or coordinator to read the thread. The success criterion checks that the comment "appears in the thread" — which implies a readable thread.

**Why it happens:** The CONTEXT says "planner decides" on comment GET placement. If the planner assumes comments are embedded in the coordinator submissions GET, students (who use a different endpoint) would have no way to access comments.

**How to avoid:** Implement `GET /api/comments?submissionId=X` as a standalone endpoint with its own role-and-faculty guard. Both the student submission detail view and the coordinator view will use it.

### Pitfall 6: `body` vs `content` field name inconsistency

**What goes wrong:** The existing `SubmissionComment` model uses `body` for the comment text field. The CONTEXT.md schema decisions use `content` as the field name. If the implementation uses `content` at the Prisma layer (which doesn't exist), the schema must be migrated to rename `body` → `content`, or the API must translate.

**Why it happens:** CONTEXT.md describes desired API semantics, not the existing DB schema field names.

**How to avoid:** Keep the Prisma schema field as `body` (no rename migration needed). Accept `content` in the HTTP request body and map it to `body` in the Prisma write. Document this in the handler with a comment.

---

## Code Examples

Verified patterns from the existing codebase:

### Existing auth + role guard pattern (HIGH confidence)

```typescript
// Source: app/api/admin/academic-years/route.ts (established pattern)
const session = await auth.api.getSession({
  headers: await headers(),
});
if (!session?.user || session.user.role !== "ADMINISTRATOR") {
  return NextResponse.json(
    { error: "Unauthorized. Administrator access required." },
    { status: 403 }
  );
}
// For coordinator routes, replace "ADMINISTRATOR" with "MARKETING_COORDINATOR"
// Then add DB lookup for facultyId (session.user does not carry facultyId)
```

### DB lookup for facultyId (HIGH confidence)

```typescript
// Source: app/api/submissions/route.ts POST handler (established pattern)
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { facultyId: true },
});
// coordinatorFacultyId = dbUser?.facultyId
```

### Fire-and-forget email (HIGH confidence)

```typescript
// Source: lib/mailer.ts (confirmed API) + STATE.md (confirmed pattern decision)
import { sendMail } from "@/lib/mailer";

// Do NOT await — fire-and-forget
sendMail({
  to: coordinatorEmails,           // string | string[]
  subject: "New submission: ...",
  html: "<p>...</p>",
  text: "...",
}).catch(console.error);
```

### Prisma _count for fileCount (HIGH confidence — idiomatic Prisma)

```typescript
// Source: Prisma docs pattern — _count in select
const submissions = await prisma.submission.findMany({
  where: { status: "SUBMITTED", facultyId: coordinatorFacultyId },
  select: {
    id: true,
    _count: { select: { files: true } },
    // ... other fields
  },
});
// Access as: s._count.files
```

### submittedAt deduplication check (HIGH confidence)

```typescript
// Source: app/api/submissions/route.ts PUT handler (confirmed: selects submittedAt)
const existing = await prisma.submission.findFirst({
  where: { id: body.id, userId: session.user.id },
  select: {
    id: true,
    submittedAt: true,  // already selected in existing handler
    agreed: true,
  },
});
// First-submission guard:
const isFirstSubmission = nextStatus === "SUBMITTED" && existing.submittedAt === null;
```

---

## Schema Gaps (Critical — Wave 0)

These must be resolved in the first plan before any other implementation:

### Gap 1: `Submission.title` does not exist

**Current schema:** `Submission` has `id`, `userId`, `status`, `agreed`, `notes`, `submittedAt`, `files`, `isSelected`, `selectedAt`, `selectedById`, `facultyId`, `academicYearId`, `comments`.

**Missing:** `title String? @db.Text` (or `title String?` for VarChar)

**Required by:** CONTEXT GET response shape (`title` field), CONTEXT email content (`submission title`), Phase 3 success criterion 1 (coordinator GET response).

**Migration needed:**
```sql
ALTER TABLE "submission" ADD COLUMN "title" TEXT;
```

```prisma
model Submission {
  // ... existing fields
  title  String?  @db.Text
}
```

### Gap 2: `SubmissionComment.parentId` does not exist

**Current schema:** `SubmissionComment` has `id`, `submissionId`, `authorId`, `authorRole`, `body`, `createdAt`.

**Missing:** `parentId String? @map("parent_id")` with optional self-referential relation (or just a nullable string FK)

**Required by:** CONTEXT comment thread model ("flat list with optional parentId"), COMM-02 (student can POST a reply), Phase 3 success criterion 3.

**Migration needed:**
```sql
ALTER TABLE "submission_comment" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "submission_comment" ADD CONSTRAINT "submission_comment_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "submission_comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

```prisma
model SubmissionComment {
  // ... existing fields
  parentId  String?            @map("parent_id")
  parent    SubmissionComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies   SubmissionComment[] @relation("CommentReplies")
}
```

**Note on Prisma self-relations:** A nullable self-referential relation in Prisma requires both `parent` and `replies` sides defined with a named relation string. If the planner prefers simpler — just the raw `parentId String?` without the relation object — that is also viable since Phase 3 only writes the field, not traverses the tree. Phase 5 (UI) would traverse.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No coordinator API | Faculty-scoped coordinator routes at `/api/coordinator/` | Phase 3 (this phase) | Coordinators can access only their faculty's work |
| Comments stub returning 501 | Full comment POST + GET with role-scoped enforcement | Phase 3 (this phase) | CLOS-03 gate from Phase 2 stub is preserved; full thread logic is added |
| No email on submission | Fire-and-forget sendMail in student PUT handler | Phase 3 (this phase) | Coordinators notified synchronously on first SUBMITTED transition |

**Deprecated/outdated:**
- The Phase 2 comment stub (`app/api/comments/route.ts`) returns 501 for non-closure cases. Phase 3 replaces the `501` branch with the full implementation — the `isPastFinalClosure()` gate at the top is kept.

---

## Open Questions

1. **Should student reply require a non-null `parentId`?**
   - What we know: CONTEXT says "students can POST a reply on their own submission only." The word "reply" implies replying to an existing comment — which implies `parentId` is required for students.
   - What's unclear: Whether a student can post a top-level comment (parentId = null) or only replies (parentId = an existing comment id).
   - Recommendation: Treat student path as replies-only (parentId required). This matches the "reply" wording and preserves the intent that coordinators initiate the thread.

2. **Should `Submission.title` be nullable or required?**
   - What we know: Existing submissions in the database have no title. The schema has no title field. The CONTEXT says to include title in the email and GET response.
   - What's unclear: Should title be required at submission CREATE time (would require changing the student POST handler), or nullable (existing submissions get null, new submissions can optionally include it)?
   - Recommendation: Add as `title String? @db.Text` (nullable). Existing submissions get null; the GET response returns null for untitled submissions; the email falls back to "Untitled." Do NOT change the student POST handler in this phase — that belongs to Phase 5 UI work.

3. **`selectedAt` / `selectedById` population on PATCH isSelected?**
   - What we know: REQUIREMENTS.md lists `selectedAt` and `selectedById` in INFRA-02 for reporting and selection workflow. AUDIT-V2-01 in v2 requirements calls this the "Selection audit trail."
   - What's unclear: Phase 3 success criteria only mention toggling `isSelected` — no mention of populating `selectedAt` or `selectedById`.
   - Recommendation: Do NOT populate `selectedAt`/`selectedById` in Phase 3. These are v2 fields. The planner should confirm but the v2/AUDIT-V2-01 classification is clear.

---

## Sources

### Primary (HIGH confidence)

- `prisma/schema.prisma` — Full schema inspection; confirmed `Submission` has no `title`, `SubmissionComment` has no `parentId`, `User.email` confirmed, `User.facultyId` confirmed
- `prisma/migrations/20260225174304_phase1_schema/migration.sql` — Confirmed `SubmissionComment` created without `parent_id`
- `app/api/submissions/route.ts` — Full PUT handler read; confirmed `submittedAt` is selected in `findFirst`, confirmed facultyId DB-lookup pattern established
- `app/api/admin/academic-years/route.ts` — Confirmed `session.user.role` is available without DB lookup; established project role-check pattern
- `lib/mailer.ts` — Confirmed `sendMail()` signature: `{ to, subject, html, text? }`, returns `Promise<void>`
- `lib/closure-guard.ts` — Confirmed `isPastFinalClosure()` import for PATCH and comment POST gates
- `lib/auth-helpers.ts` — Confirmed `isCoordinator()` helper exists
- `.planning/STATE.md` — Confirmed `sendMail()` fire-and-forget `.catch(console.error)` decision; confirmed facultyId DB-lookup pattern
- `.planning/ROADMAP.md` — Phase 3 success criteria extracted verbatim
- `.planning/REQUIREMENTS.md` — COORD-01 through COORD-04, COMM-01 through COMM-04 descriptions confirmed
- `.planning/phases/03-coordinator-and-comment-api/03-CONTEXT.md` — All locked decisions incorporated

### Secondary (MEDIUM confidence)

- `app/api/comments/route.ts` (Phase 2 stub) — Confirmed the stub pattern to preserve; `isPastFinalClosure()` gate at top must be kept when replacing the 501 branch

### Tertiary (LOW confidence)

- Prisma self-referential relation syntax for `parentId` — based on Prisma training data knowledge; should be verified against Prisma 7.x docs if self-relation objects are used. If only the raw scalar `parentId String?` is added (no Prisma relation), this concern is eliminated.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in existing codebase; no new dependencies
- Architecture: HIGH — all patterns derived from direct codebase inspection; route structure follows established `/api/admin/` prefix analogy
- Schema gaps: HIGH — confirmed by direct schema and migration inspection; both `title` and `parentId` are absent
- Pitfalls: HIGH — derived from codebase read and CONTEXT decision analysis
- Prisma self-relation syntax: LOW — based on training knowledge; verify if self-relation objects are used

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable domain — project-local utilities are stable; Prisma 7.x is stable)
