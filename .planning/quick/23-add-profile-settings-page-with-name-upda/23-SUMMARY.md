---
phase: quick-23
plan: 01
subsystem: profile-settings
tags: [profile, settings, password-change, navigation]
dependency_graph:
  requires: [auth-helpers, prisma, better-auth-crypto]
  provides: [profile-api, profile-page, guest-profile-page]
  affects: [app-sidebar, guest-header]
tech_stack:
  added: []
  patterns: [react-hook-form-zod, fetch-api-route, toast-feedback]
key_files:
  created:
    - app/api/profile/route.ts
    - app/(portal)/profile/page.tsx
    - app/(guest)/guest/profile/page.tsx
  modified:
    - components/app-sidebar.tsx
    - app/(guest)/guest/_components/guest-header.tsx
decisions:
  - Fetch facultyId from DB user record since session type does not include it
  - Duplicate profile page for portal/guest route groups rather than shared component
metrics:
  duration: 188s
  completed: "2026-03-10T14:30:15Z"
---

# Quick Task 23: Add Profile Settings Page with Name Update and Password Change

Profile API with GET/PUT/POST handlers plus portal and guest profile pages with name update and current-password-verified password change.

## Task Summary

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create profile API route | 1760aac | app/api/profile/route.ts |
| 2 | Create profile pages and navigation | fb3eb00 | app/(portal)/profile/page.tsx, app/(guest)/guest/profile/page.tsx, components/app-sidebar.tsx, app/(guest)/guest/_components/guest-header.tsx |

## What Was Built

### Profile API Route (`/api/profile`)
- **GET**: Returns user profile (name, email, role, faculty name) with DB lookup for faculty
- **PUT**: Updates display name with zod validation (min 1, max 100 chars)
- **POST**: Changes password requiring current password verification via `better-auth/crypto` verifyPassword, then hashes new password

### Portal Profile Page (`/profile`)
- Two-card layout: Profile Information (read-only email/role/faculty + editable name) and Change Password
- react-hook-form with zod validation, toast notifications on success/error
- Loading spinner while fetching profile data

### Guest Profile Page (`/guest/profile`)
- Identical functionality to portal profile page
- Wrapped in guest-appropriate container styling

### Navigation Updates
- **Sidebar**: "Settings" link with Settings icon added to ADMINISTRATOR, MARKETING_COORDINATOR, MARKETING_MANAGER, and STUDENT role arrays
- **Guest Header**: "Profile" link added between user name and sign-out button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed facultyId access on session user type**
- **Found during:** Task 1
- **Issue:** `getCurrentUser()` returns a better-auth session user type that does not include `facultyId`
- **Fix:** Fetch full user record from Prisma with faculty relation instead of accessing `user.facultyId` directly
- **Files modified:** app/api/profile/route.ts
- **Commit:** 1760aac

## Verification

- TypeScript compiles without errors (`npx tsc --noEmit` clean)
- All portal roles have Settings sidebar link
- Guest header has Profile link
- API handles auth, validation, and password verification correctly

## Self-Check: PASSED

All 5 files verified on disk. Both commits (1760aac, fb3eb00) confirmed in git log.
