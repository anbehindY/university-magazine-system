---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/guest/submissions/route.ts
  - app/(guest)/layout.tsx
  - app/(guest)/guest/page.tsx
  - components/app-sidebar.tsx
  - app/(portal)/page.tsx
  - app/(portal)/guest/submissions/page.tsx
autonomous: true
requirements: [GUEST-MAGAZINE-VIEW]
must_haves:
  truths:
    - "Guest navigating to /guest sees a magazine-style card grid of selected articles with faculty name hero"
    - "Guest clicking an article card opens a detail slide-over with file download links"
    - "Guest page has no sidebar — clean standalone layout with top bar"
    - "Guest visiting / (portal dashboard) is redirected to /guest"
    - "Sidebar no longer shows guest nav items"
  artifacts:
    - path: "app/api/guest/submissions/route.ts"
      provides: "Enhanced guest API with faculty name, academic year, and files array"
      contains: "facultyName"
    - path: "app/(guest)/layout.tsx"
      provides: "Minimal guest layout with top bar, no sidebar"
      min_lines: 20
    - path: "app/(guest)/guest/page.tsx"
      provides: "Magazine-style card grid with hero section and detail slide-over"
      min_lines: 100
  key_links:
    - from: "app/(guest)/guest/page.tsx"
      to: "/api/guest/submissions"
      via: "fetch in useEffect"
      pattern: "fetch.*api/guest/submissions"
    - from: "app/(portal)/page.tsx"
      to: "/guest"
      via: "router.push redirect for GUEST role"
      pattern: "router\\.push.*guest"
---

<objective>
Replace the old table-based guest submissions page with an impressive standalone magazine-style single-page experience. Create a new `(guest)` route group with its own minimal layout (no sidebar), enhance the API to return faculty name, academic year, and file details, and clean up old guest routes from the portal layout.

Purpose: Guests deserve a polished, read-only experience showcasing selected faculty articles without the overhead of the management sidebar.
Output: New `/guest` route with magazine UI, enhanced API, cleaned-up sidebar and dashboard.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@app/api/guest/submissions/route.ts
@app/(portal)/layout.tsx
@app/(portal)/page.tsx
@app/(portal)/guest/submissions/page.tsx
@components/app-sidebar.tsx
@components/nav-user.tsx
@lib/auth-helpers.ts
@lib/auth-client.ts
@prisma/schema.prisma
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enhance Guest API and Create Guest Layout</name>
  <files>
    app/api/guest/submissions/route.ts
    app/(guest)/layout.tsx
    app/(guest)/guest/_components/guest-header.tsx
  </files>
  <action>
**Update `app/api/guest/submissions/route.ts`:**

Enhance the existing GET handler to return richer data. Keep the same auth/role/faculty checks. Change the Prisma query to:

1. Add a `faculty` lookup to get the faculty name:
   ```
   const faculty = await prisma.faculty.findUnique({
     where: { id: guestFacultyId },
     select: { name: true },
   });
   ```

2. Find the active academic year:
   ```
   const activeYear = await prisma.academicYear.findFirst({
     where: { isActive: true },
     select: { yearLabel: true },
   });
   ```

3. Run faculty + activeYear + submissions in a Promise.all (same pattern as other routes in this codebase).

4. Update the submissions query to include `files` array:
   ```
   select: {
     id: true,
     title: true,
     submittedAt: true,
     notes: true,
     user: { select: { name: true } },
     files: { select: { id: true, url: true, pathname: true, contentType: true, size: true } },
     _count: { select: { files: true } },
   }
   ```

5. Map the result to include files array alongside existing fields:
   ```
   {
     id, title, studentName: s.user.name, submittedAt,
     fileCount: s._count.files, description: s.notes,
     files: s.files
   }
   ```

6. Return shape: `{ submissions: [...], facultyName: faculty?.name ?? "Unknown Faculty", academicYearLabel: activeYear?.yearLabel ?? null }`

**Create `app/(guest)/layout.tsx`** (NEW server component):

