# Architecture Research

**Dimension:** Architecture
**Milestone context:** Subsequent — adding comment threads, isSelected flag, email notifications, ZIP download, reports, and closure enforcement
**Date:** 2026-02-25

---

## Question

How should the new features integrate with the existing Next.js App Router architecture? Specifically: data model for comment threads, server-side ZIP streaming from remote URLs, Prisma aggregation queries for reports, and email queue/retry patterns.

---

## Summary

The six new feature areas map cleanly onto the existing layered pattern (Presentation → API → Data Access → Auth). Each feature adds new API route handlers and Prisma model extensions without disrupting the existing submission or auth layers. The main architectural decisions are: (1) where closure enforcement lives, (2) how ZIP streaming is handled without blocking Next.js serverless function limits, (3) what scope guard pattern coordinator-facing routes use, and (4) whether email delivery requires retry infrastructure or a fire-and-forget call is sufficient given the testing-only SMTP requirement.

---

## Component Boundaries

### Existing components (unchanged boundaries)

| Component | Owns | Does NOT own |
|-----------|------|-------------|
| `lib/auth.ts` | Session lifecycle, role definition | Business authorization logic (that stays in route handlers) |
| `lib/auth-helpers.ts` | `getCurrentUser`, `requireRole` | Faculty-scoped filtering |
| `lib/prisma.ts` | Singleton Prisma client | Query construction |
| `app/api/submissions/route.ts` | Student CRUD on own submissions | Coordinator views, comment threads |
| `app/api/submissions/upload/route.ts` | Vercel Blob token generation and `onUploadCompleted` hook | File streaming or ZIP |
| `prisma/schema.prisma` | All persistent data models | Runtime session state |

### New components required

| Component | Owns | Boundary |
|-----------|------|---------|
| `lib/mailer.ts` | Nodemailer transporter singleton, `sendMail(options)` helper | Does not decide when to send; callers (route handlers) decide that |
| `app/api/coordinator/submissions/route.ts` | Coordinator read/write of faculty-scoped submissions | Only MARKETING_COORDINATOR; filters by `user.facultyId` joining through `submission.user.facultyId` |
| `app/api/coordinator/submissions/[id]/comments/route.ts` | GET thread, POST new comment | Validates caller is coordinator or the submitting student; enforces final closure date |
| `app/api/coordinator/submissions/[id]/select/route.ts` | PATCH `isSelected` boolean | MARKETING_COORDINATOR only; enforces final closure date |
| `app/api/manager/submissions/download/route.ts` | ZIP generation and streaming | MARKETING_MANAGER only; only after final closure date; fetches files from Vercel Blob and pipes through `archiver` |
| `app/api/reports/route.ts` | Prisma aggregation queries, role-scoped filtering | Read-only; no mutations |
| Closure guard (inline in route handlers) | Comparing `Date.now()` against `AcademicYear.closureDate` and `endDate` | Shared via a `lib/closure-guard.ts` helper to avoid duplication |

---

## Data Model

### Schema additions (new Prisma models and fields)

**1. `isSelected` flag on `Submission`**

A single boolean field added directly to the existing `Submission` model. No new table needed.

```prisma
model Submission {
  // ... existing fields ...
  isSelected  Boolean  @default(false) @map("is_selected")
  comments    SubmissionComment[]
}
```

**2. `SubmissionComment` model**

A flat list of messages scoped to a submission. Sender identity is stored as a foreign key to `User`, and the role at time of posting is not stored — the current role is always used when reading. This keeps the model simple since roles do not change mid-thread in practice.

```prisma
model SubmissionComment {
  id           String     @id @default(uuid())
  submissionId String     @map("submission_id")
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  authorId     String     @map("author_id")
  author       User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  body         String     @db.Text
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@index([submissionId])
  @@map("submission_comment")
}
```

