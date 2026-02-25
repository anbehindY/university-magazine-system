# CONCERNS.md

## Summary

Active concerns ranked by severity. This codebase is early-stage (submission phase just added). Core functionality works but has significant tech debt in page size, security gaps, and zero test coverage.

---

## High Severity

### 1. Zero Test Coverage
**Risk:** High — Any regression is invisible
- No unit, integration, or E2E tests
- Critical paths (submission flow, auth, role enforcement) completely untested
- `app/(student)/submissions/page.tsx` is 1,126 lines with complex state — high regression risk

### 2. No Rate Limiting
**Risk:** High — API abuse vector
- All API routes (`/api/admin/create-user`, `/api/submissions`, etc.) have no rate limiting
- Auth endpoints (email/password login) vulnerable to brute force
- No middleware-level protection

### 3. JSON.parse Without Error Handling
**Risk:** Medium-High — Runtime crash on malformed data
- `app/api/submissions/upload/route.ts:32` — `JSON.parse(clientPayload)` in `onBeforeGenerateToken`
  - Wrapped in broader try/catch, but error message leaks to client
- `app/(student)/submissions/page.tsx` — localStorage draft parsing could throw if data is corrupt

### 4. No CSRF Protection
**Risk:** Medium-High — State-changing endpoints exposed
- API routes use JSON bodies (not form submissions), which provides some protection
- But no explicit CSRF tokens implemented
- Better-Auth may handle some CSRF, but not verified

---

## Medium Severity

### 5. Oversized Page Components
**Risk:** Medium — Maintainability and performance
- `app/(student)/submissions/page.tsx` — **1,126 lines** in a single client component
  - 20+ useState hooks scattered throughout
  - Draft storage, file upload, submission CRUD, closure date logic all in one file
- `app/(management)/users/page.tsx` — **827 lines** with duplicated create/edit form logic

### 6. N+1 Query Risk
**Risk:** Medium — Performance at scale
- `app/api/submissions/route.ts` — fetches submissions with `include: { files: { orderBy } }`
  - Currently OK but no pagination — full table scan as submissions grow
- `app/api/admin/users/route.ts` — likely fetches all users without pagination

### 7. No Pagination on List Endpoints
**Risk:** Medium — Performance degradation over time
- Submissions list returns all user submissions
- Users list returns all users
- No `take`/`skip` or cursor-based pagination implemented

### 8. localStorage Draft Storage
**Risk:** Low-Medium — Data integrity
- `app/(student)/submissions/page.tsx:30` — `DRAFT_STORAGE_KEY = "studentSubmissionDraft"`
- Draft state persisted in localStorage, not in database
- Multiple browser tabs or devices will have inconsistent draft state
- If localStorage is cleared, draft is lost (but DB record may still exist)

### 9. Duplicated Role Check Logic
**Risk:** Low-Medium — Maintenance burden
- Client-side role checks duplicated between pages:
  - `users/page.tsx:120` — `session.user.role !== "ADMINISTRATOR"`
  - Similar checks in other management pages
- Auth-helpers exist on server side (`lib/auth-helpers.ts`) but client pages re-implement checks
- No shared client-side role guard component/hook

---

## Low Severity

### 10. Race Condition in Session Deletion (Better-Auth)
**Risk:** Low — Edge case
- `lib/auth.ts` — `databaseHooks.session.create.before` checks `user.banned`
- If user is banned mid-session, existing sessions remain valid until expiry
- No session invalidation on ban (Better-Auth may handle this via admin plugin, unverified)

### 11. Generic Error Messages in API Routes
**Risk:** Low — User experience
- Most catch blocks return `"Internal server error"` with no actionable detail
- Errors are logged with `console.error` but not structured
- No error tracking service integrated (no Sentry, etc.)

### 12. Vercel Blob Token Payload Trust
**Risk:** Low — Minor security
- `app/api/submissions/upload/route.ts:66` — `JSON.parse(tokenPayload)` on upload completion
  - No validation that `tokenPayload` matches expected shape
  - If `submissionId` is missing, silently returns without creating file record

### 13. Missing Migration Names
**Risk:** Low — Operational
- Migrations `20260217160034` and `20260220010502` have no descriptive names
- Makes it hard to understand migration history at a glance

---

## Tech Debt

| Item | Location | Impact |
|------|----------|--------|
| Mega-component submissions page | `app/(student)/submissions/page.tsx` | High |
| Mega-component users page | `app/(management)/users/page.tsx` | Medium |
| No pagination on list APIs | `app/api/submissions/route.ts`, `app/api/admin/users/route.ts` | Medium |
| Duplicated client-side role guards | Multiple page files | Low |
| Console-only logging | Throughout API routes | Low |
| No input validation library (zod etc) | API routes | Low |

---

## Security Checklist

| Control | Status |
|---------|--------|
| Authentication on API routes | ✅ Via `auth.api.getSession` |
| Authorization (role checks) | ✅ Admin routes check role |
| Input validation | Partial — basic checks only |
| Rate limiting | ❌ Missing |
| CSRF protection | Partial — JSON body helps, no tokens |
| SQL injection | ✅ Prisma parameterizes queries |
| XSS | ✅ React escapes by default |
| File type validation | Partial — MIME + extension check |
| Audit logging | ❌ Missing |
| Password hashing | ✅ Better-Auth handles |
