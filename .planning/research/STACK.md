# Technology Stack

**Project:** University Magazine System v1.1 - Security, Audit & Guest Self-Registration
**Researched:** 2026-03-09
**Research Type:** Project Research - Stack dimension (subsequent milestone)
**Confidence Note:** WebSearch and WebFetch were unavailable. Recharts and ua-parser-js versions are based on training data (cutoff May 2025). Verify with `npm view <pkg> version` before installing.

---

## Scope

This document covers ONLY new stack additions for v1.1 features. The existing validated stack (Next.js 16, React 19, Prisma 7, PostgreSQL/Neon, Better Auth 1.4.x, Vercel Blob, Nodemailer, Tailwind CSS 4, shadcn/ui, jsPDF, xlsx, SWR, react-hook-form, zod, archiver) is not re-evaluated.

---

## 1. Audit Logging (Selection Changes)

### Recommendation

**No new library.** Use a Prisma `AuditLog` model written in the same `$transaction` as the selection toggle.

### Rationale

The audit requirement is narrow: log when a coordinator selects or deselects a submission. This is one action type at low volume (tens per day at most). A dedicated `AuditLog` table with a transactional write alongside the existing `submission.update` is the cleanest approach.

### Schema Addition

```prisma
model AuditLog {
  id            String   @id @default(uuid())
  action        String   @db.VarChar(50)   // "SUBMISSION_SELECTED" | "SUBMISSION_DESELECTED"
  performedById String   @map("performed_by_id")
  performedBy   User     @relation(fields: [performedById], references: [id])
  targetId      String   @map("target_id")  // submissionId
  metadata      String?  @db.Text           // JSON string: { submissionTitle, studentName, facultyId }
  createdAt     DateTime @default(now())     @map("created_at")

  @@index([targetId])
  @@index([performedById])
  @@index([createdAt])
  @@map("audit_log")
}
```

### Integration Point

The coordinator selection toggle lives in `app/api/coordinator/submissions/[id]/route.ts`. Wrap the `submission.update` and `auditLog.create` in a single `prisma.$transaction()`.

### What NOT to Use

| Library | Why Skip |
|---------|----------|
| `prisma-audit-log` / `@prisma/audit` | Overkill for single-action audit. Adds middleware complexity for no gain. |
| `winston` / `pino` | Audit log is structured DB data for admin viewing, not application log output. |
| Event sourcing pattern | The system needs a simple history table, not a reconstructable event stream. |

**Confidence: HIGH** -- Standard Prisma pattern, verified against existing codebase transactional writes.

---

## 2. First-Login Forced Password Change

### Recommendation

**No new library.** Add a `mustChangePassword` boolean to the User model. Use layout-level redirect (existing pattern) to force navigation to `/change-password`. Use Better Auth's built-in `changePassword` API.

### Rationale

Better Auth exposes `auth.api.changePassword()` server-side. The existing portal layout (`app/(portal)/layout.tsx`) already redirects GUEST users to `/guest` -- the same pattern applies here: check `user.mustChangePassword`, redirect to `/change-password` if `true`.

### Schema Addition

```prisma
// Add to User model:
mustChangePassword Boolean @default(true) @map("must_change_password")
```

### Implementation Flow

1. Admin creates user via `/api/admin/create-user` -- user gets `mustChangePassword: true` (the default).
2. User signs in successfully (Better Auth session created).
3. Portal layout reads user, sees `mustChangePassword === true`, redirects to `/change-password`.
4. `/change-password` page (new, in `(auth)` or standalone route group):
   - Requires current password + new password (Better Auth `changePassword` needs both).
   - On success: API route sets `mustChangePassword = false` via Prisma update.
   - Redirects to portal.
5. Guest self-registered users get `mustChangePassword: false` (they chose their own password).

### Integration Points

- `app/(portal)/layout.tsx` -- Add `mustChangePassword` check before existing GUEST redirect.
- `app/(guest)/layout.tsx` -- Same check for guest users.
- `lib/auth-helpers.ts` -- Extend `getCurrentUser()` to include `mustChangePassword` field.
- `app/api/admin/create-user/route.ts` -- No change needed; the `@default(true)` handles it.

### What NOT to Use