**Design rationale:**
- No `parentId` / threaded replies — the requirement specifies a two-way thread (coordinator and student exchanging messages), not a nested comment tree. A flat ordered list sorted by `createdAt` is sufficient.
- `authorId` FK preserves who wrote each message without duplicating name/role. When rendering, `author.role` tells the UI whether to align left (student) or right (coordinator).
- `onDelete: Cascade` from both `Submission` and `User` ensures no orphaned rows.
- A Prisma index on `submissionId` is important because every comment query filters by submission.

**3. `AcademicYear` closure dates clarification**

The existing schema has `closureDate` (one field). The requirements reference both a "first closure date" (blocks new submissions) and a "final closure date" (blocks all updates). The schema needs both:

```prisma
model AcademicYear {
  // ... existing fields ...
  firstClosureDate  DateTime? @db.Date @map("first_closure_date")
  finalClosureDate  DateTime? @db.Date @map("final_closure_date")
}
```

The existing `closureDate` field should be mapped to one of these or migrated — this is a schema migration concern, not an API design concern, but it affects every closure check.

---

## Data Flow

### Comment thread flow

```
Student/Coordinator UI
  → POST /api/coordinator/submissions/[id]/comments
    - auth.api.getSession → verify MARKETING_COORDINATOR or submission.userId === caller
    - check finalClosureDate not passed
    - prisma.submissionComment.create({ submissionId, authorId: session.user.id, body })
    → 201 { comment }

  → GET /api/coordinator/submissions/[id]/comments
    - auth check (coordinator or student who owns submission)
    - prisma.submissionComment.findMany({ where: { submissionId }, include: { author: { select: { name, role } } }, orderBy: { createdAt: 'asc' } })
    → 200 { comments }
```

### Email notification flow

```
PUT /api/submissions → status SUBMITTED
  → prisma.submission.update(...)
  → after successful DB write:
      find coordinator for student's faculty:
        prisma.user.findFirst({ where: { role: 'MARKETING_COORDINATOR', facultyId: student.facultyId } })
      if coordinator found:
        lib/mailer.ts sendMail({ to: coordinator.email, subject: '...', html: '...' })
        fire-and-forget (await inside try/catch, log error but don't fail the submission response)
  → return 200 { submission }
```

No queue, no retry infrastructure. The SMTP/Gmail channel is explicitly scoped to testing. If `sendMail` throws, it is caught and logged; the HTTP response still succeeds. A queue can be added later by replacing the `sendMail` call with an enqueue call without touching the submission route's contract.

**`lib/mailer.ts` structure:**
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendMail(options: { to: string; subject: string; html: string }) {
  await transporter.sendMail({ from: process.env.SMTP_USER, ...options });
}
```

The transporter is created once at module load (module-level singleton), consistent with how `lib/prisma.ts` works.

### ZIP download flow

```
GET /api/manager/submissions/download
  - auth check: MARKETING_MANAGER only
  - check finalClosureDate has passed (enforce server-side)
  - prisma.submission.findMany({
      where: { isSelected: true },
      include: {
        files: true,
        user: { include: { faculty: true } },
      }
    })
  - Create archiver instance (zip format)
  - Set response headers: Content-Type: application/zip, Content-Disposition: attachment; filename="selected-submissions.zip"
  - Return a streaming Response using ReadableStream or TransformStream
  - For each file:
      fetch(file.url)          ← HTTP GET to Vercel Blob CDN URL
      pipe response body into archiver at path: `{faculty.name}/{user.name}/{filename}`
  - archiver.finalize()
  - Stream the zip bytes to client as they are produced
