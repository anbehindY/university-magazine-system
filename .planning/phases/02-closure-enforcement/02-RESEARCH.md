# Phase 2: Closure Enforcement - Research

**Researched:** 2026-02-26
**Domain:** Next.js App Router API route hardening, date-gate middleware pattern
**Confidence:** HIGH

---

## Summary

Phase 2 applies closure enforcement to every student-writable API route in the project. The guard utilities (`isPastFirstClosure`, `isPastFinalClosure`) already exist in `lib/closure-guard.ts` and are correct — Phase 2 is purely about wiring them into the right places with the right HTTP semantics.

The submission API (`app/api/submissions/route.ts`) has four handlers (GET, POST, PUT, DELETE). POST creates submissions and must be blocked after `firstClosureDate`. PUT updates submissions and must be blocked after `finalClosureDate`. The T&C enforcement for CLOS-04 also lives inside PUT — when the incoming `status` is `SUBMITTED`, the handler must verify `agreed === true` before allowing the transition. The file handlers (`app/api/submissions/files/route.ts` and `app/api/submissions/upload/route.ts`) also mutate submission data and must be blocked after `finalClosureDate`.

CLOS-03 (block comments after final closure) targets a route that does not yet exist — Phase 3 builds the comments API. The correct answer is to document the guard pattern clearly so Phase 3 applies it correctly, rather than adding a stub route now. Adding a stub would create untestable dead code in this phase and could interfere with Phase 3's route design.

**Primary recommendation:** Add `isPastFirstClosure()` / `isPastFinalClosure()` calls at the top of each relevant handler, return 403 before any DB write, and add a `agreed` validation guard in the PUT handler's SUBMITTED-transition branch. Document the comment guard pattern for Phase 3 consumption.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLOS-01 | Student cannot create new submissions after `firstClosureDate` for the active academic year | Block `POST /api/submissions` — call `isPastFirstClosure()` before `prisma.submission.create`, return 403 with clear message |
| CLOS-02 | Student cannot update any existing submission after `finalClosureDate` | Block `PUT /api/submissions` and file mutation routes — call `isPastFinalClosure()` before any update, return 403 |
| CLOS-03 | No new comments can be added to any submission after `finalClosureDate` | Comments API does not exist yet (Phase 3). Document the guard pattern; Phase 3 applies `isPastFinalClosure()` at the top of its POST handler |
| CLOS-04 | Student must have `agreed = true` before a submission transitions to SUBMITTED status (enforced at API level) | In `PUT /api/submissions`: when `body.status === "SUBMITTED"`, check `body.agreed === true` (or existing record's `agreed`). Return 400 if false |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lib/closure-guard.ts` | project-local | `isPastFirstClosure()`, `isPastFinalClosure()`, `getActiveAcademicYear()` | Already created in Phase 1; verified correct with fixture tests |
| Next.js App Router | 16.1.6 | API route handlers (GET/POST/PUT/DELETE functions in `route.ts`) | Project framework — no change |
| `NextResponse.json()` | built-in | Returning HTTP responses from route handlers | Established project pattern |
| `auth.api.getSession()` | better-auth 1.4.18 | Session retrieval in route handlers | Established project pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/auth-helpers.ts` | project-local | `getCurrentUser()`, `requireRole()` helpers | Available but Phase 2 route handlers use `auth.api.getSession()` directly — consistent with existing submission routes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline guard calls in each handler | Next.js middleware (`middleware.ts`) | Middleware runs at the edge and cannot call Prisma directly (no Node runtime). Guard calls must live inside the handler body |
| Inline guard calls in each handler | A shared `withClosureGuard()` wrapper HOC | Cleaner but adds abstraction complexity for only 4-5 call sites. Inline is preferred for this phase size |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files or directories needed. All changes are additions to existing route files:

```
app/api/submissions/
├── route.ts              # POST blocked by CLOS-01; PUT blocked by CLOS-02 + CLOS-04
├── files/route.ts        # POST + DELETE blocked by CLOS-02 (file adds/removes are submission updates)
└── upload/route.ts       # POST blocked by CLOS-02 (blob upload is a submission mutation)
lib/
└── closure-guard.ts      # Already exists — import from here, do not modify
```

### Pattern 1: First-Closure Gate (CLOS-01)

**What:** Block new submission creation after `firstClosureDate`
**When to use:** `POST /api/submissions` handler, before `prisma.submission.create`
**Example:**

```typescript
// In app/api/submissions/route.ts — POST handler
import { isPastFirstClosure } from "@/lib/closure-guard";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (await isPastFirstClosure()) {
    return NextResponse.json(
      { error: "New submissions are no longer accepted. The first closure date has passed." },
      { status: 403 }
    );
  }

  // ... existing prisma.submission.create logic
}
```

### Pattern 2: Final-Closure Gate (CLOS-02)

**What:** Block any submission mutation after `finalClosureDate`
**When to use:** `PUT /api/submissions`, `POST /api/submissions/files`, `DELETE /api/submissions/files`, `POST /api/submissions/upload`
**Example:**

```typescript
// In PUT /api/submissions handler
import { isPastFinalClosure } from "@/lib/closure-guard";

