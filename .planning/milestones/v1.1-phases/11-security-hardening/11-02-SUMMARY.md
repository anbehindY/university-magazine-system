---
phase: 11-security-hardening
plan: 02
subsystem: security
tags: [gap-closure, additionalFields, session-fields, type-safety]
dependency_graph:
  requires: [11-01]
  provides: [session-mustChangePassword, session-lastLoginAt]
  affects: [auth, auth-client, portal-layout, guest-layout, dashboard]
tech_stack:
  added: []
  patterns: [better-auth-additionalFields, inferAdditionalFields-client-plugin]
key_files:
  created: []
  modified:
    - lib/auth.ts
    - lib/auth-client.ts
    - lib/auth-helpers.ts
    - app/(portal)/layout.tsx
    - app/(guest)/layout.tsx
    - app/(portal)/page.tsx
decisions:
  - additionalFields uses input:false for both fields to prevent client-side manipulation
  - inferAdditionalFields<typeof auth>() for monorepo-style type inference from server config
metrics:
  duration: 122s
  completed: 2026-03-10
  tasks: 2/2
---

# Phase 11 Plan 02: Gap Closure - Session Additional Fields Summary

Added Better Auth `user.additionalFields` config for `mustChangePassword` (boolean) and `lastLoginAt` (date) so these custom Prisma User fields are included in session objects, fixing all 4 UAT failures (Tests 1, 4, 5, 6) that shared this single root cause.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add user.additionalFields to betterAuth config and update auth client | 4b48ee3 | lib/auth.ts, lib/auth-client.ts |
| 2 | Remove unsafe (user as any) casts | 73d047e | lib/auth-helpers.ts, app/(portal)/layout.tsx, app/(guest)/layout.tsx, app/(portal)/page.tsx |

## Decisions Made

1. **additionalFields with input:false** -- Both `mustChangePassword` and `lastLoginAt` use `input: false` to prevent clients from setting these fields during signup or profile updates. Only server-side code (databaseHooks, admin actions) can modify them.

2. **inferAdditionalFields<typeof auth>() pattern** -- Used the monorepo/single-project approach where the client plugin infers field types directly from the server auth config export, avoiding manual type duplication.

## Deviations from Plan

None -- plan executed exactly as written.

## UAT Gaps Addressed

| UAT Test | Issue | Root Cause Fix |
|----------|-------|----------------|
| 1 - Password Change Gate Redirect | mustChangePassword always undefined in session | additionalFields config now includes mustChangePassword |
| 4 - Gate Bypass Prevention | Same as Test 1 | Same fix |
| 5 - Welcome Message with Last Login | lastLoginAt always undefined in session | additionalFields config now includes lastLoginAt |
| 6 - Login Tracking Updates | Same as Test 5 | Same fix |

## Verification Results

- TypeScript compiles cleanly (`npx tsc --noEmit` -- zero errors)
- `npm run build` succeeds with no errors
- `additionalFields` configured in lib/auth.ts with mustChangePassword and lastLoginAt
- `inferAdditionalFields` plugin configured in lib/auth-client.ts
- No `(user as any)` casts remain in any of the 4 target files
- All field accesses now properly typed through Better Auth's session type system
