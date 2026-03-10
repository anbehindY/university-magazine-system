---
phase: quick-23
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/profile/route.ts
  - app/(portal)/profile/page.tsx
  - app/(guest)/guest/profile/page.tsx
  - components/app-sidebar.tsx
  - app/(guest)/guest/_components/guest-header.tsx
autonomous: true
requirements: [PROFILE-PAGE]

must_haves:
  truths:
    - "Portal users can navigate to profile page from sidebar"
    - "Guests can navigate to profile page from header nav"
    - "User can update their display name"
    - "User can change password by providing current password + new password"
    - "Email, role, and faculty are displayed as read-only"
    - "Toast notifications appear on success and error"
  artifacts:
    - path: "app/api/profile/route.ts"
      provides: "GET current user info, PUT name update, POST password change with current password verification"
      exports: ["GET", "PUT", "POST"]
    - path: "app/(portal)/profile/page.tsx"
      provides: "Profile settings page for portal users"
    - path: "app/(guest)/guest/profile/page.tsx"
      provides: "Profile settings page for guest users"
  key_links:
    - from: "app/(portal)/profile/page.tsx"
      to: "/api/profile"
      via: "fetch calls for GET, PUT, POST"
      pattern: "fetch.*api/profile"
    - from: "components/app-sidebar.tsx"
      to: "/profile"
      via: "Settings nav item in sidebar"
      pattern: "url.*profile"
    - from: "app/(guest)/guest/_components/guest-header.tsx"
      to: "/guest/profile"
      via: "Profile link in header nav"
      pattern: "href.*guest/profile"
---

<objective>
Add a profile/account settings page where all users can update their display name and change their password (with current password verification). Accessible from the portal sidebar and guest header nav.

Purpose: Users currently have no way to update their name or change their password voluntarily (only forced change-password flow exists).
Output: Profile API route, portal profile page, guest profile page, updated navigation components.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/23-add-profile-settings-page-with-name-upda/23-CONTEXT.md

<interfaces>
<!-- Existing patterns the executor needs -->

From lib/auth-helpers.ts:
```typescript
export async function getCurrentUser(): Promise<User | null>;
```

From better-auth/crypto (available exports):
```typescript
export const hashPassword: (password: string) => Promise<string>;
export const verifyPassword: (opts: { hash: string; password: string }) => Promise<boolean>;
```

From lib/prisma (default export):
```typescript
// prisma.user.update(), prisma.account.findFirst(), prisma.account.updateMany()
```

User model fields: id, name, email, role, facultyId, mustChangePassword, image
Account model: userId, providerId, password (hashed)

Toast pattern (used project-wide):
```typescript
import { toast } from "sonner";
toast.success("Message");
toast.error("Message");
```

Form pattern (used project-wide):
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create profile API route with name update and password change</name>
  <files>app/api/profile/route.ts</files>
  <action>
Create `app/api/profile/route.ts` with three handlers:

**GET** - Return current user profile info:
- Use `getCurrentUser()` from `@/lib/auth-helpers`
- Return 401 if not authenticated
- Fetch faculty name if user has facultyId (via `prisma.faculty.findUnique`)
- Return JSON: `{ user: { name, email, role, facultyName } }`

**PUT** - Update display name:
- Use `getCurrentUser()`, return 401 if not authenticated
- Validate body with zod: `{ name: z.string().min(1, "Name is required").max(100) }`
- Update via `prisma.user.update({ where: { id: user.id }, data: { name } })`
- Return `{ success: true, name: updatedUser.name }`

**POST** - Change password (with current password verification):
- Use `getCurrentUser()`, return 401 if not authenticated
- Validate body with zod schema:
  ```
  { currentPassword: z.string().min(1), newPassword: z.string().min(8), confirmPassword: z.string() }
  .refine(data => data.newPassword === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })
  ```
- Fetch current password hash: `prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" }, select: { password: true } })`
- If no account found, return 400 "No credential account found"
- Use `verifyPassword` from `better-auth/crypto` with `{ hash: account.password, password: currentPassword }` to verify current password
- If verification fails, return 400 "Current password is incorrect"
- Hash new password with `hashPassword` from `better-auth/crypto`
- Update via `prisma.account.updateMany({ where: { userId: user.id, providerId: "credential" }, data: { password: hashedPassword } })`
- Return `{ success: true }`