if (await isPastFinalClosure()) {
  return NextResponse.json(
    { error: "Submissions are locked. The final closure date has passed." },
    { status: 403 }
  );
}
// ... existing update logic
```

### Pattern 3: T&C Agreed Guard (CLOS-04)

**What:** Reject SUBMITTED transition when `agreed` is not true
**When to use:** `PUT /api/submissions` handler, inside the SUBMITTED-transition branch, after the final-closure check
**Example:**

```typescript
// In PUT /api/submissions handler — after final closure check, before prisma.submission.update
const nextStatus = body.status ?? "DRAFT";

if (nextStatus === "SUBMITTED") {
  // agreed must be true at transition time — check the incoming value OR the persisted value
  const agreedValue = typeof body.agreed === "boolean" ? body.agreed : existing.agreed;
  if (!agreedValue) {
    return NextResponse.json(
      { error: "You must accept the Terms and Conditions before submitting." },
      { status: 400 }
    );
  }
}
```

**Key detail:** The existing PUT handler fetches `existing` from the DB (selecting `id` and `submittedAt`). The selector must also include `agreed` so the guard can check the persisted value when `body.agreed` is not supplied. Add `agreed: true` to the `select` object on the `findFirst` call.

### Pattern 4: Comment Guard (CLOS-03 — for Phase 3 reference)

**What:** Block new comment creation after `finalClosureDate`
**When to use:** `POST /api/comments` (or equivalent) — to be built in Phase 3
**Pattern to apply in Phase 3:**

```typescript
// In Phase 3's comments POST handler
import { isPastFinalClosure } from "@/lib/closure-guard";

