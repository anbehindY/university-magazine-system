# Phase 5: UI Layer - Research

**Researched:** 2026-02-26
**Domain:** Next.js App Router UI pages — role-scoped views, slide-over panel, SWR polling, reports with tabs
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page structure and navigation**
- Sidebar nav with role-based items — only show links relevant to the user's role
- Adapt to the existing theme, colors, and button styles already in the project — do not introduce a new design system
- Claude should remove unnecessary items from the sidebar and keep it clean
- Role-specific landing pages: Coordinator → /coordinator/submissions, Manager → /manager/submissions, Guest → /guest/submissions, Admin → /admin/dashboard, Student → /submissions
- Sidebar shows user name + role badge (e.g., "Coordinator"), plus faculty name for scoped roles
- Logout button at the bottom of the sidebar, always visible

**Submission detail and comments**
- Slide-over panel: clicking a submission row slides in a panel from the right showing details, comments, and actions. The list stays visible underneath.
- "Selected for Publication" toggle and notes textarea appear in the slide-over panel header, above the comment thread
- Comment thread updates via SWR polling every 15 seconds — new comments appear automatically without page reload
- One textarea at the bottom of the thread — coordinators can always post, students see it only when replying to a coordinator comment (click "Reply" on a comment to set parentId)

**Reports presentation**
- Single /reports page with tabs: "Statistics" and "Exceptions"
- Statistical reports: summary cards at top (total submissions, total contributors) + sortable data table below showing per-faculty breakdown with counts, percentages, and contributor numbers
- Exception reports: color-coded rows — amber/yellow for "no coordinator comment", red for 14+ days overdue. Tabs or toggle to switch between "All exceptions" and "Overdue only"
- Academic year selector dropdown at the top of the reports page, defaulting to the active year. Changing it re-fetches data via the ?academicYearId API param

**Guest and manager views**
- Guest view uses the same layout as coordinator but read-only — no toggle, no notes, no comment input. Just viewing selected submissions for their faculty.
- Manager submission list has a faculty dropdown filter (matches ?facultyId API param), defaults to "All faculties"
- Manager page shows total selected count and per-faculty count badge next to the filter dropdown
- Download ZIP button with loading/spinner state while streaming. Disabled before finalClosureDate with a tooltip explaining why.

