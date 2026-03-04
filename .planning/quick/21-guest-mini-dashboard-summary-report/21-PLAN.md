---
phase: quick-21
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/guest/submissions/route.ts
  - app/(guest)/guest/page.tsx
autonomous: true
requirements: [QUICK-21]

must_haves:
  truths:
    - "Guest mini dashboard no longer shows a Faculty card"
    - "Guest mini dashboard shows total submissions count for their faculty"
    - "Guest mini dashboard shows percentage of total university-wide submissions"
    - "Guest mini dashboard shows distinct contributor count for their faculty"
    - "Stats match the data shape from the reports API (submission_count, percentage, contributors)"
  artifacts:
    - path: "app/api/guest/submissions/route.ts"
      provides: "Summary stats in API response"
      contains: "submissionCount"
    - path: "app/(guest)/guest/page.tsx"
      provides: "Updated Overview stat cards"
  key_links:
    - from: "app/api/guest/submissions/route.ts"
      to: "prisma.submission"
      via: "raw SQL query matching reports API pattern"
      pattern: "COUNT.*submission"
    - from: "app/(guest)/guest/page.tsx"
      to: "/api/guest/submissions"
      via: "fetch in useEffect"
      pattern: "summaryStats"
---

<objective>
Replace the Faculty and Academic Year stat cards in the guest mini dashboard Overview section with summary report statistics (total submissions, percentage of total, distinct contributors) matching the regular reports page pattern.

Purpose: Guests see meaningful submission statistics for their faculty instead of redundant Faculty/Year info already shown in the hero.
Output: Updated guest API returning summary stats, updated guest page rendering 3 report-style stat cards.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/api/guest/submissions/route.ts (current guest API — extend with stats)
@app/(guest)/guest/page.tsx (current guest page — update Overview cards)
@app/api/reports/route.ts (reports API — reference for stats query pattern)
@app/(portal)/reports/page.tsx (reports page — reference for card styling)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add summary stats to guest submissions API</name>
  <files>app/api/guest/submissions/route.ts</files>
  <action>
Add a summary stats query to the existing guest submissions API route, running in the same Promise.all as the existing faculty and availableYears queries. Use the same raw SQL pattern from the reports API (`/api/reports?type=submissions`):

```sql
SELECT
  COUNT(s.id) AS submission_count,
  COUNT(DISTINCT s.user_id) AS distinct_contributors
FROM "submission" s
WHERE s.status = 'SUBMITTED'
  AND s.faculty_id = $guestFacultyId
  AND s.academic_year_id = $targetYearId
```

Also query the total submissions count across ALL faculties for the same academic year (needed for percentage calculation):

```sql
SELECT COUNT(s.id) AS total_count
FROM "submission" s
WHERE s.status = 'SUBMITTED'
  AND s.academic_year_id = $targetYearId
```

IMPORTANT: These two queries should run AFTER targetYearId is determined (not in the initial Promise.all, since targetYearId depends on availableYears). Run them in a Promise.all alongside the existing `prisma.submission.findMany` that fetches the selected submissions.

Add a `summaryStats` object to the JSON response:
```ts
summaryStats: {
  totalSubmissions: number,      // submissions for this faculty
  percentageOfTotal: number,     // (faculty / university) * 100, rounded to 1 decimal
  distinctContributors: number,  // unique students in this faculty
}
```

When no targetYearId exists, return `summaryStats: { totalSubmissions: 0, percentageOfTotal: 0, distinctContributors: 0 }`.

Use `Prisma.sql` for parameterized raw queries (import `Prisma` from `@/prisma/generated/client`). Convert BigInt to Number before JSON serialization (same pattern as reports API).
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>curl the guest submissions API and verify summaryStats field is present in JSON response</manual>
  </verify>
  <done>Guest submissions API returns summaryStats object with totalSubmissions, percentageOfTotal, and distinctContributors alongside existing response fields</done>
</task>

<task type="auto">
  <name>Task 2: Replace Overview stat cards with summary report stats</name>
  <files>app/(guest)/guest/page.tsx</files>
  <action>
Update the guest page to consume the new `summaryStats` from the API and replace the current Overview cards.

1. Add `summaryStats` to the fetch response type:
```ts
summaryStats: {
  totalSubmissions: number;
  percentageOfTotal: number;
  distinctContributors: number;
};
```

2. Add state: `const [summaryStats, setSummaryStats] = useState<{totalSubmissions: number; percentageOfTotal: number; distinctContributors: number}>({ totalSubmissions: 0, percentageOfTotal: 0, distinctContributors: 0 });`

3. In the fetchData success handler, add: `setSummaryStats(data.summaryStats ?? { totalSubmissions: 0, percentageOfTotal: 0, distinctContributors: 0 });`

4. Replace the 3 Overview stat cards (lines 258-297 in the current file) with these 3 cards, styled to match the reports page single-faculty view pattern:

**Card 1 — "Selected Articles"** (keep existing, but restyle to match reports pattern):
- Icon: FileText in emerald-50 bg with emerald-600 color (keep current)
- Value: `submissions.length`
- Subtitle: "selected for publication"

**Card 2 — "Total Submissions"**:
- Icon: FileText in blue-50 bg with blue-600 color
- Value: `summaryStats.totalSubmissions`
- Subtitle: `{summaryStats.percentageOfTotal.toFixed(1)}% of university total`

**Card 3 — "Contributors"**:
- Icon: Users in purple-50 bg with purple-600 color (import Users from lucide-react)
- Value: `summaryStats.distinctContributors`
- Subtitle: `unique ${summaryStats.distinctContributors === 1 ? "student" : "students"}`

Use the reports page card structure for consistency: CardHeader with flex row between CardTitle (text-sm font-medium text-slate-500) and icon in rounded-lg bg p-2, CardContent with text-3xl font-bold and text-xs text-slate-500 subtitle below.

Remove the "Faculty" card and "Academic Year" card entirely — both are already shown in the hero section.

Add `Users` to the lucide-react import (alongside existing BookOpen, FileText, etc). Add `Percent` icon import too if needed for visual consistency but the percentage is shown as subtitle text rather than a separate card, so Percent import is not needed.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Visit guest page and verify Overview section shows 3 cards: Selected Articles, Total Submissions (with percentage subtitle), Contributors</manual>
  </verify>
  <done>Guest mini dashboard Overview shows 3 report-style stat cards (selected articles, total submissions with percentage, contributors). Faculty and Academic Year cards are removed.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors: `npx tsc --noEmit`
- Guest page renders with updated stat cards showing summary statistics
- No Faculty or Academic Year cards remain in the Overview section
- Stats data comes from API (not hardcoded)
</verification>

<success_criteria>
Guest mini dashboard Overview section shows 3 stat cards matching the reports page styling: Selected Articles count, Total Submissions with percentage-of-university subtitle, and Distinct Contributors count. The removed Faculty and Academic Year cards no longer appear (that info is already in the hero banner).
</success_criteria>

<output>
After completion, create `.planning/quick/21-guest-mini-dashboard-summary-report/21-SUMMARY.md`
</output>
