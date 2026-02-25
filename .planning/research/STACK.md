# Stack Research — New Feature Libraries

**Research Date:** 2026-02-25
**Research Type:** Project Research — Stack dimension
**Milestone:** Subsequent (brownfield additions to existing Next.js 15 app)
**Confidence Note:** Web search/fetch tools were unavailable during this research session. All version recommendations are based on training data (cutoff August 2025) and the existing `package.json`. Verify all versions against npm before installing.

---

## Scope

This document recommends libraries and approaches for four new capability areas being added to the university magazine contribution system:

1. Nodemailer SMTP email in Next.js App Router
2. Server-side ZIP generation from Vercel Blob URLs
3. Report/statistics queries with Prisma
4. Real-time or polling comment threads in Next.js

---

## 1. Email — Nodemailer + Gmail SMTP

### Recommendation

**nodemailer `^6.9.x`**

- The project spec mandates Nodemailer + Gmail SMTP explicitly — this is a fixed constraint, not a choice.
- nodemailer 6.x is the stable, actively maintained major version as of August 2025. Version 7 introduced ESM-only builds which conflict with Next.js's CommonJS/ESM hybrid module resolution. Stay on `^6.9.x` until the Next.js ecosystem fully stabilises around ESM.
- Add `@types/nodemailer` as a dev dependency for TypeScript support.

### Integration Pattern

**Use a Route Handler, not a Server Action.**

Sending email is a side effect that must run in the Node.js runtime. Route Handlers (`app/api/...route.ts`) are the correct surface:

- Explicitly set `export const runtime = 'nodejs'` at the top of the route file. Vercel's default is the Edge Runtime for some routes; nodemailer requires Node.js APIs (`net`, `tls`) that are unavailable in the Edge Runtime.
- Create a single `lib/email.ts` module that exports a typed `sendEmail(options)` helper. Route handlers import and call this helper rather than instantiating a transporter inline. This centralises the SMTP config and makes it mockable in tests later.
- Store credentials in env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. Do not hard-code Gmail defaults — even for testing, env vars allow swapping without code changes.
- For Gmail specifically, use an App Password (not the account password) with `secure: true` and `port: 465`, or STARTTLS with `port: 587` and `secure: false, requireTLS: true`.

### What Not to Use

- **Resend / SendGrid / Postmark** — The spec explicitly calls for Nodemailer + Gmail SMTP. Adding a third-party sending service adds cost, vendor lock-in, and complexity that the requirements do not justify.
- **Next.js Server Actions** — Server Actions are optimised for form mutations and return structured data to the client. Triggering email from a Server Action is possible but makes error handling, retry logic, and request/response lifecycle harder to reason about. A dedicated Route Handler is cleaner.
- **nodemailer 7.x** — ESM-only; the rest of the codebase uses CommonJS interop patterns (Prisma, better-auth) and switching would require broader ecosystem changes.

**Confidence: HIGH** — Nodemailer 6.x + Route Handler + Node.js runtime is the well-established pattern for this use case. The only uncertainty is the exact patch version; run `npm view nodemailer version` before installing.

---

## 2. ZIP Generation — Server-side from Vercel Blob URLs

### Recommendation

**`archiver` `^7.0.x`** (primary choice)

OR

**`jszip` `^3.10.x`** (acceptable fallback)

### archiver (Preferred)

- archiver is the established Node.js streaming ZIP library. It pipes a writable stream directly into the HTTP response, meaning the ZIP is streamed to the client without buffering the entire archive in memory. This is essential for large file sets.
- It fetches each Vercel Blob URL via Node's `fetch`/HTTPS and appends the response stream to the archive. No temp files are written to disk.
- Requires `@types/archiver` as a dev dependency.

**Pattern:**

```typescript
// app/api/submissions/download-zip/route.ts
export const runtime = 'nodejs';

import archiver from 'archiver';
import { NextResponse } from 'next/server';
import { PassThrough } from 'stream';

export async function GET(request: Request) {
  const archive = archiver('zip', { zlib: { level: 6 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  // For each selected submission file: fetch blob URL, append to archive
  for (const file of selectedFiles) {
    const res = await fetch(file.url);
    const buffer = await res.arrayBuffer();
    archive.append(Buffer.from(buffer), { name: `${faculty}/${student}/${file.name}` });
  }

  await archive.finalize();

  return new NextResponse(passThrough as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="selected-submissions.zip"',
    },
  });
}
```

Note: The Node.js `stream.PassThrough` → `NextResponse` bridge works in the Node.js runtime. Vercel's function timeout is 10s on Hobby / 60s on Pro — for very large archives this is a risk, but the project spec says ZIP is on-demand after final closure, which implies a controlled, finite file set.

### jszip (Fallback)

