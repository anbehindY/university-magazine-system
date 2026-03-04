---
phase: quick-13
plan: 13
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/seed.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Exceptions report shows both overdue (14+ days) and pending (< 14 days) submissions without coordinator comment"
    - "Seed data for 2025-2026 includes submissions with no coordinator comment that were submitted close to the final closure date"
  artifacts:
    - path: "prisma/seed.ts"
      provides: "Seed data with mixed exception durations"
      contains: "pending exception"
  key_links:
    - from: "prisma/seed.ts"
      to: "app/api/reports/route.ts"
      via: "exceptions query matches submissions without coordinator comments, daysSinceSubmission derived from finalClosureDate - submittedAt"
      pattern: "daysSinceSubmission"
---

<objective>
Add seed submissions for the 2025-2026 academic year that appear as "pending" exceptions (< 14 days without coordinator comment) in the exceptions report.

Purpose: Currently ALL no-comment submissions in seed data are submitted between Oct 2025 and Feb 2026, making them all 40-170+ days from the final closure date (Apr 15 2026). The exceptions report shows 0 "pending" entries and all exceptions as "overdue." Adding submissions with submittedAt dates closer to the finalClosureDate (within 14 days, i.e., after ~April 2) provides realistic test data for both exception categories.

Output: Updated `prisma/seed.ts` with a mix of pending and overdue no-comment exceptions.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/seed.ts
@app/api/reports/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pending-exception submissions to 2025-2026 seed data</name>
  <files>prisma/seed.ts</files>
  <action>
In the 2025-2026 seeding section (section 9, starting around line 683), add a new block after the existing student loop that creates "pending exception" submissions -- submissions without coordinator comments that have submittedAt dates within 14 days of the finalClosureDate (2026-04-15).

Specifically:
1. After the existing for-loop for 2025-2026 students (around line 772), add a new clearly-commented block: "// ── Pending exceptions: recent submissions without coordinator comment ──"
2. For each faculty, pick 2 students who already have a submitted submission (e.g., students at index 13 and 14 -- they already have SUBMITTED status but no coordinator comment since hasComment is false for i >= 10). Instead of adding new submissions for these students (they already exist), we need to UPDATE the submittedAt of some existing no-comment submissions to be recent.

A cleaner approach: In the existing loop where i=10..14 creates no-comment submitted entries, change the submittedAt for i=13 and i=14 to be recent dates close to the finalClosureDate:
- For i === 13: set submittedAt to `new Date("2026-04-05")` (10 days before finalClosureDate, so daysSinceSubmission = 10)
- For i === 14: set submittedAt to `new Date("2026-04-10")` (5 days before finalClosureDate, so daysSinceSubmission = 5)

This means modifying the submittedAt assignment inside the i < 15 SUBMITTED block. Change:
```typescript
const submittedAt = randomDate(submissionWindow2526.start, submissionWindow2526.end);
```
To conditionally use a recent date for the last two no-comment students:
```typescript
// Students i=13,14 have no coordinator comment (hasComment is false for i>=10).
// Give them recent submittedAt so they appear as "pending" (< 14 days) exceptions.
const submittedAt = i === 13
  ? new Date("2026-04-05T12:00:00Z")   // 10 days before finalClosure → pending exception
  : i === 14
    ? new Date("2026-04-10T12:00:00Z") // 5 days before finalClosure → pending exception
    : randomDate(submissionWindow2526.start, submissionWindow2526.end);
```

This gives each faculty 2 pending exceptions (i=13, i=14) and 3 overdue exceptions (i=10, i=11, i=12), for a total of 10 pending and 15 overdue across all 5 faculties.

Add a console.log after the 2025-2026 loop: `console.log("  (includes 2 pending + 3 overdue exceptions per faculty)");`
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsx --eval "
const fs = require('fs');
const content = fs.readFileSync('prisma/seed.ts', 'utf8');
const hasPendingComment = content.includes('2026-04-05') && content.includes('2026-04-10');
const hasExplanation = content.includes('pending exception');
console.log('Has pending dates:', hasPendingComment);
console.log('Has explanation:', hasExplanation);
if (!hasPendingComment || !hasExplanation) process.exit(1);
console.log('PASS');
"</automated>
    <manual>Run `pnpm db:seed` against a fresh database and check the exceptions report at /reports -- should show both pending (< 14 days) and overdue (14+ days) entries</manual>
  </verify>
  <done>The seed.ts file creates 2 pending-exception submissions per faculty (10 total) with submittedAt dates within 14 days of the 2025-2026 finalClosureDate, alongside 3 overdue-exception submissions per faculty (15 total). The exceptions report will show both categories.</done>
</task>

</tasks>

<verification>
- `prisma/seed.ts` contains fixed dates "2026-04-05" and "2026-04-10" for pending exception submissions
- No-comment submissions at i=13 and i=14 get recent submittedAt instead of random dates from Oct-Feb window
- Overdue exceptions (i=10,11,12) still use random dates from the original window (all > 14 days from closure)
- File compiles without TypeScript errors: `npx tsc --noEmit prisma/seed.ts` or syntax check
</verification>

<success_criteria>
- Seed data produces both "pending" (< 14 days) and "overdue" (14+ days) exception submissions for 2025-2026
- 10 pending exceptions (2 per faculty) + 15 overdue exceptions (3 per faculty) = 25 total exceptions
- No changes to any other year's data or comment patterns
</success_criteria>

<output>
After completion, create `.planning/quick/13-seed-data-should-have-submissions-that-i/13-SUMMARY.md`
</output>