if (await isPastFinalClosure()) {
  return NextResponse.json(
    { error: "Comments are locked. The final closure date has passed." },
    { status: 403 }
  );
}
```

Phase 2 does NOT add a stub route. This pattern is documented here so Phase 3 applies it correctly.

### Anti-Patterns to Avoid

- **Caching the closure result:** `isPastFirstClosure()` queries DB on every call. Do not memoize or cache in a module-level variable — the date can change when admin updates the academic year. The DB query is cheap (indexed primary key lookup).
- **Client-side-only enforcement:** The existing student page already shows a closed state based on `finalClosureDate` from the academic-years API. This is UX only. The API-level guard is the authoritative enforcement and is what this phase adds.
- **Throwing instead of returning 403:** `isPastFirstClosure()` and `isPastFinalClosure()` never throw — they return `false` when date or active year is absent. Guard code must branch on the return value, not catch an exception.
- **Blocking DELETE after first closure:** A DRAFT submission created before first closure can still be deleted after first closure (student can't create new ones, but can clean up existing DRAFTs). Only PUT (and file mutations) are blocked by final closure. The existing DELETE handler already blocks deletes of SUBMITTED submissions.
- **Blocking uploads at only one call site:** Files reach the system through two paths: `POST /api/submissions/upload` (Vercel Blob client upload) and `POST /api/submissions/files` (direct URL save). Both must be guarded.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date comparison with closure dates | Custom date util | `isPastFirstClosure()` / `isPastFinalClosure()` from `lib/closure-guard.ts` | Already built, tested, handles null dates and no-active-year edge cases |
| Active year lookup | Inline `prisma.academicYear.findFirst()` in each handler | `getActiveAcademicYear()` from `lib/closure-guard.ts` | Guards call it internally; no need to duplicate |
| Role checking | Inline `session.user.role` comparisons | `lib/auth-helpers.ts` `requireRole()` | Available helper — but consistent with existing submission route style which uses direct session access |

**Key insight:** The guard utilities are the entire value proposition of Phase 1 Plan 03. Phase 2 is a wiring exercise, not an implementation exercise.

---

## Common Pitfalls

### Pitfall 1: Forgetting the upload route is a second file-mutation path

**What goes wrong:** Developer blocks `POST /api/submissions/files` but forgets `POST /api/submissions/upload`. Files uploaded via Vercel Blob's client SDK hit `/api/submissions/upload/route.ts` first, which generates a signed token in `onBeforeGenerateToken`. The `onUploadCompleted` callback then creates the `SubmissionFile` record. Enforcement must happen in `onBeforeGenerateToken` (where the session is available), not in `onUploadCompleted` (which may not have session context).

**How to avoid:** Add the `isPastFinalClosure()` check inside `onBeforeGenerateToken` in `upload/route.ts`, and throw an error to abort the token generation. The client receives a 400 response.

**Warning signs:** Test scenario: final closure has passed, student attempts file upload — if a `SubmissionFile` record appears in the DB, the upload route was not guarded.

### Pitfall 2: T&C check uses wrong agreed value

**What goes wrong:** The PUT handler currently selects only `{ id: true, submittedAt: true }` from the existing record. If `body.agreed` is undefined (client sends a status-only update), the guard would read `undefined` and incorrectly block the transition. Alternatively, if only `body.agreed` is checked without consulting the persisted `agreed`, a client that sends `agreed: false` could revert a previously-agreed record.

**How to avoid:** Add `agreed: true` to the `findFirst` select. In the guard: use `body.agreed ?? existing.agreed` to get the effective agreed value.

### Pitfall 3: Using 401 instead of 403 for closure blocks

**What goes wrong:** 401 means "not authenticated." Closure blocks apply to authenticated users — the correct status is 403 ("authenticated but not permitted at this time"). Using 401 would confuse the client into thinking the session expired.

**How to avoid:** Always use `{ status: 403 }` for closure-date refusals. Use `{ status: 401 }` only for the authentication check at the top of each handler.

### Pitfall 4: POST /api/submissions creates without the academicYearId

**What goes wrong:** The current POST handler creates a submission without setting `academicYearId` or `facultyId`. These fields are needed for Phase 3+ (coordinator scoping, reporting). While not a Phase 2 requirement, the POST handler is already being modified for CLOS-01. Leaving `academicYearId` unpopulated means every submission created from this point forward will be unscoped.

**How to avoid:** When adding the `isPastFirstClosure()` check, the active year object is already fetched inside the guard. However, `isPastFirstClosure()` does not return the year object — call `getActiveAcademicYear()` directly in the POST handler to get both the guard result and the `id` for `academicYearId`. Also set `facultyId` from `session.user.facultyId`.

**Note:** `session.user.facultyId` must be verified to exist on the session type. The User model has `facultyId String?` and the better-auth session returns user fields — check that `facultyId` is available or fetch it with a separate `prisma.user.findUnique` if needed.

### Pitfall 5: Guard order matters — auth check must come first

**What goes wrong:** If the closure guard runs before the auth check, an unauthenticated request gets a 403 ("closure") instead of a 401 ("not authenticated"), leaking information about the system state.

**How to avoid:** Always: (1) auth check → 401 if not authenticated, (2) closure check → 403 if past date, (3) validation → 400 if malformed, (4) DB operation.

---

## Code Examples

Verified patterns from the existing codebase:

### Current POST handler structure (before Phase 2 changes)

```typescript
// Source: app/api/submissions/route.ts (existing)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as SubmissionPayload;
  const submission = await prisma.submission.create({
    data: {
      userId: session.user.id,
      agreed: Boolean(body.agreed),
      notes: body.notes ?? null,
      status: body.status ?? "DRAFT",
      submittedAt: body.status === "SUBMITTED" ? new Date() : null,
    },
  });
  return NextResponse.json({ submission }, { status: 201 });
}
```

After Phase 2, POST gains: (1) `isPastFirstClosure()` → 403 guard, (2) `getActiveAcademicYear()` call to populate `academicYearId` and `facultyId`.

### Current PUT handler's findFirst select (must be extended)

```typescript
// Source: app/api/submissions/route.ts (existing)
const existing = await prisma.submission.findFirst({
  where: { id: body.id, userId: session.user.id },
  select: {
    id: true,
    submittedAt: true,
    // Phase 2 must add:
    // agreed: true,
  },
});
```

### Closure guard functions (source of truth)

```typescript
// Source: lib/closure-guard.ts (existing, verified)
export async function isPastFirstClosure(): Promise<boolean>
export async function isPastFinalClosure(): Promise<boolean>
export async function getActiveAcademicYear(): Promise<ActiveAcademicYear | null>
// ActiveAcademicYear = { id, yearLabel, firstClosureDate, finalClosureDate }
```

### Upload route enforcement point

```typescript
// Source: app/api/submissions/upload/route.ts — onBeforeGenerateToken (existing)
onBeforeGenerateToken: async (pathname, clientPayload) => {
  // ... existing auth and path validation
  // Phase 2 adds BEFORE the submission lookup:
  if (await isPastFinalClosure()) {
    throw new Error("Submissions are locked. The final closure date has passed.");
  }
  // ... existing submission lookup
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No closure enforcement at API level | Closure guards imported inline in each handler | Phase 2 (this phase) | Students cannot bypass UI to create/update after closure |
| `closureDate` single field | `firstClosureDate` + `finalClosureDate` two-stage dates | Phase 1 (complete) | Two separate enforcement windows |
| Date heuristics for active year | `isActive: true` flag | Phase 1 (complete) | Guard functions are deterministic |

**Deprecated/outdated:**
- The `isClosed` state on the student submissions page (`app/(student)/submissions/page.tsx`) checks `finalClosureDate` only for UI feedback. This is client-side only and does not replace the API guard. Both must exist.

---

## Open Questions

1. **Is `session.user.facultyId` available in the session type for better-auth?**
   - What we know: `User` model has `facultyId String?`. Better-auth's admin plugin returns user fields in the session.
   - What's unclear: Whether custom user fields like `facultyId` and `role` are included in the better-auth session type automatically, or require explicit configuration.
   - Recommendation: Check `lib/auth-client.ts` and test by logging `session.user` in a dev route. If not present, add a separate `prisma.user.findUnique` call in the POST handler to fetch `facultyId`. The admin plugin does include `role` (it's used in existing admin routes), so `facultyId` likely follows the same pattern — LOW confidence without verification.

2. **CLOS-03 scope: does Phase 2 need any deliverable for comments?**
   - What we know: Comments API does not exist. CLOS-03 is listed as a Phase 2 requirement.
   - What's unclear: Whether the success criterion is "route exists and is guarded" or "pattern is documented for Phase 3."
   - Recommendation: The ROADMAP Phase 2 success criterion 3 reads: "Any user attempting to POST a new comment when `finalClosureDate` has passed receives a 403 response." This implies a testable route must exist. However, building a full comments route in Phase 2 would duplicate Phase 3 work. Recommendation: Phase 2 adds a minimal `POST /api/comments` stub that only enforces the closure check and returns a 403 or 501 for all other cases, allowing the success criterion to be verified without pre-building Phase 3's full implementation. Confirm with planner.

---

## Validation Architecture

> `workflow.nyquist_validation` not set in `.planning/config.json` — skipping this section.

*(config.json has `"workflow": { "research": true, "plan_check": true, "verifier": true }` — no `nyquist_validation` key. Section omitted.)*

---

## Sources

### Primary (HIGH confidence)

- `app/api/submissions/route.ts` — Full handler inspection; confirmed GET/POST/PUT/DELETE structure, existing auth pattern, missing academicYearId population
- `app/api/submissions/files/route.ts` — Confirmed POST/DELETE handlers; both mutate submission data
- `app/api/submissions/upload/route.ts` — Confirmed Vercel Blob `handleUpload` with `onBeforeGenerateToken` enforcement point
- `lib/closure-guard.ts` — Confirmed all three exported functions, return types, end-of-day cutoff, null-guard behaviour
- `prisma/schema.prisma` — Confirmed `Submission.agreed Boolean @default(false)`, `AcademicYear.firstClosureDate DateTime?`, `AcademicYear.finalClosureDate DateTime?`, `AcademicYear.isActive Boolean`
- `.planning/ROADMAP.md` — Phase 2 success criteria extracted verbatim
- `.planning/REQUIREMENTS.md` — CLOS-01 through CLOS-04 descriptions confirmed
- `lib/auth-helpers.ts` — Confirmed `requireRole()` helper exists

### Secondary (MEDIUM confidence)

- `.planning/phases/01-schema-and-infrastructure/01-03-SUMMARY.md` — Closure guard design decisions (end-of-day cutoff, no-throw pattern, no caching)
- `.planning/STATE.md` — Accumulated decisions log confirming closure guard decisions

### Tertiary (LOW confidence)

- `session.user.facultyId` availability — Inferred from schema and better-auth admin plugin behaviour; not directly verified via docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries confirmed in place; no new dependencies
- Architecture: HIGH — Exact handler structure read from source; guard functions verified
- Pitfalls: HIGH — Derived from direct code inspection (two upload paths, select field gap, agreed logic)
- CLOS-03 stub question: MEDIUM — Interpretation of success criteria; recommend planner resolve

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (stable domain — Next.js routing and project-local utilities)
