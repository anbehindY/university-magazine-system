# Phase 4: Manager and Reports API - Research

**Researched:** 2026-02-26
**Domain:** ZIP streaming from Vercel Blob, role-scoped report aggregations, Next.js Route Handler patterns
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**ZIP download behaviour**
- Archive structure: `Faculty/StudentName/filename` — top-level per faculty, subfolder per student, files inside
- All files from selected submissions included (no type filtering)
- Stream on-the-fly from Vercel Blob Storage — fetch each blob and pipe into ZIP stream for better UX (no buffering/temp files)
- Empty faculty folders included in ZIP even if no submissions were selected for that faculty
- Download endpoint gated behind `finalClosureDate` — returns 403 before final closure
- File storage: Vercel Blob Storage (credentials in .env)

**Report response shape**
- Single endpoint with type parameter: `GET /api/reports?type=submissions` or `type=exceptions`
- Optional academic year filter: `?academicYearId=X` — defaults to current active academic year
- All authenticated roles can access, scoped by role:
  - Coordinator/guest: see their faculty only
  - Manager/admin: see all faculties
  - Students: 403

**Exception report criteria**
- "No coordinator comment" = zero SubmissionComment records where authorRole is MARKETING_COORDINATOR on that submission
- 14-day threshold: calculated from `submittedAt` — submissions submitted more than 14 days ago with still no coordinator comment
- One report type with optional overdue filter: `GET /api/reports?type=exceptions` for all, add `&overdue=true` for 14-day filter
- Exception row fields: id, title, studentName, facultyName, submittedAt, daysSinceSubmission

**Manager submissions view**
- Core fields only: id, title, studentName, facultyName, submittedAt, fileCount — no isSelected/notes (read-only, no editing surface)
- Optional faculty filter: `?facultyId=X` to narrow results
- Flat array, no pagination (consistent with coordinator endpoint)
- Sort: faculty name ascending, then submittedAt descending within each faculty

### Claude's Discretion

- Statistical report field set (minimum: facultyName, submissionCount, percentageOfTotal, distinctContributors)
- ZIP filename convention (e.g. `selected-submissions-2026.zip`)
- Error handling for failed blob fetches during ZIP streaming

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MGR-01 | Marketing Manager can view all submissions flagged as `isSelected = true` across all faculties (read-only) | `GET /api/manager/submissions` — role gate MARKETING_MANAGER only; Prisma `findMany` with `where:{isSelected:true}`, `include:{user:true}`, optional `facultyId` filter; sort by faculty name asc then submittedAt desc |
| MGR-02 | Marketing Manager can download a ZIP of all files from selected submissions, only after `finalClosureDate` | `GET /api/manager/submissions/download` — `isPastFinalClosure()` gate (403 before); `archiver` 7.0.1 for streaming ZIP; serial blob fetch per file; `Readable.toWeb()` bridge to Next.js `Response`; folder structure `Faculty/StudentName/filename` |
| RPT-01 | Report shows number of submissions per faculty per academic year | `GET /api/reports?type=submissions` — Prisma `groupBy(['facultyId','academicYearId'])` with `_count`; faculty names looked up from `Faculty.findMany`; academicYearId defaults to active year |
| RPT-02 | Report shows percentage of total submissions contributed by each faculty | Derived in application layer from RPT-01 data — total = sum of all faculty counts; percentage = (facultyCount / total) * 100 |
| RPT-03 | Report shows number of distinct student contributors per faculty per academic year | Prisma `groupBy` cannot do `COUNT(DISTINCT userId)`; use `prisma.$queryRaw` with parameterized SQL — `SELECT faculty_id, academic_year_id, COUNT(DISTINCT user_id) AS distinct_contributors FROM submission GROUP BY faculty_id, academic_year_id` |
| RPT-04 | Exception report: all SUBMITTED contributions with no coordinator comment | `GET /api/reports?type=exceptions` — `findMany` where `status:SUBMITTED` and `comments:{none:{authorRole:'MARKETING_COORDINATOR'}}`; Prisma supports nested `none` filter on relations |
| RPT-05 | Exception report: no coordinator comment AND submitted more than 14 days ago | Same query as RPT-04 with additional `submittedAt:{lt: new Date(Date.now() - 14*24*60*60*1000)}`; activated by `?overdue=true` query param |
| RPT-06 | All reports role-scoped: Coordinator/Guest see their faculty only; Manager/Admin see all | Check `session.user.role`; if MARKETING_COORDINATOR or GUEST, fetch `dbUser.facultyId` and add to `where`; if STUDENT return 403; Manager/Admin get no faculty filter |

