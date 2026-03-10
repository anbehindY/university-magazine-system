# Architecture Patterns

**Domain:** v1.1 feature integration into existing University Magazine System
**Researched:** 2026-03-09

## Existing Architecture Summary

The app follows a clean Next.js 16 App Router pattern with route groups for role separation:

```
app/
  (auth)/sign-in/           -- Public sign-in page (client component)
  (portal)/                 -- All non-guest authenticated roles (server layout with sidebar)
    admin/users|closure-dates|upload-rules
    coordinator/submissions
    manager/submissions
    student/submissions
    reports/
  (guest)/                  -- Isolated guest layout (no sidebar, own header)
    guest/
  api/                      -- REST-style API routes
    auth/[...all]           -- Better Auth catch-all
    admin/create-user|users|academic-years|upload-rules
    coordinator/submissions/[id]
    manager/submissions/download
    reports/
    guest/submissions
```

**Auth flow:** Better Auth with admin plugin. `lib/auth.ts` configures server-side auth with `databaseHooks.session.create.before` (banned user check). `lib/auth-client.ts` exports client hooks (`useSession`, `signIn`). `lib/auth-helpers.ts` provides `getCurrentUser()` and `requireRole()` for server components and API routes. No Next.js middleware exists -- auth is checked per-layout and per-API-route.

**Data layer:** Prisma 7 with PostgreSQL (Neon). Raw SQL used for aggregate reports. Session table already stores `ipAddress` and `userAgent`.

**Email:** `lib/mailer.ts` wraps Nodemailer with a singleton transporter. Fire-and-forget pattern (`.catch(console.error)`).

## Recommended Architecture for v1.1 Features

### Component Boundaries

| Component | Responsibility | New/Modified | Communicates With |
|-----------|---------------|--------------|-------------------|
| `AuditLog` model (Prisma) | Store selection change history | NEW | Prisma, coordinator API |
| `lib/audit.ts` | Helper to create audit log entries | NEW | Prisma, coordinator API route |
| `app/api/coordinator/submissions/[id]/route.ts` | Log selection changes on PATCH | MODIFIED | audit helper |
| `app/api/admin/audit-log/route.ts` | Read audit logs for admin view | NEW | Prisma |
| `app/(portal)/admin/audit-log/page.tsx` | Admin UI to browse audit logs | NEW | audit API |
| `User.mustChangePassword` field | Flag for first-login forced change | NEW (schema) | auth flow, password change page |
| `User.lastLoginAt` field | Track last login timestamp | NEW (schema) | Better Auth session hook, dashboard |
| `app/api/admin/create-user/route.ts` | Set `mustChangePassword: true` on user creation | MODIFIED | Prisma |
| `lib/auth.ts` | Update `lastLoginAt` in session create hook | MODIFIED | Prisma |
| `app/(auth)/change-password/page.tsx` | Force password change UI | NEW | Better Auth client, redirect logic |
| `app/(portal)/layout.tsx` | Check `mustChangePassword`, redirect if true | MODIFIED | Prisma |
| `app/(portal)/page.tsx` | Show "Welcome back" with last login time | MODIFIED | session data or API |
| `app/api/admin/analytics/route.ts` | Aggregate analytics data for admin | NEW | Prisma (sessions, users) |
| `app/(portal)/admin/analytics/page.tsx` | Admin analytics dashboard | NEW | analytics API |
| `app/(auth)/guest-register/page.tsx` | Public guest self-registration form | NEW | registration API |
| `app/api/auth/guest-register/route.ts` | Create GUEST user, notify coordinator | NEW | Prisma, Better Auth, mailer |
| `app/api/coordinator/guests/route.ts` | List guests for coordinator's faculty | NEW | Prisma |
| `app/(portal)/coordinator/guests/page.tsx` | Coordinator guest list UI | NEW | guests API |

### Data Flow

#### 1. Audit Log for Selection Changes

```
Coordinator toggles selection
  --> PATCH /api/coordinator/submissions/[id]
    --> (existing) Update submission.isSelected
    --> (NEW) Call createAuditLog({ submissionId, coordinatorId, action, previousValue, newValue })
    --> (existing) Send email if newly selected
  --> Response includes updated submission
```

The audit log write happens in the same API route handler, AFTER the Prisma update succeeds. No transaction needed -- audit is append-only observational data; a failed audit write should not roll back the selection change. Use `.catch(console.error)` like the existing email pattern.

#### 2. First-Login Password Change

```
User signs in via Better Auth
  --> Client redirects to / (existing behavior)
  --> (portal) layout.tsx server component checks user.mustChangePassword
    --> If true: redirect("/change-password")
  --> /change-password page:
    --> User enters new password
    --> POST /api/auth/change-password (Better Auth changePassword API or custom)
    --> On success: UPDATE user SET mustChangePassword = false
    --> Redirect to /
```