| Approach | Why Skip |
|----------|----------|
| Better Auth plugin | No built-in "force password change" plugin exists in Better Auth (verified in `node_modules/better-auth/dist/plugins/`). |
| Custom middleware | Next.js middleware cannot call Prisma (edge runtime constraint). Layout-level redirect is the correct pattern. |
| Session-based flag | The flag must persist across sessions (user might close browser and return). DB field is required. |

**Confidence: HIGH** -- Layout redirect pattern verified in existing code. `changePassword` API confirmed in Better Auth.

---

## 3. Last Login Tracking

### Recommendation

**No new library.** Add `lastLoginAt DateTime?` to User model. Update it via Better Auth's `databaseHooks.session.create.after` callback -- the exact same hook location already used for ban checking.

### Schema Addition

```prisma
// Add to User model:
lastLoginAt DateTime? @map("last_login_at")
```

### Implementation

Extend the existing `databaseHooks` in `lib/auth.ts`:

```typescript
databaseHooks: {
  session: {
    create: {
      before: async (session) => {
        // Existing ban check -- unchanged
        const userId = session.userId as string | undefined;
        if (!userId) return;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { banned: true },
        });
        if (user?.banned) return false;
      },
      after: async (session) => {
        const userId = session.userId as string | undefined;
        if (!userId) return;
        await prisma.user.update({
          where: { id: userId },
          data: { lastLoginAt: new Date() },
        });
      },
    },
  },
},
```

Display "Welcome back! Last login: [date]" in the portal header using the existing `getCurrentUser()` pattern with `lastLoginAt` included.

### Why NOT the `lastLoginMethod` Plugin

The Better Auth `lastLoginMethod` plugin (verified at `node_modules/better-auth/dist/plugins/last-login-method/`) tracks which *authentication method* was used (email, OAuth, etc.), not the login *timestamp*. Since this app only uses email/password auth, the method is always the same -- the plugin adds no value. A simple `lastLoginAt` field updated via the existing hook is more direct and avoids plugin configuration overhead.

**Confidence: HIGH** -- `databaseHooks.session.create.after` verified in Better Auth source. The `before` hook is already working in production.

---

## 4. Admin Analytics Reports

### 4a. Data Collection -- Page Views

### Recommendation

**No new library for collection.** Add a `PageView` model. Track visits via a lightweight client-side component that POSTs to `/api/analytics/pageview`.

### Schema Addition

```prisma
model PageView {
  id        String   @id @default(uuid())
  userId    String?  @map("user_id")
  path      String   @db.VarChar(255)
  userAgent String?  @db.Text @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([path])
  @@index([userId])
  @@map("page_view")
}
```

### Collection Pattern

A `<PageViewTracker />` client component placed in the root layout fires a `POST` on route change:

```typescript
"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function PageViewTracker() {
  const pathname = usePathname();
  const prev = useRef("");
  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;
    fetch("/api/analytics/pageview", {
      method: "POST",
      body: JSON.stringify({ path: pathname }),
      headers: { "Content-Type": "application/json" },
    }).catch(() => {}); // fire-and-forget, non-blocking
  }, [pathname]);
  return null;
}
```

The API route extracts `userAgent` from the request headers and `userId` from the session (if authenticated). Unauthenticated page views are stored with `userId: null`.

### Why NOT an External Analytics Service

| Service | Why Skip |
|---------|----------|
| PostHog / Plausible / GA | External dependency for an internal university system. Adds third-party data handling concerns. |
| Vercel Analytics | Paid feature, limited query flexibility, cannot be displayed in custom admin dashboard. |

The requirement is for admin-facing reports (page views, active users, browser usage) displayed within the existing app. A `PageView` table with raw SQL aggregation matches the existing report pattern (statistical reports already use `$queryRaw`).

### 4b. User-Agent Parsing -- Browser Usage Reports

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **ua-parser-js** | ^2.0 | Parse browser/OS from User-Agent strings | Lightweight (~12KB), zero dependencies, well-maintained. Server-side only -- used when aggregating analytics, not on every page view. |
| **@types/ua-parser-js** | (dev) | TypeScript types | -- |

**Confidence: MEDIUM** -- ua-parser-js 2.0 is from training data. Verify version at install time.

**Why ua-parser-js and NOT manual regex:** User-Agent strings are notoriously inconsistent. ua-parser-js handles edge cases (mobile browsers, Chromium variants, bots) that a hand-written regex would miss or get wrong.

**Why NOT parse on write:** Parse the User-Agent at read time (when building the analytics report), not at write time. This keeps the `PageView` insert fast (single column write) and allows re-parsing if the library updates its detection rules.