</phase_requirements>

---

## Summary

Phase 4 introduces three new API surfaces: a manager submissions list, a streaming ZIP download, and a unified reports endpoint. All three follow established project patterns — `auth.api.getSession`, `isPastFinalClosure()`, Prisma queries, `NextResponse.json()` — with two additions: the `archiver` library for ZIP creation and `prisma.$queryRaw` for the distinct-contributor count that Prisma's `groupBy` cannot express natively.

The ZIP download is the most technically novel piece. The pattern is: `archiver` creates a Node.js Transform stream, each blob is fetched serially via `fetch(file.url)` and appended as a stream entry, then `Readable.toWeb(archiver)` converts the Node stream to a Web `ReadableStream` for the `Response` constructor. Node.js v24 (confirmed installed) provides `Readable.toWeb()` natively, so no polyfill is needed. The STATE.md-recorded decision to use serial streaming (never `Promise.all()` prefetch) is critical for memory safety and must be enforced.

For reports, the statistical query (RPT-01 through RPT-03) is cleanest as a combined SQL query using `$queryRaw`, which avoids two round-trips and handles the `COUNT(DISTINCT)` case that Prisma ORM cannot express. The exception reports (RPT-04/05) use standard Prisma `findMany` with Prisma's nested `none` filter. Faculty names for all reports come from a separate `prisma.faculty.findMany()` call merged in application code, because `Submission.facultyId` is a snapshot string with no ORM relation back to `Faculty`.

**Primary recommendation:** Three route files — `app/api/manager/submissions/route.ts`, `app/api/manager/submissions/download/route.ts`, and `app/api/reports/route.ts`. Install `archiver` and `@types/archiver` before implementing the download route.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `archiver` | 7.0.1 (latest) | Streaming ZIP archive generation — appends blob streams serially | Project decision (STATE.md); only well-maintained streaming ZIP library for Node.js |
| `@types/archiver` | 7.0.0 | TypeScript types for archiver | Required for TypeScript project |
| `auth.api.getSession()` | better-auth 1.4.18 | Session retrieval in route handlers | Established project pattern — every route uses this |
| `isPastFinalClosure()` | `lib/closure-guard.ts` | Gate download endpoint behind final closure date | Already built Phase 2; returns boolean |
| `prisma` | 7.4.0 (generated client) | DB queries — submissions, files, comments filter | Project ORM singleton from `@/lib/prisma` |
| `Prisma` namespace | from `@/prisma/generated/client` | `Prisma.sql` template tag for `$queryRaw` typed queries | Exported from generated client; confirmed `Prisma.sql = runtime.sqltag` |
| `Readable.toWeb()` | Node.js v24 built-in | Bridge archiver Node stream → Web ReadableStream for Response | Native in Node.js v24.11.1 (confirmed); no package needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `getActiveAcademicYear()` | `lib/closure-guard.ts` | Default academicYearId for reports when `?academicYearId` not supplied | Reports default to active year |
| `date-fns` | 3.6.0 | Already installed — can use `differenceInDays()` for `daysSinceSubmission` | Computing days-since-submission for exception row fields |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `archiver` | `fflate` (streaming) | fflate has async streaming but is not installed; archiver has prior art in STATE.md |
| `archiver` | Node.js `zlib` + `tar-stream` manual assembly | Too much hand-rolling; archiver wraps this complexity |
| `$queryRaw` for RPT-03 | Application-level dedup after `findMany` | `findMany` + Set dedup works but pulls all rows into memory; `$queryRaw` is more efficient and expressive |

**Installation:**
```bash
pnpm add archiver
pnpm add -D @types/archiver
```

---

## Architecture Patterns

### Recommended Route Structure

```
app/api/
├── manager/
│   └── submissions/
│       ├── route.ts          # GET — manager submissions list (MGR-01)
│       └── download/
│           └── route.ts      # GET — streaming ZIP download (MGR-02)
└── reports/
    └── route.ts              # GET — unified reports endpoint (RPT-01–06)
```

### Pattern 1: Role Gate — Manager Only

Identical to coordinator pattern but checking `MARKETING_MANAGER` role. No faculty scoping (manager sees all).

