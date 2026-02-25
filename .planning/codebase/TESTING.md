# TESTING.md

## Status: No Tests

**Zero test files exist in this codebase.** No testing framework is installed.

---

## Current State

| Area | Status |
|------|--------|
| Unit tests | None |
| Integration tests | None |
| E2E tests | None |
| Test framework | Not installed |
| Test runner | Not configured |
| CI test step | Unknown |

No `*.test.ts`, `*.spec.ts`, `__tests__/` or similar test files were found.

No testing dependencies in `package.json` (no Jest, Vitest, Playwright, Cypress, etc.).

---

## Critical Untested Paths

High-risk areas with no test coverage:

### API Routes
- `app/api/submissions/route.ts` — Full CRUD for submissions
- `app/api/submissions/upload/route.ts` — Vercel Blob token generation
- `app/api/admin/users/route.ts` — User management (ban/unban, role changes)
- `app/api/admin/create-user/route.ts` — User creation

### Auth
- Session lifecycle (ban check on session create hook in `lib/auth.ts`)
- Role-based access enforcement in API routes
- `lib/auth-helpers.ts` — `getCurrentUser`, `requireRole`

### Business Logic
- Submission status transitions (DRAFT → SUBMITTED, cannot delete SUBMITTED)
- File upload validation (MIME type checking in `app/(student)/submissions/page.tsx`)
- Academic year closure date enforcement

---

## Recommended Testing Approach

If adding tests to this project:

### Framework
**Vitest** (recommended for Next.js + TypeScript):
```bash
pnpm add -D vitest @vitejs/plugin-react
```

### E2E
**Playwright** for user flow testing:
```bash
pnpm add -D @playwright/test
```

### Test Structure
```
__tests__/
├── api/
│   ├── submissions.test.ts
│   └── admin/users.test.ts
├── lib/
│   └── auth-helpers.test.ts
└── components/
    └── ...
e2e/
├── auth.spec.ts
└── submissions.spec.ts
```

### Mocking
- Mock `@/lib/prisma` for unit tests
- Mock `@/lib/auth` for API route tests (mock `auth.api.getSession`)
- Use MSW or fetch mocking for client-side tests

---

## Notes

Given zero test coverage, the most impactful tests to add first would be:
1. API route integration tests (auth enforcement, CRUD correctness)
2. Submission state machine (DRAFT/SUBMITTED transitions)
3. Role authorization checks
