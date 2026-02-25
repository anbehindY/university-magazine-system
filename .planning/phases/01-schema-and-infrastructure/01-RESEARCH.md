# Phase 1: Schema and Infrastructure - Research

**Researched:** 2026-02-26
**Domain:** Prisma schema migration, Nodemailer SMTP, closure-guard utility, Next.js 16 App Router
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Closure Date Migration
- Existing `closureDate` field on `AcademicYear` maps to `firstClosureDate` (the date that blocks new submissions)
- `finalClosureDate` is a new nullable field added alongside it
- The old `closureDate` column is removed — clean schema, no legacy column kept
- Both `firstClosureDate` and `finalClosureDate` are nullable; admin can set them separately after year creation
- Academic year opens for submissions immediately when created by admin (no separate start date)
- Admin UI updated in this phase to show both date fields, labelled **"First Closure Date"** and **"Final Closure Date"**

#### Active Academic Year Detection
- `AcademicYear` gets a boolean `isActive` field; admin explicitly marks one year as active
- System enforces only one active year at a time (new activation deactivates the previous)
- If no academic year is active: student submission attempts return a clear error ("No active academic year — submissions are currently closed")
- Admin can change the active year even if submissions exist against it, but the system warns before allowing

#### Historical Submissions
- Existing submissions (pre-migration) have `academicYearId = null` and are left as-is — they predate the year system
- `academicYearId` on `Submission` is nullable in the Prisma schema
- All new submissions must have `academicYearId` set (enforced at API level, not schema level)
- Reports filter to `academicYearId IS NOT NULL` — historical null-year submissions are excluded from reporting

#### Mailer Configuration
- `SMTP_FROM` env var holds the From email address (e.g. `noreply@university.ac.uk`)
- Display name hardcoded as **"University Magazine System"** (no env var needed)
- Email failure handling: `console.error` only — fire-and-forget, no database log table
- `lib/mailer.ts` built as a general-purpose utility (not coordinator-only), suitable for future notification types

### Claude's Discretion
- Exact Prisma migration file naming and transaction strategy
- How `isActive` uniqueness is enforced (DB constraint vs application logic)
- `lib/closure-guard.ts` internal implementation details (caching strategy, etc.)
- `.env.example` comment copy

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Administrator can configure two closure dates per academic year — `firstClosureDate` (blocks new submissions) and `finalClosureDate` (blocks all updates) | Migration strategy: rename existing `closureDate` → `firstClosureDate`, add `finalClosureDate`; add `isActive` boolean; update admin UI form with DatePicker component; update API routes |
| INFRA-02 | `Submission` model stores `isSelected`, `selectedAt`, `selectedById`, `academicYearId`, and `facultyId` snapshot | Additive Prisma migration; all fields nullable (except `isSelected` which defaults false); relate to AcademicYear and User models |
| INFRA-03 | `SubmissionComment` model exists with fields: submissionId, authorId, authorRole, body, createdAt — enabling two-way threads per submission | New model in migration; `@@index([submissionId])` required; `authorRole` stored as string snapshot of Role enum value |
| INFRA-04 | Email service (`lib/mailer.ts`) configured with Nodemailer and Gmail SMTP for sending transactional notifications | Nodemailer 6.10.1 (6.x required — 7+ ESM-only conflicts with Prisma CJS); singleton transporter pattern; fire-and-forget wrapper; SMTP_* env vars |
</phase_requirements>

---

## Summary

Phase 1 is a purely foundational phase: no user-facing features ship, but every subsequent phase depends on the work done here. The deliverables are two migration changes (schema additions to `AcademicYear` and `Submission`, plus a new `SubmissionComment` model), two shared utility modules (`lib/closure-guard.ts` and `lib/mailer.ts`), an update to the admin academic year form to expose both closure date fields, and a new `.env.example` file.

The single highest-risk item is the rename of the existing `closureDate` column to `firstClosureDate`. The existing field is actively used in four files: `prisma/schema.prisma`, `app/api/admin/academic-years/route.ts`, `app/(management)/admin/page.tsx`, and `app/api/academic-years/route.ts` (and indirectly in `app/(student)/submissions/page.tsx`). The migration must rename the column and all five reference sites must be updated atomically — any missed reference causes a TypeScript compile error (safe) or a silent runtime null (dangerous). A TypeScript build check after migration is the verification gate.

