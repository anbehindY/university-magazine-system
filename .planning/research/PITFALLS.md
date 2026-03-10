# Domain Pitfalls

**Domain:** Adding audit logging, first-login password change, login tracking, admin analytics, guest self-registration, and coordinator guest list to an existing Next.js/Better Auth/Prisma university magazine system
**Researched:** 2026-03-09

---

## Critical Pitfalls

Mistakes that cause security holes, rewrites, or major issues.

### Pitfall 1: First-Login Password Change Bypass via Direct URL Navigation

**What goes wrong:** A `mustChangePassword` flag is added and the sign-in page redirects to `/change-password`, but users navigate directly to `/` or any dashboard route and skip the password change entirely. The sign-in page (`app/(auth)/sign-in/page.tsx`) does a client-side `router.push("/")` after login -- intercepting only here is insufficient because the portal layout does not enforce the gate.

**Why it happens:** The system has no middleware. Authentication gates live in the portal layout (`app/(portal)/layout.tsx`, which calls `getCurrentUser()`) and the guest layout. A naive implementation adds a redirect only in the sign-in flow but forgets that both layouts and all API routes must also enforce the gate.

**Consequences:** Users with admin-assigned temporary passwords continue using the system without setting their own password. The entire security feature is cosmetic.

**Prevention:**
- Enforce the password-change gate in `app/(portal)/layout.tsx` AND the guest layout server component -- both already call `getCurrentUser()`. Add: if `user.mustChangePassword === true`, redirect to `/change-password`.
- The `/change-password` page must live in the `(auth)` route group (alongside `sign-in`), which is outside both `(portal)` and `(guest)` groups.
- API routes must also reject requests when `mustChangePassword` is true. Add this check to `requireRole()` in `lib/auth-helpers.ts` so every role-gated route inherits the enforcement.
- The `/change-password` API endpoint itself must be the only endpoint exempt from this check.

**Detection:** Log in with a new admin-created account, then type `http://localhost:5000/` in the address bar. If the dashboard loads, the gate is broken.

### Pitfall 2: Audit Log Write Bottleneck on Neon Serverless

**What goes wrong:** Every selection toggle (approve/deselect) creates an audit log row. The audit insert is wrapped in a `$transaction` with the submission update. On Neon serverless PostgreSQL, each query traverses the network, so adding a second write to the hot path doubles latency on the coordinator PATCH endpoint (`app/api/coordinator/submissions/[id]/route.ts`).

**Why it happens:** The current selection toggle is a single `prisma.submission.update()` (line 107). Wrapping it in a transaction with an audit insert means two sequential round-trips to Neon. During bulk selection (coordinator reviewing many submissions), the optimistic UI rollback flash becomes visible if the server response exceeds ~200ms.

**Consequences:** Coordinator selection workflow feels sluggish. The optimistic UI pattern (noted in project KEY DECISIONS) masks brief delays but exposes slow transactions as visible flicker.

**Prevention:**
- Do NOT wrap the audit insert in a transaction with the update. The audit log is append-only -- if the update succeeds but audit fails, you have a missed log entry, not data corruption. This is acceptable.
- Insert the audit log *after* the successful update, fire-and-forget with `.catch(console.error)` -- the same pattern already used for email notifications (lines 125-131 of the coordinator PATCH route).
- Keep the audit table lean: `id`, `submissionId`, `action` (SELECTED/DESELECTED), `performedById`, `performedAt`, `previousValue`, `newValue`. Do NOT store full submission snapshots.
- Add database indexes on `submissionId` and `performedAt`.

**Detection:** Measure coordinator selection response times before and after adding audit logging. If p95 increases by more than 50ms, the implementation is too tightly coupled.

### Pitfall 3: Guest Self-Registration Creates Unscoped or Wrong-Faculty Accounts

**What goes wrong:** The admin create-user flow (`app/api/admin/create-user/route.ts`, lines 60-69) requires `facultyId` for GUEST role. Guest self-registration must also enforce faculty assignment, but now the *guest* chooses their faculty. If the form lets guests skip faculty selection or the API does not validate the `facultyId` exists, guests end up with null `facultyId` or access to the wrong faculty's selected submissions.

