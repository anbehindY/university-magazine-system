# Quick Task 23: Add profile settings page with name update and password change - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Task Boundary

Add a profile/account settings page where all users can update their display name and change their password. Accessible from sidebar (portal users) and guest header nav (guests).

</domain>

<decisions>
## Implementation Decisions

### Page Location
- Add "Profile" or "Settings" link to the bottom of the portal sidebar for all portal roles (admin, coordinator, student, manager)
- Sidebar link, consistent with existing navigation pattern

### Guest Access
- Guests also get a profile page, accessible via a "Profile" link in the guest header nav (next to Articles/Reports)
- The profile page itself can be shared (same component) but must be accessible from both layouts

### Editable Fields
- Name and password only
- Email is displayed as read-only (no email changes to avoid auth/verification complexity)
- Password change requires current password for verification

### Claude's Discretion
- Profile page layout and form design
- Toast notifications on success/error
- Password validation rules (match existing change-password page patterns)

</decisions>

<specifics>
## Specific Ideas

- Reuse the existing password change logic from `/api/change-password/route.ts` or create a similar endpoint
- Name update via Better Auth's `updateUser` API or direct Prisma update
- Show role and faculty as read-only info on the profile page
- Update v1.1 docs to include this feature

</specifics>