Nodemailer must be pinned to `^6.9` (latest 6.x is 6.10.1). Nodemailer 7+ (current latest: 8.0.1) is ESM-only and conflicts with the project's CommonJS/ESM hybrid resolution used by `@prisma/client` and `better-auth`. The existing Prisma client is a singleton via `globalForPrisma` — the mailer transporter should follow the same singleton pattern in `lib/mailer.ts`.

**Primary recommendation:** Run the migration first, update all `closureDate` references, regenerate the Prisma client, and confirm TypeScript compiles before writing either utility module.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.3.0 (installed) | ORM, migrations, client generation | Already installed; `prisma migrate dev` handles migration lifecycle |
| nodemailer | 6.10.1 (pin to ^6.9) | SMTP email transport | 6.x is CJS-compatible; project uses CommonJS interop via Next.js bundler |
| @types/nodemailer | 7.0.11 (latest) | TypeScript types for nodemailer | devDependency only; version does not need to match nodemailer major |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.6.0 (installed) | Date comparisons in closure-guard | Already installed; use `isAfter()` / `isBefore()` for closure checks |
| zod | 4.3.6 (installed) | Request body validation on API route updates | Already installed; validate admin form payloads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nodemailer 6.x | nodemailer 7.x or 8.x | 7+ is ESM-only; breaks CommonJS resolution in this project — DO NOT use |
| nodemailer 6.x | @sendgrid/mail, resend | Overkill for SMTP; spec explicitly says Nodemailer + Gmail SMTP |
| Application-layer `isActive` enforcement | PostgreSQL partial unique index | DB constraint is more robust but requires raw SQL in migration; application logic with Prisma transaction is simpler and sufficient |

**Installation:**
```bash
pnpm add nodemailer@^6.9
pnpm add -D @types/nodemailer
```

---

## Architecture Patterns

### Recommended Project Structure

```
lib/
├── prisma.ts           # existing singleton — do not change
├── closure-guard.ts    # NEW: getActiveAcademicYear(), isPastFirstClosure(), isPastFinalClosure()
├── mailer.ts           # NEW: Nodemailer singleton + sendMail()
└── ...

prisma/
├── schema.prisma       # modify: AcademicYear, Submission; add SubmissionComment
└── migrations/
    └── YYYYMMDDHHMMSS_phase1_schema/
        └── migration.sql

app/
├── api/
│   ├── academic-years/route.ts         # update: closureDate → firstClosureDate
│   └── admin/academic-years/route.ts   # update: closureDate → firstClosureDate; add isActive handling
└── (management)/
    └── admin/
        └── page.tsx                    # update: add firstClosureDate + finalClosureDate fields

.env.example            # NEW: document all required env vars
```

### Pattern 1: Prisma Migration — Rename + Extend

**What:** Rename `closureDate` to `firstClosureDate`, add `finalClosureDate` and `isActive` to `AcademicYear`; add fields to `Submission`; add `SubmissionComment` model.

**When to use:** Always — schema changes must go through `prisma migrate dev`.

**Approach:** Single migration covers all Phase 1 schema changes. Prisma generates the SQL. The rename cannot be auto-detected by Prisma — it will ask if you want to drop+recreate or rename. Choose rename to preserve existing data. The migration SQL should use `ALTER TABLE "academic_year" RENAME COLUMN "closure_date" TO "first_closure_date"`.

**Migration command:**
```bash
npx prisma migrate dev --name phase1_schema
# When Prisma asks about renaming, confirm the rename (Y)
# Then regenerate client:
npx prisma generate
```