**Why it happens:** The existing system assumes admin creates guests and assigns them to the correct faculty. Self-registration inverts the trust model. A developer copies the signup flow but forgets that faculty scoping is the primary access control for guests.

**Consequences:** Guests see selected submissions from faculties they should not access, or guests with null `facultyId` see nothing and report bugs. Both violate the faculty-scoping invariant the v1.0 system relies on.

**Prevention:**
- Faculty selection must be a required field on the registration form, populated from the Faculty table.
- The registration API must validate the selected `facultyId` exists via `prisma.faculty.findUnique()` before creating the account.
- The guest role must be hardcoded server-side -- NEVER read `role` from the client request body (see Pitfall 10 for details).
- The coordinator notification email must include which faculty the guest registered for, so coordinators can verify legitimacy.

**Detection:** Register a guest without selecting a faculty. If the account is created, validation is missing. Inspect the database for any guest with null `facultyId`.

### Pitfall 4: Login Tracking Update in the Wrong Session Hook

**What goes wrong:** `lastLoginAt` is updated in `databaseHooks.session.create.before` (the same hook that checks banned status at line 13-26 of `lib/auth.ts`). The `before` hook runs before the session is persisted. If the session creation subsequently fails, the login was never actually completed but `lastLoginAt` was already updated.

**Why it happens:** The existing code only uses `databaseHooks.session.create.before`. Developers add login tracking to the same hook out of convenience, not realizing the timing difference matters.

**Consequences:** `lastLoginAt` becomes unreliable. Worst case: a banned user triggers the hook, `lastLoginAt` is updated, then the hook returns `false` (line 23) blocking the session. The user's last login appears recent even though they were blocked.

**Prevention:**
- Use `databaseHooks.session.create.after` for login tracking. The `after` hook fires only when the session was successfully created.
- Keep the banned check in `before` (as-is) and login tracking in `after` -- separation of concerns.
- The `after` hook receives the created session, so you can extract `userId` and fire-and-forget a `prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } })`.

**Detection:** Attempt to log in as a banned user. Check the database -- if `lastLoginAt` was updated despite the login being blocked, the tracking is in the wrong hook.

---

## Moderate Pitfalls

### Pitfall 5: Audit Log Admin View N+1 on User Names and Submission Titles

**What goes wrong:** The audit log admin view needs to show "Coordinator X selected/deselected submission Y." A naive implementation queries the audit log, then for each entry separately fetches the user name and submission title.

**Prevention:**
- Use Prisma `include` or `select` with relations when querying: `include: { performedBy: { select: { name: true } }, submission: { select: { title: true } } }`.
- Add pagination from day one. Audit logs grow linearly with coordinator activity. Build the API with `skip`/`take` or cursor-based pagination even if the dataset is small now.

### Pitfall 6: Guest Self-Registration Endpoint Accepts Arbitrary Roles

**What goes wrong:** The self-registration API endpoint accepts a request body with user details. An attacker modifies the request to include `role: "ADMINISTRATOR"` and gains admin access. The admin create-user route reads role from the body (line 48), so a developer copying that pattern into the registration endpoint inherits the vulnerability.

**Prevention:**
- The registration endpoint must NEVER read `role` from the request body. Hardcode `role: "GUEST"` server-side.
- Use Better Auth's `signUpEmail` for account creation (same as admin create-user on line 90), then immediately update with `role: "GUEST"` and the validated `facultyId`.
- Add rate limiting: max 5 registrations per IP per hour.
- Consider email domain validation if only university-associated emails should register.

### Pitfall 7: First-Login Flag Not Set When Admin Creates Users

**What goes wrong:** `mustChangePassword` is added to the User model with `@default(true)`. Existing users created before the migration are forced to change their passwords (wrong). Or it defaults to `false`, and admin-created users after the migration are not required to change theirs (also wrong).

