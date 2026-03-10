# Project Research Summary

**Project:** University Magazine System v1.1 -- Security, Audit & Guest Self-Registration
**Domain:** University CMS with role-based access, editorial workflow, and admin analytics
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

This milestone adds six features to an existing, production-stable Next.js 16 / Prisma 7 / Better Auth university magazine system: audit logging for coordinator selection changes, first-login forced password change, last login tracking, admin analytics dashboard (active users, browser usage, page views), guest self-registration with coordinator notification, and a coordinator faculty-scoped guest list. Research across all four dimensions confirms that every feature maps onto patterns already proven in the v1.0 codebase. The total new dependency footprint is two runtime packages (`recharts`, `ua-parser-js`) and one dev type package. Everything else uses the existing stack -- Better Auth hooks, Prisma models, Nodemailer, layout-level auth guards, and raw SQL aggregation.

The recommended approach is schema-first development: a single Prisma migration adds two new models (`AuditLog`, `PageView`) and two new fields on `User` (`mustChangePassword`, `lastLoginAt`), unlocking all six features. From there, build security features first (password change gate, login tracking), then audit logging, then guest registration with its companion coordinator list, and analytics last. This order prioritizes security hardening and data integrity before adding new public surface area or complex read-only reporting.

The primary risks are concentrated in two areas. First, the forced password change feature is the only one that can be silently bypassed if implementation is incomplete -- the gate must be enforced in both portal and guest layouts AND in the `requireRole()` helper for API routes, not just in the sign-in redirect. Second, the guest self-registration endpoint is the system's first public-facing write endpoint, which introduces role escalation risk (attacker submitting `role: ADMIN` in request body) and faculty scoping risk (guests with null or wrong `facultyId`). Both risks have clear, concrete prevention strategies documented in PITFALLS.md.

## Key Findings

### Recommended Stack

