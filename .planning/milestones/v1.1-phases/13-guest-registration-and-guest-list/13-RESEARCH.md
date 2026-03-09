# Phase 13: Guest Registration & Guest List - Research

**Researched:** 2026-03-09
**Domain:** Public registration endpoint, coordinator notification email, faculty-scoped guest list
**Confidence:** HIGH

## Summary

Phase 13 adds two features: (1) a public guest self-registration page and API, and (2) a coordinator-facing guest list page and API. Both features build on well-established patterns already in the codebase -- the registration flow mirrors the admin create-user pattern (`auth.api.signUpEmail` + `prisma.user.update`), the notification email uses the fire-and-forget `sendMail` pattern from Phase 12, and the guest list follows the coordinator faculty-scoping and pagination patterns already used for submissions and audit logs.

No new libraries are required. All UI components (Card, Form, Input, Select, Table, Button) already exist via radix-ui and react-hook-form with zod validation. The mailer is already configured. The only new code is the registration page/API, the email check endpoint, the guest list page/API, and a sidebar entry.

**Primary recommendation:** Follow existing patterns exactly -- the codebase has clear precedent for every operation this phase requires. The main risk is the security surface: this is the first public write endpoint, so hardcode GUEST role server-side and validate faculty existence.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `mustChangePassword: false` for self-registered guests (they chose their own password)
- GUEST role hardcoded server-side -- NEVER read from request body (Pitfall 6)
- Faculty validated server-side via `prisma.faculty.findUnique()` (Pitfall 3)
- Fire-and-forget email pattern with `.catch(console.error)` (established Phase 12)
- Separate public registration API -- `api/auth/[...all]/route.ts` blocks general signup
- Use `auth.api.signUpEmail` + `prisma.user.update` pattern (same as admin create-user)
- Guest list follows coordinator faculty-scoping pattern (Pitfall 12)
- Route: `/register` under the `(auth)` route group
- Sign-in link: Add a "Register as Guest" link below the sign-in form
- Post-registration flow: Show success message, redirect to sign-in page (no auto-sign-in)
- Email uniqueness: Debounced check on blur + server-side 409 defense in depth
- Coordinator notification recipients: All coordinators assigned to the guest's selected faculty
- Email subject: "New guest registration: [Guest Name] -- [Faculty Name]"
- No coordinator found: Silently skip, registration succeeds
- Guest list navigation: New sidebar item "Guest List" for MARKETING_COORDINATOR role
- Guest list columns: Name, email, registration date, faculty badge
- Pagination from day one with existing server-side page/pageSize + skip/take pattern
- Search: Basic search by name/email

### Claude's Discretion
None explicitly listed -- all areas have locked decisions.

### Deferred Ideas (OUT OF SCOPE)
None captured.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GUEST-01 | External user can self-register as guest with name, email, password, faculty | Registration page at `app/(auth)/register/page.tsx` + API at `app/api/register/route.ts` using `auth.api.signUpEmail` + `prisma.user.update` pattern from create-user |
| GUEST-02 | Guest registration hardcodes GUEST role server-side | API must ignore any `role` in request body; hardcode `role: "GUEST"` in the `prisma.user.update` call |
| GUEST-03 | Faculty coordinator(s) receive email notification on new guest registration | Query coordinators by `{ role: "MARKETING_COORDINATOR", facultyId }`, send via `sendMail({ to: [...emails] })` fire-and-forget |
| GUEST-04 | Guest account is immediately active after registration (no approval gate) | Set `emailVerified: true`, `banned: false`, `mustChangePassword: false` in `prisma.user.update` |
| GUEST-05 | Coordinator can view read-only list of guest users for their faculty | Guest list API at `app/api/coordinator/guests/route.ts` with faculty scoping from coordinator submissions pattern |
| GUEST-06 | Guest list shows name, email, and registration date | Prisma select: `{ name, email, createdAt }` with pagination and search |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App router, API routes | Project framework |
| better-auth | ^1.4.18 | `auth.api.signUpEmail` for account creation | Established pattern in create-user |
| @prisma/client | ^7.3.0 | Database queries, user creation, faculty validation | ORM throughout project |
| react-hook-form | ^7.71.1 | Form state management | Used on sign-in, all admin forms |
| zod | ^4.3.6 | Schema validation | Used on all forms |
| @hookform/resolvers | ^5.2.2 | Zod resolver for react-hook-form | Used on all forms |
| nodemailer | ^6.10.1 | Email sending via `lib/mailer.ts` | Established in Phase 12 |
| swr | ^2.4.0 | Client-side data fetching with revalidation | Used for lists/tables |
| lucide-react | ^0.563.0 | Icons (Users icon for guest list nav) | Used throughout UI |
| radix-ui | ^1.4.3 | Card, Form, Input, Select, Table, Button | UI component library |
| sonner | ^2.0.7 | Toast notifications | Used for success/error feedback |