**Prevention:**
- Migration: add `mustChangePassword` with `@default(false)` so existing users are unaffected.
- In the admin create-user endpoint (`app/api/admin/create-user/route.ts`, line 106-116), explicitly set `mustChangePassword: true` in the `prisma.user.update()` data.
- For guest self-registration, set `mustChangePassword: false` because the guest chose their own password.
- Document the asymmetry: admin-created users must change password on first login; self-registered users do not.

### Pitfall 8: Coordinator Notification Email for Guest Registration Hits Gmail SMTP Limits

**What goes wrong:** Guest self-registration triggers a notification to the coordinator of the relevant faculty. If multiple guests register in quick succession (start of term), Gmail SMTP rate limits kick in (500 emails/day for regular Gmail). Emails silently fail because `sendMail` uses fire-and-forget `.catch(console.error)`.

**Prevention:**
- This is a known testing limitation (PROJECT.md: "Gmail SMTP for testing; config swap"). For testing, this is acceptable.
- Log failed email sends clearly so testers know they failed.
- Consider a simple in-app notification (badge/count on the coordinator's guest list page) as the primary notification, with email as secondary best-effort.
- If testing requires many registrations, add a toggle to disable notification emails.

### Pitfall 9: Analytics Event Table Grows Unbounded Without Retention Policy

**What goes wrong:** Page view tracking inserts a row for every page load by every user. Unlike audit logs (which grow proportionally to coordinator actions, maybe dozens per day), page view events grow proportionally to ALL user sessions, potentially thousands per day during active submission periods. Without a retention policy or aggregation strategy, the table becomes the largest in the database and queries slow down.

**Prevention:**
- Never query raw page view events for analytics reports. Pre-aggregate into daily summary rows: `{ date, page, viewCount, uniqueUserCount }`.
- Add a retention policy: raw events older than 30 days are either deleted or rolled up into aggregations.
- Index `createdAt` and `userId` on the events table.
- For active users metric, count distinct `userId` in the session table (which already exists) rather than creating a separate tracking table.

### Pitfall 10: Admin Analytics Browser Usage Parsing Fails on Bots and Unusual Agents

**What goes wrong:** Browser usage analytics parses `userAgent` strings. Bot traffic, curl requests, and server-side rendering produce unexpected or null user agents. The analytics dashboard shows "Unknown" as the top browser, making the report useless.

**Prevention:**
- Filter out bot traffic (check for common bot identifiers like "bot", "crawler", "spider") before recording events.
- Use a lightweight UA parser library (e.g., `ua-parser-js`) rather than regex -- browser UA strings are notoriously inconsistent.
- Parse `userAgent` at write time and store browser name as a separate column, not at query time.
- Group unknown/rare browsers under "Other" in reports.

### Pitfall 11: Welcome Message Shows Stale or Broken "Last Login" on First Visit

**What goes wrong:** The dashboard shows "Welcome back! Last login: [date]." On a user's first login, `lastLoginAt` is null, and the UI shows "Last login: Invalid Date" or throws a runtime error formatting null.

**Prevention:**
- Handle null explicitly: show "Welcome! This is your first login." when `lastLoginAt` is null.
- Decide whether to show *previous* last login or *current* login. The former is more useful ("You last logged in 3 days ago"). Store previous value before updating: read current `lastLoginAt`, display it, then update to `now()` in the session hook.

### Pitfall 12: Coordinator Guest List Missing Faculty Scope

**What goes wrong:** The coordinator guest list shows ALL guests in the system instead of only guests assigned to the coordinator's faculty. This is the same class of bug that the v1.0 codebase already guards against for submissions, but a developer building the guest list from scratch might not apply the same pattern.

**Prevention:**
- Follow the exact pattern in `app/api/coordinator/submissions/[id]/route.ts` (lines 28-38): fetch coordinator's `facultyId`, filter guests by matching `facultyId`.
- Query: `prisma.user.findMany({ where: { role: "GUEST", facultyId: coordinator.facultyId } })`.
- Test: log in as Coordinator A (Faculty X), verify guests from Faculty Y are not visible.

---

## Minor Pitfalls

### Pitfall 13: Audit Log Enum Drift from Submission Selection Logic

**What goes wrong:** The audit log records `action: SELECTED | DESELECTED`, but the submission toggle is a boolean `isSelected`. If someone adds the audit entry based on the request body value rather than the actual state change, you get audit entries that do not reflect reality (e.g., selecting an already-selected submission logs SELECTED again).

**Prevention:**
- Derive the audit action from the actual state change. Compare `wasSelected` (line 69 in coordinator PATCH) with `updated.isSelected` (line 121) to determine the action.
- Only create an audit entry when `isSelected` actually changed value, not on every PATCH that includes `isSelected` in the body.

### Pitfall 14: Guest Registration Form Missing Email Uniqueness Check Before Submission

**What goes wrong:** A guest fills out the entire registration form and submits, only to get a 409 error because the email already exists. Poor UX -- should validate email availability earlier.

**Prevention:**
- Add a debounced email uniqueness check on blur of the email field (query `/api/auth/check-email` or similar).
- The existing admin create-user route already does this check (lines 73-87). Extract the email existence check into a shared utility.
- Still enforce uniqueness server-side in the registration endpoint (defense in depth).

### Pitfall 15: Analytics Page Views Tracked for Unauthenticated Pages

**What goes wrong:** Page view tracking is added globally (e.g., in a layout component) and records views of the sign-in page, the registration page, and error pages. These inflate "active users" and "page view" counts with noise.

**Prevention:**
- Only track page views inside the `(portal)` and `(guest)` route groups -- pages that require authentication.
- Add the tracking component to the portal layout and guest layout, not the root layout.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Audit logging | Write bottleneck on Neon (Pitfall 2), N+1 queries in admin view (Pitfall 5), enum drift (Pitfall 13) | Fire-and-forget inserts after successful update, Prisma includes with pagination, derive action from state diff |
| First-login password change | Bypass via direct navigation (Pitfall 1), flag not set for admin-created users (Pitfall 7) | Enforce in both layouts + `requireRole()`, explicit flag in admin create-user endpoint |
| Login tracking | Wrong hook placement (Pitfall 4), stale welcome message (Pitfall 11) | Use `session.create.after` hook, handle null `lastLoginAt` with conditional UI |
| Admin analytics | Unbounded event table (Pitfall 9), UA parsing failures (Pitfall 10), noisy page views (Pitfall 15) | Daily aggregation with retention policy, UA parser library, scope tracking to authenticated routes |
| Guest self-registration | Wrong-faculty accounts (Pitfall 3), role escalation (Pitfall 6), email limits (Pitfall 8), missing email check (Pitfall 14) | Server-side role hardcoding, faculty validation, in-app + email notification, debounced uniqueness check |
| Coordinator guest list | Missing faculty scope (Pitfall 12) | Copy existing coordinator submission scoping pattern from PATCH route |

---

## Sources

- Direct codebase analysis (HIGH confidence): `lib/auth.ts` (Better Auth config with `databaseHooks.session.create.before`), `lib/auth-helpers.ts` (`getCurrentUser()` and `requireRole()`), `app/api/admin/create-user/route.ts` (user creation with role from body), `app/api/coordinator/submissions/[id]/route.ts` (selection toggle with fire-and-forget email), `app/(portal)/layout.tsx` (server-side auth gate with GUEST redirect), `app/(auth)/sign-in/page.tsx` (client-side `router.push("/")` after login), `prisma/schema.prisma` (Session model with `userAgent` and `ipAddress`)
- Project context (HIGH confidence): `.planning/PROJECT.md` (constraints, key decisions, v1.1 scope, Gmail SMTP limitation)
- Neon serverless performance characteristics (MEDIUM confidence): based on general serverless PostgreSQL behavior, not load-tested against this schema

*Document created: 2026-03-09*
*Research type: Project Research -- Pitfalls for v1.1 features*