```typescript
// Mirrors app/api/coordinator/submissions/route.ts pattern
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (session.user.role !== "MARKETING_MANAGER") {
  return NextResponse.json({ error: "Forbidden. Marketing Manager access required." }, { status: 403 });
}
```

### Pattern 2: Final Closure Gate for Download

```typescript
// Source: lib/closure-guard.ts (already built)
if (!(await isPastFinalClosure())) {
  return NextResponse.json(
    { error: "Download unavailable. Final closure date has not passed." },
    { status: 403 }
  );
}
```

Note: The gate is inverted vs normal closure guards — the download is ONLY available AFTER final closure.

### Pattern 3: Streaming ZIP with archiver

Serial approach (STATE.md mandated — never `Promise.all()` prefetch):

```typescript
import archiver from "archiver";
import { Readable } from "stream";

// In the GET handler, after auth + closure gate:
const archive = archiver("zip", { zlib: { level: 6 } });

// Pipe errors to a promise we can await on
const archiveError = new Promise<void>((_, reject) => {
  archive.on("error", reject);
});

// Collect all selected submissions with files
const submissions = await prisma.submission.findMany({
  where: { isSelected: true },
  include: {
    files: true,
    user: { select: { name: true } },
  },
});

// Get all faculty names for folder structure
const faculties = await prisma.faculty.findMany({ select: { id: true, name: true } });
const facultyMap = new Map(faculties.map(f => [f.id, f.name]));

// Fetch blobs SERIALLY and append to archive
(async () => {
  try {
    for (const submission of submissions) {
      const facultyName = facultyMap.get(submission.facultyId ?? "") ?? "Unknown";
      const studentName = submission.user.name ?? "Unknown";
      for (const file of submission.files) {
        const res = await fetch(file.url);
        if (!res.ok || !res.body) continue; // error handling per discretion
        const filename = file.pathname.split("/").pop() ?? file.id;
        archive.append(Readable.fromWeb(res.body as ReadableStream), {
          name: `${facultyName}/${studentName}/${filename}`,
        });
      }
    }
    // Add empty faculty folders for faculties with no selected submissions
    const selectedFacultyIds = new Set(submissions.map(s => s.facultyId));
    for (const [fId, fName] of facultyMap) {
      if (!selectedFacultyIds.has(fId)) {
        archive.append("", { name: `${fName}/.gitkeep` });
      }
    }
    archive.finalize();
  } catch (err) {
    archive.abort();
  }
})();

// Bridge Node stream → Web ReadableStream
const webStream = Readable.toWeb(archive) as ReadableStream;

return new Response(webStream, {
  headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="selected-submissions.zip"`,
  },
});
```

### Pattern 4: Reports — Role-Scoped Faculty Filter

```typescript
// Shared scoping logic for all report types
const role = session.user.role;
if (role === "STUDENT") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

let scopedFacultyId: string | null = null;
if (role === "MARKETING_COORDINATOR" || role === "GUEST") {
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { facultyId: true },
  });
  if (!dbUser?.facultyId) {
    return NextResponse.json({ error: "Forbidden. No faculty assigned." }, { status: 403 });
  }
  scopedFacultyId = dbUser.facultyId;
}
// MARKETING_MANAGER and ADMINISTRATOR: scopedFacultyId stays null → no filter
```

### Pattern 5: Statistical Reports with $queryRaw

For RPT-01, RPT-02, RPT-03 combined (avoids three separate Prisma queries):

```typescript
import { Prisma } from "@/prisma/generated/client";

// Build WHERE clause dynamically
const whereClause = scopedFacultyId
  ? Prisma.sql`AND s.faculty_id = ${scopedFacultyId}`
  : Prisma.empty;

const yearClause = academicYearId
  ? Prisma.sql`AND s.academic_year_id = ${academicYearId}`
  : Prisma.empty;

type StatsRow = {
  faculty_id: string;
  academic_year_id: string | null;
  submission_count: bigint;
  distinct_contributors: bigint;
};

const rows = await prisma.$queryRaw<StatsRow[]>`
  SELECT
    s.faculty_id,
    s.academic_year_id,
    COUNT(s.id)              AS submission_count,
    COUNT(DISTINCT s.user_id) AS distinct_contributors
  FROM submission s
  WHERE s.status = 'SUBMITTED'
  ${whereClause}
  ${yearClause}
  GROUP BY s.faculty_id, s.academic_year_id
`;