### No New Libraries Required
This phase requires zero new dependencies. Every UI component, data fetching pattern, and server-side utility is already available.

## Architecture Patterns

### Recommended File Structure
```
app/
  (auth)/
    register/
      page.tsx                    # Guest registration form (client component)
    sign-in/
      page.tsx                    # Add "Register as Guest" link
  api/
    register/
      route.ts                    # POST: public guest registration
      check-email/
        route.ts                  # GET: email uniqueness check
    coordinator/
      guests/
        route.ts                  # GET: faculty-scoped paginated guest list
  (portal)/
    coordinator/
      guests/
        page.tsx                  # Guest list table page
components/
  app-sidebar.tsx                 # Add Guest List nav item for MARKETING_COORDINATOR
```

### Pattern 1: Public Registration API (mirrors create-user)
**What:** POST endpoint that creates a guest account using Better Auth signup + Prisma update
**When to use:** Guest self-registration
**Example:**
```typescript
// Source: app/api/admin/create-user/route.ts lines 90-117
// Registration API follows same pattern but:
// 1. No auth check (public endpoint)
// 2. Hardcodes role: "GUEST" (NEVER from request body)
// 3. Sets mustChangePassword: false (guest chose their own password)
// 4. Validates facultyId exists via prisma.faculty.findUnique()

const result = await auth.api.signUpEmail({
  body: { name, email, password },
});

const user = await prisma.user.update({
  where: { id: result.user.id },
  data: {
    role: "GUEST",           // Hardcoded, never from request
    facultyId,               // Validated above
    emailVerified: true,
    mustChangePassword: false, // Guest chose their own password
  },
});
```

### Pattern 2: Faculty-Scoped Coordinator Query (mirrors submissions)
**What:** GET endpoint that fetches data scoped to the coordinator's faculty
**When to use:** Guest list API
**Example:**
```typescript
// Source: app/api/coordinator/submissions/[id]/route.ts lines 28-38
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { facultyId: true },
});

if (!dbUser?.facultyId) {
  return NextResponse.json(
    { error: "Forbidden. Coordinator has no assigned faculty." },
    { status: 403 }
  );
}

// Then use dbUser.facultyId in the guest query
const guests = await prisma.user.findMany({
  where: { role: "GUEST", facultyId: dbUser.facultyId },
  // ...
});
```

### Pattern 3: Pagination with Parallel Count (mirrors admin/users and audit-log)
**What:** page/pageSize query params with skip/take + Promise.all for count
**When to use:** Guest list API
**Example:**
```typescript
// Source: app/api/admin/users/route.ts lines 43-81
// and app/api/admin/audit-log/route.ts lines 19-68
const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
const pageSize = (() => {
  const raw = parseInt(searchParams.get("pageSize") ?? "10", 10);
  return [10, 25, 50].includes(raw) ? raw : 10;
})();
const skip = (page - 1) * pageSize;

const [total, guests] = await Promise.all([
  prisma.user.count({ where }),
  prisma.user.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
]);
```

### Pattern 4: Fire-and-Forget Email Notification (mirrors Phase 12)
**What:** Send email after successful operation, don't block the response
**When to use:** Coordinator notification on guest registration
**Example:**
```typescript
// Source: app/api/coordinator/submissions/[id]/route.ts lines 144-151
sendMail({
  to: coordinatorEmails,
  subject: `New guest registration: ${name} — ${facultyName}`,
  html: `<p>A new guest has registered...</p>`,
  text: `A new guest has registered...`,
}).catch(console.error);
```