### 4c. Chart Rendering -- Analytics Dashboard

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **recharts** | ^2.15 | Bar, line, and pie charts for admin analytics dashboard | shadcn/ui's official chart component is built on Recharts. Using Recharts directly ensures consistency with the existing component library and allows using `shadcn/ui add chart` to scaffold wrappers. React 19 compatible. SVG-based (accessible, responsive). |

**Confidence: MEDIUM** -- Recharts 2.15 is from training data. Verify with `npm view recharts version`.

### Why Recharts

| Alternative | Why Skip |
|-------------|----------|
| Chart.js + react-chartjs-2 | Two packages, canvas-based (less accessible), not aligned with shadcn/ui. |
| Nivo | Heavier bundle, more complex API for the simple charts needed here. |
| Tremor | Built on Recharts internally -- adds an abstraction layer with no benefit. |
| D3 directly | Too low-level for bar/pie/line charts. Recharts wraps D3 with React components. |

### Analytics Report Queries

All aggregations use raw SQL (matching existing report pattern):

- **Page views over time:** `GROUP BY DATE(created_at)` on `page_view`
- **Most visited pages:** `GROUP BY path, COUNT(*)` on `page_view`
- **Active users (daily/weekly):** `COUNT(DISTINCT user_id) WHERE created_at > interval` on `page_view`
- **Browser usage:** Parse `user_agent` with ua-parser-js in the API route, aggregate in memory

**Confidence: HIGH** for the pattern. Raw SQL aggregation is proven in the existing reports.

---

## 5. Guest Self-Registration

### Recommendation

**No new library.** Reuse Better Auth `signUpEmail` API (same as admin create-user) + existing Nodemailer infrastructure for coordinator notification.

### Implementation Flow

1. Public registration page at `/register` (or `/sign-up`) in the `(auth)` route group alongside `/sign-in`.
2. Form: name, email, password, faculty selector (faculties fetched from API).
3. Server-side API route:
   - Call `auth.api.signUpEmail({ body: { name, email, password } })` -- same as admin create-user.
   - Update user: `role: "GUEST"`, `facultyId`, `mustChangePassword: false`, `emailVerified: true`.
   - Query coordinators for the faculty: `prisma.user.findMany({ where: { role: "MARKETING_COORDINATOR", facultyId } })`.
   - Send notification email to coordinator(s) via existing Nodemailer utility.
4. Redirect to sign-in page with success message.

### Why This Works

The existing `app/api/admin/create-user/route.ts` already does: `auth.api.signUpEmail` then `prisma.user.update` for role/faculty. The guest self-registration route follows the identical pattern, minus the admin auth check, plus a coordinator email notification.

### What NOT to Use

| Approach | Why Skip |
|----------|----------|
| OAuth / social login | System uses email/password exclusively. Adding OAuth is scope creep. |
| Email verification flow | Guests are low-privilege (read-only selected submissions). Email verification adds friction with minimal security benefit. Set `emailVerified: true` directly. |
| Approval workflow | Not in requirements. Guest gets immediate read-only access. |

**Confidence: HIGH** -- `auth.api.signUpEmail` verified in existing code. Nodemailer infrastructure already working.

---

## 6. Coordinator Guest List

### Recommendation

**No new library.** Prisma query with faculty + role filter, reusing existing server-side pagination pattern from admin users list.

### Implementation

```typescript
const guests = await prisma.user.findMany({
  where: {
    role: "GUEST",
    facultyId: coordinatorFacultyId,
  },
  orderBy: { createdAt: "desc" },
  skip: (page - 1) * pageSize,
  take: pageSize,
  select: { id: true, name: true, email: true, createdAt: true, banned: true },
});
```

This mirrors the existing admin users page pattern (`app/(portal)/admin/users/page.tsx` with server-side pagination).

**Confidence: HIGH** -- Existing pattern, no new dependencies.

---

## Summary: What to Install

### New Runtime Dependencies

```bash
pnpm add recharts ua-parser-js
```

### New Dev Dependencies

```bash
pnpm add -D @types/ua-parser-js
```

**Total: 2 runtime packages, 1 type package.** Everything else uses the existing stack.

---

## What NOT to Add