The check happens in the server-side `(portal)/layout.tsx` which already calls `getCurrentUser()`. Add a Prisma query for `mustChangePassword` (or include it in the user select). The `(guest)/layout.tsx` needs the same check. The `(auth)/change-password` page lives outside both layouts so the redirect does not create a loop.

**Important:** The `(auth)/sign-in` page currently redirects to `/` after sign-in. This does NOT need to change. The `/` page loads `(portal)/layout.tsx` which will catch the `mustChangePassword` flag and redirect before rendering children.

#### 3. Last Login Tracking

```
User signs in
  --> Better Auth creates session
  --> databaseHooks.session.create.after (NEW hook)
    --> UPDATE user SET lastLoginAt = NOW() WHERE id = session.userId
  --> Dashboard page fetches session + user
  --> Welcome section shows "Last login: {date}" (or "Welcome! First time here.")
```

The existing `databaseHooks.session.create.before` already runs a banned-user check. Add an `after` hook (or extend `before` to also update `lastLoginAt` after the ban check passes). Better Auth supports both `before` and `after` hooks on session creation.

The Session model already has `createdAt`, `ipAddress`, and `userAgent` -- no schema changes needed for session-level data. The `lastLoginAt` on User is the PREVIOUS session's timestamp (set on new session creation), giving a "last time you were here" message.

#### 4. Admin Analytics Reports

```
Admin visits /admin/analytics
  --> Client fetches GET /api/admin/analytics?period=30d
  --> API aggregates:
    - Active users: COUNT(DISTINCT userId) from session WHERE createdAt > cutoff
    - Browser usage: Parse userAgent from session, GROUP BY browser family
    - Login frequency: COUNT sessions GROUP BY date
    - Users by role: COUNT users GROUP BY role (already exists in /api/admin/users/stats)
  --> Returns JSON, rendered as charts/tables
```

**Key insight:** The existing Session table already stores `userAgent` and `createdAt`. No new tracking infrastructure needed. Parse `userAgent` server-side using a lightweight parser (e.g., `ua-parser-js`, ~12KB). For "page views," the system has no page-view tracking today and adding it is disproportionate effort -- reframe as "login activity / active user analytics" which the Session table already supports.

If true page-view analytics are required, recommend a lightweight middleware that logs to a `PageView` table. But this was NOT in v1.0 and the Session-based approach covers the stated requirement of "active users, browser usage."

#### 5. Guest Self-Registration

```
Unauthenticated user visits /guest-register
  --> Selects faculty, enters name/email/password
  --> POST /api/auth/guest-register
    --> Validate fields (name, email, password, facultyId)
    --> Check email uniqueness
    --> Create user via auth.api.signUpEmail (same pattern as admin create-user)
    --> Update user: role=GUEST, facultyId, emailVerified=true, mustChangePassword=false
    --> Find faculty's coordinator(s): SELECT * FROM user WHERE role='MARKETING_COORDINATOR' AND facultyId=X
    --> Send notification email to coordinator(s)
    --> Return success (do NOT auto-sign-in)
  --> Client shows success message with link to /sign-in
```

The registration page lives at `app/(auth)/guest-register/page.tsx` in the `(auth)` route group (no sidebar, no auth required). The API endpoint mirrors the existing `admin/create-user` pattern but is publicly accessible with hardcoded GUEST role.

#### 6. Coordinator Guest List

```
Coordinator visits /coordinator/guests
  --> Client fetches GET /api/coordinator/guests
  --> API: requireRole(MARKETING_COORDINATOR)
    --> Get coordinator's facultyId
    --> SELECT users WHERE role='GUEST' AND facultyId = coordinator's faculty
    --> Return list with name, email, createdAt
  --> Rendered as a simple table (read-only)
```

## Patterns to Follow

### Pattern 1: Append-Only Audit Log
**What:** Write audit entries as immutable records. Never update or delete audit rows.
**When:** Any action that needs accountability (selection changes now, potentially more later).
**Example:**
```typescript
// lib/audit.ts
import prisma from "@/lib/prisma";

export async function createAuditLog(entry: {
  action: string;        // "SUBMISSION_SELECTED" | "SUBMISSION_DESELECTED"
  entityType: string;    // "Submission"
  entityId: string;      // submission.id
  performedById: string; // coordinator user id
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      ...entry,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    },
  });
}
```