Minimal layout with NO sidebar. Structure:
- Import `getCurrentUser` from `@/lib/auth-helpers`
- Get the user server-side
- Render `<GuestHeader user={user} />` (client component) + `{children}`
- Body: `<div className="min-h-screen bg-slate-50">`
- No `SidebarProvider`, no `AppSidebar`, no `SidebarInset`

**Create `app/(guest)/guest/_components/guest-header.tsx`** (NEW client component, "use client"):

Top bar header component:
- Flex row: left side has "University Magazine" title (use the MagazineLogo SVG from app-sidebar.tsx — copy the SVG inline into this file, do NOT import from app-sidebar), right side has user name, faculty badge, and sign-out button
- Sign-out uses `signOut` from `@/lib/auth-client` with `window.location.href = "/sign-in"` on success (same pattern as NavUser)
- Use a `useEffect` to fetch faculty name from `/api/faculties` (same pattern as NavUser component)
- Sticky top bar: `sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm`
- Height: `h-14` with `px-4 sm:px-6 lg:px-8`
- Props: `{ user: { name?: string | null; email?: string | null; role?: string | null; facultyId?: string | null } | null }`
- Faculty shows as a small Badge component from shadcn
- Sign-out button: ghost variant with LogOut icon, disabled while signing out
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -40</automated>
    <manual>Check that the API route compiles and the layout renders without sidebar</manual>
  </verify>
  <done>Guest API returns facultyName, academicYearLabel, and files array. Guest layout exists at app/(guest)/layout.tsx with a clean top bar and no sidebar.</done>
</task>

<task type="auto">
  <name>Task 2: Create Magazine-Style Guest Page</name>
  <files>
    app/(guest)/guest/page.tsx
  </files>
  <action>
**Create `app/(guest)/guest/page.tsx`** (NEW, "use client"):

A single impressive page at route `/guest` with these sections:

**1. Data fetching:**
- `useState` for submissions array, facultyName, academicYearLabel, loading (init true), error
- `useState` for selectedSubmission (for detail sheet)
- `useEffect` fetches from `/api/guest/submissions`, destructures `{ submissions, facultyName, academicYearLabel }`
- Use the abort controller / cancelled flag pattern (same as existing guest page)

