---
phase: quick-17
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(portal)/layout.tsx
  - app/(portal)/page.tsx
  - app/(guest)/guest/page.tsx
autonomous: true
requirements: [GUEST-PORTAL-FLICKER-FIX, GUEST-MINI-DASHBOARD]

must_haves:
  truths:
    - "Guest user logging in never sees the portal sidebar — they land directly on /guest"
    - "Guest page shows summary stats (total submissions, total selected, academic year, faculty name) above the article grid"
  artifacts:
    - path: "app/(portal)/layout.tsx"
      provides: "Server-side GUEST redirect before sidebar renders"
      contains: "redirect"
    - path: "app/(guest)/guest/page.tsx"
      provides: "Mini dashboard summary section above article grid"
      contains: "Total Submissions"
  key_links:
    - from: "app/(portal)/layout.tsx"
      to: "/guest"
      via: "server-side redirect()"
      pattern: 'redirect.*"/guest"'
---

<objective>
Fix guest portal layout flicker on login and add a faculty summary mini-dashboard to the guest page.

Purpose: Guests currently see a brief flash of the portal sidebar before client-side redirect kicks in. This is jarring UX. Additionally, the guest page lacks summary context (total submissions count, selected count, year label, faculty name) that should appear above the article grid.

Output: Flicker-free guest login flow via server-side redirect; guest page with summary stat cards above article grid.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/10-guest-single-page-magazine-view-with-sta/10-SUMMARY.md
@app/(portal)/layout.tsx
@app/(portal)/page.tsx
@app/(guest)/guest/page.tsx
@app/(guest)/layout.tsx
@lib/auth-helpers.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Server-side GUEST redirect in portal layout</name>
  <files>app/(portal)/layout.tsx, app/(portal)/page.tsx</files>
  <action>
In `app/(portal)/layout.tsx` (server component):

1. Import `redirect` from `next/navigation`.
2. After the existing `const user = await getCurrentUser();` line, add a guard: if `user?.role === "GUEST"`, call `redirect("/guest")`. This runs server-side before any HTML is sent, so the sidebar never renders for guests.

In `app/(portal)/page.tsx` (client component):

1. Remove the `useEffect` that checks `session?.user?.role === "GUEST"` and calls `router.replace("/guest")` (lines 551-555). This is now redundant since the server layout handles it.
2. Remove the GUEST case from the data-fetching `useEffect` (lines 512-519 — the `if (r === "GUEST")` block that fetches `/api/guest/submissions`). This code is already dead (the early return on line 453-455 skips it), but removing it cleans up the dead path.
3. Keep the `GuestDashboard` component and the `{role === "GUEST" && <GuestDashboard .../>}` render line as-is — they are dead code but removing them requires DashboardData type refactoring (per Quick-10 decision).
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit 2>&1 | head -20</automated>
    <manual>Log in as a guest user and confirm no sidebar flicker — you should land directly on /guest without seeing the portal layout at all.</manual>
  </verify>
  <done>Portal layout redirects GUEST role server-side before rendering sidebar. Client-side redirect useEffect removed. No TypeScript errors.</done>
</task>

<task type="auto">
  <name>Task 2: Add faculty summary mini-dashboard to guest page</name>
  <files>app/(guest)/guest/page.tsx</files>
  <action>
In `app/(guest)/guest/page.tsx`:

1. Add a summary stats section between the hero section and the articles grid. Use a 4-column responsive grid matching the existing project pattern (see StatCard usage in portal page.tsx): `grid gap-4 md:grid-cols-2 xl:grid-cols-4`.

2. The data is already available from the existing `fetchData` response — `submissions` array, `facultyName`, and `academicYearLabel` are all in state. Derive the stats inline (no useMemo needed, array is small):
   - **Total Submissions**: `submissions.length` — icon: FileText, color: slate
   - **Articles Selected**: `submissions.length` (all returned submissions are already `isSelected: true` per the API query) — icon: CheckCircle2, color: emerald
   - **Academic Year**: `academicYearLabel ?? "—"` — icon: CalendarDays, color: slate
   - **Faculty**: `facultyName` — icon: BookOpen, color: slate

   NOTE: Since the guest API only returns selected submissions, "Total Submissions" and "Articles Selected" will show the same count. Label the first card "Published Articles" with hint "Selected for your faculty" and the second card "Faculty" with the faculty name as value. Use this 3-card layout instead:
   - **Published Articles**: `submissions.length` — hint "Selected for publication", icon: FileText, color: emerald
   - **Faculty**: `facultyName` — hint "Your assigned faculty", icon: BookOpen, color: slate
   - **Academic Year**: `academicYearLabel ?? "—"` — hint "Current active year", icon: CalendarDays, color: slate

   Use a 3-column grid: `grid gap-4 md:grid-cols-3`.

3. Create the stat cards inline (do NOT import StatCard from portal page — it is not exported and lives in a "use client" page). Build simple stat card elements using the same Card/CardHeader/CardContent structure already imported in the file:
   ```
   <Card className="border-slate-200 bg-white text-slate-900">
     <CardHeader className="flex flex-row items-center justify-between">
       <div>
         <p className="text-sm font-medium text-slate-600">{title}</p>
         <p className="text-xs text-slate-500">{hint}</p>
       </div>
       <span className="flex h-10 w-10 items-center justify-center rounded-xl {colorClass}">
         <Icon className="h-5 w-5" />
       </span>
     </CardHeader>
     <CardContent className="text-3xl font-semibold">{value}</CardContent>
   </Card>
   ```

4. Place this section inside `<div className="px-4 sm:px-6 lg:px-8 pt-8">` between the hero div and the articles grid div. The articles grid div below should change from `py-8` to `pb-8` to avoid double top padding.

5. Add the needed icon imports: `CheckCircle2` (if used) from lucide-react. `FileText`, `BookOpen`, `CalendarDays` are already imported.

6. Do NOT show the stat cards during loading state — they depend on fetched data. Only render them in the loaded, non-error state alongside the existing content.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit 2>&1 | head -20</automated>
    <manual>Visit /guest as a logged-in guest. Verify 3 stat cards appear between the hero and the article grid showing: published articles count, faculty name, and academic year label.</manual>
  </verify>
  <done>Guest page displays 3 summary stat cards (published articles, faculty, academic year) between hero and article grid. Cards use consistent styling with rest of application. No stats shown during loading.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- Guest login flow: no sidebar flicker, direct /guest landing
- Guest page: summary stats visible above article grid
</verification>

<success_criteria>
- GUEST users never see portal sidebar on login — server redirect fires before layout renders
- Guest page shows 3 summary stat cards between hero and article grid
- All TypeScript checks pass
</success_criteria>

<output>
After completion, create `.planning/quick/17-fix-guest-portal-layout-flicker-on-login/17-SUMMARY.md`
</output>