The existing stack handles nearly everything. Only two runtime packages are needed: `recharts` (for admin analytics charts, aligned with shadcn/ui's chart component) and `ua-parser-js` (for browser usage parsing from User-Agent strings). No new infrastructure, environment variables, or external services are required.

**Core technologies (new additions only):**
- `recharts ^2.15`: Analytics charts -- shadcn/ui's official chart component is built on Recharts; SVG-based, React 19 compatible
- `ua-parser-js ^2.0`: Browser usage reports -- lightweight UA parser, server-side only at report generation time
- `@types/ua-parser-js` (dev): TypeScript types for ua-parser-js

**What NOT to add:** No audit logging library (simple Prisma model suffices), no external analytics service (internal PageView table), no Better Auth plugins (none exist for forced password change; lastLoginMethod plugin tracks method not timestamp), no middleware (layout guards are the correct pattern), no Redis or caching layer (university-scale volume).

**Version caveat:** Recharts and ua-parser-js versions are from training data (cutoff May 2025). Verify with `npm view <pkg> version` before installing.

### Expected Features

**Must have (table stakes):**
- Audit log for coordinator selection changes -- accountability trail for who selected/deselected what
- First-login forced password change -- admin-created accounts must not persist temporary passwords
- Last login timestamp with welcome message -- basic security hygiene for university portal
- Coordinator faculty-scoped guest list -- visibility into who has guest access to their faculty

**Should have (differentiators):**
- Admin analytics dashboard (active users, browser usage, page views) -- usage visibility beyond content reports
- Guest self-registration with coordinator notification -- reduces admin burden for external stakeholder access

**Defer (v2+):**
- Full audit trail for ALL actions (v1.1 is selection changes only; model is extensible)
- Guest approval workflow (auto-approve with ban fallback is sufficient)
- Real-time analytics dashboard (no WebSocket/SSE per project constraints)
- Coordinator guest account management (read-only list; admin handles user management)
- Password complexity policy engine (Zod min-length validation is sufficient)

### Architecture Approach

All six features integrate into the existing layered architecture without disrupting component boundaries. The patterns are additive: a new `lib/audit.ts` helper for audit writes, session hook extension for login tracking, layout guard extension for password change enforcement, a `PageViewTracker` client component for analytics collection, and new API routes that follow the established coordinator/admin route patterns. Schema changes are consolidated into a single migration. The key architectural decision is fire-and-forget for non-critical writes (audit logs, page views, emails) to avoid blocking the hot path.

**Major components:**
1. `AuditLog` model + `lib/audit.ts` helper -- append-only selection change history, called from coordinator PATCH route
2. `User.mustChangePassword` + layout guards + `/change-password` page -- first-login security gate enforced server-side
3. `User.lastLoginAt` + `databaseHooks.session.create.after` -- login tracking piggybacking on existing hook infrastructure
4. `PageView` model + `PageViewTracker` component + analytics API -- page view collection and aggregation with Recharts visualization
5. Guest registration page + API + coordinator email notification -- public registration endpoint with hardcoded GUEST role
6. Coordinator guest list API + page -- faculty-scoped read-only query reusing existing pagination patterns

### Critical Pitfalls

1. **Password change bypass via direct URL navigation** -- The gate must be enforced in BOTH `(portal)/layout.tsx` AND `(guest)/layout.tsx` AND in `requireRole()` for API routes. Checking only at sign-in redirect is insufficient because users can navigate directly to any URL.

2. **Guest registration role escalation** -- The registration API must NEVER read `role` from the request body. Hardcode `role: "GUEST"` server-side. The admin create-user route reads role from the body; copying that pattern into the public endpoint is a privilege escalation vulnerability.

3. **Guest accounts with null or wrong facultyId** -- Faculty selection must be required and server-validated. Self-registration inverts the trust model from admin-assigned to user-chosen faculty. A guest with null `facultyId` breaks the faculty-scoping invariant the entire system relies on.

4. **Login tracking in wrong session hook** -- Use `session.create.after`, not `before`. The `before` hook runs even when session creation is subsequently blocked (e.g., banned users). Updating `lastLoginAt` in `before` produces false login records.

5. **PageView table unbounded growth** -- Raw page views grow with ALL user sessions, not just coordinator actions. Index `createdAt` and `userId`, implement daily aggregation for reports, and add a retention policy for raw events older than 30 days.

## Implications for Roadmap

Based on combined research, the natural structure is five phases driven by schema dependencies, security priority, and feature isolation.

### Phase 1: Schema Migration

**Rationale:** Every feature depends on new models or fields. A single migration upfront avoids mid-development schema changes and validates the data model before any feature code is written.
**Delivers:** Complete schema with `AuditLog` model, `PageView` model, `User.mustChangePassword` (default false), and `User.lastLoginAt` fields. Single `prisma migrate dev` run.
**Addresses:** Foundation for all six features.
**Avoids:** Pitfall 7 (mustChangePassword default must be `false` so existing users are unaffected; admin create-user route explicitly sets `true`).

### Phase 2: Security Hardening -- Password Change & Login Tracking

**Rationale:** Security features should ship before adding new public surface area (guest registration). The forced password change affects the admin create-user flow used daily, so it must be correct early. Login tracking is small and isolated, pairs naturally with the auth flow changes.
**Delivers:** `/change-password` page and API, layout guards in both portal and guest layouts, `requireRole()` enforcement, `lastLoginAt` update in session hook, welcome message display.
**Addresses:** First-login forced password change (table stakes), last login tracking (table stakes).
**Avoids:** Pitfall 1 (bypass via direct navigation -- enforce in layouts + requireRole), Pitfall 4 (wrong hook -- use `session.create.after`), Pitfall 11 (null lastLoginAt -- conditional "first login" message).

### Phase 3: Audit Logging

**Rationale:** Modifies the critical coordinator selection endpoint. Should be isolated from other changes to that route. The admin audit viewer is a standalone read-only page with no dependencies on other v1.1 features.
**Delivers:** `lib/audit.ts` helper, audit write in coordinator PATCH route (fire-and-forget after successful update), admin audit log viewer page with pagination and filters.
**Addresses:** Audit log for selection changes (table stakes).
**Avoids:** Pitfall 2 (Neon latency -- fire-and-forget, no transaction wrapping), Pitfall 5 (N+1 on admin view -- Prisma includes with pagination), Pitfall 13 (enum drift -- derive action from actual state change, not request body).

### Phase 4: Guest Self-Registration & Coordinator Guest List

**Rationale:** Guest registration is the system's first public write endpoint. It depends on the password change infrastructure (to correctly set `mustChangePassword: false` for self-registered users). The coordinator guest list is its natural companion -- an empty list before registration exists provides no value.
**Delivers:** Public `/guest-register` page in `(auth)` route group, registration API with hardcoded GUEST role and faculty validation, coordinator email notification, coordinator guest list page with faculty scoping.
**Addresses:** Guest self-registration (differentiator), coordinator guest list (table stakes).
**Avoids:** Pitfall 3 (wrong-faculty accounts -- validate facultyId exists), Pitfall 6 (role escalation -- hardcode GUEST server-side), Pitfall 8 (Gmail SMTP limits -- fire-and-forget with clear error logging), Pitfall 12 (missing faculty scope on guest list -- copy coordinator submissions scoping pattern), Pitfall 14 (missing email uniqueness check -- debounced client-side check + server-side enforcement).

### Phase 5: Admin Analytics Dashboard

**Rationale:** Purely additive, read-only feature with no dependencies on other v1.1 features. Most complex feature in the milestone. Can be deferred or simplified without affecting other deliverables. If time-constrained, session-based analytics (active users + browser stats) can ship without PageView tracking, cutting complexity roughly in half.
**Delivers:** `PageViewTracker` client component, page view collection API, analytics dashboard with Recharts charts (active users over time, browser breakdown, top pages, login frequency).
**Addresses:** Admin analytics dashboard (differentiator).
**Avoids:** Pitfall 9 (unbounded PageView growth -- daily aggregation + retention policy), Pitfall 10 (UA parsing failures -- use ua-parser-js library, filter bots, group unknowns as "Other"), Pitfall 15 (tracking unauthenticated pages -- place tracker in portal/guest layouts only, not root layout).
**Uses:** `recharts`, `ua-parser-js` (only phase requiring new npm packages).

### Phase Ordering Rationale

- Schema first because every feature touches it and migration mid-development risks data integrity issues.
- Security features second because they affect the daily admin workflow (create-user sets mustChangePassword flag) and must be correct before adding public endpoints.
- Audit logging third because it modifies the coordinator selection endpoint -- an existing critical path that should be changed in isolation.
- Guest registration fourth because it is the first public write endpoint and depends on password change infrastructure being correct.
- Analytics last because it is fully independent, purely read-only, and the most complex feature -- natural candidate for scope reduction if the timeline is tight.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (Analytics):** Recharts integration with shadcn/ui chart components, PageView aggregation query patterns, ua-parser-js API for server-side parsing. Most novel code in the milestone.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Schema):** Standard Prisma migration. No unknowns.
- **Phase 2 (Security):** Layout redirect pattern already proven in v1.0. Better Auth `changePassword` API and `session.create.after` hook verified in source.
- **Phase 3 (Audit):** Append-only model with fire-and-forget write. Proven Prisma patterns.
- **Phase 4 (Guest Registration):** Directly mirrors existing admin create-user flow. Nodemailer infrastructure already working.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 2 new packages. All other patterns verified against existing codebase. Recharts/ua-parser-js versions need npm verification. |
| Features | HIGH | Feature set derived from codebase analysis and university CMS domain expertise. Table stakes vs differentiators clearly separated. Anti-features explicitly scoped. |
| Architecture | HIGH | All patterns are additive extensions of existing v1.0 architecture. No new infrastructure, no architectural changes, no pattern deviations. |
| Pitfalls | HIGH | 15 specific pitfalls identified from direct codebase analysis with line-number references. Prevention strategies are implementation-ready. |