### Claude's Discretion
- Exact component library usage (shadcn, Tailwind patterns — follow what's already in the project)
- Loading skeletons and empty state designs
- Exact spacing, typography, and responsive breakpoints
- Error state handling and toast notifications
- Table column widths and sorting defaults

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GUEST-01 | Guest user can view submissions flagged as "Selected for Publication" for their assigned faculty (read-only, no editing or commenting) | Existing `/api/manager/submissions` pattern reusable; a dedicated `/api/guest/submissions` GET route filters by the guest's `facultyId` from session; read-only Sheet panel mirrors coordinator's slide-over |
| GUEST-02 | Guest user can view statistical and exception reports scoped to their assigned faculty | `/api/reports` already handles GUEST role — it sets `scopedFacultyId` from `dbUser.facultyId`; the `/reports` page just needs building |
</phase_requirements>

---

## Summary

Phase 5 is a pure frontend build. All APIs are implemented (Phases 1–4); the work is creating pages and wiring them to existing endpoints. The project uses Next.js 16 App Router with React 19, shadcn/ui (new-york style, Tailwind v4, radix-ui), and plain `fetch` + `useState`/`useEffect` for data loading. There is no SWR installed.

The slide-over panel (submission detail) is the most complex UI piece: it must hold submission details, a scrollable comment thread with 15-second polling, and (for coordinators) live-update controls. **SWR must be installed** — it is not present in `package.json` but is explicitly required by the locked decision. The rest of the pages follow the same patterns already established in admin and user management pages.

The reports page requires a Tabs component. `radix-ui` (already installed as a dependency) exports a `Tabs` primitive directly — no extra package is needed; a thin shadcn-style wrapper can be created in `components/ui/tabs.tsx`.

**Primary recommendation:** Install `swr`, add a `Tabs` UI component from the existing `radix-ui` package, then build pages in this order: (1) sidebar refactor, (2) coordinator submissions list + slide-over, (3) manager submissions + ZIP download, (4) guest submissions, (5) reports page. No new design tokens needed — extend existing slate/amber/emerald palette already in the project.

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Page routing, RSC layouts | Already in use |
| React | 19.2.3 | UI rendering | Already in use |
| shadcn/ui (new-york) | radix-ui ^1.4.3 | Component primitives | Already in components.json |
| Tailwind CSS | ^4 | Utility styling | Already in use; keep slate/amber/emerald palette |
| sonner | ^2.0.7 | Toast notifications | Already installed, Toaster in root layout |
| lucide-react | ^0.563.0 | Icons | Already in use |
| date-fns | ^3.6.0 | Date formatting | Already installed |
| better-auth | ^1.4.18 | Auth session (useSession, getCurrentUser) | Already in use |

### Needs Installation

| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| swr | ^2.x | Comment thread polling (15s interval) | Locked decision requires SWR polling; not in package.json |

**Installation:**
```bash
pnpm add swr
```

### Already Available but Not Yet Wrapped

| Primitive | Source | What to Create |
|-----------|--------|---------------|
| `Tabs` | `radix-ui` exports `Tabs` (verified: `require('radix-ui').Tabs` exists) | Create `components/ui/tabs.tsx` wrapper (shadcn pattern) |

No other new packages needed.

---

## Architecture Patterns

### Recommended Project Structure (new files)

```
app/
├── (management)/
│   ├── coordinator/
│   │   └── submissions/
│   │       └── page.tsx          # Coordinator list + slide-over
│   ├── manager/
│   │   └── submissions/
│   │       └── page.tsx          # Manager list + ZIP download button
│   ├── guest/
│   │   └── submissions/
│   │       └── page.tsx          # Guest read-only list + slide-over
│   └── reports/
│       └── page.tsx              # Reports page (tabs: Statistics / Exceptions)
components/
├── app-sidebar.tsx               # MODIFY: role-based nav, faculty name display
├── ui/
│   └── tabs.tsx                  # NEW: Tabs wrapper from radix-ui
```

All new role pages go under `(management)/` — they already share the `AppSidebar` + `ManagementHeader` + `SidebarProvider` layout from `app/(management)/layout.tsx`.

The `/reports` page is accessible to coordinator, manager, admin, and guest. It lives at the top level of `(management)/` — no role route prefix needed — with the API handling scoping server-side.

### Pattern 1: Client Page with fetch + useState (established project pattern)

**What:** `"use client"` page component that fetches data on mount with `useEffect`, manages loading/error/data state with `useState`.
**When to use:** All new list pages (coordinator, manager, guest submissions, reports).
**Example (from `/app/(management)/admin/page.tsx`):**
```typescript
"use client";
const [items, setItems] = useState<Item[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  async function load() {
    setLoading(true);
    const res = await fetch("/api/coordinator/submissions");
    if (!res.ok) { setError("Failed to load"); return; }
    const data = await res.json();
    setItems(data.submissions);
    setLoading(false);
  }
  load();
}, []);
```

### Pattern 2: SWR Polling for Comment Thread

**What:** Use `useSWR` with `refreshInterval` for the comment thread inside the slide-over panel.
**When to use:** Comment thread fetch inside `SubmissionSlideOver` component (coordinator + guest panels).
**Example:**
```typescript
// Source: https://swr.vercel.app/docs/revalidation
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function CommentThread({ submissionId }: { submissionId: string }) {
  const { data, error } = useSWR(
    `/api/comments?submissionId=${submissionId}`,
    fetcher,
    { refreshInterval: 15000 }  // 15-second polling per locked decision
  );
  // ...
}
```
SWR automatically revalidates every 15 seconds without a full page reload. After posting a comment, call `mutate()` from `useSWR` to trigger immediate revalidation.

### Pattern 3: Sheet (Slide-Over Panel)

**What:** Right-side slide-over using the existing `Sheet` component (`components/ui/sheet.tsx`).
**When to use:** Submission detail for coordinator and guest views.
**Key insight:** `Sheet` is already in the project wrapping `radix-ui Dialog`. Use `side="right"` (default). The list remains visible underneath because `Sheet` uses a portal overlay, not a full-page replacement.
```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// State: track which submission is selected
const [selectedId, setSelectedId] = useState<string | null>(null);

<Sheet open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
  <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">
    {selectedId && <SubmissionDetail id={selectedId} />}
  </SheetContent>
</Sheet>
```

### Pattern 4: Tabs Component (new wrapper needed)

**What:** Tabs for the reports page (Statistics / Exceptions tabs + All/Overdue sub-toggle).
**Source:** `radix-ui` already exports `Tabs` — verified present in `node_modules/radix-ui`.
**Create:** `components/ui/tabs.tsx` following existing shadcn pattern (see `switch.tsx`, `sheet.tsx`):
```typescript
"use client"
import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root
const TabsList = React.forwardRef<...>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex h-9 items-center rounded-lg bg-slate-100 p-1 text-slate-500", className)}
    {...props}
  />
))
// ... TabsTrigger, TabsContent
export { Tabs, TabsList, TabsTrigger, TabsContent }
```

### Pattern 5: Sidebar Role-Based Navigation

**What:** Modify `app-sidebar.tsx` `buildPages()` function to return role-specific items with correct URLs. Remove placeholder `#` links. Add faculty name display.
**Key data available:** `user.role` and `user.facultyId` are on the session user (visible in `getCurrentUser()` result used by the layout).
**Required role → URL mapping (locked):**
- `MARKETING_COORDINATOR` → `/coordinator/submissions` (Faculty Submissions), `/reports`
- `MARKETING_MANAGER` → `/manager/submissions` (Selected Submissions), `/reports`
- `GUEST` → `/guest/submissions` (Selected Articles), `/reports`
- `STUDENT` → `/submissions`
- `ADMINISTRATOR` → `/admin` (Closure Dates), `/admin/upload-rules`, `/users`

**Faculty name:** The layout passes `user` (from `getCurrentUser()`) to `AppSidebar`. The user object has `facultyId` but not `facultyName`. To show faculty name in the sidebar, fetch it from `/api/faculties` on the client side, or pass it via a server component layer. The simplest approach matching existing patterns: fetch faculty name client-side in `NavUser` or add a separate server-fetched prop to `AppSidebar`.

### Pattern 6: ZIP Download with Loading State

**What:** Manager Download ZIP button that tracks in-flight state and disables before `finalClosureDate`.
**Key:** The download is a streaming response — use `window.location.href` or an anchor tag, not `fetch()` (fetch doesn't natively trigger browser download dialog for streams).
```typescript
async function handleDownload() {
  setDownloading(true);
  try {
    const res = await fetch("/api/manager/submissions/download");
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selected-submissions.zip";
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setDownloading(false);
  }
}
```
**Disable condition:** Fetch closure status from `/api/academic-years` (already exists, returns `finalClosureDate`). If `finalClosureDate` is null or in the future, disable the button with `Tooltip` explaining why.

### Anti-Patterns to Avoid

- **Do not add shadcn Tabs via `npx shadcn add`** — the project uses manual component files from `radix-ui` directly (see `sheet.tsx`, `switch.tsx`). Create `tabs.tsx` manually following the same pattern.
- **Do not use `window.location.href` for ZIP download** — that approach works but loses the ability to show loading state. Use `fetch` → `blob()` → `createObjectURL` instead.
- **Do not use the `(student)` route group for coordinator/manager/guest pages** — they must go under `(management)/` to share the admin layout (sidebar + header).
- **Do not call `/api/reports` directly on page load without `type` param** — the API requires `?type=submissions` or `?type=exceptions`; missing this returns 400.
- **Do not introduce new CSS variables or design tokens** — use existing `slate-*`, `amber-*`, `emerald-*` classes from the project.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comment polling | Custom setInterval + cleanup | `useSWR` with `refreshInterval` | SWR handles deduplication, error retry, revalidation on focus, cleanup on unmount |
| Slide-over animation | Custom CSS transitions | `Sheet` from `components/ui/sheet.tsx` | Already present; uses Radix Dialog with proper accessibility (focus trap, escape key, aria) |
| Tooltip on disabled button | Custom hover state | `Tooltip`/`TooltipContent` from `components/ui/tooltip.tsx` | Already present; handles accessibility |
| Tab switching | Manual show/hide divs | `Tabs` wrapper from `radix-ui` | Accessibility (role=tabpanel, aria-selected), keyboard navigation |
| Toast notifications | Alert divs | `sonner` via `toast()` | Already installed and configured in root layout |
| Faculty name lookup | Inline prisma query | Fetch `/api/faculties` (existing endpoint) | Endpoint already exists, returns `[{id, name}]` |

**Key insight:** Every UI primitive needed is either already in `components/ui/` or available from `radix-ui` (already installed). The only genuine gap is `swr` for polling.

---

## Common Pitfalls

### Pitfall 1: Guest Submissions API Missing
**What goes wrong:** There is no `/api/guest/submissions` route. Guest users cannot fetch their selected submissions.
**Why it happens:** Phase 4 built manager and coordinator APIs but not guest.
**How to avoid:** Create `app/api/guest/submissions/route.ts` — mirrors the manager route but scopes by `dbUser.facultyId` and restricts to `role === "GUEST"`.
**Warning signs:** 404 errors when guest page loads.

### Pitfall 2: SWR Not Installed
**What goes wrong:** `import useSWR from 'swr'` causes a module not found error at build time.
**Why it happens:** `swr` is absent from `package.json` despite being required by the locked decision.
**How to avoid:** The first task of any plan touching comment polling must `pnpm add swr`.
**Warning signs:** TypeScript cannot resolve `"swr"` module.

### Pitfall 3: Tabs Component Missing
**What goes wrong:** Reports page cannot use `<Tabs>` — no `components/ui/tabs.tsx` exists.
**Why it happens:** shadcn Tabs is not in the current `components/ui/` directory.
**How to avoid:** Create `components/ui/tabs.tsx` wrapping `{ Tabs } from "radix-ui"` before building the reports page.
**Warning signs:** Import errors on the reports page.

### Pitfall 4: Sheet Width Too Narrow (default is `sm:max-w-sm` ≈ 384px)
**What goes wrong:** Default `SheetContent` is `sm:max-w-sm` (384px). Comment threads + notes textarea feel cramped.
**Why it happens:** The existing `sheet.tsx` hardcodes `sm:max-w-sm` for right-side panels.
**How to avoid:** Override with `className="w-[480px] sm:max-w-[560px]"` or similar on `SheetContent`. Do not modify `sheet.tsx` globally — use className prop.

### Pitfall 5: Faculty Name Not Available on Session User
**What goes wrong:** `getCurrentUser()` returns `session.user` which has `facultyId` but not `faculty.name`. Sidebar shows ID not name.
**Why it happens:** `better-auth` session only stores flat user fields; the Faculty relation is not auto-joined.
**How to avoid:** In `AppSidebar` (client component), fetch `/api/faculties` on mount and look up the name by `user.facultyId`. OR add a server-side prop: pass `facultyName` from the layout's server component where `getCurrentUser()` is called, then do a separate `prisma.faculty.findUnique`.
**Recommended:** Client-side fetch in `AppSidebar` (matches existing pattern; no layout change needed).

### Pitfall 6: Download ZIP Fetch Buffering the Entire ZIP in Memory
**What goes wrong:** Fetching the stream via `await res.blob()` buffers the full ZIP in browser memory before creating the download link. For large archives this is slow and may OOM low-memory tabs.
**Why it happens:** Browser `fetch` + `blob()` is the simplest pattern but fully buffers.
**How to avoid:** For this project's scale (university magazine), buffering is acceptable. If the archive grows large, switch to a direct link: `<a href="/api/manager/submissions/download" download>` which streams directly to disk without buffering. For Phase 5, the `fetch`+`blob` approach is fine since it enables loading state tracking.
**Warning signs:** Large test archives taking a long time to show download dialog.

### Pitfall 7: `/reports` Page Behind Wrong Route Group
**What goes wrong:** Placing `/reports` under a role-specific prefix makes it inaccessible to other roles.
**Why it happens:** The natural instinct is `/coordinator/reports` or `/manager/reports`.
**How to avoid:** Place the reports page at `app/(management)/reports/page.tsx` — one page for all roles; the API handles scoping by role.

### Pitfall 8: Academic Year Selector Missing `id` Field
**What goes wrong:** Reports page needs to send `?academicYearId=X` but `/api/academic-years` only returns the active year without its `id`.
**Why it happens:** The public `/api/academic-years` GET selects `yearLabel, firstClosureDate, finalClosureDate, isActive` — no `id`.
**How to avoid:** The reports page can use `/api/admin/academic-years` (which returns `id`) — but that requires ADMINISTRATOR role. Instead, add `id` to the select in `/api/academic-years`, OR create a new `/api/academic-years/all` endpoint returning all years with IDs for the selector (accessible to non-admin roles). The simplest fix: modify the existing `/api/academic-years` route to also return `id` in the select.

---

## Code Examples

Verified patterns from project source:

### SWR Polling Pattern (to implement)
```typescript
// Source: https://swr.vercel.app/docs/revalidation#revalidate-on-interval
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function CommentThread({ submissionId }: { submissionId: string }) {
  const { data, mutate } = useSWR<{ comments: Comment[] }>(
    `/api/comments?submissionId=${submissionId}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  async function postComment(content: string, parentId?: string) {
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, content, parentId }),
    });
    await mutate(); // immediate revalidation after post
  }
  // ...
}
```

### Sheet Slide-Over (from existing components/ui/sheet.tsx)
```typescript
// Source: /home/alfie/next-prisma/components/ui/sheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

