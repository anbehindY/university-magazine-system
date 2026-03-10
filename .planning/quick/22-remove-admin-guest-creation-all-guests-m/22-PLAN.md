---
phase: quick-22
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/admin/create-user/route.ts
  - app/api/admin/users/route.ts
  - app/(portal)/admin/users/page.tsx
  - docs/ASSUMPTIONS.md
autonomous: true
requirements: [QUICK-22]
must_haves:
  truths:
    - "Admin create-user API rejects GUEST role with a clear error message"
    - "Admin create-user form does not show GUEST as a role option"
    - "Admin edit-user form does not show GUEST as a role option"
    - "Admin edit-user API rejects attempts to change a user's role to GUEST"
    - "ASSUMPTIONS.md no longer states that admin creates guest accounts"
  artifacts:
    - path: "app/api/admin/create-user/route.ts"
      provides: "GUEST excluded from VALID_ROLES"
    - path: "app/api/admin/users/route.ts"
      provides: "GUEST excluded from VALID_ROLES for PATCH"
    - path: "app/(portal)/admin/users/page.tsx"
      provides: "GUEST removed from both create and edit role selects"
    - path: "docs/ASSUMPTIONS.md"
      provides: "Updated assumption about guest registration"
  key_links:
    - from: "app/api/admin/create-user/route.ts"
      to: "VALID_ROLES"
      via: "role validation"
      pattern: "VALID_ROLES.*GUEST"
---

<objective>
Remove the ability for administrators to create or assign GUEST role users. All guests must self-register through the public registration page. Update both the API (server-side enforcement) and UI (remove GUEST from dropdowns), plus update documentation.

Purpose: Enforce that guest accounts are exclusively self-registered, simplifying admin workflows and matching the intended guest self-registration model.
Output: Modified API routes, updated admin UI, and corrected documentation.
</objective>

<context>
@app/api/admin/create-user/route.ts
@app/api/admin/users/route.ts
@app/(portal)/admin/users/page.tsx
@docs/ASSUMPTIONS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove GUEST from admin API endpoints</name>
  <files>app/api/admin/create-user/route.ts, app/api/admin/users/route.ts</files>
  <action>
In `app/api/admin/create-user/route.ts`:
- Remove "GUEST" from the VALID_ROLES array (line 11). The array should only contain: "MARKETING_MANAGER", "MARKETING_COORDINATOR", "STUDENT", "ADMINISTRATOR".
- Update the faculty validation check (lines 60-69) to remove the `role === "GUEST"` condition since GUEST is no longer a valid admin-created role. Only MARKETING_COORDINATOR and STUDENT need facultyId.

In `app/api/admin/users/route.ts`:
- Remove "GUEST" from the VALID_ROLES array (line 11) so it matches: "MARKETING_MANAGER", "MARKETING_COORDINATOR", "STUDENT", "ADMINISTRATOR".
- Update the faculty validation check in the PATCH handler (lines 178-188) to remove the `role === "GUEST"` condition. Only MARKETING_COORDINATOR and STUDENT need facultyId.

This ensures server-side enforcement: any attempt to create or edit a user with GUEST role via admin APIs will be rejected because parseRole() will return null for "GUEST", causing the 400 validation error.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Both admin API routes reject GUEST as a valid role. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Remove GUEST from admin UI role selectors and update docs</name>
  <files>app/(portal)/admin/users/page.tsx, docs/ASSUMPTIONS.md</files>
  <action>
In `app/(portal)/admin/users/page.tsx`:
- Remove the GUEST SelectItem from the create-user dialog role select (lines 505-507: the SelectItem with value="GUEST").
- Remove the associated role description for GUEST (lines 519-520: the conditional that shows "Read-only access to selected reports for their faculty").
- Remove the GUEST SelectItem from the edit-user dialog role select (lines 664-666: the SelectItem with value="GUEST").
- Update the `requiresFaculty` computed value (lines 216-219) to remove `role === "GUEST"` — only MARKETING_COORDINATOR and STUDENT need faculty.
- Update the `requiresEditFaculty` computed value (lines 220-223) to remove `editRole === "GUEST"` — only MARKETING_COORDINATOR and STUDENT need faculty.
- Remove "GUEST" from the Role type union (lines 51-56) so it only includes: "MARKETING_MANAGER" | "MARKETING_COORDINATOR" | "STUDENT" | "ADMINISTRATOR".

In `docs/ASSUMPTIONS.md`:
- Update line 3 (the assumption about admin creating accounts): Change "The Administrator creates all user accounts (students, coordinators, managers, guests)" to "The Administrator creates all user accounts (students, coordinators, managers) before the system is used..." — remove "guests" from the list.
- Update line 6 (admin-created users password change): Change "Only admin-created users are required to change their temporary password on first login; self-registered guests chose their own password and skip this step." — this is still accurate, keep as-is since it correctly distinguishes admin-created from self-registered.
- Add a new assumption after line 8 (after the guest registration line): "The Administrator cannot create guest accounts; the GUEST role is exclusively assigned through self-registration."
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>GUEST role option no longer appears in admin create or edit user forms. ASSUMPTIONS.md reflects that only self-registration creates guest accounts. TypeScript compiles cleanly.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Grep confirms no GUEST in admin API VALID_ROLES: `grep -n "GUEST" app/api/admin/create-user/route.ts app/api/admin/users/route.ts` should return no matches within VALID_ROLES arrays
3. Grep confirms no GUEST SelectItem in admin UI: `grep -n "GUEST" app/\(portal\)/admin/users/page.tsx` should return no matches
4. ASSUMPTIONS.md updated: `grep -n "guest" docs/ASSUMPTIONS.md` shows updated text
</verification>

<success_criteria>
- Admin cannot create users with GUEST role (API returns 400)
- Admin cannot edit users to GUEST role (API returns 400)
- GUEST does not appear in create-user or edit-user role dropdowns
- Documentation accurately reflects that guests must self-register
- Existing guest self-registration flow (app/api/register/route.ts) is unaffected
- TypeScript compiles without errors
</success_criteria>