- jszip builds the entire ZIP in memory as a `Uint8Array`. Simpler API, no streaming, but acceptable if total file size is bounded (< 50–100 MB). For a university magazine contribution system, this is likely fine in practice.
- Pure JavaScript, no native bindings, easier to reason about in serverless environments.
- Use if archiver's stream bridging causes issues in the Vercel Next.js runtime.

### What Not to Use

- **`fflate`** — Excellent browser/edge ZIP library, but the API for streaming from remote URLs in a Node.js Route Handler is less ergonomic than archiver.
- **`adm-zip`** — In-memory only, no streaming. Acceptable for small archives but archiver is strictly better for this use case.
- **Edge Runtime** — The ZIP download route must explicitly use `runtime = 'nodejs'`. Streams, Node.js `Buffer`, and `archiver` all require the full Node.js API surface.
- **`create-zip-stream`** — Smaller ecosystem, less maintained than archiver.

**Confidence: HIGH for archiver pattern. MEDIUM for exact version** — archiver has been stable at v6/v7 range; confirm latest with `npm view archiver version`.

---

## 3. Report / Statistics Queries — Prisma

### Recommendation

**Use Prisma's `groupBy`, `aggregate`, and raw SQL via `$queryRaw` — no additional library needed.**

The reporting requirements are entirely expressible in SQL/Prisma queries. Adding a separate analytics library would be over-engineering for this use case.

### Query Patterns by Report Type

**Contributions per faculty per academic year:**
```typescript
// Use groupBy on Submission joined to User.facultyId, filtered by academic year
const counts = await prisma.submission.groupBy({
  by: ['userId'],
  where: { status: 'SUBMITTED', academicYearId: yearId },
  _count: { id: true },
});
// Then join with User to get facultyId grouping
```
Since Prisma's `groupBy` does not support cross-model grouping (joining relations), the cleanest approach is `$queryRaw` for multi-table aggregations:

```typescript
const result = await prisma.$queryRaw<Array<{ faculty_name: string; count: bigint }>>`
  SELECT f.name AS faculty_name, COUNT(s.id) AS count
  FROM submission s
  JOIN "user" u ON s.user_id = u.id
  JOIN faculty f ON u.faculty_id = f.id
  WHERE s.status = 'SUBMITTED'
    AND s.academic_year_id = ${yearId}
  GROUP BY f.id, f.name
  ORDER BY f.name
`;
```

**Percentage of contributions by faculty:** Compute in TypeScript from the above aggregation result — divide each faculty count by total, multiply by 100. No SQL window functions needed.

**Distinct contributors per faculty per year:**
```typescript
// Prisma aggregate with distinct:
const contributors = await prisma.submission.findMany({
  where: { status: 'SUBMITTED', academicYearId: yearId },
  select: { userId: true, user: { select: { facultyId: true } } },
  distinct: ['userId'],
});
```
Or use `$queryRaw` with `COUNT(DISTINCT s.user_id)`.

**Exception report — submissions without coordinator comment:**

This requires the `Comment` model (to be added in schema). Once that model exists:
```typescript
const noComment = await prisma.submission.findMany({
  where: {
    status: 'SUBMITTED',
    comments: { none: { authorRole: 'MARKETING_COORDINATOR' } },
  },
  include: { user: { include: { faculty: true } } },
});
```

**Exception report — submissions >14 days without coordinator comment:**
```typescript
const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
const stale = await prisma.submission.findMany({
  where: {
    status: 'SUBMITTED',
    submittedAt: { lte: cutoff },
    comments: { none: { authorRole: 'MARKETING_COORDINATOR' } },
  },
});
```

### Prisma `$queryRaw` Safety Notes

- Always use tagged template literals (`$queryRaw\`...\``) — never string interpolation — to prevent SQL injection. Prisma parameterises tagged literals automatically.
- `$queryRaw` returns `bigint` for `COUNT()` columns; cast to `Number()` before sending to the client.
- The `academicYearId` foreign key does not exist yet on `Submission` in the current schema — this will need to be added as part of the closure date enforcement migration.

### What Not to Use

- **Prisma Metrics / Prisma Insights** — These are observability tools, not query helpers.
- **`@prisma/extension-accelerate`** — Adds connection pooling and caching at cost; not needed for a university-scale reporting load.
- **Separate analytics DB / TimescaleDB** — Massively over-engineered for the report set described. The existing PostgreSQL with indexed queries is sufficient.
- **`knex` or raw `pg` queries** — The project is already committed to Prisma and has type safety from generated client. Mixing query builders defeats this.

**Confidence: HIGH** — These are standard Prisma patterns for reporting aggregations. The only risk is that cross-model `groupBy` requires `$queryRaw`, which is well-documented and safe with tagged template usage.

---

## 4. Comment Threads — Polling in Next.js

### Recommendation

**Server-side: Prisma queries in Route Handlers. Client-side: polling with `setInterval` + `fetch` or SWR.**

