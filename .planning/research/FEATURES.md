# Feature Landscape

**Domain:** University Magazine CMS - v1.1 Security, Audit & Guest Self-Registration
**Researched:** 2026-03-09
**Overall confidence:** MEDIUM (web research unavailable; based on codebase analysis, Better Auth training knowledge, and domain expertise in CMS/university systems)

---

## Table Stakes

Features that are standard expectations for a CMS with admin-created accounts and role-based access. Missing any of these would be a noticeable gap.

| Feature | Why Expected | Complexity | Dependencies on Existing | Notes |
|---------|--------------|------------|--------------------------|-------|
| Audit log for selection changes | Any system where coordinators approve/reject content needs an accountability trail. University compliance requires knowing who selected/deselected what and when. | Low | `Submission.isSelected`, `selectedById`, coordinator PATCH route at `app/api/coordinator/submissions/[id]/route.ts` | New `AuditLog` Prisma model. Hook into existing PATCH handler where `isSelected` changes. Record old value, new value, actor, timestamp. |
| First-login forced password change | Admin creates accounts with temporary passwords. Every enterprise/university IAM system forces a password reset on first login. Without it, shared/known passwords persist indefinitely. | Medium | Better Auth `emailAndPassword`, `User` model, `Account` model (password hash), admin create-user route | Needs `mustChangePassword` boolean on `User`. Layout-level guard redirects to change-password page. Better Auth exposes `changePassword` API. |
| Last login timestamp + welcome message | Basic security hygiene. Users should see when they last logged in to detect unauthorized access. Standard in every university portal. | Low | Better Auth `databaseHooks.session.create`, `User` model | Add `lastLoginAt` DateTime field to `User`. Update in existing session creation hook. Display in layout header. |
| Coordinator faculty-scoped guest list | Coordinators manage their faculty's content ecosystem. They need visibility into who has guest access to their faculty's published work. Standard in any faculty-scoped CMS. | Low | `User` model with `role=GUEST` + `facultyId`, coordinator faculty scoping pattern (already proven in submissions route) | Read-only list. Query `User` where `role=GUEST` and `facultyId` matches coordinator's faculty. Reuses existing page patterns. |

---

## Differentiators

Features that go beyond basic expectations and add meaningful value to the system.

