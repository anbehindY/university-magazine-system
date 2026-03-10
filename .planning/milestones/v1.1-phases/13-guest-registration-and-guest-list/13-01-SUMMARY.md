---
phase: 13-guest-registration-and-guest-list
plan: 01
subsystem: auth
tags: [registration, guest, better-auth, react-hook-form, zod, email-notification]

# Dependency graph
requires:
  - phase: 10-schema-migration
    provides: User model with mustChangePassword field, GUEST role
  - phase: 12-audit-logging
    provides: Fire-and-forget email notification pattern via sendMail
provides:
  - POST /api/register endpoint for guest self-registration
  - GET /api/register/check-email endpoint for email uniqueness check
  - Guest registration form page at /register
  - Sign-in page "Register as Guest" link
affects: [13-02-guest-list, guest-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public write endpoint with hardcoded role (security pattern)"
    - "Debounced email uniqueness check on blur + server-side 409 defense in depth"

key-files:
  created:
    - app/api/register/route.ts
    - app/api/register/check-email/route.ts
    - app/(auth)/register/page.tsx
  modified:
    - app/(auth)/sign-in/page.tsx

key-decisions:
  - "GUEST role hardcoded server-side, never read from request body"
  - "mustChangePassword: false for self-registered guests (chose own password)"
  - "Fire-and-forget coordinator email notification with .catch(console.error)"
  - "Redirect to sign-in after registration (no auto-sign-in)"

patterns-established:
  - "Public registration endpoint: auth.api.signUpEmail + prisma.user.update with hardcoded role"
  - "Debounced email check: client blur handler + lightweight GET endpoint"

requirements-completed: [GUEST-01, GUEST-02, GUEST-03, GUEST-04]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 13 Plan 01: Guest Registration Summary

**Public guest self-registration with hardcoded GUEST role, faculty validation, debounced email check, and fire-and-forget coordinator notification**

## Performance

- **Duration:** 2 min 26s
- **Started:** 2026-03-09T15:29:43Z
- **Completed:** 2026-03-09T15:32:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- POST /api/register creates a GUEST account with hardcoded role, validates faculty exists, checks email uniqueness (409), and sends coordinator notification fire-and-forget
- GET /api/register/check-email provides lightweight email availability check for debounced client-side validation
- Registration page with full form (name, email, password, confirm password, faculty select), zod validation with password match refine, and inline email availability feedback
- Sign-in page now links to guest registration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create registration API and email check endpoint** - `73561fe` (feat)
2. **Task 2: Create registration page and add sign-in link** - `8295bcc` (feat)

## Files Created/Modified
- `app/api/register/route.ts` - POST endpoint for guest self-registration with hardcoded GUEST role
- `app/api/register/check-email/route.ts` - GET endpoint for debounced email uniqueness check
- `app/(auth)/register/page.tsx` - Guest registration form with zod validation and faculty select
- `app/(auth)/sign-in/page.tsx` - Added "Register as Guest" link below sign-in form

## Decisions Made
- GUEST role hardcoded in prisma.user.update -- never destructured or read from request body (security: first public write endpoint)
- mustChangePassword set to false since guest chose their own password
- Fire-and-forget coordinator email notification: sendMail().catch(console.error) -- no await
- Post-registration redirects to /sign-in with toast (no auto-sign-in)
- Debounced email check on blur (500ms) as UX enhancement, with server-side 409 as defense in depth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Registration flow complete, ready for Plan 02 (guest list page and coordinator sidebar entry)
- All GUEST-01 through GUEST-04 requirements satisfied

## Self-Check: PASSED

All 4 files verified on disk. Both task commits (73561fe, 8295bcc) verified in git log.

---
*Phase: 13-guest-registration-and-guest-list*
*Completed: 2026-03-09*