Import pattern matches existing `app/api/change-password/route.ts`.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit app/api/profile/route.ts 2>&1 | head -20</automated>
  </verify>
  <done>GET returns user profile, PUT updates name, POST changes password with current password verification. All three return proper error responses for auth/validation failures.</done>
</task>

<task type="auto">
  <name>Task 2: Create profile page and add navigation links</name>
  <files>app/(portal)/profile/page.tsx, app/(guest)/guest/profile/page.tsx, components/app-sidebar.tsx, app/(guest)/guest/_components/guest-header.tsx</files>
  <action>
**A) Create `app/(portal)/profile/page.tsx`** - Profile settings page for portal users:

"use client" component. Layout: max-w-2xl centered container with two Card sections.

**Section 1: Profile Information**
- Card with heading "Profile Information"
- Read-only fields displayed as text (not inputs): Email (with muted style), Role (formatted nicely using same `formatRole` pattern as nav-user.tsx), Faculty (if applicable)
- Editable name field in a form using react-hook-form + zod (`{ name: z.string().min(1).max(100) }`)
- On mount, fetch GET `/api/profile` to populate all fields (use `useEffect` + `useState`)
- "Save Name" button submits PUT to `/api/profile` with `{ name }`
- Show `toast.success("Name updated successfully")` or `toast.error(data.error)` on response

**Section 2: Change Password**
- Card with heading "Change Password"
- Form with three fields: Current Password, New Password, Confirm Password
- Zod schema matching the API: currentPassword required, newPassword min 8, confirmPassword must match
- Submit POST to `/api/profile` with all three fields
- Show `toast.success("Password changed successfully")` or `toast.error(data.error)`
- Reset form on success

Use existing UI components: Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Form/FormField/FormItem/FormLabel/FormControl/FormMessage. Follow the same Tailwind styling patterns as existing portal pages (slate color scheme, `border-slate-200` inputs, `bg-slate-900` primary buttons).

**B) Create `app/(guest)/guest/profile/page.tsx`**:
- Identical content to the portal profile page (can be a copy — simpler than shared component given different route groups)
- Same two cards, same API calls, same form logic
- Wrap in a container matching guest page styling: `<main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">`

**C) Update `components/app-sidebar.tsx`**:
- Import `Settings` icon from `lucide-react`
- In the `buildPages` function, add a "Settings" entry at the END of every role's array (not GUEST which returns []):
  `{ title: "Settings", url: "/profile", icon: Settings }`
- Add to ADMINISTRATOR, MARKETING_COORDINATOR, MARKETING_MANAGER, and STUDENT arrays

**D) Update `app/(guest)/guest/_components/guest-header.tsx`**:
- Add a "Profile" link between the user name display and the sign-out button in the right section
- Use Next.js `Link` from `next/link`: `<Link href="/guest/profile" className="text-sm text-slate-600 hover:text-slate-900">Profile</Link>`
- Import `Link` from `next/link`
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>Profile page accessible at /profile (portal) and /guest/profile (guest). Sidebar shows "Settings" link for all portal roles. Guest header shows "Profile" link. Name update and password change forms work with toast feedback.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Dev server starts: `pnpm dev` (no runtime errors)
3. Navigate to /profile as a portal user — page loads with profile info and both forms
4. Navigate to /guest/profile as a guest — same page loads
5. Sidebar shows "Settings" link for admin, coordinator, manager, student roles
6. Guest header shows "Profile" link
</verification>

<success_criteria>
- All portal roles see "Settings" in sidebar linking to /profile
- Guests see "Profile" in header linking to /guest/profile
- Profile page displays email, role, faculty as read-only
- Name can be updated via form with toast confirmation
- Password can be changed by providing current password + new password + confirm
- Incorrect current password returns clear error message
- All forms validate client-side (zod) and server-side
</success_criteria>

<output>
After completion, create `.planning/quick/23-add-profile-settings-page-with-name-upda/23-SUMMARY.md`
</output>