### Pattern 2: Server Layout Guard for Password Change
**What:** Check `mustChangePassword` in the server-side layout, redirect before rendering children.
**When:** Forced password change on first login.
**Why:** Follows the existing pattern where `(portal)/layout.tsx` already checks role and redirects guests. Consistent, server-side, no flash of content.
```typescript
// In (portal)/layout.tsx -- after getCurrentUser()
const dbUser = await prisma.user.findUnique({
  where: { id: user.id },
  select: { mustChangePassword: true },
});
if (dbUser?.mustChangePassword) {
  redirect("/change-password");
}
```

### Pattern 3: Session Hook for Login Tracking
**What:** Use Better Auth's `databaseHooks.session.create` to update user's `lastLoginAt`.
**When:** Every successful login.
**Why:** Centralized, automatic, no extra API calls needed. Piggybacks on existing hook infrastructure in `lib/auth.ts`.

### Pattern 4: Faculty-Scoped API Routes
**What:** API routes that scope data by the authenticated user's `facultyId`.
**When:** Coordinator guest list, faculty-scoped reports.
**Why:** Follows the exact pattern already used in `coordinator/submissions` and `reports` routes. Look up `dbUser.facultyId`, use it in the WHERE clause.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Auth Guards for Password Change
**What:** Checking `mustChangePassword` in a client component and redirecting.
**Why bad:** Flash of protected content before redirect. Race condition with SWR session fetch. The existing app already solved this with server-side layout checks.
**Instead:** Check in `(portal)/layout.tsx` and `(guest)/layout.tsx` server components.

### Anti-Pattern 2: Next.js Middleware for Auth
**What:** Adding a `middleware.ts` to check `mustChangePassword` or auth state.
**Why bad:** The app has no middleware today. Better Auth session checking in middleware requires edge-compatible database access, which Prisma + Neon may not cleanly support. Adding middleware for one feature creates a second auth-checking surface that diverges from the existing per-layout pattern.
**Instead:** Stay with per-layout server-side checks.

### Anti-Pattern 3: Separate Analytics Tracking Table
**What:** Creating a `PageView` or `AnalyticsEvent` table with custom tracking.
**Why bad:** Disproportionate effort for stated requirements. Adds write load on every page view. The Session table already provides active user and browser data.
**Instead:** Derive analytics from the existing Session table. Add a `PageView` table only if explicitly required later.

### Anti-Pattern 4: Transaction Wrapping Audit Writes
**What:** Using `prisma.$transaction` to wrap the selection update + audit log.
**Why bad:** Audit is observational. A failed audit write should NOT prevent the business operation (selection toggle). Transactions add latency and complexity.
**Instead:** Write audit after the successful update. Use `.catch(console.error)` like the existing email pattern.

### Anti-Pattern 5: Auto-Sign-In After Guest Registration
**What:** Automatically signing in the guest after self-registration.
**Why bad:** The existing admin-create-user flow does not auto-sign-in. Auto-sign-in requires handling session creation, cookie setting, and redirect in a public endpoint. Larger security surface.
**Instead:** Show success message and link to sign-in page.

## Schema Changes (New Models and Fields)

### New Model: AuditLog

```prisma
model AuditLog {
  id            String   @id @default(uuid())
  action        String   @db.VarChar(100)   // e.g. "SUBMISSION_SELECTED"
  entityType    String   @db.VarChar(50) @map("entity_type")
  entityId      String   @map("entity_id")
  performedById String   @map("performed_by_id")
  performedBy   User     @relation(fields: [performedById], references: [id])
  metadata      String?  @db.Text           // JSON string for flexible data
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([performedById])
  @@index([createdAt])
  @@map("audit_log")
}
```

### Modified Model: User (new fields)

```prisma
model User {
  // ... existing fields ...
  mustChangePassword Boolean   @default(false) @map("must_change_password")
  lastLoginAt        DateTime? @map("last_login_at")
  auditLogs          AuditLog[]
}
```

### No New Models Needed For:
- **Analytics:** Derived from existing `Session` table (has `createdAt`, `userAgent`, `userId`)
- **Guest registration:** Uses existing `User` model with `role: GUEST`
- **Guest list:** Query existing `User` table filtered by `role` and `facultyId`

## New Routes Summary

| Route | Type | Auth | Purpose |
|-------|------|------|---------|
| `app/(auth)/change-password/page.tsx` | Page | Authenticated (any role) | Forced password change UI |
| `app/(auth)/guest-register/page.tsx` | Page | Public | Guest self-registration form |
| `app/api/auth/guest-register/route.ts` | API | Public | Create guest account, notify coordinator |
| `app/api/auth/change-password/route.ts` | API | Authenticated | Update password, clear `mustChangePassword` flag |
| `app/api/admin/audit-log/route.ts` | API | Admin only | Read paginated audit logs |
| `app/api/admin/analytics/route.ts` | API | Admin only | Aggregated analytics data |
| `app/api/coordinator/guests/route.ts` | API | Coordinator only | Faculty-scoped guest list |
| `app/(portal)/admin/audit-log/page.tsx` | Page | Admin only | Audit log viewer |
| `app/(portal)/admin/analytics/page.tsx` | Page | Admin only | Analytics dashboard |
| `app/(portal)/coordinator/guests/page.tsx` | Page | Coordinator only | Guest list table |