| Feature | Value Proposition | Complexity | Dependencies on Existing | Notes |
|---------|-------------------|------------|--------------------------|-------|
| Admin analytics dashboard (active users, browser usage, page views) | Gives administrators visibility into system usage patterns. Most university CMS platforms stop at content reports; usage analytics are a genuine value-add for demonstrating system adoption. | High | Session model (has `userAgent`, `ipAddress`), existing report patterns (raw SQL), admin route group | Needs a `PageView` model for tracking page visits. Parse `userAgent` from session records for browser stats. Active users derived from session data. Most complex feature in v1.1. |
| Guest self-registration with coordinator notification | Currently guests are admin-created (assumption #8 in PROJECT.md). Self-registration reduces admin burden and enables external stakeholders to request access. Coordinator notification keeps faculty owners informed. | Medium | Better Auth `signUpEmail`, existing `sendMail` utility, faculty model, coordinator user lookup | Public registration form limited to GUEST role. Must select a faculty. Email sent to faculty coordinator(s). Auto-approve (no approval gate). |

---

## Anti-Features

Features to explicitly NOT build for v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full audit trail for ALL actions | Scope creep. The requirement is specifically selection changes. A comprehensive audit system would touch every API route and balloon the effort. | Audit only `isSelected` changes on submissions. Design the `AuditLog` model with an `action` enum field so it is extensible later without schema changes. |
| Client-side analytics via third-party (Google Analytics, Plausible) | Adds external dependency, privacy concerns for a university system, cookie consent complexity. The requirement says "admin analytics reports" not "integrate analytics platform." | Server-side tracking using existing session data + a lightweight `PageView` table. No external scripts, no cookie banners. |
| Guest approval workflow with coordinator accept/reject | Over-engineering. The requirement says "coordinator notification" not "coordinator approval gate." Adding an approval state machine complicates the guest experience and adds UI for coordinators that is not requested. | Auto-create guest account on registration. Notify coordinator by email. Coordinator can ban the guest via existing admin ban functionality if needed. |
| Password complexity rules / password policy engine | Not in scope and a rabbit hole (min length, special chars, history, expiry). Better Auth handles password hashing securely. | Set a reasonable minimum length via Zod validation in the registration/change-password form. Do not build a configurable policy engine. |
| Real-time analytics dashboard with live counters | WebSocket/SSE is explicitly out of scope per PROJECT.md. A real-time dashboard contradicts that constraint. | Static analytics page that loads data on mount. Admin refreshes the page for updated numbers. |
| Coordinator ability to manage/edit/delete guest accounts | Coordinators should see their guest list, not manage users. User management is the admin's domain (already built in v1.0). Mixing concerns creates role confusion. | Read-only guest list for coordinators. Coordinators who need a guest removed contact admin. |
| Audit log entry deletion or editing | Audit logs must be immutable. Any ability to tamper with the audit trail defeats its purpose. | Append-only model. No DELETE or UPDATE endpoints for audit entries. |

---

## Feature Dependencies

```
Schema migration (all new fields + models)
  |
  +-- lastLoginAt on User ---------> Session hook update
  |                                    \--> Welcome message in layout header
  |                                     \--> "Last login" display on dashboard
  |
  +-- mustChangePassword on User ---> Layout-level redirect guard
  |                                    \--> /change-password page + API
  |                                     \--> Admin create-user sets flag to true
  |
  +-- AuditLog model --------------> Audit entry creation in coordinator PATCH route
  |                                    \--> Admin audit log viewer page (read-only, filtered)
  |
  +-- PageView model (if analytics includes page views)
                                       \--> Client-side tracking hook in root layout
                                        \--> Admin analytics dashboard page
                                         \--> Browser stats (parse userAgent from Session records)

Guest self-registration (public route)
  +-- Public registration form (outside auth-protected layouts)
  +-- Coordinator notification email (uses existing sendMail)
  +-- Coordinator guest list (reads same User records created by registration)
```

---

## Detailed Feature Analysis

### 1. Audit Log for Selection Changes

**What it does:** Records every time a coordinator toggles `isSelected` on a submission (select or deselect). Stores who did it, when, what changed, and on which submission.

**Schema addition:**
```
model AuditLog {
  id            String   @id @default(uuid())
  action        String   // "SELECTION_CHANGE" — use string, not enum, for extensibility
  entityType    String   // "SUBMISSION"
  entityId      String   // submission ID
  actorId       String   // coordinator user ID
  actor         User     @relation(fields: [actorId], references: [id])
  oldValue      String?  // "false" or "true"
  newValue      String   // "true" or "false"
  metadata      Json?    // submission title, faculty name, student name for display without joins
  createdAt     DateTime @default(now())
}
```

**Integration point:** The existing `PATCH` handler at `app/api/coordinator/submissions/[id]/route.ts` already tracks `wasSelected` vs `updated.isSelected` (line 69 and line 121). Insert audit log creation right after the `prisma.submission.update()` call. Two approaches:
- **Same transaction:** Wrap both operations in `prisma.$transaction`. Ensures audit and selection are atomic. Slight overhead.
- **Fire-and-forget:** Create audit log after the update, catch errors silently. Simpler but risks missing entries on failure.

Recommendation: Use `prisma.$transaction` because audit integrity matters.

**Viewer:** Admin-only page at `app/(portal)/admin/audit-log/page.tsx` showing audit entries with filters (date range, coordinator name). Paginated, read-only. Reuse existing pagination patterns from admin users page.

**Complexity:** Low. Single new model, single insertion point in existing code, straightforward viewer page.

---

### 2. First-Login Forced Password Change

**What it does:** When an admin creates a user via `/api/admin/create-user`, the account is flagged with `mustChangePassword=true`. On any subsequent login, the user is redirected to a password change page and cannot access any other page until they change their password.

**Implementation approach:**
- Add `mustChangePassword Boolean @default(false)` to `User` model in Prisma schema.
- In `app/api/admin/create-user/route.ts` (line 106-116), add `mustChangePassword: true` to the `prisma.user.update` data.
- Guard in portal layout (`app/(portal)/layout.tsx` line 10-19) and guest layout: after `getCurrentUser()`, if `user.mustChangePassword === true`, redirect to `/change-password`.
- New page `/change-password`: form with current password + new password + confirm new password. Calls Better Auth's `changePassword` endpoint, then sets `mustChangePassword=false` via a dedicated API route.
- The `/change-password` route must be accessible even when `mustChangePassword=true`. Exclude it from the guard.

**Key consideration:** Better Auth's `auth.api.changePassword` requires the current password and new password. This is the correct API to use -- it validates the current password server-side before updating. After successful change, a separate `prisma.user.update({ where: { id }, data: { mustChangePassword: false } })` clears the flag.

**Edge case:** Self-registered guests choose their own password, so `mustChangePassword` should remain `false` for them. Only admin-created users get the flag.

**Complexity:** Medium. Touches auth flow, needs new page, layout guard changes, schema change, new API endpoint for clearing the flag.

---

### 3. Last Login Timestamp + Welcome Message

**What it does:** Records when a user last successfully logged in. Shows "Welcome back, [name]. Last login: [date/time]" on the dashboard or header.

**Implementation approach:**
- Add `lastLoginAt DateTime?` to `User` model.
- Update in `databaseHooks.session.create.before` in `lib/auth.ts` (line 13-26). The hook already runs on every session creation and has access to `session.userId`. Add `prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } })`.
- Important ordering: The ban check (line 17-23) should run first. Only update `lastLoginAt` if the user is NOT banned (i.e., the session creation will proceed). This means the update goes after the ban check, before the return.
- Display: Add a "Last login: [formatted date]" line in the dashboard page or management header component. Use `date-fns` (already in the stack) for formatting.

**Complexity:** Low. One field, one line in an existing hook, one UI text element.

---

### 4. Admin Analytics Dashboard

**What it does:** Shows administrators aggregate usage statistics: active user counts, browser usage breakdown, and page view metrics.

**Sub-features:**

**a) Active Users (Low complexity -- no new model needed):**
- Query `Session` model for sessions created within the last 7/30 days.
- Count distinct `userId` values.
- The `Session` model already stores `createdAt` and `userId`.
- Present as summary cards: "Active users (7d): N" and "Active users (30d): N".

