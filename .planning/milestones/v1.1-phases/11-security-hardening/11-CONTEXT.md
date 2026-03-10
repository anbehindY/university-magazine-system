# Phase 11: Security Hardening - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users with temporary passwords are forced to change them before accessing any feature, and all users see when they last logged in. Three enforcement points (portal layout, guest layout, API route helper) ensure no bypass. Welcome message shows last login on a persistent dashboard card.

</domain>

<decisions>
## Implementation Decisions

### Password change page behavior
- **Fields:** New password + Confirm password only (no current password field — user just authenticated, session proves identity)
- **No sign-out option** on the password change page — if the user closes the browser or fails, they hit the gate again on next login
- **Validation:** Minimal — 8+ characters, passwords must match
- **Context message:** Show a clear explanation, e.g., "Your administrator has set a temporary password. Please choose a new password to continue." — good UX with instructions

### Password change page location
- Lives in the `(auth)` route group alongside `sign-in` — outside both `(portal)` and `(guest)` groups so the gate doesn't create a redirect loop
- Route: `/change-password`

### Three enforcement points (from Pitfall 1)
1. **Portal layout** (`app/(portal)/layout.tsx`) — if `user.mustChangePassword === true`, redirect to `/change-password`
2. **Guest layout** (`app/(guest)/layout.tsx`) — same check and redirect
3. **API route helper** (`lib/auth-helpers.ts:requireRole()`) — return 403 if `mustChangePassword` is true
4. **Exception:** The password change API endpoint itself is exempt from this check

### Post-password-change flow
- **Session continues** — `mustChangePassword` is set to false server-side, no re-authentication required
- **Brief success state** on the change-password page (e.g., "Password changed successfully"), then auto-redirect after 2-3 seconds
- **Redirect destination:** Dashboard/home page (portal for regular roles, `/guest` for GUEST role)
- **On API failure:** Show inline error on the form, let user retry (no toast, no form reset)

### Welcome message (last login display)
- **Placement:** Persistent banner/card on the dashboard page (not a toast, not in the header)
- **Format:** "Welcome back, [Name]! Last login: 5 March 2026, 2:30 PM" with absolute timestamp
- **First login (null lastLoginAt):** Just "Welcome, [Name]!" — no mention of login history
- **Frequency:** Shows on every login — Claude decides whether to persist across navigation or show only on first dashboard load per session

### Login tracking (from Pitfall 4)
- Use `databaseHooks.session.create.after` hook (NOT `before`) — fires only after successful session creation
- Banned/blocked login attempts do NOT update `lastLoginAt`
- Fire-and-forget `prisma.user.update()` — same pattern as email notifications

### Claude's Discretion
- Welcome card component design and styling
- Whether welcome card persists across navigation or only shows on initial dashboard load
- Password change API endpoint structure (standalone route or Better Auth extension)
- Exact error message wording for validation failures
- Whether to use Better Auth's built-in password change or custom Prisma update
- Animation/transition for the auto-redirect after password change

</decisions>

<specifics>
## Specific Ideas

- Context message on password change page with clear instructions about why they're there
- Brief success state with auto-redirect (2-3 second delay) gives user confidence the change worked
- Inline form errors for failed attempts rather than toast notifications

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/auth.ts`: Better Auth config with `databaseHooks.session.create.before` — add `.after` hook for login tracking
- `lib/auth-helpers.ts`: `requireRole()` and `getCurrentUser()` — add mustChangePassword check to requireRole
- `app/(portal)/layout.tsx`: Server component calling `getCurrentUser()` — add redirect check
- `app/(guest)/layout.tsx`: Server component calling `getCurrentUser()` — add redirect check
- `app/(auth)/sign-in/page.tsx`: Existing auth page pattern to follow for change-password page
- `lib/auth-client.ts`: Client-side auth exports (`signIn`, `signOut`, `useSession`)

### Established Patterns
- Toast notifications via existing toast system (used for admin actions in v1.0)
- Server-side redirects in layouts via `redirect()` from next/navigation
- Client-side `router.push()` for post-action navigation
- Fire-and-forget with `.catch(console.error)` for non-critical writes

### Integration Points
- `lib/auth.ts` line 13-26: Add `session.create.after` hook alongside existing `before` hook
- `lib/auth-helpers.ts:requireRole()`: Add `mustChangePassword` check before role validation
- `app/(portal)/layout.tsx` line 15-19: Add mustChangePassword redirect after getCurrentUser()
- `app/(guest)/layout.tsx` line 12: Add mustChangePassword redirect after getCurrentUser()
- `prisma/schema.prisma`: User model already has `mustChangePassword` and `lastLoginAt` fields (Phase 10)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-security-hardening*
*Context gathered: 2026-03-09*
