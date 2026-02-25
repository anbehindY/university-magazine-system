# PITFALLS.md — University Magazine Contribution System

**Scope:** Subsequent milestone — coordinator comment threads, submission selection flag, Nodemailer SMTP email, server-side ZIP download from Vercel Blob, statistical reports with Prisma aggregations, closure date enforcement.

**Purpose:** Pre-emptive catalogue of critical mistakes specific to this domain and stack. Each entry includes warning signs, a concrete prevention strategy, and the phase where it should be addressed.

---

## 1. Comment Threads

### 1.1 No Faculty Scope Enforcement on Comment API

**What goes wrong:** A coordinator POSTs a comment to `/api/submissions/:id/comments` for a submission belonging to a student in a different faculty. The route checks session validity but not whether `submission.user.facultyId === coordinator.facultyId`. Data leaks across faculty boundaries.

**Warning signs:**
- Comment route reads `submission.userId` but does not join through `user.facultyId`
- Faculty check exists on a GET list endpoint but not on the POST/mutation endpoint
- Role check says `MARKETING_COORDINATOR` is allowed with no further WHERE clause

**Prevention:**
When fetching the target submission to validate a comment, always include:
```typescript
const submission = await prisma.submission.findFirst({
  where: {
    id: submissionId,
    user: { facultyId: session.user.facultyId },
  },
});
if (!submission) return 403;
```
Never rely solely on the UI to filter the faculty scope; enforce it in every mutating API route.

**Phase:** Comment thread implementation (do not add the route without this guard).

---

### 1.2 Final Closure Date Not Checked on Comment Creation

**What goes wrong:** The project spec states the final closure date blocks "all updates including comments." If the comment POST route only checks the first closure date (or no date at all), coordinators and students can still exchange messages after the hard deadline, undermining the published academic year policy.

**Warning signs:**
- Comment POST route does not query `AcademicYear` before writing
- Closure date check only exists in the student submission PUT route and is not extracted to a shared utility
- Two independent "is closed?" implementations drift out of sync

**Prevention:**
Extract closure-date logic into a single shared helper (e.g., `lib/academic-year-helpers.ts`) that returns `{ firstClosed: boolean; finalClosed: boolean }` given the current timestamp. Call it in every mutating route — submission create, submission update, comment create, selection flag toggle. A single source of truth prevents drift.

Also note: the current `AcademicYear` schema has one `closureDate` field. The PROJECT.md references both a "first closure date" (blocks new submissions) and a "final closure date" (blocks all updates). Verify whether these map to `closureDate` + `endDate`, or whether a second date column is needed. Getting this wrong at the schema level causes silent enforcement failures.

**Phase:** Before any closure-gated routes are written; schema clarification must precede coding.

---

### 1.3 Thread Ownership Not Validated on Reply

**What goes wrong:** A student PATCHes or DELETEs another student's comment by guessing a comment UUID. The route checks auth but not authorship.

**Warning signs:**
- Comment update/delete route uses `where: { id: commentId }` without also filtering by the requesting user's ID
- No check that the comment's parent submission belongs to the requesting student

**Prevention:**
Always scope mutations to the authenticated actor:
```typescript
// For student deleting own comment:
await prisma.comment.findFirst({
  where: { id: commentId, authorId: session.user.id },
});
// For coordinator deleting any comment on their faculty's submission:
await prisma.comment.findFirst({
  where: {
    id: commentId,
    submission: { user: { facultyId: session.user.facultyId } },
  },
});
```

**Phase:** Comment thread implementation.

---

### 1.4 Unbounded Comment Growth Added to the Already Oversized Submissions Page

**What goes wrong:** Comment thread UI is bolted onto `app/(student)/submissions/page.tsx`, which is already 1,126 lines. The component becomes unmaintainable and regression risk escalates further.

**Warning signs:**
- New comment-related `useState` hooks added directly to the submissions page component
- Comment fetch logic lives in the same `useEffect` that handles submission fetch
- No sub-component extracted for the thread UI