// Note: Prisma $queryRaw returns bigint for COUNT columns — convert with Number()
const total = rows.reduce((sum, r) => sum + Number(r.submission_count), 0);
```

### Pattern 6: Exception Reports with Prisma Nested `none` Filter

```typescript
// RPT-04: SUBMITTED with no coordinator comment
const exceptions = await prisma.submission.findMany({
  where: {
    status: "SUBMITTED",
    ...(scopedFacultyId ? { facultyId: scopedFacultyId } : {}),
    ...(academicYearId ? { academicYearId } : {}),
    comments: {
      none: {
        authorRole: "MARKETING_COORDINATOR",
      },
    },
    // RPT-05 overdue filter (add when overdue=true)
    ...(overdue ? {
      submittedAt: {
        lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    } : {}),
  },
  select: {
    id: true,
    title: true,
    submittedAt: true,
    facultyId: true,
    user: { select: { name: true } },
  },
  orderBy: { submittedAt: "asc" },
});
```

### Pattern 7: Faculty Name Resolution for Submissions

`Submission.facultyId` is a snapshot string field with **no ORM relation** to `Faculty`. To resolve faculty names, fetch all faculties separately and merge in application code:

```typescript
const faculties = await prisma.faculty.findMany({ select: { id: true, name: true } });
const facultyMap = new Map(faculties.map(f => [f.id, f.name]));

const result = submissions.map(s => ({
  ...s,
  facultyName: facultyMap.get(s.facultyId ?? "") ?? null,
}));
```

### Anti-Patterns to Avoid

- **Never `Promise.all()` blob fetches**: Fetching all blobs concurrently buffers everything in memory. With large submissions, this will exhaust Vercel function memory. Serial fetch is the correct pattern (confirmed in STATE.md).
- **Never buffer the full ZIP in memory**: Do not collect the archive into a Buffer before returning. Always pipe through a streaming Response.
- **Never import `Prisma` from `@prisma/client`**: This project uses a custom generated client at `@/prisma/generated/client`. Import `Prisma` from there.
- **Never pass `facultyId` from request body for scoping**: Faculty identity for coordinators/guests must come from `prisma.user.findUnique`, not from the request. Same pattern established for coordinator routes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP archive creation | Custom ZIP byte-writing | `archiver` 7.0.1 | ZIP format has CRC32, local file headers, central directory — multiple edge cases |
| Node→Web stream bridge | Manual `ReadableStream` wrapper | `Readable.toWeb()` | Native Node.js v24 API; correct backpressure handling |
| COUNT(DISTINCT) | App-level Set dedup after full `findMany` | `$queryRaw` with SQL | `findMany` loads all rows; SQL aggregation is O(1) memory |
| Faculty name joins | Duplicate `facultyId` resolution per query | Single `faculty.findMany` + Map | One DB round trip for all names |

**Key insight:** `archiver` handles ZIP compression, CRC32 checksums, stream backpressure, and archive finalisation — all of which are subtle and error-prone to implement correctly.

---

## Common Pitfalls

### Pitfall 1: Inverting the Closure Gate for Download

**What goes wrong:** Applying `isPastFinalClosure() → 403` (the normal pattern) instead of `!isPastFinalClosure() → 403`. The download is gated the opposite way — only available AFTER final closure.
**Why it happens:** Every other closure guard in the codebase blocks after the date. This is the only endpoint that blocks BEFORE it.
**How to avoid:** Comment the guard clearly. The check is: `if (!(await isPastFinalClosure())) return 403`.
**Warning signs:** In tests, the endpoint returns 403 even after the closure date has passed.

### Pitfall 2: BigInt from $queryRaw COUNT Columns

**What goes wrong:** `COUNT()` in PostgreSQL via Prisma `$queryRaw` returns JavaScript `bigint`, not `number`. JSON.stringify silently drops BigInt values, causing empty fields in the API response.
**Why it happens:** Prisma `$queryRaw` maps SQL `BIGINT` to JS `bigint`. This is correct but surprising.
**How to avoid:** Explicitly convert: `Number(row.submission_count)` before returning. Or cast in SQL: `COUNT(s.id)::int`.
**Warning signs:** `percentageOfTotal` is `NaN`; count fields are missing from the JSON response.

### Pitfall 3: Submission.facultyId Has No ORM Relation

**What goes wrong:** Trying to `include: { faculty: true }` on a `Submission` query and getting a Prisma type error.
**Why it happens:** `Submission.facultyId` is a snapshot `String?` field in the schema with no `@relation` directive. There is no back-relation from `Submission` to `Faculty`.
**How to avoid:** Always resolve faculty names via a separate `prisma.faculty.findMany()` and a Map. This is the correct pattern for all Phase 4 routes.
**Warning signs:** TypeScript error "Property 'faculty' does not exist on Submission include type."

### Pitfall 4: archiver `finalize()` Called Before All Blob Appends Complete

**What goes wrong:** `archive.finalize()` called while blobs are still being fetched (e.g., if the serial loop runs in a separate async context that isn't awaited).
**Why it happens:** The streaming pattern requires careful async coordination — `finalize()` must be called after the last `archive.append()`.
**How to avoid:** Use the IIFE async pattern shown in Pattern 3. `finalize()` is the last call inside the awaited loop, with a try/catch calling `archive.abort()` on error.
**Warning signs:** ZIP archive is truncated or corrupt; some files missing from the download.

### Pitfall 5: Missing Empty Faculty Folders

**What goes wrong:** The user decision requires empty faculty folders in the ZIP even if no submissions are selected for that faculty. Omitting this breaks the spec.
**Why it happens:** The natural loop only iterates over submissions; faculties with no selected submissions are not visited.
**How to avoid:** After processing all submissions, iterate all faculties and append a placeholder entry (e.g., `.gitkeep` file) for any faculty not already in the archive.
**Warning signs:** ZIP opens to show only faculties that had selected submissions.

### Pitfall 6: Role Scoping Bug — Guest Sees All Faculties

**What goes wrong:** The role check for reports only gates on STUDENT for 403, but forgets to include GUEST in the faculty-scoped group.
**Why it happens:** GUEST is easy to overlook since it's not in the MARKETING_* naming group. CONTEXT.md is explicit: coordinators AND guests see their faculty only.
**How to avoid:** The scoping condition is `role === "MARKETING_COORDINATOR" || role === "GUEST"`.
**Warning signs:** A guest user receives all-faculty data.

---

## Code Examples

Verified patterns from official sources and existing project code:

### Prisma $queryRaw with sql tag (safe parameterized)
```typescript
// Source: Prisma namespace — Prisma.sql confirmed as runtime.sqltag in prismaNamespace.ts
import { Prisma } from "@/prisma/generated/client";
import prisma from "@/lib/prisma";

const facultyFilter = scopedFacultyId
  ? Prisma.sql`AND faculty_id = ${scopedFacultyId}`
  : Prisma.empty;

const rows = await prisma.$queryRaw<{ submission_count: bigint }[]>`
  SELECT COUNT(id) AS submission_count FROM submission WHERE 1=1 ${facultyFilter}
`;
const count = Number(rows[0].submission_count);
```

### archiver + Readable.toWeb (Node.js v24)
```typescript
// Source: archiver npm 7.0.1; Readable.toWeb confirmed native in Node.js v24.11.1
import archiver from "archiver";
import { Readable } from "stream";

const archive = archiver("zip", { zlib: { level: 6 } });
// ... append entries serially ...
archive.finalize();
const webStream = Readable.toWeb(archive) as ReadableStream;
return new Response(webStream, {
  headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${zipFilename}"`,
  },
});
```

### Prisma nested `none` filter for exception reports
```typescript
// Source: Prisma ORM — nested relation filter with 'none' operator
const submissions = await prisma.submission.findMany({
  where: {
    status: "SUBMITTED",
    comments: { none: { authorRole: "MARKETING_COORDINATOR" } },
  },
});
```

### Sorting manager submissions (faculty name asc, then submittedAt desc)
```typescript
// Prisma cannot orderBy a related field name from a snapshot string
// Faculty name sort must be done in application layer after fetching facultyMap
submissions.sort((a, b) => {
  const fa = facultyMap.get(a.facultyId ?? "") ?? "";
  const fb = facultyMap.get(b.facultyId ?? "") ?? "";
  if (fa !== fb) return fa.localeCompare(fb);
  return (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0);
});
```

Note: Prisma `orderBy` cannot sort by a snapshot `facultyId` string joined to a name. Application-layer sort is required.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Readable.from()` + manual pipe to Response | `Readable.toWeb()` native bridge | Node.js v16.0.0 | Cleaner; correct backpressure; no PassThrough wrapper needed |
| Prisma `findMany` + JS dedup for distinct counts | `$queryRaw` with `COUNT(DISTINCT)` | Prisma v2+ | More efficient; correct semantics; avoids loading all rows |
| `archiver` v5/v6 callback API | `archiver` v7.0.1 — same API, updated deps | 2024 | No breaking changes to primary API; `zip-stream` 6.x dep |