**2. Hero section:**
- Full-width banner with gradient: `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
- White text: faculty name in `text-4xl sm:text-5xl font-bold`, academic year as a Badge (amber/yellow styling: `bg-amber-400/20 text-amber-300 border-amber-400/30`)
- Article count: `{n} Selected Articles` in `text-lg text-slate-300`
- Decorative element: subtle BookOpen icon from lucide-react at large size, low opacity, positioned absolute right
- Padding: `px-6 sm:px-8 lg:px-10 py-12 sm:py-16`
- Rounded: `rounded-2xl mx-4 sm:mx-6 lg:mx-8 mt-6`

**3. Article grid (below hero, in a container with `px-4 sm:px-6 lg:px-8 py-8`):**
- Responsive: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Each card using shadcn `Card` component:
  - `cursor-pointer` with hover: `hover:shadow-lg hover:-translate-y-1 transition-all duration-200`
  - CardHeader: title in `font-semibold text-lg line-clamp-2` (fallback "Untitled" in italic slate-400)
  - CardContent: student name with a small user icon, submitted date formatted with `date-fns` format `dd MMM yyyy`
  - CardFooter: file count Badge (`{n} files`) in slate styling
  - onClick: `setSelectedSubmission(submission)`

**4. Detail slide-over (shadcn Sheet):**
- `<Sheet open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>`
- SheetContent from the right side, `className="sm:max-w-lg"`
- SheetHeader: SheetTitle = article title, SheetDescription = `by {studentName}`
- Content body:
  - Submitted date with CalendarDays icon
  - Description/notes section if submission has description (notes field), otherwise omit
  - Separator
  - "Files" heading with file count
  - File list: each file as a rounded row with file icon, pathname (extract filename from full pathname using `.split("/").pop()`), file size formatted (bytes to KB/MB), and a download Button (variant="outline", size="sm") that opens `file.url` in new tab via `window.open(file.url, "_blank")`
  - Content type icon: use FileText for docs, ImageIcon for images, File for others (check contentType for "image" prefix)

**5. Loading state:**
- Show hero skeleton: full-width rounded box with `animate-pulse bg-slate-200` matching hero dimensions
- Grid of 6 skeleton cards: each Card with Skeleton elements for title, name, date, badge

**6. Empty state (no articles):**
- Centered container below hero with BookOpen icon at large size (slate-300), "No Articles Yet" heading, descriptive paragraph in slate-500
- Only show if loading is false and submissions.length === 0

**7. Error state:**
- Red banner: `rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700` with error message

Import shadcn components: Card, CardHeader, CardContent, CardFooter, Badge, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, Skeleton, Separator, Button.
Import lucide-react: BookOpen, FileText, ImageIcon, File, CalendarDays, User, Download.
Import date-fns: format.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -40</automated>
    <manual>Visit /guest in browser — should see hero + card grid, click card opens sheet with file downloads</manual>
  </verify>
  <done>Magazine-style guest page renders at /guest with hero section, responsive card grid with hover effects, and detail slide-over with file download links. Loading, empty, and error states all handled.</done>
</task>

<task type="auto">
  <name>Task 3: Remove Old Guest Routes and Update Routing</name>
  <files>
    components/app-sidebar.tsx
    app/(portal)/page.tsx
    app/(portal)/guest/submissions/page.tsx
  </files>
  <action>
**1. Delete old guest submissions page:**
- Delete the entire `app/(portal)/guest/` directory: `rm -rf app/(portal)/guest/`
- This removes `app/(portal)/guest/submissions/page.tsx` (171 lines, now replaced)

**2. Update sidebar (`components/app-sidebar.tsx`):**
- In the `buildPages` function, remove the entire `case "GUEST":` block (lines ~93-102) that returns Dashboard, Selected Articles, Reports nav items
- Replace with: `case "GUEST": return [];` — guests get an empty nav since they use the standalone layout. This prevents any sidebar items showing if a guest somehow ends up in the portal layout.

**3. Update portal dashboard (`app/(portal)/page.tsx`):**
- In the main `DashboardPage` component, add a redirect for GUEST users BEFORE the dashboard renders
- Add a new `useEffect` after the existing auth redirect useEffect:
  ```
  useEffect(() => {
    if (!isPending && session?.user?.role === "GUEST") {
      router.replace("/guest");
    }
  }, [isPending, session, router]);
  ```
  Use `router.replace` (not push) so the portal dashboard is not in browser history for guests.
- Keep the `GuestDashboard` component and its type definitions in the file (dead code, but harmless — removing would be a larger refactor of the `DashboardData` type and all the role fetches). The redirect fires before it ever renders.
- In the `useEffect` that fetches data, add an early return for GUEST role so it does not make unnecessary API calls:
  ```
  if (r === "GUEST") {
    setLoading(false);
    return; // Guest redirects to /guest, no need to fetch dashboard data
  }
  ```
  Place this check right after `const r = session.user.role ?? "STUDENT";` and before the fetches array.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -40</automated>
    <manual>Verify: old /guest/submissions route returns 404, sidebar has no guest items, visiting / as guest redirects to /guest</manual>
  </verify>
  <done>Old guest submissions page deleted. Sidebar returns empty nav for guests. Portal dashboard redirects guests to /guest via router.replace. No broken imports or type errors.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `/api/guest/submissions` returns `{ submissions, facultyName, academicYearLabel }` with files array per submission
3. `/guest` renders magazine layout with hero, card grid, and detail sheet
4. `/` redirects guests to `/guest`
5. Old `/guest/submissions` route no longer exists
6. Sidebar shows no nav items for GUEST role
</verification>

<success_criteria>
- Guest users see an impressive magazine-style page at /guest with faculty hero, article card grid, and slide-over detail view with file downloads
- No sidebar appears for guest users — clean standalone layout with top bar
- Old guest routes are removed and portal dashboard redirects guests to /guest
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/10-guest-single-page-magazine-view-with-sta/10-SUMMARY.md`
</output>