**Prevention:**
Before adding comment UI, extract a `<CommentThread submissionId={id} />` client component. Keep all comment state, fetch logic, and rendering inside it. This is also the natural time to begin decomposing the submissions mega-component (CONCERNS.md item #5).

**Phase:** Before writing comment UI; treat it as a forced refactor opportunity.

---

## 2. Email Notifications (Nodemailer SMTP)

### 2.1 Email Sent Inside the HTTP Request/Response Cycle

**What goes wrong:** The coordinator notification email is sent synchronously inside the submission PUT/POST handler using `await transporter.sendMail(...)`. If Gmail SMTP is slow or rejects the message (rate limit, auth failure), the student's submission action times out or returns a 500. The student loses their submission or has to retry, not knowing whether it was saved.

**Warning signs:**
- `sendMail` is `await`-ed directly before `return NextResponse.json(...)` in the submission route
- No separate try/catch around the email call — if it throws, the whole route handler fails
- Submission is not persisted to DB before the email attempt

**Prevention:**
Always persist the submission to the database first, return success to the student, then send the email in a fire-and-forget fashion:
```typescript
// Save submission
const submission = await prisma.submission.update(...);

// Return to student immediately
const response = NextResponse.json({ submission }, { status: 200 });

// Non-blocking email — failure does not affect the student response
sendCoordinatorEmail(submission).catch((err) =>
  console.error("Email notification failed:", err)
);

return response;
```
Log email failures clearly. For testing with Gmail SMTP this is sufficient; a proper queue (BullMQ, etc.) would be needed for production scale.

**Phase:** Email notification implementation.

---

### 2.2 Email Sent to the Wrong Coordinator (Faculty Mismatch)

**What goes wrong:** The submission route looks up "the coordinator" to notify but queries `WHERE role = 'MARKETING_COORDINATOR'` without filtering by `facultyId`. A large university with multiple faculties would spam every coordinator with every submission.

**Warning signs:**
- Email lookup: `prisma.user.findMany({ where: { role: "MARKETING_COORDINATOR" } })` with no faculty filter
- Student's `facultyId` is not joined into the coordinator lookup
- "No coordinator found" case sends to no one silently

**Prevention:**
Derive the coordinator's faculty from the submitting student's `facultyId`:
```typescript
const student = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { facultyId: true },
});
const coordinators = await prisma.user.findMany({
  where: {
    role: "MARKETING_COORDINATOR",
    facultyId: student?.facultyId,
    banned: false,
  },
  select: { email: true, name: true },
});
```
If a student has no `facultyId`, log the anomaly and skip the email — do not crash.

**Phase:** Email notification implementation.

---

### 2.3 Gmail SMTP Credentials in Version Control

**What goes wrong:** `SMTP_USER` and `SMTP_PASS` (an App Password) are committed directly into code or into a `.env` file that gets staged accidentally.

**Warning signs:**
- Nodemailer transporter constructed with inline string credentials rather than `process.env.*`
- `.env` not in `.gitignore`, or `.env.example` contains real values
- No CI check for secrets

**Prevention:**
Use environment variables exclusively. Add the required keys to `.env.example` with placeholder values. Verify `.gitignore` includes `.env*` before committing any Nodemailer code. For testing, generate a Gmail App Password (not the account password) scoped only to SMTP.

**Phase:** Before any Nodemailer code is written.

---

### 2.4 No Deduplication — Coordinator Notified on Every Re-Submission

**What goes wrong:** A student submits, then re-edits (back to DRAFT), then submits again. Each status transition to SUBMITTED triggers a new notification email. Coordinators receive duplicate alerts.

**Warning signs:**
- Email is triggered on every PUT where `status === "SUBMITTED"` without checking prior status
- No `notifiedAt` or `notificationSent` flag on the submission record

**Prevention:**
Gate the notification on a transition check:
```typescript
const wasAlreadySubmitted = existing.status === "SUBMITTED";
// Only send email on first transition to SUBMITTED
if (!wasAlreadySubmitted && nextStatus === "SUBMITTED") {
  sendCoordinatorEmail(submission).catch(...);
}
```
The existing `submittedAt` field can serve this purpose — only send if `submittedAt` was previously null.

**Phase:** Email notification implementation.

---

## 3. ZIP Generation

### 3.1 ZIP Assembled in Server Memory — Unbounded Size

**What goes wrong:** The ZIP route fetches all `SubmissionFile` blobs from Vercel Blob into memory simultaneously before writing them into an `archiver`/`jszip` buffer. If selected submissions contain dozens of large Word documents and images, the serverless function exhausts its memory limit (Vercel default: 1 GB) and crashes with no meaningful error to the user.

**Warning signs:**
- Route does `await fetch(file.url)` for every file in a `Promise.all([...])` before piping anything
- All blob responses are buffered into `Buffer` or `ArrayBuffer` before archiving begins
- No streaming pipeline from Vercel Blob fetch → archiver → response

**Prevention:**
Stream each blob into the archive rather than buffering everything first. Use `archiver` (Node.js streams) and pipe the archive to the `Response`:
```typescript
const archive = archiver("zip");
for (const file of selectedFiles) {
  const blobResponse = await fetch(file.url);
  archive.append(blobResponse.body, { name: file.pathname });
}
archive.finalize();
return new Response(archive, { headers: { "Content-Type": "application/zip" } });
```
Fetch files serially or in small batches (≤5 concurrent) to avoid Vercel Blob rate limits and memory spikes.

**Phase:** ZIP generation implementation.

---

### 3.2 ZIP Available Before Final Closure Date

**What goes wrong:** The Marketing Manager endpoint that generates the ZIP is not gated by the final closure date. A manager downloads the ZIP while students can still update submissions, meaning the archive is stale the moment it is generated.

**Warning signs:**
- ZIP route has no `AcademicYear` query to check whether `finalClosed` is true
- Route is accessible immediately after a submission is flagged as Selected
- No UI or API feedback telling the manager "not yet available"

**Prevention:**
The ZIP route must query the current academic year and return 403 if the final closure date has not passed:
```typescript
const year = await getCurrentAcademicYear();
if (!year || new Date() < new Date(year.endDate)) {
  return NextResponse.json(
    { error: "ZIP download is only available after the final closure date." },
    { status: 403 }
  );
}
```
Use the same shared `getCurrentAcademicYear()` helper as every other closure-gated route.

**Phase:** ZIP generation implementation.

---

### 3.3 Vercel Blob URL Expiry During ZIP Assembly

**What goes wrong:** Vercel Blob URLs can be signed/time-limited. If ZIP generation takes longer than the token validity window, mid-archive fetches return 403, producing a corrupt or incomplete ZIP with no error surfaced to the user.

**Warning signs:**
- File URLs are stored in `SubmissionFile.url` at upload time and used directly months later without refreshing
- ZIP generation silently skips files where `fetch(url)` returns non-200
- No check on `response.ok` before appending to archive

**Prevention:**
Always check `response.ok` before appending. If a blob fetch fails, abort the ZIP and return a meaningful error rather than silently producing an incomplete archive. If Vercel Blob tokens are short-lived, re-generate download URLs via the Vercel Blob SDK at ZIP generation time rather than using stored URLs directly.

**Phase:** ZIP generation implementation.

---

### 3.4 ZIP Directory Structure Not Matching Spec

**What goes wrong:** The spec requires `Faculty > Student > files` directory structure. A naive implementation flattens all files into the ZIP root or uses internal UUIDs instead of human-readable faculty and student names.

**Warning signs:**
- Archive entries named using `file.pathname` (which contains UUID-based paths like `submissions/{userId}/{submissionId}/filename`)
- No join to `User.name` and `Faculty.name` when building archive entry paths
- Files from the same student colliding if two submissions contain identically-named files

**Prevention:**
Build archive paths explicitly from joined data:
```typescript
const entryPath = `${faculty.name}/${student.name}/${file.originalFilename}`;
archive.append(stream, { name: entryPath });
```
Sanitize names (strip path separators, limit length). Handle filename collisions within a student's folder by appending a numeric suffix.

**Phase:** ZIP generation implementation.

---

## 4. Closure Date Enforcement

### 4.1 Closure Check Only in the UI — Not in the API

**What goes wrong:** The student submissions page checks `closureDate` client-side and hides the submit button after it passes. But the API route (POST/PUT `/api/submissions`) has no corresponding server-side check. A student can bypass the UI by sending a request directly and create or update submissions past the deadline.

**Warning signs:**
- `closureDate` comparison logic exists only in `app/(student)/submissions/page.tsx`
- Submission POST route does not query `AcademicYear` before inserting
- Submission PUT route does not check `endDate` before updating

**Prevention:**
Every state-changing submission route must independently query the active academic year and enforce closure:
```typescript
const year = await getActiveAcademicYear();
// Block new submissions after first closure date
if (year && new Date() > new Date(year.closureDate)) {
  return NextResponse.json({ error: "Submissions are closed." }, { status: 403 });
}
```
The UI check is a courtesy; the API check is the actual gate.

**Phase:** Closure date enforcement (first task in this milestone phase).

---

### 4.2 Time Zone Confusion on Closure Date Comparisons

**What goes wrong:** `closureDate` is stored as `@db.Date` (date-only, no time component) in the schema. `new Date()` in a Node.js serverless function returns UTC. If the university is in a non-UTC timezone, a submission at 23:30 local time on the closure day could be accepted (UTC is still the prior day) or rejected (UTC is already the next day), depending on the offset direction.

**Warning signs:**
- Closure comparison: `new Date() > new Date(year.closureDate)` with no timezone consideration
- `startTime`/`endTime` fields on `AcademicYear` exist but are not combined with `closureDate` in comparisons
- No `TZ` or timezone configuration in the deployment environment

**Prevention:**
Combine the `closureDate` (date) with the relevant `endTime` (time) fields from `AcademicYear` when constructing the enforcement datetime. Use `date-fns` (already in the stack) with explicit timezone awareness, or store closure dates as full `DateTime` (with time) in the database rather than `@db.Date`. Document the chosen timezone convention in a code comment.

**Phase:** Closure date enforcement; resolve this before any date comparison code is written.

---

### 4.3 Stale Closure State Cached on the Client

**What goes wrong:** The student page fetches the academic year once on mount (via the existing `/api/academic-years` route) and caches it in component state. If the administrator changes the closure date mid-session, the student's UI continues showing the wrong deadline — either letting them submit after closure or blocking them before it.

**Warning signs:**
- `useEffect` with an empty dependency array fetches the academic year once and never re-validates
- No periodic re-fetch or stale-while-revalidate pattern
- No server-side check (see pitfall 4.1) to catch the stale client case

**Prevention:**
Pitfall 4.1's server-side enforcement is the primary guard. The UI state is secondary. Optionally, re-fetch the academic year when the user returns focus to the tab (`visibilitychange` event) or on a short interval. Display the closure date prominently so users understand when they're operating near a boundary.

**Phase:** Closure date enforcement.

---

## 5. Role-Scoped Reports

### 5.1 Aggregation Query Runs Without Role Scope Filter

**What goes wrong:** The report endpoint is built for the admin (all faculties) and then reused for coordinators and guests by relying on the UI to filter displayed results. A coordinator fetching `/api/reports/contributions` receives aggregated data for all faculties, not just their own.

**Warning signs:**
- Report route has one Prisma `groupBy` query with no `where` clause conditional on role
- Faculty filter is applied in the component after the full dataset arrives
- GUEST role receives a complete cross-faculty dataset

**Prevention:**
Apply the scope filter inside the Prisma query based on the authenticated user's role:
```typescript
const facultyFilter =
  session.user.role === "ADMINISTRATOR" || session.user.role === "MARKETING_MANAGER"
    ? {}
    : { facultyId: session.user.facultyId };

const result = await prisma.submission.groupBy({
  by: ["user.facultyId"],
  where: {
    status: "SUBMITTED",
    user: facultyFilter,
  },
  _count: { id: true },
});
```
Never return a superset and filter client-side for access control.

**Phase:** Reports implementation.

---

### 5.2 "Contributions Without Comment" Exception Report Is an N+1 Query

**What goes wrong:** The exception report ("submissions with no coordinator comment") is implemented by fetching all submissions and then, for each one, issuing a separate query to check whether a comment exists. At university scale this is O(n) database round trips.

**Warning signs:**
- Report logic uses a `for` loop with `await prisma.comment.count({ where: { submissionId: s.id } })` inside
- Response time grows linearly with submission count
- No `include: { _count: { select: { comments: true } } }` pattern used

**Prevention:**
Use a single Prisma query with a nested count or a subquery filter:
```typescript
const submissionsWithoutComments = await prisma.submission.findMany({
  where: {
    status: "SUBMITTED",
    comments: { none: {} },
    user: { facultyId: session.user.facultyId },
  },
  include: { user: { select: { name: true, faculty: true } } },
});
```

**Phase:** Reports implementation.

---

### 5.3 "14-Day Without Comment" Report Uses Application-Layer Date Math

**What goes wrong:** The exception report for submissions older than 14 days without a comment is computed by fetching all uncommented submissions and filtering in JavaScript: `submissions.filter(s => daysSince(s.submittedAt) > 14)`. This pulls the entire table across the network when only a small subset is needed.

**Warning signs:**
- `date-fns` `differenceInDays` called in a `.filter()` after a `findMany` with no date `where` clause
- Report endpoint response size grows with total submission count
- No `submittedAt: { lte: fourteenDaysAgo }` in the Prisma `where`

**Prevention:**
Push the date arithmetic into the database query:
```typescript
const fourteenDaysAgo = new Date();
fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

const result = await prisma.submission.findMany({
  where: {
    status: "SUBMITTED",
    submittedAt: { lte: fourteenDaysAgo },
    comments: { none: {} },
    user: { facultyId: session.user.facultyId },
  },
});
```

**Phase:** Reports implementation.

---

### 5.4 Guest Role Can Access Reports for Other Faculties by Manipulating Query Parameters

**What goes wrong:** The report page accepts a `?facultyId=` query parameter so the admin can view any faculty's report. A GUEST passes a different `facultyId` in the URL and sees another faculty's data.

**Warning signs:**
- Report API reads `searchParams.get("facultyId")` and passes it directly to the Prisma `where` clause
- No check that the requesting GUEST's `session.user.facultyId` matches the requested `facultyId`
- Guest UI hides the selector but the API accepts arbitrary values

**Prevention:**
For GUEST and MARKETING_COORDINATOR, ignore the requested `facultyId` entirely and substitute the user's own:
```typescript
const effectiveFacultyId =
  role === "ADMINISTRATOR" || role === "MARKETING_MANAGER"
    ? requestedFacultyId
    : session.user.facultyId; // Guests/coordinators: always their own faculty
```

**Phase:** Reports implementation.

---

## 6. Cross-Cutting Concerns (Multiple Features Affected)

### 6.1 No Input Validation Schema on New Routes

**What goes wrong:** Existing routes cast `req.json()` directly to a payload type with no runtime validation (`as SubmissionPayload`). New routes for comments, selection flag, and reports inherit this pattern. Malformed or malicious payloads (oversized strings, wrong types, missing required fields) cause Prisma errors or silent data corruption instead of a clean 400 response.

**Warning signs:**
- `(await req.json()) as CommentPayload` with no Zod parse
- `body.content` used directly in `prisma.comment.create` without a length check
- Required fields checked manually with `if (!body.field)` rather than a schema

**Prevention:**
Zod is already installed (`zod 4.3.6`). Define a schema for every new route's request body and parse before touching Prisma:
```typescript
const CommentSchema = z.object({
  submissionId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});
const parsed = CommentSchema.safeParse(await req.json());
if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
```

**Phase:** All new routes — enforce this from the start, do not retrofit later.

---

### 6.2 Coordinator Faculty Check Missing from the Selection Flag Route

**What goes wrong:** The "Selected for Publication" PATCH endpoint checks that the user is a `MARKETING_COORDINATOR` but not that the submission belongs to their faculty. A coordinator can flag (or unflag) submissions from other faculties.

**Warning signs:**
- Selection route does `where: { id: submissionId }` without joining through `user.facultyId`
- Faculty check is present on the coordinator's submission list GET but not on the selection PATCH

**Prevention:**
Same pattern as comment ownership (pitfall 1.1): always include the faculty scope in the Prisma `where` for every coordinator mutation:
```typescript
const submission = await prisma.submission.findFirst({
  where: {
    id: submissionId,
    user: { facultyId: session.user.facultyId },
  },
});
if (!submission) return 403;
```

**Phase:** Selection flag implementation.

---

### 6.3 Pagination Still Missing When New Coordinator View Adds Cross-Submission Queries

**What goes wrong:** The existing concern (CONCERNS.md #7) notes no pagination on submission list endpoints. The coordinator view adds a new context — a coordinator sees all submissions for their faculty, potentially hundreds. Loading all of them without pagination will degrade performance during active submission periods.

**Warning signs:**
- New coordinator GET endpoint returns `findMany` with no `take`/`skip`
- Response payload grows linearly with faculty submission count
- No `totalCount` or `nextCursor` returned to the client

**Prevention:**
Add cursor-based or offset pagination to the coordinator submissions endpoint from the outset:
```typescript
await prisma.submission.findMany({
  where: { user: { facultyId: coordinatorFacultyId } },
  take: 50,
  skip: page * 50,
  orderBy: { submittedAt: "desc" },
});
```
This also applies to the reports endpoint — do not return unbounded aggregation results.

**Phase:** Coordinator submission view implementation.

---

### 6.4 AcademicYear Schema Has One Closure Date Field — Requirements Imply Two

**What goes wrong:** `AcademicYear.closureDate` is a single `DateTime?`. The requirements specify a "first closure date" (blocks new submissions) and a "final closure date" (blocks all updates). If this is resolved by overloading one field or by using `endDate` as the final closure, the enforcement logic will be ambiguous and each developer will implement it differently.

**Warning signs:**
- `closureDate` mapped to "first closure" in one route, "final closure" in another
- `endDate` used as the final closure date without explicit documentation
- Two different helpers computing closure state from the same field with different semantics

**Prevention:**
Before writing any closure-gated code, add a migration to add `finalClosureDate DateTime? @map("final_closure_date")` to `AcademicYear` and update the admin UI. Document explicitly: `closureDate` = first closure (blocks new submissions); `finalClosureDate` = final closure (blocks all edits and comments). The shared helper returns both flags.

**Phase:** Schema migration — must be the first task in this milestone. All subsequent features depend on getting this right.

---

### 6.5 No Audit Trail for High-Value Coordinator Actions

**What goes wrong:** Coordinators selecting/deselecting submissions and adding comments are consequential editorial decisions. With no audit log, there is no way to reconstruct "who selected submission X and when" — which matters for disputes, the Marketing Manager's ZIP, and the exception reports.

**Warning signs:**
- `selectedAt` / `selectedBy` fields absent from the schema
- Comments have no `editedAt` or deletion record
- `updatedAt` on Submission is overwritten by the coordinator's action with no history

**Prevention:**
At minimum, store `selectedAt DateTime?` and `selectedById String?` on the `Submission` model. For comments, make deletion soft (add `deletedAt DateTime?`) rather than hard-deleting rows. This is low-cost at schema design time and very expensive to retrofit.

**Phase:** Schema migration (alongside the dual closure date fix above).

---

*Document created: 2026-02-25*
*Research type: Project Research — Pitfalls dimension*