**Deprecated/outdated:**
- `res.pipe()` pattern (Express-style): Not applicable in Next.js App Router. Use `Readable.toWeb()` + `new Response(stream)`.
- `getDownloadUrl()` from `@vercel/blob`: Returns a URL that forces browser download — NOT useful for server-side ZIP assembly. Use `fetch(file.url)` directly to get the blob content.

---

## Open Questions

1. **Blob URL expiry (STATE.md concern)**
   - What we know: `@vercel/blob` only supports `access: 'public'` (confirmed from type declarations). Public blobs have permanent CDN URLs — no expiry.
   - What's unclear: Whether there's a rate limit on fetching many blob URLs in rapid succession from the same function.
   - Recommendation: Treat as resolved — URLs do not expire. Serial fetch (not parallel) already mitigates any rate limit risk. No `generateSignedUrl()` call needed.

2. **ZIP filename convention**
   - What we know: Marked as Claude's Discretion in CONTEXT.md.
   - Recommendation: Use `selected-submissions-{yearLabel}.zip` where `yearLabel` comes from the active academic year. Requires one extra `getActiveAcademicYear()` call. Falls back to `selected-submissions.zip` if no active year.

3. **Failed blob fetch error handling during ZIP stream**
   - What we know: Marked as Claude's Discretion. Once streaming has started, we cannot return a JSON error response.
   - Recommendation: Log the error with `console.error`, skip the file (continue to next), and append a plaintext `{filename}.error.txt` entry noting the failure. This keeps the ZIP valid and gives the manager visibility into missing files.