### Pattern 5: Client-Side Form with react-hook-form + zod (mirrors sign-in)
**What:** "use client" page with useForm, zodResolver, Form/FormField components
**When to use:** Registration page
**Example:**
```typescript
// Source: app/(auth)/sign-in/page.tsx
const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  facultyId: z.string().min(1, "Faculty is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

### Anti-Patterns to Avoid
- **Reading role from request body in registration API:** Privilege escalation vulnerability. Always hardcode `role: "GUEST"`.
- **Skipping facultyId validation:** A non-existent facultyId creates orphaned guest accounts. Always `prisma.faculty.findUnique()` first.
- **Wrapping signup + update in a transaction:** The `auth.api.signUpEmail` is not a Prisma call, so it cannot participate in a Prisma transaction. If the `prisma.user.update` fails after signup, you have a user with default role -- acceptable, admin can fix.
- **Auto-signing-in after registration:** CONTEXT.md locks the flow to redirect to sign-in page. Do not auto-sign-in.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User account creation | Custom password hashing | `auth.api.signUpEmail` | Better Auth handles hashing, account record creation |
| Email sending | Direct SMTP calls | `lib/mailer.ts` `sendMail()` | Already configured with Gmail SMTP, singleton transporter |
| Form validation | Manual field checks | zod schema + react-hook-form | Consistent with all other forms in the project |
| Pagination | Custom offset logic | Existing `page/pageSize/skip/take` pattern | Used in admin/users, audit-log; includes parallel count |
| Faculty scoping | Manual session + faculty query | Copy from coordinator submissions route (lines 28-38) | Battle-tested pattern, handles missing faculty edge case |
| Email uniqueness check | Custom debounce logic | Standard `setTimeout` debounce in `onBlur` handler | Simple enough to not need a library |

## Common Pitfalls

### Pitfall 1: Privilege Escalation via Role in Request Body
**What goes wrong:** Registration API reads `role` from the POST body, allowing an attacker to register as ADMINISTRATOR.
**Why it happens:** Developer copies from admin create-user route which legitimately reads role from body (line 48).
**How to avoid:** Hardcode `role: "GUEST"` in the `prisma.user.update` data. Do not destructure or read `role` from the request body at all.
**Warning signs:** Any mention of `body.role` or `parseRole` in the registration route.

### Pitfall 2: Guest Created Without Faculty Assignment
**What goes wrong:** Guest has null `facultyId`, sees nothing in the guest portal, or is invisible to coordinators.
**Why it happens:** Faculty validation skipped or facultyId not required in the zod schema.
**How to avoid:** Validate `facultyId` exists via `prisma.faculty.findUnique()` before creating the account. Return 400 if invalid.
**Warning signs:** No faculty validation query in the registration API.

### Pitfall 3: Missing Faculty Scope on Guest List
**What goes wrong:** Coordinator sees ALL guests instead of only their faculty's guests.
**Why it happens:** Developer queries `prisma.user.findMany({ where: { role: "GUEST" } })` without adding `facultyId` filter.
**How to avoid:** Always include `facultyId: dbUser.facultyId` in the where clause, same as coordinator submissions route.
**Warning signs:** Query without `facultyId` in the where clause.

### Pitfall 4: Email Notification Blocking Registration Response
**What goes wrong:** If email sending is slow or fails, the registration API response is delayed or returns an error.
**Why it happens:** Developer `await`s the `sendMail` call.
**How to avoid:** Fire-and-forget pattern: `sendMail({...}).catch(console.error)` -- no `await`.
**Warning signs:** `await sendMail(...)` in the registration route.

### Pitfall 5: Email Uniqueness Check Race Condition
**What goes wrong:** Client-side check says email is available, but by the time the form submits, another registration took the email.
**Why it happens:** Time gap between blur check and form submission.
**How to avoid:** Defense in depth -- always enforce uniqueness server-side with a 409 response. The debounced check is UX only.
**Warning signs:** No server-side duplicate email check in the registration API.

## Code Examples

### Registration API Route Structure
```typescript
// app/api/register/route.ts
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password.trim() : "";
    const facultyId = typeof body?.facultyId === "string" ? body.facultyId.trim() : "";

    if (!name || !email || !password || !facultyId) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    // Validate faculty exists
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) {
      return NextResponse.json({ error: "Invalid faculty." }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    // Create via Better Auth
    const result = await auth.api.signUpEmail({ body: { name, email, password } });
    if (!result?.user) {
      return NextResponse.json({ error: "Registration failed." }, { status: 500 });
    }

    // Set GUEST role (HARDCODED - never from request body)
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role: "GUEST",
        facultyId,
        emailVerified: true,
        mustChangePassword: false,
      },
    });

    // Notify coordinators (fire-and-forget)
    const coordinators = await prisma.user.findMany({
      where: { role: "MARKETING_COORDINATOR", facultyId },
      select: { email: true },
    });

    if (coordinators.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000";
      sendMail({
        to: coordinators.map((c) => c.email),
        subject: `New guest registration: ${name} — ${faculty.name}`,
        html: `<p>A new guest has registered for <strong>${faculty.name}</strong>.</p>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Registered:</strong> ${new Date().toLocaleDateString()}</p>
               <p><a href="${appUrl}/coordinator/guests">View guest list</a></p>`,
        text: `New guest registration for ${faculty.name}: ${name} (${email}). View: ${appUrl}/coordinator/guests`,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error in guest registration:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Email Check Endpoint
```typescript
// app/api/register/check-email/route.ts
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ available: false });

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
```

### Guest List API Route
```typescript
// app/api/coordinator/guests/route.ts
import { requireRole } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { authorized, user, error } = await requireRole(["MARKETING_COORDINATOR"]);
  if (!authorized) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 403 });
  }

  // Faculty scoping (from coordinator submissions pattern)
  const dbUser = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { facultyId: true },
  });
  if (!dbUser?.facultyId) {
    return NextResponse.json({ error: "No assigned faculty." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = (() => {
    const raw = parseInt(searchParams.get("pageSize") ?? "10", 10);
    return [10, 25, 50].includes(raw) ? raw : 10;
  })();
  const skip = (page - 1) * pageSize;
  const q = searchParams.get("q")?.trim() ?? "";

  const where = {
    role: "GUEST" as const,
    facultyId: dbUser.facultyId,
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [total, guests] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        faculty: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({ guests, total, page, pageSize });
}
```

### Sidebar Entry Addition
```typescript
// In components/app-sidebar.tsx, buildPages function, MARKETING_COORDINATOR case:
case "MARKETING_COORDINATOR":
  return [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Submissions", url: "/coordinator/submissions", icon: FileText },
    { title: "Guest List", url: "/coordinator/guests", icon: Users },
    { title: "Reports", url: "/reports", icon: ChartColumn },
  ];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin creates all users | Guest self-registration | Phase 13 | First public write endpoint in the system |
| No coordinator notification for guests | Fire-and-forget email on registration | Phase 13 | Reuses Phase 12 email pattern |

**Key context:** The `Users` icon from lucide-react is already imported in `app-sidebar.tsx` (line 8) but only used in the ADMINISTRATOR case. It can be reused for the coordinator's Guest List nav item.

## Open Questions

1. **Password minimum length validation**
   - What we know: Sign-in page uses `z.string().min(1)` for password (just "not empty"). The create-user admin form does not enforce length client-side.
   - What's unclear: Whether Better Auth's `signUpEmail` enforces a minimum password length by default.
   - Recommendation: Add `z.string().min(8)` in the registration form zod schema. Better Auth may have its own minimum but explicit client-side validation provides immediate feedback.

2. **Rate limiting on registration endpoint**
   - What we know: No rate limiting exists on any endpoint currently. Pitfall 6 mentions "max 5 registrations per IP per hour."
   - What's unclear: Whether to implement rate limiting now or defer.
   - Recommendation: Defer rate limiting -- it is not in the requirements (GUEST-01 through GUEST-06) and no other endpoint has it. Can be added later.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `app/api/admin/create-user/route.ts` (signup + update pattern, lines 90-117)
- Direct codebase analysis: `app/api/coordinator/submissions/[id]/route.ts` (faculty scoping, lines 28-38)
- Direct codebase analysis: `app/api/admin/users/route.ts` (pagination pattern, lines 43-81)
- Direct codebase analysis: `app/api/admin/audit-log/route.ts` (requireRole + pagination, lines 7-68)
- Direct codebase analysis: `lib/mailer.ts` (sendMail supports `to: string | string[]`)
- Direct codebase analysis: `lib/auth-helpers.ts` (requireRole with mustChangePassword check)
- Direct codebase analysis: `app/(auth)/sign-in/page.tsx` (Form/Card/Input pattern, react-hook-form + zod)
- Direct codebase analysis: `components/app-sidebar.tsx` (buildPages switch, Users icon already imported)
- Direct codebase analysis: `prisma/schema.prisma` (User model with role, facultyId, mustChangePassword)
- Direct codebase analysis: `app/api/faculties/route.ts` (GET endpoint for faculty dropdown, no auth required)

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` (Pitfalls 3, 6, 8, 12, 14 directly relevant to this phase)
- `.planning/milestones/v1.1-phases/13-guest-registration-and-guest-list/13-CONTEXT.md` (all decisions locked)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used throughout codebase
- Architecture: HIGH - Every pattern has direct precedent in existing code with exact file/line references
- Pitfalls: HIGH - Pitfalls already researched and documented in project research, verified against codebase

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies, all patterns are internal)