**Resulting schema changes to `AcademicYear`:**
```prisma
model AcademicYear {
  id                String    @id @default(uuid())
  yearLabel         String    @db.VarChar(35) @map("year_label")
  startDate         DateTime  @db.Date @map("start_date")
  endDate           DateTime  @db.Date @map("end_date")
  startTime         DateTime  @db.Time @map("start_time")
  endTime           DateTime  @db.Time @map("end_time")
  notiMessage       String    @db.VarChar(255) @map("noti_message")
  firstClosureDate  DateTime? @db.Date @map("first_closure_date")  // renamed from closureDate
  finalClosureDate  DateTime? @db.Date @map("final_closure_date")  // new
  isActive          Boolean   @default(false) @map("is_active")    // new
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  updatedById       String?   @map("updated_by")
  updatedBy         User?     @relation(fields: [updatedById], references: [id])
  submissions       Submission[]  // new relation

  @@map("academic_year")
}
```

**Resulting schema additions to `Submission`:**
```prisma
model Submission {
  id             String           @id @default(uuid())
  userId         String           @map("user_id")
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  status         SubmissionStatus @default(DRAFT)
  agreed         Boolean          @default(false)
  notes          String?          @db.Text
  submittedAt    DateTime?        @map("submitted_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")
  files          SubmissionFile[]
  comments       SubmissionComment[]  // new relation
  // New fields:
  isSelected     Boolean          @default(false) @map("is_selected")
  selectedAt     DateTime?        @map("selected_at")
  selectedById   String?          @map("selected_by_id")
  selectedBy     User?            @relation("SubmissionSelector", fields: [selectedById], references: [id])
  facultyId      String?          @map("faculty_id")
  academicYearId String?          @map("academic_year_id")
  academicYear   AcademicYear?    @relation(fields: [academicYearId], references: [id])

  @@map("submission")
}
```

**New `SubmissionComment` model:**
```prisma
model SubmissionComment {
  id           String     @id @default(uuid())
  submissionId String     @map("submission_id")
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  authorId     String     @map("author_id")
  author       User       @relation(fields: [authorId], references: [id])
  authorRole   String     @map("author_role")  // snapshot of role at time of comment
  body         String     @db.Text
  createdAt    DateTime   @default(now()) @map("created_at")

  @@index([submissionId])
  @@map("submission_comment")
}
```

### Pattern 2: Prisma Singleton — Mailer Transporter

**What:** Create a Nodemailer transporter singleton following the same `globalForPrisma` pattern already used in `lib/prisma.ts`.

**When to use:** All SMTP sends go through `lib/mailer.ts` — never create a transporter inline.

**Example:**
```typescript
// lib/mailer.ts
// Source: nodemailer official docs + project's lib/prisma.ts singleton pattern
import nodemailer from "nodemailer";

const globalForMailer = global as unknown as { mailer: nodemailer.Transporter };

const transporter =
  globalForMailer.mailer ||
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

if (process.env.NODE_ENV !== "production") globalForMailer.mailer = transporter;

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  await transporter.sendMail({
    from: `"University Magazine System" <${process.env.SMTP_FROM}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
```

**Fire-and-forget call site pattern:**
```typescript
// In any API route — NEVER await before responding
sendMail({ to, subject, html }).catch(console.error);
return NextResponse.json({ success: true }, { status: 200 });
```

### Pattern 3: Closure Guard Utility

**What:** `lib/closure-guard.ts` exports three functions that all mutating route handlers call to enforce date gates.

**When to use:** Any route that writes to a Submission or SubmissionComment must call the appropriate guard.

**Example:**
```typescript
// lib/closure-guard.ts
import prisma from "@/lib/prisma";

export async function getActiveAcademicYear() {
  return prisma.academicYear.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      yearLabel: true,
      firstClosureDate: true,
      finalClosureDate: true,
    },
  });
}

export async function isPastFirstClosure(): Promise<boolean> {
  const year = await getActiveAcademicYear();
  if (!year || !year.firstClosureDate) return false;
  return new Date() > year.firstClosureDate;
}