**b) Browser Usage (Low complexity -- no new model needed):**
- Parse `userAgent` strings from `Session` records.
- The `Session` model already stores `userAgent` (line 70 of schema).
- Use a lightweight UA parser (recommend `ua-parser-js` -- ~17KB, widely used, no external calls) or simple regex to extract browser family (Chrome, Firefox, Safari, Edge, Other).
- Aggregate counts server-side in the API route.
- Present as a table or simple bar chart.

**c) Page Views (Medium complexity -- needs new model):**
- New `PageView` model: `id`, `path`, `userId` (nullable for anonymous?), `sessionId`, `createdAt`.
- Client-side: A small React hook component placed in the root layout fires `POST /api/analytics/pageview` on each route change (using Next.js `usePathname`).
- Server-side: API route records the page view. Auth session optional (guests and logged-in users both tracked).
- Present as: total views this week/month, top 10 pages by view count.

**Dashboard UI:** Admin-only page at `app/(portal)/admin/analytics/page.tsx`. Summary cards at top (active users 7d/30d, total page views this week). Below: browser breakdown table, top pages table. Use existing UI patterns (cards, tables from shadcn/ui).

**Simplification option:** If page view tracking is too heavy for v1.1, defer it entirely and build analytics using only Session data (active users + browser breakdown). This cuts complexity roughly in half and still delivers useful metrics.

**Complexity:** High overall. Medium if page views are deferred.

---

### 5. Guest Self-Registration

**What it does:** External users can register themselves as GUEST role for a specific faculty, without admin intervention. A notification email is sent to the faculty's coordinator(s).

**Implementation approach:**
- New public page at `/guest/register` (under the existing `(guest)` route group or a new public group).
- Registration form: name, email, password, faculty selection (dropdown of all faculties loaded from `/api/faculties` or similar).
- On submit: API route at `/api/guest/register` that:
  1. Validates input with Zod (name, email, password min length, valid facultyId).
  2. Checks for duplicate email (existing pattern from `create-user` route).
  3. Creates user via `auth.api.signUpEmail({ body: { name, email, password } })`.
  4. Updates user: `role=GUEST`, `facultyId`, `emailVerified=true`, `mustChangePassword=false`.
  5. Looks up coordinator(s): `prisma.user.findMany({ where: { role: 'MARKETING_COORDINATOR', facultyId } })`.
  6. Sends notification email to each coordinator using existing `sendMail` from `lib/mailer`.
  7. Returns success. User can now log in.

