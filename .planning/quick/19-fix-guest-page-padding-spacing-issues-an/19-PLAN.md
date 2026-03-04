---
phase: quick-19
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(guest)/guest/page.tsx
autonomous: true
requirements: [QUICK-19]

must_haves:
  truths:
    - "Hero section has comfortable vertical breathing room between faculty name and year selector row"
    - "Clear visual gap separates the stat cards section from the article cards grid"
    - "Dashboard stat cards are visually distinct from article cards — different background treatment"
  artifacts:
    - path: "app/(guest)/guest/page.tsx"
      provides: "Guest magazine page with corrected spacing and visual hierarchy"
      contains: "bg-slate-50"
  key_links: []
---

<objective>
Fix three spacing/visual issues on the guest magazine page: increase hero vertical breathing room, add missing gap between stat cards and article grid, and make the mini-dashboard stat cards visually distinct from article cards.

Purpose: The guest page currently has cramped hero spacing, no separation between the overview section and article grid, and identical card styling that makes it hard to distinguish navigation/stats from content.
Output: Updated `app/(guest)/guest/page.tsx` with corrected Tailwind classes.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(guest)/guest/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix guest page spacing and dashboard visual distinction</name>
  <files>app/(guest)/guest/page.tsx</files>
  <action>
Make three targeted CSS changes in the main return block of GuestMagazinePage:

1. **Hero breathing room (line 222):** Change `space-y-3` to `space-y-5` on the `div.relative.z-10` wrapper inside the hero section. This gives more vertical space between the h1 faculty name and the year selector / article count row below it.

2. **Gap between stat cards and article grid (line 298):** Add `pt-8` to the articles grid wrapper div. Currently the div at line 298 has only `className="px-4 sm:px-6 lg:px-8 pb-8"` — change it to `className="px-4 sm:px-6 lg:px-8 pt-8 pb-8"`. This adds vertical separation between the stat cards section and the articles section.

3. **Dashboard visual distinction (line 254):** Wrap the stat cards grid in a background container to visually separate it from article cards. Change the stat cards outer div (line 254) from:
   ```
   <div className="px-4 sm:px-6 lg:px-8 pt-8">
     <div className="grid gap-4 md:grid-cols-3">
   ```
   To:
   ```
   <div className="px-4 sm:px-6 lg:px-8 pt-8">
     <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Overview</h2>
     <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
       <div className="grid gap-4 md:grid-cols-3">
   ```
   And close the new wrapper div after the grid's closing `</div>` (before the outer padding div closes), so the stat cards sit inside a `bg-slate-50 rounded-xl` container with an "Overview" section header.

   Also update the three stat Card components (lines 256, 269, 282) to remove their individual borders since they now sit inside the background wrapper. Change `border-slate-200 bg-white` to `border-slate-200/60 bg-white shadow-sm` on each stat card for a slightly softer look inside the slate-50 container.

Apply the same skeleton loading state fix: in the loading skeleton (line 181), add `pt-8` to the grid skeleton wrapper so the skeleton layout mirrors the updated real layout spacing.

Do NOT change the article cards styling (lines 318-349) — those should remain as-is.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit app/\(guest\)/guest/page.tsx 2>&1 | head -20</automated>
    <manual>Visit the guest page and confirm: (1) hero has comfortable spacing between title and year row, (2) visible gap between stat cards section and articles, (3) stat cards sit inside a subtle gray background wrapper with "Overview" header</manual>
  </verify>
  <done>Hero has space-y-5 breathing room. Articles grid has pt-8 top spacing. Stat cards wrapped in bg-slate-50 rounded-xl container with "Overview" section header. Stat cards visually distinct from article cards.</done>
</task>

</tasks>

<verification>
- TypeScript compilation passes with no errors
- Guest page renders without runtime errors
- Three visual issues are resolved: hero spacing, section gap, dashboard distinction
</verification>

<success_criteria>
- Hero section has increased vertical spacing (space-y-5) between faculty name and year selector
- Clear vertical gap (pt-8) separates stat cards from article grid
- Stat cards wrapped in a bg-slate-50 container with "Overview" header, visually distinct from white article cards
- No TypeScript errors, no broken layout
</success_criteria>

<output>
After completion, create `.planning/quick/19-fix-guest-page-padding-spacing-issues-an/19-SUMMARY.md`
</output>