export async function isPastFinalClosure(): Promise<boolean> {
  const year = await getActiveAcademicYear();
  if (!year || !year.finalClosureDate) return false;
  return new Date() > year.finalClosureDate;
}
```

### Pattern 4: isActive Uniqueness Enforcement

**What:** Only one `AcademicYear` can have `isActive = true` at a time. Enforce via a Prisma transaction in the admin API route.

**When to use:** Any PUT/PATCH on `AcademicYear` that sets `isActive = true`.

**Example:**
```typescript
// In the admin academic-years PUT handler
await prisma.$transaction([
  // Deactivate all other years first
  prisma.academicYear.updateMany({
    where: { id: { not: body.id } },
    data: { isActive: false },
  }),
  // Then activate the target year
  prisma.academicYear.update({
    where: { id: body.id },
    data: { isActive: true },
  }),
]);
```

**Why not a DB unique constraint:** A partial unique index (`WHERE is_active = true`) would work but requires raw SQL in the migration and is harder to maintain. The transaction approach is simpler and sufficient for this use case (low write frequency, single admin user).

### Pattern 5: Admin UI — DatePicker for Closure Dates

**What:** Add `firstClosureDate` and `finalClosureDate` fields to the existing academic year form at `app/(management)/admin/page.tsx`. Use the existing `<DatePicker>` component from `components/ui/date-picker.tsx`.

**When to use:** The admin form already uses native `<input type="date">` for startDate/endDate. The CONTEXT.md specifies using the `<DatePicker>` component (not the native input) for the new closure date fields.

**Existing DatePicker API:**
```typescript
// components/ui/date-picker.tsx — already in codebase
type DatePickerProps = {
  value?: Date;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  className?: string;
};
// Usage:
<DatePicker
  value={firstClosureDate}
  onChange={setFirstClosureDate}
  placeholder="Pick first closure date"
