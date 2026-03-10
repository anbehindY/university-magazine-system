---
phase: quick-22
plan: 01
subsystem: admin-user-management
tags: [admin, guest, role-enforcement, ui, api]
dependency_graph:
  requires: []
  provides: [guest-self-registration-only]
  affects: [admin-create-user, admin-edit-user]
tech_stack:
  added: []
  patterns: [role-whitelist-enforcement]
key_files:
  created: []
  modified:
    - app/api/admin/create-user/route.ts
    - app/api/admin/users/route.ts
    - app/(portal)/admin/users/page.tsx
    - docs/ASSUMPTIONS.md
decisions:
  - GUEST role removed from admin VALID_ROLES arrays for server-side enforcement
  - GUEST removed from UI Role type and both create/edit dropdowns
  - ASSUMPTIONS.md updated with explicit self-registration-only rule
metrics:
  duration: 75s
  completed: "2026-03-10"
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 22: Remove Admin Guest Creation Summary

GUEST role removed from admin create/edit APIs and UI; all guests must self-register through the public registration page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove GUEST from admin API endpoints | 15d6f81 | app/api/admin/create-user/route.ts, app/api/admin/users/route.ts |
| 2 | Remove GUEST from admin UI role selectors and update docs | 76fbd74 | app/(portal)/admin/users/page.tsx, docs/ASSUMPTIONS.md |

## What Changed

### API Layer (Server-side enforcement)
- Removed "GUEST" from `VALID_ROLES` array in both `create-user/route.ts` and `users/route.ts`
- Any API request with `role: "GUEST"` now fails validation (`parseRole()` returns null, triggering 400 error)
- Removed `role === "GUEST"` from faculty validation conditions (only MARKETING_COORDINATOR and STUDENT require faculty)

### UI Layer (Client-side removal)
- Removed "GUEST" from the `Role` type union
- Removed GUEST `SelectItem` from create-user dialog role selector
- Removed GUEST `SelectItem` from edit-user dialog role selector
- Removed GUEST role description text ("Read-only access to selected reports...")
- Removed `role === "GUEST"` from `requiresFaculty` and `requiresEditFaculty` computed values

### Documentation
- Updated ASSUMPTIONS.md: removed "guests" from admin-created account list
- Added new assumption: "The Administrator cannot create guest accounts; the GUEST role is exclusively assigned through self-registration."

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors
- No GUEST references remain in admin API VALID_ROLES arrays
- No GUEST references remain in admin UI page
- ASSUMPTIONS.md correctly reflects self-registration-only model
- Existing guest self-registration flow (app/api/register/route.ts) is unaffected (not modified)

## Self-Check: PASSED