```

**Streaming pattern in Next.js App Router route handlers:**

Route handlers can return a `Response` with a `ReadableStream` body. The correct approach is:

```typescript
// app/api/manager/submissions/download/route.ts
export async function GET() {
  // ... auth + closure checks ...

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Run archiver in background, piping chunks into the TransformStream writer
  (async () => {
    const archive = archiver('zip');
    archive.on('data', (chunk) => writer.write(chunk));
    archive.on('end', () => writer.close());
    archive.on('error', (err) => writer.abort(err));

    for (const submission of submissions) {
      for (const file of submission.files) {
        const res = await fetch(file.url);
        const stream = res.body;
        // append stream to archive at path
        archive.append(stream, { name: `${facultyName}/${userName}/${basename}` });
      }
    }
    archive.finalize();
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="selected-submissions.zip"',
    },
  });
}
```

**Critical constraint:** Vercel serverless functions have a 60-second (Hobby) or configurable timeout limit. For large ZIP downloads this may be an issue. Since the requirement states "on-demand" with no background job, the mitigation is: (1) only trigger after final closure (preventing further file additions), (2) the number of files is bounded by the submission window. This is acceptable for the current scope.

The `archiver` npm package must be added as a dependency. The `@types/archiver` dev dependency is also needed.

### Reports flow

```
GET /api/reports?academicYearId=<id>&type=<reportType>
  - auth check: any authenticated role
  - derive facultyId scope from role:
      ADMINISTRATOR, MARKETING_MANAGER → no faculty filter
      MARKETING_COORDINATOR, GUEST → { facultyId: session.user.facultyId }
      STUDENT → blocked (reports not listed in student requirements)
  - execute appropriate Prisma aggregation query
  → 200 { data }
```

**Prisma aggregation patterns for each report:**

```typescript
// Contributions per faculty per academic year
const counts = await prisma.submission.groupBy({
  by: ['user.facultyId'],  // requires join — use raw or nested aggregation
  _count: { id: true },
  where: { status: 'SUBMITTED', user: { facultyId: facultyFilter } },
});

// Distinct contributors per faculty
const contributors = await prisma.submission.findMany({
  where: { status: 'SUBMITTED', ... },
  distinct: ['userId'],
  select: { userId: true, user: { select: { facultyId: true } } },
});

// Exception: submissions without any coordinator comment
const noComment = await prisma.submission.findMany({
  where: {
    status: 'SUBMITTED',
    comments: { none: {} },
  },
  include: { user: { select: { name: true, faculty: { select: { name: true } } } } },
});

// Exception: submitted > 14 days ago, no coordinator comment
const stale = await prisma.submission.findMany({
  where: {
    status: 'SUBMITTED',
    submittedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    comments: { none: {} },
  },
});
```

Note: `groupBy` with a joined relation field (`user.facultyId`) is not directly supported by Prisma's `groupBy` — it can only group by scalar fields on the model itself. The workaround is either: (a) add a denormalized `facultyId` to the `Submission` model (duplicating the value from `user.facultyId`), or (b) use a raw SQL query (`prisma.$queryRaw`). Option (a) is simpler and avoids raw SQL but adds a field that can drift out of sync. Option (b) is more robust. Given the coordinator-only submission creation pattern (faculty is set at the user level and never changes on a submission), option (a) is pragmatic. A migration adds `facultyId` as a snapshot field populated at submission creation time.

### Closure enforcement flow

```
lib/closure-guard.ts
  export async function getActiveAcademicYear(): Promise<AcademicYear | null>
  export function isPastFirstClosure(year: AcademicYear): boolean
  export function isPastFinalClosure(year: AcademicYear): boolean