/>
```

**Note:** The existing admin form uses `<Input type="date">` for startDate/endDate. Both patterns work. The CONTEXT.md explicitly says to use the DatePicker component for the two new closure date fields.

### Anti-Patterns to Avoid

- **Awaiting email before response:** Never `await sendMail()` before returning the HTTP response. SMTP failure must not fail the user request.
- **Nodemailer 7+ or 8.x:** ESM-only. Will cause module resolution errors with `@prisma/client` and `better-auth`. Pin to `^6.9`.
- **Inline transporter creation:** Never create a `nodemailer.createTransport()` inside a route handler — creates a new TCP connection on every request. Use the singleton in `lib/mailer.ts`.
- **Dropping `closureDate` without renaming:** If the migration drops the column instead of renaming it, all existing data (closure dates already set by admin) is lost. Confirm rename intent when Prisma asks.
- **Non-nullable `academicYearId` on `Submission`:** Must remain nullable to preserve historical submissions. Enforcing not-null at schema level would break the existing data.
- **Storing `authorRole` as the Role enum type:** The Prisma enum `Role` is fine, but string snapshot is safer — it preserves the role value even if the enum changes in future migrations. Use `String` type.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP email sending | Custom fetch to Gmail API | nodemailer 6.x | nodemailer handles connection pooling, TLS negotiation, MIME construction, retry logic |
| Date comparison for closure gates | Custom timestamp arithmetic | `new Date() > year.firstClosureDate` (native) or `date-fns isAfter()` | One-liners — no custom library needed |
| Migration SQL | Hand-written ALTER TABLE | `prisma migrate dev` | Prisma generates correct SQL for the provider; handles column renames with confirmation prompt |
| isActive uniqueness | DB-level partial unique index | Prisma `$transaction` with `updateMany` to clear + `update` to set | Transaction is simpler to maintain and sufficient for low-frequency admin writes |

**Key insight:** The infrastructure patterns here are all well-solved problems. The only non-trivial decision is nodemailer version pinning (6.x not 7+).

---

## Common Pitfalls

### Pitfall 1: Prisma Rename Detection
**What goes wrong:** Running `prisma migrate dev` after renaming `closureDate` to `firstClosureDate` in the schema causes Prisma to ask: "We need to reset the database. Do you want to continue?" OR prompts to confirm column rename. If you answer wrong, Prisma drops the column instead of renaming it.
**Why it happens:** Prisma cannot always detect a rename vs a drop+add. It depends on whether only one field changed at a time.
**How to avoid:** Rename ONE field per migration if possible. When Prisma shows the prompt, verify it says "rename" not "drop". Alternatively, write the rename directly in migration SQL: `ALTER TABLE "academic_year" RENAME COLUMN "closure_date" TO "first_closure_date";`
**Warning signs:** Migration plan shows `DROP COLUMN "closure_date"` and `ADD COLUMN "first_closure_date"` — this means data loss, not a rename.

### Pitfall 2: Missing `closureDate` Reference Updates
**What goes wrong:** After the migration renames the DB column, the Prisma client is regenerated and TypeScript compilation fails on any remaining reference to `.closureDate`. Five files reference this field:
- `prisma/schema.prisma` — the source of truth (changes here first)
- `app/api/admin/academic-years/route.ts` — `select: { closureDate: true }` on lines 55, and used in response type
- `app/(management)/admin/page.tsx` — `AcademicYearItem.closureDate` type (line 34), display on lines 442, 443, 498, 499
- `app/api/academic-years/route.ts` — where clause, orderBy, select (lines 11-45)
- `app/(student)/submissions/page.tsx` — reads `payload.academicYear?.closureDate` (lines 149, 153)
**Why it happens:** Grep reveals 5 files with 12+ reference sites. Easy to miss one.
**How to avoid:** After `prisma generate`, run `pnpm build` or `npx tsc --noEmit`. TypeScript will surface every missed reference. Fix all TypeScript errors before proceeding.
**Warning signs:** `Property 'closureDate' does not exist on type` TypeScript error after regenerating client.

### Pitfall 3: Nodemailer Version Conflict
**What goes wrong:** Installing `nodemailer@latest` (currently 8.0.1) causes `ERR_REQUIRE_ESM` at runtime when the route handler imports the module.
**Why it happens:** Nodemailer 7+ switched to pure ESM. Next.js 16's App Router still uses a CommonJS interop for server-side code that conflicts with ESM-only packages when used alongside Prisma's CJS output.
**How to avoid:** Always install `nodemailer@^6.9`. Verify with `npm ls nodemailer` after install.
**Warning signs:** `require() of ES Module` or `ERR_REQUIRE_ESM` error at route invocation. Also: if `package.json` shows `"nodemailer": "^7.x"` or `"^8.x"`, immediately downgrade.

### Pitfall 4: Transporter Created Per-Request
**What goes wrong:** Creating `nodemailer.createTransport()` inside the route handler body causes a new TCP connection to SMTP on every request. Under load this exhausts file descriptors and causes SMTP connection refused errors.
**Why it happens:** Route handlers are called on every HTTP request; module-level singletons persist across requests in the same Node.js process.
**How to avoid:** Define the transporter at module level in `lib/mailer.ts` using the same `globalForPrisma` singleton pattern already used for Prisma. All routes import `sendMail` from this module.
**Warning signs:** SMTP `ECONNRESET` errors under load; growing number of TCP sockets in `netstat`.

### Pitfall 5: `@db.Date` Type and Timezone Issues
**What goes wrong:** Closure dates stored as `@db.Date` (date-only, no time component) are compared against `new Date()` which includes time. This means at exactly midnight a date comparison may behave unexpectedly depending on the server timezone.
**Why it happens:** PostgreSQL `DATE` type stores without time/timezone. When Prisma reads it back, it becomes a JavaScript `Date` at midnight UTC. Comparisons like `new Date() > firstClosureDate` work correctly only if both sides are in UTC or the comparison tolerates midnight boundary.
**How to avoid:** The existing codebase already handles this in the student submissions page by calling `cutoff.setHours(23, 59, 59, 999)`. Apply the same pattern in `isPastFirstClosure()` and `isPastFinalClosure()` — treat the closure date as end-of-day in UTC. OR compare using `>= new Date(firstClosureDate.toDateString())` to strip time from both sides.
**Warning signs:** Closure enforcement appears to trigger one day early for users in timezones east of UTC.

### Pitfall 6: Missing `User` Relations for `selectedById` and `authorId`
**What goes wrong:** Adding `selectedById` to `Submission` and `authorId` to `SubmissionComment` without updating the `User` model's relation arrays causes Prisma to fail schema validation with "This field is part of a relation, but there is no corresponding relation field on the other side."
**Why it happens:** Prisma requires bidirectional relation declarations.
**How to avoid:** Add `selectedSubmissions Submission[] @relation("SubmissionSelector")` to the `User` model. Add `submissionComments SubmissionComment[]` to the `User` model.
**Warning signs:** `prisma validate` or `prisma migrate dev` fails with relation field mismatch error.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Prisma Singleton (existing pattern — replicate for mailer)
```typescript
// Source: /home/alfie/next-prisma/lib/prisma.ts — existing working pattern
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