| Suggestion You Might See | Why Skip |
|--------------------------|----------|
| `prisma-audit-log` / `@prisma/audit` | Overkill for single-action audit trail. Simple model + `$transaction`. |
| PostHog / Plausible / Google Analytics | External service for internal university analytics. `PageView` table is simpler. |
| Better Auth `lastLoginMethod` plugin | Tracks method (email/OAuth), not timestamp. Only one method exists. |
| Chart.js / react-chartjs-2 | Two packages, canvas-based, not shadcn/ui aligned. |
| Tremor | Built on Recharts. Extra abstraction with no added value. |
| Redis for session/analytics | PostgreSQL handles the volume. University-scale, not high-traffic. |
| `winston` / `pino` | Audit log is structured DB data, not application logging. |
| `next-auth` / Auth.js | Already using Better Auth. No migration warranted. |
| Custom middleware for password check | Next.js middleware runs in edge runtime, cannot call Prisma. Layout redirect is correct. |

---

## Schema Changes Summary

| Model | Change | Fields | Purpose |
|-------|--------|--------|---------|
| `User` | Extend | `mustChangePassword Boolean @default(true)`, `lastLoginAt DateTime?` | First-login flow, last login display |
| `AuditLog` | New | `action`, `performedById`, `targetId`, `metadata`, `createdAt` | Selection change audit trail |
| `PageView` | New | `userId?`, `path`, `userAgent?`, `createdAt` | Admin analytics data collection |

---

## Integration Points

| Feature | Integrates With | How |
|---------|----------------|-----|
| Audit log | Coordinator selection API (`/api/coordinator/submissions/[id]`) | `$transaction` wrapping selection update + audit write |
| First-login redirect | Portal layout + Guest layout | `user.mustChangePassword` check (same pattern as GUEST redirect) |
| Password change | Better Auth `changePassword` API | New `/change-password` page + API route to clear flag |
| Last login tracking | `lib/auth.ts` `databaseHooks` | Add `after` hook to existing `session.create` |
| Page view tracking | Root layout (`app/layout.tsx`) | `<PageViewTracker />` client component, fire-and-forget POST |
| Analytics charts | Admin dashboard page | Recharts components inside shadcn/ui Card layouts |
| Browser parsing | Analytics API route | ua-parser-js server-side, parse on read |
| Guest registration | `(auth)` route group | New `/register` page + API route using `auth.api.signUpEmail` |
| Coordinator notification | Existing Nodemailer utility | Email sent from guest registration API |
| Guest list | Coordinator portal pages | Prisma query with pagination (existing pattern) |

---

## Environment Variables

No new environment variables required. All features use existing database, auth, and email configuration.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Audit log (no new deps) | HIGH | Prisma `$transaction` pattern verified in codebase |
| First-login flow (no new deps) | HIGH | Layout redirect pattern + `changePassword` API verified |
| Last login (no new deps) | HIGH | `databaseHooks.session.create.after` verified in Better Auth source |
| Guest registration (no new deps) | HIGH | `auth.api.signUpEmail` verified in existing create-user route |
| Guest list (no new deps) | HIGH | Prisma query + existing pagination pattern |
| Recharts version | MEDIUM | ^2.15 from training data. shadcn/ui alignment is HIGH confidence. |
| ua-parser-js version | MEDIUM | ^2.0 from training data. Library existence and purpose is HIGH confidence. |

---

## Sources

- `/home/alfie/next-prisma/lib/auth.ts` -- Existing Better Auth config with `databaseHooks` pattern
- `/home/alfie/next-prisma/prisma/schema.prisma` -- Current schema (User, Session models)
- `/home/alfie/next-prisma/app/api/admin/create-user/route.ts` -- Existing user creation via `auth.api.signUpEmail`
- `/home/alfie/next-prisma/app/(portal)/layout.tsx` -- Existing layout-level redirect pattern (GUEST role)
- `/home/alfie/next-prisma/lib/auth-helpers.ts` -- Existing `getCurrentUser()` helper
- `/home/alfie/next-prisma/lib/auth-client.ts` -- Client-side auth setup
- `/home/alfie/next-prisma/package.json` -- Current dependency versions
- `/home/alfie/next-prisma/node_modules/better-auth/dist/plugins/` -- Verified available plugins list
- `/home/alfie/next-prisma/node_modules/better-auth/dist/plugins/last-login-method/index.d.mts` -- Confirmed plugin tracks method, not timestamp

*Research: 2026-03-09 | Recharts and ua-parser-js versions not verified against live npm registry -- confirm before installing.*