**Overall confidence: HIGH**

### Gaps to Address

- **Recharts and ua-parser-js versions:** Training data versions (^2.15 and ^2.0 respectively) need verification via `npm view` before installing. Library existence and purpose are high confidence; exact versions are medium.

- **Audit log transaction vs fire-and-forget:** STACK.md recommends `$transaction` wrapping audit + update; ARCHITECTURE.md and PITFALLS.md recommend fire-and-forget after successful update to avoid Neon latency doubling. Recommendation: follow PITFALLS.md guidance (fire-and-forget) because audit integrity is less critical than coordinator UX responsiveness. A missed audit entry is preferable to a sluggish selection toggle.

- **PageView tracking scope:** ARCHITECTURE.md suggests deferring PageView tracking entirely and using Session-based analytics only. FEATURES.md and STACK.md include PageView as part of the analytics feature. Recommendation: build PageView tracking but make it the last sub-feature of Phase 5, so it can be dropped if timeline is tight. Session-based active users and browser stats deliver meaningful value without it.

- **Better Auth `session.create.after` hook:** The `before` hook is verified in production code. The `after` hook is consistent with Better Auth's documented hook pattern but has not been tested in this codebase. Verify during Phase 2 implementation.

- **`mustChangePassword` default value:** STACK.md says `@default(true)`, FEATURES.md says `@default(false)`, PITFALLS.md explicitly warns about using `@default(true)` because it would force existing users to change passwords. Recommendation: use `@default(false)` in the schema migration, and explicitly set `true` in the admin create-user endpoint. This is the safe choice.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` (2026-03-09) -- Stack additions, schema changes, integration points, version requirements
- `.planning/research/FEATURES.md` (2026-03-09) -- Feature classification, dependency map, complexity estimates, MVP priority order
- `.planning/research/ARCHITECTURE.md` (2026-03-09) -- Component boundaries, data flows, patterns/anti-patterns, build order, route inventory
- `.planning/research/PITFALLS.md` (2026-03-09) -- 15 pitfalls (4 critical, 8 moderate, 3 minor) with detection and prevention strategies

### Secondary (MEDIUM confidence)
- Existing codebase (`lib/auth.ts`, `prisma/schema.prisma`, `app/api/admin/create-user/route.ts`, `app/(portal)/layout.tsx`) -- verified patterns referenced across all research files
- Better Auth source (`node_modules/better-auth/dist/plugins/`) -- plugin availability and hook API verified

### Tertiary (LOW confidence)
- Recharts ^2.15 and ua-parser-js ^2.0 version numbers -- from training data (May 2025 cutoff); verify before installing

---

*Research completed: 2026-03-09*
*Ready for roadmap: yes*