<Sheet open={!!selectedSubmissionId} onOpenChange={(open) => !open && setSelectedSubmissionId(null)}>
  <SheetContent side="right" className="w-[480px] sm:max-w-[560px] overflow-y-auto p-0">
    <SheetHeader className="border-b border-slate-200 px-6 py-4">
      <SheetTitle>Submission Detail</SheetTitle>
    </SheetHeader>
    {/* toggle + notes + comment thread */}
  </SheetContent>
</Sheet>
```

### Coordinator PATCH (toggle/notes)
```typescript
// Source: /home/alfie/next-prisma/app/api/coordinator/submissions/[id]/route.ts
async function updateSubmission(id: string, patch: { isSelected?: boolean; notes?: string | null }) {
  const res = await fetch(`/api/coordinator/submissions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json() as Promise<{ submission: { id: string; isSelected: boolean; notes: string | null } }>;
}
```

### Reports API Call Pattern
```typescript
// Source: /home/alfie/next-prisma/app/api/reports/route.ts
// Statistics tab
const statsRes = await fetch(`/api/reports?type=submissions&academicYearId=${yearId}`);
const stats = await statsRes.json();
// stats.data: Array<{ facultyId, facultyName, submissionCount, percentageOfTotal, distinctContributors }>

// Exceptions tab (all)
const excRes = await fetch(`/api/reports?type=exceptions&academicYearId=${yearId}`);
// Exceptions tab (overdue only)
const overdueRes = await fetch(`/api/reports?type=exceptions&academicYearId=${yearId}&overdue=true`);
// exc.data: Array<{ id, title, studentName, facultyName, submittedAt, daysSinceSubmission }>
// Color rule: daysSinceSubmission >= 14 → red row; daysSinceSubmission < 14 → amber row
```

### Tabs Component Wrapper (to create)
```typescript
// Source: radix-ui Tabs primitive (verified in node_modules/radix-ui)
// File: components/ui/tabs.tsx
"use client"
import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center rounded-lg bg-slate-100 p-1 text-slate-500",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName
const TabsTrigger = React.forwardRef<...>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName
const TabsContent = React.forwardRef<...>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-2", className)} {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName
export { Tabs, TabsList, TabsTrigger, TabsContent }
```

### Role-Based Sidebar buildPages (to replace existing)
```typescript
// Source: /home/alfie/next-prisma/components/app-sidebar.tsx
function buildPages(role?: string | null) {
  switch (role) {
    case "MARKETING_COORDINATOR":
      return [
        { title: "Submissions", url: "/coordinator/submissions", icon: FileText },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "MARKETING_MANAGER":
      return [
        { title: "Selected Submissions", url: "/manager/submissions", icon: CircleCheckBig },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "GUEST":
      return [
        { title: "Selected Articles", url: "/guest/submissions", icon: CircleCheckBig },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "STUDENT":
      return [
        { title: "My Submissions", url: "/submissions", icon: Upload },
      ];
    case "ADMINISTRATOR":
      return [
        { title: "Closure Dates", url: "/admin", icon: Calendar },
        { title: "Upload Rules", url: "/admin/upload-rules", icon: Upload },
        { title: "User Management", url: "/users", icon: Users },
      ];
    default:
      return [];
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `pages/` router | App Router (`app/`) | Used throughout this project |
| Named route groups | Parenthesized route groups `(management)/` | Layouts without URL prefix |
| Manual polling with `setInterval` | `useSWR` `refreshInterval` | Deduplication, cleanup on unmount |
| `@radix-ui/react-*` individual packages | `radix-ui` monorepo package | One dependency, same API |

**Deprecated/outdated:**
- `@radix-ui/react-tabs`: replaced by `import { Tabs } from "radix-ui"` in this project's radix version
- `next/router` (pages router): replaced by `next/navigation` (app router) — already correctly used

---

## Open Questions

1. **Faculty name in sidebar**
   - What we know: `user.facultyId` is on the session; `user.facultyName` is not
   - What's unclear: Whether to fetch it client-side in AppSidebar or pass it from the server layout
   - Recommendation: Client-side fetch in `AppSidebar` using existing `/api/faculties` endpoint matches the project's established pattern of client-side data loading; avoids touching the layout server component

2. **Academic year list for reports selector**
   - What we know: `/api/academic-years` (public) only returns the active year without `id`; `/api/admin/academic-years` returns all with IDs but is ADMINISTRATOR-only
   - What's unclear: The reports page needs to switch between academic years — it needs a list of all years with IDs accessible to all authorized roles
   - Recommendation: Modify `/api/academic-years` to (a) also return `id` in the active year response AND add a `?all=true` query param that returns all years (with auth gate for non-student roles). Alternatively, create `/api/academic-years/all` as a dedicated endpoint. The simplest: add `id` to the existing route's select clause and use the admin endpoint for the dropdown restricted to admins only, defaulting to active year for non-admins (coordinator/guest/manager see only the active year in the selector). Since RPT-06 just says role-scoping, not multi-year selection per role, the simplest approach: everyone defaults to active year; admin can switch. This avoids a new endpoint.

3. **Coordinator slide-over: scroll within panel vs. full panel scroll**
   - What we know: The comment thread can be long; the toggle/notes are in the header
   - What's unclear: Whether the header should be sticky within the SheetContent or the whole panel scrolls
   - Recommendation: Use a flex layout inside SheetContent: sticky header section (toggle + notes), scrollable comment thread body below it using `flex-col h-full` with `overflow-y-auto` on the thread container

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not present in `.planning/config.json` (defaults to disabled).

---

## Sources

### Primary (HIGH confidence)
- Project source code — `/home/alfie/next-prisma/components/app-sidebar.tsx` — current sidebar structure
- Project source code — `/home/alfie/next-prisma/components/ui/sheet.tsx` — Sheet component API
- Project source code — `/home/alfie/next-prisma/components/ui/switch.tsx` — radix-ui wrapper pattern
- Project source code — `/home/alfie/next-prisma/components/ui/tooltip.tsx` — Tooltip wrapper
- Project source code — `/home/alfie/next-prisma/components/ui/skeleton.tsx` — Skeleton component
- Project source code — `/home/alfie/next-prisma/app/api/reports/route.ts` — Reports API response shape
- Project source code — `/home/alfie/next-prisma/app/api/coordinator/submissions/route.ts` — Coordinator submissions API
- Project source code — `/home/alfie/next-prisma/app/api/manager/submissions/route.ts` — Manager submissions API
- Project source code — `/home/alfie/next-prisma/app/api/comments/route.ts` — Comments API (GET + POST)
- Project source code — `/home/alfie/next-prisma/app/(management)/admin/page.tsx` — Established fetch pattern
- Project source code — `/home/alfie/next-prisma/app/(management)/users/page.tsx` — Established table/dialog pattern
- `node_modules/radix-ui` — verified `Tabs` export present via `require('radix-ui').Tabs`
- Project `package.json` — verified `swr` is NOT present (must be installed)

### Secondary (MEDIUM confidence)
- SWR official documentation (https://swr.vercel.app/docs/revalidation) — `refreshInterval` option
- shadcn/ui Tabs component pattern (https://ui.shadcn.com/docs/components/tabs) — wrapper structure follows same pattern as existing sheet/switch

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against project's own package.json, node_modules, and source files
- Architecture: HIGH — follows established patterns in this codebase with verified API shapes
- Pitfalls: HIGH — identified by direct inspection of missing files, API response shapes, and component defaults

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable stack; 30-day window appropriate)