4. **Manager submissions sort by faculty name — ORM vs app-layer**
   - What we know: `Submission.facultyId` is a snapshot string with no ORM relation to `Faculty`. Prisma `orderBy` cannot join to resolve the name.
   - Recommendation: Fetch submissions with `orderBy: { submittedAt: 'desc' }`, fetch faculty map, then sort in application layer by `facultyMap.get(s.facultyId)` ascending. This is deterministic and avoids `$queryRaw` for a simple list endpoint.

---

## Sources

### Primary (HIGH confidence)

- Project codebase — `prisma/schema.prisma` confirmed: `Submission.facultyId` is `String?` with no `@relation`; `Faculty` model has no `submissions` back-relation
- Project codebase — `prisma/generated/internal/prismaNamespace.ts` line 50: `Prisma.sql = runtime.sqltag` — confirmed exported and usable
- Project codebase — `@prisma/client/runtime/client.d.ts` lines 209–210: `$queryRaw` and `$queryRawTyped` signatures confirmed
- Project codebase — `lib/closure-guard.ts`: `isPastFinalClosure()` confirmed functional for gate pattern
- Node.js v24.11.1 — `Readable.toWeb` confirmed type `function` (runtime introspection)
- `@vercel/blob` 1.1.1 — `create-folder-C02EFEPE.d.ts` line 85: `getDownloadUrl(blobUrl: string): string`; access type confirmed as `'public'` only — no signed/expiring URLs
- Project codebase — `app/api/coordinator/submissions/route.ts`: role gate and DB user lookup pattern for faculty scoping

### Secondary (MEDIUM confidence)

- `archiver` 7.0.1 — npm registry metadata confirmed version, MIT licence, streaming zip-stream dependency. API shape inferred from npm info and prior project art (STATE.md decision); not directly inspected from source (not installed yet).
- `@types/archiver` 7.0.0 — confirmed via `pnpm info`

### Tertiary (LOW confidence)

- Vercel Blob URL permanence: Inferred from `access: 'public'` being the only option in the SDK types. Official Vercel Blob docs were not directly fetched (network unavailable). Treated as HIGH confidence based on type evidence; validate by checking one stored URL's expiry behaviour in dev.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed via npm registry or existing project; versions pinned
- Architecture: HIGH — all patterns derived from existing project routes and confirmed schema
- Pitfalls: HIGH — schema facts (no Submission→Faculty relation, BigInt from $queryRaw) verified directly from generated types
- Blob streaming: MEDIUM-HIGH — archiver API not yet installed; streaming pattern is established in STATE.md and Node stream bridge confirmed native

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable libraries; `archiver` v7 and `@vercel/blob` v1 are stable)