## Modified Files Summary

| File | Change | Reason |
|------|--------|--------|
| `prisma/schema.prisma` | Add `AuditLog` model, add `mustChangePassword` and `lastLoginAt` to User | Schema for new features |
| `lib/auth.ts` | Add logic in session create hook to update `lastLoginAt` | Login tracking |
| `app/api/admin/create-user/route.ts` | Set `mustChangePassword: true` in user update | First-login force change |
| `app/api/coordinator/submissions/[id]/route.ts` | Add audit log write after selection toggle | Audit logging |
| `app/(portal)/layout.tsx` | Add `mustChangePassword` check + redirect | Force password change |
| `app/(guest)/layout.tsx` | Add `mustChangePassword` check + redirect | Force password change (guest role) |
| `app/(portal)/page.tsx` | Display last login timestamp in welcome section | Last login UX |
| `app/(auth)/sign-in/page.tsx` | Add link to guest registration | Discovery for self-registering guests |

## Suggested Build Order

Build order is driven by schema dependencies and feature isolation:

```
1. Schema migration (AuditLog model + User fields)
   |-- No feature depends on another feature, but ALL features depend on schema
   |
2. First-login password change
   |-- Depends on: schema (mustChangePassword field)
   |-- Blocks: nothing directly, but should ship early since create-user sets the flag
   |-- Includes: change-password page, API, layout guards, create-user modification
   |
3. Last login tracking
   |-- Depends on: schema (lastLoginAt field)
   |-- Includes: auth.ts hook modification, dashboard welcome UI change
   |-- Small, isolated change
   |
4. Audit logging for selection changes
   |-- Depends on: schema (AuditLog model)
   |-- Includes: lib/audit.ts helper, coordinator API modification, admin audit log page + API
   |
5. Guest self-registration with coordinator notification
   |-- Depends on: schema (no new fields beyond mustChangePassword already added)
   |-- Includes: registration page, API, coordinator email notification
   |-- Should come after password change (so new guests get forced change if desired)
   |
6. Coordinator guest list
   |-- Depends on: guest registration feature existing (otherwise empty list)
   |-- Includes: coordinator guests API + page
   |
7. Admin analytics reports
   |-- Depends on: nothing new (reads existing Session data)
   |-- Includes: analytics API + page, ua-parser-js dependency
   |-- Lowest priority -- fully independent, can ship in any order
```

**Rationale:** Schema first because every feature touches it. Password change second because it affects the create-user flow that admins use daily. Audit logging third because it modifies a critical existing endpoint (coordinator selection toggle). Guest registration fourth because it is a new public surface requiring careful validation. Analytics last because it is purely read-only and completely independent.

## Scalability Considerations

| Concern | Current Scale | At Scale | Approach |
|---------|---------------|----------|----------|
| Audit log growth | Dozens of entries | Thousands per year | Index on `createdAt`, paginate API. Consider retention policy later. |
| Session-based analytics | Small session table | Thousands of sessions | Date-range filter queries. Cache results for 5 min if needed. |
| Guest registration spam | N/A (admin-created today) | Possible with public endpoint | Rate limit the endpoint. Require valid faculty. Consider CAPTCHA if abused. |
| Password change redirect | Per-request DB check | Minimal overhead | Single Prisma select per layout render. Could cache in session cookie later. |

## Sources

- Codebase analysis: `lib/auth.ts` (Better Auth config with session hooks), `lib/auth-helpers.ts`, `lib/auth-client.ts`
- Codebase analysis: `lib/mailer.ts` (fire-and-forget email pattern)
- Codebase analysis: `app/(portal)/layout.tsx` (server-side role check + redirect pattern)
- Codebase analysis: `app/(guest)/layout.tsx` (server layout for guest role)
- Codebase analysis: `app/api/coordinator/submissions/[id]/route.ts` (selection toggle with email)
- Codebase analysis: `app/api/admin/create-user/route.ts` (user creation via auth.api.signUpEmail)
- Codebase analysis: `prisma/schema.prisma` (Session model has ipAddress, userAgent, createdAt)
- Better Auth session hooks: `before` hook verified from existing `lib/auth.ts` usage (MEDIUM confidence for `after` hook -- consistent with Better Auth patterns)
- Better Auth admin plugin: `auth.api.signUpEmail` verified from existing create-user route (HIGH confidence)
