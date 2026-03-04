---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(portal)/admin/closure-dates/page.tsx
autonomous: true
requirements: [QUICK-01]

must_haves:
  truths:
    - "Previous Years table (desktop) shows only 3 columns: Year, First Closure, Final Closure — no Status column"
    - "Previous Years mobile cards show year label and dates only — no badge"
    - "If the active academic year's final closure date has passed, the page automatically deactivates it on load"
    - "isPastYear helper is retained for the auto-deactivation check but not used in table/card rendering"
    - "Badge import is retained (still used for Active badge on Current Academic Year card)"
  artifacts:
    - path: "app/(portal)/admin/closure-dates/page.tsx"
      provides: "Closure dates admin page with status column removed and auto-deactivation"
  key_links:
    - from: "auto-deactivation useEffect"
      to: "PATCH /api/admin/academic-years"
      via: "fetch PATCH with { id, isActive: false }"
      pattern: "fetch.*api/admin/academic-years.*PATCH.*isActive.*false"
---

<objective>
Remove the Status column from the Previous Years table and add auto-deactivation of academic years past their final closure date.

Purpose: Previous years are just history — showing Past/Upcoming badges adds no value. Auto-deactivation ensures that after final closure, the year transitions to inactive without manual admin intervention.
Output: Updated closure-dates page with cleaner Previous Years display and automatic lifecycle management.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(portal)/admin/closure-dates/page.tsx
@app/api/admin/academic-years/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Status column from Previous Years and add auto-deactivation</name>
  <files>app/(portal)/admin/closure-dates/page.tsx</files>
  <action>
All changes are in `app/(portal)/admin/closure-dates/page.tsx`. Three modifications:

**1. Remove Status column from desktop table (lines 397-423):**
- Remove the `<th className="px-4 py-3">Status</th>` header (line 401)
- In the tbody map (lines 405-421): remove `const past = isPastYear(item);` and the entire `<td>` containing the Past/Upcoming badges (lines 412-418)
- The table should have exactly 3 columns: Year, First Closure, Final Closure

**2. Remove badges from mobile cards (lines 427-455):**
- Remove `const past = isPastYear(item);` (line 429)
- Change the mobile card header from a flex row with badge to just the year label paragraph. Remove the entire badge conditional block (lines 437-441). The `<div className="flex items-center justify-between gap-2">` wrapper can be simplified to just the `<p>` element directly, or kept as-is with only the year label inside.

**3. Add auto-deactivation useEffect (after the existing `useEffect(() => { loadHistory(); }, []);` on line 117):**
Add a new useEffect that:
- Depends on `activeYear` (specifically `activeYear?.id` and `activeYear?.finalClosureDate`)
- Guards: only runs if `activeYear` exists AND `isPastYear(activeYear)` returns true
- Calls `fetch("/api/admin/academic-years", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeYear.id, isActive: false }) })`
- On success, calls `loadHistory()` to refresh the data (the year will move to otherYears)
- On failure, logs to console (silent failure is acceptable — admin can still manually manage)
- Use a ref (`hasAutoDeactivated`) initialized to `false` to prevent re-triggering after the first deactivation call, and reset it when `activeYear?.id` changes

**DO NOT:**
- Remove the `isPastYear()` function — it is needed for the auto-deactivation check
- Remove the Badge import — it is used on line 252 for the "Active" badge on Current Academic Year
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>
      1. Visit /admin/closure-dates — Previous Years table should show 3 columns (Year, First Closure, Final Closure) with no Status column
      2. Mobile view should show year label and dates only, no badges
      3. Current Academic Year card should still show green "Active" badge
      4. If active year has a past final closure date, it should auto-deactivate on page load
    </manual>
  </verify>
  <done>
    - Previous Years desktop table renders 3 columns (Year, First Closure, Final Closure) — no Status
    - Previous Years mobile cards show year label and dates — no badge
    - Active badge still displays on Current Academic Year card header
    - Auto-deactivation useEffect fires PATCH to deactivate year when finalClosureDate is past
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Badge import is still present and used (line 252 Active badge)
- isPastYear function is still present and used (auto-deactivation useEffect)
- No Status `<th>` or `<td>` in desktop table
- No Badge in mobile card rendering for otherYears
</verification>

<success_criteria>
- Previous Years table and cards show only year label and dates, no status indicators
- Auto-deactivation triggers on page load when active year's final closure date has passed
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/1-remove-status-from-previous-years-and-au/1-SUMMARY.md`
</output>