```

Route handlers call these helpers before any mutation. Pattern:

```typescript
// In any write route handler:
const year = await getActiveAcademicYear();
if (!year || isPastFirstClosure(year)) {
  return NextResponse.json({ error: 'Submission period closed' }, { status: 403 });
}
```

"Active" academic year = the one where `startDate <= today <= endDate`. If no active year exists, all submissions are blocked (conservative default).

---

## Suggested Build Order

Dependencies are listed as "must exist before this can be built".

### Phase 1 — Schema and foundation (no UI, no deps on new features)

1. **Schema migration: `SubmissionComment` + `isSelected` + `firstClosureDate`/`finalClosureDate`**
   - Unblocks everything else
   - One migration, one `prisma generate`

2. **`lib/closure-guard.ts`**
   - Depends on: updated `AcademicYear` schema
   - Unblocks: all write route handlers

3. **`lib/mailer.ts`**
   - Depends on: `nodemailer` installed, env vars `SMTP_USER`/`SMTP_PASS`
   - No Prisma dependency; can be built in parallel with schema work

### Phase 2 — API layer (no UI yet, tested via curl/Postman)

4. **Closure enforcement in existing submission routes (`/api/submissions/route.ts`)**
   - Depends on: `lib/closure-guard.ts`
   - Add `isPastFirstClosure` check to POST, `isPastFinalClosure` check to PUT

5. **`/api/coordinator/submissions/route.ts`** — GET faculty-scoped submissions
   - Depends on: schema (for `isSelected`), `requireRole(['MARKETING_COORDINATOR'])`
   - Faculty scope: `where: { user: { facultyId: session.user.facultyId } }`

6. **`/api/coordinator/submissions/[id]/comments/route.ts`** — GET + POST
   - Depends on: `SubmissionComment` schema, `lib/closure-guard.ts`

7. **`/api/coordinator/submissions/[id]/select/route.ts`** — PATCH `isSelected`
   - Depends on: `isSelected` field on `Submission`, `lib/closure-guard.ts`

8. **Email trigger inside `/api/submissions/route.ts` PUT handler**
   - Depends on: `lib/mailer.ts`, faculty-aware user lookup
   - Added to the existing PUT handler when `status` transitions to `SUBMITTED`

9. **`/api/manager/submissions/download/route.ts`** — ZIP streaming
   - Depends on: `isSelected` field, `archiver` installed, final closure check
   - No comment dependency

10. **`/api/reports/route.ts`** — aggregation queries
    - Depends on: `SubmissionComment` (for exception reports), `isSelected` (optional for report scope)
    - Role-scoped filtering; read-only

### Phase 3 — UI layer

11. **Coordinator submissions view** (`app/(management)/coordinator/page.tsx`)
    - Depends on: `/api/coordinator/submissions/route.ts`

12. **Comment thread UI** (component within coordinator view or submission detail)
    - Depends on: `/api/coordinator/submissions/[id]/comments/route.ts`

13. **Selected-for-publication toggle** (within coordinator view)
    - Depends on: `/api/coordinator/submissions/[id]/select/route.ts`

14. **Marketing Manager view + ZIP download button** (`app/(management)/manager/page.tsx`)
    - Depends on: `/api/manager/submissions/download/route.ts`

15. **Reports page** (`app/(management)/reports/page.tsx`)
    - Depends on: `/api/reports/route.ts`

16. **Guest view** (`app/(management)/guest/page.tsx` or route group adjustment)
    - Depends on: reports API, coordinator submissions read path

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| `SubmissionComment` as flat list, no `parentId` | Requirement is a two-way thread, not nested replies; flat list sorted by `createdAt` is sufficient and simpler |
| Email: fire-and-forget, no queue | SMTP/Gmail is testing-only; a failed email should not fail a submission; queue can be added later by replacing one call site |
| ZIP: streaming `TransformStream` in route handler | No background jobs in stack; on-demand generation bounded by post-closure submission set; streams bytes rather than buffering full ZIP in memory |
| Closure guard as shared `lib/` utility | Multiple routes need the same check; centralising avoids drift between implementations |
| Faculty scope enforced at API layer | Matches existing pattern (role checks in route handlers, not middleware); coordinator cannot escalate scope via client manipulation |
| `facultyId` snapshot on `Submission` for groupBy reports | Prisma `groupBy` cannot group on relation fields; snapshot at creation avoids raw SQL while keeping queries simple |
| Coordinator routes under `/api/coordinator/` prefix | Separates coordinator-facing API from student-facing `/api/submissions/`; mirrors route group structure |

---

## New Environment Variables Required

| Variable | Used by | Notes |
|----------|---------|-------|
| `SMTP_USER` | `lib/mailer.ts` | Gmail address |
| `SMTP_PASS` | `lib/mailer.ts` | Gmail app password |

---

## New npm Dependencies Required

| Package | Used by | Type |
|---------|---------|------|
| `nodemailer` | `lib/mailer.ts` | dependency |
| `@types/nodemailer` | TypeScript types | devDependency |
| `archiver` | ZIP download route | dependency |
| `@types/archiver` | TypeScript types | devDependency |

---

*Research completed: 2026-02-25*
