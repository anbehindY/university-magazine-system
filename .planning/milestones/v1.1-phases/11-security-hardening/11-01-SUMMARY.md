---
phase: 11-security-hardening
plan: 01
subsystem: security
tags: [password-gate, login-tracking, welcome-message, security-hardening]
dependency_graph:
  requires: [10-01]
  provides: [password-change-gate, login-tracking, welcome-dashboard]
  affects: [auth, portal-layout, guest-layout, dashboard]
tech_stack:
  added: [better-auth/crypto]
  patterns: [fire-and-forget-prisma, mustChangePassword-gate, direct-password-hash]
key_files:
  created:
    - app/api/change-password/route.ts
    - app/(auth)/change-password/page.tsx
  modified:
    - lib/auth.ts
    - lib/auth-helpers.ts
    - app/(portal)/layout.tsx
    - app/(guest)/layout.tsx
    - app/(portal)/page.tsx
decisions:
  - Used hashPassword from better-auth/crypto with direct Prisma Account update (setPassword API not available in installed version)
  - ZodError uses .issues not .errors (auto-fixed during Task 3)
metrics:
  duration: 225s
  completed: 2026-03-09
  tasks: 5/5
---

# Phase 11 Plan 01: Security Hardening - Password Gate, Login Tracking & Welcome Message Summary

Password change gate enforced in 3 places (portal layout, guest layout, requireRole API), login tracking via fire-and-forget session.create.after hook, and dashboard welcome card with last login timestamp using date-fns formatting.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add login tracking hook | 772193f | lib/auth.ts |
| 2 | Add mustChangePassword gate | 39b6fdb | lib/auth-helpers.ts, app/(portal)/layout.tsx, app/(guest)/layout.tsx |
| 3 | Create password change API | a55c3b8 | app/api/change-password/route.ts |
| 4 | Create password change page UI | a0aa23d | app/(auth)/change-password/page.tsx |
| 5 | Add welcome card with last login | e9d845d | app/(portal)/page.tsx |

## Decisions Made

1. **hashPassword + direct Prisma update instead of auth.api.setPassword** -- The `setPassword` API method does not exist in the installed Better Auth version. Used `hashPassword` from `better-auth/crypto` to hash the new password and updated the Account table directly via `prisma.account.updateMany` with `providerId: "credential"` filter. This achieves the same result without requiring the current password.

2. **ZodError .issues property** -- The plan template used `.errors` but Zod's error object uses `.issues`. Auto-fixed during Task 3 (Rule 1 - Bug).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ZodError property name**
- **Found during:** Task 3
- **Issue:** Plan referenced `parsed.error.errors[0].message` but ZodError uses `issues` not `errors`
- **Fix:** Changed to `parsed.error.issues[0].message`
- **Files modified:** app/api/change-password/route.ts
- **Commit:** a55c3b8

**2. [Rule 3 - Blocking] auth.api.setPassword not available**
- **Found during:** Task 3
- **Issue:** `setPassword` method does not exist on `auth.api` in the installed Better Auth version
- **Fix:** Used the plan's documented fallback approach: `hashPassword` from `better-auth/crypto` + direct Prisma Account table update
- **Files modified:** app/api/change-password/route.ts
- **Commit:** a55c3b8

## Verification Results

- TypeScript compiles cleanly (`npx tsc --noEmit` -- zero errors)
- `mustChangePassword` present in 4 enforcement files: auth-helpers.ts, portal layout, guest layout, change-password API
- Password change page has context message, two password fields, success state with auto-redirect
- session.create.after hook updates lastLoginAt with fire-and-forget pattern
- Dashboard shows conditional welcome message with last login timestamp

## Requirements Satisfied

- **SEC-01:** User with mustChangePassword=true cannot access any page except /change-password
- **SEC-03:** Three enforcement points all check mustChangePassword (portal layout, guest layout, requireRole)
- **SEC-04:** Welcome message shows last login timestamp in absolute format on dashboard
- **SEC-05:** lastLoginAt updated only on successful session creation (after hook, not before)