**No real-time infrastructure (WebSockets, SSE, Pusher, Ably) is needed or recommended.**

### Rationale

The project spec explicitly lists "Real-time collaboration or live editing" as **Out of Scope**. Comment threads on submissions are low-frequency interactions — a coordinator adds a comment, a student replies. There is no expectation of multiple users editing simultaneously.

Simple polling (every 10–30 seconds, or on-focus) delivers a user experience that is more than adequate for this workflow at zero additional infrastructure cost.

### Recommended Approach: SWR

**`swr` `^2.2.x`** — already common in Next.js App Router projects, designed for this exact pattern.

- `useSWR('/api/submissions/[id]/comments', fetcher, { refreshInterval: 15000 })` gives automatic polling, deduplication, focus-revalidation, and loading/error states.
- On comment submit (POST to Route Handler), call `mutate()` to immediately revalidate — the UI updates without waiting for the next poll interval.
- Zero additional backend infrastructure; comments are served from the existing PostgreSQL via Prisma.
- SWR ships with React 19 compatible hooks.

**Alternative: TanStack Query (React Query)**

`@tanstack/react-query ^5.x` is equally valid and more powerful, but adds ~50 KB to the bundle and requires a `QueryClientProvider` wrapper. The project already uses SWR-style patterns implicitly (custom `useEffect`/`fetch` hooks likely in submissions page). SWR is lighter and sufficient.

### Comment Data Model (to be added to schema)

```prisma
model Comment {
  id           String     @id @default(uuid())
  submissionId String     @map("submission_id")
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  authorId     String     @map("author_id")
  author       User       @relation(fields: [authorId], references: [id])
  authorRole   Role
  body         String     @db.Text
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@index([submissionId])
  @@map("comment")
}
```

The `authorRole` field denormalises the role at comment-write time so that the exception reports can query `comments where authorRole = MARKETING_COORDINATOR` without joining through the user table.

### What Not to Use

- **Server-Sent Events (SSE)** — Viable for one-way push but adds persistent connection management. Not warranted for this traffic pattern.
- **WebSockets (socket.io, ws)** — Requires a persistent server process; incompatible with Vercel serverless functions. Would require a separate WebSocket host.
- **Pusher / Ably / Supabase Realtime** — Third-party services with costs and additional integration surface. Project spec is silent on real-time requirements and explicitly rules out live collaboration.
- **Next.js App Router's experimental `revalidatePath`/`revalidateTag` push** — These invalidate the Next.js cache server-side, not the client. They do not push updates to open browser tabs.
- **React Server Components + `router.refresh()`** — Can work as a polling mechanism but ties UX to full page re-renders. SWR's partial data refresh is cleaner for a comment list that lives within a larger page.

**Confidence: HIGH** — SWR polling is the simplest, cheapest, and most maintainable approach for this use case. The risk of user dissatisfaction from a 15-second poll interval is negligible in a coordinator-reviewing-submissions workflow.

---

## Summary Table

| Capability | Library | Version | Confidence |
|---|---|---|---|
| SMTP email | `nodemailer` | `^6.9.x` | HIGH |
| Email types | `@types/nodemailer` | `^6.4.x` | HIGH |
| ZIP generation | `archiver` | `^7.0.x` | HIGH |
| ZIP types | `@types/archiver` | `^6.0.x` | MEDIUM (verify) |
| Statistics/reports | Prisma built-in (`groupBy`, `$queryRaw`) | existing `^7.3.0` | HIGH |
| Comment polling | `swr` | `^2.2.x` | HIGH |

**Versions to verify before installing** (training data cutoff August 2025 — newer patches may exist):
- `npm view nodemailer version`
- `npm view archiver version`
- `npm view @types/archiver version`
- `npm view swr version`

---

## Cross-Cutting Concerns

### Runtime Constraint

Both `nodemailer` and `archiver` require the **Node.js runtime**, not the Edge Runtime. Every Route Handler using these libraries must declare:

```typescript
export const runtime = 'nodejs';
```

This is already the implicit default for most Next.js App Router handlers, but it must be explicit on Vercel to avoid edge deployment.

### Existing Schema Gaps

The following fields/models are not yet in `prisma/schema.prisma` and will need migration before the new features work:

| Gap | Required by |
|---|---|
| `AcademicYear.finalClosureDate` (only `closureDate` exists) | Closure enforcement, ZIP download gate |
| `AcademicYear` relation on `Submission` | All reports scoped by academic year |
| `Submission.selected` (boolean) | Coordinator selection, ZIP generation |
| `Comment` model | Comment threads, exception reports |

### Environment Variables to Add

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=youraccount@gmail.com
SMTP_PASS=[gmail-app-password]
```

---

*Research: 2026-02-25 | Note: versions not verified against live npm registry — confirm before installing.*