### getActiveAcademicYear() with isActive
```typescript
// lib/closure-guard.ts
import prisma from "@/lib/prisma";

export async function getActiveAcademicYear() {
  return prisma.academicYear.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      yearLabel: true,
      firstClosureDate: true,
      finalClosureDate: true,
    },
  });
}

export async function isPastFirstClosure(): Promise<boolean> {
  const year = await getActiveAcademicYear();
  if (!year?.firstClosureDate) return false;
  // Treat closure date as end-of-day to avoid midnight boundary issues
  const cutoff = new Date(year.firstClosureDate);
  cutoff.setHours(23, 59, 59, 999);
  return Date.now() > cutoff.getTime();
}

export async function isPastFinalClosure(): Promise<boolean> {
  const year = await getActiveAcademicYear();
  if (!year?.finalClosureDate) return false;
  const cutoff = new Date(year.finalClosureDate);
  cutoff.setHours(23, 59, 59, 999);
  return Date.now() > cutoff.getTime();
}
```

### isActive Toggle in Admin API (Transaction)
```typescript
// In app/api/admin/academic-years/route.ts — new PATCH or extended PUT
await prisma.$transaction([
  prisma.academicYear.updateMany({
    where: { id: { not: body.id } },
    data: { isActive: false },
  }),
  prisma.academicYear.update({
    where: { id: body.id },
    data: { isActive: true },
  }),
]);
```

### API Route: Academic Years — closureDate → firstClosureDate Update
```typescript
// app/api/academic-years/route.ts — updated query (closureDate renamed throughout)
const academicYear = await prisma.academicYear.findFirst({
  where: {
    isActive: true,
  },
  select: {
    yearLabel: true,
    firstClosureDate: true,  // was: closureDate
    finalClosureDate: true,  // new
    endDate: true,
  },
});
```

### .env.example
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Better Auth
BETTER_AUTH_SECRET="your-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="your-blob-token-here"

# Seed data (development only)
DEFAULT_ADMIN_EMAIL="admin@example.com"
DEFAULT_ADMIN_PASSWORD="password"
DEFAULT_ADMIN_NAME="Admin"

# SMTP (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@university.ac.uk"
```

### DatePicker in Admin Form (existing component)
```typescript
// app/(management)/admin/page.tsx — add to form state and JSX
const [firstClosureDate, setFirstClosureDate] = useState<Date | undefined>();
const [finalClosureDate, setFinalClosureDate] = useState<Date | undefined>();

// In form JSX:
<div className="space-y-2">
  <Label className="text-slate-700">First Closure Date</Label>
  <DatePicker
    value={firstClosureDate}
    onChange={setFirstClosureDate}
    placeholder="Pick first closure date"
  />
</div>
<div className="space-y-2">
  <Label className="text-slate-700">Final Closure Date</Label>
  <DatePicker
    value={finalClosureDate}
    onChange={setFinalClosureDate}
    placeholder="Pick final closure date"
  />
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `nodemailer` any version | `nodemailer ^6.9` pinned | nodemailer 7.0 release (2024) | Must pin; 7+ breaks CJS interop |
| Single `closureDate` | `firstClosureDate` + `finalClosureDate` | Phase 1 migration | Unlocks two-tier closure enforcement in Phase 2 |
| No active year tracking | `isActive` boolean + explicit activation | Phase 1 migration | Needed for `getActiveAcademicYear()` used in all closure checks |
| Submissions without year linkage | `academicYearId` nullable FK | Phase 1 migration | Enables per-year reporting in Phase 4 |

**Deprecated/outdated in this codebase after Phase 1:**
- `AcademicYear.closureDate`: Removed — replaced by `firstClosureDate` and `finalClosureDate`
- `app/api/academic-years/route.ts` heuristic (finds year by closureDate or endDate): Replaced by `isActive: true` query
- `app/(student)/submissions/page.tsx` closureDate fallback to endDate: Replaced by explicit `firstClosureDate` and `finalClosureDate`