**Key considerations:**
- **No approval gate:** Per requirements, coordinators are notified, not given approval power. Guest account is immediately active.
- **Rate limiting:** This is a public endpoint. For v1.1, basic protection is sufficient: honeypot hidden field, server-side validation. Production-grade rate limiting (e.g., Upstash) is a future concern.
- **Duplicate emails:** Reuse exact pattern from `app/api/admin/create-user/route.ts` (lines 73-87).
- **Faculty validation:** Verify `facultyId` exists before creating the user.
- **Email content:** "A new guest [name] ([email]) has registered for access to [Faculty Name] submissions."

**Complexity:** Medium. New public page, new API route, email notification, but all individual patterns already exist in the codebase and can be closely followed.

---

### 6. Coordinator Faculty-Scoped Guest List

**What it does:** Coordinators see a list of all GUEST users assigned to their faculty. Read-only. Shows name, email, registration date.

**Implementation approach:**
- New API route: `GET /api/coordinator/guests` -- validates coordinator session and faculty, then queries `User` where `role='GUEST'` and `facultyId` matches the coordinator's faculty. Returns `id`, `name`, `email`, `createdAt`.
- New page: `app/(portal)/coordinator/guests/page.tsx` -- table with guest name, email, `createdAt` formatted with `date-fns`. Reuse table patterns from coordinator submissions page.
- No actions (no edit, no delete, no ban). Read-only.
- Pagination: Likely unnecessary for v1.1 (guest count per faculty will be small), but use the pagination pattern if >20 guests.

**Complexity:** Low. Single query, single page, follows existing coordinator route patterns exactly.

---

## MVP Recommendation

**Priority order for v1.1 implementation:**

1. **Schema migration first** -- all features depend on new fields/models:
   - Add `lastLoginAt DateTime?` to User
   - Add `mustChangePassword Boolean @default(false)` to User
   - Create `AuditLog` model
   - Create `PageView` model (only if analytics includes page views)
   - Add User relation for AuditLog
   - Run single migration

2. **Last login tracking** -- simplest feature, immediate value, proves schema migration works
3. **First-login password change** -- security feature, builds on schema + auth flow
4. **Audit log for selection changes** -- small insertion in existing route + admin viewer
5. **Coordinator guest list** -- small read-only feature, quick win before registration
6. **Guest self-registration** -- public endpoint, depends on coordinator list being visible for full value
7. **Admin analytics dashboard** -- most complex, purely additive, can be last

**Defer if time-constrained:**
- **Page view tracking** within analytics (use session-based active users + browser stats only). This cuts analytics complexity roughly in half while still delivering the most useful metrics.
- **Browser usage breakdown** can be a follow-up if UA parsing proves fiddly. Active user counts alone provide meaningful value.

---

## Complexity Summary

| Feature | Category | Complexity | New Models/Fields | API Routes | Pages |
|---------|----------|------------|-------------------|------------|-------|
| Last login tracking | Table stakes | Low | 1 field on User | 0 (hook only) | 0 (header text) |
| First-login password change | Table stakes | Medium | 1 field on User | 1 new + 1 modified | 1 new page |
| Audit log (selection changes) | Table stakes | Low | 1 new model | 1 new GET, 1 modified PATCH | 1 new page |
| Coordinator guest list | Table stakes | Low | 0 | 1 new GET | 1 new page |
| Guest self-registration | Differentiator | Medium | 0 | 1 new POST | 1 new page |
| Admin analytics dashboard | Differentiator | High | 1 new model (PageView) | 1-3 new GET | 1 new page |

**Total new Prisma models:** 2 (AuditLog, PageView)
**Total new User fields:** 2 (lastLoginAt, mustChangePassword)
**Total new pages:** 4-5
**Total new API routes:** 4-6

---

## Sources

- **Codebase analysis (HIGH confidence):** `prisma/schema.prisma`, `lib/auth.ts`, `app/api/coordinator/submissions/[id]/route.ts`, `app/api/admin/create-user/route.ts`, `app/(portal)/layout.tsx`, `app/api/guest/submissions/route.ts`
- **Better Auth API knowledge (MEDIUM confidence):** `auth.api.changePassword`, `databaseHooks.session.create`, admin plugin capabilities -- based on training data, should be verified against current Better Auth docs during implementation
- **Domain expertise (MEDIUM confidence):** University CMS patterns, audit logging best practices, forced password change flows -- standard patterns in enterprise/education IAM systems
- **Confidence note:** Better Auth-specific API signatures (exact `changePassword` method parameters, session hook return types) should be verified via Context7 or official docs during phase-specific research
