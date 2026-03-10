# Phase 13 Context: Guest Registration & Guest List

**Created:** 2026-03-09
**Phase goal:** External users can self-register as guests for a faculty, coordinators are notified and can see who registered

## Prior Decisions (locked)

- `mustChangePassword: false` for self-registered guests (they chose their own password)
- GUEST role hardcoded server-side — NEVER read from request body (Pitfall 6)
- Faculty validated server-side via `prisma.faculty.findUnique()` (Pitfall 3)
- Fire-and-forget email pattern with `.catch(console.error)` (established Phase 12)
- Separate public registration API — `api/auth/[...all]/route.ts` blocks general signup
- Use `auth.api.signUpEmail` + `prisma.user.update` pattern (same as admin create-user)
- Guest list follows coordinator faculty-scoping pattern (Pitfall 12)

## Area 1: Registration Page Experience

### Decisions

- **Route:** `/register` under the `(auth)` route group — same group as sign-in and change-password
- **Sign-in link:** Yes — add a "Register as Guest" link below the sign-in form
- **Post-registration flow:** Show success message, redirect to sign-in page (guest logs in manually). No auto-sign-in.
- **Email uniqueness:** Debounced check on blur — call a lightweight endpoint to check if email is taken before form submission. Still enforce server-side 409 as defense in depth.

### Code Context

- Sign-in page at `app/(auth)/sign-in/page.tsx` — reuse Card/Form/Input pattern, add link to `/register`
- Registration page at `app/(auth)/register/page.tsx` — new client component
- Registration API at `app/api/register/route.ts` — public endpoint, no auth required
- Email check API — lightweight GET endpoint for debounced uniqueness validation
- Faculty dropdown populated from existing `GET /api/faculties` endpoint
- Form fields: name, email, password, confirm password, faculty select (required)

## Area 2: Coordinator Notification Content

### Decisions

- **Recipients:** All coordinators assigned to the guest's selected faculty
- **Email content:** Guest name, email, faculty name, registration date, and link to guest list page
- **Subject line:** Specific — "New guest registration: [Guest Name] — [Faculty Name]"
- **No coordinator found:** Silently skip — registration succeeds, no email sent, no error logged
- **Pattern:** Fire-and-forget with `.catch(console.error)`, same as selection notification

### Code Context

- Query coordinators: `prisma.user.findMany({ where: { role: "MARKETING_COORDINATOR", facultyId } })`
- Send to all coordinator emails in a single `sendMail({ to: [...emails] })` call
- Mailer at `lib/mailer.ts` already supports `to: string | string[]`

## Area 3: Guest List Page Placement and Layout

### Decisions

- **Navigation:** New sidebar item "Guest List" for MARKETING_COORDINATOR role, dedicated icon (Users or similar), below existing coordinator nav items
- **Columns:** Name, email, registration date, faculty badge — minimal read-only table
- **Pagination:** Yes, from day one — consistent with audit log, user management, submissions tables. Use existing server-side `page/pageSize` + `skip/take` pattern.
- **Search:** Basic search by name/email — filter applied to the query

### Code Context

- Sidebar: Add entry to `MARKETING_COORDINATOR` case in `buildPages()` at `components/app-sidebar.tsx`
- Guest list page at `app/(portal)/coordinator/guests/page.tsx` — server or client component with table
- Guest list API at `app/api/coordinator/guests/route.ts` — faculty-scoped, paginated
- Faculty scoping pattern: Copy from `app/api/coordinator/submissions/[id]/route.ts` lines 28-38
- Pagination pattern: Copy from `app/api/admin/users/route.ts` (page/pageSize/skip/take + parallel count)
- Search: `where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }`

## Deferred Ideas

None captured.

---
*Context created: 2026-03-09*
*Ready for: /gsd:plan-phase 13*