---

## Open Questions

1. **`AcademicYear` form redesign scope**
   - What we know: The admin page at `app/(management)/admin/page.tsx` currently manages academic years with a form that does NOT include a closure date input (closure dates are set separately and only shown in the history table). The `closureDate` column existed in schema but was never settable via the admin form — it appears to have been set by other means or left null.
   - What's unclear: The CONTEXT.md says "Admin UI updated in this phase to show both date fields in the existing form." Does this mean the CREATE/EDIT form gets firstClosureDate and finalClosureDate inputs? Or a separate section?
   - Recommendation: Add both closure date fields to the existing CREATE/EDIT dialog form using the `<DatePicker>` component. Both fields are optional (nullable) so they can be left blank at creation and set later.

2. **`isActive` field in admin UI**
   - What we know: CONTEXT.md says admin explicitly marks one year as active, and the system enforces only one active year at a time.
   - What's unclear: The admin page currently has no active/inactive concept. Where does the toggle live — in the history table row (a button), in the edit dialog, or a dedicated switch?
   - Recommendation: Add an "Activate" button to each row in the academic year history table. When clicked, it calls a PATCH endpoint that runs the `$transaction` to deactivate all others and activate this one. Show the current active year with a badge (the existing badge pattern is visible in the codebase). Warn inline if activating a year that already has submissions attached to a different year.

3. **`Submission` relation to `User` for `selectedBy`**
   - What we know: The `User` model has `submissions Submission[]` relation but adding `selectedSubmissions` relation requires careful Prisma naming.
   - What's unclear: Prisma may require `@relation(name: "SubmissionSelector")` on both sides.
   - Recommendation: Use named relations: `selectedBy User? @relation("SubmissionSelector", ...)` on `Submission` and `selectedSubmissions Submission[] @relation("SubmissionSelector")` on `User`. Named relations are required when two relations exist between the same two models.

---

## Sources

### Primary (HIGH confidence)
- `/home/alfie/next-prisma/prisma/schema.prisma` — confirmed existing models, fields, column names; `closureDate` is `@db.Date @map("closure_date")`
- `/home/alfie/next-prisma/lib/prisma.ts` — singleton pattern to replicate for mailer
- `/home/alfie/next-prisma/components/ui/date-picker.tsx` — confirmed DatePicker API signature
- `/home/alfie/next-prisma/app/(management)/admin/page.tsx` — confirmed admin form structure, state patterns, form API call structure
- `/home/alfie/next-prisma/app/api/admin/academic-years/route.ts` — confirmed all closureDate reference sites (12 total across 5 files)
- `npm view nodemailer versions` (live npm registry) — confirmed latest 6.x is 6.10.1; latest overall is 8.0.1
- `npm view nodemailer@6.10.1 main` — confirmed returns `lib/nodemailer.js` (CJS entry point)

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` (2026-02-25) — confirmed nodemailer 6.x CJS requirement; confirmed fire-and-forget email pattern; confirmed archiver for ZIP (Phase 4, not Phase 1)
- `.planning/phases/01-schema-and-infrastructure/01-CONTEXT.md` (2026-02-26) — all locked decisions verified against codebase
- `prisma/migrations/20260224120000_add_submissions/migration.sql` — confirmed migration naming convention (YYYYMMDDHHMMSS_name), confirms Submission table structure

### Tertiary (LOW confidence)
- Timezone handling recommendation (end-of-day cutoff) — derived from existing pattern in `app/(student)/submissions/page.tsx` line 159 (`cutoff.setHours(23, 59, 59, 999)`); reasonable but not formally specified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nodemailer version verified against live npm registry; all other libraries already installed
- Architecture: HIGH — all patterns derived from existing codebase (lib/prisma.ts singleton, admin form component structure, DatePicker API)
- Pitfalls: HIGH — reference sites verified by grep (12 closureDate occurrences in 5 files); nodemailer version conflict verified via npm
- Migration strategy: HIGH — migration naming convention verified from existing migrations; Prisma rename behavior confirmed from docs pattern

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (Prisma and Next.js stable; nodemailer 6.x will remain available)
